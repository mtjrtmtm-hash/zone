from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'badal_secret_key_2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Syrian Governorates
SYRIAN_GOVERNORATES = [
    "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
    "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"
]

# Categories
CATEGORIES = [
    "إلكترونيات", "أثاث", "سيارات", "عقارات", "ملابس", "كتب", "خدمات",
    "أجهزة منزلية", "رياضة", "أطفال", "حيوانات", "طاقة شمسية", "أخرى"
]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    governorate: Optional[str] = "دمشق"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    governorate: str
    is_admin: bool = False
    trust_score: int = 0
    trades_count: int = 0
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class OfferCreate(BaseModel):
    title: str
    description: str
    category: str
    governorate: str
    wanted_items: str
    images: List[str] = []
    is_quick_trade: bool = False

class OfferResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    category: str
    governorate: str
    wanted_items: str
    images: List[str] = []
    is_quick_trade: bool = False
    user_id: str
    user_name: str
    user_trust_score: int = 0
    status: str = "active"
    views: int = 0
    created_at: str

class MessageCreate(BaseModel):
    receiver_id: str
    offer_id: str
    content: str
    message_type: str = "text"  # text, image, voice

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    receiver_id: str
    offer_id: str
    content: str
    message_type: str
    is_read: bool = False
    created_at: str

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    offer_id: str
    offer_title: str
    other_user_id: str
    other_user_name: str
    last_message: str
    unread_count: int = 0
    updated_at: str

class ReportCreate(BaseModel):
    reported_id: str
    report_type: str  # user, offer
    reason: str
    details: Optional[str] = None

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    message: str
    notification_type: str
    is_read: bool = False
    created_at: str

class AISuggestionRequest(BaseModel):
    item_description: str

class AISuggestionResponse(BaseModel):
    suggestions: List[str]
    market_value: str

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="رمز غير صالح")
    except JWTError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="غير مصرح")
    return current_user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "phone": user_data.phone,
        "governorate": user_data.governorate or "دمشق",
        "is_admin": False,
        "trust_score": 0,
        "trades_count": 0,
        "favorites": [],
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id})
    user_response = UserResponse(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        governorate=user_data.governorate or "دمشق",
        is_admin=False,
        trust_score=0,
        trades_count=0,
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    
    token = create_access_token({"sub": user["id"]})
    user_response = UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        phone=user.get("phone"),
        governorate=user.get("governorate", "دمشق"),
        is_admin=user.get("is_admin", False),
        trust_score=user.get("trust_score", 0),
        trades_count=user.get("trades_count", 0),
        created_at=user.get("created_at", "")
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        phone=current_user.get("phone"),
        governorate=current_user.get("governorate", "دمشق"),
        is_admin=current_user.get("is_admin", False),
        trust_score=current_user.get("trust_score", 0),
        trades_count=current_user.get("trades_count", 0),
        created_at=current_user.get("created_at", "")
    )

# ==================== OFFERS ENDPOINTS ====================

@api_router.post("/offers", response_model=OfferResponse)
async def create_offer(offer_data: OfferCreate, current_user: dict = Depends(get_current_user)):
    offer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    offer_doc = {
        "id": offer_id,
        "title": offer_data.title,
        "description": offer_data.description,
        "category": offer_data.category,
        "governorate": offer_data.governorate,
        "wanted_items": offer_data.wanted_items,
        "images": offer_data.images[:5],  # Max 5 images
        "is_quick_trade": offer_data.is_quick_trade,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_trust_score": current_user.get("trust_score", 0),
        "status": "active",
        "views": 0,
        "created_at": now
    }
    
    await db.offers.insert_one(offer_doc)
    
    return OfferResponse(**offer_doc)

@api_router.get("/offers", response_model=List[OfferResponse])
async def get_offers(
    category: Optional[str] = None,
    governorate: Optional[str] = None,
    search: Optional[str] = None,
    quick_trade: Optional[bool] = None,
    limit: int = 20,
    skip: int = 0
):
    query = {"status": "active"}
    
    if category:
        query["category"] = category
    if governorate:
        query["governorate"] = governorate
    if quick_trade:
        query["is_quick_trade"] = True
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [OfferResponse(**o) for o in offers]

@api_router.get("/offers/{offer_id}", response_model=OfferResponse)
async def get_offer(offer_id: str):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    # Increment views
    await db.offers.update_one({"id": offer_id}, {"$inc": {"views": 1}})
    offer["views"] = offer.get("views", 0) + 1
    
    return OfferResponse(**offer)

