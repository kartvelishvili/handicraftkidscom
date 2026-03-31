import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/context/AdminContext';
import { useToast } from '@/components/ui/use-toast';

const AdminPanel = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure we are passing the values correctly as an object
    const result = await login({ email, password });
    
    if (result.success) {
      toast({
        title: "ავტორიზაცია წარმატებულია",
        className: "bg-[#57c5cf] text-white"
      });
      navigate('/admin/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: result.error || "ელ-ფოსტა ან პაროლი არასწორია"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Helmet>
        <title>ადმინ პანელი - შესვლა</title>
      </Helmet>
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
           <img 
             src="https://i.postimg.cc/SRgBpzBB/handicraft-(1).png" 
             alt="Logo" 
             className="h-12 mx-auto mb-4"
           />
           <h1 className="text-2xl font-heading font-bold text-gray-800">სისტემაში შესვლა</h1>
           <p className="text-gray-500 font-body text-sm mt-2">შეიყვანეთ ადმინისტრატორის მონაცემები</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 font-body ml-1">ელ-ფოსტა</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body"
                placeholder="admin@smarketer.ge"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 font-body ml-1">პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full py-6 rounded-xl text-lg font-heading bg-[#57c5cf] hover:bg-[#4bc0cb] shadow-lg hover:shadow-xl transition-all"
          >
            შესვლა
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;