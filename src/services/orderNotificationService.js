/**
 * Order Notification Service
 * Orchestrates SMS + Email notifications after order placement
 * 
 * SMS: smsoffice.ge API (via Supabase Edge Function)
 * Email: Resend API (via Supabase Edge Function)
 * 
 * Provider: SmarketerGE
 * Domain: www.handicraft.com.ge
 */

import { supabase } from '@/lib/customSupabaseClient';
import { generateOrderConfirmationEmail, generateAdminNotificationEmail } from '@/services/emailTemplates';

/**
 * Main notification orchestrator - call after order is placed
 * Sends all notifications (SMS to admin + customer, Email to customer)
 */
export const sendOrderNotifications = async (order) => {
  const results = {
    smsAdmin: { success: false, error: null },
    smsCustomer: { success: false, error: null },
    emailCustomer: { success: false, error: null },
    inAppNotification: { success: false, error: null },
  };

  try {
    // Run all notification tasks in parallel for speed
    const [smsAdminResult, smsCustomerResult, emailResult, notifResult] = await Promise.allSettled([
      sendAdminSMS(order),
      sendCustomerSMS(order),
      sendCustomerEmail(order),
      createInAppNotification(order),
    ]);

    if (smsAdminResult.status === 'fulfilled') {
      results.smsAdmin = smsAdminResult.value;
    } else {
      results.smsAdmin.error = smsAdminResult.reason?.message;
    }

    if (smsCustomerResult.status === 'fulfilled') {
      results.smsCustomer = smsCustomerResult.value;
    } else {
      results.smsCustomer.error = smsCustomerResult.reason?.message;
    }

    if (emailResult.status === 'fulfilled') {
      results.emailCustomer = emailResult.value;
    } else {
      results.emailCustomer.error = emailResult.reason?.message;
    }

    if (notifResult.status === 'fulfilled') {
      results.inAppNotification = notifResult.value;
    } else {
      results.inAppNotification.error = notifResult.reason?.message;
    }

    console.log('📧 Notification results:', results);
    return results;

  } catch (error) {
    console.error('sendOrderNotifications error:', error);
    return results;
  }
};

/**
 * Send via Supabase Edge Function (server-side, handles SMS + Email + notifications)
 * This is the preferred method as it runs server-side with no CORS issues
 */
export const sendOrderNotificationsViaEdgeFunction = async (order) => {
  try {
    const { data, error } = await supabase.functions.invoke('process-order-notification', {
      body: { order }
    });

    if (error) {
      console.error('Edge Function error:', error);
      // Fallback to client-side notifications
      console.log('Falling back to client-side notifications...');
      return await sendOrderNotifications(order);
    }

    console.log('📧 Edge Function notification results:', data);
    return data;
  } catch (err) {
    console.error('Edge Function invocation failed:', err);
    // Fallback to client-side
    return await sendOrderNotifications(order);
  }
};

// ========================
// SMS Functions
// ========================

/**
 * Send SMS to all active admin numbers
 */
const sendAdminSMS = async (order) => {
  try {
    // Check if SMS notifications are enabled
    const { data: prefs } = await supabase
      .from('admin_notification_preferences')
      .select('enable_sms_notifications')
      .single();

    if (prefs && prefs.enable_sms_notifications === false) {
      return { success: true, skipped: true, reason: 'SMS notifications disabled' };
    }

    // Fetch active admin numbers
    const { data: adminNumbers, error: adminError } = await supabase
      .from('admin_phone_numbers')
      .select('phone')
      .eq('is_active', true);

    if (adminError || !adminNumbers || adminNumbers.length === 0) {
      return { success: false, error: 'No active admin phone numbers' };
    }

    // Send SMS via Edge Function to each admin
    const sendResults = await Promise.all(
      adminNumbers.map(async (admin) => {
        try {
          const { data, error } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: admin.phone,
              orderData: order,
              type: 'admin',
            },
          });

          const isSuccess = !error && (data?.success || data?.mocked);

          // Log the SMS
          await supabase.from('sms_logs').insert({
            recipient_phone: admin.phone,
            message: data?.content || generateAdminSMSText(order),
            status: isSuccess ? 'sent' : 'failed',
            response: error || data,
            order_id: order.id,
          });

          return { success: isSuccess, phone: admin.phone };
        } catch (err) {
          await logSMSError(admin.phone, order.id, err.message);
          return { success: false, phone: admin.phone, error: err.message };
        }
      })
    );

    const anySuccess = sendResults.some(r => r.success);
    if (anySuccess) {
      await supabase.from('orders').update({ sms_sent_to_admin: true }).eq('id', order.id);
    }

    return { success: anySuccess, results: sendResults };
  } catch (error) {
    console.error('sendAdminSMS error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send thank you SMS to customer
 */
const sendCustomerSMS = async (order) => {
  try {
    const customerPhone = order.customer_info?.phone;
    if (!customerPhone) {
      return { success: false, error: 'No customer phone number' };
    }

    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        phone: customerPhone,
        orderData: order,
        type: 'customer',
      },
    });

    const isSuccess = !error && (data?.success || data?.mocked);

    // Log SMS
    await supabase.from('sms_logs').insert({
      recipient_phone: customerPhone,
      message: data?.content || generateCustomerSMSText(order),
      status: isSuccess ? 'sent' : 'failed',
      response: error || data,
      order_id: order.id,
    });

    if (isSuccess) {
      await supabase.from('orders').update({ sms_sent_to_customer: true }).eq('id', order.id);
    }

    return { success: isSuccess };
  } catch (error) {
    console.error('sendCustomerSMS error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// Email Functions
// ========================

/**
 * Send order confirmation email to customer
 */
const sendCustomerEmail = async (order) => {
  try {
    const customerEmail = order.customer_info?.email;
    if (!customerEmail) {
      return { success: false, error: 'No customer email' };
    }

    const orderNum = order.order_number || order.id?.substring(0, 8);
    const emailHTML = generateOrderConfirmationEmail(order);

    // Try sending via Edge Function
    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: {
        to: customerEmail,
        subject: `შეკვეთა #${orderNum} მიღებულია - Handicraft Kids`,
        html: emailHTML,
        type: 'customer',
      },
    });

    const isSuccess = !error && data?.success;

    // Log notification
    await supabase.from('notification_logs').insert({
      event_type: 'email_customer',
      order_id: order.id,
      status: isSuccess ? 'sent' : 'failed',
      error_message: isSuccess ? null : (error?.message || data?.message || 'Unknown error'),
    }).catch(console.error);

    if (isSuccess) {
      await supabase.from('orders').update({ email_sent_to_customer: true }).eq('id', order.id);
    }

    return { success: isSuccess, error: isSuccess ? null : (error?.message || 'Email sending failed') };
  } catch (error) {
    console.error('sendCustomerEmail error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// In-App Notification
// ========================

/**
 * Create in-app notification for admin panel
 */
const createInAppNotification = async (order) => {
  try {
    const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
    const total = order.total_amount ? `₾${order.total_amount}` : '';

    const { error } = await supabase.from('notifications').insert({
      title: 'ახალი შეკვეთა!',
      message: `${customerName || 'მომხმარებელი'} - ${total}`,
      type: 'order',
      order_id: order.id,
      is_read: false,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('createInAppNotification error:', error);
    return { success: false, error: error.message };
  }
};

// ========================
// Helpers
// ========================

function generateAdminSMSText(order) {
  const customerName = `${order.customer_info?.firstName || ''} ${order.customer_info?.lastName || ''}`.trim();
  const phone = order.customer_info?.phone || 'N/A';
  const total = order.total_amount ? `${order.total_amount}₾` : 'N/A';
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const paymentMethod = order.payment_method === 'card' ? 'ბარათი' : 'ნაღდი';
  return `ახალი შეკვეთა #${orderNum}! ${customerName}, ${phone}, ${total} (${paymentMethod}). handicraft.com.ge/admin`;
}

function generateCustomerSMSText(order) {
  const orderNum = order.order_number || order.id?.substring(0, 8);
  const total = order.total_amount ? `${order.total_amount}₾` : '';
  return `მადლობა შეკვეთისთვის #${orderNum}! თანხა: ${total}. შეკვეთა მუშავდება. Handicraft Kids - handicraft.com.ge`;
}

async function logSMSError(phone, orderId, errorMessage) {
  try {
    await supabase.from('sms_logs').insert({
      recipient_phone: phone,
      message: 'Notification Failed',
      status: 'failed',
      response: { error: errorMessage },
      order_id: orderId,
    });
  } catch (e) {
    console.error('Failed to log SMS error:', e);
  }
}
