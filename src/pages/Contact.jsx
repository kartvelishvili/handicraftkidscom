import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [dotsCount, setDotsCount] = useState(4);

  useEffect(() => {
    const fetchData = async () => {
       const { data } = await supabase.from('pages_content').select('*').eq('slug', 'contact').maybeSingle();
       if (data) setData(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchDots = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-dots');
        if (error) throw error;
        if (data?.total_dots) {
          setDotsCount(data.total_dots);
        }
      } catch (error) {
        console.error('Error fetching dots:', error);
      }
    };
    fetchDots();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "შეტყობინება გაგზავნილია! 💌",
      description: "ჩვენ მალე დაგიკავშირდებით.",
      className: "bg-[#57c5cf] text-white border-none"
    });
  };

  const title = data?.[`title_${language}`] || 'კონტაქტი';
  
  const contactInfo = data?.contact_info || {
    address: { ka: 'ჭავჭავაძის გამზირი 12, თბილისი', en: '12 Chavchavadze Ave, Tbilisi', ru: 'Проспект Чавчавадзе 12, Тбилиси' },
    working_hours: { ka: 'ორშ - პარ: 10:00 - 20:00', en: 'Mon - Fri: 10:00 - 20:00', ru: 'Пн - Пт: 10:00 - 20:00' },
    phone: '+995 555 12 34 56',
    email: 'hello@handicraft.ge'
  };
  
  const mapUrl = data?.map_url || "https://images.unsplash.com/photo-1683698858979-8b9803b5364a";

  const labels = {
    address: { ka: 'მისამართი', en: 'Address', ru: 'Адрес' },
    phone: { ka: 'ტელეფონი', en: 'Phone', ru: 'Телефон' },
    email: { ka: 'ელ-ფოსტა', en: 'Email', ru: 'Эл. почта' },
    hours: { ka: 'სამუშაო საათები', en: 'Working Hours', ru: 'Рабочие часы' },
    formTitle: { ka: 'მოგვწერეთ', en: 'Write to us', ru: 'Напишите нам' },
    contactTitle: { ka: 'საკონტაქტო ინფორმაცია', en: 'Contact Information', ru: 'Контактная информация' },
    name: { ka: 'სახელი', en: 'Name', ru: 'Имя' },
    send: { ka: 'გაგზავნა', en: 'Send', ru: 'Отправить' },
    message: { ka: 'შეტყობინება', en: 'Message', ru: 'Сообщение' }
  };

  return (
    <>
      <Helmet>
        <title>{title} - Handicraft</title>
      </Helmet>

      <section className="py-20 px-4 bg-white relative">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-heading font-bold mb-4" style={{ color: '#57c5cf' }}>{title}</h1>
          </div>

          <div className="grid md:grid-cols-2 gap-12 bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
            {/* Contact Form */}
            <div className="p-8 md:p-12">
               <h3 className="text-2xl font-heading font-bold mb-6" style={{ color: '#f292bc' }}>{labels.formTitle[language] || labels.formTitle.ka}</h3>
               <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2 font-heading">{labels.name[language] || labels.name.ka}</label>
                   <input 
                     required
                     type="text" 
                     className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#57c5cf] focus:outline-none transition-colors font-body bg-gray-50"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2 font-heading">{labels.email[language] || labels.email.ka}</label>
                   <input 
                     required
                     type="email" 
                     className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#57c5cf] focus:outline-none transition-colors font-body bg-gray-50"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2 font-heading">{labels.message[language] || labels.message.ka}</label>
                   <textarea 
                     required
                     rows="4"
                     className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#57c5cf] focus:outline-none transition-colors font-body bg-gray-50"
                   ></textarea>
                 </div>
                 <Button 
                   type="submit"
                   className="w-full py-6 text-lg font-heading rounded-xl hover:shadow-lg transition-all"
                   style={{ backgroundColor: '#57c5cf' }}
                 >
                   {labels.send[language] || labels.send.ka}
                 </Button>
               </form>
            </div>

            {/* Info & Map */}
            <div className="bg-[#57c5cf]/5 p-8 md:p-12 flex flex-col justify-between">
               <div className="space-y-8">
                 <h3 className="text-2xl font-heading font-bold mb-6" style={{ color: '#57c5cf' }}>{labels.contactTitle[language] || labels.contactTitle.ka}</h3>
                 
                 <div className="space-y-6">
                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <MapPin className="w-5 h-5 text-[#f292bc]" />
                     </div>
                     <div>
                       <h4 className="font-bold font-heading text-gray-800">{labels.address[language] || labels.address.ka}</h4>
                       <p className="text-gray-600 font-body">{contactInfo.address[language] || contactInfo.address.ka}</p>
                     </div>
                   </div>

                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <Phone className="w-5 h-5 text-[#f292bc]" />
                     </div>
                     <div>
                       <h4 className="font-bold font-heading text-gray-800">{labels.phone[language] || labels.phone.ka}</h4>
                       <p className="text-gray-600 font-body">{contactInfo.phone}</p>
                     </div>
                   </div>

                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <Mail className="w-5 h-5 text-[#f292bc]" />
                     </div>
                     <div>
                       <h4 className="font-bold font-heading text-gray-800">{labels.email[language] || labels.email.ka}</h4>
                       <p className="text-gray-600 font-body">{contactInfo.email}</p>
                     </div>
                   </div>

                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                       <Clock className="w-5 h-5 text-[#f292bc]" />
                     </div>
                     <div>
                       <h4 className="font-bold font-heading text-gray-800">{labels.hours[language] || labels.hours.ka}</h4>
                       <p className="text-gray-600 font-body">{contactInfo.working_hours[language] || contactInfo.working_hours.ka}</p>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-8 rounded-2xl overflow-hidden h-48 border-2 border-white shadow-lg">
                 <img alt="Map Location" className="w-full h-full object-cover" src={mapUrl} />
               </div>
            </div>
          </div>

          {/* Minimal Dots Button */}
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={() => navigate('/dot')}
              className="px-2 py-1 rounded-full text-xs font-mono transition-all hover:shadow-md"
              style={{ 
                backgroundColor: '#57c5cf', 
                color: 'white',
                maxHeight: '5px',
                minHeight: '20px',
                fontSize: '10px',
                opacity: 0.7
              }}
              aria-label="View dots timeline"
            >
              {'.'.repeat(dotsCount)}
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;