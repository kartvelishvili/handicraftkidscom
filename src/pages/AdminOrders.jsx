import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  ShoppingBag, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: "შეკვეთების ჩატვირთვა ვერ მოხერხდა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      toast({ title: "სტატუსი განახლებულია" });
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", variant: "destructive" });
    }
  };

  const toggleExpand = (id) => {
    if (expandedOrder === id) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <Helmet><title>Admin - Orders</title></Helmet>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">შეკვეთები</h1>
          <p className="text-gray-500 mt-1">სულ {orders.length} შეკვეთა</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="gap-2">
           განახლება
        </Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-heading text-sm text-gray-500">#</th>
                  <th className="p-4 font-heading text-sm text-gray-500">მომხმარებელი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">თანხა</th>
                  <th className="p-4 font-heading text-sm text-gray-500">გადახდა</th>
                  <th className="p-4 font-heading text-sm text-gray-500">სტატუსი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">თარიღი</th>
                  <th className="p-4 font-heading text-sm text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                      <td className="p-4 font-mono font-bold">#{order.order_number}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">
                          {order.customer_info?.firstName} {order.customer_info?.lastName}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {order.customer_info?.phone}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[#57c5cf]">
                        ₾{order.total_amount}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                           {order.payment_method === 'card' ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                           {order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი'}
                        </div>
                        {order.payment_status === 'paid' && (
                           <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full mt-1 inline-block">PAID</span>
                        )}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status || 'new'}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer focus:outline-none ${getStatusColor(order.status)}`}
                        >
                          <option value="new">ახალი</option>
                          <option value="pending">მიმდინარე</option>
                          <option value="completed">დასრულებული</option>
                          <option value="cancelled">გაუქმებული</option>
                        </select>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="p-4 text-right">
                         {expandedOrder === order.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </td>
                    </tr>
                    
                    {expandedOrder === order.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="7" className="p-6">
                           <div className="grid md:grid-cols-2 gap-8">
                              <div>
                                 <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                   <ShoppingBag className="w-4 h-4" /> შეკვეთის დეტალები
                                 </h4>
                                 <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                                   {Array.isArray(order.products) && order.products.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                                             <img src={item.image_url || item.image} alt="" className="w-full h-full object-cover" />
                                          </div>
                                          <div>
                                             <p className="font-bold text-sm text-gray-700">{item.name}</p>
                                             <p className="text-xs text-gray-500">x{item.quantity}</p>
                                          </div>
                                       </div>
                                       <span className="font-mono font-bold text-gray-600">₾{(item.price * item.quantity).toFixed(2)}</span>
                                     </div>
                                   ))}
                                   <div className="flex justify-between pt-2 font-bold text-gray-800 border-t border-gray-100">
                                      <span>სულ:</span>
                                      <span>₾{order.total_amount}</span>
                                   </div>
                                 </div>
                              </div>
                              
                              <div>
                                 <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                   <User className="w-4 h-4" /> ინფორმაცია
                                 </h4>
                                 <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 text-sm">
                                    <div className="flex items-start gap-3">
                                       <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                       <div>
                                          <p className="text-gray-500 text-xs">მისამართი</p>
                                          <p className="font-medium text-gray-700">{order.customer_info?.city}, {order.customer_info?.address}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                       <Banknote className="w-4 h-4 text-gray-400 mt-0.5" />
                                       <div>
                                          <p className="text-gray-500 text-xs">გადახდის მეთოდი</p>
                                          <p className="font-medium text-gray-700 capitalize">{order.payment_method}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                       <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                                       <div>
                                          <p className="text-gray-500 text-xs">შეკვეთის დრო</p>
                                          <p className="font-medium text-gray-700">{formatDate(order.created_at)}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
               <div className="p-12 text-center text-gray-400">შეკვეთები არ მოიძებნა</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;