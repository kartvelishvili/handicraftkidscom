import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Linkedin, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
       const { data, error } = await supabase.from('footer_settings').select('*').maybeSingle();
       if (error) console.error("Error fetching footer settings:", error);
       if (data) setSettings(data);
    };
    fetchSettings();
  }, []);

  const handleNewsletterSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast({ title: 'გთხოვთ ჩაწერეთ სწორი ელ-ფოსტა', variant: 'destructive' });
      return;
    }
    setSubscribing(true);
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'თქვენ უკვე გამოწერილი ხართ!' });
        } else throw error;
      } else {
        toast({ title: 'მადლობა! წარმატებით გამოწერილი ხართ.' });
        setEmail('');
      }
    } catch (err) {
      console.error('Newsletter subscribe error:', err);
      toast({ title: 'შეცდომა, სცადეთ თავიდან', variant: 'destructive' });
    } finally {
      setSubscribing(false);
    }
  };

  const getIcon = (platform) => {
    switch(platform) {
      case 'facebook': return <Facebook className="w-5 h-5 text-white" />;
      case 'instagram': return <Instagram className="w-5 h-5 text-white" />;
      case 'twitter': return <Twitter className="w-5 h-5 text-white" />;
      case 'linkedin': return <Linkedin className="w-5 h-5 text-white" />;
      default: return <Mail className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="bg-slate-50 mt-auto">
      {/* Decorative Top Border */}
      <div className="w-full h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEwIDEwTDAgMEgyMEwxMCAxMFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] relative z-10 -mb-2"></div>
      
      <footer className="bg-gradient-to-br from-white via-blue-50/20 to-pink-50/20 border-t-2 border-b-2 border-dashed border-[#57c5cf]/30 pt-16 pb-12 px-4 relative overflow-hidden">
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#57c5cf]/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#f292bc]/5 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3"></div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            
            {/* Brand Section */}
            <div className="md:col-span-4 space-y-6">
              <Link to="/" className="flex items-center gap-2 group">
                <img 
                 src={settings?.logo_url || "https://i.postimg.cc/SRgBpzBB/handicraft-(1).png"} 
                 alt="Handicraft Logo" 
                 className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
               />
              </Link>
              <p className="text-slate-600 leading-relaxed font-body text-base max-w-sm">
                {t('footer_desc')}
              </p>
              
              <div className="flex gap-3 pt-2">
                {settings?.social_links?.map((link, i) => (
                  <a 
                    key={i} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm hover:shadow-md" 
                    style={{ backgroundColor: i % 2 === 0 ? '#57c5cf' : '#f292bc' }}
                  >
                    {getIcon(link.platform)}
                  </a>
                ))}
              </div>

               <Link to="/paneli" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-[#57c5cf] transition-colors mt-2 font-medium">
                <Lock className="w-3 h-3" />
                <span>Admin Panel</span>
              </Link>
            </div>

            {/* Shop Links */}
            <div className="md:col-span-2">
              <h3 className="font-heading font-bold text-lg mb-6 relative inline-block text-slate-800">
                {t('nav_navigation')}
                <span className="absolute -bottom-2 left-0 w-8 h-1 rounded-full bg-[#57c5cf]"></span>
              </h3>
              <nav className="space-y-4 font-body flex flex-col">
                <Link to="/" className="text-slate-600 hover:text-[#57c5cf] transition-colors text-left hover:translate-x-1 duration-200">{t('nav_home')}</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#57c5cf] transition-colors text-left hover:translate-x-1 duration-200">{t('nav_about')}</Link>
                <Link to="/contact" className="text-slate-600 hover:text-[#57c5cf] transition-colors text-left hover:translate-x-1 duration-200">{t('nav_contact')}</Link>
              </nav>
            </div>

            {/* Customer Service */}
            <div className="md:col-span-3">
              <h3 className="font-heading font-bold text-lg mb-6 relative inline-block text-slate-800">
                {t('nav_help')}
                <span className="absolute -bottom-2 left-0 w-8 h-1 rounded-full bg-[#f292bc]"></span>
              </h3>
              <nav className="space-y-4 font-body flex flex-col">
                <Link to="/faq" className="text-slate-600 hover:text-[#f292bc] transition-colors text-left hover:translate-x-1 duration-200">FAQ</Link>
                <Link to="/terms" className="text-slate-600 hover:text-[#f292bc] transition-colors text-left hover:translate-x-1 duration-200">Terms & Conditions</Link>
                <Link to="/privacy" className="text-slate-600 hover:text-[#f292bc] transition-colors text-left hover:translate-x-1 duration-200">Privacy Policy</Link>
              </nav>
            </div>

            {/* Newsletter */}
            <div className="md:col-span-3">
              <h3 className="font-heading font-bold text-lg mb-6 relative inline-block text-slate-800">
                {t('nav_newsletter')}
                <span className="absolute -bottom-2 left-0 w-8 h-1 rounded-full bg-[#57c5cf]"></span>
              </h3>
              <p className="text-slate-600 mb-6 font-body text-sm leading-relaxed">{t('newsletter_desc')}</p>
              <div className="flex gap-2 relative">
                <input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNewsletterSubscribe()}
                  className="flex-1 px-5 py-3 rounded-full border border-slate-200 bg-white focus:outline-none focus:border-[#57c5cf] focus:ring-2 focus:ring-[#57c5cf]/20 transition-all font-body text-sm shadow-sm"
                />
                <button
                  onClick={handleNewsletterSubscribe}
                  disabled={subscribing}
                  className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md absolute right-1 top-0 bottom-0 my-auto disabled:opacity-50"
                  style={{ backgroundColor: '#f292bc' }}
                >
                  <Mail className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-slate-200/60 font-body">
            <p className="text-slate-500 text-sm font-medium">© {new Date().getFullYear()} Handicraft.com.ge. All rights reserved.</p>
            
            {/* Smarketer Banner - Plain Image */}
            <a 
              href="https://smarketer.ge" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block"
            >
              <img 
                alt="Smarketer Banner" 
                className="h-[22px] w-auto object-contain" 
                src="https://i.postimg.cc/yN4VXtXP/smarkter.png" 
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;