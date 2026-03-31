import React from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

const FeaturedCategories = () => {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      title: "🚧 ეს ფუნქცია ჯერ არ არის დანერგილი"
    });
  };

  const categories = [
    {
      name: 'რბილი სათამაშოები',
      color: '#f292bc',
      description: 'ხელნაკეთი მეგობრები'
    },
    {
      name: 'განმავითარებელი',
      color: '#57c5cf',
      description: 'სწავლა თამაშის დროს'
    },
    {
      name: 'დეკორაციები',
      color: '#f292bc',
      description: 'გაალამაზეთ ოთახი'
    }
  ];

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <svg width="80" height="20" viewBox="0 0 80 20" className="mx-auto mb-4">
            <path d="M5 10 Q20 5, 40 10 Q60 15, 75 10" fill="none" stroke="#57c5cf" strokeWidth="2" />
          </svg>
          <h2 className="text-4xl font-heading font-bold mb-3" style={{ color: '#57c5cf' }}>პოპულარული კოლექციები</h2>
          <p className="text-gray-600 font-body">რჩეული ნივთები თქვენი პატარებისთვის</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={handleClick}
              className="cursor-pointer group"
            >
              <div className="relative">
                {/* Hand-drawn bubble outline */}
                <div className="absolute inset-0 rounded-[40%_60%_70%_30%/60%_30%_70%_40%] opacity-20 group-hover:opacity-30 transition-opacity" 
                     style={{ backgroundColor: category.color }}></div>
                
                <div className="relative p-8 text-center transform group-hover:scale-105 transition-transform">
                  <div className="mb-4 flex justify-center">
                    <div className="w-24 h-24 rounded-[45%_55%_60%_40%/55%_45%_55%_45%] flex items-center justify-center shadow-lg" 
                         style={{ backgroundColor: category.color }}>
                      <svg width="48" height="48" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="white" opacity="0.9" />
                        <path d="M24 12 L28 20 L36 22 L30 28 L32 36 L24 32 L16 36 L18 28 L12 22 L20 20 Z" fill={category.color} />
                      </svg>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-heading font-bold mb-2" style={{ color: category.color }}>{category.name}</h3>
                  <p className="text-gray-600 font-body">{category.description}</p>
                  
                  {/* Hand-drawn arrow */}
                  <div className="mt-4">
                    <svg width="40" height="10" viewBox="0 0 40 10" className="mx-auto">
                      <path d="M2 5 L35 5 M30 2 L38 5 L30 8" stroke={category.color} strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;