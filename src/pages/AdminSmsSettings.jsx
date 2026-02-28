import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, Send, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const AdminSmsSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [settings, setSettings] = useState({
    id: null,
    provider_name: 'SmarketerGE',
    api_key: '7751846528e14a6490c2a5320e69a25d',
    sender_name: 'SmarketerGE',
    is_active: true,
    updated_at: null
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sms_provider_settings')
        .select('*')
        .limit(1)
        .single();
        
      if (error) {
        if (error.code !== 'PGRST116') throw error; // Not found is okay, we'll create new
      } else if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "პარამეტრების წამოღება ვერ მოხერხდა"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!settings.api_key || settings.api_key.length < 20) {
      toast({
        variant: "destructive",
        title: "ვალიდაციის შეცდომა",
        description: "API Key არასწორია (მინიმუმ 20 სიმბოლო)"
      });
      return;
    }
    if (!settings.sender_name) {
      toast({
        variant: "destructive",
        title: "ვალიდაციის შეცდომა",
        description: "Sender Name აუცილებელია"
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        provider_name: settings.provider_name,
        api_key: settings.api_key,
        sender_name: settings.sender_name,
        is_active: settings.is_active,
        updated_at: new Date().toISOString()
      };

      let result;
      if (settings.id) {
        result = await supabase
          .from('sms_provider_settings')
          .update(payload)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('sms_provider_settings')
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setSettings(result.data);
      toast({
        title: "წარმატება",
        description: "პარამეტრები შენახულია",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async () => {
    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('send-test-sms', {});

      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Unknown error');

      toast({
        title: "ტესტი წარმატებულია",
        description: "სატესტო SMS გაიგზავნა ადმინის ნომერზე",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      console.error('Test SMS failed:', error);
      toast({
        variant: "destructive",
        title: "ტესტი ჩაიშალა",
        description: error.message || "SMS ვერ გაიგზავნა"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - SMS პარამეტრები</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">SMS პროვაიდერის პარამეტრები</h1>
        <p className="text-gray-500 font-body">დააკონფიგურირეთ SMS გაგზავნის სერვისი (SmarketerGE / SMS Office)</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-3xl">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-[#57c5cf]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 font-heading">სერვისის სტატუსი</h3>
                <p className="text-sm text-gray-500">{settings.is_active ? 'აქტიურია' : 'გამორთულია'}</p>
              </div>
              <Switch 
                checked={settings.is_active}
                onCheckedChange={(val) => setSettings(p => ({...p, is_active: val}))}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">Provider Name</label>
                <input 
                  type="text" 
                  value={settings.provider_name}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">Sender Name</label>
                <input 
                  type="text" 
                  value={settings.sender_name}
                  onChange={(e) => setSettings(p => ({...p, sender_name: e.target.value}))}
                  placeholder="SmarketerGE"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf]"
                />
              </div>

              <div className="md:col-span-2 space-y-2 relative">
                <label className="text-sm font-bold text-gray-700 block">API Key</label>
                <div className="relative">
                    <input 
                        type={showApiKey ? "text" : "password"}
                        value={settings.api_key}
                        onChange={(e) => setSettings(p => ({...p, api_key: e.target.value}))}
                        placeholder="Enter API Key"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-mono pr-12"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                <p className="text-xs text-gray-400">API key must be at least 20 characters.</p>
              </div>
            </div>

            {settings.updated_at && (
                <div className="text-xs text-gray-400 text-right pt-2">
                    ბოლო განახლება: {format(new Date(settings.updated_at), 'dd MMM yyyy, HH:mm')}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 mt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white py-6 rounded-xl font-heading text-lg gap-2 flex-1"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'ინახება...' : 'პარამეტრების შენახვა'}
              </Button>

              <Button 
                onClick={handleTestSMS} 
                disabled={testing || !settings.is_active}
                variant="outline"
                className="py-6 rounded-xl font-heading text-lg gap-2 flex-1 border-[#57c5cf] text-[#57c5cf] hover:bg-[#57c5cf]/5"
              >
                {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {testing ? 'იგზავნება...' : 'სატესტო SMS'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSmsSettings;