import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Home as HomeIcon, Search, Plus, MessageCircle, User, Heart, Bell, Settings, LogOut,
  Menu, X, ChevronLeft, ChevronRight, ChevronDown, Sparkles, MapPin, Clock, Eye, Zap,
  Send, Image as ImageIcon, Mic, MicOff, Paperclip, Flag, Shield, Star, Filter,
  Grid3X3, LayoutDashboard, Users, FileText, AlertTriangle, TrendingUp, Package,
  Trash2, Edit, Check, Loader2, ArrowRight, ArrowLeft, Phone, Mail, Calendar,
  Award, BookOpen, Palette, Upload, Save, Play, Pause, CheckCircle, XCircle,
  MoreVertical, Copy, ExternalLink, Globe, Type, Layout, Layers, Sliders, Ban,
  UserCheck, RefreshCw, PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

const GOVERNORATES = ["دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس", "إدلب", "الرقة", "دير الزور", "الحسكة", "درعا", "السويداء", "القنيطرة"];
const CATEGORIES = [
  { name: "إلكترونيات", icon: "💻" }, { name: "أثاث", icon: "🛋️" }, { name: "سيارات", icon: "🚗" },
  { name: "عقارات", icon: "🏠" }, { name: "ملابس", icon: "👔" }, { name: "كتب", icon: "📚" },
  { name: "خدمات", icon: "🔧" }, { name: "أجهزة منزلية", icon: "🏡" }, { name: "رياضة", icon: "⚽" },
  { name: "أطفال", icon: "🧸" }, { name: "حيوانات", icon: "🐕" }, { name: "طاقة شمسية", icon: "☀️" }, { name: "أخرى", icon: "📦" }
];

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const SettingsContext = createContext(null);
const useSettings = () => useContext(SettingsContext);

