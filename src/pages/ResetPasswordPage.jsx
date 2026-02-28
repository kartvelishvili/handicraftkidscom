import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "პაროლები არ ემთხვევა"
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        body: { token, newPassword: password }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({
        title: "წარმატება",
        description: "პაროლი წარმატებით შეიცვალა. შეგიძლიათ გაიაროთ ავტორიზაცია.",
        className: "bg-green-600 text-white"
      });
      
      navigate('/admin/login');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message || "ვერ მოხერხდა პაროლის შეცვლა"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-gray-800">ახალი პაროლი</h1>
          <p className="text-gray-500 font-body text-sm mt-2">შეიყვანეთ ახალი პაროლი</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 font-body ml-1">ახალი პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 font-body ml-1">დაადასტურეთ პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 rounded-xl text-lg font-heading bg-[#57c5cf] hover:bg-[#4bc0cb] shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
          >
            {loading ? "მუშავდება..." : "პაროლის შეცვლა"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;