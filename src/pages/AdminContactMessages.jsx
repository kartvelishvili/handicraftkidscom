import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Mail, Trash2, Eye, RefreshCw, Loader2, Inbox, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';

const AdminContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const { toast } = useToast();

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      toast({ title: "შეცდომა", description: "ვერ მოხერხდა შეტყობინებების ჩატვირთვა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    } catch (error) {
      console.error(error);
    }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm("ნამდვილად გსურთ წაშლა?")) return;
    try {
      await supabase.from('contact_messages').delete().eq('id', id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      toast({ title: "წაიშალა" });
    } catch (error) {
      toast({ title: "შეცდომა", variant: "destructive" });
    }
  };

  const openMessage = (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read) markAsRead(msg.id);
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="space-y-6">
      <Helmet><title>Admin - კონტაქტის შეტყობინებები</title></Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">კონტაქტის შეტყობინებები</h1>
          <p className="text-gray-500 mt-1">
            საიტიდან მოწერილი შეტყობინებები
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} ახალი</span>
            )}
          </p>
        </div>
        <Button onClick={fetchMessages} variant="outline" className="gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> განახლება
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#57c5cf]" />
            შეტყობინებები ({messages.length})
          </div>
          <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#57c5cf]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">შეტყობინებები არ არის</p>
              </div>
            ) : (
              messages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-[#57c5cf]/5 border-l-4 border-[#57c5cf]' : ''
                  } ${!msg.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!msg.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        <h4 className={`text-sm truncate ${!msg.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {msg.name}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{msg.email}</p>
                      <p className="text-xs text-gray-400 truncate mt-1">{msg.message.substring(0, 60)}...</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                      {format(new Date(msg.created_at), 'dd.MM HH:mm')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
          {selectedMessage ? (
            <div className="p-8">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 font-heading">{selectedMessage.name}</h2>
                  <a href={`mailto:${selectedMessage.email}`} className="text-[#57c5cf] hover:underline text-sm font-medium">
                    {selectedMessage.email}
                  </a>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(selectedMessage.created_at), 'dd MMM yyyy, HH:mm:ss')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedMessage.is_read && (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> წაკითხული
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: Handicraft Kids - კონტაქტის ფორმა`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#57c5cf] text-white rounded-xl font-bold hover:bg-[#4bc0cb] transition-colors"
                >
                  <Mail className="w-4 h-4" /> პასუხის გაგზავნა
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
              <Mail className="w-16 h-16 mb-4 text-gray-200" />
              <p className="font-medium text-lg">აირჩიეთ შეტყობინება</p>
              <p className="text-sm text-gray-300">კლიკი მარცხენა სიიდან</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminContactMessages;
