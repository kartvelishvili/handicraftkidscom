import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const CategoryDropdown = ({ isOpen, onClose, categories, isMobile }) => {
  const { translations } = useLanguage();

  if (!isOpen) return null;

  const containerVariants = {
    hidden: { opacity: 0, y: isMobile ? 100 : 10, scale: isMobile ? 1 : 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.05
      }
    },
    exit: { opacity: 0, y: isMobile ? 100 : 10, scale: isMobile ? 1 : 0.95, transition: { duration: 0.2 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AnimatePresence>
      {/* Mobile Modal Overlay */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black z-40 lg:hidden"
        />
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`
          ${isMobile 
            ? 'fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-3xl shadow-[0_-5px_25px_rgba(0,0,0,0.1)] max-h-[85vh] overflow-y-auto' 
            : 'absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden'
          }
        `}
      >
        {isMobile && (
          <div className="sticky top-0 bg-white z-10 p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-heading font-bold text-gray-800">კატეგორიები</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        )}

        <div className={`p-6 ${!isMobile ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-2 gap-3'}`}>
          {categories.map((category) => {
            const translationKey = `cat_${category.slug}`;
            const translatedName = translations?.[translationKey]?.ka;
            const name = (typeof translatedName === 'string' && translatedName) 
              ? translatedName 
              : (category.name || category.slug);

             const iconUrl = category.icon_url === "https://i.postimg.cc/V6QnBCQj/10-ortopediuli-balishi.png"
                ? "https://i.postimg.cc/RVfHjqNm/vector-design-soap-icon-style.png"
                : category.icon_url;

            return (
              <motion.div key={category.id} variants={itemVariants}>
                <Link
                  to={`/category/${category.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: (category.color || '#57c5cf') + '20' }}
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || '#57c5cf' }} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 group-hover:text-[#57c5cf] transition-colors">
                      {name}
                    </h4>
                    {category.description && !isMobile && (
                       <p className="text-xs text-gray-400 line-clamp-1">{category.description}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
          
          <motion.div variants={itemVariants} className="col-span-2 mt-2 pt-2 border-t border-gray-100">
             <Link 
               to="/category/all" 
               onClick={onClose}
               className="block text-center text-sm font-bold text-[#f292bc] hover:text-[#d67da3] py-2"
             >
               ყველა კატეგორიის ნახვა
             </Link>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CategoryDropdown;