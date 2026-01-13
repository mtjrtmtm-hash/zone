import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Home as HomeIcon,
  Search,
  Plus,
  MessageCircle,
  User,
  Heart,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Clock,
  Eye,
  Zap,
  Send,
  Image as ImageIcon,
  Mic,
  Flag,
  Shield,
  Star,
  Filter,
  Grid3X3,
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Package,
  Trash2,
  Edit,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Syrian Governorates
const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"
];

// Categories
const CATEGORIES = [
  { name: "إلكترونيات", icon: "💻" },
  { name: "أثاث", icon: "🛋️" },
  { name: "سيارات", icon: "🚗" },
  { name: "عقارات", icon: "🏠" },
  { name: "ملابس", icon: "👔" },
  { name: "كتب", icon: "📚" },
  { name: "خدمات", icon: "🔧" },
  { name: "أجهزة منزلية", icon: "🏡" },
  { name: "رياضة", icon: "⚽" },
  { name: "أطفال", icon: "🧸" },
  { name: "حيوانات", icon: "🐕" },
  { name: "طاقة شمسية", icon: "☀️" },
  { name: "أخرى", icon: "📦" }
];

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

// Sticky State Hook (LocalStorage)
const useStickyState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useStickyState("badal_user", null);
  const [token, setToken] = useStickyState("badal_token", null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    setToken(res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("badal_user");
    localStorage.removeItem("badal_token");
  };

  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, api }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Trust Badge Component
const TrustBadge = ({ score }) => {
  let level, color, label;
  if (score >= 75) {
    level = "platinum";
    color = "bg-gradient-to-r from-gray-300 to-gray-400";
    label = "بلاتيني";
  } else if (score >= 50) {
    level = "gold";
    color = "bg-gradient-to-r from-yellow-400 to-yellow-500";
    label = "ذهبي";
  } else if (score >= 25) {
    level = "silver";
    color = "bg-gradient-to-r from-gray-200 to-gray-300";
    label = "فضي";
  } else {
    level = "bronze";
    color = "bg-gradient-to-r from-orange-300 to-orange-400";
    label = "برونزي";
  }

  return (
    <Badge className={`${color} text-white text-xs px-2 py-0.5`} data-testid="trust-badge">
      <Star className="w-3 h-3 ml-1" />
      {label}
    </Badge>
  );
};

// Glass Card Component
const GlassCard = ({ children, className = "", ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-soft hover:shadow-hover transition-all duration-300 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// Navbar Component
const Navbar = () => {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user || !api) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (e) {
      console.error(e);
    }
  }, [user, api]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const navItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
    { path: "/add-offer", icon: Plus, label: "أضف عرض" },
    { path: "/messages", icon: MessageCircle, label: "الرسائل" },
    { path: "/profile", icon: User, label: "حسابي" }
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:block sticky top-4 mx-auto max-w-7xl bg-white/80 backdrop-blur-xl border border-white/40 rounded-full px-8 py-4 shadow-sm z-50 mt-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">ب</span>
            </div>
            <span className="text-xl font-bold text-foreground">بدل</span>
          </Link>

          <div className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  location.pathname === item.path
                    ? "bg-primary text-white"
                    : "hover:bg-purple-50 text-muted-foreground hover:text-primary"
                }`}
                data-testid={`nav-${item.label}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/favorites" className="p-2 hover:bg-purple-50 rounded-full transition-colors" data-testid="nav-favorites">
                  <Heart className="w-5 h-5 text-muted-foreground" />
                </Link>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-2 font-semibold">الإشعارات</div>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">لا توجد إشعارات</div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <DropdownMenuItem key={n.id} className={`p-3 ${!n.is_read ? "bg-purple-50" : ""}`}>
                            <div>
                              <p className="font-medium">{n.title}</p>
                              <p className="text-sm text-muted-foreground">{n.message}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                      <User className="w-4 h-4 ml-2" />
                      الملف الشخصي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-offers")} data-testid="menu-my-offers">
                      <Package className="w-4 h-4 ml-2" />
                      عروضي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favorites")} data-testid="menu-favorites">
                      <Heart className="w-4 h-4 ml-2" />
                      المفضلة
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                          <LayoutDashboard className="w-4 h-4 ml-2" />
                          لوحة التحكم
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive" data-testid="menu-logout">
                      <LogOut className="w-4 h-4 ml-2" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate("/login")} data-testid="login-btn">
                  دخول
                </Button>
                <Button onClick={() => navigate("/register")} className="rounded-full" data-testid="register-btn">
                  تسجيل جديد
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-purple-100 h-20 flex items-center justify-around z-50 pb-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              location.pathname === item.path
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            data-testid={`mobile-nav-${item.label}`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

// Home Page
const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGov, setSelectedGov] = useState("");

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await axios.get(`${API}/offers?limit=8`);
      setOffers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/browse?search=${searchQuery}&governorate=${selectedGov}`);
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6" data-testid="hero-title">
              قايض بذكاء، <span className="text-primary">اربح بدون نقود</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              منصة سورية ذكية تربطك بآلاف الأشخاص لتبادل السلع والخدمات مباشرة
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <form onSubmit={handleSearch} className="glass rounded-3xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="ابحث عن شيء تريد مقايضته..."
                    className="pr-12 h-14 rounded-2xl border-purple-100 text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="search-input"
                  />
                </div>
                <Select value={selectedGov} onValueChange={setSelectedGov}>
                  <SelectTrigger className="w-full md:w-48 h-14 rounded-2xl" data-testid="gov-select">
                    <MapPin className="w-5 h-5 ml-2 text-muted-foreground" />
                    <SelectValue placeholder="المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المحافظات</SelectItem>
                    {GOVERNORATES.map((gov) => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl" data-testid="search-btn">
                  <Search className="w-5 h-5 ml-2" />
                  بحث
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-8 mt-12"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">14</p>
              <p className="text-muted-foreground">محافظة سورية</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">1000+</p>
              <p className="text-muted-foreground">عرض نشط</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">AI</p>
              <p className="text-muted-foreground">مستشار ذكي</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">تصفح حسب الفئة</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  to={`/browse?category=${cat.name}`}
                  className="glass-card flex flex-col items-center justify-center p-4 hover:scale-105 transition-transform cursor-pointer"
                  data-testid={`category-${cat.name}`}
                >
                  <span className="text-3xl mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium text-center">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Offers */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">أحدث العروض</h2>
            <Link to="/browse" className="text-primary hover:underline flex items-center gap-1" data-testid="view-all-offers">
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {offers.map((offer, idx) => (
                <OfferCard key={offer.id} offer={offer} delay={idx * 0.1} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Feature Highlight */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="text-center p-8 md:p-12 border-2 border-indigo-100">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">مستشار المقايضة الذكي</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              استخدم الذكاء الاصطناعي لمعرفة أفضل الأغراض التي يمكنك مقايضتها مقابل غرضك
            </p>
            <Button
              size="lg"
              className="rounded-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate(user ? "/add-offer" : "/login")}
              data-testid="ai-cta-btn"
            >
              <Sparkles className="w-5 h-5 ml-2" />
              جرب الآن
            </Button>
          </GlassCard>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-12 px-4 bg-purple-50/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">نصائح للمقايضة الآمنة</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "تحقق من الهوية", desc: "تأكد من هوية الطرف الآخر قبل المقايضة" },
              { icon: MapPin, title: "اختر مكاناً عاماً", desc: "قابل في مكان عام وآمن لإتمام الصفقة" },
              { icon: Eye, title: "فحص المنتج", desc: "افحص المنتج جيداً قبل إتمام المقايضة" }
            ].map((tip, idx) => (
              <GlassCard key={idx} className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <tip.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{tip.title}</h3>
                <p className="text-muted-foreground text-sm">{tip.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Offer Card Component
const OfferCard = ({ offer, delay = 0 }) => {
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${offer.id}`);
      } else {
        await api.post(`/favorites/${offer.id}`);
      }
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة");
    } catch (e) {
      toast.error("حدث خطأ");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={() => navigate(`/offer/${offer.id}`)}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all duration-300 group" data-testid={`offer-card-${offer.id}`}>
        <div className="relative h-48 bg-purple-50">
          {offer.images && offer.images[0] ? (
            <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-purple-200" />
            </div>
          )}
          {offer.is_quick_trade && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 text-white" data-testid="quick-trade-badge">
              <Zap className="w-3 h-3 ml-1" />
              مقايضة سريعة
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-white/80 hover:bg-white rounded-full"
            onClick={toggleFavorite}
            data-testid="favorite-btn"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </Button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {offer.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{offer.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {offer.governorate}
            </div>
            <TrustBadge score={offer.user_trust_score} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Browse Page
const BrowsePage = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "",
    governorate: "",
    search: "",
    quickTrade: false
  });
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      category: params.get("category") || "",
      governorate: params.get("governorate") || "",
      search: params.get("search") || "",
      quickTrade: params.get("quick") === "true"
    });
  }, [location.search]);

  useEffect(() => {
    fetchOffers();
  }, [filters]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.governorate && filters.governorate !== "all") params.append("governorate", filters.governorate);
      if (filters.search) params.append("search", filters.search);
      if (filters.quickTrade) params.append("quick_trade", "true");
      
      const res = await axios.get(`${API}/offers?${params.toString()}`);
      setOffers(res.data);
    } catch (e) {
      toast.error("فشل تحميل العروض");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="browse-title">تصفح العروض</h1>

        {/* Filters */}
        <GlassCard className="mb-8 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="بحث..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="rounded-xl"
                data-testid="filter-search"
              />
            </div>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-48 rounded-xl" data-testid="filter-category">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>{cat.icon} {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.governorate} onValueChange={(v) => setFilters({ ...filters, governorate: v })}>
              <SelectTrigger className="w-48 rounded-xl" data-testid="filter-governorate">
                <SelectValue placeholder="المحافظة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المحافظات</SelectItem>
                {GOVERNORATES.map((gov) => (
                  <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={filters.quickTrade}
                onCheckedChange={(v) => setFilters({ ...filters, quickTrade: v })}
                data-testid="filter-quick-trade"
              />
              <Label className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                مقايضة سريعة
              </Label>
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3>
            <p className="text-muted-foreground">جرب تغيير معايير البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {offers.map((offer, idx) => (
              <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Offer Detail Page
const OfferDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      const res = await axios.get(`${API}/offers/${id}`);
      setOffer(res.data);
    } catch (e) {
      toast.error("العرض غير موجود");
      navigate("/browse");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!message.trim()) return;
    
    setSending(true);
    try {
      await api.post("/messages", {
        receiver_id: offer.user_id,
        offer_id: offer.id,
        content: message,
        message_type: "text"
      });
      toast.success("تم إرسال الرسالة");
      setMessage("");
      navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`);
    } catch (e) {
      toast.error("فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const submitReport = async () => {
    if (!reportReason) return;
    try {
      await api.post("/reports", {
        reported_id: offer.id,
        report_type: "offer",
        reason: reportReason
      });
      toast.success("تم إرسال البلاغ");
      setShowReportDialog(false);
      setReportReason("");
    } catch (e) {
      toast.error("فشل إرسال البلاغ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6" data-testid="back-btn">
          <ChevronRight className="w-5 h-5 ml-1" />
          رجوع
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="aspect-square bg-purple-50">
              {offer.images && offer.images[0] ? (
                <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-purple-200" />
                </div>
              )}
            </div>
            {offer.images && offer.images.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto">
                {offer.images.slice(1).map((img, idx) => (
                  <img key={idx} src={img} className="w-20 h-20 rounded-xl object-cover" alt="" />
                ))}
              </div>
            )}
          </GlassCard>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  {offer.is_quick_trade && (
                    <Badge className="bg-yellow-500 text-white mb-2" data-testid="detail-quick-badge">
                      <Zap className="w-3 h-3 ml-1" />
                      مقايضة سريعة
                    </Badge>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold" data-testid="offer-title">{offer.title}</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowReportDialog(true)} data-testid="report-btn">
                  <Flag className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="secondary" className="rounded-full">
                  {CATEGORIES.find(c => c.name === offer.category)?.icon} {offer.category}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  <MapPin className="w-3 h-3 ml-1" />
                  {offer.governorate}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  <Eye className="w-3 h-3 ml-1" />
                  {offer.views} مشاهدة
                </Badge>
              </div>

              <p className="text-muted-foreground leading-relaxed" data-testid="offer-description">
                {offer.description}
              </p>
            </div>

            <Separator />

            {/* What they want */}
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-primary" />
                يريد مقايضته بـ:
              </h3>
              <p className="text-muted-foreground bg-purple-50 p-4 rounded-2xl" data-testid="wanted-items">
                {offer.wanted_items}
              </p>
            </div>

            <Separator />

            {/* Owner Info */}
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarFallback className="bg-primary text-white text-xl">{offer.user_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold">{offer.user_name}</p>
                <TrustBadge score={offer.user_trust_score} />
              </div>
            </div>

            {/* Contact */}
            {user && user.id !== offer.user_id && (
              <GlassCard className="p-4">
                <Label className="mb-2 block">أرسل رسالة للمالك</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="مرحباً، أنا مهتم بالمقايضة..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-xl min-h-[80px]"
                    data-testid="message-input"
                  />
                </div>
                <Button 
                  className="w-full mt-3 rounded-xl" 
                  onClick={sendMessage} 
                  disabled={sending || !message.trim()}
                  data-testid="send-message-btn"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                  إرسال رسالة
                </Button>
              </GlassCard>
            )}

            {!user && (
              <Button className="w-full rounded-xl" onClick={() => navigate("/login")} data-testid="login-to-contact">
                سجل دخول للتواصل
              </Button>
            )}
          </div>
        </div>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>الإبلاغ عن هذا العرض</DialogTitle>
              <DialogDescription>اختر سبب البلاغ</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {["محتوى مخالف", "احتيال", "معلومات كاذبة", "سعر غير منطقي", "أخرى"].map((reason) => (
                <Button
                  key={reason}
                  variant={reportReason === reason ? "default" : "outline"}
                  className="w-full justify-start rounded-xl"
                  onClick={() => setReportReason(reason)}
                >
                  {reason}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>إلغاء</Button>
              <Button onClick={submitReport} disabled={!reportReason}>إرسال البلاغ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Add Offer Page
const AddOfferPage = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    governorate: "",
    wanted_items: "",
    images: [],
    is_quick_trade: false
  });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images.slice(0, 4), reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const getAISuggestions = async () => {
    if (!form.description) {
      toast.error("يرجى كتابة وصف الغرض أولاً");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/suggest", { item_description: form.description });
      setSuggestions(res.data);
    } catch (e) {
      toast.error("فشل الحصول على الاقتراحات");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.governorate || !form.wanted_items) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/offers", form);
      toast.success("تم نشر العرض بنجاح!");
      navigate(`/offer/${res.data.id}`);
    } catch (e) {
      toast.error("فشل نشر العرض");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="add-offer-title">إضافة عرض جديد</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <GlassCard>
            <div className="space-y-4">
              <div>
                <Label>عنوان العرض *</Label>
                <Input
                  placeholder="مثال: لابتوب Dell للمقايضة"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-2 rounded-xl"
                  data-testid="offer-title-input"
                />
              </div>

              <div>
                <Label>وصف الغرض *</Label>
                <Textarea
                  placeholder="اكتب وصفاً تفصيلياً للغرض..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-2 rounded-xl min-h-[120px]"
                  data-testid="offer-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الفئة *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="mt-2 rounded-xl" data-testid="offer-category-select">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>{cat.icon} {cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المحافظة *</Label>
                  <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
                    <SelectTrigger className="mt-2 rounded-xl" data-testid="offer-governorate-select">
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOVERNORATES.map((gov) => (
                        <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Suggestions */}
              <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-4 bg-indigo-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span className="font-medium">اقتراح بالذكاء الاصطناعي</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getAISuggestions}
                    disabled={aiLoading || !form.description}
                    className="rounded-full"
                    data-testid="ai-suggest-btn"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                    اقترح لي
                  </Button>
                </div>
                {suggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-muted-foreground">
                      القيمة التقديرية: <span className="font-bold text-indigo-600">{suggestions.market_value}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.suggestions.map((s, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="cursor-pointer hover:bg-indigo-100 rounded-full px-3 py-1"
                          onClick={() => setForm({ ...form, wanted_items: form.wanted_items ? `${form.wanted_items}, ${s}` : s })}
                          data-testid={`suggestion-${idx}`}
                        >
                          + {s}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div>
                <Label>ماذا تريد مقابله؟ *</Label>
                <Textarea
                  placeholder="مثال: منظومة طاقة شمسية، موبايل حديث، أو ما يعادل القيمة"
                  value={form.wanted_items}
                  onChange={(e) => setForm({ ...form, wanted_items: e.target.value })}
                  className="mt-2 rounded-xl"
                  data-testid="wanted-items-input"
                />
              </div>

              {/* Images */}
              <div>
                <Label>صور الغرض (حتى 5 صور)</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">إضافة</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} data-testid="image-upload" />
                    </label>
                  )}
                </div>
              </div>

              {/* Quick Trade */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">مقايضة سريعة</p>
                    <p className="text-sm text-muted-foreground">للعروض الجاهزة للتنفيذ فوراً</p>
                  </div>
                </div>
                <Switch
                  checked={form.is_quick_trade}
                  onCheckedChange={(v) => setForm({ ...form, is_quick_trade: v })}
                  data-testid="quick-trade-switch"
                />
              </div>
            </div>
          </GlassCard>

          <Button type="submit" size="lg" className="w-full rounded-xl h-14" disabled={loading} data-testid="submit-offer-btn">
            {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Plus className="w-5 h-5 ml-2" />}
            نشر العرض
          </Button>
        </form>
      </div>
    </div>
  );
};

// Messages Page
const MessagesPage = () => {
  const { api, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/conversations");
      setConversations(res.data);

      // Check URL params for direct conversation
      const params = new URLSearchParams(location.search);
      const offerId = params.get("offer");
      const userId = params.get("user");
      if (offerId && userId) {
        const conv = res.data.find(c => c.offer_id === offerId && c.other_user_id === userId);
        if (conv) {
          selectConversation(conv);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    try {
      const res = await api.get(`/messages/${conv.offer_id}/${conv.other_user_id}`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await api.post("/messages", {
        receiver_id: selectedConv.other_user_id,
        offer_id: selectedConv.offer_id,
        content: newMessage,
        message_type: "text"
      });
      setMessages([...messages, res.data]);
      setNewMessage("");
    } catch (e) {
      toast.error("فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8" data-testid="messages-title">الرسائل</h1>

        <div className="grid md:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <GlassCard className="md:col-span-1 p-0 overflow-hidden">
            <div className="p-4 border-b border-purple-100">
              <h2 className="font-bold">المحادثات</h2>
            </div>
            <ScrollArea className="h-[520px]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد محادثات</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-4 cursor-pointer border-b border-purple-50 hover:bg-purple-50 transition-colors ${
                      selectedConv?.id === conv.id ? "bg-purple-50" : ""
                    }`}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-white">{conv.other_user_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium truncate">{conv.other_user_name}</p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-primary text-white text-xs">{conv.unread_count}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.offer_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </GlassCard>

          {/* Chat Area */}
          <GlassCard className="md:col-span-2 p-0 overflow-hidden flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-4 border-b border-purple-100 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">{selectedConv.other_user_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{selectedConv.other_user_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedConv.offer_title}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user.id ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            msg.sender_id === user.id
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-purple-100 rounded-bl-none"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender_id === user.id ? "text-white/70" : "text-muted-foreground"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-purple-100">
                  <div className="flex gap-2">
                    <Input
                      placeholder="اكتب رسالة..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="rounded-full"
                      data-testid="chat-input"
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="rounded-full" data-testid="send-chat-btn">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>اختر محادثة للبدء</p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

// Profile Page
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="profile-title">الملف الشخصي</h1>

        <GlassCard className="mb-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-white text-3xl">{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <TrustBadge score={user?.trust_score || 0} />
                <span className="text-muted-foreground">{user?.trades_count || 0} مقايضة</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-4">
          <GlassCard className="flex items-center gap-4">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <Phone className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">رقم الهاتف</p>
              <p className="font-medium">{user?.phone || "غير محدد"}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">المحافظة</p>
              <p className="font-medium">{user?.governorate}</p>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
              <p className="font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("ar-SY") : "غير محدد"}
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="mt-8 space-y-3">
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/my-offers")} data-testid="my-offers-btn">
            <Package className="w-5 h-5 ml-2" />
            عروضي
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/favorites")} data-testid="favorites-btn">
            <Heart className="w-5 h-5 ml-2" />
            المفضلة
          </Button>
          {user?.is_admin && (
            <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/admin")} data-testid="admin-btn">
              <LayoutDashboard className="w-5 h-5 ml-2" />
              لوحة التحكم
            </Button>
          )}
          <Button variant="destructive" className="w-full rounded-xl" onClick={logout} data-testid="logout-btn">
            <LogOut className="w-5 h-5 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
};

// My Offers Page
const MyOffersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await api.get("/my-offers");
      setOffers(res.data);
    } catch (e) {
      toast.error("فشل تحميل العروض");
    } finally {
      setLoading(false);
    }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm("هل تريد حذف هذا العرض؟")) return;
    try {
      await api.delete(`/offers/${id}`);
      setOffers(offers.filter((o) => o.id !== id));
      toast.success("تم حذف العرض");
    } catch (e) {
      toast.error("فشل حذف العرض");
    }
  };

  const updateOfferStatus = async (id, status) => {
    try {
      await api.put(`/offers/${id}/status?status=${status}`);
      setOffers(offers.map(o => o.id === id ? { ...o, status } : o));
      const statusMessages = {
        "completed": "تم تحديد العرض كمكتمل",
        "cancelled": "تم إلغاء العرض",
        "active": "تم تفعيل العرض"
      };
      toast.success(statusMessages[status]);
    } catch (e) {
      toast.error("فشل تحديث حالة العرض");
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" data-testid="my-offers-title">عروضي</h1>
          <Button onClick={() => navigate("/add-offer")} className="rounded-xl" data-testid="add-new-offer">
            <Plus className="w-5 h-5 ml-2" />
            إضافة عرض
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإضافة عرضك الأول</p>
            <Button onClick={() => navigate("/add-offer")} className="rounded-xl">
              <Plus className="w-5 h-5 ml-2" />
              إضافة عرض
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Card key={offer.id} className="rounded-3xl overflow-hidden" data-testid={`my-offer-${offer.id}`}>
                <div className="relative h-40 bg-purple-50">
                  {offer.images && offer.images[0] ? (
                    <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-purple-200" />
                    </div>
                  )}
                  <Badge className={`absolute top-3 right-3 ${offer.status === "active" ? "bg-green-500" : "bg-gray-500"}`}>
                    {offer.status === "active" ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold mb-2">{offer.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Eye className="w-4 h-4" />
                    {offer.views} مشاهدة
                    <span>•</span>
                    <MapPin className="w-4 h-4" />
                    {offer.governorate}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => navigate(`/offer/${offer.id}`)}>
                      <Eye className="w-4 h-4 ml-1" />
                      عرض
                    </Button>
                    <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => deleteOffer(offer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Favorites Page
const FavoritesPage = () => {
  const { api } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const res = await api.get("/favorites");
      setFavorites(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="favorites-title">المفضلة</h1>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عناصر في المفضلة</h3>
            <p className="text-muted-foreground">أضف عروضاً للمفضلة لتجدها هنا</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((offer, idx) => (
              <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Auth Pages
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("تم تسجيل الدخول بنجاح");
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">ب</span>
          </div>
          <h1 className="text-2xl font-bold" data-testid="login-title">تسجيل الدخول</h1>
          <p className="text-muted-foreground">مرحباً بعودتك إلى بدل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 rounded-xl"
              placeholder="example@email.com"
              required
              data-testid="login-email"
            />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 rounded-xl"
              placeholder="••••••••"
              required
              data-testid="login-password"
            />
          </div>
          <Button type="submit" className="w-full rounded-xl h-12" disabled={loading} data-testid="login-submit">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
            سجل الآن
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    governorate: "دمشق"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("تم إنشاء الحساب بنجاح");
      navigate("/");
    } catch (e) {
      toast.error(e.response?.data?.detail || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">ب</span>
          </div>
          <h1 className="text-2xl font-bold" data-testid="register-title">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground">انضم إلى مجتمع بدل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الاسم الكامل</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-2 rounded-xl"
              placeholder="أحمد محمد"
              required
              data-testid="register-name"
            />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-2 rounded-xl"
              placeholder="example@email.com"
              required
              data-testid="register-email"
            />
          </div>
          <div>
            <Label>رقم الهاتف</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-2 rounded-xl"
              placeholder="+963 9XX XXX XXX"
              data-testid="register-phone"
            />
          </div>
          <div>
            <Label>المحافظة</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger className="mt-2 rounded-xl" data-testid="register-governorate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOVERNORATES.map((gov) => (
                  <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-2 rounded-xl"
              placeholder="••••••••"
              required
              data-testid="register-password"
            />
          </div>
          <Button type="submit" className="w-full rounded-xl h-12" disabled={loading} data-testid="register-submit">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب"}
          </Button>
        </form>

        <p className="text-center mt-6 text-muted-foreground">
          لديك حساب؟{" "}
          <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
            سجل دخول
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch (e) {
      toast.error("فشل تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="admin-title">لوحة التحكم</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white/80 p-1 rounded-full">
            <TabsTrigger value="overview" className="rounded-full" data-testid="tab-overview">
              <TrendingUp className="w-4 h-4 ml-2" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-full" data-testid="tab-users">
              <Users className="w-4 h-4 ml-2" />
              المستخدمون
            </TabsTrigger>
            <TabsTrigger value="offers" className="rounded-full" data-testid="tab-offers">
              <Package className="w-4 h-4 ml-2" />
              العروض
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full" data-testid="tab-reports">
              <AlertTriangle className="w-4 h-4 ml-2" />
              البلاغات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.users_count || 0}</p>
                    <p className="text-sm text-muted-foreground">مستخدم</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.active_offers || 0}</p>
                    <p className="text-sm text-muted-foreground">عرض نشط</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.messages_count || 0}</p>
                    <p className="text-sm text-muted-foreground">رسالة</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.pending_reports || 0}</p>
                    <p className="text-sm text-muted-foreground">بلاغ معلق</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard>
                <h3 className="font-bold mb-4">العروض حسب الفئة</h3>
                <div className="space-y-3">
                  {Object.entries(stats?.by_category || {}).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="flex-1 bg-purple-100 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats?.by_category || { a: 1 }))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24">{cat}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="font-bold mb-4">العروض حسب المحافظة</h3>
                <div className="space-y-3">
                  {Object.entries(stats?.by_governorate || {}).slice(0, 7).map(([gov, count]) => (
                    <div key={gov} className="flex items-center gap-3">
                      <div className="flex-1 bg-indigo-100 rounded-full h-3">
                        <div
                          className="bg-indigo-500 h-3 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats?.by_governorate || { a: 1 }))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24">{gov}</span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="offers">
            <AdminOffersTab />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Admin Users Tab
const AdminUsersTab = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (e) {
      toast.error("فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const updateTrust = async (userId, score) => {
    try {
      await api.put(`/admin/users/${userId}/trust?trust_score=${score}`);
      setUsers(users.map(u => u.id === userId ? { ...u, trust_score: score } : u));
      toast.success("تم تحديث مؤشر الثقة");
    } catch (e) {
      toast.error("فشل التحديث");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-100">
              <th className="text-right p-4">المستخدم</th>
              <th className="text-right p-4">البريد</th>
              <th className="text-right p-4">المحافظة</th>
              <th className="text-right p-4">مؤشر الثقة</th>
              <th className="text-right p-4">المقايضات</th>
              <th className="text-right p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-purple-50 hover:bg-purple-50/50" data-testid={`user-row-${user.id}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      {user.is_admin && <Badge className="bg-primary">أدمن</Badge>}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{user.email}</td>
                <td className="p-4">{user.governorate}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <TrustBadge score={user.trust_score} />
                    <span className="text-sm text-muted-foreground">{user.trust_score}</span>
                  </div>
                </td>
                <td className="p-4">{user.trades_count}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.min(100, user.trust_score + 10))}>
                        زيادة الثقة +10
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.max(0, user.trust_score - 10))}>
                        إنقاص الثقة -10
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// Admin Offers Tab
const AdminOffersTab = () => {
  const { api } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await api.get("/admin/offers");
      setOffers(res.data);
    } catch (e) {
      toast.error("فشل تحميل العروض");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (offerId, status) => {
    try {
      await api.put(`/admin/offers/${offerId}/status?status=${status}`);
      setOffers(offers.map(o => o.id === offerId ? { ...o, status } : o));
      toast.success("تم تحديث الحالة");
    } catch (e) {
      toast.error("فشل التحديث");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-100">
              <th className="text-right p-4">العرض</th>
              <th className="text-right p-4">المالك</th>
              <th className="text-right p-4">الفئة</th>
              <th className="text-right p-4">المحافظة</th>
              <th className="text-right p-4">الحالة</th>
              <th className="text-right p-4">المشاهدات</th>
              <th className="text-right p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr key={offer.id} className="border-b border-purple-50 hover:bg-purple-50/50" data-testid={`offer-row-${offer.id}`}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl overflow-hidden">
                      {offer.images?.[0] ? (
                        <img src={offer.images[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-purple-300" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{offer.title}</span>
                  </div>
                </td>
                <td className="p-4">{offer.user_name}</td>
                <td className="p-4">{offer.category}</td>
                <td className="p-4">{offer.governorate}</td>
                <td className="p-4">
                  <Badge className={offer.status === "active" ? "bg-green-500" : "bg-gray-500"}>
                    {offer.status === "active" ? "نشط" : "معلق"}
                  </Badge>
                </td>
                <td className="p-4">{offer.views}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "active")}>
                        تفعيل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "suspended")}>
                        تعليق
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

// Admin Reports Tab
const AdminReportsTab = () => {
  const { api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get("/admin/reports");
      setReports(res.data);
    } catch (e) {
      toast.error("فشل تحميل البلاغات");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId, status) => {
    try {
      await api.put(`/admin/reports/${reportId}?status=${status}`);
      setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
      toast.success("تم تحديث الحالة");
    } catch (e) {
      toast.error("فشل التحديث");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard>
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-xl font-semibold">لا توجد بلاغات معلقة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="p-4 border border-purple-100 rounded-2xl" data-testid={`report-${report.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge className={
                    report.status === "pending" ? "bg-yellow-500" :
                    report.status === "resolved" ? "bg-green-500" : "bg-gray-500"
                  }>
                    {report.status === "pending" ? "معلق" : report.status === "resolved" ? "تم الحل" : "مرفوض"}
                  </Badge>
                  <p className="font-bold mt-2">{report.reason}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(report.created_at).toLocaleDateString("ar-SY")}
                </p>
              </div>
              <p className="text-muted-foreground mb-3">{report.details}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(report.id, "resolved")} className="rounded-xl">
                  <Check className="w-4 h-4 ml-1" />
                  تم الحل
                </Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(report.id, "rejected")} className="rounded-xl">
                  رفض
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// Main App
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background font-tajawal">
          <Toaster position="top-center" richColors closeButton dir="rtl" />
          <Navbar />
          <main className="pt-4 md:pt-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/offer/:id" element={<OfferDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/add-offer"
                element={
                  <ProtectedRoute>
                    <AddOfferPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <MessagesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-offers"
                element={
                  <ProtectedRoute>
                    <MyOffersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
