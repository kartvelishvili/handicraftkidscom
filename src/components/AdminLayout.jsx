import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useSimplePasswordAuth } from '@/context/SimplePasswordAuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationCenter from '@/components/NotificationCenter';
import NotificationListener from '@/components/NotificationListener';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Layers, 
  Image, 
  Grid, 
  Languages, 
  Mail, 
  Settings, 
  LogOut,
  MoveVertical,
  FileText,
  Import,
  CreditCard,
  MessageSquare,
  ClipboardList,
  UploadCloud,
  Bell,
  List,
  Menu,
  X,
  ChevronLeft,
  Search,
  Home,
  PanelLeftClose,
  PanelLeft,
  Store,
  Palette,
  Megaphone,
  Cog
} from 'lucide-react';

const AdminLayout = () => {
  const { logout, adminUser } = useSimplePasswordAuth();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const menuGroups = [
    {
      label: 'ძირითადი',
      items: [
        { icon: LayoutDashboard, label: 'მთავარი', path: '/admin/dashboard' },
        { icon: ClipboardList, label: 'შეკვეთები', path: '/admin/orders', badge: true },
      ]
    },
    {
      label: 'კონტენტი',
      items: [
        { icon: MoveVertical, label: 'სექციები', path: '/admin/sections' },
        { icon: Image, label: 'ჰერო ბანერი', path: '/admin/hero' },
        { icon: FileText, label: 'გვერდები', path: '/admin/pages' },
      ]
    },
    {
      label: 'კატალოგი',
      items: [
        { icon: Layers, label: 'კატეგორიები', path: '/admin/categories' },
        { icon: List, label: 'მახასიათებლები', path: '/admin/category-attributes' },
        { icon: ShoppingBag, label: 'პროდუქტები', path: '/admin/products' },
        { icon: UploadCloud, label: 'იმპორტი', path: '/admin/import' },
        { icon: Grid, label: 'კოლექციები', path: '/admin/collections' },
      ]
    },
    {
      label: 'მარკეტინგი',
      items: [
        { icon: Mail, label: 'მეილები', path: '/admin/newsletter' },
        { icon: MessageSquare, label: 'SMS', path: '/admin/sms' },
      ]
    },
    {
      label: 'პარამეტრები',
      items: [
        { icon: Settings, label: 'ფუტერი', path: '/admin/footer' },
        { icon: Languages, label: 'თარგმანები', path: '/admin/settings' },
        { icon: CreditCard, label: 'Flitt გადახდა', path: '/admin/flitt-settings' },
        { icon: MessageSquare, label: 'SMS პარამეტრები', path: '/admin/sms-settings' },
        { icon: Bell, label: 'შეტყობინებები', path: '/admin/notifications-settings' },
      ]
    },
  ];

  // Current page title
  const allItems = menuGroups.flatMap(g => g.items);
  const currentPage = allItems.find(item => location.pathname === item.path);
  const pageTitle = currentPage?.label || 'ადმინ პანელი';

  const SidebarContent = () => (
    <>
      {/* Logo area */}
      <div className={`flex items-center h-16 border-b border-white/[0.06] px-4 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
        {sidebarOpen ? (
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">ადმინ პანელი</span>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">E-Commerce CMS</p>
            </div>
          </Link>
        ) : (
          <Link to="/admin/dashboard">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-2 px-3">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 text-[13px] font-medium
                      ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                      ${isActive 
                        ? 'bg-gradient-to-r from-cyan-500/15 to-teal-500/10 text-cyan-400' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cyan-400 rounded-r-full" />
                    )}
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {sidebarOpen && <span>{item.label}</span>}
                    {item.badge && unreadCount > 0 && sidebarOpen && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {unreadCount}
                      </span>
                    )}
                    {item.badge && unreadCount > 0 && !sidebarOpen && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section at bottom */}
      <div className="border-t border-white/[0.06] p-3">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
              {(adminUser || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{adminUser || 'Admin'}</p>
              <p className="text-[10px] text-slate-500">ადმინისტრატორი</p>
            </div>
          </div>
        ) : null}
        <button 
          onClick={logout}
          title={!sidebarOpen ? 'გასვლა' : undefined}
          className={`flex items-center gap-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 w-full transition-all duration-200 text-[13px] font-medium
            ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}`}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {sidebarOpen && <span>გასვლა</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 flex">
      <NotificationListener />
      
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside 
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-white/[0.06] fixed h-full z-30 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-[72px]'}`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-white/[0.06] flex flex-col transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]'}`}>
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Page title */}
            <div className="flex items-center gap-2 text-sm">
              <Link to="/admin/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
                <Home className="w-4 h-4" />
              </Link>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-700">{pageTitle}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View site button */}
            <Link 
              to="/" 
              target="_blank"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              საიტის ნახვა
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;