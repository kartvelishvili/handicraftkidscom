import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, Plus, Trash2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const AdminFooter = () => {
  const { toast } = useToast();
  const { translations, fetchTranslations } = useLanguage();
  const [settings, setSettings] = useState({
    logo_url: '',
    social_links: [],
    desc_ka: '', desc_en: '', desc_ru: '',
    smarketer_logo_url: 'https://i.postimg.cc/yN4VXtXP/smarkter.png' // Default
  });

  useEffect(() => {
    fetchData();
  }, [translations]);

  const fetchData = async () => {
    // Use maybeSingle() to avoid error if table is empty
    const { data, error } = await supabase.from('footer_settings').select('*').maybeSingle();
    
    if (error) {
      console.error("Error fetching footer settings:", error);
    }

    if (data) {
      setSettings({
        logo_url: data.logo_url || '',
        social_links: data.social_links || [],
        desc_ka: translations['footer_desc']?.ka || '',
        desc_en: translations['footer_desc']?.en || '',
        desc_ru: translations['footer_desc']?.ru || '',
        smarketer_logo_url: data.smarketer_logo_url || 'https://i.postimg.cc/yN4VXtXP/smarkter.png'
      });
    }
  };

  const handleSave = async () => {
    try {
      // Find ID or insert if not exists (assume singleton logic)
      // Use maybeSingle() here as well
      const { data: existing } = await supabase.from('footer_settings').select('id').maybeSingle();
      
      const payload = {
        logo_url: settings.logo_url,
        social_links: settings.social_links,
        smarketer_logo_url: settings.smarketer_logo_url
      };

      if (existing) {
        await supabase.from('footer_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('footer_settings').insert([payload]);
      }

      await supabase.from('translations').upsert({
        key: 'footer_desc',
        ka: settings.desc_ka,
        en: settings.desc_en,
        ru: settings.desc_ru
      }, { onConflict: 'key' });

      fetchTranslations();
      toast({ title: "ფუტერი განახლდა" });
    } catch (error) {
      console.error(error);
      toast({ title: "შეცდომა", variant: "destructive" });
    }
  };

  const addSocial = () => {
    setSettings({...settings, social_links: [...settings.social_links, { platform: 'facebook', url: '' }]});
  };

  const updateSocial = (index, field, value) => {
    const newLinks = [...settings.social_links];
    newLinks[index][field] = value;
    setSettings({...settings, social_links: newLinks});
  };

  const removeSocial = (index) => {
    const newLinks = [...settings.social_links];
    newLinks.splice(index, 1);
    setSettings({...settings, social_links: newLinks});
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet><title>Admin - Footer</title></Helmet>
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-800">ფუტერის მართვა</h1>
        <div className="flex gap-3">
          <Link to="/">
              <Button variant="outline" className="gap-2 border-[#57c5cf] text-[#57c5cf]">
                <Home className="w-4 h-4" /> View Site
              </Button>
          </Link>
          <Button onClick={handleSave} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2">
            <Save className="w-4 h-4" /> შენახვა
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="font-bold mb-4">Logo URL</h3>
           <input className="w-full p-2 border rounded" value={settings.logo_url} onChange={e => setSettings({...settings, logo_url: e.target.value})} />
        </div>

         <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="font-bold mb-4">Smarketer Banner URL</h3>
           <input className="w-full p-2 border rounded" value={settings.smarketer_logo_url} onChange={e => setSettings({...settings, smarketer_logo_url: e.target.value})} />
           {settings.smarketer_logo_url && (
              <div className="mt-2 p-2 bg-gray-50 border rounded w-fit">
                 <img src={settings.smarketer_logo_url} alt="Preview" className="h-8 w-auto object-contain" />
              </div>
           )}
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <h3 className="font-bold mb-4">Footer Text</h3>
           <div className="grid md:grid-cols-3 gap-4">
             <textarea className="w-full p-2 border rounded h-24" placeholder="KA" value={settings.desc_ka} onChange={e => setSettings({...settings, desc_ka: e.target.value})} />
             <textarea className="w-full p-2 border rounded h-24" placeholder="EN" value={settings.desc_en} onChange={e => setSettings({...settings, desc_en: e.target.value})} />
             <textarea className="w-full p-2 border rounded h-24" placeholder="RU" value={settings.desc_ru} onChange={e => setSettings({...settings, desc_ru: e.target.value})} />
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
           <div className="flex justify-between mb-4">
             <h3 className="font-bold">Social Media Links</h3>
             <Button size="sm" variant="outline" onClick={addSocial}><Plus className="w-4 h-4" /> Add</Button>
           </div>
           <div className="space-y-3">
             {settings.social_links.map((link, i) => (
               <div key={i} className="flex gap-2">
                 <select className="p-2 border rounded" value={link.platform} onChange={e => updateSocial(i, 'platform', e.target.value)}>
                   <option value="facebook">Facebook</option>
                   <option value="instagram">Instagram</option>
                   <option value="twitter">Twitter</option>
                   <option value="linkedin">LinkedIn</option>
                 </select>
                 <input className="flex-1 p-2 border rounded" placeholder="URL" value={link.url} onChange={e => updateSocial(i, 'url', e.target.value)} />
                 <Button size="icon" variant="ghost" onClick={() => removeSocial(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
export default AdminFooter;