import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Save, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';

const AdminAboutUs = ({ pageData, onSave, isSaving }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title_ka: '', title_en: '', title_ru: '',
    content_ka: '', content_en: '', content_ru: '',
    hero_image_url: '',
    staff_data: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (pageData) {
      console.log("AdminAboutUs received pageData:", pageData);
      setFormData({
        title_ka: pageData.title_ka || '',
        title_en: pageData.title_en || '',
        title_ru: pageData.title_ru || '',
        content_ka: pageData.content_ka || '',
        content_en: pageData.content_en || '',
        content_ru: pageData.content_ru || '',
        hero_image_url: pageData.hero_image_url || '',
        staff_data: pageData.staff_data || []
      });
    }
  }, [pageData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addStaff = () => {
    setFormData(prev => ({
      ...prev,
      staff_data: [...prev.staff_data, {
        name: { ka: '', en: '', ru: '' },
        role: { ka: '', en: '', ru: '' },
        image: ''
      }]
    }));
  };

  const removeStaff = (index) => {
    const newStaff = [...formData.staff_data];
    newStaff.splice(index, 1);
    setFormData(prev => ({ ...prev, staff_data: newStaff }));
  };

  const updateStaff = (index, field, subField, value) => {
    const newStaff = [...formData.staff_data];
    if (subField) {
      newStaff[index][field][subField] = value;
    } else {
      newStaff[index][field] = value;
    }
    setFormData(prev => ({ ...prev, staff_data: newStaff }));
  };

  const handleImageUpload = async (file, type, index = null) => {
    if (!file) return;
    
    setUploading(true);
    try {
      console.log(`Starting upload for ${type}...`);
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products_images') // Using products_images bucket as it exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products_images').getPublicUrl(filePath);
      console.log("Upload successful, URL:", data.publicUrl);
      
      if (type === 'hero') {
        handleChange('hero_image_url', data.publicUrl);
      } else if (type === 'staff' && index !== null) {
        updateStaff(index, 'image', null, data.publicUrl);
      }
      
      toast({ title: "სურათი აიტვირთა წარმატებით", className: "bg-[#57c5cf] text-white" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
          title: "შეცდომა ატვირთვისას", 
          description: error.message, 
          variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-300">
      {/* Main Content */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-gray-800 border-b border-gray-100 pb-2">მთავარი კონტენტი</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">მთავარი სურათი (Hero Image)</label>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <input 
                  type="file" 
                  id="hero-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files[0], 'hero')}
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-xl border-dashed border-2 hover:border-[#57c5cf] hover:text-[#57c5cf]" 
                  onClick={() => document.getElementById('hero-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                </Button>
              </div>
              <input 
                className="flex-1 p-3 border rounded-xl text-sm font-mono bg-gray-50 focus:bg-white focus:border-[#57c5cf] outline-none transition-colors"
                value={formData.hero_image_url}
                onChange={e => handleChange('hero_image_url', e.target.value)}
                placeholder="https://..."
              />
              {formData.hero_image_url && (
                  <div className="h-12 w-12 rounded-lg border overflow-hidden bg-gray-100">
                    <img src={formData.hero_image_url} alt="Hero" className="w-full h-full object-cover" />
                  </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Georgian</span>
              <input 
                className="w-full p-3 border rounded-xl text-sm font-bold focus:border-[#57c5cf] outline-none"
                placeholder="სათაური (KA)"
                value={formData.title_ka}
                onChange={e => handleChange('title_ka', e.target.value)}
              />
              <textarea 
                className="w-full p-3 border rounded-xl h-40 text-sm focus:border-[#57c5cf] outline-none resize-none"
                placeholder="აღწერა (KA)"
                value={formData.content_ka}
                onChange={e => handleChange('content_ka', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">English</span>
              <input 
                className="w-full p-3 border rounded-xl text-sm font-bold focus:border-[#57c5cf] outline-none"
                placeholder="Title (EN)"
                value={formData.title_en}
                onChange={e => handleChange('title_en', e.target.value)}
              />
              <textarea 
                className="w-full p-3 border rounded-xl h-40 text-sm focus:border-[#57c5cf] outline-none resize-none"
                placeholder="Description (EN)"
                value={formData.content_en}
                onChange={e => handleChange('content_en', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Russian</span>
              <input 
                className="w-full p-3 border rounded-xl text-sm font-bold focus:border-[#57c5cf] outline-none"
                placeholder="Title (RU)"
                value={formData.title_ru}
                onChange={e => handleChange('title_ru', e.target.value)}
              />
              <textarea 
                className="w-full p-3 border rounded-xl h-40 text-sm focus:border-[#57c5cf] outline-none resize-none"
                placeholder="Description (RU)"
                value={formData.content_ru}
                onChange={e => handleChange('content_ru', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Members */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 className="font-bold text-lg text-gray-800">გუნდის წევრები</h3>
          <Button size="sm" onClick={addStaff} className="gap-2 bg-[#57c5cf] hover:bg-[#4bc0cb] text-white shadow-md shadow-[#57c5cf]/20">
            <Plus className="w-4 h-4"/> დამატება
          </Button>
        </div>

        <div className="grid gap-6">
          {formData.staff_data.map((member, index) => (
            <div key={index} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200/60 relative group hover:border-[#57c5cf]/30 transition-colors">
              <div className="absolute right-4 top-4">
                 <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeStaff(index)}>
                    <Trash2 className="w-4 h-4" />
                 </Button>
              </div>
              
              <div className="grid md:grid-cols-12 gap-6">
                 <div className="md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 block mb-2">ფოტო</label>
                    <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3 relative border-2 border-dashed border-gray-200 hover:border-[#57c5cf] group/image transition-colors">
                       {member.image ? (
                          <img src={member.image} className="w-full h-full object-cover" alt="" />
                       ) : (
                          <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon className="w-8 h-8"/></div>
                       )}
                       
                       {/* Upload Overlay */}
                       <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer">
                          {uploading ? <Loader2 className="text-white w-6 h-6 animate-spin"/> : <Upload className="text-white w-8 h-8 drop-shadow-md" />}
                          <input 
                             type="file" 
                             className="hidden" 
                             accept="image/*"
                             disabled={uploading}
                             onChange={(e) => handleImageUpload(e.target.files[0], 'staff', index)}
                          />
                       </label>
                    </div>
                    <input 
                       className="w-full p-2 text-xs border rounded-lg bg-white text-gray-500 font-mono"
                       value={member.image}
                       onChange={e => updateStaff(index, 'image', null, e.target.value)}
                       placeholder="https://..."
                    />
                 </div>
                 
                 <div className="md:col-span-9 grid gap-6 content-start">
                    <div className="grid md:grid-cols-3 gap-4">
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">სახელი (KA)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.name.ka} onChange={e => updateStaff(index, 'name', 'ka', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Name (EN)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.name.en} onChange={e => updateStaff(index, 'name', 'en', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Name (RU)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.name.ru} onChange={e => updateStaff(index, 'name', 'ru', e.target.value)} />
                       </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">პოზიცია (KA)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.role.ka} onChange={e => updateStaff(index, 'role', 'ka', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Role (EN)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.role.en} onChange={e => updateStaff(index, 'role', 'en', e.target.value)} />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Role (RU)</label>
                          <input className="w-full p-2 border rounded-lg text-sm focus:border-[#57c5cf] outline-none" value={member.role.ru} onChange={e => updateStaff(index, 'role', 'ru', e.target.value)} />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-lg">
        <Button onClick={() => {
           console.log("Saving About Us Data:", formData);
           onSave(formData);
        }} disabled={isSaving || uploading} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 px-8 shadow-lg shadow-[#57c5cf]/20">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 
          {isSaving ? 'ინახება...' : 'ცვლილებების შენახვა'}
        </Button>
      </div>
    </div>
  );
};

export default AdminAboutUs;