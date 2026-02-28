import { supabase } from '@/lib/customSupabaseClient';

/**
 * Sends order notification SMS to all active admins
 * @param {Object} order - The order object
 */
export const sendOrderNotificationSMS = async (order) => {
  try {
    // 1. Fetch active admin numbers
    const { data: adminNumbers, error: adminError } = await supabase
      .from('admin_phone_numbers')
      .select('phone')
      .eq('is_active', true);

    if (adminError) throw adminError;
    if (!adminNumbers || adminNumbers.length === 0) {
      console.warn('No active admin phone numbers found for SMS notification');
      return;
    }

    // 2. Format Message (Logic moved to Edge Function partially, but we pass raw data)
    // We invoke the edge function which now handles dynamic settings fetching internally
    
    // 3. Send to each admin
    const results = await Promise.all(adminNumbers.map(async (admin) => {
      try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: { 
            phone: admin.phone, 
            orderData: order, // Pass full order data
            type: 'admin'     // Specify type for formatting inside edge function
          }
        });

        const isSuccess = !error && (data?.success || data?.mocked);

        // Log the attempt
        await supabase.from('sms_logs').insert({
          recipient_phone: admin.phone,
          message: data?.content || "Admin Notification", // Content might be generated on server
          status: isSuccess ? 'sent' : 'failed',
          response: error || data,
          order_id: order.id
        });

        return { success: isSuccess, phone: admin.phone };
      } catch (err) {
        console.error(`Failed to send SMS to ${admin.phone}:`, err);
        // Log failure
        await supabase.from('sms_logs').insert({
          recipient_phone: admin.phone,
          message: "Admin Notification Failed",
          status: 'failed',
          response: { error: err.message },
          order_id: order.id
        });
        return { success: false, phone: admin.phone };
      }
    }));

    // 4. Update order status if at least one sent
    if (results.some(r => r.success)) {
      await supabase.from('orders').update({ sms_sent_to_admin: true }).eq('id', order.id);
    }

    return results;
  } catch (error) {
    console.error('Error in sendOrderNotificationSMS:', error);
    // Log system error
    await supabase.from('sms_logs').insert({
      recipient_phone: 'SYSTEM',
      message: 'Failed to initiate admin SMS broadcast',
      status: 'failed',
      response: { error: error.message },
      order_id: order.id
    });
  }
};

/**
 * Sends thank you SMS to customer
 * @param {Object} order - The order object
 */
export const sendCustomerThankYouSMS = async (order) => {
  try {
    const customerPhone = order.customer_info?.phone;
    if (!customerPhone) {
      console.warn('No customer phone found for order', order.id);
      return;
    }

    // Invoke edge function which fetches settings dynamically
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { 
        phone: customerPhone, 
        orderData: order,
        type: 'customer'
      }
    });

    const isSuccess = !error && (data?.success || data?.mocked);

    // Log attempt
    await supabase.from('sms_logs').insert({
      recipient_phone: customerPhone,
      message: data?.content || "Customer Thank You",
      status: isSuccess ? 'sent' : 'failed',
      response: error || data,
      order_id: order.id
    });

    if (isSuccess) {
      await supabase.from('orders').update({ sms_sent_to_customer: true }).eq('id', order.id);
    }

    return { success: isSuccess };

  } catch (error) {
    console.error('Error in sendCustomerThankYouSMS:', error);
    await supabase.from('sms_logs').insert({
      recipient_phone: order.customer_info?.phone || 'UNKNOWN',
      message: 'Failed to send customer SMS',
      status: 'failed',
      response: { error: error.message },
      order_id: order.id
    });
  }
};