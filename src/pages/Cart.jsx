import React from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();
  
  const subtotal = getCartTotal();
  const shipping = subtotal > 150 ? 0 : 10;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <Helmet>
          <title>კალათა - Handicraft</title>
        </Helmet>
        <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
           <ShoppingBag className="w-16 h-16 text-gray-300" />
           <div className="absolute -top-2 -right-2">
             <svg width="40" height="40" viewBox="0 0 40 40">
               <path d="M10 10 L30 30 M30 10 L10 30" stroke="#f292bc" strokeWidth="4" strokeLinecap="round" />
             </svg>
           </div>
        </div>
        <h2 className="text-3xl font-heading font-bold text-gray-800 mb-4">თქვენი კალათა ცარიელია</h2>
        <p className="text-gray-500 font-body mb-8 max-w-md">
          ჩანს, რომ ჯერ არაფერი შეგირჩევიათ. დაათვალიერეთ ჩვენი კატეგორიები და იპოვეთ სასურველი ნივთი.
        </p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white rounded-full px-8 py-6 text-lg font-heading"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          მაღაზიაში დაბრუნება
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <Helmet>
        <title>კალათა - Handicraft</title>
      </Helmet>
      
      <h1 className="text-4xl font-heading font-bold mb-8 text-[#57c5cf]">კალათა</h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="lg:w-2/3 space-y-6">
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="flex flex-col sm:flex-row gap-6 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm items-center relative overflow-hidden group"
              >
                {/* Decorative bg shape */}
                <div className="absolute -left-4 top-0 bottom-0 w-2 bg-[#f292bc] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-50 rounded-2xl overflow-hidden">
                  <img 
                    src={item.image_url || item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="flex-grow text-center sm:text-left">
                  <h3 className="text-xl font-heading font-bold text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-500 font-body mb-2">{item.category}</p>
                  <p className="text-[#57c5cf] font-bold text-lg">₾{item.price}.00</p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 hover:text-[#f292bc] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-700">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 hover:text-[#57c5cf] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                  <p className="font-heading font-bold text-xl text-gray-800 sm:w-24 text-right mr-4">
                    ₾{(item.price * item.quantity).toFixed(2)}
                  </p>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:w-1/3">
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-[#57c5cf]/20 sticky top-24">
            <h2 className="text-2xl font-heading font-bold mb-6 text-gray-800">შეკვეთის ჯამი</h2>
            
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-100 font-body">
              <div className="flex justify-between text-gray-600">
                <span>ქვე-ჯამი</span>
                <span className="font-bold">₾{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>მიწოდება</span>
                <span className="font-bold text-[#57c5cf]">
                  {shipping === 0 ? 'უფასო' : `₾${shipping.toFixed(2)}`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-[#f292bc]">
                  * უფასო მიწოდება 150 ლარის ზევით
                </p>
              )}
            </div>

            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-heading font-bold text-gray-800">სულ გადასახდელი</span>
              <span className="text-2xl font-heading font-bold text-[#f292bc]">₾{total.toFixed(2)}</span>
            </div>

            <Button 
              onClick={() => navigate('/checkout')}
              className="w-full py-7 rounded-full text-lg font-heading shadow-lg hover:scale-[1.02] transition-transform bg-[#57c5cf] hover:bg-[#4bc0cb]"
            >
              შეკვეთის გაფორმება
            </Button>

            <div className="mt-6 flex justify-center gap-2">
               <div className="w-8 h-5 bg-gray-200 rounded"></div>
               <div className="w-8 h-5 bg-gray-200 rounded"></div>
               <div className="w-8 h-5 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;