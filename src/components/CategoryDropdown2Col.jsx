import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const CategoryDropdown2Col = ({ isOpen, onClose, categories, isMobile }) => {
  const { translations, language } = useLanguage();
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    timeoutRef.current = setTimeout(() => {
      onClose();
    }, 900); // Increased timeout to 900ms
  };

  if (!isOpen) return null;

  // Animation variants
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: isMobile ? 10 : 5,
      scale: 0.98,
      clipPath: isMobile ? "inset(0 0 100% 0)" : "inset(0 0 0 0)"
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      clipPath: "inset(0 0 0 0)",
      transition: { 
        duration: 0.2,
        ease: "easeOut",
        staggerChildren: 0.03
      }
    },
    exit: { 
      opacity: 0, 
      y: 5, 
      scale: 0.98,
      transition: { duration: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <AnimatePresence>
      <div 
        className={`
          ${isMobile 
            ? 'fixed inset-0 z-50 bg-white flex flex-col' 
            : 'absolute top-full left-0 mt-0 w-[420px] z-50 pt-6 -ml-2 pl-2 pb-4' // Added significant padding for buffer zone
          }
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-[#57c5cf]/5">
            <h2 className="font-heading font-bold text-lg text-gray-800">
                {language === 'en' ? 'Categories' : language === 'ru' ? 'Категории' : 'კატეგორიები'}
            </h2>
            <button 
              onClick={onClose}
              className="p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <X className="w-5 h-5 text-[#f292bc]" />
            </button>
          </div>
        )}

        {/* Dropdown Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`
            bg-white overflow-hidden flex flex-col max-h-[85vh]
            ${isMobile 
              ? 'flex-1 p-3 overflow-y-auto' 
              : 'rounded-xl shadow-xl border border-gray-100 p-3 max-h-96 overflow-y-auto'
            }
          `}
        >
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-2'}`}>
            {categories.map((category) => {
              const translationKey = `cat_${category.slug}`;
              let name = category.name || category.slug;
              if (language === 'en') name = translations?.[translationKey]?.en || name;
              if (language === 'ru') name = translations?.[translationKey]?.ru || name;
              if (language === 'ka') name = translations?.[translationKey]?.ka || name;

              const iconUrl = category.icon_url === "https://i.postimg.cc/V6QnBCQj/10-ortopediuli-balishi.png"
                ? "https://i.postimg.cc/RVfHjqNm/vector-design-soap-icon-style.png"
                : category.icon_url;

              return (
                <motion.div key={category.id} variants={itemVariants}>
                  <Link
                    to={`/category/${category.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 hover:bg-[#57c5cf]/5 hover:shadow-sm border border-transparent hover:border-[#57c5cf]/10"
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                      style={{ backgroundColor: (category.color || '#57c5cf') + '15' }}
                    >
                      {iconUrl ? (
                        <img src={iconUrl} alt="" className="w-4 h-4 object-contain" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color || '#57c5cf' }} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-xs text-gray-700 group-hover:text-[#57c5cf] transition-colors truncate">
                        {name}
                      </h3>
                    </div>

                    <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-[#57c5cf]" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-100 sticky bottom-0 bg-white">
            <Link 
              to="/category/all" 
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-gray-50 text-gray-600 font-bold text-xs hover:bg-[#f292bc] hover:text-white transition-all duration-200 group"
            >
              <span>{language === 'en' ? 'All Categories' : language === 'ru' ? 'Все категории' : 'ყველა კატეგორია'}</span>
              <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CategoryDropdown2Col;