@api_router.put("/offers/{offer_id}", response_model=OfferResponse)
async def update_offer(offer_id: str, offer_data: OfferCreate, current_user: dict = Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    if offer["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_doc = {
        "title": offer_data.title,
        "description": offer_data.description,
        "category": offer_data.category,
        "governorate": offer_data.governorate,
        "wanted_items": offer_data.wanted_items,
        "images": offer_data.images[:5],
        "is_quick_trade": offer_data.is_quick_trade
    }
    
    await db.offers.update_one({"id": offer_id}, {"$set": update_doc})
    
    updated = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    return OfferResponse(**updated)

@api_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str, current_user: dict = Depends(get_current_user)):
    offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    if offer["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.offers.delete_one({"id": offer_id})
    return {"message": "تم حذف العرض"}

@api_router.get("/my-offers", response_model=List[OfferResponse])
async def get_my_offers(current_user: dict = Depends(get_current_user)):
    offers = await db.offers.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [OfferResponse(**o) for o in offers]

# ==================== FAVORITES ENDPOINTS ====================

@api_router.post("/favorites/{offer_id}")
async def add_favorite(offer_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"favorites": offer_id}}
    )
    return {"message": "تمت الإضافة للمفضلة"}

@api_router.delete("/favorites/{offer_id}")
async def remove_favorite(offer_id: str, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"favorites": offer_id}}
    )
    return {"message": "تمت الإزالة من المفضلة"}

@api_router.get("/favorites", response_model=List[OfferResponse])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    favorite_ids = user.get("favorites", [])
    
    if not favorite_ids:
        return []
    
    offers = await db.offers.find({"id": {"$in": favorite_ids}}, {"_id": 0}).to_list(100)
    return [OfferResponse(**o) for o in offers]

# ==================== MESSAGES ENDPOINTS ====================

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(msg_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    msg_doc = {
        "id": msg_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "receiver_id": msg_data.receiver_id,
        "offer_id": msg_data.offer_id,
        "content": msg_data.content,
        "message_type": msg_data.message_type,
        "is_read": False,
        "created_at": now
    }
    
    await db.messages.insert_one(msg_doc)
    
    # Create notification
    offer = await db.offers.find_one({"id": msg_data.offer_id}, {"_id": 0})
    offer_title = offer["title"] if offer else "عرض"
    
    notif_doc = {
        "id": str(uuid.uuid4()),
        "user_id": msg_data.receiver_id,
        "title": "رسالة جديدة",
        "message": f"رسالة جديدة من {current_user['name']} بخصوص {offer_title}",
        "notification_type": "message",
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notif_doc)
    
    return MessageResponse(**msg_doc)

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": current_user["id"]},
                    {"receiver_id": current_user["id"]}
                ]
            }
        },
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": {
                    "offer_id": "$offer_id",
                    "other_user": {
                        "$cond": [
                            {"$eq": ["$sender_id", current_user["id"]]},
                            "$receiver_id",
                            "$sender_id"
                        ]
                    }
                },
                "last_message": {"$first": "$content"},
                "updated_at": {"$first": "$created_at"},
                "messages": {"$push": "$$ROOT"}
            }
        }
    ]
    
    results = await db.messages.aggregate(pipeline).to_list(100)
    conversations = []
    
    for r in results:
        other_user_id = r["_id"]["other_user"]
        offer_id = r["_id"]["offer_id"]
        
        other_user = await db.users.find_one({"id": other_user_id}, {"_id": 0})
        offer = await db.offers.find_one({"id": offer_id}, {"_id": 0})
        
        if other_user and offer:
            unread = sum(1 for m in r["messages"] if m["receiver_id"] == current_user["id"] and not m["is_read"])
            
            conversations.append(ConversationResponse(
                id=f"{offer_id}_{other_user_id}",
                offer_id=offer_id,
                offer_title=offer["title"],
                other_user_id=other_user_id,
                other_user_name=other_user["name"],
                last_message=r["last_message"],
                unread_count=unread,
                updated_at=r["updated_at"]
            ))
    
    return conversations

