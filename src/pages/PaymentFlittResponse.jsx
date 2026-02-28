import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { sendOrderNotificationsViaEdgeFunction } from '@/services/orderNotificationService';

const PaymentFlittResponse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [message, setMessage] = useState('გადახდის სტატუსი მოწმდება...');

  const orderId = searchParams.get('order_id');
  const paymentStatus = searchParams.get('status'); // 'success' or 'fail' from Flitt redirect
  const flittOrderStatus = searchParams.get('order_status'); // 'approved', 'declined', etc. from Flitt

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      setMessage('შეკვეთის ნომერი ვერ მოიძებნა');
      return;
    }

    const checkOrder = async () => {
      try {
        // Wait for webhook/callback to process
        await new Promise(r => setTimeout(r, 2000));

        // Check local DB status
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;

        const isSuccess = order.payment_status === 'paid' || paymentStatus === 'success' || flittOrderStatus === 'approved';

        if (isSuccess) {
          // Update order if callback hadn't processed yet
          if (order.payment_status !== 'paid') {
            await supabase.from('orders').update({ 
              payment_status: 'paid', 
              status: 'processing',
              updated_at: new Date().toISOString()
            }).eq('id', orderId);
          }

          setStatus('success');
          setMessage('გადახდა წარმატებით შესრულდა!');
          
          // Clear cart
          localStorage.removeItem('cartItems');

          // Send all notifications if not already processed
          if (!order.sms_sent_to_admin || !order.sms_sent_to_customer || !order.email_sent_to_customer) {
             try {
               await sendOrderNotificationsViaEdgeFunction(order);
             } catch (notifError) {
               console.error('Notification error (non-blocking):', notifError);
             }
          }

        } else {
          setStatus('failed');
          setMessage('გადახდა ვერ შესრულდა ან გაუქმდა.');
        }
      } catch (err) {
        console.error(err);
        setStatus('failed');
        setMessage('სტატუსის შემოწმებისას დაფიქსირდა შეცდომა');
      }
    };

    checkOrder();
  }, [orderId, paymentStatus]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <Helmet>
        <title>გადახდის სტატუსი - Handicraft</title>
      </Helmet>

      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-16 h-16 text-[#57c5cf] animate-spin" />
            <h2 className="text-xl font-bold text-gray-700">მიმდინარეობს შემოწმება...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">წარმატებული გადახდა!</h2>
            <p className="text-gray-500">{message}</p>
            <Button 
              onClick={() => navigate('/')}
              className="mt-4 bg-[#57c5cf] hover:bg-[#4bc0cb] text-white rounded-full px-8"
            >
              მთავარზე დაბრუნება
            </Button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">გადახდა ვერ შესრულდა</h2>
            <p className="text-gray-500">{message}</p>
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline"
                onClick={() => navigate('/checkout')}
                className="rounded-full"
              >
                სცადეთ თავიდან
              </Button>
              <Button 
                onClick={() => navigate('/contact')}
                className="bg-gray-800 text-white rounded-full"
              >
                დახმარება
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentFlittResponse;