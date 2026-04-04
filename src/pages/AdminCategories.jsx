import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Trash2, Edit2, GripVertical, Save, X, RefreshCw, CheckCircle2, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const iconInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const { toast } = useToast();
  const { translations } = useLanguage();

  const uploadCategoryFile = async (file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const { error } = await supabase.storage.from('categories').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('categories').getPublicUrl(fileName);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log("Fetching categories...");
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);
      console.log("Categories fetched:", catData);

      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, category_id');
      
      if (prodError) throw prodError;

      const counts = {};
      prodData.forEach(p => {
        if(p.category_id) {
           counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
      setProductCounts(counts);

    } catch (error) {
      console.error("Fetch Error:", error);
      toast({ title: "შეცდომა", description: "მონაცემების ჩატვირთვა ვერ მოხერხდა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.target);
    
    try {
      // Upload icon if new file selected
      let iconUrl = formData.get('icon_url');
      if (iconFile) {
        iconUrl = await uploadCategoryFile(iconFile, 'icons');
      }
      
      // Upload image if new file selected
      let imageUrl = currentCategory?.image_url || '';
      if (imageFile) {
        imageUrl = await uploadCategoryFile(imageFile, 'images');
      }
    
      const categoryData = {
        name: formData.get('name'),
        slug: formData.get('slug'),
        color: formData.get('color'),
        icon_url: iconUrl,
        image_url: imageUrl,
        is_active: formData.get('is_active') === 'on',
        admin_id: parseInt(formData.get('admin_id') || '0'),
      };
      console.log("Saving Category Data:", categoryData);
      let catId;
      if (currentCategory) {
        const { error } = await supabase.from('categories').update(categoryData).eq('id', currentCategory.id);
        if (error) throw error;
        catId = currentCategory.id;
      } else {
        const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) : 0;
        categoryData.sort_order = maxSort + 1;
        
        const { data, error } = await supabase.from('categories').insert([categoryData]).select().single();
        if (error) throw error;
        catId = data.id;
      }

      console.log("Category saved successfully, ID:", catId);

      // Save translations
      const names = {
        ka: formData.get('name_ka'),
        en: formData.get('name_en'),
        ru: formData.get('name_ru')
      };
      
      console.log("Saving translations:", names);
      await supabase.from('translations').upsert({
         key: `cat_${categoryData.slug}`,
         ...names
      }, { onConflict: 'key' });

      await fetchData(); // Await fetch to ensure UI update
      setIsEditing(false);
      setCurrentCategory(null);
      setIconFile(null);
      setIconPreview(null);
      setImageFile(null);
      setImagePreview(null);
      toast({ title: "შენახულია" });
    } catch (error) {
      console.error("Save Error:", error);
      toast({ title: "შეცდომა", variant: "destructive", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if(!window.confirm("წაიშალოს? ყველა ამ კატეგორიის პროდუქტი დარჩება უპატრონოდ!")) return;
    try {
      console.log("Deleting category:", id);
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(categories.filter(c => c.id !== id));
      toast({ title: "წაიშალა" });
    } catch (error) {
      console.error("Delete Error:", error);
      toast({ title: "შეცდომა", variant: "destructive" });
    }
  };

  const moveCategory = async (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === categories.length - 1)) return;
    
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[index + direction];
    newCategories[index + direction] = temp;
    
    setCategories(newCategories); 

    const updates = newCategories.map((cat, idx) => ({
      id: cat.id,
      sort_order: idx + 1,
      admin_id: idx + 1
    }));
    
    try {
       console.log("Updating sort orders:", updates);
       for(const update of updates) {
          await supabase.from('categories').update({ 
             sort_order: update.sort_order, 
             admin_id: update.admin_id 
          }).eq('id', update.id);
       }
       toast({ title: "მიმდევრობა განახლდა" });
    } catch(err) {
       console.error("Sort Error:", err);
       fetchData(); // Revert on error
       toast({ title: "შეცდომა სორტირებისას", variant: "destructive" });
    }
  };

  const openEdit = (category) => {
    setCurrentCategory(category);
    setIconFile(null);
    setIconPreview(category?.icon_url || null);
    setImageFile(null);
    setImagePreview(category?.image_url || null);
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold font-heading text-gray-800">{currentCategory ? 'რედაქტირება' : 'ახალი კატეგორია'}</h2>
          <Button variant="ghost" onClick={() => setIsEditing(false)}><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-sm font-bold text-gray-700">Internal Name</label>
               <input name="name" defaultValue={currentCategory?.name} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors" required />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-bold text-gray-700">Slug (ID)</label>
               <input name="slug" defaultValue={currentCategory?.slug} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors" required />
             </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-sm font-bold text-gray-700">აიქონი (Icon)</label>
               <div className="flex items-center gap-3">
                 {iconPreview && (
                   <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                     <img src={iconPreview} alt="icon" className="w-10 h-10 object-contain" />
                   </div>
                 )}
                 <div className="flex-1 space-y-1">
                   <input
                     name="icon_url"
                     defaultValue={currentCategory?.icon_url || ''}
                     onChange={e => { setIconPreview(e.target.value); setIconFile(null); }}
                     className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white transition-colors text-sm"
                     placeholder="URL ან ატვირთეთ ფაილი"
                   />
                   <input
                     ref={iconInputRef}
                     type="file"
                     accept="image/*"
                     className="hidden"
                     onChange={e => {
                       const f = e.target.files[0];
                       if (f) {
                         if (f.size > 5 * 1024 * 1024) { toast({ title: "ფაილი ძალიან დიდია (მაქს 5MB)", variant: "destructive" }); return; }
                         setIconFile(f);
                         setIconPreview(URL.createObjectURL(f));
                       }
                     }}
                   />
                   <button type="button" onClick={() => iconInputRef.current?.click()} className="text-xs text-[#57c5cf] font-bold hover:underline flex items-center gap-1">
                     <Upload className="w-3 h-3" /> ატვირთვა
                   </button>
                 </div>
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-sm font-bold text-gray-700">Color Hex</label>
               <div className="flex gap-2">
                 <input type="color" name="color" defaultValue={currentCategory?.color || '#57c5cf'} className="h-12 w-20 rounded-xl cursor-pointer" />
                 <input type="text" defaultValue={currentCategory?.color || '#57c5cf'} className="flex-1 p-3 border rounded-xl bg-gray-50 font-mono" />
               </div>
            </div>
          </div>

          {/* Category Image */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">კატეგორიის სურათი</label>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="w-32 h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 relative group">
                  <img src={imagePreview} alt="category" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1 space-y-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    if (f) {
                      if (f.size > 5 * 1024 * 1024) { toast({ title: "ფაილი ძალიან დიდია (მაქს 5MB)", variant: "destructive" }); return; }
                      setImageFile(f);
                      setImagePreview(URL.createObjectURL(f));
                    }
                  }}
                />
                <button type="button" onClick={() => imageInputRef.current?.click()} className="px-4 py-2 border border-[#57c5cf] text-[#57c5cf] rounded-xl text-sm font-bold hover:bg-[#57c5cf]/5 flex items-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" /> სურათის ატვირთვა
                </button>
                <p className="text-xs text-gray-400">რეკომენდებული: 600x400px, მაქს 5MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-gray-700">Manual Admin ID (Optional Override)</label>
             <input type="number" name="admin_id" defaultValue={currentCategory?.admin_id || 0} className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white transition-colors" />
          </div>

          <div className="grid md:grid-cols-3 gap-4 border-t pt-4">
             <div className="space-y-2">
               <label className="block text-xs font-bold text-gray-500">Title (KA)</label>
               <input name="name_ka" defaultValue={translations[`cat_${currentCategory?.slug}`]?.ka} className="w-full p-2 border rounded-lg" placeholder="სახელი" />
             </div>
             <div className="space-y-2">
               <label className="block text-xs font-bold text-gray-500">Title (EN)</label>
               <input name="name_en" defaultValue={translations[`cat_${currentCategory?.slug}`]?.en} className="w-full p-2 border rounded-lg" placeholder="Name" />
             </div>
             <div className="space-y-2">
               <label className="block text-xs font-bold text-gray-500">Title (RU)</label>
               <input name="name_ru" defaultValue={translations[`cat_${currentCategory?.slug}`]?.ru} className="w-full p-2 border rounded-lg" placeholder="Имя" />
             </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t">
             <label className="flex items-center gap-2 cursor-pointer">
               <input type="checkbox" name="is_active" defaultChecked={currentCategory?.is_active ?? true} className="w-5 h-5 rounded text-[#57c5cf] focus:ring-[#57c5cf]" />
               <span className="text-sm font-bold text-gray-700">Active</span>
             </label>
             <div className="flex-grow"></div>
             <Button type="submit" className="bg-[#57c5cf] hover:bg-[#4bc0cb] px-8 rounded-xl gap-2 h-12" disabled={saving}>
               {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} შენახვა
             </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <Helmet><title>Admin - Categories</title></Helmet>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-heading font-bold text-gray-800">კატეგორიები</h1>
        <div className="flex gap-2">
           <Button variant="outline" onClick={fetchData} className="gap-2">
             <RefreshCw className="w-4 h-4" /> განახლება
           </Button>
           <Button onClick={() => openEdit(null)} className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 rounded-xl">
             <Plus className="w-5 h-5" /> ახალი კატეგორია
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 w-16 text-center font-heading text-xs text-gray-400">#</th>
              <th className="p-4 font-heading text-sm text-gray-500">ხატულა</th>
              <th className="p-4 font-heading text-sm text-gray-500">სახელი / Slug</th>
              <th className="p-4 font-heading text-sm text-gray-500">პროდუქტები</th>
              <th className="p-4 font-heading text-sm text-gray-500">სტატუსი</th>
              <th className="p-4 font-heading text-sm text-gray-500 text-right">მოქმედება</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat, index) => {
              const iconUrl = cat.icon_url === "https://i.postimg.cc/V6QnBCQj/10-ortopediuli-balishi.png"
                  ? "https://i.postimg.cc/RVfHjqNm/vector-design-soap-icon-style.png"
                  : cat.icon_url;

              return (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                <td className="p-4 text-center text-gray-400 font-mono text-xs">
                  {cat.admin_id || index + 1}
                </td>
                <td className="p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: (cat.color || '#57c5cf') + '20' }}>
                     {iconUrl && <img src={iconUrl} alt="" className="w-5 h-5 object-contain" />}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-gray-800">{translations[`cat_${cat.slug}`]?.ka || cat.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{cat.slug}</div>
                </td>
                <td className="p-4">
                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                     {productCounts[cat.id] || 0} Products
                   </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {cat.is_hidden && <span className="ml-2 text-xs text-gray-400">(Hidden)</span>}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col mr-2">
                      <button onClick={() => moveCategory(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30">▲</button>
                      <button onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30">▼</button>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(cat)} className="hover:bg-blue-50 hover:text-blue-600 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteCategory(cat.id)} className="hover:bg-red-50 hover:text-red-600 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {categories.length === 0 && !loading && (
           <div className="p-12 text-center text-gray-400">კატეგორიები არ არის დამატებული</div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;