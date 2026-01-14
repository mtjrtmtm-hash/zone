"""
WhatsApp Web Emulator Service
محاكي WhatsApp Web لإرسال رسائل التحقق
"""

import asyncio
import json
import os
import random
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    """
    خدمة WhatsApp محاكية
    تعمل بطريقة مشابهة لـ WhatsApp Web
    """
    
    def __init__(self):
        self.is_connected = False
        self.qr_code = None
        self.phone_number = None
        self.session_data = None
        self.otp_storage: Dict[str, Dict] = {}  # {phone: {code, expires, attempts}}
        
    def generate_qr_code(self) -> str:
        """
        توليد QR Code للمسح من WhatsApp
        """
        # في الواقع، سيتم استبدال هذا بـ QR من whatsapp-web.js
        # الآن سنستخدم محاكي بسيط
        
        session_id = f"BADAL-{random.randint(100000, 999999)}"
        qr_data = f"whatsapp://connect?session={session_id}"
        
        # توليد QR Code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # تحويل إلى base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        self.qr_code = f"data:image/png;base64,{img_str}"
        return self.qr_code
    
    async def connect_session(self, session_id: str) -> bool:
        """
        محاكاة الاتصال بـ WhatsApp
        في الواقع، سيتم استبداله بـ whatsapp-web.js
        """
        # محاكاة تأخير الاتصال
        await asyncio.sleep(2)
        
        self.is_connected = True
        self.session_data = {
            "session_id": session_id,
            "connected_at": datetime.now().isoformat(),
            "phone": "+963xxxxxxxxx"  # سيتم استبداله بالرقم الفعلي
        }
        
        logger.info(f"WhatsApp connected: {session_id}")
        return True
    
    def disconnect(self):
        """
        قطع الاتصال
        """
        self.is_connected = False
        self.session_data = None
        logger.info("WhatsApp disconnected")
    
    def get_status(self) -> Dict:
        """
        الحصول على حالة الاتصال
        """
        return {
            "connected": self.is_connected,
            "has_qr": self.qr_code is not None,
            "session": self.session_data
        }
    
    def generate_otp(self, phone_number: str) -> str:
        """
        توليد كود OTP
        """
        code = f"{random.randint(100000, 999999)}"
        
        self.otp_storage[phone_number] = {
            "code": code,
            "expires": datetime.now() + timedelta(minutes=10),
            "attempts": 0
        }
        
        return code
    
    async def send_otp(self, phone_number: str, code: str) -> bool:
        """
        إرسال كود التحقق عبر WhatsApp
        """
        if not self.is_connected:
            logger.error("WhatsApp not connected")
            return False
        
        try:
            # محاكاة إرسال الرسالة
            # في الواقع، سيتم استخدام whatsapp-web.js
            message = f"""
مرحباً بك في منصة بدل! 🎉

رمز التحقق الخاص بك:
*{code}*

صالح لمدة 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

شكراً لاستخدام بدل 🇸🇾
            """.strip()
            
            logger.info(f"Sending OTP to {phone_number}: {code}")
            
            # محاكاة تأخير الإرسال
            await asyncio.sleep(1)
            
            # في الواقع:
            # await self.client.send_message(phone_number, message)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP: {e}")
            return False
    
    def verify_otp(self, phone_number: str, code: str) -> bool:
        """
        التحقق من كود OTP
        """
        if phone_number not in self.otp_storage:
            return False
        
        otp_data = self.otp_storage[phone_number]
        
        # التحقق من انتهاء الصلاحية
        if datetime.now() > otp_data["expires"]:
            del self.otp_storage[phone_number]
            return False
        
        # التحقق من عدد المحاولات
        if otp_data["attempts"] >= 3:
            del self.otp_storage[phone_number]
            return False
        
        # التحقق من الكود
        if otp_data["code"] == code:
            del self.otp_storage[phone_number]
            return True
        
        # زيادة عدد المحاولات
        otp_data["attempts"] += 1
        return False
    
    def resend_otp(self, phone_number: str) -> Optional[str]:
        """
        إعادة إرسال OTP
        """
        if phone_number in self.otp_storage:
            # حذف القديم
            del self.otp_storage[phone_number]
        
        # توليد جديد
        return self.generate_otp(phone_number)


# Instance عام
whatsapp_service = WhatsAppService()
