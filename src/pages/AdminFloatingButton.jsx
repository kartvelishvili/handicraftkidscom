import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, MessageCircle, Palette, Maximize2, Link2, Image as ImageIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminFloatingButton = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    is_active: true,
    button_url: 'https://m.me/handicraftGeorgia',
    button_icon: 'messenger',
    button_color: '#0084FF',
    button_size: 60,
    button_image_url: '',
    position: 'bottom-right'
  });
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('floating_button_settings').select('*').limit(1).single();
      if (data) {
        setSettings(data);
        setSettingsId(data.id);
      }
    } catch (err) {
      console.error('Error fetching floating button settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        is_active: settings.is_active,
        button_url: settings.button_url,
        button_icon: settings.button_icon,
        button_color: settings.button_color,
        button_size: settings.button_size,
        button_image_url: settings.button_image_url,
        position: settings.position,
        updated_at: new Date().toISOString()
      };

      if (settingsId) {
        const { error } = await supabase.from('floating_button_settings').update(payload).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('floating_button_settings').insert(payload).select().single();
        if (error) throw error;
        setSettingsId(data.id);
      }
      toast({ title: 'ღილაკის პარამეტრები შენახულია' });
    } catch (err) {
      console.error('Error saving:', err);
      toast({ title: 'შეცდომა შენახვისას', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const iconOptions = [
    { value: 'messenger', label: 'Messenger', color: '#0084FF' },
    { value: 'chat', label: 'Chat ბუშტი', color: '#57c5cf' },
  ];

  const sizePresets = [
    { value: 48, label: 'პატარა' },
    { value: 56, label: 'საშუალო' },
    { value: 64, label: 'დიდი' },
    { value: 72, label: 'ძალიან დიდი' },
  ];

  if (loading) return <div className="p-10 text-center">იტვირთება...</div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Helmet><title>მცურავი ღილაკი</title></Helmet>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">მცურავი ღილაკი</h1>
          <p className="text-gray-500 text-sm">Messenger / Chat ღილაკის პარამეტრები</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 space-y-6">

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="font-bold text-gray-700">ღილაკის სტატუსი</p>
            <p className="text-xs text-gray-400">ჩართეთ ან გამორთეთ მცურავი ღილაკი</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.is_active ? 'bg-blue-500' : 'bg-gray-200'}`}>
              <input type="checkbox" checked={settings.is_active} onChange={(e) => setSettings(prev => ({ ...prev, is_active: e.target.checked }))} className="sr-only" />
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        {/* URL */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Link2 className="w-4 h-4 text-blue-500" />
            ბმული (URL)
          </label>
          <input
            value={settings.button_url}
            onChange={(e) => setSettings(prev => ({ ...prev, button_url: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-blue-400 focus:outline-none"
            placeholder="https://m.me/handicraftGeorgia"
          />
        </div>

        {/* Icon Type */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 block">აიქონის ტიპი</label>
          <div className="grid grid-cols-2 gap-3">
            {iconOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, button_icon: opt.value, button_image_url: '' }))}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  settings.button_icon === opt.value && !settings.button_image_url
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: opt.color }}>
                    {opt.value === 'messenger' ? (
                      <svg viewBox="0 0 36 36" fill="none" className="w-5 h-5">
                        <path d="M18 2C9.163 2 2 8.636 2 16.75c0 4.462 2.165 8.448 5.572 11.085V34l5.902-3.236c1.42.392 2.928.611 4.526.611 8.837 0 16-6.636 16-14.75C34 8.636 26.837 2 18 2z" fill="white"/>
                        <path d="M6.502 21.556l5.7-9.062 3.6 3.6 6.6-3.6-5.7 9L13.102 17.9z" fill={opt.color}/>
                      </svg>
                    ) : (
                      <MessageCircle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-gray-700">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Image */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            კასტომ სურათი / აიქონი (არასავალდებულო)
          </label>
          <input
            value={settings.button_image_url}
            onChange={(e) => setSettings(prev => ({ ...prev, button_image_url: e.target.value }))}
            className="w-full p-3 border rounded-xl text-sm focus:border-blue-400 focus:outline-none"
            placeholder="https://... (სურათის ბმული)"
          />
          {settings.button_image_url && (
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-200">
                <img src={settings.button_image_url} alt="Icon" className="w-full h-full object-cover" />
              </div>
              <button 
                type="button" 
                onClick={() => setSettings(prev => ({ ...prev, button_image_url: '' }))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                წაშლა
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400">თუ ატვირთავთ სურათს, ის ჩაანაცვლებს არჩეულ აიქონს</p>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Palette className="w-4 h-4 text-blue-500" />
            ფერი
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.button_color}
              onChange={(e) => setSettings(prev => ({ ...prev, button_color: e.target.value }))}
              className="w-12 h-12 rounded-xl border cursor-pointer"
            />
            <input
              value={settings.button_color}
              onChange={(e) => setSettings(prev => ({ ...prev, button_color: e.target.value }))}
              className="w-32 p-3 border rounded-xl text-sm font-mono focus:border-blue-400 focus:outline-none"
              placeholder="#0084FF"
            />
            <div className="flex gap-2">
              {['#0084FF', '#57c5cf', '#f292bc', '#25D366', '#FF6B6B'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, button_color: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.button_color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Maximize2 className="w-4 h-4 text-blue-500" />
            ზომა: {settings.button_size}px
          </label>
          <input
            type="range"
            min="40"
            max="80"
            value={settings.button_size}
            onChange={(e) => setSettings(prev => ({ ...prev, button_size: Number(e.target.value) }))}
            className="w-full accent-blue-500"
          />
          <div className="flex gap-2">
            {sizePresets.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, button_size: p.value }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  settings.button_size === p.value 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase mb-4">
            <Eye className="w-4 h-4" /> გადახედვა
          </label>
          <div className="relative h-40 bg-white rounded-xl border overflow-hidden">
            <div className="absolute bottom-3 right-3 flex items-center justify-center rounded-full shadow-lg transition-all"
              style={{
                width: `${settings.button_size}px`,
                height: `${settings.button_size}px`,
                backgroundColor: settings.button_color,
                boxShadow: `0 4px 15px ${settings.button_color}40`
              }}
            >
              {settings.button_image_url ? (
                <img src={settings.button_image_url} alt="" className="rounded-full object-cover" style={{ width: settings.button_size * 0.6, height: settings.button_size * 0.6 }} />
              ) : settings.button_icon === 'messenger' ? (
                <svg viewBox="0 0 36 36" fill="none" style={{ width: settings.button_size * 0.5, height: settings.button_size * 0.5 }}>
                  <path d="M18 2C9.163 2 2 8.636 2 16.75c0 4.462 2.165 8.448 5.572 11.085V34l5.902-3.236c1.42.392 2.928.611 4.526.611 8.837 0 16-6.636 16-14.75C34 8.636 26.837 2 18 2z" fill="white"/>
                  <path d="M6.502 21.556l5.7-9.062 3.6 3.6 6.6-3.6-5.7 9L13.102 17.9z" fill={settings.button_color}/>
                </svg>
              ) : (
                <MessageCircle className="text-white" style={{ width: settings.button_size * 0.45, height: settings.button_size * 0.45 }} />
              )}
            </div>
            <div className="absolute top-3 left-3 text-xs text-gray-300">საიტის კონტენტი...</div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">მობილურზე ღილაკი ავტომატურად მცირდება (მაქსიმუმ 52px)</p>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-600 px-8 py-6 rounded-xl text-lg shadow-lg font-heading">
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminFloatingButton;
