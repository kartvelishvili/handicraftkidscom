// Supabase Edge Function: process-order-notification
// Handles SMS (via smsoffice.ge) + Email sending after order placement
// Deploy: supabase functions deploy process-order-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderData {
  id: string;
  order_number?: number;
  customer_info?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    paymentMethod?: string;
  };
  products?: Array<{
    name?: string;
    price?: number;
    quantity?: number;
    image_url?: string;
  }>;
  total_amount?: number;
  status?: string;
  payment_method?: string;
  created_at?: string;
}

// ========================
// SMS via smsoffice.ge
// ========================
async function sendSMS(apiKey: string, sender: string, destination: string, content: string) {
  const params = new URLSearchParams({
    key: apiKey,
    destination: destination.replace(/[\s\-\+]/g, ''),
    sender: sender,
    content: content,
  });

  const url = `https://smsoffice.ge/api/v2/send/?${params.toString()}`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  return result;
}

function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, plus signs
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with +, remove it
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  
  // If starts with 0, replace with 995
  if (cleaned.startsWith('0')) cleaned = '995' + cleaned.substring(1);
  
  // If doesn't start with 995, prepend it
  if (!cleaned.startsWith('995') && cleaned.length === 9) {
    cleaned = '995' + cleaned;
  }
  
  return cleaned;
}

function generateAdminSMSContent(order: OrderData): string {
  const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
  const phone = order.customer_info?.phone || 'N/A';
  const total = order.total_amount ? `${order.total_amount}₾` : 'N/A';
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const paymentMethod = order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი';
  
  return `ახალი შეკვეთა #${orderNum}! ${customerName}, ${phone}, ${total} (${paymentMethod}). handicraft.com.ge/admin`;
}

function generateCustomerSMSContent(order: OrderData): string {
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const total = order.total_amount ? `${order.total_amount}₾` : '';
  
  return `მადლობა შეკვეთისთვის #${orderNum}! თანხა: ${total}. შეკვეთა მუშავდება. Handicraft Kids - handicraft.com.ge`;
}

// ========================
// Email via Resend API
// ========================
async function sendEmail(to: string, subject: string, htmlContent: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return { success: false, message: 'Email API key not configured' };
  }
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Handicraft Kids <info@handicraft.com.ge>',
      to: [to],
      subject: subject,
      html: htmlContent,
    }),
  });
  
  const result = await response.json();
  return { success: response.ok, data: result };
}

function generateOrderEmailHTML(order: OrderData): string {
  const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const total = order.total_amount?.toFixed(2) || '0.00';
  const paymentMethod = order.payment_method === 'card' ? 'ბარათით გადახდა' : 'ნაღდი ანგარიშსწორება';
  const city = order.customer_info?.city || '';
  const address = order.customer_info?.address || '';
  const phone = order.customer_info?.phone || '';
  
  const productsHTML = (order.products || []).map(item => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.image_url ? `<img src="${item.image_url}" alt="" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">` : ''}
          <span style="font-weight: 600; color: #334155;">${item.name || 'პროდუქტი'}</span>
        </div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">x${item.quantity || 1}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #334155;">₾${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0891b2, #0d9488); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Handicraft Kids</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">პრემიუმ ხელნაკეთი ნივთები</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: white; padding: 32px 24px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
      
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 64px; height: 64px; background: #ecfdf5; border-radius: 50%; line-height: 64px; font-size: 32px;">✓</div>
      </div>
      
      <h2 style="margin: 0 0 8px; text-align: center; color: #1e293b; font-size: 22px;">მადლობა შეკვეთისთვის!</h2>
      <p style="margin: 0 0 24px; text-align: center; color: #64748b; font-size: 14px;">
        ${customerName ? `${customerName}, ` : ''}თქვენი შეკვეთა #${orderNum} წარმატებით მიღებულია.
      </p>
      
      <!-- Order Details Box -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">შეკვეთის დეტალები</h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">შეკვეთის ნომერი</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">#${orderNum}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">გადახდის მეთოდი</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">ტელეფონი</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">მისამართი</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${city}${address ? ', ' + address : ''}</td>
          </tr>
        </table>
      </div>
      
      <!-- Products Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 16px; text-align: left; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">პროდუქტი</th>
            <th style="padding: 8px 16px; text-align: center; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">რაოდენობა</th>
            <th style="padding: 8px 16px; text-align: right; color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">ფასი</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
        </tbody>
      </table>
      
      <!-- Total -->
      <div style="background: linear-gradient(135deg, #0891b2, #0d9488); border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 500;">სულ გადასახდელი:</span>
        <span style="color: white; font-size: 24px; font-weight: 700;">₾${total}</span>
      </div>
      
      <!-- Info -->
      <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
          📦 თქვენი შეკვეთა მუშავდება და მიწოდება განხორციელდება 2-3 სამუშაო დღის განმავლობაში.<br>
          შეკითხვების შემთხვევაში დაგვიკავშირდით.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #1e293b; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">Handicraft Kids</p>
      <p style="margin: 0; color: #64748b; font-size: 12px;">www.handicraft.com.ge</p>
    </div>
    
  </div>
</body>
</html>`;
}

// ========================
// Main Handler
// ========================
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order } = await req.json() as { order: OrderData };

    if (!order || !order.id) {
      return new Response(
        JSON.stringify({ error: 'Order data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results = {
      sms_admin: { success: false, details: '' },
      sms_customer: { success: false, details: '' },
      email_customer: { success: false, details: '' },
      notification: { success: false },
    };

    // ---- 1. Check notification preferences ----
    const { data: prefs } = await supabase
      .from('admin_notification_preferences')
      .select('*')
      .single();

    const smsEnabled = prefs?.enable_sms_notifications !== false;

    // ---- 2. Fetch SMS provider settings ----
    let smsSettings = null;
    if (smsEnabled) {
      const { data } = await supabase
        .from('sms_provider_settings')
        .select('*')
        .eq('is_active', true)
        .single();
      smsSettings = data;
    }

    // ---- 3. Send SMS to admin numbers ----
    if (smsSettings && smsSettings.api_key && smsSettings.sender_name) {
      try {
        const { data: adminNumbers } = await supabase
          .from('admin_phone_numbers')
          .select('phone')
          .eq('is_active', true);

        if (adminNumbers && adminNumbers.length > 0) {
          const adminMessage = generateAdminSMSContent(order);
          const destinations = adminNumbers.map(n => formatPhoneNumber(n.phone)).join(',');

          const smsResult = await sendSMS(
            smsSettings.api_key,
            smsSettings.sender_name,
            destinations,
            adminMessage
          );

          const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;
          results.sms_admin = { success: isSuccess, details: JSON.stringify(smsResult) };

          // Log SMS
          for (const admin of adminNumbers) {
            await supabase.from('sms_logs').insert({
              recipient_phone: admin.phone,
              message: adminMessage,
              status: isSuccess ? 'sent' : 'failed',
              response: smsResult,
              order_id: order.id,
            });
          }

          if (isSuccess) {
            await supabase.from('orders').update({ sms_sent_to_admin: true }).eq('id', order.id);
          }
        }
      } catch (smsErr) {
        console.error('Admin SMS error:', smsErr);
        results.sms_admin.details = smsErr.message;
      }

      // ---- 4. Send SMS to customer ----
      const customerPhone = order.customer_info?.phone;
      if (customerPhone) {
        try {
          const customerMessage = generateCustomerSMSContent(order);
          const formattedPhone = formatPhoneNumber(customerPhone);

          const smsResult = await sendSMS(
            smsSettings.api_key,
            smsSettings.sender_name,
            formattedPhone,
            customerMessage
          );

          const isSuccess = smsResult?.Success === true || smsResult?.ErrorCode === 0;
          results.sms_customer = { success: isSuccess, details: JSON.stringify(smsResult) };

          await supabase.from('sms_logs').insert({
            recipient_phone: customerPhone,
            message: customerMessage,
            status: isSuccess ? 'sent' : 'failed',
            response: smsResult,
            order_id: order.id,
          });

          if (isSuccess) {
            await supabase.from('orders').update({ sms_sent_to_customer: true }).eq('id', order.id);
          }
        } catch (smsErr) {
          console.error('Customer SMS error:', smsErr);
          results.sms_customer.details = smsErr.message;
        }
      }
    }

    // ---- 5. Send Email to customer ----
    const customerEmail = order.customer_info?.email;
    if (customerEmail) {
      try {
        const orderNum = order.order_number || order.id?.substring(0, 8);
        const emailSubject = `შეკვეთა #${orderNum} მიღებულია - Handicraft Kids`;
        const emailHTML = generateOrderEmailHTML(order);
        
        const emailResult = await sendEmail(customerEmail, emailSubject, emailHTML);
        results.email_customer = { success: emailResult.success, details: JSON.stringify(emailResult) };

        // Log email
        await supabase.from('notification_logs').insert({
          event_type: 'email_customer',
          order_id: order.id,
          status: emailResult.success ? 'sent' : 'failed',
          error_message: emailResult.success ? null : JSON.stringify(emailResult),
        });
      } catch (emailErr) {
        console.error('Customer email error:', emailErr);
        results.email_customer.details = emailErr.message;
      }
    }

    // ---- 6. Create in-app notification ----
    try {
      const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
      const total = order.total_amount ? `₾${order.total_amount}` : '';

      await supabase.from('notifications').insert({
        title: 'ახალი შეკვეთა!',
        message: `${customerName || 'მომხმარებელი'} - ${total}`,
        type: 'order',
        order_id: order.id,
        is_read: false,
      });
      results.notification.success = true;
    } catch (notifErr) {
      console.error('Notification error:', notifErr);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('process-order-notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
