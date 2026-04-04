import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  ShoppingBag, Users, DollarSign, TrendingUp, Bell, 
  ArrowUpRight, ArrowDownRight, Package, Eye, 
  ShoppingCart, Clock, CheckCircle, XCircle,
  Layers, FileText, Image, BarChart3, Activity,
  ChevronRight, ExternalLink, Zap, Star, Mail, Languages
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useSimplePasswordAuth } from '@/context/SimplePasswordAuthContext';

const StatCard = ({ title, value, icon: Icon, color, gradient, to }) => {
  const content = (
    <>
      {/* Subtle gradient backdrop */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${gradient} opacity-[0.07] -mr-8 -mt-8 group-hover:opacity-[0.12] transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {to && (
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          )}
        </div>
        <p className="text-[13px] text-slate-500 mb-1 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
      </div>
    </>
  );

  const className = "group relative bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden block";

  return to ? (
    <Link to={to} className={className}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

const QuickAction = ({ icon: Icon, label, to, color }) => (
  <Link to={to} className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-slate-100 hover:shadow-md hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-0.5">
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-xs font-semibold text-slate-600 text-center">{label}</span>
  </Link>
);

const AdminDashboard = () => {
  const { adminUser } = useSimplePasswordAuth();
  const [stats, setStats] = useState({ products: 0, orders: 0, categories: 0, revenue: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [prodRes, orderCountRes, recentOrderRes, catRes, revenueRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
      ]);

      const totalRevenue = revenueRes.data?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;

      setStats({
        products: prodRes.count || 0,
        orders: orderCountRes.count || 0,
        categories: catRes.count || 0,
        revenue: totalRevenue,
      });
      setRecentOrders(recentOrderRes.data || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'დილა მშვიდობისა';
    if (hour < 18) return 'შუადღე მშვიდობისა';
    return 'საღამო მშვიდობისა';
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed': return { label: 'დასრულებული', icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'cancelled': return { label: 'გაუქმებული', icon: XCircle, cls: 'bg-rose-50 text-rose-500 border-rose-100' };
      case 'processing': return { label: 'მუშავდება', icon: Clock, cls: 'bg-blue-50 text-blue-600 border-blue-100' };
      default: return { label: 'ახალი', icon: Clock, cls: 'bg-amber-50 text-amber-600 border-amber-100' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ka-GE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Helmet>
        <title>ადმინ პანელი - მთავარი</title>
      </Helmet>

      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500">{adminUser || 'Admin'}</span> 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">აი თქვენი მაღაზიის მიმოხილვა დღეისთვის</p>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/admin/notifications" 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-medium transition-all"
            >
              <Bell className="w-4 h-4" />
              ისტორია
            </Link>
            <Link 
              to="/admin/products/new" 
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              <Zap className="w-4 h-4" />
              ახალი პროდუქტი
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="სულ პროდუქტები" 
          value={loading ? '...' : stats.products} 
          icon={Package} 
          color="bg-gradient-to-br from-cyan-500 to-cyan-600" 
          gradient="bg-cyan-400"
          to="/admin/products"
        />
        <StatCard 
          title="შეკვეთები" 
          value={loading ? '...' : stats.orders} 
          icon={ShoppingCart} 
          color="bg-gradient-to-br from-violet-500 to-violet-600" 
          gradient="bg-violet-400"
          to="/admin/orders"
        />
        <StatCard 
          title="კატეგორიები" 
          value={loading ? '...' : stats.categories} 
          icon={Layers} 
          color="bg-gradient-to-br from-amber-500 to-orange-500" 
          gradient="bg-amber-400"
          to="/admin/categories"
        />
        <StatCard 
          title="შემოსავალი" 
          value={loading ? '...' : `₾${stats.revenue.toFixed(0)}`} 
          icon={DollarSign} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
          gradient="bg-emerald-400"
          to="/admin/payment-history"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">სწრაფი მოქმედებები</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <QuickAction icon={ShoppingBag} label="პროდუქტები" to="/admin/products" color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
          <QuickAction icon={Layers} label="კატეგორიები" to="/admin/categories" color="bg-gradient-to-br from-violet-500 to-violet-600" />
          <QuickAction icon={Image} label="ბანერი" to="/admin/hero" color="bg-gradient-to-br from-pink-500 to-rose-500" />
          <QuickAction icon={FileText} label="გვერდები" to="/admin/pages" color="bg-gradient-to-br from-amber-500 to-orange-500" />
          <QuickAction icon={Mail} label="მეილები" to="/admin/newsletter" color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <QuickAction icon={ShoppingCart} label="შეკვეთები" to="/admin/orders" color="bg-gradient-to-br from-blue-500 to-blue-600" />
          <QuickAction icon={Languages} label="თარგმანები" to="/admin/settings" color="bg-gradient-to-br from-slate-600 to-slate-700" />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-violet-600" />
              </div>
              <h2 className="font-bold text-slate-800">ბოლო შეკვეთები</h2>
            </div>
            <Link to="/admin/orders" className="text-xs font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors">
              ყველა <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">იტვირთება...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">შეკვეთები ჯერ არ არის</p>
              </div>
            ) : (
              recentOrders.map((order, i) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={order.id || i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">
                        #{(order.id || i + 1).toString().slice(-3)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{order.customer_info ? `${order.customer_info.firstName || ''} ${order.customer_info.lastName || ''}`.trim() || 'მომხმარებელი' : 'მომხმარებელი'}</p>
                        <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-700">
                        {order.total_amount ? `₾${parseFloat(order.total_amount).toFixed(0)}` : '—'}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border ${statusConfig.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* System Status / Quick Info */}
        <div className="space-y-6">
          {/* Site Overview Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-full -mr-12 -mt-12 blur-xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-lg">სტატუსი</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-sm text-slate-400">საიტის სტატუსი</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    აქტიური
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-sm text-slate-400">პროდუქტები</span>
                  <span className="text-sm font-medium text-slate-200">{loading ? '...' : stats.products} ერთეული</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-sm text-slate-400">კატეგორიები</span>
                  <span className="text-sm font-medium text-slate-200">{loading ? '...' : stats.categories} ერთეული</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-400">ბოლო განახლება</span>
                  <span className="text-sm font-medium text-slate-200">{new Date().toLocaleDateString('ka-GE')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tips card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800">რჩევები</h3>
            </div>
            <div className="space-y-3">
              <Link to="/admin/products/new" className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 bg-cyan-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-3.5 h-3.5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 group-hover:text-cyan-600 transition-colors">დაამატეთ ახალი პროდუქტი</p>
                  <p className="text-xs text-slate-400 mt-0.5">გაამდიდრეთ თქვენი კატალოგი</p>
                </div>
              </Link>
              <Link to="/admin/hero" className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 bg-rose-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Image className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 group-hover:text-cyan-600 transition-colors">განაახლეთ ბანერი</p>
                  <p className="text-xs text-slate-400 mt-0.5">მთავარი გვერდის ვიზუალი</p>
                </div>
              </Link>
              <Link to="/admin/sections" className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-6 h-6 bg-violet-100 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 group-hover:text-cyan-600 transition-colors">მართეთ სექციები</p>
                  <p className="text-xs text-slate-400 mt-0.5">მთავარი გვერდის განლაგება</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;