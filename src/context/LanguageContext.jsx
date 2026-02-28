import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { safeStorage } from '@/utils/safeStorage';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => safeStorage.getItem('app_lang') || 'ka');
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    safeStorage.setItem('app_lang', language);
  }, [language]);

  const fetchTranslations = async () => {
    try {
      const { data, error } = await supabase.from('translations').select('*');
      if (error) throw error;

      const transMap = {};
      data.forEach(item => {
        transMap[item.key] = {
          ka: item.ka,
          en: item.en,
          ru: item.ru
        };
      });
      setTranslations(transMap);
    } catch (error) {
      console.error('Error fetching translations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();

    // Real-time subscription to reflect changes immediately
    const subscription = supabase
      .channel('public:translations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'translations' }, () => {
         fetchTranslations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const t = (key) => {
    if (!translations[key]) return ""; // Return empty string instead of key to avoid ugly raw keys flashing
    return translations[key][language] || translations[key]['ka'] || key;
  };

  // Helper to get raw object (useful for colors stored in 'ka' slot only)
  const getRaw = (key) => translations[key];

  const changeLanguage = (lang) => {
    if (['ka', 'en', 'ru'].includes(lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, getRaw, loading, translations, fetchTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};