import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, X, Image as ImageIcon, Trash2, Plus, Package, ArrowLeft, Layers, Check, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

const AdminProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translations } = useLanguage();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [categories, setCategories] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('ka');
  
  // Form State
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [additionalPreviews, setAdditionalPreviews] = useState([]);
  const [manageInventory, setManageInventory] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Attributes State
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [productAttributes, setProductAttributes] = useState([]); 
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryAttributes(selectedCategoryId);
    } else {
      setCategoryAttributes([]);
    }
  }, [selectedCategoryId]);

  const fetchData = async () => {
    try {
      console.log("Fetching initial data...");
      const { data: catRes } = await supabase.from('categories').select('*').order('name');
      if (catRes) setCategories(catRes);

      if (!isNew) {
        console.log(`Fetching product ${id}...`);
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        console.log("Product data fetched:", product);
        setCurrentProduct(product);
        setMainImagePreview(product.image_url);
        setManageInventory(product.manage_inventory || false);
        setIsHidden(product.is_hidden || false);
        setSelectedCategoryId(product.category_id);

        const { data: images } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', id)
          .order('sort_order');
          
        if (images) {
          setAdditionalPreviews(images.map(img => ({
             url: img.image_url,
             existing: true,
             id: img.id
          })));
        }

        const { data: attrs } = await supabase
          .from('product_attributes')
          .select('*')
          .eq('product_id', id);
          
        if (attrs) {
          setProductAttributes(attrs.map(a => ({
            attribute_name: a.attribute_name,
            attribute_value: a.attribute_value,
            attribute_value_en: a.attribute_value_en,
            attribute_value_ru: a.attribute_value_ru,
            attribute_type: a.attribute_type
          })));
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast({ title: "მონაცემების ჩატვირთვა ვერ მოხერხდა", variant: "destructive" });
      navigate('/admin/products');
    }
  };

  const fetchCategoryAttributes = async (catId) => {
    const { data } = await supabase
      .from('category_attributes')
      .select('*')
      .eq('category_id', catId)
      .order('display_order');
    if (data) setCategoryAttributes(data);
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "ფაილი დიდია (max 5MB)", variant: "destructive" });
        return;
      }
      setMainImageFile(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    
    setAdditionalFiles(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(f => ({ file: f, url: URL.createObjectURL(f), existing: false }));
    setAdditionalPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeAdditionalImage = async (index, preview) => {
    if (preview.existing) {
      if(!window.confirm("გსურთ სურათის წაშლა?")) return;
      await supabase.from('product_images').delete().eq('id', preview.id);
    }
    setAdditionalPreviews(prev => prev.filter((_, i) => i !== index));
    if (!preview.existing) {
       const newFiles = additionalFiles.filter(f => f !== preview.file);
       setAdditionalFiles(newFiles);
    }
  };

  const uploadProductImage = async (file) => {
    console.log("Uploading image:", file.name);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('products_images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('products_images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAttributeChange = (attrName, value, type, isMultiSelect, lang = 'ka') => {
    setProductAttributes(prev => {
      // Find existing attribute
      const existingIndex = prev.findIndex(p => p.attribute_name === attrName);
      
      if (existingIndex >= 0) {
        // Update existing
        const newAttrs = [...prev];
        if (lang === 'ka') newAttrs[existingIndex].attribute_value = value;
        if (lang === 'en') newAttrs[existingIndex].attribute_value_en = value;
        if (lang === 'ru') newAttrs[existingIndex].attribute_value_ru = value;
        return newAttrs;
      } else {
        // Create new
        const newAttr = { 
          attribute_name: attrName, 
          attribute_type: type,
          attribute_value: '',
          attribute_value_en: '',
          attribute_value_ru: ''
        };
        if (lang === 'ka') newAttr.attribute_value = value;
        if (lang === 'en') newAttr.attribute_value_en = value;
        if (lang === 'ru') newAttr.attribute_value_ru = value;
        
        return [...prev, newAttr];
      }
    });
  };

  const saveAttributes = async (productId) => {
    if (!selectedCategoryId) return;

    console.log("Saving Attributes for Product:", productId);
    setIsSavingAttributes(true);
    try {
      await supabase.from('product_attributes').delete().eq('product_id', productId);
      
      const attributesToInsert = productAttributes
        .filter(pa => pa.attribute_value || pa.attribute_value_en || pa.attribute_value_ru)
        .map(pa => ({
           product_id: productId,
           category_id: selectedCategoryId,
           attribute_name: pa.attribute_name,
           attribute_value: pa.attribute_value,
           attribute_value_en: pa.attribute_value_en,
           attribute_value_ru: pa.attribute_value_ru,
           attribute_type: pa.attribute_type
        }));
      
      console.log("Attributes payload:", attributesToInsert);
      
      if (attributesToInsert.length > 0) {
         const { error } = await supabase.from('product_attributes').insert(attributesToInsert);
         if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error("Error saving attributes:", error);
      toast({ title: "ატრიბუტების შენახვა ვერ მოხერხდა", variant: "destructive" });
      return false;
    } finally {
      setIsSavingAttributes(false);
    }
  };

  const handleVerifySave = async () => {
    if (isNew || !currentProduct?.id) return;
    try {
      console.log(`[VERIFY] Verifying save for product ${currentProduct.id}...`);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', currentProduct.id)
        .single();
      
      if (error) throw error;
      
      alert(`Verification Successful!\n\nProduct ID: ${data.id}\nName KA: ${data.name}\nName EN: ${data.name_en}\nName RU: ${data.name_ru}`);
    } catch (error) {
       console.error("[VERIFY] Verification failed:", error);
       alert("Verification failed. Check console for details.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setIsUploading(true);
    const formData = new FormData(e.target);
    
    try {
      let mainImageUrl = currentProduct?.image_url || '';
      if (mainImageFile) {
        mainImageUrl = await uploadProductImage(mainImageFile);
      } else if (!mainImageUrl && formData.get('image_url_text')) {
         mainImageUrl = formData.get('image_url_text');
      }

      const productData = {
        price: formData.get('price'),
        image_url: mainImageUrl,
        category_id: selectedCategoryId,
        stock_quantity: manageInventory ? (formData.get('stock_quantity') || 0) : 0,
        manage_inventory: manageInventory,
        is_new: formData.get('is_new') === 'on',
        is_hidden: isHidden,
        rating: 5,
        updated_at: new Date().toISOString(),
        
        // Multi-language fields
        name: formData.get('name_ka'),
        description: formData.get('desc_ka'),
        
        name_en: formData.get('name_en'),
        description_en: formData.get('desc_en'),
        
        name_ru: formData.get('name_ru'),
        description_ru: formData.get('desc_ru')
      };
      
      let productId;
      
      console.log("[SAVE] Preparing to save product data:", productData);

      if (!isNew) {
        // Ensure ID is valid UUID before update
        if (!id) throw new Error("Product ID is missing for update operation");

        const { data: updateData, error: updateError } = await supabase
           .from('products')
           .update(productData)
           .eq('id', id)
           .select();
        
        if (updateError) throw updateError;
        productId = id;
      } else {
        productData.created_at = new Date().toISOString();
        const { data, error } = await supabase.from('products').insert([productData]).select().single();
        if (error) throw error;
        productId = data.id;
      }
      
      if (additionalFiles.length > 0) {
        for (const file of additionalFiles) {
           const url = await uploadProductImage(file);
           await supabase.from('product_images').insert({
             product_id: productId,
             image_url: url
           });
        }
      }

      // Also save to translations table for backward compatibility if needed, 
      // but primarily rely on columns now.
      // We'll skip redundant translation table save to avoid confusion, 
      // since we are moving to columns.

      await saveAttributes(productId);

      console.log("[SAVE] All save operations completed successfully.");
      
      toast({ title: "პროდუქტი წარმატებით შეინახა" });
      
      // Navigate only if new, otherwise stay to verify
      if (isNew) {
        navigate('/admin/products');
      } else {
        fetchData(); // Refresh current page data
      }

    } catch (error) {
      console.error("[SAVE] CRITICAL SAVE FAILURE:", error);
      let errorMessage = error.message;
      if (error.code === '42501') errorMessage = "Permission denied (RLS). Check database policies.";
      toast({ title: "შეცდომა შენახვისას", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">იტვირთება...</div>;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <Helmet><title>{isNew ? 'ახალი პროდუქტი' : 'პროდუქტის რედაქტირება'}</title></Helmet>

      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/products">
           <Button variant="ghost" className="gap-2">
             <ArrowLeft className="w-4 h-4" /> უკან
           </Button>
        </Link>
        <h1 className="text-2xl font-bold font-heading">{isNew ? 'ახალი პროდუქტის დამატება' : 'პროდუქტის რედაქტირება'}</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
        <form onSubmit={handleSave} className="space-y-8">
          
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
             <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isHidden ? 'text-gray-500' : 'text-green-600'}`}>
                  სტატუსი: {isHidden ? 'დამალული' : 'გამოჩენილი'}
                </span>
             </div>
             <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-sm font-bold text-gray-700">პროდუქტის დამალვა</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHidden ? 'bg-red-500' : 'bg-gray-200'}`}>
                    <input type="checkbox" checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)} className="sr-only" />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHidden ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </label>
             </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
             <label className="block text-sm font-bold text-gray-700 mb-2">კატეგორიის არჩევა</label>
             <select 
               name="category_id" 
               value={selectedCategoryId}
               onChange={(e) => setSelectedCategoryId(e.target.value)}
               className="w-full p-4 border rounded-xl bg-white focus:border-[#57c5cf] focus:outline-none cursor-pointer text-lg font-bold text-gray-700 shadow-sm"
               required
             >
               <option value="">აირჩიეთ კატეგორია</option>
               {categories.map(c => (
                 <option key={c.id} value={c.id}>{translations[`cat_${c.slug}`]?.ka || c.name || c.slug}</option>
               ))}
             </select>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              
              <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700">ფასი (₾)</label>
                 <input name="price" type="number" step="0.01" defaultValue={currentProduct?.price} className="w-full p-3 border rounded-xl bg-gray-50 focus:border-[#57c5cf] focus:outline-none font-mono text-lg" required placeholder="0.00" />
              </div>

              {/* Language Tabs */}
              <div className="space-y-4 pt-4 border-t">
                 <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setActiveTab('ka')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'ka' ? 'bg-[#57c5cf] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Georgian 🇬🇪</button>
                    <button type="button" onClick={() => setActiveTab('en')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'en' ? 'bg-[#57c5cf] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>English 🇺🇸</button>
                    <button type="button" onClick={() => setActiveTab('ru')} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'ru' ? 'bg-[#57c5cf] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Russian 🇷🇺</button>
                 </div>

                 {/* Georgian Fields */}
                 <div className={activeTab === 'ka' ? 'block space-y-4 animate-in fade-in' : 'hidden'}>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">დასახელება (KA)</label>
                      <input name="name_ka" defaultValue={currentProduct?.name || translations[`prod_name_${currentProduct?.id}`]?.ka} className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] focus:outline-none" placeholder="პროდუქტის სახელი" />
                      <label className="block text-xs font-bold text-gray-500 uppercase mt-2">აღწერა (KA)</label>
                      <textarea name="desc_ka" defaultValue={currentProduct?.description || translations[`prod_desc_${currentProduct?.id}`]?.ka} className="w-full p-3 border rounded-xl text-sm h-32 focus:border-[#57c5cf] focus:outline-none" placeholder="პროდუქტის აღწერა" />
                    </div>
                 </div>

                 {/* English Fields */}
                 <div className={activeTab === 'en' ? 'block space-y-4 animate-in fade-in' : 'hidden'}>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Name (EN)</label>
                      <input name="name_en" defaultValue={currentProduct?.name_en || translations[`prod_name_${currentProduct?.id}`]?.en} className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] focus:outline-none" placeholder="Product Name" />
                      <label className="block text-xs font-bold text-gray-500 uppercase mt-2">Description (EN)</label>
                      <textarea name="desc_en" defaultValue={currentProduct?.description_en || translations[`prod_desc_${currentProduct?.id}`]?.en} className="w-full p-3 border rounded-xl text-sm h-32 focus:border-[#57c5cf] focus:outline-none" placeholder="Product Description" />
                    </div>
                 </div>

                 {/* Russian Fields */}
                 <div className={activeTab === 'ru' ? 'block space-y-4 animate-in fade-in' : 'hidden'}>
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Name (RU)</label>
                      <input name="name_ru" defaultValue={currentProduct?.name_ru || translations[`prod_name_${currentProduct?.id}`]?.ru} className="w-full p-3 border rounded-xl text-sm focus:border-[#57c5cf] focus:outline-none" placeholder="Название продукта" />
                      <label className="block text-xs font-bold text-gray-500 uppercase mt-2">Description (RU)</label>
                      <textarea name="desc_ru" defaultValue={currentProduct?.description_ru || translations[`prod_desc_${currentProduct?.id}`]?.ru} className="w-full p-3 border rounded-xl text-sm h-32 focus:border-[#57c5cf] focus:outline-none" placeholder="Описание продукта" />
                    </div>
                 </div>
              </div>

              {/* Attributes Section */}
              {selectedCategoryId && categoryAttributes.length > 0 && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-top-4 border-t pt-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                       <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Layers className="w-5 h-5 text-[#57c5cf]" /> 
                          მახასიათებლები ({activeTab.toUpperCase()})
                       </h3>
                    </div>

                    <div className="space-y-6">
                       {categoryAttributes.map(attr => {
                          const isText = attr.attribute_type === 'text';
                          const isDropdown = attr.attribute_type === 'dropdown'; // Treating dropdowns as text inputs for now if multi-lang needed, or standard selects
                          // Simplification: treating all value inputs as text for multilingual support if they are free text.
                          // If dropdown options are fixed in KA, they might need translation mapping. 
                          // For now, assuming free text entry for values to support languages.

                          const currentAttr = productAttributes.find(pa => pa.attribute_name === attr.attribute_name);
                          let currentValue = '';
                          if (activeTab === 'ka') currentValue = currentAttr?.attribute_value || '';
                          if (activeTab === 'en') currentValue = currentAttr?.attribute_value_en || '';
                          if (activeTab === 'ru') currentValue = currentAttr?.attribute_value_ru || '';

                          return (
                            <div key={attr.id} className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                               <label className="text-sm font-bold text-gray-700 flex gap-1 items-center mb-1">
                                  {attr.attribute_name}
                               </label>
                               
                               <input 
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value, attr.attribute_type, false, activeTab)}
                                  className="w-full p-3 border rounded-xl bg-white text-sm focus:border-[#57c5cf] outline-none"
                                  placeholder={activeTab === 'ka' ? `მნიშვნელობა (KA)` : activeTab === 'en' ? `Value (EN)` : `Значение (RU)`}
                               />
                            </div>
                          );
                       })}
                    </div>
                 </div>
              )}

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                   <input type="checkbox" checked={manageInventory} onChange={(e) => setManageInventory(e.target.checked)} className="w-5 h-5 text-[#57c5cf] rounded" />
                   <span className="font-bold text-gray-700 flex items-center gap-2">
                     <Package className="w-4 h-4" /> მარაგების მართვა
                   </span>
                </label>
                
                {manageInventory && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                     <label className="text-sm font-bold text-gray-600 block mb-2">რაოდენობა მარაგში</label>
                     <input name="stock_quantity" type="number" defaultValue={currentProduct?.stock_quantity || 0} className="w-full p-3 border rounded-xl bg-white focus:border-[#57c5cf] focus:outline-none" />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 block">მთავარი სურათი</label>
                  <div className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${mainImagePreview ? 'border-[#57c5cf] bg-[#57c5cf]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                     {mainImagePreview ? (
                        <div className="relative group">
                          <img src={mainImagePreview} alt="Preview" className="w-full h-64 object-contain rounded-xl" />
                          <button type="button" onClick={() => { setMainImageFile(null); setMainImagePreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                     ) : (
                        <div className="py-10">
                           <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                           <label className="bg-white border border-gray-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-50 font-bold text-sm text-gray-700 block mx-auto w-fit">
                             ატვირთვა
                             <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
                           </label>
                        </div>
                     )}
                  </div>
                  {!mainImageFile && (
                    <input name="image_url_text" defaultValue={currentProduct?.image_url} placeholder="ან ჩასვით სურათის ბმული" className="w-full p-3 border rounded-xl text-sm mt-2 focus:border-[#57c5cf] focus:outline-none" />
                  )}
               </div>

               <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 block">დამატებითი სურათები</label>
                  <div className="grid grid-cols-3 gap-4">
                     {additionalPreviews.map((preview, idx) => (
                        <div key={idx} className="relative aspect-square border rounded-xl overflow-hidden group bg-gray-50">
                           <img src={preview.url} alt="" className="w-full h-full object-cover" />
                           <button type="button" onClick={() => removeAdditionalImage(idx, preview)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                     ))}
                     <label className="border-2 border-dashed border-gray-200 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors bg-white">
                        <Plus className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500 font-bold">დამატება</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdditionalImagesChange} />
                     </label>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t sticky bottom-0 bg-white p-4 -mx-8 -mb-8 rounded-b-3xl border-t-gray-100 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" name="is_new" defaultChecked={currentProduct?.is_new} className="w-5 h-5 text-[#57c5cf] rounded" />
               <span className="text-sm font-bold text-gray-700">ახალი კოლექცია</span>
             </label>
             <div className="flex-grow"></div>
             {!isNew && (
                <Button variant="outline" type="button" onClick={handleVerifySave} className="gap-2 text-gray-500 border-gray-300 hover:text-[#57c5cf] hover:border-[#57c5cf]">
                    <CheckCircle2 className="w-4 h-4"/> Verify Save
                </Button>
             )}
             <Button type="submit" disabled={isUploading || isSavingAttributes} className="bg-[#57c5cf] px-10 py-6 rounded-xl text-lg hover:bg-[#4bc0cb] shadow-lg shadow-[#57c5cf]/20 font-heading">
               <Save className="w-5 h-5 mr-2" />
               {isUploading ? 'ინახება...' : 'შენახვა'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProductEdit;