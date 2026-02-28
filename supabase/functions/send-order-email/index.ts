// Supabase Edge Function: send-order-email
// Sends order notification emails via Resend API
// Deploy: supabase functions deploy send-order-email
//
// Required env vars:
//   RESEND_API_KEY - Get from https://resend.com (free tier: 100 emails/day)
//   Set via: supabase secrets set RESEND_API_KEY=re_xxxxx

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
    const { to, subject, html, type } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email service not configured. Set RESEND_API_KEY in Supabase secrets.',
          hint: 'Run: supabase secrets set RESEND_API_KEY=re_your_key_here'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine sender based on type
    const fromAddress = type === 'admin' 
      ? 'Handicraft Kids Admin <admin@handicraft.com.ge>'
      : 'Handicraft Kids <info@handicraft.com.ge>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', result);
      return new Response(
        JSON.stringify({ success: false, message: result?.message || 'Email sending failed', data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('send-order-email error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
