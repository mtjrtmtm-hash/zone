import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
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
  ChevronDown,
  Sparkles,
  MapPin,
  Clock,
  Eye,
  Zap,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Paperclip,
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
  Award,
  BookOpen,
  Palette,
  Upload,
  Save,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  MoreVertical,
  Copy,
  ExternalLink,
  Globe,
  Type,
  Layout,
  Layers,
  Sliders,
  Ban,
  UserCheck,
  RefreshCw
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
import { Progress } from "@/components/ui/progress";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Syrian Governorates
const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"
];

// Categories with icons
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

// Site Settings Context
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

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

// Settings Provider
const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    site_name: "بدل",
    primary_color: "#8b5cf6",
    custom_font_name: "Tajawal"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings`);
      setSettings(res.data);
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useStickyState("badal_user", null);
  const [token, setToken] = useStickyState("badal_token", null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
          fetchUnreadCounts();
        } catch {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);

  const fetchUnreadCounts = async () => {
    if (!token) return;
    try {
      const [msgRes, notifRes] = await Promise.all([
        axios.get(`${API}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUnreadMessages(msgRes.data.count);
      setUnreadNotifications(notifRes.data.count);
    } catch (e) {
      console.error(e);
    }
  };

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
    setUnreadMessages(0);
    setUnreadNotifications(0);
    localStorage.removeItem("badal_user");
    localStorage.removeItem("badal_token");
  };

  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return (
    <AuthContext.Provider value={{ 
      user, token, login, register, logout, loading, api, 
      unreadMessages, unreadNotifications, fetchUnreadCounts 
    }}>
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
    color = "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700";
    label = "فضي";
  } else {
    level = "bronze";
    color = "bg-gradient-to-r from-orange-300 to-orange-400";
    label = "برونزي";
  }

  return (
    <Badge className={`${color} text-xs px-2 py-0.5`} data-testid="trust-badge">
      <Star className="w-3 h-3 ml-1" />
      {label}
    </Badge>
  );
};

// Glass Card Component
const GlassCard = ({ children, className = "", hover = true, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-soft ${hover ? 'hover:shadow-hover' : ''} transition-all duration-300 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

// Enhanced Navbar with Role-based UI
const Navbar = () => {
  const { user, logout, unreadMessages, unreadNotifications, fetchUnreadCounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCounts();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      const res = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  // Guest Navigation Items
  const guestNavItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
    { path: "/blog", icon: BookOpen, label: "المدونة" },
  ];

  // User Navigation Items
  const userNavItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
    { path: "/add-offer", icon: Plus, label: "أضف عرض", highlight: true },
    { path: "/messages", icon: MessageCircle, label: "الرسائل", badge: unreadMessages },
  ];

  const navItems = user ? userNavItems : guestNavItems;

  return (
    <>
      {/* Desktop Navbar */}
      <nav className={`hidden md:block sticky top-4 mx-auto max-w-7xl z-50 mt-4 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg' 
          : 'bg-white/80 backdrop-blur-xl'
      } border border-white/40 rounded-full px-6 py-3`}>
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25"
            >
              <span className="text-white font-bold text-xl">ب</span>
            </motion.div>
            <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {settings?.site_name || "بدل"}
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  location.pathname === item.path
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : item.highlight
                    ? "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                    : "hover:bg-purple-50 text-muted-foreground hover:text-primary"
                }`}
                data-testid={`nav-${item.label}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Favorites */}
                <Link 
                  to="/favorites" 
                  className="p-2 hover:bg-purple-50 rounded-full transition-colors relative group"
                  data-testid="nav-favorites"
                >
                  <Heart className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                          {unreadNotifications}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-3 font-semibold flex justify-between items-center">
                      <span>الإشعارات</span>
                      <Link to="/notifications" className="text-xs text-primary hover:underline">عرض الكل</Link>
                    </div>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">لا توجد إشعارات</div>
                      ) : (
                        notifications.map((n) => (
                          <DropdownMenuItem 
                            key={n.id} 
                            className={`p-3 cursor-pointer ${!n.is_read ? "bg-purple-50" : ""}`}
                            onClick={() => n.link && navigate(n.link)}
                          >
                            <div>
                              <p className="font-medium">{n.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{n.message}</p>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-purple-50 rounded-full pr-2 pl-4" data-testid="user-menu-btn">
                      <Avatar className="w-8 h-8 border-2 border-primary/20">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-3 border-b">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-2">
                        <TrustBadge score={user.trust_score} />
                      </div>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2" data-testid="menu-profile">
                      <User className="w-4 h-4" />
                      الملف الشخصي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-offers")} className="gap-2" data-testid="menu-my-offers">
                      <Package className="w-4 h-4" />
                      عروضي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favorites")} className="gap-2" data-testid="menu-favorites">
                      <Heart className="w-4 h-4" />
                      المفضلة
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 text-primary" data-testid="menu-admin">
                          <LayoutDashboard className="w-4 h-4" />
                          لوحة التحكم
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="gap-2 text-destructive" data-testid="menu-logout">
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate("/login")} className="rounded-full" data-testid="login-btn">
                  دخول
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => navigate("/register")} className="rounded-full shadow-md shadow-primary/25" data-testid="register-btn">
                    تسجيل جديد
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-purple-100 z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {(user ? [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { path: "/add-offer", icon: Plus, label: "أضف", highlight: true },
            { path: "/messages", icon: MessageCircle, label: "الرسائل", badge: unreadMessages },
            { path: "/profile", icon: User, label: "حسابي" },
          ] : [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { path: "/blog", icon: BookOpen, label: "المدونة" },
            { path: "/login", icon: User, label: "دخول" },
          ]).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                item.highlight 
                  ? "bg-primary text-white -mt-4 shadow-lg shadow-primary/25 rounded-full w-14 h-14 justify-center"
                  : location.pathname === item.path
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              data-testid={`mobile-nav-${item.label}`}
            >
              <item.icon className={item.highlight ? "w-6 h-6" : "w-5 h-5"} />
              {!item.highlight && <span className="text-xs">{item.label}</span>}
              {item.badge > 0 && (
                <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
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
      <section className="relative py-16 md:py-24 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary px-4 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 ml-1" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight" data-testid="hero-title">
              قايض بذكاء،
              <span className="text-primary block md:inline"> اربح بدون نقود</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              منصة سورية ذكية تربطك بآلاف الأشخاص لتبادل السلع والخدمات مباشرة عبر جميع المحافظات
            </p>
          </motion.div>

          {/* Search Box with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <form onSubmit={handleSearch} className="glass rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="ابحث عن شيء تريد مقايضته..."
                    className="pr-12 h-14 rounded-2xl border-purple-100 text-lg bg-white/50 focus:bg-white transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="search-input"
                  />
                </div>
                <Select value={selectedGov} onValueChange={setSelectedGov}>
                  <SelectTrigger className="w-full md:w-48 h-14 rounded-2xl bg-white/50" data-testid="gov-select">
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
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl w-full md:w-auto shadow-lg shadow-primary/25" data-testid="search-btn">
                    <Search className="w-5 h-5 ml-2" />
                    بحث
                  </Button>
                </motion.div>
              </div>
            </form>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12"
          >
            {[
              { value: "14", label: "محافظة سورية", icon: MapPin },
              { value: "1000+", label: "عرض نشط", icon: Package },
              { value: "AI", label: "مستشار ذكي", icon: Sparkles },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                </div>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">تصفح حسب الفئة</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-3 md:gap-4">
            {CATEGORIES.map((cat, idx) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Link
                  to={`/browse?category=${cat.name}`}
                  className="glass-card flex flex-col items-center justify-center p-4 cursor-pointer text-center"
                  data-testid={`category-${cat.name}`}
                >
                  <span className="text-3xl mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
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
            <Link to="/browse" className="text-primary hover:underline flex items-center gap-1 font-medium" data-testid="view-all-offers">
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
          <GlassCard className="text-center p-8 md:p-12 border-2 border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">مستشار المقايضة الذكي</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                استخدم الذكاء الاصطناعي لمعرفة أفضل الأغراض التي يمكنك مقايضتها مقابل غرضك مع تقدير للقيمة السوقية
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-to-r from-indigo-600 to-primary hover:opacity-90 shadow-xl"
                  onClick={() => navigate(user ? "/add-offer" : "/login")}
                  data-testid="ai-cta-btn"
                >
                  <Sparkles className="w-5 h-5 ml-2" />
                  جرب الآن
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Safety Tips */}
      <section className="py-12 px-4 bg-gradient-to-b from-purple-50/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">نصائح للمقايضة الآمنة</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "تحقق من الهوية", desc: "تأكد من هوية الطرف الآخر وراجع مؤشر الثقة قبل المقايضة" },
              { icon: MapPin, title: "اختر مكاناً عاماً", desc: "قابل في مكان عام وآمن لإتمام الصفقة واصطحب شخصاً معك" },
              { icon: Eye, title: "فحص المنتج", desc: "افحص المنتج جيداً وتأكد من مطابقته للوصف قبل الموافقة" }
            ].map((tip, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard className="text-center h-full">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <tip.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{tip.title}</h3>
                  <p className="text-muted-foreground text-sm">{tip.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Offer Card Component
const OfferCard = ({ offer, delay = 0, showActions = false, onStatusChange, onDelete }) => {
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (user) {
      checkFavorite();
    }
  }, [user, offer.id]);

  const checkFavorite = async () => {
    try {
      const res = await api.get(`/favorites/check/${offer.id}`);
      setIsFavorite(res.data.is_favorite);
    } catch (e) {
      console.error(e);
    }
  };

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
      className="cursor-pointer group"
    >
      <Card className="overflow-hidden rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all duration-300 h-full" data-testid={`offer-card-${offer.id}`}>
        <div className="relative h-48 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
          {offer.images && offer.images[0] ? (
            <img 
              src={offer.images[0]} 
              alt={offer.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-purple-200" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {offer.is_quick_trade && (
              <Badge className="bg-yellow-500 text-white shadow-lg" data-testid="quick-trade-badge">
                <Zap className="w-3 h-3 ml-1" />
                سريعة
              </Badge>
            )}
            {showActions && (
              <Badge className={`${
                offer.status === 'active' ? 'bg-green-500' :
                offer.status === 'completed' ? 'bg-blue-500' :
                offer.status === 'pending' ? 'bg-yellow-500' :
                'bg-gray-500'
              } text-white`}>
                {offer.status === 'active' ? 'نشط' :
                 offer.status === 'completed' ? 'مكتمل' :
                 offer.status === 'pending' ? 'قيد المراجعة' :
                 'ملغي'}
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFavorite}
            className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
            data-testid="favorite-btn"
          >
            <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </motion.button>
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
          
          {/* Action Buttons for Owner */}
          {showActions && (
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 rounded-xl"
                onClick={(e) => { e.stopPropagation(); navigate(`/edit-offer/${offer.id}`); }}
              >
                <Edit className="w-4 h-4 ml-1" />
                تعديل
              </Button>
              {offer.status === 'active' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl bg-green-50 hover:bg-green-100 text-green-700"
                  onClick={(e) => { e.stopPropagation(); onStatusChange?.(offer.id, 'completed'); }}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); onDelete?.(offer.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
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
      if (filters.category && filters.category !== "all") params.append("category", filters.category);
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
        <GlassCard className="mb-8 p-4" hover={false}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="بحث..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="rounded-xl bg-white/50"
                data-testid="filter-search"
              />
            </div>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-48 rounded-xl bg-white/50" data-testid="filter-category">
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
              <SelectTrigger className="w-48 rounded-xl bg-white/50" data-testid="filter-governorate">
                <SelectValue placeholder="المحافظة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المحافظات</SelectItem>
                {GOVERNORATES.map((gov) => (
                  <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl">
              <Switch
                checked={filters.quickTrade}
                onCheckedChange={(v) => setFilters({ ...filters, quickTrade: v })}
                data-testid="filter-quick-trade"
              />
              <Label className="flex items-center gap-1 cursor-pointer">
                <Zap className="w-4 h-4 text-yellow-500" />
                سريعة فقط
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
            <Package className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
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

// Login Page
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

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
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25"
          >
            <span className="text-white font-bold text-2xl">ب</span>
          </motion.div>
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

        <div className="mt-6 text-center space-y-3">
          <Link to="/" className="text-primary hover:underline block">
            <ArrowRight className="w-4 h-4 inline ml-1" />
            العودة للرئيسية
          </Link>
          <p className="text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-primary hover:underline font-medium" data-testid="register-link">
              سجل الآن
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
};

// Register Page
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
  }, [user, navigate]);

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
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25"
          >
            <span className="text-white font-bold text-2xl">ب</span>
          </motion.div>
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
          <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
            سجل دخول
          </Link>
        </p>
      </GlassCard>
    </div>
  );
};

// Placeholder components for brevity - these would be fully implemented
const OfferDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
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
      toast.error("يجب تسجيل الدخول أولاً");
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
          <GlassCard className="p-0 overflow-hidden" hover={false}>
            <div className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50">
              {offer.images && offer.images[0] ? (
                <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-purple-200" />
                </div>
              )}
            </div>
          </GlassCard>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                {offer.is_quick_trade && (
                  <Badge className="bg-yellow-500 text-white">
                    <Zap className="w-3 h-3 ml-1" />
                    مقايضة سريعة
                  </Badge>
                )}
                <Badge variant="secondary" className="rounded-full">
                  {CATEGORIES.find(c => c.name === offer.category)?.icon} {offer.category}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="offer-title">{offer.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <MapPin className="w-4 h-4 ml-1" />
                {offer.governorate}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                <Eye className="w-4 h-4 ml-1" />
                {offer.views} مشاهدة
              </Badge>
            </div>

            <Separator />

            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-primary" />
                يريد مقايضته بـ:
              </h3>
              <div className="bg-purple-50 p-4 rounded-2xl">
                <p className="text-muted-foreground">{offer.wanted_items}</p>
              </div>
            </div>

            <Separator />

            {/* Owner Info */}
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary text-white text-xl">{offer.user_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-lg">{offer.user_name}</p>
                <TrustBadge score={offer.user_trust_score} />
              </div>
            </div>

            {/* Contact Section */}
            {user?.id !== offer.user_id && (
              <GlassCard className="p-4" hover={false}>
                <Label className="mb-2 block font-medium">تواصل مع صاحب العرض</Label>
                <Textarea
                  placeholder="مرحباً، أنا مهتم بالمقايضة..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl min-h-[100px] mb-3"
                  data-testid="message-input"
                />
                <Button 
                  className="w-full rounded-xl" 
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
              <Button className="w-full rounded-xl h-12" onClick={() => navigate("/login")} data-testid="login-to-contact">
                سجل دخول للتواصل
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple placeholder pages
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

  const getAISuggestions = async () => {
    if (!form.description) {
      toast.error("يرجى كتابة وصف الغرض أولاً");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/suggest", { item_description: form.description });
      setSuggestions(res.data);
      toast.success("تم الحصول على الاقتراحات");
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
          <GlassCard hover={false}>
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
              <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
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
                    className="rounded-full bg-white"
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
                          className="cursor-pointer hover:bg-indigo-100 rounded-full px-3 py-1.5 transition-colors"
                          onClick={() => setForm({ ...form, wanted_items: form.wanted_items ? `${form.wanted_items}, ${s}` : s })}
                          data-testid={`suggestion-${idx}`}
                        >
                          <Plus className="w-3 h-3 ml-1" />
                          {s}
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
                        onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <label className="w-24 h-24 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-purple-50/50 transition-colors">
                      <Paperclip className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">إضافة</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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

          <Button type="submit" size="lg" className="w-full rounded-xl h-14 shadow-lg shadow-primary/25" disabled={loading} data-testid="submit-offer-btn">
            {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Plus className="w-5 h-5 ml-2" />}
            نشر العرض
          </Button>
        </form>
      </div>
    </div>
  );
};

const MessagesPage = () => <div className="min-h-screen p-8 pb-24"><h1 className="text-3xl font-bold">الرسائل</h1><p className="text-muted-foreground mt-4">صفحة الرسائل قيد التطوير</p></div>;
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">الملف الشخصي</h1>
        <GlassCard className="mb-6" hover={false}>
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-white text-3xl">{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="mt-2"><TrustBadge score={user?.trust_score || 0} /></div>
            </div>
          </div>
        </GlassCard>
        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => navigate("/my-offers")}>
            <Package className="w-5 h-5 ml-2" />عروضي
          </Button>
          <Button variant="outline" className="w-full rounded-xl justify-start" onClick={() => navigate("/favorites")}>
            <Heart className="w-5 h-5 ml-2" />المفضلة
          </Button>
          {user?.is_admin && (
            <Button variant="outline" className="w-full rounded-xl justify-start text-primary" onClick={() => navigate("/admin")}>
              <LayoutDashboard className="w-5 h-5 ml-2" />لوحة التحكم
            </Button>
          )}
          <Button variant="destructive" className="w-full rounded-xl" onClick={logout}>
            <LogOut className="w-5 h-5 ml-2" />تسجيل الخروج
          </Button>
        </div>
      </div>
    </div>
  );
};
const MyOffersPage = () => <div className="min-h-screen p-8 pb-24"><h1 className="text-3xl font-bold">عروضي</h1></div>;
const FavoritesPage = () => <div className="min-h-screen p-8 pb-24"><h1 className="text-3xl font-bold">المفضلة</h1></div>;
const BlogPage = () => <div className="min-h-screen p-8 pb-24"><h1 className="text-3xl font-bold">المدونة</h1></div>;
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
        <h1 className="text-3xl font-bold mb-8">لوحة التحكم</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white/80 p-1 rounded-full flex-wrap">
            <TabsTrigger value="overview" className="rounded-full"><TrendingUp className="w-4 h-4 ml-2" />نظرة عامة</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full"><Users className="w-4 h-4 ml-2" />المستخدمون</TabsTrigger>
            <TabsTrigger value="offers" className="rounded-full"><Package className="w-4 h-4 ml-2" />العروض</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full"><AlertTriangle className="w-4 h-4 ml-2" />البلاغات</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-full"><BookOpen className="w-4 h-4 ml-2" />المدونة</TabsTrigger>
            <TabsTrigger value="pages" className="rounded-full"><Layers className="w-4 h-4 ml-2" />الصفحات</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full"><Settings className="w-4 h-4 ml-2" />الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "المستخدمون", value: stats?.users_count || 0, icon: Users, color: "bg-primary/10 text-primary" },
                { label: "العروض النشطة", value: stats?.active_offers || 0, icon: Package, color: "bg-green-100 text-green-600" },
                { label: "الرسائل", value: stats?.messages_count || 0, icon: MessageCircle, color: "bg-blue-100 text-blue-600" },
                { label: "البلاغات المعلقة", value: stats?.pending_reports || 0, icon: AlertTriangle, color: "bg-red-100 text-red-600" },
              ].map((stat, idx) => (
                <GlassCard key={idx} hover={false}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <GlassCard hover={false}>
                <h3 className="font-bold mb-4">العروض حسب الفئة</h3>
                <div className="space-y-3">
                  {Object.entries(stats?.by_category || {}).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{cat}</span>
                          <span>{count}</span>
                        </div>
                        <Progress value={(count / Math.max(...Object.values(stats?.by_category || {1:1}))) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard hover={false}>
                <h3 className="font-bold mb-4">العروض حسب المحافظة</h3>
                <div className="space-y-3">
                  {Object.entries(stats?.by_governorate || {}).slice(0, 7).map(([gov, count]) => (
                    <div key={gov} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{gov}</span>
                          <span>{count}</span>
                        </div>
                        <Progress value={(count / Math.max(...Object.values(stats?.by_governorate || {1:1}))) * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </TabsContent>

          <TabsContent value="users"><div className="text-center py-12 text-muted-foreground">إدارة المستخدمين</div></TabsContent>
          <TabsContent value="offers"><div className="text-center py-12 text-muted-foreground">إدارة العروض</div></TabsContent>
          <TabsContent value="reports"><div className="text-center py-12 text-muted-foreground">إدارة البلاغات</div></TabsContent>
          <TabsContent value="blog"><div className="text-center py-12 text-muted-foreground">إدارة المدونة</div></TabsContent>
          <TabsContent value="pages"><div className="text-center py-12 text-muted-foreground">بناء الصفحات</div></TabsContent>
          <TabsContent value="settings"><div className="text-center py-12 text-muted-foreground">إعدادات الموقع</div></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <SettingsProvider>
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
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/add-offer" element={<ProtectedRoute><AddOfferPage /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/my-offers" element={<ProtectedRoute><MyOffersPage /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
