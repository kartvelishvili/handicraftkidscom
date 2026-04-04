import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, X, Image as ImageIcon, Trash2, Plus, Package, ArrowLeft, Layers, Check, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

// Normalize options: support both old format (["S","M"]) and new format ([{value:"S",price:85}])
const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    if (typeof opt === 'string') return { value: opt, price: null };
    if (typeof opt === 'object' && opt !== null) return { value: opt.value || '', price: opt.price ?? null };
    return { value: String(opt), price: null };
  });
};

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
  const [customOptionInputs, setCustomOptionInputs] = useState({});

  // Standalone Sizes State (works without category attribute templates)
  const [sizesEnabled, setSizesEnabled] = useState(false);
  const [newSizeValue, setNewSizeValue] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');
  const SIZE_ATTR_NAME = 'ზომა';

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
          // Deduplicate by (attribute_name, attribute_value) — keep first occurrence
          const seen = new Set();
          const mapped = attrs
            .map(a => ({
              attribute_name: a.attribute_name,
              attribute_value: a.attribute_value,
              attribute_value_en: a.attribute_value_en,
              attribute_value_ru: a.attribute_value_ru,
              attribute_type: a.attribute_type,
              price: a.price || null
            }))
            .filter(a => {
              const key = `${a.attribute_name}::${a.attribute_value}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          setProductAttributes(mapped);
          // Auto-enable sizes section if product already has size entries with prices
          const hasSizeEntries = mapped.some(a => a.price != null && a.price > 0);
          if (hasSizeEntries) setSizesEnabled(true);
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

  // Toggle a multi-option attribute (e.g. size "0-6 თვე" on/off for this product)
  const handleToggleOption = (attrName, optValue, optPrice, attrType) => {
    setProductAttributes(prev => {
      const exists = prev.find(p => p.attribute_name === attrName && p.attribute_value === optValue);
      if (exists) {
        // Remove it
        return prev.filter(p => !(p.attribute_name === attrName && p.attribute_value === optValue));
      } else {
        // Add new row
        return [...prev, {
          attribute_name: attrName,
          attribute_type: attrType,
          attribute_value: optValue,
          attribute_value_en: '',
          attribute_value_ru: '',
          price: optPrice
        }];
      }
    });
  };

  // Update price for a specific attribute+value combo
  const handleOptionPriceChange = (attrName, optValue, price) => {
    setProductAttributes(prev => prev.map(p => 
      (p.attribute_name === attrName && p.attribute_value === optValue)
        ? { ...p, price: price === '' ? null : Number(price) }
        : p
    ));
  };

  // Add a custom option (not predefined in category) for a priced attribute
  const handleAddCustomOption = (attrName, attrType) => {
    const input = customOptionInputs[attrName];
    if (!input?.value?.trim()) return;
    
    // Check for duplicates
    const exists = productAttributes.find(p => p.attribute_name === attrName && p.attribute_value === input.value.trim());
    if (exists) {
      toast({ title: "ეს მნიშვნელობა უკვე არსებობს", variant: "destructive" });
      return;
    }

    setProductAttributes(prev => [...prev, {
      attribute_name: attrName,
      attribute_type: attrType,
      attribute_value: input.value.trim(),
      attribute_value_en: '',
      attribute_value_ru: '',
      price: input.price === '' || input.price == null ? null : Number(input.price)
    }]);
    
    setCustomOptionInputs(prev => ({ ...prev, [attrName]: { value: '', price: '' } }));
  };

  // Remove a custom option
  const handleRemoveCustomOption = (attrName, optValue) => {
    setProductAttributes(prev => prev.filter(p => !(p.attribute_name === attrName && p.attribute_value === optValue)));
  };

  // For simple text/single-value attributes
  const handleAttributeChange = (attrName, value, type, isMultiSelect, lang = 'ka') => {
    setProductAttributes(prev => {
      const existingIndex = prev.findIndex(p => p.attribute_name === attrName);
      if (existingIndex >= 0) {
        const newAttrs = [...prev];
        if (lang === 'ka') newAttrs[existingIndex].attribute_value = value;
        if (lang === 'en') newAttrs[existingIndex].attribute_value_en = value;
        if (lang === 'ru') newAttrs[existingIndex].attribute_value_ru = value;
        return newAttrs;
      } else {
        const newAttr = { 
          attribute_name: attrName, attribute_type: type,
          attribute_value: '', attribute_value_en: '', attribute_value_ru: '', price: null
        };
        if (lang === 'ka') newAttr.attribute_value = value;
        if (lang === 'en') newAttr.attribute_value_en = value;
        if (lang === 'ru') newAttr.attribute_value_ru = value;
        return [...prev, newAttr];
      }
    });
  };

  const saveAttributes = async (productId) => {
    console.log("Saving Attributes for Product:", productId);
    setIsSavingAttributes(true);
    try {
      await supabase.from('product_attributes').delete().eq('product_id', productId);
      
      // Deduplicate by (attribute_name, attribute_value) before inserting
      const seenKeys = new Set();
      const attributesToInsert = productAttributes
        .filter(pa => pa.attribute_value || pa.attribute_value_en || pa.attribute_value_ru)
        .filter(pa => {
          const key = `${pa.attribute_name}::${pa.attribute_value}`;
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        })
        .map(pa => ({
           product_id: productId,
           category_id: selectedCategoryId || null,
           attribute_name: pa.attribute_name,
           attribute_value: pa.attribute_value,
           attribute_value_en: pa.attribute_value_en,
           attribute_value_ru: pa.attribute_value_ru,
           attribute_type: pa.attribute_type,
           price: pa.price || null
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

              {/* Standalone Sizes / Variants Section */}
              <div className="bg-gradient-to-br from-violet-50/50 to-pink-50/50 p-5 rounded-2xl border border-violet-100">
                <label className="flex items-center gap-3 cursor-pointer select-none mb-1">
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sizesEnabled ? 'bg-[#57c5cf]' : 'bg-gray-200'}`}>
                    <input type="checkbox" checked={sizesEnabled} onChange={(e) => setSizesEnabled(e.target.checked)} className="sr-only" />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sizesEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                  <span className="font-bold text-gray-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-500" /> ზომები / ვარიანტები
                  </span>
                </label>
                <p className="text-xs text-gray-400 mb-3 ml-14">ჩართეთ თუ პროდუქტს რამდენიმე ზომა ან ვარიანტი აქვს</p>

                {sizesEnabled && (() => {
                  // Check if a category attribute already manages sizes with prices
                  const hasCategoryPricedAttr = categoryAttributes.some(ca => {
                    const opts = normalizeOptions(ca.options);
                    return ['dropdown', 'checkbox'].includes(ca.attribute_type) && opts.some(o => o.price != null && o.price > 0);
                  });

                  // Get the attribute name to use: from category or default "ზომა"
                  const sizeAttrName = hasCategoryPricedAttr 
                    ? categoryAttributes.find(ca => {
                        const opts = normalizeOptions(ca.options);
                        return opts.some(o => o.price != null && o.price > 0);
                      })?.attribute_name 
                    : SIZE_ATTR_NAME;

                  if (hasCategoryPricedAttr) {
                    return (
                      <div className="bg-white/70 rounded-xl p-3 border border-violet-100">
                        <p className="text-sm text-violet-600 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          ზომები იმართება ქვემოთ, მახასიათებლებში (კატეგორიის შაბლონიდან)
                        </p>
                      </div>
                    );
                  }

                  const sizeEntries = productAttributes.filter(pa => pa.attribute_name === sizeAttrName);
                  
                  const addSize = () => {
                    if (!newSizeValue.trim()) return;
                    const exists = productAttributes.find(p => p.attribute_name === sizeAttrName && p.attribute_value === newSizeValue.trim());
                    if (exists) {
                      toast({ title: "ეს ზომა უკვე დამატებულია", variant: "destructive" });
                      return;
                    }
                    setProductAttributes(prev => [...prev, {
                      attribute_name: sizeAttrName,
                      attribute_type: 'checkbox',
                      attribute_value: newSizeValue.trim(),
                      attribute_value_en: '',
                      attribute_value_ru: '',
                      price: newSizePrice === '' ? null : Number(newSizePrice)
                    }]);
                    setNewSizeValue('');
                    setNewSizePrice('');
                  };
                  
                  return (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      {/* Existing size entries */}
                      {sizeEntries.length > 0 && (
                        <div className="space-y-2">
                          {sizeEntries.map((entry, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-white border-violet-100 shadow-sm">
                              <span className="font-bold text-sm text-gray-900 flex-grow">{entry.attribute_value}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-xs text-gray-400">₾</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={entry.price ?? ''}
                                  onChange={(e) => handleOptionPriceChange(sizeAttrName, entry.attribute_value, e.target.value)}
                                  className="w-28 p-2 border rounded-lg text-sm font-mono text-right bg-white border-[#f292bc]/30 focus:border-[#f292bc] outline-none text-gray-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomOption(sizeAttrName, entry.attribute_value)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {sizeEntries.length === 0 && (
                        <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-violet-200">
                          <p className="text-sm text-gray-400">ჯერ ზომები არ არის დამატებული</p>
                        </div>
                      )}

                      {/* Add new size */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="ზომა (მაგ: S, M, L, 100x120...)"
                          value={newSizeValue}
                          onChange={(e) => setNewSizeValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                          className="flex-grow p-3 border rounded-xl text-sm bg-white focus:border-[#57c5cf] outline-none"
                        />
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-400">₾</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="ფასი"
                            value={newSizePrice}
                            onChange={(e) => setNewSizePrice(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                            className="w-28 p-3 border rounded-xl text-sm font-mono text-right bg-white focus:border-[#f292bc] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addSize}
                          className="p-3 bg-[#57c5cf] text-white rounded-xl hover:bg-[#4bc0cb] transition-colors flex-shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400">💡 ფასი ცარიელი რომ დატოვოთ, პროდუქტის ძირითადი ფასი გამოჩნდება. Enter-ით დამატებაც შეგიძლიათ.</p>
                    </div>
                  );
                })()}
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
                          მახასიათებლები
                       </h3>
                    </div>

                    <div className="space-y-6">
                       {categoryAttributes.map(attr => {
                          const opts = normalizeOptions(attr.options);
                          const hasOpts = ['dropdown', 'checkbox'].includes(attr.attribute_type) && opts.length > 0;
                          const hasPricedOpts = opts.some(o => o.price != null && o.price > 0);

                          // For multi-option attributes (sizes with prices): show checkboxes
                          if (hasOpts && hasPricedOpts) {
                            const selectedForAttr = productAttributes.filter(pa => pa.attribute_name === attr.attribute_name);
                            const selectedValues = selectedForAttr.map(pa => pa.attribute_value);
                            const predefinedValues = opts.map(o => o.value);
                            const customOptions = selectedForAttr.filter(pa => !predefinedValues.includes(pa.attribute_value));
                            const inputState = customOptionInputs[attr.attribute_name] || { value: '', price: '' };
                            
                            return (
                              <div key={attr.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="text-sm font-bold text-gray-700 flex gap-2 items-center mb-3">
                                  {attr.attribute_name}
                                  <span className="text-[10px] bg-[#f292bc]/10 text-[#f292bc] px-2 py-0.5 rounded-full font-bold">ფასით</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-3">მონიშნეთ ზომები რომლებიც ამ პროდუქტს აქვს. ფასი ავტომატურად შეივსება.</p>
                                
                                <div className="space-y-2">
                                  {opts.map((opt, i) => {
                                    const isChecked = selectedValues.includes(opt.value);
                                    const existingRow = selectedForAttr.find(pa => pa.attribute_value === opt.value);
                                    
                                    return (
                                      <div key={i} className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                        isChecked ? "bg-white border-[#57c5cf]/30 shadow-sm" : "bg-gray-50 border-gray-200"
                                      )}>
                                        <label className="flex items-center gap-3 cursor-pointer flex-grow min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleOption(attr.attribute_name, opt.value, opt.price, attr.attribute_type)}
                                            className="w-5 h-5 text-[#57c5cf] rounded border-gray-300 focus:ring-[#57c5cf] flex-shrink-0"
                                          />
                                          <span className={cn(
                                            "font-bold text-sm truncate",
                                            isChecked ? "text-gray-900" : "text-gray-500"
                                          )}>
                                            {opt.value}
                                          </span>
                                        </label>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <span className="text-xs text-gray-400">₾</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            disabled={!isChecked}
                                            value={isChecked ? (existingRow?.price ?? '') : (opt.price ?? '')}
                                            onChange={(e) => handleOptionPriceChange(attr.attribute_name, opt.value, e.target.value)}
                                            className={cn(
                                              "w-24 p-2 border rounded-lg text-sm font-mono text-right",
                                              isChecked 
                                                ? "bg-white border-[#f292bc]/30 focus:border-[#f292bc] outline-none text-gray-900" 
                                                : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                            )}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Custom options added for this product (not in category template) */}
                                  {customOptions.map((co, i) => (
                                    <div key={`custom-${i}`} className="flex items-center gap-3 p-3 rounded-xl border bg-white border-amber-200 shadow-sm">
                                      <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold flex-shrink-0">NEW</span>
                                        <span className="font-bold text-sm text-gray-900 truncate">{co.attribute_value}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-xs text-gray-400">₾</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={co.price ?? ''}
                                          onChange={(e) => handleOptionPriceChange(attr.attribute_name, co.attribute_value, e.target.value)}
                                          className="w-24 p-2 border rounded-lg text-sm font-mono text-right bg-white border-[#f292bc]/30 focus:border-[#f292bc] outline-none text-gray-900"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCustomOption(attr.attribute_name, co.attribute_value)}
                                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Add custom option form */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-400 mb-2">ახალი ვარიანტის დამატება:</p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="მაგ: XL, 100x120..."
                                      value={inputState.value}
                                      onChange={(e) => setCustomOptionInputs(prev => ({
                                        ...prev,
                                        [attr.attribute_name]: { ...inputState, value: e.target.value }
                                      }))}
                                      className="flex-grow p-2.5 border rounded-xl text-sm bg-white focus:border-[#57c5cf] outline-none"
                                    />
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-xs text-gray-400">₾</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="ფასი"
                                        value={inputState.price}
                                        onChange={(e) => setCustomOptionInputs(prev => ({
                                          ...prev,
                                          [attr.attribute_name]: { ...inputState, price: e.target.value }
                                        }))}
                                        className="w-24 p-2.5 border rounded-xl text-sm font-mono text-right bg-white focus:border-[#f292bc] outline-none"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomOption(attr.attribute_name, attr.attribute_type)}
                                      className="p-2.5 bg-[#57c5cf] text-white rounded-xl hover:bg-[#4bc0cb] transition-colors flex-shrink-0"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                
                                {selectedValues.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1.5">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">არჩეული:</span>
                                    {selectedForAttr.map((pa, i) => (
                                      <span key={i} className="text-[11px] bg-[#57c5cf]/10 text-[#57c5cf] px-2 py-0.5 rounded-full font-bold">
                                        {pa.attribute_value} — ₾{pa.price ?? '?'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // For simple dropdown (without prices): single select
                          if (hasOpts) {
                            const currentAttr = productAttributes.find(pa => pa.attribute_name === attr.attribute_name);
                            const currentValue = activeTab === 'ka' ? (currentAttr?.attribute_value || '') 
                              : activeTab === 'en' ? (currentAttr?.attribute_value_en || '') 
                              : (currentAttr?.attribute_value_ru || '');

                            return (
                              <div key={attr.id} className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="text-sm font-bold text-gray-700 mb-1">{attr.attribute_name}</label>
                                {activeTab === 'ka' ? (
                                  <select
                                    value={currentValue}
                                    onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value, attr.attribute_type, false, 'ka')}
                                    className="w-full p-3 border rounded-xl bg-white text-sm focus:border-[#57c5cf] outline-none cursor-pointer"
                                  >
                                    <option value="">-- აირჩიეთ --</option>
                                    {opts.map((opt, i) => (
                                      <option key={i} value={opt.value}>{opt.value}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value, attr.attribute_type, false, activeTab)}
                                    className="w-full p-3 border rounded-xl bg-white text-sm focus:border-[#57c5cf] outline-none"
                                    placeholder={activeTab === 'en' ? `Value (EN)` : `Значение (RU)`}
                                  />
                                )}
                              </div>
                            );
                          }

                          // For text/info attributes: simple text input
                          const currentAttr = productAttributes.find(pa => pa.attribute_name === attr.attribute_name);
                          let currentValue = '';
                          if (activeTab === 'ka') currentValue = currentAttr?.attribute_value || '';
                          if (activeTab === 'en') currentValue = currentAttr?.attribute_value_en || '';
                          if (activeTab === 'ru') currentValue = currentAttr?.attribute_value_ru || '';

                          return (
                            <div key={attr.id} className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                               <label className="text-sm font-bold text-gray-700 mb-1">
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