import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Save, ShieldCheck, Eye, EyeOff, Building2, Globe, CreditCard, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

const AdminFlittSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const [showPaymentKey, setShowPaymentKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showTestPaymentKey, setShowTestPaymentKey] = useState(false);
  const [showTestPrivateKey, setShowTestPrivateKey] = useState(false);

  const [formData, setFormData] = useState({
    test_mode: true,
    merchant_url: 'https://pay.flitt.com/api/checkout/url',
    merchant_id: '',
    payment_key: '',
    credit_private_key: '',
    test_merchant_id: '',
    test_payment_key: '',
    test_credit_private_key: '',
    company_name: '',
    settlement_account_currency: 'GEL',
    settlement_account_number: ''
  });

  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('flitt_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          test_mode: data.test_mode ?? true,
          merchant_url: data.merchant_url || 'https://pay.flitt.com/api/checkout/url',
          merchant_id: data.merchant_id || '',
          payment_key: data.payment_key || '',
          credit_private_key: data.credit_private_key || '',
          test_merchant_id: data.test_merchant_id || '',
          test_payment_key: data.test_payment_key || '',
          test_credit_private_key: data.test_credit_private_key || '',
          company_name: data.company_name || '',
          settlement_account_currency: data.settlement_account_currency || 'GEL',
          settlement_account_number: data.settlement_account_number || ''
        });
        setExistingId(data.id);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, test_mode: checked }));
  };

  const validateForm = () => {
    if (formData.test_mode) {
        if (!formData.test_merchant_id || !formData.test_payment_key) {
             toast({ variant: "destructive", title: "შეცდომა", description: "Test Merchant ID და Key სავალდებულოა სატესტო რეჟიმში" });
             return false;
        }
    } else {
        if (!formData.merchant_id || !formData.payment_key) {
             toast({ variant: "destructive", title: "შეცდომა", description: "Live Merchant ID და Key სავალდებულოა" });
             return false;
        }
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingId) {
        const { error: updateError } = await supabase
          .from('flitt_settings')
          .update(payload)
          .eq('id', existingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('flitt_settings')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "შენახულია",
        description: "Flitt პარამეტრები წარმატებით განახლდა",
        className: "bg-[#57c5cf] text-white"
      });
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "შენახვა ვერ მოხერხდა: " + error.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">იტვირთება...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Helmet>
        <title>ადმინ პანელი - Flitt პარამეტრები</title>
      </Helmet>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#57c5cf]/10 rounded-2xl flex items-center justify-center text-[#57c5cf]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">Flitt გადახდები</h1>
          <p className="text-gray-500 font-body">გადახდის სისტემის კონფიგურაცია</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Mode Toggle */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.test_mode ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                    <TestTube className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800">სატესტო რეჟიმში</h2>
                    <p className="text-sm text-gray-500">ჩართეთ სატესტო (Sandbox) რეჟიმი უსაფრთხო ტესტირებისთვის</p>
                </div>
            </div>
            <Switch 
                checked={formData.test_mode}
                onCheckedChange={handleSwitchChange}
                className="data-[state=checked]:bg-[#57c5cf]"
            />
        </div>

        {/* Live Config */}
        <div className={`bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6 ${formData.test_mode ? 'opacity-60 grayscale-[0.5] pointer-events-none' : ''}`}>
             <h2 className="text-xl font-heading font-bold text-gray-700 flex items-center gap-2 border-b pb-2 border-gray-100">
                <Globe className="w-5 h-5 text-green-600" /> LIVE კონფიგურაცია (Production)
            </h2>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Merchant ID</label>
                    <input 
                        name="merchant_id"
                        value={formData.merchant_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body"
                        placeholder="Live Merchant ID"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Payment Key</label>
                    <div className="relative">
                        <input 
                            type={showPaymentKey ? "text" : "password"}
                            name="payment_key"
                            value={formData.payment_key}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body font-mono"
                        />
                        <button type="button" onClick={() => setShowPaymentKey(!showPaymentKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showPaymentKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Credit Private Key</label>
                    <div className="relative">
                        <input 
                            type={showPrivateKey ? "text" : "password"}
                            name="credit_private_key"
                            value={formData.credit_private_key}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body font-mono"
                        />
                        <button type="button" onClick={() => setShowPrivateKey(!showPrivateKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                             {showPrivateKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Endpoint URL</label>
                    <input 
                        name="merchant_url"
                        value={formData.merchant_url}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body bg-gray-50"
                        placeholder="https://pay.flitt.com/api/checkout/url"
                    />
                </div>
            </div>
        </div>

        {/* Test Config */}
        <div className={`bg-white p-8 rounded-3xl shadow-sm border border-yellow-200 space-y-6 ${!formData.test_mode ? 'opacity-60 grayscale-[0.5] pointer-events-none' : 'ring-2 ring-yellow-400 ring-offset-2'}`}>
            <h2 className="text-xl font-heading font-bold text-gray-700 flex items-center gap-2 border-b pb-2 border-yellow-100">
                <TestTube className="w-5 h-5 text-yellow-500" /> TEST კონფიგურაცია (Sandbox)
            </h2>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Test Merchant ID</label>
                    <input 
                        name="test_merchant_id"
                        value={formData.test_merchant_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-yellow-400 font-body"
                        placeholder="Test Merchant ID"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Test Payment Key</label>
                    <div className="relative">
                        <input 
                            type={showTestPaymentKey ? "text" : "password"}
                            name="test_payment_key"
                            value={formData.test_payment_key}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-yellow-400 font-body font-mono"
                        />
                         <button type="button" onClick={() => setShowTestPaymentKey(!showTestPaymentKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {showTestPaymentKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Test Credit Private Key</label>
                    <div className="relative">
                        <input 
                            type={showTestPrivateKey ? "text" : "password"}
                            name="test_credit_private_key"
                            value={formData.test_credit_private_key}
                            onChange={handleInputChange}
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-yellow-400 font-body font-mono"
                        />
                         <button type="button" onClick={() => setShowTestPrivateKey(!showTestPrivateKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                             {showTestPrivateKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">Sandbox URL</label>
                    <input 
                        disabled
                        value="https://sandbox.flitt.com/api/checkout/url"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 font-body"
                    />
                </div>
            </div>
        </div>

        {/* Company & Settlement */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-heading font-bold text-gray-700 flex items-center gap-2 border-b pb-2 border-gray-100">
                <Building2 className="w-5 h-5 text-[#f292bc]" /> კომპანია და ანგარიშსწორება
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">კომპანიის სახელი</label>
                    <input 
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body"
                    />
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">ანგარიშის ვალუტა</label>
                     <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select 
                            name="settlement_account_currency"
                            value={formData.settlement_account_currency}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body bg-white"
                        >
                            <option value="GEL">GEL (ლარი)</option>
                            <option value="USD">USD (დოლარი)</option>
                            <option value="EUR">EUR (ევრო)</option>
                        </select>
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 font-body">ანგარიშის ნომერი (IBAN)</label>
                    <input 
                        name="settlement_account_number"
                        value={formData.settlement_account_number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body font-mono"
                    />
                </div>
            </div>
        </div>

        <div className="flex justify-end">
            <Button 
                type="submit" 
                disabled={saving}
                className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white px-8 py-6 rounded-xl font-heading text-lg shadow-lg"
            >
                {saving ? "ინახება..." : <span className="flex items-center gap-2"><Save className="w-5 h-5" /> პარამეტრების შენახვა</span>}
            </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminFlittSettings;