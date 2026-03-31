// Supabase Edge Function: flitt-callback
// Server-to-server callback from Flitt after payment completion
// Deploy: supabase functions deploy flitt-callback

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(password: string, params: Record<string, string>): Promise<boolean> {
  const receivedSignature = params.signature;
  if (!receivedSignature) return false;

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
  const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSignature === receivedSignature;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse callback data - Flitt sends as form-encoded or JSON
    let callbackData: Record<string, string>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      callbackData = await req.json();
    } else {
      const formData = await req.formData();
      callbackData = {};
      formData.forEach((value, key) => {
        callbackData[key] = String(value);
      });
    }

    console.log('Flitt callback received:', JSON.stringify(callbackData));

    const orderId = callbackData.order_id;
    const orderStatus = callbackData.order_status;
    const paymentId = callbackData.payment_id;

    if (!orderId) {
      console.error('No order_id in callback');
      return new Response('Missing order_id', { status: 400, headers: corsHeaders });
    }

    // Fetch Flitt settings to verify signature
    const { data: settings } = await supabase
      .from('flitt_settings')
      .select('*')
      .single();

    if (settings) {
      const paymentKey = settings.test_mode ? settings.test_payment_key : settings.payment_key;
      if (paymentKey && callbackData.signature) {
        const isValid = await verifySignature(paymentKey, callbackData);
        if (!isValid) {
          console.error('Invalid signature in Flitt callback');
          return new Response('Invalid signature', { status: 403, headers: corsHeaders });
        }
        console.log('Signature verified successfully');
      }
    }

    // Map Flitt status to our status
    let paymentStatus = 'pending';
    let orderStatusUpdate = 'new';

    if (orderStatus === 'approved') {
      paymentStatus = 'paid';
      orderStatusUpdate = 'processing';
    } else if (orderStatus === 'declined' || orderStatus === 'expired') {
      paymentStatus = 'failed';
      orderStatusUpdate = 'cancelled';
    } else if (orderStatus === 'reversed') {
      paymentStatus = 'refunded';
      orderStatusUpdate = 'refunded';
    }

    // Update order in DB
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: orderStatusUpdate,
        payment_id: paymentId || null,
        payment_callback_data: callbackData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response('DB update failed', { status: 500, headers: corsHeaders });
    }

    console.log(`Order ${orderId} updated: payment_status=${paymentStatus}, status=${orderStatusUpdate}`);

    // If payment approved, decrement stock
    if (paymentStatus === 'paid') {
      const { data: order } = await supabase
        .from('orders')
        .select('products')
        .eq('id', orderId)
        .single();

      if (order?.products) {
        for (const item of order.products) {
          if (item.id) {
            const { error } = await supabase.rpc('decrement_stock', {
              p_id: item.id,
              qty: item.quantity || 1,
            });
            if (error) console.error(`Stock decrement error for ${item.id}:`, error);
          }
        }
        console.log('Stock decremented for order', orderId);
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('flitt-callback error:', error);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
