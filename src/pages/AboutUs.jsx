import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import { Heart, Award, Users, TrendingUp, Sparkles, Star, CheckCircle, Leaf, Package } from 'lucide-react';

const AboutUs = () => {
  const { language } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
       console.log("Fetching About Us data...");
       const { data } = await supabase.from('pages_content').select('*').eq('slug', 'about').maybeSingle();
       if (data) {
          console.log("About Us data fetched:", data);
          setData(data);
       } else {
          console.log("No About Us data found.");
       }
    };
    fetchData();
  }, []);

  const title = data?.[`title_${language}`] || data?.title_ka || 'ჩვენი ისტორია';
  const content = data?.[`content_${language}`] || data?.content_ka || '';
  const heroImage = data?.hero_image_url || "https://images.unsplash.com/photo-1596464057916-760356627d75";
  
  // Default staff data if not present
  const staff = data?.staff_data || [
    { name: { ka: 'სახელი გვარი', en: 'Name Surname', ru: 'Имя Фамилия' }, role: { ka: 'დამფუძნებელი', en: 'Founder', ru: 'Основатель' }, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
    { name: { ka: 'სახელი გვარი', en: 'Name Surname', ru: 'Имя Фамилия' }, role: { ka: 'დიზაინერი', en: 'Designer', ru: 'Дизайнер' }, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d' },
    { name: { ka: 'სახელი გვარი', en: 'Name Surname', ru: 'Имя Фамилия' }, role: { ka: 'მენეჯერი', en: 'Manager', ru: 'Менეджер' }, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' }
  ];

  // Statistics data
  const stats = [
    { 
      icon: Heart, 
      value: '10,000+', 
      label: { ka: 'კმაყოფილი ოჯახი', en: 'Happy Families', ru: 'Счастливые семьи' },
      color: 'from-pink-500 to-rose-500'
    },
    { 
      icon: Package, 
      value: '5,000+', 
      label: { ka: 'ხელნაკეთი პროდუქტი', en: 'Handmade Products', ru: 'Ручные изделия' },
      color: 'from-cyan-500 to-teal-500'
    },
    { 
      icon: Award, 
      value: '15+', 
      label: { ka: 'წლიანი გამოცდილება', en: 'Years Experience', ru: 'Лет опыта' },
      color: 'from-amber-500 to-orange-500'
    },
    { 
      icon: Star, 
      value: '4.9/5', 
      label: { ka: 'საშუალო რეიტინგი', en: 'Average Rating', ru: 'Средний рейтинг' },
      color: 'from-violet-500 to-purple-500'
    }
  ];

  // Values data
  const values = [
    {
      icon: Leaf,
      title: { ka: 'ეკოლოგიური', en: 'Ecological', ru: 'Экологичный' },
      description: { ka: 'მხოლოდ ბუნებრივი და გარემოსდაცვითი მასალები', en: 'Only natural and eco-friendly materials', ru: 'Только натуральные материалы' },
      color: 'bg-gradient-to-br from-green-400 to-emerald-500'
    },
    {
      icon: Heart,
      title: { ka: 'ხელნაკეთი', en: 'Handmade', ru: 'Ручная работа' },
      description: { ka: 'თითოეული პროდუქტი დამზადებულია სიყვარულით', en: 'Each product is made with love', ru: 'Каждый продукт создан с любовью' },
      color: 'bg-gradient-to-br from-pink-400 to-rose-500'
    },
    {
      icon: Award,
      title: { ka: 'ხარისხი', en: 'Quality', ru: 'Качество' },
      description: { ka: 'უმაღლესი სტანდარტები და ხანგრძლივი გამძლეობა', en: 'Highest standards and long-lasting durability', ru: 'Высшие стандарты качества' },
      color: 'bg-gradient-to-br from-amber-400 to-orange-500'
    },
    {
      icon: Sparkles,
      title: { ka: 'უნიკალურობა', en: 'Uniqueness', ru: 'Уникальность' },
      description: { ka: 'თითოეული ნაწარმოები განსხვავებული და უნიკალურია', en: 'Each piece is different and unique', ru: 'Каждое изделие уникально' },
      color: 'bg-gradient-to-br from-cyan-400 to-blue-500'
    }
  ];

  return (
    <div className="bg-white overflow-hidden">
      <Helmet>
        <title>{title} - Handicraft</title>
      </Helmet>

      {/* Hero Header Section */}
      <div className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
         {/* Animated Background Blobs */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#57c5cf]/10 to-[#f292bc]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
         <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#f292bc]/10 to-[#57c5cf]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
         
         {/* Decorative dots pattern */}
         <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #57c5cf 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

         <div className="container mx-auto px-4 relative z-10 max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Small badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-6">
                <Sparkles className="w-4 h-4 text-[#f292bc]" />
                <span className="text-sm font-semibold text-gray-700">
                  {language === 'ka' ? 'ჩვენს შესახებ' : language === 'en' ? 'About Us' : 'О нас'}
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 bg-gradient-to-r from-[#57c5cf] via-[#f292bc] to-[#57c5cf] bg-clip-text text-transparent leading-tight">
                 {title}
              </h1>
              
              <div className="max-w-3xl mx-auto text-gray-600 font-body text-lg md:text-xl leading-relaxed mb-8">
                 <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>

              {/* Decorative line */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent to-[#f292bc]"></div>
                <Heart className="w-5 h-5 text-[#f292bc] fill-current" />
                <div className="w-16 h-0.5 bg-gradient-to-l from-transparent to-[#f292bc]"></div>
              </div>
            </motion.div>
         </div>
      </div>

      {/* Statistics Section */}
      <div className="py-20 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="text-center group"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-heading font-bold text-gray-800 mb-2">{stat.value}</h3>
                  <p className="text-sm text-gray-500 font-medium">{stat.label[language] || stat.label.ka}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mission Section with Image */}
      <div className="py-24 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4 max-w-7xl">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Image Side */}
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative group"
              >
                 {/* Decorative blob behind */}
                 <div className="absolute inset-0 bg-gradient-to-br from-[#f292bc]/20 via-[#57c5cf]/20 to-[#f292bc]/20 rounded-[60px] blur-2xl transform -rotate-6 scale-105 group-hover:rotate-6 transition-transform duration-700"></div>
                 
                 <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                    <img 
                      src={heroImage} 
                      alt="Our Story" 
                      className="w-full h-full object-cover aspect-[4/3] group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                 </div>

                 {/* Floating badge */}
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: 0.4 }}
                   className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
                 >
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#57c5cf] to-[#4bc0cb] flex items-center justify-center">
                       <CheckCircle className="w-6 h-6 text-white" />
                     </div>
                     <div>
                       <p className="text-2xl font-heading font-bold text-gray-800">100%</p>
                       <p className="text-xs text-gray-500 font-medium">
                         {language === 'ka' ? 'ხელნაკეთი' : language === 'en' ? 'Handmade' : 'Ручная работа'}
                       </p>
                     </div>
                   </div>
                 </motion.div>
              </motion.div>

              {/* Content Side */}
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                 <div>
                   <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#f292bc]/10 to-[#57c5cf]/10 rounded-full mb-4">
                     <span className="text-sm font-bold text-[#f292bc]">
                       {language === 'ka' ? 'ჩვენი მისია' : language === 'en' ? 'Our Mission' : 'Наша миссия'}
                     </span>
                   </div>
                   <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-800 leading-tight">
                      {language === 'ka' 
                        ? 'შევქმნათ უსაფრთხო და ეკოლოგიური სათამაშოები'
                        : language === 'en'
                        ? 'Creating Safe & Eco-Friendly Toys'
                        : 'Создаём безопасные игрушки'}
                   </h2>
                 </div>
                 
                 <p className="text-gray-600 text-lg leading-loose font-body">
                    {language === 'ka' 
                      ? 'ჩვენ გვჯერა, რომ ბავშვობა ჯადოსნური უნდა იყოს. სწორედ ამიტომ, თითოეული ნივთი, რომელსაც ჩვენ ვქმნით, გაჟღენთილია სითბოთი და მზრუნველობით. ჩვენი მიზანია შევქმნათ უსაფრთხო, ეკოლოგიურად სუფთა და ესთეტიურად დახვეწილი სათამაშოები, რომლებიც თაობებს დარჩება.'
                      : language === 'en'
                      ? 'We believe childhood should be magical. That is why every item we create is imbued with warmth and care. Our goal is to create safe, eco-friendly and aesthetically pleasing toys that will last for generations.'
                      : 'Мы верим, что детство должно быть волшебным. Вот почему каждый предмет, который мы создаем, пропитан теплом и заботой. Наша цель — создавать безопасные, экологичные и эстетически приятные игрушки.'}
                 </p>

                 {/* Features list */}
                 <div className="space-y-4">
                   {[
                     { text: { ka: 'ექსკლუზიური ხელნაკეთი დიზაინი', en: 'Exclusive handmade design', ru: 'Эксклюзивный дизайн' } },
                     { text: { ka: 'ბუნებრივი და უსაფრთხო მასალები', en: 'Natural and safe materials', ru: 'Натуральные материалы' } },
                     { text: { ka: 'თაობებისთვის გამძლე ხარისხი', en: 'Quality that lasts generations', ru: 'Качество на поколения' } }
                   ].map((item, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 0, x: -20 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: 0.4 + i * 0.1 }}
                       className="flex items-center gap-3 group"
                     >
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#57c5cf] to-[#4bc0cb] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                         <CheckCircle className="w-5 h-5 text-white" />
                       </div>
                       <span className="text-gray-700 font-medium">{item.text[language] || item.text.ka}</span>
                     </motion.div>
                   ))}
                 </div>
              </motion.div>
           </div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-[#57c5cf]/10 to-[#f292bc]/10 rounded-full mb-4">
              <span className="text-sm font-bold text-[#57c5cf]">
                {language === 'ka' ? 'ჩვენი ღირებულებები' : language === 'en' ? 'Our Values' : 'Наши ценности'}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-800 mb-4">
              {language === 'ka' ? 'რით ვხელმძღვანელობთ' : language === 'en' ? 'What Drives Us' : 'Что нами движет'}
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {language === 'ka' 
                ? 'ჩვენი პრინციპები და ღირებულებები, რომლებზეც დაფუძნებულია ჩვენი მუშაობა'
                : language === 'en'
                ? 'The principles and values that guide our work'
                : 'Принципы и ценности нашей работы'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="group relative"
                >
                  <div className="relative bg-white rounded-3xl p-8 shadow-md hover:shadow-2xl transition-all duration-500 border border-gray-100 h-full flex flex-col hover:-translate-y-2">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl ${value.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-heading font-bold text-gray-800 mb-3">
                      {value.title[language] || value.title.ka}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {value.description[language] || value.description.ka}
                    </p>

                    {/* Hover effect corner ornament */}
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity rounded-tr-2xl"></div>
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-2xl"></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
         {/* Background decoration */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#57c5cf]/5 to-[#f292bc]/5 rounded-full blur-3xl"></div>
         
         <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-block px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100 mb-4">
                <span className="text-sm font-bold text-[#f292bc]">
                  {language === 'ka' ? 'ჩვენი გუნდი' : language === 'en' ? 'Our Team' : 'Наша команда'}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-800 mb-4">
                {language === 'ka' ? 'გაიცანით ჩვენი გუნდი' : language === 'en' ? 'Meet Our Team' : 'Познакомьтесь с командой'}
              </h2>
              <p className="text-gray-600 text-lg">
                {language === 'ka' ? 'ადამიანები, რომლებიც ქმნიან მაგიას' : language === 'en' ? 'People who create magic' : 'Люди, создающие волшебство'}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
               {staff.map((member, index) => (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15, duration: 0.5 }}
                    className="group text-center"
                  >
                     <div className="relative inline-block mb-6">
                        {/* Decorative ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#57c5cf] to-[#f292bc] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                        
                        {/* Image container */}
                        <div className="relative w-56 h-56 mx-auto rounded-3xl overflow-hidden shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-2">
                           <img 
                             src={member.image} 
                             alt={member.name[language] || member.name.ka}
                             className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                           />
                           
                           {/* Gradient overlay on hover */}
                           <div className="absolute inset-0 bg-gradient-to-t from-[#57c5cf]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </div>

                        {/* Status badge */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-100">
                           <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${index % 2 === 0 ? 'bg-[#57c5cf]' : 'bg-[#f292bc]'} animate-pulse`}></div>
                             <span className="text-xs font-bold text-gray-600">{member.role[language] || member.role.ka}</span>
                           </div>
                        </div>
                     </div>
                     
                     <h3 className="font-heading font-bold text-xl text-gray-800 mb-2 group-hover:text-[#57c5cf] transition-colors">
                       {member.name[language] || member.name.ka}
                     </h3>
                     
                     {/* Social/Contact placeholder */}
                     <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <div className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#57c5cf] hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                         <Users className="w-4 h-4" />
                       </div>
                     </div>
                  </motion.div>
               ))}
            </div>
         </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-br from-[#57c5cf] via-[#4bc0cb] to-[#57c5cf] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto px-4 max-w-4xl text-center relative z-10"
        >
          <Sparkles className="w-12 h-12 text-white/80 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
            {language === 'ka' 
              ? 'მზად ხართ გაეცნოთ ჩვენს კოლექციას?'
              : language === 'en'
              ? 'Ready to Explore Our Collection?'
              : 'Готовы изучить коллекцию?'}
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            {language === 'ka'
              ? 'აღმოაჩინეთ უნიკალური ხელნაკეთი პროდუქტები, რომლებიც შექმნილია სიყვარულით'
              : language === 'en'
              ? 'Discover unique handmade products created with love'
              : 'Откройте уникальные изделия ручной работы'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/category/all"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#57c5cf] rounded-full font-heading font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Package className="w-5 h-5" />
              {language === 'ka' ? 'პროდუქტები' : language === 'en' ? 'Shop Now' : 'Продукты'}
            </a>
            <a 
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full font-heading font-bold text-lg hover:bg-white/20 transition-all duration-300"
            >
              {language === 'ka' ? 'კონტაქტი' : language === 'en' ? 'Contact Us' : 'Контакт'}
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutUs;