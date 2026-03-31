import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingBag } from 'lucide-react';
import { logNotificationEvent } from '@/utils/notificationLogger';

// Base64 short beep sound
const BEEP_SOUND = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Truncated placeholder for valid wav if needed, but browsers might block autoplay without interaction.
// Using a simple beep URL if this fails:
const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const NotificationListener = () => {
  const { toast } = useToast();
  const audioRef = useRef(new Audio(ALERT_SOUND_URL));
  const [preferences, setPreferences] = useState({ enable_inapp: true });

  useEffect(() => {
    // Fetch preferences
    const fetchPrefs = async () => {
        const { data } = await supabase.from('admin_notification_preferences').select('*').single();
        if (data) {
            setPreferences({ enable_inapp: data.enable_inapp_notifications });
        }
    };
    fetchPrefs();

    // Subscribe to NEW orders
    const subscription = supabase
      .channel('global-order-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          if (!preferences.enable_inapp) return;

          const newOrder = payload.new;
          const customerName = newOrder.customer_info?.firstName || 'Guest';
          
          // Play Sound
          try {
            await audioRef.current.play();
          } catch (e) {
            console.warn("Audio play blocked", e);
          }

          // Show Toast
          toast({
            title: (
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-white" />
                    <span>ახალი შეკვეთა!</span>
                </div>
            ),
            description: `#${newOrder.order_number} - ${customerName} (${newOrder.total_amount} ₾)`,
            className: "bg-[#57c5cf] text-white border-none",
            duration: 5000,
          });

          // Log
          await logNotificationEvent({
              eventType: 'toast_shown',
              orderId: newOrder.id,
              status: 'success'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return null; // Invisible component
};

export default NotificationListener;