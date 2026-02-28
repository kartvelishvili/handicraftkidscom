// Supabase Edge Function: send-test-sms
// Sends a test SMS to the first active admin number
// Deploy: supabase functions deploy send-test-sms

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch SMS settings
    const { data: settings, error: settingsError } = await supabase
      .from('sms_provider_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ success: false, message: 'SMS provider not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch first active admin number
    const { data: adminNumbers } = await supabase
      .from('admin_phone_numbers')
      .select('phone')
      .eq('is_active', true)
      .limit(1);

    if (!adminNumbers || adminNumbers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active admin phone numbers found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phone = adminNumbers[0].phone.replace(/[\s\-\(\)\+]/g, '');
    const formattedPhone = phone.startsWith('995') ? phone : (phone.startsWith('0') ? '995' + phone.substring(1) : '995' + phone);

    const testMessage = `სატესტო SMS - Handicraft Kids ადმინ პანელი. თარიღი: ${new Date().toLocaleString('ka-GE')}`;

    const params = new URLSearchParams({
      key: settings.api_key,
      destination: formattedPhone,
      sender: settings.sender_name,
      content: testMessage,
    });

    const smsUrl = `https://smsoffice.ge/api/v2/send/?${params.toString()}`;
    const smsResponse = await fetch(smsUrl);
    const smsResult = await smsResponse.json();

    const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;

    // Log the test
    await supabase.from('sms_logs').insert({
      recipient_phone: formattedPhone,
      message: testMessage,
      status: isSuccess ? 'sent' : 'failed',
      response: smsResult,
    });

    return new Response(
      JSON.stringify({
        success: isSuccess,
        message: isSuccess ? 'Test SMS sent successfully' : `Failed: ${smsResult?.Message || 'Unknown error'}`,
        response: smsResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-test-sms error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
