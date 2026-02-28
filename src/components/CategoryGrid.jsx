import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';

const CategoryGrid = () => {
  const [categories, setCategories] = useState([]);
  const { translations } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      // Conditionally fetch only categories that are NOT hidden
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_hidden', false) // Filter out hidden categories
        .order('sort_order');
      if (data) setCategories(data);
    };
    
    fetchCategories();

    // Set up realtime subscription for immediate updates
    const channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchCategories())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (categories.length === 0) {
    return null; // Don't render section if no categories
  }

  return (
    <section id="categories" className="py-20 px-4 bg-white relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-10 left-[-50px] w-32 h-32 rounded-full bg-[#f292bc]/10 blur-xl"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <path d="M30 10 L35 25 L50 30 L35 35 L30 50 L25 35 L10 30 L25 25 Z" fill="#f292bc" opacity="0.3" />
              <circle cx="30" cy="30" r="15" fill="none" stroke="#57c5cf" strokeWidth="2" strokeDasharray="3,3" />
            </svg>
          </div>
          <h2 className="text-4xl md:text-5xl font-heading mb-4" style={{ color: '#57c5cf' }}>კატეგორიები</h2>
          <p className="text-gray-600 text-lg font-body">შეარჩიეთ სასურველი პროდუქცია</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {categories.map((category, index) => {
             // Defensive check: ensure category is valid
             if (!category || typeof category !== 'object') return null;

             const translationKey = `cat_${category.slug}`;
             // Safely access translation, ensuring we get a string or fallback to slug
             const translatedName = translations?.[translationKey]?.ka;
             const name = (typeof translatedName === 'string' && translatedName) 
               ? translatedName 
               : (typeof category.slug === 'string' ? category.slug : 'Category');

              const iconUrl = category.icon_url === "https://i.postimg.cc/V6QnBCQj/10-ortopediuli-balishi.png"
                ? "https://i.postimg.cc/RVfHjqNm/vector-design-soap-icon-style.png"
                : category.icon_url;

             return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="cursor-pointer group"
              >
                {/* Updated to use ID based routing */}
                <Link to={`/category/${category.id}`}>
                  <div className="relative aspect-square mb-4">
                    {/* Organic circular frame */}
                    <div 
                      className="absolute inset-0 rounded-[48%_52%_55%_45%/45%_55%_45%_55%] transform group-hover:scale-105 transition-transform duration-300 shadow-sm"
                      style={{ 
                        backgroundColor: category.color || '#f292bc',
                        opacity: 0.1
                      }}
                    ></div>
                    
                    {/* Main Image Container */}
                    <div 
                      className="absolute inset-[8px] rounded-[45%_55%_50%_50%/50%_50%_45%_55%] overflow-hidden border-2 shadow-lg group-hover:shadow-xl transition-all bg-white z-10"
                      style={{ borderColor: category.color || '#f292bc' }}
                    >
                      {category.image_url ? (
                         <img 
                           alt={name} 
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                           src={category.image_url} 
                         />
                      ) : (
                         <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                           No Image
                         </div>
                      )}
                    </div>

                    {/* Small Icon Badge - Conditionally Rendered */}
                    {category.show_icon !== false && iconUrl && (
                       <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-white rounded-full p-3 shadow-md z-20 border-2 border-white flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                          <img src={iconUrl} alt="icon" className="w-full h-full object-contain" />
                       </div>
                    )}
                  </div>

                  <div className="text-center">
                    <h3 className="font-heading font-bold text-lg leading-tight group-hover:text-[#f292bc] transition-colors" style={{ color: '#4a4a4a' }}>
                      {name}
                    </h3>
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

export default CategoryGrid;