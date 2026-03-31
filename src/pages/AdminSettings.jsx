import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, Search, RefreshCw, Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const AdminSettings = () => {
  const { translations, fetchTranslations } = useLanguage();
  const [localTranslations, setLocalTranslations] = useState({});
  const [filter, setFilter] = useState('');
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalTranslations(translations);
  }, [translations]);

  const handleChange = (key, lang, value) => {
    setLocalTranslations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [lang]: value
      }
    }));
  };

  const handleSave = async (key) => {
    setSaving(true);
    try {
      const translation = localTranslations[key];
      const { error } = await supabase
        .from('translations')
        .upsert({ 
          key, 
          ka: translation.ka, 
          en: translation.en, 
          ru: translation.ru 
        }, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "შენახულია",
        className: "bg-green-500 text-white"
      });
      fetchTranslations(); // Refresh global context
    } catch (error) {
      toast({
        variant: "destructive",
        title: "შეცდომა შენახვისას",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredKeys = Object.keys(localTranslations).filter(key => 
    key.toLowerCase().includes(filter.toLowerCase()) || 
    localTranslations[key]?.ka?.toLowerCase().includes(filter.toLowerCase()) ||
    localTranslations[key]?.en?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - პარამეტრები</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">პარამეტრების მართვა</h1>
          <p className="text-gray-500 font-body">სისტემის კონფიგურაცია</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/sms-settings">
             <Button variant="outline" className="gap-2 border-purple-200 text-purple-600 hover:bg-purple-50">
                <MessageSquare className="w-4 h-4" /> SMS პროვაიდერი
             </Button>
          </Link>
          <Link to="/admin/notifications-settings">
             <Button className="bg-purple-500 hover:bg-purple-600 gap-2">
                <Bell className="w-4 h-4" /> შეტყობინებების პარამეტრები
             </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#57c5cf]" /> 
            თარგმანები
        </h2>
        
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ძიება..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body"
          />
        </div>

        <div className="space-y-6">
          {filteredKeys.map(key => (
            <div key={key} className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-md text-xs font-mono font-bold">{key}</span>
                <Button 
                  size="sm" 
                  onClick={() => handleSave(key)}
                  className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2"
                  disabled={saving}
                >
                  <Save className="w-4 h-4" /> შენახვა
                </Button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">GEORGIAN (KA)</label>
                  <textarea 
                    value={localTranslations[key]?.ka || ''}
                    onChange={(e) => handleChange(key, 'ka', e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none text-sm font-body h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ENGLISH (EN)</label>
                  <textarea 
                    value={localTranslations[key]?.en || ''}
                    onChange={(e) => handleChange(key, 'en', e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none text-sm font-body h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">RUSSIAN (RU)</label>
                  <textarea 
                    value={localTranslations[key]?.ru || ''}
                    onChange={(e) => handleChange(key, 'ru', e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-[#57c5cf] focus:outline-none text-sm font-body h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
          {filteredKeys.length === 0 && (
            <p className="text-center text-gray-500 py-8">ვერაფერი მოიძებნა</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;