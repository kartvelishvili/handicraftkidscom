import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useSimplePasswordAuth } from '@/context/SimplePasswordAuthContext';

const AdminLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useSimplePasswordAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    setTimeout(() => {
      const success = login(username, password);
      if (success) {
        navigate('/admin/dashboard');
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <Helmet>
        <title>ადმინ პანელი - შესვლა</title>
      </Helmet>

      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" 
               style={{ animationDuration: '7s' }} />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" 
               style={{ animationDuration: '5s', animationDelay: '2s' }} />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse" 
               style={{ animationDuration: '6s', animationDelay: '4s' }} />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Login card */}
      <div className={`relative w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-lg" />
        
        <div className={`relative bg-white/[0.07] backdrop-blur-2xl rounded-3xl border border-white/[0.12] shadow-2xl p-8 sm:p-10 ${shake ? 'animate-shake' : ''}`}>
          
          {/* Header section */}
          <div className="text-center mb-10">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl rotate-6 opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl" />
              <ShieldCheck className="relative w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              ადმინ პანელი
            </h1>
            <p className="text-sm text-slate-400">
              შეიყვანეთ მონაცემები სისტემაში შესასვლელად
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-widest">
                მომხმარებელი
              </label>
              <div className={`relative group transition-all duration-300 rounded-xl ${
                focusedField === 'username' 
                  ? 'ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                  : ''
              }`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                  focusedField === 'username' ? 'text-cyan-400' : 'text-slate-500'
                }`}>
                  <User className="w-[18px] h-[18px]" />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:bg-white/[0.09] transition-all duration-300"
                  placeholder="მომხმარებლის სახელი"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-widest">
                პაროლი
              </label>
              <div className={`relative group transition-all duration-300 rounded-xl ${
                focusedField === 'password' 
                  ? 'ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                  : ''
              }`}>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                  focusedField === 'password' ? 'text-cyan-400' : 'text-slate-500'
                }`}>
                  <Lock className="w-[18px] h-[18px]" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:bg-white/[0.09] transition-all duration-300"
                  placeholder="შეიყვანეთ პაროლი"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="relative w-full group overflow-hidden rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300 group-hover:from-cyan-400 group-hover:to-teal-400" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-400 to-teal-400 blur-xl" />
                
                <div className="relative flex items-center justify-center gap-2 py-4 px-6 text-white font-semibold text-[15px]">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>მიმდინარეობს შესვლა...</span>
                    </>
                  ) : (
                    <>
                      <span>სისტემაში შესვლა</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </div>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-xs text-slate-500">
              დაცული კავშირი &bull; ადმინისტრატორის პანელი
            </p>
          </div>
        </div>
      </div>

      {/* Shake animation style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.6s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default AdminLoginPage;