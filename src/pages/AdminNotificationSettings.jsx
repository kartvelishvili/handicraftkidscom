import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Bell, MessageSquare, Save, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AdminNotificationSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enable_sms_notifications: true,
    enable_inapp_notifications: true,
    enable_email_notifications: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_notification_preferences')
        .select('*')
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"
      
      if (data) {
        setSettings({
            enable_sms_notifications: data.enable_sms_notifications,
            enable_inapp_notifications: data.enable_inapp_notifications,
            enable_email_notifications: data.enable_email_notifications !== false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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
    try {
      setSaving(true);
      
      // Check if row exists first to decide insert or update, but we'll use upsert with a known ID strategy or simple select count
      // Actually, since we don't know the ID easily without fetch, let's fetch first.
      const { data: existing } = await supabase.from('admin_notification_preferences').select('id').single();

      if (existing) {
          const { error } = await supabase
            .from('admin_notification_preferences')
            .update(settings)
            .eq('id', existing.id);
          if (error) throw error;
      } else {
          const { error } = await supabase
            .from('admin_notification_preferences')
            .insert(settings);
          if (error) throw error;
      }

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

  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - შეტყობინებების პარამეტრები</title>
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">შეტყობინებების მართვა</h1>
        <p className="text-gray-500 font-body">დააკონფიგურირეთ როგორ გსურთ შეტყობინებების მიღება</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="space-y-8">
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 font-heading">SMS შეტყობინებები</h3>
                <p className="text-sm text-gray-500">მიიღეთ SMS ყოველი ახალი შეკვეთის დროს</p>
              </div>
            </div>
            <Switch 
              checked={settings.enable_sms_notifications}
              onCheckedChange={(val) => setSettings(p => ({...p, enable_sms_notifications: val}))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 font-heading">ელ-ფოსტის შეტყობინებები</h3>
                <p className="text-sm text-gray-500">გაუგზავნეთ მომხმარებელს შეკვეთის დადასტურების მეილი</p>
              </div>
            </div>
            <Switch 
              checked={settings.enable_email_notifications}
              onCheckedChange={(val) => setSettings(p => ({...p, enable_email_notifications: val}))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 font-heading">სისტემური შეტყობინებები</h3>
                <p className="text-sm text-gray-500">მიიღეთ "Toast" და ხმოვანი სიგნალი ადმინ პანელში</p>
              </div>
            </div>
            <Switch 
              checked={settings.enable_inapp_notifications}
              onCheckedChange={(val) => setSettings(p => ({...p, enable_inapp_notifications: val}))}
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading || saving}
            className="w-full bg-[#57c5cf] hover:bg-[#4bc0cb] text-white py-6 rounded-xl font-heading text-lg gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'ინახება...' : 'შენახვა'}
          </Button>

        </div>
      </div>
    </div>
  );
};

export default AdminNotificationSettings;