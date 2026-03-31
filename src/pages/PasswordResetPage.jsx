import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const PasswordResetPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email }
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "ბმული გაიგზავნა",
        description: "პაროლის აღდგენის ბმული გამოგზავნილია თქვენს ელ-ფოსტაზე.",
        className: "bg-green-600 text-white"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message || "ვერ მოხერხდა მოთხოვნის გაგზავნა"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <Link to="/admin/login" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          უკან დაბრუნება
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-heading font-bold text-gray-800">პაროლის აღდგენა</h1>
          <p className="text-gray-500 font-body text-sm mt-2">შეიყვანეთ ელ-ფოსტა ინსტრუქციის მისაღებად</p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-700 p-6 rounded-xl border border-green-100">
              <Mail className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>აღდგენის ბმული გაგზავნილია მისამართზე: <strong>{email}</strong></p>
            </div>
            <Link to="/admin/login">
               <Button variant="outline" className="w-full">შესვლაზე დაბრუნება</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 font-body ml-1">ელ-ფოსტა</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 rounded-xl text-lg font-heading bg-[#57c5cf] hover:bg-[#4bc0cb] shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
            >
              {loading ? "იგზავნება..." : "ბმულის გაგზავნა"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordResetPage;