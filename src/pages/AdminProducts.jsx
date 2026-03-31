import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Trash2, Edit2, Home, Package, Eye, EyeOff, Search, Filter, X, Tag, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orphanedCount, setOrphanedCount] = useState(0);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection State
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Toggle Hide Confirm
  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [productToToggle, setProductToToggle] = useState(null);

  // Duplication State
  const [isDuplicating, setIsDuplicating] = useState(false);

  const { toast } = useToast();
  const { translations } = useLanguage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, product_attributes(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order')
      ]);

      if (prodRes.error) throw prodRes.error;
      if (catRes.error) throw catRes.error;

      setProducts(prodRes.data);
      setCategories(catRes.data);
      
      const orphans = prodRes.data.filter(p => !p.category_id);
      setOrphanedCount(orphans.length);
      
    } catch (error) {
      console.error(error);
      toast({ title: "მონაცემების ჩატვირთვა ვერ მოხერხდა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if(!window.confirm("დარწმუნებული ხართ?")) return;
    try {
      await supabase.from('product_images').delete().eq('product_id', id);
      await supabase.from('product_attributes').delete().eq('product_id', id);
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
      toast({ title: "წაიშალა" });
    } catch (error) {
      toast({ title: "შეცდომა წაშლისას", variant: "destructive" });
    }
  };

  const duplicateProduct = async (productId) => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    toast({ title: "მიმდინარეობს დუბლირება...", description: "გთხოვთ დაელოდოთ" });

    try {
      // 1. Fetch Source Product
      const { data: sourceProduct, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (prodError) throw prodError;

      // 2. Fetch Attributes
      const { data: sourceAttributes, error: attrError } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('product_id', productId);

      if (attrError) throw attrError;

      // 3. Fetch Images
      const { data: sourceImages, error: imgError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId);

      if (imgError) throw imgError;

      // 4. Prepare New Product Data
      const { id, created_at, updated_at, ...productData } = sourceProduct;
      const newProductData = {
        ...productData,
        name: `${productData.name} (Copy)`,
        name_en: productData.name_en ? `${productData.name_en} (Copy)` : null,
        name_ru: productData.name_ru ? `${productData.name_ru} (Копия)` : null,
        is_hidden: true, // Keep copy hidden by default to avoid accidental publishing
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 5. Insert New Product
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([newProductData])
        .select()
        .single();

      if (insertError) throw insertError;

      // 6. Duplicate Attributes
      if (sourceAttributes && sourceAttributes.length > 0) {
        const newAttributes = sourceAttributes.map(attr => {
          const { id, created_at, product_id, ...attrData } = attr;
          return {
            ...attrData,
            product_id: newProduct.id,
            created_at: new Date().toISOString()
          };
        });
        
        const { error: attrInsertError } = await supabase
          .from('product_attributes')
          .insert(newAttributes);
          
        if (attrInsertError) throw attrInsertError;
      }

      // 7. Duplicate Images
      if (sourceImages && sourceImages.length > 0) {
        const newImages = sourceImages.map(img => {
          const { id, created_at, product_id, ...imgData } = img;
          return {
            ...imgData,
            product_id: newProduct.id,
            created_at: new Date().toISOString()
          };
        });

        const { error: imgInsertError } = await supabase
          .from('product_images')
          .insert(newImages);

        if (imgInsertError) throw imgInsertError;
      }
      
      // Also duplicate translations if they exist in the translations table (backward compatibility)
      // Note: We primarily use columns now, but checking table just in case
      // Fetching old translations by key pattern
      const { data: oldTranslations } = await supabase
         .from('translations')
         .select('*')
         .in('key', [`prod_name_${productId}`, `prod_desc_${productId}`]);
         
      if (oldTranslations && oldTranslations.length > 0) {
          const newTranslations = oldTranslations.map(t => {
             const newKey = t.key.replace(productId, newProduct.id);
             const { id, created_at, ...transData } = t;
             return { ...transData, key: newKey }; 
          });
          await supabase.from('translations').upsert(newTranslations, { onConflict: 'key' });
      }

      toast({ title: "პროდუქტი წარმატებით დუბლირდა", className: "bg-green-600 text-white border-none" });
      await fetchData(); // Refresh list

    } catch (error) {
      console.error("Duplication failed:", error);
      toast({ title: "დუბლირება ვერ მოხერხდა", description: error.message, variant: "destructive" });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleToggleHidden = async () => {
    if (!productToToggle) return;
    
    const newHiddenState = !productToToggle.is_hidden;
    
    try {
       const { data: { user } } = await supabase.auth.getUser();

       await supabase.from('products').update({ is_hidden: newHiddenState }).eq('id', productToToggle.id);
       
       // Audit Log
       await supabase.from('product_audit_logs').insert({
          product_id: productToToggle.id,
          action: newHiddenState ? 'hidden' : 'shown',
          admin_id: user?.id,
          reason: 'Quick toggle from list'
       });

       setProducts(products.map(p => p.id === productToToggle.id ? { ...p, is_hidden: newHiddenState } : p));
       toast({ title: newHiddenState ? "პროდუქტი დაიმალა" : "პროდუქტი გამოჩნდა" });
    } catch (err) {
       toast({ title: "სტატუსის განახლება ვერ მოხერხდა", variant: "destructive" });
    } finally {
       setShowHideConfirm(false);
       setProductToToggle(null);
    }
  };

  const openToggleConfirm = (product) => {
     setProductToToggle(product);
     setShowHideConfirm(true);
  };

  // Bulk Action Functions
  const toggleProductSelection = (id) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const performBulkDelete = async () => {
    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedProducts);
    let successCount = 0;

    for (const id of selectedIds) {
      try {
        await supabase.from('product_images').delete().eq('product_id', id);
        await supabase.from('product_attributes').delete().eq('product_id', id);
        await supabase.from('products').delete().eq('id', id);
        successCount++;
      } catch (err) {
        console.error(`Failed to delete ${id}`, err);
      }
    }

    toast({ title: `${successCount} პროდუქტი წაიშალა` });
    fetchData();
    setSelectedProducts(new Set());
    setIsBulkDeleting(false);
    setShowDeleteConfirm(false);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const filteredProducts = products.filter(p => {
    // 1. Category Filter
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
    
    // 2. Search Filter
    if (searchQuery) {
        const nameKA = p.name || translations[`prod_name_${p.id}`]?.ka || '';
        const nameEN = p.name_en || translations[`prod_name_${p.id}`]?.en || '';
        const nameLower = searchQuery.toLowerCase();
        
        return nameKA.toLowerCase().includes(nameLower) || nameEN.toLowerCase().includes(nameLower);
    }
    
    return true;
  });

  return (
    <div>
      <Helmet><title>ადმინ პანელი - პროდუქტები</title></Helmet>
      
      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
             <h3 className="text-xl font-bold mb-4 font-heading">წაშლის დადასტურება</h3>
             <p className="mb-6 text-gray-600">დარწმუნებული ხართ, რომ გსურთ {selectedProducts.size} პროდუქტის წაშლა? ამ მოქმედების გაუქმება შეუძლებელია.</p>
             <div className="flex justify-end gap-3">
               <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>გაუქმება</Button>
               <Button variant="destructive" onClick={performBulkDelete} disabled={isBulkDeleting}>
                 {isBulkDeleting ? 'იშლება...' : 'დადასტურება'}
               </Button>
             </div>
          </div>
        </div>
      )}

      {/* Hide Toggle Confirm Modal */}
      {showHideConfirm && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
               <h3 className="text-xl font-bold mb-4 font-heading">ხილვადობის შეცვლა</h3>
               <p className="mb-6 text-gray-600">
                  ნამდვილად გსურთ ამ პროდუქტის {productToToggle?.is_hidden ? 'გამოჩენა' : 'დამალვა'}?
               </p>
               <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowHideConfirm(false)}>გაუქმება</Button>
                  <Button onClick={handleToggleHidden} className="bg-[#57c5cf] hover:bg-[#4bc0cb]">
                     დადასტურება
                  </Button>
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">პროდუქტები</h1>
          <div className="flex gap-4 mt-2 items-center">
             <p className="text-sm text-gray-500 font-body">სულ: {products.length}</p>
             {orphanedCount > 0 && (
               <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                 {orphanedCount} კატეგორიის გარეშე
               </span>
             )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/">
            <Button variant="outline" className="gap-2 font-heading">
              <Home className="w-4 h-4" /> საიტზე გადასვლა
            </Button>
          </Link>
          <Link to="/admin/products/new">
            <Button className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 rounded-xl shadow-md font-heading">
               <Plus className="w-5 h-5" /> ახალი პროდუქტი
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center bg-gray-50/50">
           <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              
              {/* Category Dropdown */}
              <div className="relative">
                 <select 
                   value={selectedCategory} 
                   onChange={(e) => setSelectedCategory(e.target.value)}
                   className="w-full sm:w-64 p-2.5 pl-3 pr-8 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#57c5cf] bg-white appearance-none cursor-pointer"
                 >
                    <option value="all">ყველა კატეგორია ({products.length})</option>
                    {categories.map(cat => {
                       const count = products.filter(p => p.category_id === cat.id).length;
                       return (
                          <option key={cat.id} value={cat.id}>
                             {cat.name} ({count})
                          </option>
                       );
                    })}
                 </select>
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                    type="text" 
                    placeholder="ძებნა..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2.5 pl-9 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#57c5cf]"
                 />
              </div>

              {/* Clear Filters */}
              {(selectedCategory !== 'all' || searchQuery) && (
                 <Button 
                   variant="ghost" 
                   onClick={clearFilters}
                   className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                 >
                   <X className="w-4 h-4 mr-2" />
                   ფილტრის გასუფთავება
                 </Button>
              )}
           </div>

           <div className="text-sm font-bold text-gray-500">
              ნაპოვნია: <span className="text-[#57c5cf]">{filteredProducts.length}</span>
           </div>
        </div>

        {filteredProducts.length === 0 ? (
           <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">პროდუქტები ვერ მოიძებნა</h3>
              <p className="text-gray-500 mb-4">სცადეთ შეცვალოთ ფილტრები ან ძებნის პარამეტრები</p>
              <Button onClick={clearFilters} variant="outline">
                 ფილტრების გასუფთავება
              </Button>
           </div>
        ) : (
           <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12">
                    <input 
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-gray-300 text-[#57c5cf] focus:ring-[#57c5cf] cursor-pointer"
                    />
                  </th>
                  <th className="p-4 font-heading text-sm text-gray-500">სურათი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">დასახელება / ატრიბუტები</th>
                  <th className="p-4 font-heading text-sm text-gray-500">მარაგი</th>
                  <th className="p-4 font-heading text-sm text-gray-500">ფასი</th>
                  <th className="p-4 font-heading text-sm text-gray-500 text-right">მოქმედება</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(p => {
                  const cat = categories.find(c => c.id === p.category_id);
                  const isLowStock = p.manage_inventory && p.stock_quantity < 5;
                  const isOutOfStock = p.manage_inventory && p.stock_quantity === 0;
                  const isSelected = selectedProducts.has(p.id);
                  const attributes = p.product_attributes || [];
                  
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''} ${p.is_hidden ? 'bg-gray-50' : ''}`}>
                      <td className="p-4">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductSelection(p.id)}
                          className="w-5 h-5 rounded border-gray-300 text-[#57c5cf] focus:ring-[#57c5cf] cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden border border-gray-100 relative group">
                          <img src={p.image_url} alt="" className={`w-full h-full object-cover transition-opacity ${p.is_hidden ? 'opacity-50' : ''}`} />
                          {p.is_hidden && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <EyeOff className="w-5 h-5 text-white drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 max-w-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold text-gray-800 text-base ${p.is_hidden ? 'text-gray-400' : ''}`}>
                              {p.name || translations[`prod_name_${p.id}`]?.ka || 'Product Name'}
                          </span>
                          {p.is_hidden && (
                              <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded border border-gray-300 uppercase tracking-wider">
                                Hidden
                              </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {attributes.length > 0 ? (
                             attributes.slice(0, 4).map((attr, idx) => (
                                <span 
                                  key={idx} 
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                     attr.attribute_type === 'dropdown' 
                                       ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                       : 'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}
                                  title={`${attr.attribute_name}: ${attr.attribute_value}`}
                                >
                                  {attr.attribute_value}
                                </span>
                             ))
                          ) : (
                             <span className="text-xs text-gray-400 italic">ატრიბუტების გარეშე</span>
                          )}
                          {attributes.length > 4 && (
                             <span className="text-[10px] text-gray-400">+{attributes.length - 4}</span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 font-medium">
                          {cat?.name || <span className="text-red-400">კატეგორიის გარეშე</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        {!p.manage_inventory ? (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                              ულიმიტო
                            </span>
                        ) : (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                              isOutOfStock 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : isLowStock 
                                  ? 'bg-orange-50 text-orange-600 border-orange-100' 
                                  : 'bg-green-50 text-green-600 border-green-100'
                            }`}>
                              {p.stock_quantity} ცალი
                            </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[#57c5cf] font-bold text-base">₾{p.price}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => duplicateProduct(p.id)}
                            title="დუბლირება"
                            className="hover:bg-purple-50 hover:text-purple-600"
                            disabled={isDuplicating}
                          >
                             <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => openToggleConfirm(p)}
                            title={p.is_hidden ? "გამოჩენა" : "დამალვა"}
                            className="hover:bg-gray-100"
                          >
                            {p.is_hidden ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-600" />}
                          </Button>
                          <Link to={`/admin/products/${p.id}`}>
                            <Button size="icon" variant="ghost" className="hover:bg-blue-50 hover:text-blue-600">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                             size="icon" 
                             variant="ghost" 
                             onClick={() => deleteProduct(p.id)}
                             className="hover:bg-red-50 hover:text-red-500"
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
           </div>
        )}
        
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
           <div className="text-sm text-gray-500 font-medium">
              {selectedProducts.size > 0 ? `${selectedProducts.size} მონიშნულია` : 'არ არის მონიშნული'}
           </div>
           <div className="flex gap-3">
              <Button 
                 variant="outline" 
                 onClick={toggleSelectAll} 
                 disabled={filteredProducts.length === 0}
                 className="text-xs h-9"
              >
                 {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 ? 'გაუქმება' : 'ყველას მონიშვნა'}
              </Button>
              <Button 
                 variant="destructive" 
                 onClick={() => setShowDeleteConfirm(true)}
                 disabled={selectedProducts.size === 0}
                 className="text-xs h-9"
              >
                 მონიშნულის წაშლა
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;