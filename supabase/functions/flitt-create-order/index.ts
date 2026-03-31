// Supabase Edge Function: flitt-create-order
// Creates a Flitt (Fondy) checkout session and returns the payment URL
// Deploy: supabase functions deploy flitt-create-order

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use environment variable or default to production URL
const SITE_URL = Deno.env.get('SITE_URL') || 'https://handicraft.com.ge';

// Flitt/Fondy signature generation
function generateSignature(password: string, params: Record<string, string>): string {
  // 1. Filter out empty values and 'signature' itself
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'signature' && value !== '' && value !== undefined && value !== null) {
      filtered[key] = String(value);
    }
  }

  // 2. Sort keys alphabetically
  const sortedKeys = Object.keys(filtered).sort();

  // 3. Build the string: password|val1|val2|...
  const values = sortedKeys.map(k => filtered[k]);
  const signatureString = password + '|' + values.join('|');

  // 4. SHA1 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  
  // Use Web Crypto API for SHA-1
  return crypto.subtle.digest('SHA-1', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }) as unknown as string;
}

async function generateSignatureAsync(password: string, params: Record<string, string>): Promise<string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'signature' && value !== '' && value !== undefined && value !== null) {
      filtered[key] = String(value);
    }
  }

  const sortedKeys = Object.keys(filtered).sort();
  const values = sortedKeys.map(k => filtered[k]);
  const signatureString = password + '|' + values.join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, amount_gel, description, customer_email } = await req.json();

    if (!order_id || !amount_gel) {
      return new Response(
        JSON.stringify({ error: 'order_id and amount_gel are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Flitt settings from DB
    const { data: settings, error: settingsError } = await supabase
      .from('flitt_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('Failed to fetch flitt_settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Payment settings not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isTestMode = settings.test_mode;
    const merchantId = isTestMode ? settings.test_merchant_id : settings.merchant_id;
    const paymentKey = isTestMode ? settings.test_payment_key : settings.payment_key;
    const checkoutUrl = isTestMode 
      ? 'https://pay.flitt.com/api/checkout/url'
      : (settings.merchant_url || 'https://pay.flitt.com/api/checkout/url');

    if (!merchantId || !paymentKey) {
      return new Response(
        JSON.stringify({ error: 'Merchant credentials not configured. Please set up Flitt settings in admin panel.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Amount in minor units (tetri for GEL)
    const amountInMinor = Math.round(amount_gel * 100);
    const currency = settings.settlement_account_currency || 'GEL';

    // Build checkout request parameters
    const orderParams: Record<string, string> = {
      order_id: String(order_id),
      merchant_id: String(merchantId),
      order_desc: description || `Order ${order_id}`,
      amount: String(amountInMinor),
      currency: currency,
      response_url: `${SITE_URL}/payment/flitt/response?order_id=${order_id}&status=success`,
      server_callback_url: `${supabaseUrl}/functions/v1/flitt-callback`,
      sender_email: customer_email || '',
      lang: 'ka',
      payment_systems: 'card',
      default_payment_system: 'card',
    };

    // Generate signature
    const signature = await generateSignatureAsync(paymentKey, orderParams);
    orderParams.signature = signature;

    console.log(`Creating Flitt checkout: order=${order_id}, amount=${amountInMinor} ${currency}, test=${isTestMode}`);
    console.log(`Checkout URL: ${checkoutUrl}`);
    console.log(`Response URL: ${orderParams.response_url}`);

    // Call Flitt API
    const flittResponse = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: orderParams }),
    });

    const flittData = await flittResponse.json();
    console.log('Flitt API response:', JSON.stringify(flittData));

    if (flittData?.response?.checkout_url) {
      // Update order with payment info
      await supabase
        .from('orders')
        .update({
          payment_provider: 'flitt',
          payment_order_id: flittData.response.order_id || order_id,
          payment_status: 'pending',
        })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({
          checkout_url: flittData.response.checkout_url,
          url: flittData.response.checkout_url,
          payment_id: flittData.response.payment_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorMsg = flittData?.response?.error_message || flittData?.response?.error_code || 'Unknown Flitt error';
      console.error('Flitt API error:', errorMsg, flittData);
      
      return new Response(
        JSON.stringify({ error: `Payment provider error: ${errorMsg}`, details: flittData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('flitt-create-order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