@api_router.get("/messages/{offer_id}/{user_id}", response_model=List[MessageResponse])
async def get_messages(offer_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "offer_id": offer_id,
        "$or": [
            {"sender_id": current_user["id"], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"offer_id": offer_id, "sender_id": user_id, "receiver_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    return [MessageResponse(**m) for m in messages]

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return [NotificationResponse(**n) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم التحديث"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "تم تحديث جميع الإشعارات"}

# ==================== REPORTS ENDPOINTS ====================

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, current_user: dict = Depends(get_current_user)):
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    report_doc = {
        "id": report_id,
        "reporter_id": current_user["id"],
        "reporter_name": current_user["name"],
        "reported_id": report_data.reported_id,
        "report_type": report_data.report_type,
        "reason": report_data.reason,
        "details": report_data.details,
        "status": "pending",
        "created_at": now
    }
    
    await db.reports.insert_one(report_doc)
    return {"message": "تم إرسال البلاغ", "id": report_id}

# ==================== AI SUGGESTIONS ENDPOINT ====================

@api_router.post("/ai/suggest", response_model=AISuggestionResponse)
async def get_ai_suggestions(request: AISuggestionRequest, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"barter_{current_user['id']}_{uuid.uuid4()}",
            system_message="""أنت مستشار مقايضة خبير في السوق السوري. مهمتك تحليل الأغراض المعروضة واقتراح 4-5 أغراض بديلة منطقية للمقايضة.
            
            يجب أن تكون اقتراحاتك:
            1. واقعية ومتاحة في السوق السوري
            2. متناسبة مع القيمة السوقية
            3. مطلوبة ومفيدة
            
            أجب بصيغة JSON فقط بدون أي نص إضافي:
            {"suggestions": ["اقتراح1", "اقتراح2", "اقتراح3", "اقتراح4"], "market_value": "تقدير القيمة بالليرة السورية"}"""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(
            text=f"أريد مقايضة: {request.item_description}\n\nما هي أفضل الأغراض التي يمكن أن أقايض بها هذا الغرض في سوريا حالياً؟"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        try:
            # Clean response if needed
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            data = json.loads(response_text)
            return AISuggestionResponse(
                suggestions=data.get("suggestions", []),
                market_value=data.get("market_value", "غير محدد")
            )
        except json.JSONDecodeError:
            # Fallback if AI returns non-JSON
            return AISuggestionResponse(
                suggestions=["موبايل حديث", "منظومة طاقة شمسية", "أثاث منزلي", "جهاز كهربائي"],
                market_value="يعتمد على حالة الغرض"
            )
            
    except Exception as e:
        logging.error(f"AI Error: {e}")
        # Fallback suggestions
        return AISuggestionResponse(
            suggestions=["موبايل حديث", "منظومة طاقة شمسية", "أثاث منزلي", "جهاز كهربائي", "دراجة نارية"],
            market_value="يرجى التواصل للاتفاق على القيمة"
        )

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    users_count = await db.users.count_documents({})
    offers_count = await db.offers.count_documents({})
    active_offers = await db.offers.count_documents({"status": "active"})
    reports_count = await db.reports.count_documents({"status": "pending"})
    messages_count = await db.messages.count_documents({})
    
    # Get offers by category
    category_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    categories = await db.offers.aggregate(category_pipeline).to_list(20)
    
    # Get offers by governorate
    gov_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$governorate", "count": {"$sum": 1}}}
    ]
    governorates = await db.offers.aggregate(gov_pipeline).to_list(20)
    
    return {
        "users_count": users_count,
        "offers_count": offers_count,
        "active_offers": active_offers,
        "pending_reports": reports_count,
        "messages_count": messages_count,
        "by_category": {c["_id"]: c["count"] for c in categories if c["_id"]},
        "by_governorate": {g["_id"]: g["count"] for g in governorates if g["_id"]}
    }

@api_router.get("/admin/users")
async def get_admin_users(admin: dict = Depends(get_admin_user), skip: int = 0, limit: int = 50):
    users = await db.users.find({}, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    return users

@api_router.get("/admin/reports")
async def get_admin_reports(admin: dict = Depends(get_admin_user), status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reports

@api_router.put("/admin/reports/{report_id}")
async def update_report_status(report_id: str, status: str, admin: dict = Depends(get_admin_user)):
    await db.reports.update_one({"id": report_id}, {"$set": {"status": status}})
    return {"message": "تم التحديث"}

@api_router.put("/admin/users/{user_id}/trust")
async def update_user_trust(user_id: str, trust_score: int, admin: dict = Depends(get_admin_user)):
    await db.users.update_one({"id": user_id}, {"$set": {"trust_score": trust_score}})
    return {"message": "تم التحديث"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    await db.users.delete_one({"id": user_id})
    await db.offers.delete_many({"user_id": user_id})
    return {"message": "تم الحذف"}

@api_router.get("/admin/offers")
async def get_admin_offers(admin: dict = Depends(get_admin_user), status: Optional[str] = None, skip: int = 0, limit: int = 50):
    query = {}
    if status:
        query["status"] = status
    offers = await db.offers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return offers

@api_router.put("/admin/offers/{offer_id}/status")
async def update_offer_status(offer_id: str, status: str, admin: dict = Depends(get_admin_user)):
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": status}})
    return {"message": "تم التحديث"}

# ==================== STATIC DATA ENDPOINTS ====================

@api_router.get("/governorates")
async def get_governorates():
    return SYRIAN_GOVERNORATES

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في منصة بدل للمقايضة السورية"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and setup app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create default admin user on startup
@app.on_event("startup")
async def create_default_users():
    # Create admin
    admin = await db.users.find_one({"email": "admin@win.sy"}, {"_id": 0})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "name": "مدير النظام",
            "email": "admin@win.sy",
            "password": get_password_hash("admin123"),
            "phone": "+963999999999",
            "governorate": "دمشق",
            "is_admin": True,
            "trust_score": 100,
            "trades_count": 0,
            "favorites": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Created default admin user")
    
    # Create test user
    test_user = await db.users.find_one({"email": "ali@example.com"}, {"_id": 0})
    if not test_user:
        user_doc = {
            "id": str(uuid.uuid4()),
            "name": "علي",
            "email": "ali@example.com",
            "password": get_password_hash("123"),
            "phone": "+963912345678",
            "governorate": "حلب",
            "is_admin": False,
            "trust_score": 25,
            "trades_count": 3,
            "favorites": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        logger.info("Created default test user")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
