import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminSetupGuide = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  useEffect(() => {
    // If no state (direct access), redirect to login
    if (!state?.email) {
      navigate('/admin/login');
    }
  }, [state, navigate]);

  if (!state?.email) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-gray-800">ადმინისტრატორი შეიქმნა!</h1>
          <p className="text-gray-500 font-body text-sm mt-2">შეინახეთ თქვენი მონაცემები უსაფრთხოდ</p>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-6 space-y-4">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">ელ-ფოსტა</span>
            <p className="font-mono text-lg text-gray-800 font-bold">{state.email}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase">დროებითი პაროლი</span>
            <p className="font-mono text-lg text-[#57c5cf] font-bold">{state.password}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-700">
            უსაფრთხოების მიზნით, გთხოვთ შეცვალოთ პაროლი სისტემაში პირველივე შესვლისთანავე.
          </p>
        </div>

        <Link to="/admin/login">
          <Button className="w-full py-6 rounded-xl text-lg bg-[#57c5cf] hover:bg-[#4bc0cb]">
            სისტემაში შესვლა
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default AdminSetupGuide;