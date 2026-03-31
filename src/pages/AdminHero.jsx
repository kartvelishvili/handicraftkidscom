import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Trash2, Save, Image as ImageIcon, Copy, ExternalLink, Type, Home, LayoutTemplate, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Slider } from '@/components/ui/slider';
import { Link } from 'react-router-dom';

const AdminHero = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: slidesData, error: slidesError } = await supabase
        .from('hero_slides')
        .select('*')
        .order('sort_order');
      
      if (slidesError) throw slidesError;

      const formattedSlides = (slidesData || []).map(s => ({
        ...s,
        title_line1: s.title_line1 || { ka: '', en: '', ru: '' },
        title_line2: s.title_line2 || { ka: '', en: '', ru: '' },
        description: s.description || { ka: '', en: '', ru: '' },
        button_text: s.button_text || { ka: '', en: '', ru: '' },
        title_line1_color: s.title_line1_color || '#000000',
        title_line2_color: s.title_line2_color || '#000000',
        description_color: s.description_color || '#666666',
        title_line1_size: s.title_line1_size || 60,
        title_line2_size: s.title_line2_size || 48,
        description_size: s.description_size || 18,
        decorative_icon_url: s.decorative_icon_url || ''
      }));

      setSlides(formattedSlides);
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to load slides", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSlide = (id, field, value) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const updateNestedSlide = (id, parent, lang, value) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        [parent]: { ...s[parent], [lang]: value }
      };
    }));
  };

  const handleImageUpload = async (slideId, file) => {
    if (!file) return;
    
    try {
      // Check for active session before upload to satisfy RLS policies
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Authentication required. Please log in again.");
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products_images') // Using products_images bucket as it's configured for public access
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products_images').getPublicUrl(filePath);
      updateSlide(slideId, 'image_url', data.publicUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    }
  };

  const saveSlide = async (slide) => {
    try {
      const { error } = await supabase
        .from('hero_slides')
        .update({
          image_url: slide.image_url,
          button_link: slide.button_link,
          title_line1: slide.title_line1,
          title_line2: slide.title_line2,
          description: slide.description,
          button_text: slide.button_text,
          title_line1_color: slide.title_line1_color,
          title_line2_color: slide.title_line2_color,
          description_color: slide.description_color,
          title_line1_size: slide.title_line1_size,
          title_line2_size: slide.title_line2_size,
          description_size: slide.description_size,
          decorative_icon_url: slide.decorative_icon_url
        })
        .eq('id', slide.id);
      
      if (error) throw error;
      toast({ title: "Slide Saved Successfully!", className: "bg-green-500 text-white" });
    } catch (error) {
      console.error("Error saving slide:", error);
      toast({ title: "Error saving changes", variant: "destructive" });
    }
  };

  const addSlide = async () => {
    try {
      const newSlide = {
        image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1',
        sort_order: slides.length + 1,
        is_active: true,
        title_line1: { ka: 'ხაზი 1', en: 'Line 1', ru: 'Линия 1' },
        title_line2: { ka: 'ხაზი 2', en: 'Line 2', ru: 'Линия 2' },
        description: { ka: 'აღწერა', en: 'Description', ru: 'Описание' },
        button_text: { ka: 'ნახე მეტი', en: 'View More', ru: 'Посмотреть' },
        title_line1_color: '#000000',
        title_line2_color: '#000000',
        description_color: '#666666',
        title_line1_size: 60,
        title_line2_size: 48,
        description_size: 18
      };

      const { data, error } = await supabase.from('hero_slides').insert([newSlide]).select();
      if (error) throw error;
      setSlides([...slides, data[0]]);
      toast({ title: "New slide added" });
    } catch (error) {
      toast({ title: "Error adding slide", variant: "destructive" });
    }
  };

  const duplicateSlide = async (slide) => {
    try {
      const { id, created_at, ...slideData } = slide;
      const newSlide = { ...slideData, sort_order: slides.length + 1 };
      const { data, error } = await supabase.from('hero_slides').insert([newSlide]).select();
      if (error) throw error;
      setSlides([...slides, data[0]]);
      toast({ title: "Slide duplicated" });
    } catch (error) {
      toast({ title: "Error duplicating slide", variant: "destructive" });
    }
  };

  const deleteSlide = async (id) => {
    if (window.confirm("Are you sure you want to delete this slide?")) {
      try {
        await supabase.from('hero_slides').delete().eq('id', id);
        setSlides(slides.filter(s => s.id !== id));
        toast({ title: "Slide deleted" });
      } catch (error) {
        toast({ title: "Error deleting slide", variant: "destructive" });
      }
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57c5cf]"></div></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <Helmet><title>Admin - Hero Section</title></Helmet>
      
      {/* Header with View Site */}
      <div className="flex justify-between items-center mb-8 py-6 border-b">
        <h1 className="text-3xl font-heading font-bold text-gray-800 flex items-center gap-2">
          <LayoutTemplate className="w-8 h-8 text-[#57c5cf]" />
          Hero Management
        </h1>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="outline" className="gap-2 border-[#57c5cf] text-[#57c5cf] hover:bg-[#57c5cf]/10">
              <Home className="w-4 h-4" /> View Site
            </Button>
          </Link>
          <Button onClick={addSlide} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2">
            <Plus className="w-4 h-4" /> Add Slide
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        {slides.map((slide, index) => (
          <div key={slide.id} className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100 relative group overflow-hidden">
            {/* Header of Card */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
               <span className="bg-gray-900 text-white text-xs font-bold py-1 px-3 rounded-full">
                  Slide {index + 1}
               </span>
               <div className="flex gap-2">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 gap-2" onClick={() => saveSlide(slide)}>
                    <Save className="w-4 h-4" /> Save
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => duplicateSlide(slide)} title="Duplicate">
                     <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => deleteSlide(slide.id)} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
               </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
               {/* LEFT COLUMN: Visuals & Links */}
               <div className="lg:col-span-4 space-y-6">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Main Image</label>
                     <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden mb-3 border-2 border-dashed border-gray-300 relative group/image">
                        <img src={slide.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity cursor-pointer">
                           <div className="text-white flex flex-col items-center gap-2">
                              <Upload className="w-6 h-6" />
                              <span className="text-xs font-bold">Change Image</span>
                           </div>
                           <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(slide.id, e.target.files[0])}
                           />
                        </label>
                     </div>
                     <div className="flex gap-2 items-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <input 
                           value={slide.image_url} 
                           onChange={(e) => updateSlide(slide.id, 'image_url', e.target.value)}
                           className="flex-1 p-2 text-xs border rounded-lg font-mono"
                           placeholder="https://..."
                        />
                     </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                     <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Decorative Icon</label>
                     <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center">
                           {slide.decorative_icon_url ? (
                              <img src={slide.decorative_icon_url} alt="Icon" className="w-8 h-8 object-contain" />
                           ) : (
                              <span className="text-xs text-gray-300">None</span>
                           )}
                        </div>
                        <input 
                           value={slide.decorative_icon_url} 
                           onChange={(e) => updateSlide(slide.id, 'decorative_icon_url', e.target.value)}
                           className="flex-1 p-2 text-xs border rounded-lg font-mono"
                           placeholder="Icon URL (e.g., .svg, .png)"
                        />
                     </div>
                     <div className="flex gap-2 overflow-x-auto pb-2">
                        {['https://cdn-icons-png.flaticon.com/512/2917/2917995.png', 'https://cdn-icons-png.flaticon.com/512/7486/7486747.png', 'https://cdn-icons-png.flaticon.com/512/4208/4208408.png'].map(url => (
                           <button key={url} onClick={() => updateSlide(slide.id, 'decorative_icon_url', url)} className="w-8 h-8 border rounded hover:bg-gray-100 p-1">
                              <img src={url} alt="preset" className="w-full h-full object-contain" />
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div>
                        <label className="text-xs font-bold text-gray-500">Button Link</label>
                        <div className="flex items-center gap-2 mt-1">
                           <ExternalLink className="w-4 h-4 text-gray-400" />
                           <input 
                              value={slide.button_link || ''} 
                              onChange={(e) => updateSlide(slide.id, 'button_link', e.target.value)}
                              className="flex-1 p-2 text-sm border rounded-lg"
                              placeholder="/category/..."
                           />
                        </div>
                     </div>
                  </div>
               </div>

               {/* RIGHT COLUMN: Typography & Content */}
               <div className="lg:col-span-8 space-y-6">
                  
                  {/* Title Line 1 Control */}
                  <div className="border rounded-2xl p-5 bg-gray-50/50">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                           <Type className="w-4 h-4 text-blue-500" /> Title Line 1
                        </h3>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Size: {slide.title_line1_size}px</span>
                              <Slider 
                                 min={20} max={100} step={1}
                                 value={[slide.title_line1_size]} 
                                 onValueChange={(vals) => updateSlide(slide.id, 'title_line1_size', vals[0])}
                                 className="w-32"
                              />
                           </div>
                           <input 
                              type="color" 
                              value={slide.title_line1_color} 
                              onChange={(e) => updateSlide(slide.id, 'title_line1_color', e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-none"
                           />
                        </div>
                     </div>
                     <div className="grid md:grid-cols-3 gap-3">
                        <input placeholder="Georgian" value={slide.title_line1.ka} onChange={e => updateNestedSlide(slide.id, 'title_line1', 'ka', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="English" value={slide.title_line1.en} onChange={e => updateNestedSlide(slide.id, 'title_line1', 'en', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="Russian" value={slide.title_line1.ru} onChange={e => updateNestedSlide(slide.id, 'title_line1', 'ru', e.target.value)} className="p-2 text-sm border rounded-lg" />
                     </div>
                  </div>

                  {/* Title Line 2 Control */}
                  <div className="border rounded-2xl p-5 bg-gray-50/50">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                           <Type className="w-4 h-4 text-purple-500" /> Title Line 2
                        </h3>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Size: {slide.title_line2_size}px</span>
                              <Slider 
                                 min={20} max={100} step={1}
                                 value={[slide.title_line2_size]} 
                                 onValueChange={(vals) => updateSlide(slide.id, 'title_line2_size', vals[0])}
                                 className="w-32"
                              />
                           </div>
                           <input 
                              type="color" 
                              value={slide.title_line2_color} 
                              onChange={(e) => updateSlide(slide.id, 'title_line2_color', e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-none"
                           />
                        </div>
                     </div>
                     <div className="grid md:grid-cols-3 gap-3">
                        <input placeholder="Georgian" value={slide.title_line2.ka} onChange={e => updateNestedSlide(slide.id, 'title_line2', 'ka', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="English" value={slide.title_line2.en} onChange={e => updateNestedSlide(slide.id, 'title_line2', 'en', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="Russian" value={slide.title_line2.ru} onChange={e => updateNestedSlide(slide.id, 'title_line2', 'ru', e.target.value)} className="p-2 text-sm border rounded-lg" />
                     </div>
                  </div>

                  {/* Description Control */}
                  <div className="border rounded-2xl p-5 bg-gray-50/50">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                           <Type className="w-4 h-4 text-gray-500" /> Description
                        </h3>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Size: {slide.description_size}px</span>
                              <Slider 
                                 min={12} max={40} step={1}
                                 value={[slide.description_size]} 
                                 onValueChange={(vals) => updateSlide(slide.id, 'description_size', vals[0])}
                                 className="w-32"
                              />
                           </div>
                           <input 
                              type="color" 
                              value={slide.description_color} 
                              onChange={(e) => updateSlide(slide.id, 'description_color', e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-none"
                           />
                        </div>
                     </div>
                     <div className="grid md:grid-cols-3 gap-3">
                        <textarea placeholder="Georgian" value={slide.description.ka} onChange={e => updateNestedSlide(slide.id, 'description', 'ka', e.target.value)} className="p-2 text-sm border rounded-lg h-20" />
                        <textarea placeholder="English" value={slide.description.en} onChange={e => updateNestedSlide(slide.id, 'description', 'en', e.target.value)} className="p-2 text-sm border rounded-lg h-20" />
                        <textarea placeholder="Russian" value={slide.description.ru} onChange={e => updateNestedSlide(slide.id, 'description', 'ru', e.target.value)} className="p-2 text-sm border rounded-lg h-20" />
                     </div>
                  </div>

                  {/* Button Text Control */}
                  <div className="border rounded-2xl p-5 bg-gray-50/50">
                     <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">Button Text</h3>
                     <div className="grid md:grid-cols-3 gap-3">
                        <input placeholder="Georgian" value={slide.button_text.ka} onChange={e => updateNestedSlide(slide.id, 'button_text', 'ka', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="English" value={slide.button_text.en} onChange={e => updateNestedSlide(slide.id, 'button_text', 'en', e.target.value)} className="p-2 text-sm border rounded-lg" />
                        <input placeholder="Russian" value={slide.button_text.ru} onChange={e => updateNestedSlide(slide.id, 'button_text', 'ru', e.target.value)} className="p-2 text-sm border rounded-lg" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AdminHero;