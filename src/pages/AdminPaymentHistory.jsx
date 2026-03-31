import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { CreditCard, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminPaymentHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'შეცდომა', description: 'მონაცემების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> გადახდილი</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> წარუმატებელი</span>;
      case 'refunded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700"><RefreshCw className="w-3 h-3" /> დაბრუნებული</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> მოლოდინში</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600"><Clock className="w-3 h-3" /> {status || 'N/A'}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ka-GE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.payment_status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${o.customer_info?.firstName || ''} ${o.customer_info?.lastName || ''}`.toLowerCase();
      const num = String(o.order_number || '');
      const pid = (o.payment_id || '').toLowerCase();
      const poid = (o.payment_order_id || '').toLowerCase();
      if (!name.includes(q) && !num.includes(q) && !pid.includes(q) && !poid.includes(q)) return false;
    }
    return true;
  });

  const paidCount = orders.filter(o => o.payment_status === 'paid').length;
  const failedCount = orders.filter(o => o.payment_status === 'failed').length;
  const pendingCount = orders.filter(o => o.payment_status === 'pending').length;

  return (
    <div className="space-y-8">
      <Helmet><title>Admin - გადახდების ისტორია</title></Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">გადახდების ისტორია</h1>
          <p className="text-gray-500 mt-1">ყველა გადახდის დეტალი და BOG/Flitt პასუხები</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> განახლება
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">სულ</p>
          <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
          <p className="text-sm text-green-600">გადახდილი</p>
          <p className="text-2xl font-bold text-green-700">{paidCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm">
          <p className="text-sm text-red-600">წარუმატებელი</p>
          <p className="text-2xl font-bold text-red-700">{failedCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-yellow-100 shadow-sm">
          <p className="text-sm text-yellow-600">მოლოდინში</p>
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'ყველა' },
            { key: 'paid', label: 'გადახდილი' },
            { key: 'failed', label: 'წარუმატებელი' },
            { key: 'pending', label: 'მოლოდინში' },
            { key: 'refunded', label: 'დაბრუნებული' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === f.key
                  ? 'bg-[#57c5cf] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-grow max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ძებნა (სახელი, #, transaction ID...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">იტვირთება...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-heading text-sm text-gray-500">#</th>
                  <th className="p-4 font-heading text-sm text-gray-500">მომხმარებელი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">თანხა</th>
                  <th className="p-4 font-heading text-sm text-gray-500">მეთოდი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">სტატუსი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">პროვაიდერი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">თარიღი</th>
                  <th className="p-4 font-heading text-sm text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      <td className="p-4 font-mono font-bold text-sm">#{order.order_number}</td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-sm">
                          {order.customer_info?.firstName} {order.customer_info?.lastName}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-[#57c5cf]">₾{order.total_amount}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                          <CreditCard className="w-3.5 h-3.5" />
                          {order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი'}
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(order.payment_status)}</td>
                      <td className="p-4 text-sm text-gray-600 uppercase font-mono">
                        {order.payment_provider || '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="p-4">
                        {expandedId === order.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </td>
                    </tr>

                    {expandedId === order.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="8" className="p-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Payment IDs */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-700 text-sm">გადახდის ID-ები</h4>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Payment ID:</span>
                                  <span className="font-mono font-bold text-gray-700">{order.payment_id || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Order ID (Provider):</span>
                                  <span className="font-mono font-bold text-gray-700">{order.payment_order_id || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Provider:</span>
                                  <span className="font-mono font-bold text-gray-700 uppercase">{order.payment_provider || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Payment Status:</span>
                                  {getStatusBadge(order.payment_status)}
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Order Status:</span>
                                  <span className="font-bold text-gray-700">{order.status || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Callback Data */}
                            <div className="space-y-4">
                              <h4 className="font-bold text-gray-700 text-sm">Callback პასუხი (Raw)</h4>
                              <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono max-h-80 overflow-auto whitespace-pre-wrap break-all">
                                {order.payment_callback_data
                                  ? JSON.stringify(
                                      typeof order.payment_callback_data === 'string'
                                        ? JSON.parse(order.payment_callback_data)
                                        : order.payment_callback_data,
                                      null,
                                      2
                                    )
                                  : 'Callback მონაცემები არ არის'}
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
            {filtered.length === 0 && (
              <div className="p-12 text-center text-gray-400">გადახდები არ მოიძებნა</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentHistory;
