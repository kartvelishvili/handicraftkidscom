import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Phone, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Loader2, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminSMS = () => {
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhoneNumbers();
    fetchLogs();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhoneNumbers(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: "ვერ მოხერხდა ნომრების ჩატვირთვა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: "ვერ მოხერხდა ისტორიის ჩატვირთვა", variant: "destructive" });
    } finally {
      setLogsLoading(false);
    }
  };

  const invokeEdgeFunction = async (payload) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("No active session");
    }

    return await supabase.functions.invoke('manage-admin-phones', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
  };

  const handleAddPhone = async (e) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    try {
      const { data, error } = await invokeEdgeFunction({ 
        action: 'add', 
        phone: newPhone 
      });

      if (error) throw error;

      toast({ title: "ნომერი დამატებულია" });
      setNewPhone('');
      setIsAdding(false);
      fetchPhoneNumbers();
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: error.message || "ვერ მოხერხდა ნომრის დამატება", variant: "destructive" });
    }
  };

  const deletePhone = async (id) => {
    if (!window.confirm("ნამდვილად გსურთ წაშლა?")) return;
    try {
      const { error } = await invokeEdgeFunction({ 
        action: 'delete', 
        id 
      });

      if (error) throw error;
      
      setPhoneNumbers(phoneNumbers.filter(p => p.id !== id));
      toast({ title: "ნომერი წაიშალა" });
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: "ვერ მოხერხდა ნომრის წაშლა", variant: "destructive" });
    }
  };

  const toggleActive = async (id, currentState) => {
    try {
      const { error } = await invokeEdgeFunction({ 
        action: 'toggle', 
        id, 
        is_active: !currentState 
      });

      if (error) throw error;
      
      setPhoneNumbers(phoneNumbers.map(p => 
        p.id === id ? { ...p, is_active: !currentState } : p
      ));
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", description: "ვერ მოხერხდა სტატუსის შეცვლა", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <Helmet><title>Admin - SMS Settings</title></Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">SMS შეტყობინებები</h1>
          <p className="text-gray-500 mt-1">მართეთ ადმინისტრატორის ნომრები და იხილეთ გაგზავნის ისტორია</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 rounded-xl">
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'გაუქმება' : 'ნომრის დამატება'}
        </Button>
      </div>

      {/* Add Phone Form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 max-w-lg animate-in fade-in slide-in-from-top-4">
          <h3 className="font-heading font-bold mb-4">ახალი ნომრის დამატება</h3>
          <form onSubmit={handleAddPhone} className="flex gap-3">
            <input 
              type="text" 
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="555 00 00 00"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none"
              autoFocus
            />
            <Button type="submit" className="bg-[#57c5cf] hover:bg-[#4bc0cb]">
              <Save className="w-4 h-4 mr-2" /> დამატება
            </Button>
          </form>
        </div>
      )}

      {/* Phone Numbers List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-[#57c5cf]" />
          </div>
        ) : phoneNumbers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
             <Phone className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>ნომრები არ არის დამატებული</p>
          </div>
        ) : (
          phoneNumbers.map(number => (
            <div key={number.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${number.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 font-mono text-lg">{number.phone}</h3>
                  <div className="flex items-center gap-2">
                     <span className={`text-xs px-2 py-0.5 rounded-full ${number.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                       {number.is_active ? 'Active' : 'Inactive'}
                     </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   onClick={() => toggleActive(number.id, number.is_active)}
                   className="hover:bg-gray-100 rounded-lg text-gray-500"
                 >
                   <RefreshCw className="w-4 h-4" />
                 </Button>
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   onClick={() => deletePhone(number.id)}
                   className="hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-400"
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logs Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
         <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <h3 className="font-heading font-bold text-lg text-gray-700 flex items-center gap-2">
             <MessageSquare className="w-5 h-5" />
             გაგზავნის ისტორია (ბოლო 50)
           </h3>
           <Button variant="ghost" size="sm" onClick={fetchLogs}><RefreshCw className="w-4 h-4" /></Button>
         </div>
         
         {logsLoading ? (
            <div className="p-12 text-center">
               <Loader2 className="w-8 h-8 animate-spin text-[#57c5cf] mx-auto" />
            </div>
         ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">დრო</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">მიმღები</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">შეტყობინება</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">სტატუსი</th>
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">დეტალები</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-600 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('ka-GE')}
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-700">{log.recipient_phone}</td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.status === 'sent' 
                            ? 'bg-green-100 text-green-700' 
                            : log.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                          {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                          {log.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-400 font-mono max-w-xs truncate">
                         {JSON.stringify(log.response)}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">ისტორია ცარიელია</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
         )}
      </div>
    </div>
  );
};

export default AdminSMS;