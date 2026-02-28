import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Truck, CreditCard, Banknote, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { sendOrderNotificationsViaEdgeFunction } from '@/services/orderNotificationService';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    paymentMethod: 'card'
  });
  
  const [orderComplete, setOrderComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    // Check if we are in test mode to show banner
    const checkMode = async () => {
        const { data } = await supabase.from('flitt_settings').select('test_mode').single();
        if (data?.test_mode) setIsTestMode(true);
    };
    checkMode();
  }, []);

  const subtotal = getCartTotal();
  const shipping = subtotal > 150 ? 0 : 10;
  const total = subtotal + shipping;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const decreaseStock = async (items) => {
     try {
       const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
       
       for (const item of items) {
          // Validate UUID before calling RPC
          if (!item.id || !uuidRegex.test(item.id)) {
             console.warn(`Skipping stock decrement for item with invalid UUID: ${item.id}`);
             continue;
          }

          // Call RPC to safely decrement
          const { error } = await supabase.rpc('decrement_stock', {
             p_id: item.id,
             qty: item.quantity
          });
          
          if (error) {
             console.error(`Error decrementing stock for ${item.id}:`, error);
          }
       }
     } catch (err) {
       console.error("Failed to decrement stock:", err);
     }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
        // 1. Create Order in DB
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                customer_info: formData,
                products: cartItems,
                total_amount: total,
                status: 'new',
                payment_method: formData.paymentMethod,
                payment_status: 'pending',
                order_number: Math.floor(Date.now() / 1000) 
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        if (formData.paymentMethod === 'card') {
            // 2. Call Flitt Edge Function
            const response = await supabase.functions.invoke('flitt-create-order', {
                body: {
                    order_id: order.id,
                    amount_gel: total,
                    description: `Order #${order.order_number}`,
                    customer_email: formData.email
                }
            });

            if (response.error) {
                console.error('Flitt edge function error:', response.error);
                throw new Error(response.error.message || 'Payment service error');
            }
            
            const responseData = response.data;
            const redirectUrl = responseData?.url || responseData?.checkout_url; 

            if (redirectUrl) {
                console.log('Redirecting to Flitt checkout:', redirectUrl);
                window.location.href = redirectUrl;
                return;
            } else {
                console.error('No redirect URL in response:', responseData);
                throw new Error(responseData?.error || "No redirect URL received from payment provider");
            }
        } else {
            // Cash payment
            // 3. Decrement Stock immediately
            await decreaseStock(cartItems);

            // 4. Send all notifications (SMS to admin + customer, Email to customer, In-App)
            try {
              await sendOrderNotificationsViaEdgeFunction(order);
            } catch (notifError) {
              console.error('Notification error (non-blocking):', notifError);
            }

            setOrderComplete(true);
            clearCart();
            window.scrollTo(0, 0);
        }

    } catch (error) {
        console.error('Checkout Error:', error);
        toast({
            variant: "destructive",
            title: "შეცდომა",
            description: "შეკვეთის გაფორმება ვერ მოხერხდა. სცადეთ თავიდან."
        });
    } finally {
        setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !orderComplete) {
    navigate('/cart');
    return null;
  }

  if (orderComplete) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center container mx-auto">
        <Helmet>
          <title>შეკვეთა მიღებულია - Handicraft</title>
        </Helmet>
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-32 h-32 bg-[#57c5cf] rounded-full flex items-center justify-center mb-8 shadow-xl"
        >
          <Check className="w-16 h-16 text-white" strokeWidth={3} />
        </motion.div>
        
        <h1 className="text-4xl font-heading font-bold text-gray-800 mb-4">მადლობა შეკვეთისთვის!</h1>
        <p className="text-xl text-gray-600 font-body mb-2">თქვენი შეკვეთა წარმატებით გაფორმდა.</p>
        <p className="text-gray-500 font-body mb-8">დადასტურების მეილი გამოგზავნილია {formData.email}-ზე</p>
        
        <div className="flex gap-4">
          <Button 
            onClick={() => navigate('/')}
            className="bg-[#f292bc] hover:bg-[#e07aa3] text-white rounded-full px-8 py-6 text-lg font-heading"
          >
            მთავარზე დაბრუნება
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <Helmet>
        <title>შეკვეთის გაფორმება - Handicraft</title>
      </Helmet>
      
      <h1 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-center text-[#57c5cf]">შეკვეთის გაფორმება</h1>

      {isTestMode && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg flex items-center gap-3">
              <AlertTriangle className="text-yellow-600 w-6 h-6" />
              <div>
                  <p className="font-bold text-yellow-800">სატესტო რეჟიმი</p>
                  <p className="text-sm text-yellow-700">გადახდის სისტემა მუშაობს სატესტო რეჟიმში. თანხა არ ჩამოიჭრება.</p>
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
        {/* Checkout Form */}
        <div className="lg:w-2/3">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Contact Info */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#57c5cf] text-white flex items-center justify-center text-sm">1</span>
                საკონტაქტო ინფორმაცია
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">სახელი</label>
                  <input required name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body" placeholder="გიორგი" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">გვარი</label>
                  <input required name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body" placeholder="ბერიძე" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">ელ-ფოსტა</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body" placeholder="giorgi@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">მობილური</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#57c5cf] font-body" placeholder="555 12 34 56" />
                </div>
              </div>
            </section>

            {/* Shipping Info */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#f292bc] text-white flex items-center justify-center text-sm">2</span>
                მისამართი
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">ქალაქი / რაიონი</label>
                  <input required name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#f292bc] font-body" placeholder="თბილისი" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 font-body">ზუსტი მისამართი</label>
                  <textarea required name="address" value={formData.address} onChange={handleInputChange} rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#f292bc] font-body" placeholder="ქუჩა, კორპუსი, ბინა..." />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#57c5cf] text-white flex items-center justify-center text-sm">3</span>
                გადახდის მეთოდი
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setFormData(p => ({...p, paymentMethod: 'card'}))}
                  className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${formData.paymentMethod === 'card' ? 'border-[#57c5cf] bg-[#57c5cf]/5' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <CreditCard className={`w-6 h-6 ${formData.paymentMethod === 'card' ? 'text-[#57c5cf]' : 'text-gray-400'}`} />
                  <span className="font-heading font-bold text-gray-700">ბარათით გადახდა</span>
                </div>
                <div 
                  onClick={() => setFormData(p => ({...p, paymentMethod: 'cash'}))}
                  className={`cursor-pointer p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${formData.paymentMethod === 'cash' ? 'border-[#57c5cf] bg-[#57c5cf]/5' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <Banknote className={`w-6 h-6 ${formData.paymentMethod === 'cash' ? 'text-[#57c5cf]' : 'text-gray-400'}`} />
                  <span className="font-heading font-bold text-gray-700">ნაღდი ანგარიშსწორება</span>
                </div>
              </div>
            </section>
            
            <div className="lg:hidden">
              <Button type="submit" disabled={isProcessing} className="w-full py-6 text-lg font-heading rounded-full bg-[#57c5cf]">
                 {isProcessing ? 'მუშავდება...' : 'შეკვეთის დასრულება'}
              </Button>
            </div>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-1/3">
          <div className="bg-gray-50 p-6 rounded-3xl sticky top-24 border border-gray-200">
            <h3 className="text-xl font-heading font-bold mb-6 text-gray-800">შეკვეთა</h3>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                    <img src={item.image_url || item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                  </div>
                  <p className="font-bold text-[#57c5cf]">₾{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-200 mb-6 font-body text-sm">
               <div className="flex justify-between">
                 <span className="text-gray-600">ქვე-ჯამი</span>
                 <span className="font-bold">₾{subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-600">მიწოდება</span>
                 <span className="font-bold text-[#57c5cf]">{shipping === 0 ? 'უფასო' : `₾${shipping.toFixed(2)}`}</span>
               </div>
               <div className="flex justify-between text-lg pt-4 border-t border-gray-200">
                 <span className="font-heading font-bold text-gray-800">სულ:</span>
                 <span className="font-heading font-bold text-[#f292bc]">₾{total.toFixed(2)}</span>
               </div>
            </div>

            <Button onClick={handleSubmit} disabled={isProcessing} className="hidden lg:flex w-full py-6 text-lg font-heading rounded-full bg-[#57c5cf] hover:bg-[#4bc0cb] hover:shadow-lg transition-all">
               {isProcessing ? 'მუშავდება...' : 'შეკვეთის დასრულება'}
            </Button>
            
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400 font-body">
              <Truck className="w-4 h-4" />
              <span>უსაფრთხო მიწოდება 2-3 დღეში</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;