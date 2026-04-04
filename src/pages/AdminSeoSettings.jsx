import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, Search, Globe, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminSeoSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seo, setSeo] = useState({
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_image: '',
    canonical_url: 'https://handicraft.com.ge/'
  });

  useEffect(() => {
    fetchSeo();
  }, []);

  const fetchSeo = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('*').eq('key', 'home_seo').single();
      if (data?.value) {
        setSeo(prev => ({ ...prev, ...data.value }));
      }
    } catch (err) {
      console.error('Error fetching SEO settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: seo, updated_at: new Date().toISOString() })
        .eq('key', 'home_seo');
      
      if (error) throw error;
      toast({ title: 'SEO პარამეტრები შენახულია' });
    } catch (err) {
      console.error('Error saving SEO:', err);
      toast({ title: 'შეცდომა შენახვისას', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">იტვირთება...</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Helmet><title>SEO პარამეტრები</title></Helmet>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <Search className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">SEO პარამეტრები</h1>
          <p className="text-gray-500 text-sm">მთავარი გვერდის SEO მონაცემები</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 space-y-6">
        
        {/* Meta Title */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Globe className="w-4 h-4 text-emerald-500" />
            Meta Title
          </label>
          <input
            value={seo.meta_title}
            onChange={(e) => setSeo(prev => ({ ...prev, meta_title: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
            placeholder="საიტის სათაური Google-ში"
          />
          <p className="text-xs text-gray-400">{seo.meta_title.length}/60 სიმბოლო (რეკომენდებული: 50-60)</p>
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">Meta Description</label>
          <textarea
            value={seo.meta_description}
            onChange={(e) => setSeo(prev => ({ ...prev, meta_description: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm h-24 focus:border-emerald-400 focus:outline-none"
            placeholder="საიტის აღწერა Google-ში"
          />
          <p className="text-xs text-gray-400">{seo.meta_description.length}/160 სიმბოლო (რეკომენდებული: 120-160)</p>
        </div>

        {/* Meta Keywords */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">ქი ვორდები (Keywords)</label>
          <input
            value={seo.meta_keywords}
            onChange={(e) => setSeo(prev => ({ ...prev, meta_keywords: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
            placeholder="keyword1, keyword2, keyword3"
          />
          <p className="text-xs text-gray-400">მძიმით გამოყოფილი საძიებო სიტყვები</p>
        </div>

        {/* OG Image */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            OG სურათი (სოციალური ქსელებისთვის)
          </label>
          <input
            value={seo.og_image}
            onChange={(e) => setSeo(prev => ({ ...prev, og_image: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
            placeholder="https://..."
          />
          {seo.og_image && (
            <div className="mt-2 border rounded-xl p-2 bg-gray-50 inline-block">
              <img src={seo.og_image} alt="OG preview" className="h-32 object-contain rounded-lg" />
            </div>
          )}
          <p className="text-xs text-gray-400">რეკომენდებული ზომა: 1200x630 პიქსელი</p>
        </div>

        {/* Canonical URL */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">Canonical URL</label>
          <input
            value={seo.canonical_url}
            onChange={(e) => setSeo(prev => ({ ...prev, canonical_url: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-emerald-400 focus:outline-none"
            placeholder="https://handicraft.com.ge/"
          />
        </div>

        {/* Preview */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">Google-ში გამოჩენა:</p>
          <div className="space-y-1">
            <p className="text-blue-700 text-lg font-medium truncate">{seo.meta_title || 'საიტის სათაური'}</p>
            <p className="text-green-700 text-sm truncate">{seo.canonical_url || 'https://handicraft.com.ge/'}</p>
            <p className="text-gray-600 text-sm line-clamp-2">{seo.meta_description || 'საიტის აღწერა...'}</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 px-8 py-6 rounded-xl text-lg shadow-lg font-heading">
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSeoSettings;
