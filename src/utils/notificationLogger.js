import { supabase } from '@/lib/customSupabaseClient';

export const logNotificationEvent = async ({
  eventType,
  orderId,
  status,
  errorMessage = null
}) => {
  try {
    const { error } = await supabase
      .from('notification_logs')
      .insert({
        event_type: eventType,
        order_id: orderId,
        status: status,
        error_message: errorMessage
      });

    if (error) throw error;
  } catch (err) {
    console.error('Failed to log notification event:', err);
  }
};