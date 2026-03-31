import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Link } from 'react-router-dom';

const Hero = () => {
  const { language } = useLanguage();
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (data) {
        const parse = (val) => {
           if (typeof val === 'string') {
              try { return JSON.parse(val); } catch(e) { return { ka: val, en: val, ru: val }; }
           }
           return val || { ka: '', en: '', ru: '' };
        };

        const parsedData = data.map(s => ({
          ...s,
          title_line1: parse(s.title_line1),
          title_line2: parse(s.title_line2),
          description: parse(s.description),
          button_text: parse(s.button_text),
          title_line1_size: s.title_line1_size || 60,
          title_line2_size: s.title_line2_size || 48,
          description_size: s.description_size || 18,
        }));
        setSlides(parsedData);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
    const subscription = supabase
      .channel('public:hero_slides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_slides' }, () => fetchSlides())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index) => setCurrentSlide(index);

  if (loading || slides.length === 0) return (
    <div className="h-[600px] flex items-center justify-center bg-slate-50">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57c5cf]"></div>
    </div>
  );

  const slide = slides[currentSlide];
  const getTxt = (obj) => obj?.[language] || obj?.['ka'] || '';

  return (
    <section className="relative py-20 px-4 overflow-hidden min-h-[700px] flex items-center bg-slate-50">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#57c5cf]/5 rounded-l-[100px] -z-10 transform translate-x-20"></div>

      <div className="container mx-auto max-w-7xl relative z-10">
        <AnimatePresence mode="wait">
          <div key={slide.id} className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 relative"
            >
              {/* Decorative Icon - Floating Top Right of Text Area */}
              {slide.decorative_icon_url && (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 10 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="absolute -top-20 right-10 w-24 h-24 hidden md:block z-20 pointer-events-none opacity-90"
                >
                   <img src={slide.decorative_icon_url} alt="" className="w-full h-full object-contain drop-shadow-md" />
                </motion.div>
              )}

              <div className="inline-block pl-2">
                <svg width="100" height="20" viewBox="0 0 100 20">
                  <path d="M0 10 Q25 0, 50 10 T100 10" fill="none" stroke="#f292bc" strokeWidth="2" strokeDasharray="4,4" />
                </svg>
              </div>
              
              <div className="space-y-1">
                 <h1 
                   className="font-heading font-bold leading-tight"
                   style={{ 
                      color: slide.title_line1_color || '#000000',
                      fontSize: `${slide.title_line1_size}px`
                   }}
                 >
                   {getTxt(slide.title_line1)}
                 </h1>
                 <h2 
                   className="font-heading font-bold leading-tight"
                   style={{ 
                      color: slide.title_line2_color || '#000000',
                      fontSize: `${slide.title_line2_size}px`
                   }}
                 >
                   {getTxt(slide.title_line2)}
                 </h2>
              </div>
              
              <p 
                className="font-body leading-relaxed max-w-lg"
                style={{ 
                   color: slide.description_color || '#666666',
                   fontSize: `${slide.description_size}px`
                }}
              >
                {getTxt(slide.description)}
              </p>
              
              {/* Button moved back to bottom of text */}
              <div className="pt-8">
                <Link to={slide.button_link || "/category/all"}>
                  <Button
                    className="px-10 py-7 text-xl font-heading rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    style={{ backgroundColor: '#57c5cf', color: 'white' }}
                  >
                    {getTxt(slide.button_text) || 'View Collection'}
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="relative hidden md:block"
            >
              <div className="relative rounded-[60px] overflow-hidden shadow-2xl transform rotate-2 group h-[550px] w-full bg-white border-4 border-white">
                <div className="absolute inset-0 border-4 rounded-[60px] pointer-events-none z-20" style={{ borderColor: '#f292bc' }}></div>
                <img 
                  alt="Hero banner" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  src={slide.image_url || "https://images.unsplash.com/photo-1526330099455-4bcd13f24c75"} 
                />
              </div>
              
              {/* Floating Element behind */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#57c5cf]/20 rounded-full blur-2xl -z-10"></div>
            </motion.div>
          </div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {slides.length > 1 && (
           <div className="absolute bottom-[-30px] left-0 right-0 flex justify-center gap-3">
             {slides.map((_, index) => (
               <button
                 key={index}
                 onClick={() => goToSlide(index)}
                 className={`h-3 rounded-full transition-all duration-300 ${
                   currentSlide === index 
                     ? 'bg-[#57c5cf] w-10' 
                     : 'bg-gray-300 w-3 hover:bg-[#f292bc]'
                 }`}
                 aria-label={`Go to slide ${index + 1}`}
               />
             ))}
           </div>
        )}
      </div>
    </section>
  );
};

export default Hero;