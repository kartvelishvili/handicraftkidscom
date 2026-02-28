import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format } from 'date-fns';
import { Check, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useNotifications } from '@/hooks/useNotifications';

const AdminNotificationHistory = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const { markAsRead, clearNotification } = useNotifications();

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    } else if (filter === 'read') {
      query = query.eq('is_read', true);
    }

    const { data } = await query;
    setNotifications(data || []);
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
      await markAsRead(id);
      fetchHistory();
  };

  const handleDelete = async (id) => {
      await clearNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - შეტყობინებების ისტორია</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">შეტყობინებების ისტორია</h1>
        <p className="text-gray-500 font-body">ყველა სისტემური შეტყობინება</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
           <div className="flex gap-2">
             <Button 
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-[#57c5cf]' : ''}
             >
                ყველა
             </Button>
             <Button 
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
                className={filter === 'unread' ? 'bg-[#57c5cf]' : ''}
             >
                წაუკითხავი
             </Button>
           </div>
        </div>

        <div className="divide-y divide-gray-100">
           {loading ? (
             <div className="p-8 text-center text-gray-500">იტვირთება...</div>
           ) : notifications.length === 0 ? (
             <div className="p-8 text-center text-gray-500">შეტყობინებები არ არის</div>
           ) : (
             notifications.map(notif => (
               <div key={notif.id} className={`p-6 flex items-start justify-between hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50' : ''}`}>
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className={`px-2 py-0.5 rounded text-xs font-bold ${notif.notification_type === 'new_order' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {notif.notification_type === 'new_order' ? 'შეკვეთა' : 'სისტემა'}
                     </span>
                     <span className="text-xs text-gray-400">
                        {format(new Date(notif.created_at), 'dd MMM yyyy, HH:mm')}
                     </span>
                   </div>
                   <p className="text-gray-800 font-body">{notif.message}</p>
                 </div>
                 <div className="flex gap-2">
                    {!notif.is_read && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkRead(notif.id)}>
                            <Check className="w-4 h-4 mr-1" /> წაკითხვა
                        </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => handleDelete(notif.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationHistory;