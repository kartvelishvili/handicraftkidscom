import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Phone, Mail, MapPin, Clock, Loader2 } from 'lucide-react';

const AdminContact = ({ pageData, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    title_ka: '', title_en: '', title_ru: '',
    contact_info: {
       address: { ka: '', en: '', ru: '' },
       working_hours: { ka: '', en: '', ru: '' },
       phone: '',
       email: ''
    },
    map_url: ''
  });

  useEffect(() => {
    if (pageData) {
      console.log("AdminContact received pageData:", pageData);
      setFormData({
        title_ka: pageData.title_ka || '',
        title_en: pageData.title_en || '',
        title_ru: pageData.title_ru || '',
        contact_info: {
           address: pageData.contact_info?.address || { ka: '', en: '', ru: '' },
           working_hours: pageData.contact_info?.working_hours || { ka: '', en: '', ru: '' },
           phone: pageData.contact_info?.phone || '',
           email: pageData.contact_info?.email || ''
        },
        map_url: pageData.map_url || ''
      });
    }
  }, [pageData]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateContactInfo = (field, value, subField = null) => {
    setFormData(prev => {
       const newInfo = { ...prev.contact_info };
       if (subField) {
          newInfo[field] = { ...newInfo[field], [subField]: value };
       } else {
          newInfo[field] = value;
       }
       return { ...prev, contact_info: newInfo };
    });
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-300">
      {/* Page Titles */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
         <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">გვერდის სათაურები</h3>
         <div className="grid md:grid-cols-3 gap-6">
            <div>
               <label className="text-xs font-bold text-gray-500 mb-1 block">Georgian</label>
               <input className="w-full p-3 border rounded-xl focus:border-[#57c5cf] outline-none" value={formData.title_ka} onChange={e => updateField('title_ka', e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 mb-1 block">English</label>
               <input className="w-full p-3 border rounded-xl focus:border-[#57c5cf] outline-none" value={formData.title_en} onChange={e => updateField('title_en', e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold text-gray-500 mb-1 block">Russian</label>
               <input className="w-full p-3 border rounded-xl focus:border-[#57c5cf] outline-none" value={formData.title_ru} onChange={e => updateField('title_ru', e.target.value)} />
            </div>
         </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
         <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">საკონტაქტო ინფორმაცია</h3>
         
         {/* General */}
         <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <label className="flex items-center gap-2 font-bold mb-3 text-sm text-gray-700">
                  <Phone className="w-4 h-4 text-[#57c5cf]"/> ტელეფონის ნომერი
               </label>
               <input className="w-full p-3 border rounded-xl focus:border-[#57c5cf] outline-none bg-white" value={formData.contact_info.phone} onChange={e => updateContactInfo('phone', e.target.value)} placeholder="+995..." />
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <label className="flex items-center gap-2 font-bold mb-3 text-sm text-gray-700">
                  <Mail className="w-4 h-4 text-[#f292bc]"/> ელ-ფოსტის მისამართი
               </label>
               <input className="w-full p-3 border rounded-xl focus:border-[#57c5cf] outline-none bg-white" value={formData.contact_info.email} onChange={e => updateContactInfo('email', e.target.value)} placeholder="info@..." />
            </div>
         </div>

         {/* Address */}
         <div>
            <label className="flex items-center gap-2 font-bold mb-3 text-sm text-gray-700">
               <MapPin className="w-4 h-4 text-[#57c5cf]"/> მისამართი
            </label>
            <div className="grid md:grid-cols-3 gap-4">
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="მისამართი (KA)" value={formData.contact_info.address.ka} onChange={e => updateContactInfo('address', e.target.value, 'ka')} />
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="Address (EN)" value={formData.contact_info.address.en} onChange={e => updateContactInfo('address', e.target.value, 'en')} />
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="Address (RU)" value={formData.contact_info.address.ru} onChange={e => updateContactInfo('address', e.target.value, 'ru')} />
            </div>
         </div>

         {/* Working Hours */}
         <div>
            <label className="flex items-center gap-2 font-bold mb-3 text-sm text-gray-700">
               <Clock className="w-4 h-4 text-[#f292bc]"/> სამუშაო საათები
            </label>
            <div className="grid md:grid-cols-3 gap-4">
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="საათები (KA)" value={formData.contact_info.working_hours.ka} onChange={e => updateContactInfo('working_hours', e.target.value, 'ka')} />
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="Hours (EN)" value={formData.contact_info.working_hours.en} onChange={e => updateContactInfo('working_hours', e.target.value, 'en')} />
               <input className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] outline-none" placeholder="Hours (RU)" value={formData.contact_info.working_hours.ru} onChange={e => updateContactInfo('working_hours', e.target.value, 'ru')} />
            </div>
         </div>
      </div>

      {/* Map */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
         <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">რუკის სურათი</h3>
         <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">რუკის სურათის ბმული (URL)</label>
            <div className="flex gap-4">
               <input 
                  className="flex-1 p-3 border rounded-xl focus:border-[#57c5cf] outline-none text-sm font-mono text-gray-600" 
                  value={formData.map_url} 
                  onChange={e => updateField('map_url', e.target.value)} 
                  placeholder="https://..." 
               />
               {formData.map_url && (
                  <div className="h-12 w-12 rounded-lg border overflow-hidden bg-gray-100">
                     <img src={formData.map_url} className="w-full h-full object-cover" alt="Map" />
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="flex justify-end sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-lg">
        <Button onClick={() => {
           console.log("Saving Contact Data:", formData);
           onSave(formData);
        }} disabled={isSaving} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 px-8 shadow-lg shadow-[#57c5cf]/20">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
          {isSaving ? 'ინახება...' : 'პარამეტრების შენახვა'}
        </Button>
      </div>
    </div>
  );
};

export default AdminContact;