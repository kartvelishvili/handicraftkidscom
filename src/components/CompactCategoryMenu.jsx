import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const CompactCategoryMenu = ({ isOpen, onClose, categories, isMobile }) => {
  const { translations } = useLanguage();
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside); // For mobile
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Lock body scroll on mobile when menu is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  if (!isOpen) return null;

  const menuVariants = {
    hidden: { opacity: 0, scale: 0.95, y: isMobile ? 20 : 10 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 0.2, 
        ease: "easeOut" 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: isMobile ? 20 : 10,
      transition: { duration: 0.15 }
    }
  };

  return (
    <AnimatePresence>
      {/* Overlay for mobile or desktop to catch outside clicks visually if needed */}
      {isMobile && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.div
        ref={menuRef}
        variants={menuVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`
          bg-white shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col
          ${isMobile 
            ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl max-h-[80vh]' 
            : 'absolute top-full left-0 mt-2 w-[320px] rounded-2xl'
          }
        `}
      >
        {/* Header (Mobile Only) */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
            <h3 className="font-heading font-bold text-gray-800 text-lg">კატეგორიები</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Categories List */}
        <div className="overflow-y-auto py-2 max-h-[60vh] lg:max-h-[500px] scrollbar-hide">
          <Link
            to="/category/all"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl hover:bg-gray-50 transition-colors group"
          >
             <div className="w-8 h-8 rounded-full bg-[#57c5cf]/10 flex items-center justify-center text-[#57c5cf]">
               <div className="w-2 h-2 rounded-full bg-current" />
             </div>
             <span className="font-heading font-bold text-gray-700 group-hover:text-[#57c5cf] transition-colors">
               ყველა პროდუქტი
             </span>
             <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-[#57c5cf]" />
          </Link>

          <div className="h-px bg-gray-100 mx-4 my-1" />

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
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-transparent group-hover:border-gray-200 transition-all bg-white shadow-sm"
                  style={{ backgroundColor: (category.color || '#f292bc') + '15' }}
                >
                  {iconUrl ? (
                    <img src={iconUrl} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color || '#57c5cf' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-sm text-gray-700 group-hover:text-[#57c5cf] transition-colors truncate">
                    {name}
                  </h4>
                </div>
                {/* Optional: Add admin ID if needed for debugging or specific sorting visibility, otherwise hidden */}
                {/* <span className="text-[10px] text-gray-300 mr-2">#{category.admin_id}</span> */}
              </Link>
             );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompactCategoryMenu;