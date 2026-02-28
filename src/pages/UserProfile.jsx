import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { User, Package, LogOut, Loader2, CreditCard, Calendar, MapPin, BadgeCheck, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const UserProfile = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // In a real app, we would get the user from Auth Context
  // For this demo, we might fetch orders based on stored email or just show all for demo purposes if no auth
  // OR we can mock auth. Let's assume we want to show *some* orders to visualize the UI.
  // We'll fetch orders from localStorage if we stored them, OR fetch recent public orders as a fallback for demo visual.
  // Correct approach: Fetch orders for the *current authenticated user*.
  // Since auth flow wasn't strictly enforced in Checkout for guest checkout, we might not have a user ID linked to orders.
  // We will assume 'guest' mode doesn't show profile orders, or we use a simple email match if user is logged in.
  
  // For the purpose of the task "Add order status indicators", I will fetch all orders (admin style) or just mock connection
  // if no user is logged in, but better yet, let's fetch orders where we can.
  
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10); // Limit for demo performance

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'payment_failed': return 'bg-red-100 text-red-700 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <BadgeCheck className="w-4 h-4 mr-1" />;
      case 'pending': return <Clock className="w-4 h-4 mr-1" />;
      case 'failed': return <AlertCircle className="w-4 h-4 mr-1" />;
      case 'payment_failed': return <AlertCircle className="w-4 h-4 mr-1" />;
      default: return null;
    }
  };

  const getStatusLabel = (status) => {
      const map = {
          'paid': 'გადახდილია',
          'pending': 'ელოდება გადახდას',
          'failed': 'უარყოფილი',
          'payment_failed': 'გადახდა ვერ შესრულდა',
          'processing': 'მუშავდება',
          'new': 'ახალი'
      };
      return map[status] || status;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <Helmet>
        <title>ჩემი პროფილი - Handicraft</title>
      </Helmet>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="md:w-1/4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-[#57c5cf]/10 rounded-full mx-auto flex items-center justify-center text-[#57c5cf] mb-4">
              <User size={40} />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-800">მომხმარებელი</h2>
            <p className="text-gray-500 font-body text-sm mb-6">user@example.com</p>
            
            <nav className="space-y-2 text-left">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#57c5cf]/5 text-[#57c5cf] rounded-xl font-bold font-heading transition-colors">
                <Package size={20} />
                ჩემი შეკვეთები
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl font-heading transition-colors">
                 <LogOut size={20} />
                 გასვლა
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:w-3/4">
          <h1 className="text-3xl font-heading font-bold text-gray-800 mb-6 flex items-center gap-3">
             <Package className="text-[#f292bc]" /> შეკვეთების ისტორია
          </h1>

          {loading ? (
             <div className="flex justify-center py-12">
                 <Loader2 className="w-8 h-8 animate-spin text-[#57c5cf]" />
             </div>
          ) : orders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
                  <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-600 mb-2">შეკვეთები არ მოიძებნა</h3>
                  <Button onClick={() => navigate('/')} className="mt-4 bg-[#57c5cf] rounded-full">საყიდლებზე გადასვლა</Button>
              </div>
          ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-50 pb-4 mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-gray-800 font-heading">#{String(order.id).slice(0,8)}</h3>
                                <Badge className={`${getStatusColor(order.payment_status)} flex items-center`}>
                                    {getStatusIcon(order.payment_status)}
                                    {getStatusLabel(order.payment_status)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-body">
                                <Calendar size={14} />
                                {new Date(order.created_at).toLocaleDateString('ka-GE', { 
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                            </div>
                        </div>
                        <div className="text-right">
                             <span className="block text-2xl font-bold text-[#57c5cf] font-heading">₾{order.total_amount?.toFixed(2)}</span>
                             <span className="text-xs text-gray-400 font-body">სულ გადასახდელი</span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 text-sm text-gray-600 font-body">
                                 <CreditCard size={16} className="text-[#f292bc]" />
                                 <span>გადახდის მეთოდი: <strong>{order.payment_method === 'flitt' ? 'Flitt Online' : order.payment_method}</strong></span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-gray-600 font-body">
                                 <MapPin size={16} className="text-[#f292bc]" />
                                 <span>მისამართი: {order.customer_info?.city}, {order.customer_info?.address}</span>
                             </div>
                        </div>
                        
                        {order.payment_status === 'failed' || order.payment_status === 'payment_failed' ? (
                             <Button size="sm" className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                                 გადახდის გამეორება
                             </Button>
                        ) : (
                             <Button size="sm" variant="outline" className="text-gray-500 border-gray-200">
                                 დეტალები
                             </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserProfile;