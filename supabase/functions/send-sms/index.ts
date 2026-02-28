// Supabase Edge Function: send-sms
// Direct SMS sending via smsoffice.ge API
// Deploy: supabase functions deploy send-sms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, orderData, type, message: directMessage } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch SMS provider settings
    const { data: settings, error: settingsError } = await supabase
      .from('sms_provider_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ success: false, message: 'SMS provider not configured or inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    let cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '995' + cleanPhone.substring(1);
    if (!cleanPhone.startsWith('995') && cleanPhone.length === 9) cleanPhone = '995' + cleanPhone;

    // Generate message content
    let content = directMessage || '';
    
    if (!content && orderData) {
      const orderNum = orderData.order_number || orderData.id?.substring(0, 8);
      const total = orderData.total_amount ? `${orderData.total_amount}₾` : '';
      
      if (type === 'admin') {
        const customerName = `${orderData.customer_info?.firstName || ''} ${orderData.customer_info?.lastName || ''}`.trim();
        const customerPhone = orderData.customer_info?.phone || '';
        const paymentMethod = orderData.payment_method === 'card' ? 'ბარათი' : 'ნაღდი';
        content = `ახალი შეკვეთა #${orderNum}! ${customerName}, ${customerPhone}, ${total} (${paymentMethod}). handicraft.com.ge/admin`;
      } else {
        content = `მადლობა შეკვეთისთვის #${orderNum}! თანხა: ${total}. შეკვეთა მუშავდება. Handicraft Kids`;
      }
    }

    if (!content) {
      content = 'Handicraft Kids - შეტყობინება';
    }

    // Send via smsoffice.ge
    const params = new URLSearchParams({
      key: settings.api_key,
      destination: cleanPhone,
      sender: settings.sender_name,
      content: content,
    });

    const smsUrl = `https://smsoffice.ge/api/v2/send/?${params.toString()}`;
    const smsResponse = await fetch(smsUrl);
    const smsResult = await smsResponse.json();

    const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;

    return new Response(
      JSON.stringify({ 
        success: isSuccess, 
        content: content,
        response: smsResult,
        message: isSuccess ? 'SMS sent successfully' : `SMS failed: ${smsResult?.Message || 'Unknown error'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-sms error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
