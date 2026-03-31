import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import CategoryDropdown2Col from '@/components/CategoryDropdown2Col';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const { getCartCount } = useCart();
  const { language, changeLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const langMenuRef = useRef(null);
  const categoryWrapperRef = useRef(null);
  const categoryTimeoutRef = useRef(null);
  
  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_hidden', false)
        .order('sort_order');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isSearchOpen) setIsSearchOpen(false);
    setIsLangOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isMenuOpen) setIsMenuOpen(false);
    setIsLangOpen(false);
  };

  const toggleLang = () => {
    setIsLangOpen(!isLangOpen);
    setIsSearchOpen(false);
  };

  // Hover handlers for Desktop
  const handleCategoryEnter = () => {
    if (window.innerWidth >= 1024) { // Only on desktop
      if (categoryTimeoutRef.current) {
        clearTimeout(categoryTimeoutRef.current);
        categoryTimeoutRef.current = null;
      }
      setIsCategoryOpen(true);
    }
  };

  const handleCategoryLeave = () => {
    if (window.innerWidth >= 1024) {
      categoryTimeoutRef.current = setTimeout(() => {
        setIsCategoryOpen(false);
      }, 400); // Delay to allow mouse to reach dropdown
    }
  };

  // Click handler for Mobile
  const handleCategoryClick = (e) => {
    if (window.innerWidth < 1024) {
      e.preventDefault();
      setIsCategoryOpen(!isCategoryOpen);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
      // For mobile category closing logic if needed
      if (window.innerWidth < 1024 && isCategoryOpen && categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target)) {
         // Optional: close on outside click for mobile if it wasn't full screen
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);

  // Close menus when route changes
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    setIsLangOpen(false);
    setIsCategoryOpen(false);
    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current);
    }
  }, [navigate]);

  const languages = [
    { code: 'ka', label: 'KA', name: 'ქართული', flag: '🇬🇪' },
    { code: 'en', label: 'EN', name: 'English', flag: '🇺🇸' },
    { code: 'ru', label: 'RU', name: 'Русский', flag: '🇷🇺' }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 bg-white z-50 border-b-2 shadow-sm transition-all duration-300" style={{ borderColor: '#57c5cf' }}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
             <img 
               src="https://i.postimg.cc/SRgBpzBB/handicraft-(1).png" 
               alt="Handicraft Logo" 
               className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
             />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 flex-1 justify-center relative">
            <Link to="/" className="text-gray-700 hover:text-[#57c5cf] transition-colors font-heading text-lg">{t('nav_home')}</Link>
            
            {/* Category Dropdown Area */}
            <div 
              ref={categoryWrapperRef}
              className="relative py-2" // Added padding Y to increase hover area slightly
              onMouseEnter={handleCategoryEnter}
              onMouseLeave={handleCategoryLeave}
            >
              <Link 
                to="/category/all"
                onClick={handleCategoryClick}
                className={`flex items-center gap-1 transition-colors font-heading text-lg ${isCategoryOpen ? 'text-[#57c5cf]' : 'text-gray-700 hover:text-[#57c5cf]'}`}
              >
                {t('nav_categories')}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </Link>
              
              {/* Dropdown Component */}
              <div className="absolute top-full left-0 pt-2"> {/* Spacer for safe hover transition */}
                 <CategoryDropdown2Col 
                    isOpen={isCategoryOpen} 
                    onClose={() => setIsCategoryOpen(false)} 
                    categories={categories}
                    isMobile={false}
                  />
              </div>
            </div>

            <Link to="/about" className="text-gray-700 hover:text-[#57c5cf] transition-colors font-heading text-lg">{t('nav_about')}</Link>
            <Link to="/contact" className="text-gray-700 hover:text-[#57c5cf] transition-colors font-heading text-lg">{t('nav_contact')}</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSearch}
              className={`hover:bg-[#57c5cf]/10 rounded-full transition-colors ${isSearchOpen ? 'bg-[#57c5cf]/10 text-[#57c5cf]' : ''}`}
            >
              {isSearchOpen ? (
                <X className="w-5 h-5" style={{ color: '#57c5cf' }} />
              ) : (
                <Search className="w-5 h-5" style={{ color: '#57c5cf' }} />
              )}
            </Button>

            <Link to="/cart">
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-[#f292bc]/10 rounded-full relative"
              >
                <ShoppingCart className="w-5 h-5" style={{ color: '#f292bc' }} />
                <AnimatePresence>
                  {getCartCount() > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-[#57c5cf] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                    >
                      {getCartCount()}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </Link>

            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <Button
                variant="ghost"
                onClick={toggleLang}
                className="hover:bg-gray-100 rounded-lg font-heading flex items-center gap-2 px-3 py-2 border border-gray-200"
              >
                <span className="text-lg leading-none">{currentLang.flag}</span>
                <span className="hidden md:inline text-sm font-bold text-gray-700">{currentLang.name}</span>
                <span className="md:hidden text-sm font-bold text-gray-700">{currentLang.code.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1 min-w-[180px] z-50 overflow-hidden"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-heading ${
                          language === lang.code 
                            ? 'bg-[#57c5cf]/10 text-[#57c5cf]' 
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="text-xl leading-none">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {language === lang.code && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#57c5cf]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMenu}
              className="lg:hidden hover:bg-[#57c5cf]/10 rounded-full"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" style={{ color: '#57c5cf' }} />
              ) : (
                 <Menu className="w-6 h-6" style={{ color: '#57c5cf' }} />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-t border-gray-100 overflow-hidden shadow-inner absolute left-0 right-0 w-full z-40"
          >
            <div className="container mx-auto px-4 py-4">
               <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto flex items-center gap-2">
                 <div className="relative flex-grow">
                   <input 
                     type="text" 
                     placeholder={t('search_placeholder')}
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-12 py-3 rounded-full border-2 border-gray-200 focus:border-[#57c5cf] focus:outline-none font-body text-lg shadow-sm transition-all"
                     autoFocus
                   />
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                   
                   {searchQuery && (
                     <button 
                       type="button"
                       onClick={() => setSearchQuery('')}
                       className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   )}
                 </div>
                 
                 <Button 
                   type="submit" 
                   className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white rounded-full px-6 py-6 font-heading"
                 >
                   {t('search_button')}
                 </Button>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden absolute left-0 right-0 w-full z-40 shadow-lg"
          >
            <nav className="flex flex-col p-4 space-y-2">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-[#57c5cf] font-heading font-bold text-lg p-3 hover:bg-gray-50 rounded-lg">{t('nav_home')}</Link>
              
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCategoryOpen(true);
                }} 
                className="text-left text-gray-700 hover:text-[#57c5cf] font-heading font-bold text-lg p-3 hover:bg-gray-50 rounded-lg flex justify-between items-center"
              >
                {t('nav_categories')}
                <ChevronDown className="w-5 h-5" />
              </button>

              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-[#57c5cf] font-heading font-bold text-lg p-3 hover:bg-gray-50 rounded-lg">{t('nav_about')}</Link>
              <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-gray-700 hover:text-[#57c5cf] font-heading font-bold text-lg p-3 hover:bg-gray-50 rounded-lg">{t('nav_contact')}</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render Mobile Full Screen Category Menu */}
      {/* Note: Desktop renders it inside the nav for relative positioning */}
      <CategoryDropdown2Col 
        isOpen={isCategoryOpen && window.innerWidth < 1024} 
        onClose={() => setIsCategoryOpen(false)} 
        categories={categories}
        isMobile={true}
      />
    </header>
  );
};

export default Header;