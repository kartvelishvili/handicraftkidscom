import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Truck, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AdminDelivery = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [freeThreshold, setFreeThreshold] = useState(150);
  const [deliveryFee, setDeliveryFee] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'delivery')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.value) {
        setEnabled(data.value.enabled ?? true);
        setFreeThreshold(data.value.free_threshold ?? 150);
        setDeliveryFee(data.value.delivery_fee ?? 10);
      }
    } catch (error) {
      console.error('Error fetching delivery settings:', error);
      toast({ title: 'პარამეტრების ჩატვირთვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const value = {
        enabled,
        free_threshold: Number(freeThreshold),
        delivery_fee: Number(deliveryFee),
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'delivery', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;

      toast({ title: 'მიწოდების პარამეტრები შენახულია' });
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      toast({ title: 'შენახვა ვერ მოხერხდა', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">იტვირთება...</div>;

  return (
    <div className="space-y-8">
      <Helmet><title>Admin - მიწოდების პარამეტრები</title></Helmet>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">მიწოდების მართვა</h1>
          <p className="text-gray-500 mt-1">მიწოდების ჩართვა/გამორთვა და საფასურის კონფიგურაცია</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8 max-w-2xl">
        
        {/* Toggle */}
        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#57c5cf]" />
              მიწოდების სერვისი
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {enabled ? 'მიწოდება ჩართულია — მომხმარებლები ხედავენ მიწოდების ოფციას' : 'მიწოდება გამორთულია — მხოლოდ ადგილზე გატანა'}
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className="focus:outline-none"
            type="button"
          >
            {enabled ? (
              <ToggleRight className="w-14 h-14 text-[#57c5cf]" />
            ) : (
              <ToggleLeft className="w-14 h-14 text-gray-300" />
            )}
          </button>
        </div>

        {/* Fee Settings (only shown when enabled) */}
        {enabled && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">მიწოდების საფასური (₾)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full p-4 border rounded-xl bg-gray-50 focus:border-[#57c5cf] focus:outline-none font-mono text-lg"
              />
              <p className="text-xs text-gray-400">სტანდარტული მიწოდების ღირებულება</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">უფასო მიწოდების ზღვარი (₾)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(e.target.value)}
                className="w-full p-4 border rounded-xl bg-gray-50 focus:border-[#57c5cf] focus:outline-none font-mono text-lg"
              />
              <p className="text-xs text-gray-400">ამ თანხაზე მეტი შეკვეთისას მიწოდება უფასოა. 0 = ყოველთვის ფასიანი.</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-700">
                <strong>მიმდინარე წესი:</strong>{' '}
                {Number(freeThreshold) > 0
                  ? `₾${deliveryFee} მიწოდება, ${freeThreshold}₾-ზე მეტი შეკვეთისას — უფასო`
                  : `₾${deliveryFee} მიწოდება ყველა შეკვეთაზე`}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white px-8 py-6 rounded-xl text-lg font-heading shadow-lg shadow-[#57c5cf]/20"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'ინახება...' : 'შენახვა'}
        </Button>
      </div>
    </div>
  );
};

export default AdminDelivery;