const useStickyState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) { try { return JSON.parse(saved); } catch { return defaultValue; } }
    return defaultValue;
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
};

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ site_name: "بدل", primary_color: "#8b5cf6", custom_font_name: "Tajawal" });
  
  const fetchSettings = async () => { try { const res = await axios.get(`${API}/settings`); setSettings(res.data); } catch (e) { console.error(e); } };
  
  useEffect(() => { fetchSettings(); }, []);
  
  return <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>{children}</SettingsContext.Provider>;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useStickyState("badal_user", null);
  const [token, setToken] = useStickyState("badal_token", null);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchUnreadCounts = async () => {
    if (!token) return;
    try {
      const [msgRes, notifRes] = await Promise.all([
        axios.get(`${API}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUnreadMessages(msgRes.data.count);
      setUnreadNotifications(notifRes.data.count);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          setUser(res.data);
          fetchUnreadCounts();
        } catch { setUser(null); setToken(null); }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.access_token); setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    setToken(res.data.access_token); setUser(res.data.user);
    return res.data;
  };

  const logout = () => { setUser(null); setToken(null); setUnreadMessages(0); setUnreadNotifications(0); localStorage.removeItem("badal_user"); localStorage.removeItem("badal_token"); };
  const api = axios.create({ baseURL: API, headers: token ? { Authorization: `Bearer ${token}` } : {} });

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, api, unreadMessages, unreadNotifications, fetchUnreadCounts }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;
  return children;
};

const TrustBadge = ({ score }) => {
  let color, label;
  if (score >= 75) { color = "bg-gradient-to-r from-gray-300 to-gray-400"; label = "بلاتيني"; }
  else if (score >= 50) { color = "bg-gradient-to-r from-yellow-400 to-yellow-500"; label = "ذهبي"; }
  else if (score >= 25) { color = "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700"; label = "فضي"; }
  else { color = "bg-gradient-to-r from-orange-300 to-orange-400"; label = "برونزي"; }
  return <Badge className={`${color} text-xs px-2 py-0.5`}><Star className="w-3 h-3 ml-1" />{label}</Badge>;
};

const GlassCard = ({ children, className = "", hover = true, ...props }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-soft ${hover ? 'hover:shadow-hover' : ''} transition-all duration-300 ${className}`} {...props}>
    {children}
  </motion.div>
);

// Navbar
const Navbar = () => {
  const { user, logout, unreadMessages, unreadNotifications, fetchUnreadCounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMobileMenuOpen(false); setDesktopMenuOpen(false); }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      const res = await axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data.slice(0, 5));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) { fetchNotifications(); fetchUnreadCounts(); } }, [user, fetchUnreadCounts]);

  const markNotificationsAsRead = async () => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      await axios.put(`${API}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUnreadCounts();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const markSingleNotificationRead = async (notifId) => {
    try {
      const token = JSON.parse(localStorage.getItem("badal_token") || "null");
      if (!token) return;
      await axios.put(`${API}/notifications/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchUnreadCounts();
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  // Default menu items
  const defaultMenuItems = [
    { id: "home", label: "الرئيسية", link: "/", icon: "home" },
    { id: "browse", label: "تصفح العروض", link: "/browse", icon: "search" },
    { id: "blog", label: "المدونة", link: "/blog", icon: "book" },
  ];

  // Get menu items from settings or use defaults
  const menuItems = (settings?.menu_items && settings.menu_items.length > 0) 
    ? settings.menu_items.filter(item => item.is_visible).sort((a, b) => a.order - b.order)
    : defaultMenuItems;

  const getMenuIcon = (iconName) => {
    const icons = {
      home: HomeIcon, search: Search, book: BookOpen, heart: Heart, user: User,
      mail: Mail, phone: Phone, star: Star, package: Package, settings: Settings,
      globe: Globe, calendar: Calendar, award: Award, zap: Zap, map: MapPin
    };
    const IconComponent = icons[iconName] || Globe;
    return <IconComponent className="w-5 h-5" />;
  };

  const guestNavItems = [
    { path: "/", icon: HomeIcon, label: "الرئيسية" },
    { path: "/browse", icon: Search, label: "تصفح" },
  ];

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
      <nav className={`hidden md:block sticky top-4 mx-auto max-w-7xl z-50 mt-4 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-white/80 backdrop-blur-xl'} border border-white/40 rounded-full px-6 py-3`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden">
                {settings?.site_logo ? (
                  <img src={settings.site_logo} alt={settings.site_name || "بدل"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xl">ب</span>
                )}
              </motion.div>
              <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{settings?.site_name || "بدل"}</span>
            </Link>

            {/* Desktop Menu Button */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
                className="rounded-full px-4 py-2 hover:bg-purple-50 flex items-center gap-2"
              >
                <Menu className="w-5 h-5" />
                <span className="font-medium">القائمة</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${desktopMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              <AnimatePresence>
                {desktopMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setDesktopMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-purple-100 overflow-hidden z-50"
                    >
                      <div className="p-2">
                        {menuItems.map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            {item.link.startsWith('http') ? (
                              <a
                                href={item.link}
                                target={item.open_in_new_tab ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors group"
                                onClick={() => setDesktopMenuOpen(false)}
                              >
                                <span className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                  {getMenuIcon(item.icon)}
                                </span>
                                <span className="font-medium">{item.label}</span>
                                {item.open_in_new_tab && <ExternalLink className="w-4 h-4 text-muted-foreground mr-auto" />}
                              </a>
                            ) : (
                              <Link
                                to={item.link}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group ${location.pathname === item.link ? 'bg-primary text-white' : 'hover:bg-purple-50'}`}
                                onClick={() => setDesktopMenuOpen(false)}
                              >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${location.pathname === item.link ? 'bg-white/20' : 'bg-purple-100 group-hover:bg-primary group-hover:text-white'}`}>
                                  {getMenuIcon(item.icon)}
                                </span>
                                <span className="font-medium">{item.label}</span>
                              </Link>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${location.pathname === item.path ? "bg-primary text-white shadow-md shadow-primary/25" : item.highlight ? "bg-primary/10 text-primary hover:bg-primary hover:text-white" : "hover:bg-purple-50 text-muted-foreground hover:text-primary"}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.badge > 0 && <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{item.badge}</span>}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/favorites" className="p-2 hover:bg-purple-50 rounded-full transition-colors relative group">
                  <Heart className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" onClick={markNotificationsAsRead}>
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{unreadNotifications}</span>}
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
                          <DropdownMenuItem key={n.id} className={`p-3 cursor-pointer ${!n.is_read ? "bg-purple-50" : ""}`} onClick={() => { markSingleNotificationRead(n.id); n.link && navigate(n.link); }}>
                            <div><p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground line-clamp-1">{n.message}</p></div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 hover:bg-purple-50 rounded-full pr-2 pl-4">
                      <Avatar className="w-8 h-8 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-3 border-b">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-2"><TrustBadge score={user.trust_score} /></div>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2"><User className="w-4 h-4" />الملف الشخصي</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-offers")} className="gap-2"><Package className="w-4 h-4" />عروضي</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favorites")} className="gap-2"><Heart className="w-4 h-4" />المفضلة</DropdownMenuItem>
                    {user.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 text-primary"><LayoutDashboard className="w-4 h-4" />لوحة التحكم</DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="gap-2 text-destructive"><LogOut className="w-4 h-4" />تسجيل الخروج</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => navigate("/login")} className="rounded-full">دخول</Button>
                <Button onClick={() => navigate("/register")} className="rounded-full shadow-md shadow-primary/25">تسجيل جديد</Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-purple-100 z-50 pb-safe">
        <div className="flex items-center justify-around h-16">
          {(user ? [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { path: "/add-offer", icon: Plus, label: "أضف", highlight: true },
            { path: "/messages", icon: MessageCircle, label: "الرسائل", badge: unreadMessages },
            { action: () => setMobileMenuOpen(true), icon: Menu, label: "القائمة", isMenu: true },
          ] : [
            { path: "/", icon: HomeIcon, label: "الرئيسية" },
            { path: "/browse", icon: Search, label: "تصفح" },
            { action: () => setMobileMenuOpen(true), icon: Menu, label: "القائمة", isMenu: true },
            { path: "/login", icon: User, label: "دخول" },
          ]).map((item) => (
            item.isMenu ? (
              <button key="menu" onClick={item.action}
                className="relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-muted-foreground hover:text-primary">
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            ) : (
              <Link key={item.path} to={item.path}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${item.highlight ? "bg-primary text-white -mt-4 shadow-lg shadow-primary/25 rounded-full w-14 h-14 justify-center" : location.pathname === item.path ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className={item.highlight ? "w-6 h-6" : "w-5 h-5"} />
                {!item.highlight && <span className="text-xs">{item.label}</span>}
                {item.badge > 0 && <span className="absolute -top-1 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{item.badge}</span>}
              </Link>
            )
          ))}
        </div>
      </nav>

      {/* Mobile Full Screen Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[100] bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800"
          >
            {/* Decorative Background */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-40 right-10 w-48 h-48 bg-indigo-300/20 rounded-full blur-2xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
            </div>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white z-10"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute top-6 right-6 flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center overflow-hidden">
                {settings?.site_logo ? (
                  <img src={settings.site_logo} alt={settings.site_name || "بدل"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">ب</span>
                )}
              </div>
              <span className="text-2xl font-bold text-white">{settings?.site_name || "بدل"}</span>
            </motion.div>

            {/* Menu Items */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 pt-20 pb-32 overflow-y-auto">
              <div className="space-y-3">
                {menuItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    {item.link.startsWith('http') ? (
                      <a
                        href={item.link}
                        target={item.open_in_new_tab ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-colors group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          {getMenuIcon(item.icon)}
                        </span>
                        <span className="text-xl font-medium">{item.label}</span>
                        {item.open_in_new_tab && <ExternalLink className="w-5 h-5 mr-auto opacity-50" />}
                      </a>
                    ) : (
                      <Link
                        to={item.link}
                        className={`flex items-center gap-4 p-4 backdrop-blur-xl rounded-2xl text-white transition-colors group ${location.pathname === item.link ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${location.pathname === item.link ? 'bg-white text-primary' : 'bg-white/20'}`}>
                          {getMenuIcon(item.icon)}
                        </span>
                        <span className="text-xl font-medium">{item.label}</span>
                      </Link>
                    )}
                  </motion.div>
                ))}

                {/* User Section */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + menuItems.length * 0.05 }}
                  className="pt-4 border-t border-white/20 mt-6"
                >
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-xl rounded-2xl">
                        <Avatar className="w-14 h-14 border-2 border-white/30">
                          <AvatarFallback className="bg-white text-primary text-xl">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xl font-bold text-white">{user.name}</p>
                          <p className="text-white/70 text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <User className="w-5 h-5" /><span>حسابي</span>
                        </Link>
                        <Link to="/my-offers" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <Package className="w-5 h-5" /><span>عروضي</span>
                        </Link>
                        <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-colors">
                          <Heart className="w-5 h-5" /><span>المفضلة</span>
                        </Link>
                        {user.is_admin && (
                          <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-3 bg-yellow-500/20 rounded-xl text-yellow-300 hover:bg-yellow-500/30 transition-colors">
                            <LayoutDashboard className="w-5 h-5" /><span>الإدارة</span>
                          </Link>
                        )}
                      </div>
                      <button
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/20 rounded-xl text-red-300 hover:bg-red-500/30 transition-colors"
                      >
                        <LogOut className="w-5 h-5" /><span>تسجيل الخروج</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-white text-primary rounded-xl font-bold">
                        <User className="w-5 h-5" /><span>تسجيل الدخول</span>
                      </Link>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 p-4 bg-white/20 text-white rounded-xl font-bold">
                        <Plus className="w-5 h-5" /><span>حساب جديد</span>
                      </Link>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try { const res = await axios.get(`${API}/offers?limit=8`); setOffers(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); navigate(`/browse?search=${searchQuery}&governorate=${selectedGov}`); };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <section className="relative py-16 md:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-6 bg-primary/10 text-primary px-4 py-1.5 rounded-full"><Sparkles className="w-4 h-4 ml-1" />مدعوم بالذكاء الاصطناعي</Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              قايض بذكاء،<span className="text-primary block md:inline"> اربح بدون نقود</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">منصة سورية ذكية تربطك بآلاف الأشخاص لتبادل السلع والخدمات مباشرة</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-3xl mx-auto">
            <form onSubmit={handleSearch} className="glass rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input placeholder="ابحث عن شيء تريد مقايضته..." className="pr-12 h-14 rounded-2xl border-purple-100 text-lg bg-white/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select value={selectedGov} onValueChange={setSelectedGov}>
                  <SelectTrigger className="w-full md:w-48 h-14 rounded-2xl bg-white/50"><MapPin className="w-5 h-5 ml-2 text-muted-foreground" /><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المحافظات</SelectItem>
                    {GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl w-full md:w-auto shadow-lg shadow-primary/25"><Search className="w-5 h-5 ml-2" />بحث</Button>
              </div>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap justify-center gap-8 md:gap-12 mt-12">
            {[{ value: "14", label: "محافظة سورية", icon: MapPin }, { value: "1000+", label: "عرض نشط", icon: Package }, { value: "AI", label: "مستشار ذكي", icon: Sparkles }].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1"><stat.icon className="w-5 h-5 text-primary" /><p className="text-3xl font-bold text-primary">{stat.value}</p></div>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">تصفح حسب الفئة</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-3 md:gap-4">
            {CATEGORIES.map((cat, idx) => (
              <motion.div key={cat.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }} whileHover={{ scale: 1.05, y: -5 }}>
                <Link to={`/browse?category=${cat.name}`} className="glass-card flex flex-col items-center justify-center p-4 cursor-pointer text-center">
                  <span className="text-3xl mb-2">{cat.icon}</span><span className="text-sm font-medium">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">أحدث العروض</h2>
            <Link to="/browse" className="text-primary hover:underline flex items-center gap-1 font-medium">عرض الكل<ArrowLeft className="w-4 h-4" /></Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{offers.map((offer, idx) => <OfferCard key={offer.id} offer={offer} delay={idx * 0.1} />)}</div>
          )}
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="text-center p-8 md:p-12 border-2 border-indigo-100 relative overflow-hidden" hover={false}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">مستشار المقايضة الذكي</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">استخدم الذكاء الاصطناعي لمعرفة أفضل الأغراض التي يمكنك مقايضتها</p>
              <Button size="lg" className="rounded-full bg-gradient-to-r from-indigo-600 to-primary hover:opacity-90 shadow-xl" onClick={() => navigate(user ? "/add-offer" : "/login")}>
                <Sparkles className="w-5 h-5 ml-2" />جرب الآن
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

// Offer Card
const OfferCard = ({ offer, delay = 0, showActions = false, onStatusChange, onDelete }) => {
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);

  const checkFavorite = async () => { try { const res = await api.get(`/favorites/check/${offer.id}`); setIsFavorite(res.data.is_favorite); } catch (e) {} };

  useEffect(() => { if (user) checkFavorite(); }, [user, offer.id]);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) { navigate("/login"); return; }
    try {
      if (isFavorite) await api.delete(`/favorites/${offer.id}`);
      else await api.post(`/favorites/${offer.id}`);
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? "تمت الإزالة من المفضلة" : "تمت الإضافة للمفضلة");
    } catch (e) { toast.error("حدث خطأ"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} onClick={() => navigate(`/offer/${offer.id}`)} className="cursor-pointer group">
      <Card className="overflow-hidden rounded-3xl border-2 border-transparent hover:border-primary/20 transition-all duration-300 h-full">
        <div className="relative h-48 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
          {offer.images?.[0] ? <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-purple-200" /></div>}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {offer.is_quick_trade && <Badge className="bg-yellow-500 text-white shadow-lg"><Zap className="w-3 h-3 ml-1" />سريعة</Badge>}
            {showActions && <Badge className={`${offer.status === 'active' ? 'bg-green-500' : offer.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}>{offer.status === 'active' ? 'نشط' : offer.status === 'completed' ? 'مكتمل' : 'ملغي'}</Badge>}
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleFavorite} className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
            <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </motion.button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{offer.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{offer.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" />{offer.governorate}</div>
            <TrustBadge score={offer.user_trust_score} />
          </div>
          {showActions && (
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={(e) => { e.stopPropagation(); navigate(`/offer/${offer.id}`); }}><Eye className="w-4 h-4 ml-1" />عرض</Button>
              {offer.status === 'active' && <Button variant="outline" size="sm" className="rounded-xl bg-green-50 hover:bg-green-100 text-green-700" onClick={(e) => { e.stopPropagation(); onStatusChange?.(offer.id, 'completed'); }}><Check className="w-4 h-4" /></Button>}
              <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete?.(offer.id); }}><Trash2 className="w-4 h-4" /></Button>
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
  const [filters, setFilters] = useState({ category: "", governorate: "", search: "", quickTrade: false });
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({ category: params.get("category") || "", governorate: params.get("governorate") || "", search: params.get("search") || "", quickTrade: params.get("quick") === "true" });
  }, [location.search]);

  useEffect(() => { fetchOffers(); }, [filters]);

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
    } catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">تصفح العروض</h1>
        <GlassCard className="mb-8 p-4" hover={false}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="بحث..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="rounded-xl bg-white/50" />
            </div>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-48 rounded-xl bg-white/50"><SelectValue placeholder="الفئة" /></SelectTrigger>
              <SelectContent><SelectItem value="all">جميع الفئات</SelectItem>{CATEGORIES.map((cat) => <SelectItem key={cat.name} value={cat.name}>{cat.icon} {cat.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.governorate} onValueChange={(v) => setFilters({ ...filters, governorate: v })}>
              <SelectTrigger className="w-48 rounded-xl bg-white/50"><SelectValue placeholder="المحافظة" /></SelectTrigger>
              <SelectContent><SelectItem value="all">جميع المحافظات</SelectItem>{GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl">
              <Switch checked={filters.quickTrade} onCheckedChange={(v) => setFilters({ ...filters, quickTrade: v })} />
              <Label className="flex items-center gap-1 cursor-pointer"><Zap className="w-4 h-4 text-yellow-500" />سريعة فقط</Label>
            </div>
          </div>
        </GlassCard>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16"><Package className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" /><h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3><p className="text-muted-foreground">جرب تغيير معايير البحث</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{offers.map((offer, idx) => <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />)}</div>
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
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => { fetchOffer(); }, [id]);

  const fetchOffer = async () => {
    try { const res = await axios.get(`${API}/offers/${id}`); setOffer(res.data); }
    catch (e) { toast.error("العرض غير موجود"); navigate("/browse"); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); navigate("/login"); return; }
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post("/messages", { receiver_id: offer.user_id, offer_id: offer.id, content: message, message_type: "text" });
      toast.success("تم إرسال الرسالة");
      setMessage("");
      navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`);
    } catch (e) { toast.error("فشل إرسال الرسالة"); }
    finally { setSending(false); }
  };

  const changeStatus = async (newStatus) => {
    try {
      await api.put(`/offers/${offer.id}/status?status=${newStatus}`);
      setOffer({ ...offer, status: newStatus });
      toast.success("تم تغيير حالة العرض");
      setShowStatusDialog(false);
    } catch (e) { toast.error("فشل تغيير الحالة"); }
  };

  const shareOffer = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: offer.title, text: offer.description, url });
      } catch (e) { }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) { toast.error("يرجى كتابة سبب البلاغ"); return; }
    try {
      await api.post("/reports", { reported_id: offer.id, report_type: "offer", reason: reportReason });
      toast.success("تم إرسال البلاغ");
      setShowReportDialog(false);
      setReportReason("");
    } catch (e) { toast.error("فشل إرسال البلاغ"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!offer) return null;

  const isOwner = user?.id === offer.user_id;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6"><ChevronRight className="w-5 h-5 ml-1" />رجوع</Button>
        <div className="grid md:grid-cols-2 gap-8">
          <GlassCard className="p-0 overflow-hidden" hover={false}>
            <div className="aspect-square bg-gradient-to-br from-purple-50 to-indigo-50">
              {offer.images?.[0] ? <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-24 h-24 text-purple-200" /></div>}
            </div>
            {offer.images?.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {offer.images.map((img, idx) => (
                  <img key={idx} src={img} alt="" className="w-16 h-16 object-cover rounded-xl border-2 border-transparent hover:border-primary cursor-pointer" />
                ))}
              </div>
            )}
          </GlassCard>
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {offer.is_quick_trade && <Badge className="bg-yellow-500 text-white"><Zap className="w-3 h-3 ml-1" />مقايضة سريعة</Badge>}
                <Badge variant="secondary" className="rounded-full">{CATEGORIES.find(c => c.name === offer.category)?.icon} {offer.category}</Badge>
                <Badge className={`${offer.status === 'active' ? 'bg-green-500' : offer.status === 'completed' ? 'bg-blue-500' : 'bg-gray-500'} text-white`}>
                  {offer.status === 'active' ? 'نشط' : offer.status === 'completed' ? 'مكتمل' : offer.status === 'cancelled' ? 'ملغي' : 'معلق'}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4">{offer.title}</h1>
              <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-full px-3 py-1"><MapPin className="w-4 h-4 ml-1" />{offer.governorate}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1"><Eye className="w-4 h-4 ml-1" />{offer.views} مشاهدة</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1"><Clock className="w-4 h-4 ml-1" />{new Date(offer.created_at).toLocaleDateString("ar-SY")}</Badge>
            </div>
            <Separator />
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2"><ArrowLeft className="w-5 h-5 text-primary" />يريد مقايضته بـ:</h3>
              <div className="bg-purple-50 p-4 rounded-2xl"><p className="text-muted-foreground">{offer.wanted_items}</p></div>
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-primary/20"><AvatarFallback className="bg-primary text-white text-xl">{offer.user_name?.charAt(0)}</AvatarFallback></Avatar>
              <div className="flex-1"><p className="font-bold text-lg">{offer.user_name}</p><TrustBadge score={offer.user_trust_score} /></div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {isOwner ? (
                <>
                  <Button onClick={() => navigate(`/edit-offer/${offer.id}`)} className="flex-1 rounded-xl"><Edit className="w-4 h-4 ml-2" />تعديل العرض</Button>
                  <Button variant="outline" onClick={() => setShowStatusDialog(true)} className="flex-1 rounded-xl"><RefreshCw className="w-4 h-4 ml-2" />تغيير الحالة</Button>
                  <Button variant="outline" onClick={shareOffer} className="rounded-xl"><ExternalLink className="w-4 h-4" /></Button>
                </>
              ) : (
                <>
                  {user && (
                    <Button onClick={() => navigate(`/messages?offer=${offer.id}&user=${offer.user_id}`)} className="flex-1 rounded-xl"><MessageCircle className="w-4 h-4 ml-2" />تقديم عرض</Button>
                  )}
                  <Button variant="outline" onClick={shareOffer} className="rounded-xl"><ExternalLink className="w-4 h-4 ml-2" />مشاركة</Button>
                  {user && (
                    <Button variant="ghost" onClick={() => setShowReportDialog(true)} className="rounded-xl text-destructive hover:text-destructive"><Flag className="w-4 h-4" /></Button>
                  )}
                </>
              )}
            </div>

            {!isOwner && user && (
              <GlassCard className="p-4" hover={false}>
                <Label className="mb-2 block font-medium">تواصل مع صاحب العرض</Label>
                <Textarea placeholder="مرحباً، أنا مهتم بالمقايضة..." value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-xl min-h-[100px] mb-3" />
                <Button className="w-full rounded-xl" onClick={sendMessage} disabled={sending || !message.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}إرسال رسالة
                </Button>
              </GlassCard>
            )}
            {!user && <Button className="w-full rounded-xl h-12" onClick={() => navigate("/login")}>سجل دخول للتواصل</Button>}
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>تغيير حالة العرض</DialogTitle><DialogDescription>اختر الحالة الجديدة لعرضك</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Button variant={offer.status === 'active' ? 'default' : 'outline'} onClick={() => changeStatus('active')} className="justify-start rounded-xl"><CheckCircle className="w-4 h-4 ml-2 text-green-500" />نشط</Button>
            <Button variant={offer.status === 'completed' ? 'default' : 'outline'} onClick={() => changeStatus('completed')} className="justify-start rounded-xl"><Check className="w-4 h-4 ml-2 text-blue-500" />مكتمل (تمت المقايضة)</Button>
            <Button variant={offer.status === 'cancelled' ? 'default' : 'outline'} onClick={() => changeStatus('cancelled')} className="justify-start rounded-xl"><XCircle className="w-4 h-4 ml-2 text-gray-500" />ملغي</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>الإبلاغ عن العرض</DialogTitle><DialogDescription>أخبرنا بسبب البلاغ</DialogDescription></DialogHeader>
          <Textarea placeholder="سبب البلاغ..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={submitReport} className="rounded-xl bg-destructive hover:bg-destructive/90">إرسال البلاغ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, password); toast.success("تم تسجيل الدخول بنجاح"); navigate("/"); }
    catch (e) { toast.error(e.response?.data?.detail || "فشل تسجيل الدخول"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25"><span className="text-white font-bold text-2xl">ب</span></div>
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-muted-foreground">مرحباً بعودتك إلى بدل</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 rounded-xl" placeholder="example@email.com" required /></div>
          <div><Label>كلمة المرور</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 rounded-xl" placeholder="••••••••" required /></div>
          <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}</Button>
        </form>
        <div className="mt-6 text-center space-y-3">
          <Link to="/" className="text-primary hover:underline block"><ArrowRight className="w-4 h-4 inline ml-1" />العودة للرئيسية</Link>
          <p className="text-muted-foreground">ليس لديك حساب؟ <Link to="/register" className="text-primary hover:underline font-medium">سجل الآن</Link></p>
        </div>
      </GlassCard>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", governorate: "دمشق" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await register(form); toast.success("تم إنشاء الحساب بنجاح"); navigate("/"); }
    catch (e) { toast.error(e.response?.data?.detail || "فشل إنشاء الحساب"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <GlassCard className="w-full max-w-md" hover={false}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/25"><span className="text-white font-bold text-2xl">ب</span></div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-muted-foreground">انضم إلى مجتمع بدل</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>الاسم الكامل</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 rounded-xl" placeholder="أحمد محمد" required /></div>
          <div><Label>البريد الإلكتروني</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 rounded-xl" placeholder="example@email.com" required /></div>
          <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 rounded-xl" placeholder="+963 9XX XXX XXX" /></div>
          <div>
            <Label>المحافظة</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>كلمة المرور</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 rounded-xl" placeholder="••••••••" required /></div>
          <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب"}</Button>
        </form>
        <p className="text-center mt-6 text-muted-foreground">لديك حساب؟ <Link to="/login" className="text-primary hover:underline font-medium">سجل دخول</Link></p>
      </GlassCard>
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
  const [form, setForm] = useState({ title: "", description: "", category: "", governorate: "", wanted_items: "", images: [], is_quick_trade: false });

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
      const reader = new FileReader();
      reader.onload = () => setForm((prev) => ({ ...prev, images: [...prev.images.slice(0, 4), reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const getAISuggestions = async () => {
    if (!form.description) { toast.error("يرجى كتابة وصف الغرض أولاً"); return; }
    setAiLoading(true);
    try { const res = await api.post("/ai/suggest", { item_description: form.description }); setSuggestions(res.data); toast.success("تم الحصول على الاقتراحات"); }
    catch (e) { toast.error("فشل الحصول على الاقتراحات"); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.governorate || !form.wanted_items) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    setLoading(true);
    try { const res = await api.post("/offers", form); toast.success("تم نشر العرض بنجاح!"); navigate(`/offer/${res.data.id}`); }
    catch (e) { toast.error("فشل نشر العرض"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">إضافة عرض جديد</h1>
        <OfferForm form={form} setForm={setForm} handleImageUpload={handleImageUpload} getAISuggestions={getAISuggestions} aiLoading={aiLoading} suggestions={suggestions} handleSubmit={handleSubmit} loading={loading} buttonText="نشر العرض" />
      </div>
    </div>
  );
};

// Edit Offer Page
const EditOfferPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", governorate: "", wanted_items: "", images: [], is_quick_trade: false });

  useEffect(() => { fetchOffer(); }, [id]);

  const fetchOffer = async () => {
    try {
      const res = await api.get(`/offers/${id}`);
      const offer = res.data;
      setForm({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        governorate: offer.governorate,
        wanted_items: offer.wanted_items,
        images: offer.images || [],
        is_quick_trade: offer.is_quick_trade
      });
    } catch (e) { toast.error("فشل تحميل العرض"); navigate("/my-offers"); }
    finally { setFetchLoading(false); }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
      const reader = new FileReader();
      reader.onload = () => setForm((prev) => ({ ...prev, images: [...prev.images.slice(0, 4), reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const getAISuggestions = async () => {
    if (!form.description) { toast.error("يرجى كتابة وصف الغرض أولاً"); return; }
    setAiLoading(true);
    try { const res = await api.post("/ai/suggest", { item_description: form.description }); setSuggestions(res.data); toast.success("تم الحصول على الاقتراحات"); }
    catch (e) { toast.error("فشل الحصول على الاقتراحات"); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.governorate || !form.wanted_items) { toast.error("يرجى ملء جميع الحقول المطلوبة"); return; }
    setLoading(true);
    try { await api.put(`/offers/${id}`, form); toast.success("تم تحديث العرض بنجاح!"); navigate(`/offer/${id}`); }
    catch (e) { toast.error("فشل تحديث العرض"); }
    finally { setLoading(false); }
  };

  if (fetchLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}><ChevronRight className="w-5 h-5" /></Button>
          <h1 className="text-3xl font-bold">تعديل العرض</h1>
        </div>
        <OfferForm form={form} setForm={setForm} handleImageUpload={handleImageUpload} getAISuggestions={getAISuggestions} aiLoading={aiLoading} suggestions={suggestions} handleSubmit={handleSubmit} loading={loading} buttonText="حفظ التعديلات" />
      </div>
    </div>
  );
};

// Shared Offer Form Component
const OfferForm = ({ form, setForm, handleImageUpload, getAISuggestions, aiLoading, suggestions, handleSubmit, loading, buttonText }) => (
  <form onSubmit={handleSubmit} className="space-y-6">
    <GlassCard hover={false}>
      <div className="space-y-4">
        <div><Label>عنوان العرض *</Label><Input placeholder="مثال: لابتوب Dell للمقايضة" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
        <div><Label>وصف الغرض *</Label><Textarea placeholder="اكتب وصفاً تفصيلياً للغرض..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 rounded-xl min-h-[120px]" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>الفئة *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat.name} value={cat.name}>{cat.icon} {cat.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>المحافظة *</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger className="mt-2 rounded-xl"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
              <SelectContent>{GOVERNORATES.map((gov) => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /><span className="font-medium">اقتراح بالذكاء الاصطناعي</span></div>
            <Button type="button" variant="outline" size="sm" onClick={getAISuggestions} disabled={aiLoading || !form.description} className="rounded-full bg-white">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}اقترح لي
            </Button>
          </div>
          {suggestions && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <p className="text-sm text-muted-foreground">القيمة التقديرية: <span className="font-bold text-indigo-600">{suggestions.market_value}</span></p>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestions.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-indigo-100 rounded-full px-3 py-1.5 transition-colors" onClick={() => setForm({ ...form, wanted_items: form.wanted_items ? `${form.wanted_items}, ${s}` : s })}>
                    <Plus className="w-3 h-3 ml-1" />{s}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div><Label>ماذا تريد مقابله؟ *</Label><Textarea placeholder="مثال: منظومة طاقة شمسية، موبايل حديث..." value={form.wanted_items} onChange={(e) => setForm({ ...form, wanted_items: e.target.value })} className="mt-2 rounded-xl" /></div>

        <div>
          <Label>صور الغرض (حتى 5 صور)</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {form.images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-6 h-6 text-white" /></button>
              </div>
            ))}
            {form.images.length < 5 && (
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-purple-50/50 transition-colors">
                <Paperclip className="w-6 h-6 text-muted-foreground" /><span className="text-xs text-muted-foreground mt-1">إضافة</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
          <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-yellow-500" /><div><p className="font-medium">مقايضة سريعة</p><p className="text-sm text-muted-foreground">للعروض الجاهزة للتنفيذ فوراً</p></div></div>
          <Switch checked={form.is_quick_trade} onCheckedChange={(v) => setForm({ ...form, is_quick_trade: v })} />
        </div>
      </div>
    </GlassCard>
    <Button type="submit" size="lg" className="w-full rounded-xl h-14 shadow-lg shadow-primary/25" disabled={loading}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}{buttonText}
    </Button>
  </form>
);
// Messages Page - MOBILE OPTIMIZED WITH DRAWER
const MessagesPage = () => {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const scrollHeight = messagesContainerRef.current.scrollHeight;
      const height = messagesContainerRef.current.clientHeight;
      const maxScrollTop = scrollHeight - height;
      messagesContainerRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages]);

  useEffect(() => { fetchConversations(); }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/conversations");
      setConversations(res.data);
      const params = new URLSearchParams(location.search);
      const offerId = params.get("offer");
      const userId = params.get("user");
      if (offerId && userId) {
        const conv = res.data.find(c => c.offer_id === offerId && c.other_user_id === userId);
        if (conv) selectConversation(conv);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    setDrawerOpen(false);
    setMessages([]);
    try { 
      const res = await api.get(`/messages/${conv.offer_id}/${conv.other_user_id}`); 
      setMessages(res.data);
    }
    catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await api.post("/messages", { receiver_id: selectedConv.other_user_id, offer_id: selectedConv.offer_id, content: newMessage, message_type: "text" });
      setMessages(prev => [...prev, res.data]);
      setNewMessage("");
    } catch (e) { toast.error("فشل إرسال الرسالة"); }
    finally { setSending(false); }
  };

  // Conversations List Component
  const ConversationsList = ({ mobile = false, onSelect }) => (
    <div className={mobile ? "h-full flex flex-col" : ""}>
      {mobile && (
        <div className="p-4 border-b border-purple-200 bg-gradient-to-r from-purple-500 to-purple-600">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">المحادثات</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDrawerOpen(false)}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-purple-100">{conversations.length} محادثة نشطة</p>
        </div>
      )}
      <ScrollArea className={mobile ? "flex-1" : "h-[520px]"}>
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد محادثات</p>
          </div>
        ) : (
          <div className={mobile ? "" : ""}>
            {conversations.map((conv) => (
              <motion.div 
                key={conv.id} 
                onClick={() => onSelect ? onSelect(conv) : selectConversation(conv)} 
                className={`p-4 cursor-pointer border-b border-purple-100 hover:bg-purple-50 active:bg-purple-100 transition-all duration-200 ${
                  !mobile && selectedConv?.id === conv.id ? "bg-purple-100" : "bg-white"
                }`}
                whileHover={{ scale: mobile ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-purple-200 shadow-sm flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                      {conv.other_user_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold truncate text-gray-900 text-[15px]">{conv.other_user_name}</p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-primary text-white text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-medium text-purple-600 truncate mb-1">{conv.offer_title}</p>
                    <p className="text-xs text-gray-500 truncate leading-tight">{conv.last_message}</p>
                  </div>
                  {mobile && <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen">
      {/* Desktop View */}
      <div className="hidden md:block pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">الرسائل</h1>
          <div className="grid grid-cols-3 gap-6 h-[600px]">
            {/* Conversations List */}
            <GlassCard className="col-span-1 p-0 overflow-hidden" hover={false}>
              <div className="p-4 border-b border-purple-100">
                <h2 className="font-bold">المحادثات</h2>
              </div>
              <ConversationsList />
            </GlassCard>

            {/* Chat Area */}
            <GlassCard className="col-span-2 p-0 overflow-hidden flex flex-col" hover={false}>
              {selectedConv ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 border-2 border-purple-300">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                          {selectedConv.other_user_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{selectedConv.other_user_name}</p>
                        <p className="text-sm text-purple-600">{selectedConv.offer_title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-purple-50/30 to-white">
                    <div className="space-y-3">
                      {messages.map((msg, idx) => (
                        <motion.div 
                          key={msg.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${
                            msg.sender_id === user.id 
                              ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-sm" 
                              : "bg-white border border-purple-100 text-gray-800 rounded-bl-sm"
                          }`}>
                            <p className="leading-relaxed">{msg.content}</p>
                            <p className={`text-xs mt-1.5 ${msg.sender_id === user.id ? "text-purple-100" : "text-gray-400"}`}>
                              {new Date(msg.created_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-purple-100 bg-white">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="اكتب رسالة..." 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()} 
                        className="rounded-full border-purple-200 focus:border-purple-400 px-5"
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={sending || !newMessage.trim()} 
                        className="rounded-full w-12 h-12 p-0 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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

      {/* Mobile View - With Drawer */}
      <div className="md:hidden fixed inset-0 top-0 bottom-0 flex flex-col">
        {selectedConv ? (
          <div className="flex-1 flex flex-col pb-16">
            {/* Chat Header with Menu Button */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg relative z-10 flex-shrink-0">
              <div className="flex items-center gap-2 p-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDrawerOpen(true)}
                  className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all"
                >
                  <motion.div
                    animate={{ rotate: drawerOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                  {conversations.filter(c => c.unread_count > 0).length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-purple-600"
                    >
                      {conversations.filter(c => c.unread_count > 0).length}
                    </motion.div>
                  )}
                </motion.button>

                <Avatar className="w-10 h-10 border-2 border-white/30 flex-shrink-0">
                  <AvatarFallback className="bg-white/20 text-white font-bold">
                    {selectedConv.other_user_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate text-[15px]">{selectedConv.other_user_name}</p>
                  <p className="text-xs text-purple-100 truncate">{selectedConv.offer_title}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full flex-shrink-0">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate(`/offer/${selectedConv.offer_id}`)}>
                      <Eye className="w-4 h-4 ml-2" />
                      عرض العرض
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/profile/${selectedConv.other_user_id}`)}>
                      <User className="w-4 h-4 ml-2" />
                      عرض الملف الشخصي
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden bg-gradient-to-b from-purple-50/30 via-white to-purple-50/20">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2 pb-32">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">ابدأ المحادثة الآن</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
                          msg.sender_id === user.id 
                            ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-br-md" 
                            : "bg-white border border-purple-100 text-gray-800 rounded-bl-md"
                        }`}>
                          <p className="leading-relaxed text-[15px] break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1.5 ${msg.sender_id === user.id ? "text-purple-100" : "text-gray-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area - Fixed at bottom above mobile nav */}
            <div className="absolute bottom-16 left-0 right-0 border-t border-purple-100 bg-white shadow-lg p-3 z-30">
              <div className="flex gap-2 items-end">
                <Input 
                  placeholder="اكتب رسالة..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="rounded-full border-purple-200 focus:border-purple-400 px-4 py-2.5 text-base"
                  style={{ minHeight: '44px' }}
                />
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button 
                    onClick={sendMessage} 
                    disabled={sending || !newMessage.trim()} 
                    className="rounded-full w-11 h-11 p-0 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 flex-shrink-0 shadow-lg"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        ) : (
          /* No conversation selected - Show list */
          <div className="flex-1 flex flex-col bg-white pb-16">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 pb-6 shadow-lg">
              <h1 className="text-2xl font-bold">الرسائل</h1>
              <p className="text-sm text-purple-100 mt-1">{conversations.length} محادثة</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationsList mobile={true} onSelect={selectConversation} />
            </div>
          </div>
        )}

        {/* Conversations Drawer - Slide from Right */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setDrawerOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 overflow-hidden"
              >
                <ConversationsList mobile={true} onSelect={selectConversation} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Profile Page - COMPLETE
const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">الملف الشخصي</h1>
        <GlassCard className="mb-6" hover={false}>
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20 border-2 border-primary/20"><AvatarFallback className="bg-primary text-white text-3xl">{user?.name?.charAt(0)}</AvatarFallback></Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex items-center gap-3">
                <TrustBadge score={user?.trust_score || 0} />
                <span className="text-sm text-muted-foreground">{user?.trades_count || 0} مقايضة</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid gap-4 mb-6">
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><Phone className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">رقم الهاتف</p><p className="font-medium">{user?.phone || "غير محدد"}</p></div></GlassCard>
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><MapPin className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">المحافظة</p><p className="font-medium">{user?.governorate}</p></div></GlassCard>
          <GlassCard className="flex items-center gap-4 p-4" hover={false}><Calendar className="w-5 h-5 text-primary" /><div><p className="text-sm text-muted-foreground">تاريخ التسجيل</p><p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString("ar-SY") : "غير محدد"}</p></div></GlassCard>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full rounded-xl justify-start h-12" onClick={() => navigate("/my-offers")}><Package className="w-5 h-5 ml-2" />عروضي</Button>
          <Button variant="outline" className="w-full rounded-xl justify-start h-12" onClick={() => navigate("/favorites")}><Heart className="w-5 h-5 ml-2" />المفضلة</Button>
          {user?.is_admin && <Button variant="outline" className="w-full rounded-xl justify-start h-12 text-primary" onClick={() => navigate("/admin")}><LayoutDashboard className="w-5 h-5 ml-2" />لوحة التحكم</Button>}
          <Button variant="destructive" className="w-full rounded-xl h-12" onClick={logout}><LogOut className="w-5 h-5 ml-2" />تسجيل الخروج</Button>
        </div>
      </div>
    </div>
  );
};

// My Offers Page - COMPLETE
const MyOffersPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try { const res = await api.get("/my-offers"); setOffers(res.data); }
    catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try { await api.put(`/offers/${id}/status?status=${status}`); setOffers(offers.map(o => o.id === id ? { ...o, status } : o)); toast.success("تم تحديث الحالة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  const deleteOffer = async (id) => {
    if (!window.confirm("هل تريد حذف هذا العرض؟")) return;
    try { await api.delete(`/offers/${id}`); setOffers(offers.filter(o => o.id !== id)); toast.success("تم حذف العرض"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">عروضي</h1>
          <Button onClick={() => navigate("/add-offer")} className="rounded-xl"><Plus className="w-5 h-5 ml-2" />إضافة عرض</Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
        ) : offers.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عروض</h3>
            <p className="text-muted-foreground mb-6">ابدأ بإضافة عرضك الأول</p>
            <Button onClick={() => navigate("/add-offer")} className="rounded-xl"><Plus className="w-5 h-5 ml-2" />إضافة عرض</Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} showActions onStatusChange={updateStatus} onDelete={deleteOffer} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// Favorites Page - COMPLETE
const FavoritesPage = () => {
  const { api } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFavorites(); }, []);

  const fetchFavorites = async () => {
    try { const res = await api.get("/favorites"); setFavorites(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">المفضلة</h1>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
        ) : favorites.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد عناصر في المفضلة</h3>
            <p className="text-muted-foreground">أضف عروضاً للمفضلة لتجدها هنا</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{favorites.map((offer, idx) => <OfferCard key={offer.id} offer={offer} delay={idx * 0.05} />)}</div>
        )}
      </div>
    </div>
  );
};

// Blog Page
const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const res = await axios.get(`${API}/blog`); setPosts(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">المدونة</h1>
        {loading ? (
          <div className="grid gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
        ) : posts.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">لا توجد مقالات</h3>
            <p className="text-muted-foreground">ترقب مقالاتنا القادمة</p>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <GlassCard key={post.id} className="p-6">
                <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString("ar-SY")}</span>
                  <Button variant="outline" className="rounded-xl">قراءة المزيد</Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Dashboard - COMPLETE
const AdminDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try { const res = await api.get("/admin/stats"); setStats(res.data); }
    catch (e) { toast.error("فشل تحميل الإحصائيات"); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-24 md:pb-8 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">لوحة التحكم</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-white/80 p-1 rounded-full flex-wrap gap-1">
            <TabsTrigger value="overview" className="rounded-full"><TrendingUp className="w-4 h-4 ml-2" />نظرة عامة</TabsTrigger>
            <TabsTrigger value="users" className="rounded-full"><Users className="w-4 h-4 ml-2" />المستخدمون</TabsTrigger>
            <TabsTrigger value="offers" className="rounded-full"><Package className="w-4 h-4 ml-2" />العروض</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full"><AlertTriangle className="w-4 h-4 ml-2" />البلاغات</TabsTrigger>
            <TabsTrigger value="blog" className="rounded-full"><BookOpen className="w-4 h-4 ml-2" />المدونة</TabsTrigger>
            <TabsTrigger value="pages" className="rounded-full"><Layers className="w-4 h-4 ml-2" />الصفحات</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full"><Settings className="w-4 h-4 ml-2" />الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><AdminOverview stats={stats} /></TabsContent>
          <TabsContent value="users"><AdminUsers /></TabsContent>
          <TabsContent value="offers"><AdminOffers /></TabsContent>
          <TabsContent value="reports"><AdminReports /></TabsContent>
          <TabsContent value="blog"><AdminBlog /></TabsContent>
          <TabsContent value="pages"><AdminPages /></TabsContent>
          <TabsContent value="settings"><AdminSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Admin Overview Tab
const AdminOverview = ({ stats }) => (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: "المستخدمون", value: stats?.users_count || 0, icon: Users, color: "bg-primary/10 text-primary" },
        { label: "العروض النشطة", value: stats?.active_offers || 0, icon: Package, color: "bg-green-100 text-green-600" },
        { label: "الرسائل", value: stats?.messages_count || 0, icon: MessageCircle, color: "bg-blue-100 text-blue-600" },
        { label: "البلاغات المعلقة", value: stats?.pending_reports || 0, icon: AlertTriangle, color: "bg-red-100 text-red-600" },
      ].map((stat, idx) => (
        <GlassCard key={idx} hover={false}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
            <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
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
              <div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{cat}</span><span>{count}</span></div><Progress value={(count / Math.max(...Object.values(stats?.by_category || { a: 1 }))) * 100} className="h-2" /></div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard hover={false}>
        <h3 className="font-bold mb-4">العروض حسب المحافظة</h3>
        <div className="space-y-3">
          {Object.entries(stats?.by_governorate || {}).slice(0, 7).map(([gov, count]) => (
            <div key={gov} className="flex items-center gap-3">
              <div className="flex-1"><div className="flex justify-between text-sm mb-1"><span>{gov}</span><span>{count}</span></div><Progress value={(count / Math.max(...Object.values(stats?.by_governorate || { a: 1 }))) * 100} className="h-2" /></div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  </>
);

// Admin Users Tab
const AdminUsers = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { const res = await api.get("/admin/users"); setUsers(res.data.users || res.data); }
    catch (e) { toast.error("فشل تحميل المستخدمين"); }
    finally { setLoading(false); }
  };

  const updateTrust = async (userId, score) => {
    try { await api.put(`/admin/users/${userId}/trust?trust_score=${score}`); setUsers(users.map(u => u.id === userId ? { ...u, trust_score: score } : u)); toast.success("تم تحديث مؤشر الثقة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
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
              <tr key={user.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback className="bg-primary text-white">{user.name?.charAt(0)}</AvatarFallback></Avatar>
                    <div><p className="font-medium">{user.name}</p>{user.is_admin && <Badge className="bg-primary text-xs">أدمن</Badge>}</div>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{user.email}</td>
                <td className="p-4">{user.governorate}</td>
                <td className="p-4"><div className="flex items-center gap-2"><TrustBadge score={user.trust_score} /><span className="text-sm text-muted-foreground">{user.trust_score}</span></div></td>
                <td className="p-4">{user.trades_count}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.min(100, (user.trust_score || 0) + 10))}><Plus className="w-4 h-4 ml-2" />زيادة الثقة +10</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTrust(user.id, Math.max(0, (user.trust_score || 0) - 10))}><X className="w-4 h-4 ml-2" />إنقاص الثقة -10</DropdownMenuItem>
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
const AdminOffers = () => {
  const { api } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOffers(); }, []);

  const fetchOffers = async () => {
    try { const res = await api.get("/admin/offers"); setOffers(res.data.offers || res.data); }
    catch (e) { toast.error("فشل تحميل العروض"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (offerId, status) => {
    try { await api.put(`/admin/offers/${offerId}/status?status=${status}`); setOffers(offers.map(o => o.id === offerId ? { ...o, status } : o)); toast.success("تم تحديث الحالة"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
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
              <tr key={offer.id} className="border-b border-purple-50 hover:bg-purple-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl overflow-hidden">
                      {offer.images?.[0] ? <img src={offer.images[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-purple-300" /></div>}
                    </div>
                    <span className="font-medium">{offer.title}</span>
                  </div>
                </td>
                <td className="p-4">{offer.user_name}</td>
                <td className="p-4">{offer.category}</td>
                <td className="p-4">{offer.governorate}</td>
                <td className="p-4"><Badge className={offer.status === "active" ? "bg-green-500" : offer.status === "pending" ? "bg-yellow-500" : "bg-gray-500"}>{offer.status === "active" ? "نشط" : offer.status === "pending" ? "معلق" : "موقوف"}</Badge></td>
                <td className="p-4">{offer.views}</td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "active")}><CheckCircle className="w-4 h-4 ml-2 text-green-500" />تفعيل</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(offer.id, "suspended")}><Ban className="w-4 h-4 ml-2 text-red-500" />إيقاف</DropdownMenuItem>
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
const AdminReports = () => {
  const { api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try { const res = await api.get("/admin/reports"); setReports(res.data); }
    catch (e) { toast.error("فشل تحميل البلاغات"); }
    finally { setLoading(false); }
  };

  const updateStatus = async (reportId, status) => {
    try { await api.put(`/admin/reports/${reportId}?status=${status}`); setReports(reports.map(r => r.id === reportId ? { ...r, status } : r)); toast.success("تم التحديث"); }
    catch (e) { toast.error("فشل التحديث"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <GlassCard hover={false}>
      {reports.length === 0 ? (
        <div className="text-center py-12"><CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" /><p className="text-xl font-semibold">لا توجد بلاغات معلقة</p></div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="p-4 border border-purple-100 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge className={report.status === "pending" ? "bg-yellow-500" : report.status === "resolved" ? "bg-green-500" : "bg-gray-500"}>{report.status === "pending" ? "معلق" : report.status === "resolved" ? "تم الحل" : "مرفوض"}</Badge>
                  <p className="font-bold mt-2">{report.reason}</p>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(report.created_at).toLocaleDateString("ar-SY")}</p>
              </div>
              <p className="text-muted-foreground mb-3">{report.details}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(report.id, "resolved")} className="rounded-xl"><Check className="w-4 h-4 ml-1" />تم الحل</Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(report.id, "rejected")} className="rounded-xl">رفض</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};

// Admin Blog Tab
const AdminBlog = () => {
  const { api } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", excerpt: "", tags: [], is_published: false });

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try { const res = await api.get("/blog?published_only=false"); setPosts(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createPost = async () => {
    try { await api.post("/blog", form); toast.success("تم إنشاء المقالة"); setShowDialog(false); setForm({ title: "", content: "", excerpt: "", tags: [], is_published: false }); fetchPosts(); }
    catch (e) { toast.error("فشل الإنشاء"); }
  };

  const deletePost = async (id) => {
    if (!window.confirm("هل تريد حذف هذه المقالة؟")) return;
    try { await api.delete(`/blog/${id}`); setPosts(posts.filter(p => p.id !== id)); toast.success("تم الحذف"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">إدارة المدونة</h2>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />مقالة جديدة</Button>
      </div>
      
      <GlassCard hover={false}>
        {posts.length === 0 ? (
          <div className="text-center py-12"><BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>لا توجد مقالات</p></div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 border border-purple-100 rounded-xl">
                <div>
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(post.created_at).toLocaleDateString("ar-SY")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={post.is_published ? "bg-green-500" : "bg-gray-500"}>{post.is_published ? "منشور" : "مسودة"}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => deletePost(post.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>إنشاء مقالة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
            <div><Label>المقتطف</Label><Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="mt-2 rounded-xl" rows={2} /></div>
            <div><Label>المحتوى</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="mt-2 rounded-xl" rows={6} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>نشر فوراً</Label></div>
          </div>
          <DialogFooter><Button onClick={createPost} className="rounded-xl">إنشاء المقالة</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Admin Pages Tab - Page Builder
const BLOCK_TYPES = [
  { type: "hero", label: "بطل الصفحة", icon: Layout, description: "قسم رئيسي بصورة وعنوان" },
  { type: "text", label: "نص", icon: Type, description: "فقرة نصية" },
  { type: "slider", label: "سلايدر", icon: Layers, description: "عرض شرائح صور" },
  { type: "listings", label: "عروض", icon: Grid3X3, description: "عرض أحدث العروض" },
  { type: "banner", label: "بانر", icon: ImageIcon, description: "صورة إعلانية" },
  { type: "contact", label: "تواصل", icon: Mail, description: "نموذج تواصل" },
];

const AdminPages = () => {
  const { api } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [form, setForm] = useState({ title: "", slug: "", blocks: [], is_published: false });

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    try { const res = await api.get("/pages"); setPages(res.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createPage = async () => {
    try { 
      await api.post("/pages", form); 
      toast.success("تم إنشاء الصفحة"); 
      setShowDialog(false); 
      setForm({ title: "", slug: "", blocks: [], is_published: false }); 
      fetchPages(); 
    }
    catch (e) { toast.error(e.response?.data?.detail || "فشل الإنشاء"); }
  };

  const updatePage = async () => {
    try { 
      await api.put(`/pages/${editingPage.id}`, form); 
      toast.success("تم تحديث الصفحة"); 
      setEditingPage(null); 
      setForm({ title: "", slug: "", blocks: [], is_published: false }); 
      fetchPages(); 
    }
    catch (e) { toast.error(e.response?.data?.detail || "فشل التحديث"); }
  };

  const deletePage = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الصفحة؟")) return;
    try { await api.delete(`/pages/${id}`); setPages(pages.filter(p => p.id !== id)); toast.success("تم الحذف"); }
    catch (e) { toast.error("فشل الحذف"); }
  };

  const openEditPage = (page) => {
    setEditingPage(page);
    setForm({ title: page.title, slug: page.slug, blocks: page.blocks || [], is_published: page.is_published });
  };

  const addBlock = (type) => {
    const newBlock = {
      id: `block_${Date.now()}`,
      type,
      content: getDefaultBlockContent(type),
      order: form.blocks.length
    };
    setForm({ ...form, blocks: [...form.blocks, newBlock] });
  };

  const getDefaultBlockContent = (type) => {
    switch (type) {
      case "hero": return { title: "عنوان رئيسي", subtitle: "نص فرعي", buttonText: "ابدأ الآن", buttonLink: "/browse", backgroundImage: "" };
      case "text": return { title: "عنوان القسم", content: "محتوى النص هنا..." };
      case "slider": return { images: [], autoPlay: true };
      case "listings": return { title: "أحدث العروض", count: 4 };
      case "banner": return { image: "", link: "", alt: "بانر" };
      case "contact": return { title: "تواصل معنا", email: "", phone: "" };
      default: return {};
    }
  };

  const updateBlockContent = (blockId, newContent) => {
    setForm({
      ...form,
      blocks: form.blocks.map(b => b.id === blockId ? { ...b, content: { ...b.content, ...newContent } } : b)
    });
  };

  const removeBlock = (blockId) => {
    setForm({ ...form, blocks: form.blocks.filter(b => b.id !== blockId) });
  };

  const moveBlock = (blockId, direction) => {
    const idx = form.blocks.findIndex(b => b.id === blockId);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.blocks.length - 1)) return;
    const newBlocks = [...form.blocks];
    [newBlocks[idx], newBlocks[idx + direction]] = [newBlocks[idx + direction], newBlocks[idx]];
    setForm({ ...form, blocks: newBlocks.map((b, i) => ({ ...b, order: i })) });
  };

  if (loading) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">بناء الصفحات</h2>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />صفحة جديدة</Button>
      </div>
      
      <GlassCard hover={false}>
        {pages.length === 0 ? (
          <div className="text-center py-12"><Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><p>لا توجد صفحات مخصصة</p></div>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-4 border border-purple-100 rounded-xl">
                <div>
                  <h3 className="font-bold">{page.title}</h3>
                  <p className="text-sm text-muted-foreground">/{page.slug} • {page.blocks?.length || 0} مكونات</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={page.is_published ? "bg-green-500" : "bg-gray-500"}>{page.is_published ? "منشور" : "مسودة"}</Badge>
                  <Button variant="outline" size="sm" onClick={() => openEditPage(page)} className="rounded-xl"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePage(page.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Create Page Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء صفحة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>عنوان الصفحة</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" placeholder="من نحن" /></div>
            <div><Label>الرابط (Slug)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-2 rounded-xl" placeholder="about-us" dir="ltr" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /><Label>نشر فوراً</Label></div>
          </div>
          <DialogFooter><Button onClick={createPage} className="rounded-xl">إنشاء الصفحة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog (Page Builder) */}
      <Dialog open={!!editingPage} onOpenChange={() => { setEditingPage(null); setForm({ title: "", slug: "", blocks: [], is_published: false }); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الصفحة: {editingPage?.title}</DialogTitle>
            <DialogDescription>استخدم المكعبات لبناء صفحتك</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>عنوان الصفحة</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 rounded-xl" /></div>
              <div><Label>الرابط</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-2 rounded-xl" dir="ltr" /></div>
            </div>

            {/* Add Block Section */}
            <div className="border-2 border-dashed border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium mb-3">إضافة مكون جديد:</p>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <Button key={bt.type} variant="outline" size="sm" onClick={() => addBlock(bt.type)} className="rounded-xl">
                    <bt.icon className="w-4 h-4 ml-2" />{bt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Blocks List */}
            <div className="space-y-4">
              {form.blocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مكونات. أضف مكوناً للبدء</p>
                </div>
              ) : (
                form.blocks.map((block, idx) => (
                  <div key={block.id} className="border border-purple-100 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{BLOCK_TYPES.find(bt => bt.type === block.type)?.label || block.type}</Badge>
                        <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}><ChevronRight className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => moveBlock(block.id, 1)} disabled={idx === form.blocks.length - 1}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <BlockEditor block={block} onUpdate={(content) => updateBlockContent(block.id, content)} />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>نشر الصفحة</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPage(null); setForm({ title: "", slug: "", blocks: [], is_published: false }); }} className="rounded-xl">إلغاء</Button>
            <Button onClick={updatePage} className="rounded-xl"><Save className="w-4 h-4 ml-2" />حفظ التغييرات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Block Editor Component
const BlockEditor = ({ block, onUpdate }) => {
  const content = block.content || {};
  
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3">
          <Input placeholder="العنوان الرئيسي" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Input placeholder="النص الفرعي" value={content.subtitle || ""} onChange={(e) => onUpdate({ subtitle: e.target.value })} className="rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="نص الزر" value={content.buttonText || ""} onChange={(e) => onUpdate({ buttonText: e.target.value })} className="rounded-xl" />
            <Input placeholder="رابط الزر" value={content.buttonLink || ""} onChange={(e) => onUpdate({ buttonLink: e.target.value })} className="rounded-xl" dir="ltr" />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Textarea placeholder="المحتوى" value={content.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} className="rounded-xl" rows={4} />
        </div>
      );
    case "listings":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <div className="flex items-center gap-2">
            <Label>عدد العروض:</Label>
            <Input type="number" min="1" max="12" value={content.count || 4} onChange={(e) => onUpdate({ count: parseInt(e.target.value) })} className="w-20 rounded-xl" />
          </div>
        </div>
      );
    case "banner":
      return (
        <div className="grid gap-3">
          <Input placeholder="رابط الصورة" value={content.image || ""} onChange={(e) => onUpdate({ image: e.target.value })} className="rounded-xl" dir="ltr" />
          <Input placeholder="رابط البانر" value={content.link || ""} onChange={(e) => onUpdate({ link: e.target.value })} className="rounded-xl" dir="ltr" />
          <Input placeholder="النص البديل" value={content.alt || ""} onChange={(e) => onUpdate({ alt: e.target.value })} className="rounded-xl" />
        </div>
      );
    case "contact":
      return (
        <div className="grid gap-3">
          <Input placeholder="عنوان القسم" value={content.title || ""} onChange={(e) => onUpdate({ title: e.target.value })} className="rounded-xl" />
          <Input placeholder="البريد الإلكتروني" value={content.email || ""} onChange={(e) => onUpdate({ email: e.target.value })} className="rounded-xl" dir="ltr" />
          <Input placeholder="رقم الهاتف" value={content.phone || ""} onChange={(e) => onUpdate({ phone: e.target.value })} className="rounded-xl" />
        </div>
      );
    case "slider":
      return (
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={content.autoPlay !== false} onCheckedChange={(v) => onUpdate({ autoPlay: v })} />
            <Label>تشغيل تلقائي</Label>
          </div>
          <p className="text-sm text-muted-foreground">يمكنك إضافة الصور عبر روابط مفصولة بفاصلة</p>
          <Textarea placeholder="روابط الصور (كل رابط في سطر)" value={(content.images || []).join("\n")} onChange={(e) => onUpdate({ images: e.target.value.split("\n").filter(Boolean) })} className="rounded-xl" rows={3} />
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">مكون غير معروف</p>;
  }
};

// Admin Settings Tab
const AdminSettings = () => {
  const { api } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [form, setForm] = useState({
    site_name: "",
    site_logo: "",
    contact_email: "",
    contact_phone: "",
    footer_text: "",
    primary_color: "#8b5cf6",
    menu_items: []
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({ id: "", label: "", link: "", icon: "globe", is_visible: true, order: 0, open_in_new_tab: false });

  const MENU_ICONS = [
    { value: "home", label: "🏠 الرئيسية" },
    { value: "search", label: "🔍 بحث" },
    { value: "book", label: "📖 كتاب" },
    { value: "heart", label: "❤️ قلب" },
    { value: "user", label: "👤 مستخدم" },
    { value: "mail", label: "✉️ بريد" },
    { value: "phone", label: "📞 هاتف" },
    { value: "star", label: "⭐ نجمة" },
    { value: "package", label: "📦 طرد" },
    { value: "settings", label: "⚙️ إعدادات" },
    { value: "globe", label: "🌐 عالم" },
    { value: "calendar", label: "📅 تقويم" },
    { value: "award", label: "🏆 جائزة" },
    { value: "zap", label: "⚡ برق" },
    { value: "map", label: "📍 موقع" },
  ];

  useEffect(() => {
    if (settings) {
      setForm({
        site_name: settings.site_name || "",
        site_logo: settings.site_logo || "",
        contact_email: settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        footer_text: settings.footer_text || "",
        primary_color: settings.primary_color || "#8b5cf6",
        menu_items: settings.menu_items || []
      });
      setLogoPreview(settings.site_logo || "");
    }
  }, [settings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { toast.error("حجم الشعار يجب أن يكون أقل من 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm({ ...form, site_logo: reader.result });
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    setLoading(true);
    try { await api.put("/settings", form); toast.success("تم حفظ الإعدادات"); refreshSettings(); }
    catch (e) { toast.error("فشل الحفظ"); }
    finally { setLoading(false); }
  };

  // Menu Management Functions
  const openAddMenu = () => {
    setEditingMenuItem(null);
    setMenuForm({ id: `menu_${Date.now()}`, label: "", link: "", icon: "globe", is_visible: true, order: form.menu_items.length, open_in_new_tab: false });
    setShowMenuDialog(true);
  };

  const openEditMenu = (item) => {
    setEditingMenuItem(item);
    setMenuForm({ ...item });
    setShowMenuDialog(true);
  };

  const saveMenuItem = () => {
    if (!menuForm.label || !menuForm.link) { toast.error("يرجى ملء جميع الحقول"); return; }
    
    if (editingMenuItem) {
      setForm({ ...form, menu_items: form.menu_items.map(item => item.id === editingMenuItem.id ? menuForm : item) });
    } else {
      setForm({ ...form, menu_items: [...form.menu_items, menuForm] });
    }
    setShowMenuDialog(false);
    toast.success(editingMenuItem ? "تم تحديث العنصر" : "تم إضافة العنصر");
  };

  const deleteMenuItem = (itemId) => {
    setForm({ ...form, menu_items: form.menu_items.filter(item => item.id !== itemId) });
    toast.success("تم حذف العنصر");
  };

  const moveMenuItem = (itemId, direction) => {
    const idx = form.menu_items.findIndex(item => item.id === itemId);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === form.menu_items.length - 1)) return;
    const newItems = [...form.menu_items];
    [newItems[idx], newItems[idx + direction]] = [newItems[idx + direction], newItems[idx]];
    setForm({ ...form, menu_items: newItems.map((item, i) => ({ ...item, order: i })) });
  };

  const toggleMenuVisibility = (itemId) => {
    setForm({ ...form, menu_items: form.menu_items.map(item => item.id === itemId ? { ...item, is_visible: !item.is_visible } : item) });
  };

  return (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Globe className="w-5 h-5" />إعدادات الموقع</h3>
        <div className="grid gap-4">
          <div><Label>اسم الموقع</Label><Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className="mt-2 rounded-xl" /></div>
          <div><Label>البريد الإلكتروني للتواصل</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-2 rounded-xl" type="email" /></div>
          <div><Label>رقم الهاتف للتواصل</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-2 rounded-xl" /></div>
          <div><Label>نص الفوتر</Label><Input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-2 rounded-xl" /></div>
        </div>
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5" />شعار الموقع</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-purple-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-200">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-1" />
                <span className="text-xs">لا يوجد شعار</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-3">ارفع شعار الموقع (PNG, JPG - أقل من 1MB)</p>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" className="rounded-xl" asChild><span><Upload className="w-4 h-4 ml-2" />رفع شعار</span></Button>
              </label>
              {logoPreview && (
                <Button type="button" variant="ghost" className="rounded-xl text-destructive" onClick={() => { setForm({ ...form, site_logo: "" }); setLogoPreview(""); }}>
                  <Trash2 className="w-4 h-4 ml-2" />حذف
                </Button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Menu Management Section */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><Menu className="w-5 h-5" />إدارة القائمة الرئيسية</h3>
          <Button onClick={openAddMenu} size="sm" className="rounded-xl"><PlusCircle className="w-4 h-4 ml-2" />إضافة عنصر</Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">خصّص عناصر القائمة الرئيسية التي تظهر في الموقع على جميع الأجهزة</p>
        
        {form.menu_items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-purple-200 rounded-xl">
            <Menu className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">لم تتم إضافة عناصر للقائمة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">سيتم استخدام القائمة الافتراضية</p>
          </div>
        ) : (
          <div className="space-y-2">
            {form.menu_items.sort((a, b) => a.order - b.order).map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.is_visible ? 'border-purple-100 bg-purple-50/50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMenuItem(item.id, -1)} disabled={idx === 0}><ChevronRight className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMenuItem(item.id, 1)} disabled={idx === form.menu_items.length - 1}><ChevronLeft className="w-4 h-4" /></Button>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="text-lg">{MENU_ICONS.find(i => i.value === item.icon)?.label.split(' ')[0] || '🌐'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{item.link}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.open_in_new_tab && <Badge variant="outline" className="text-xs"><ExternalLink className="w-3 h-3 ml-1" />تبويب جديد</Badge>}
                  <Switch checked={item.is_visible} onCheckedChange={() => toggleMenuVisibility(item.id)} />
                  <Button variant="ghost" size="icon" onClick={() => openEditMenu(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMenuItem(item.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Palette className="w-5 h-5" />الألوان</h3>
        <div className="flex items-center gap-4">
          <Label>اللون الأساسي</Label>
          <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-12 h-12 rounded-xl cursor-pointer" />
          <span className="text-sm text-muted-foreground">{form.primary_color}</span>
        </div>
      </GlassCard>

      <Button onClick={saveSettings} disabled={loading} className="rounded-xl w-full h-12">
        {loading ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Save className="w-5 h-5 ml-2" />}حفظ الإعدادات
      </Button>

      {/* Menu Item Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "تعديل عنصر القائمة" : "إضافة عنصر جديد"}</DialogTitle>
            <DialogDescription>أضف رابطاً جديداً للقائمة الرئيسية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم العنصر</Label>
              <Input value={menuForm.label} onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })} className="mt-2 rounded-xl" placeholder="مثال: من نحن" />
            </div>
            <div>
              <Label>الرابط</Label>
              <Input value={menuForm.link} onChange={(e) => setMenuForm({ ...menuForm, link: e.target.value })} className="mt-2 rounded-xl" placeholder="/about أو https://..." dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">استخدم / للصفحات الداخلية أو رابط كامل للخارجية</p>
            </div>
            <div>
              <Label>الأيقونة</Label>
              <Select value={menuForm.icon} onValueChange={(v) => setMenuForm({ ...menuForm, icon: v })}>
                <SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MENU_ICONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>{icon.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={menuForm.is_visible} onCheckedChange={(v) => setMenuForm({ ...menuForm, is_visible: v })} />
                <Label>ظاهر</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={menuForm.open_in_new_tab} onCheckedChange={(v) => setMenuForm({ ...menuForm, open_in_new_tab: v })} />
                <Label>فتح في تبويب جديد</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMenuDialog(false)} className="rounded-xl">إلغاء</Button>
            <Button onClick={saveMenuItem} className="rounded-xl">{editingMenuItem ? "حفظ التعديلات" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Scroll To Top Component - يعيد التمرير للأعلى عند تغيير الصفحة
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // لا تقم بالتمرير للأعلى في صفحة المراسلات لأن لديها تمرير خاص
    if (!pathname.startsWith('/messages')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
};

// Main App
function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
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
                <Route path="/edit-offer/:id" element={<ProtectedRoute><EditOfferPage /></ProtectedRoute>} />
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
