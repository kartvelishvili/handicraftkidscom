import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';

const PopularProducts = () => {
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { translations } = useLanguage();
  const [products, setProducts] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  React.useEffect(() => {
     // Fetch Categories for simple filter
     const fetchCats = async () => {
        const { data } = await supabase.from('categories').select('*').eq('is_active', true).limit(5);
        if(data) setCategories(data);
     };
     fetchCats();
  }, []);

  React.useEffect(() => {
     const fetchProducts = async () => {
        let query = supabase
           .from('products')
           .select('*')
           .eq('is_hidden', false)
           .eq('is_active', true)
           .limit(8)
           .order('created_at', {ascending: false});
        
        if (selectedCategory !== 'all') {
           query = query.eq('category_id', selectedCategory);
        }

        const { data } = await query;
        if(data) setProducts(data);
     };
     fetchProducts();
  }, [selectedCategory]);

  const handleFavorite = (e) => {
    e.preventDefault();
    toast({
      title: "დაემატა რჩეულებში ❤️"
    });
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: '#f292bc' }}>ოჯახების რჩეული</h2>
          <p className="text-gray-600 text-lg font-body mb-8">ჩვენი ყველაზე პოპულარული ხელნაკეთი ნივთები</p>
          
          {/* Simple Category Filter */}
          <div className="flex flex-wrap justify-center gap-2">
             <button
               onClick={() => setSelectedCategory('all')}
               className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === 'all' ? 'bg-[#57c5cf] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
             >
                ყველა
             </button>
             {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat.id ? 'bg-[#57c5cf] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
                >
                   {cat.name}
                </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => {
             const isOutOfStock = product.manage_inventory && product.stock_quantity === 0;
             const name = translations[`prod_name_${product.id}`]?.ka || 'Product Name';

             return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group h-full"
              >
                <Link to={`/product/${product.id}`} className="block relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-full flex flex-col border border-gray-100">
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img 
                      alt={name} 
                      className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
                      src={product.image_url} 
                    />
                    
                    {isOutOfStock && (
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-white/90 px-4 py-2 rounded-full text-red-500 font-bold text-sm shadow-sm border border-red-100">
                             მარაგში არ არის
                          </span>
                       </div>
                    )}
                    
                    <button 
                      onClick={handleFavorite}
                      className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform z-10"
                    >
                      <Heart className="w-5 h-5 text-[#f292bc]" />
                    </button>

                    {product.is_new && !isOutOfStock && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#57c5cf] text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                          ახალი
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 mt-auto w-full">
                    <h3 className="font-heading font-bold text-lg mb-2 text-gray-800 line-clamp-1 group-hover:text-[#57c5cf] transition-colors">{name}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold font-heading text-[#f292bc]">₾{product.price}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-500 font-bold">{product.rating || 5}</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={(e) => { e.preventDefault(); if(!isOutOfStock) addToCart(product); }}
                      disabled={isOutOfStock}
                      className={`w-full rounded-full font-heading font-semibold hover:shadow-lg transition-all ${isOutOfStock ? 'bg-gray-200 text-gray-400' : 'bg-[#57c5cf] text-white'}`}
                      style={!isOutOfStock ? { backgroundColor: '#57c5cf' } : {}}
                    >
                      {isOutOfStock ? 'ამოწურულია' : (
                         <>
                           <ShoppingCart className="w-4 h-4 mr-2" />
                           დამატება
                         </>
                      )}
                    </Button>
                  </div>
                </Link>
              </motion.div>
             );
          })}
        </div>
      </div>
    </section>
  );
};

export default PopularProducts;