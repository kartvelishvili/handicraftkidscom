import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Edit2, Save, X, List, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const AdminCategoryAttributes = () => {
  const { toast } = useToast();
  const { translations = {} } = useLanguage();
  
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Language tab state for modal
  const [activeTab, setActiveTab] = useState('ka');

  // Form State
  const [formData, setFormData] = useState({
    attribute_name: '',
    name_en: '',
    name_ru: '',
    attribute_type: 'dropdown',
    is_required: false,
    display_order: 1,
    options: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchAttributes(selectedCategory.id);
    } else {
      setAttributes([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      
      if (data) {
        setCategories(data);
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ 
        title: "კატეგორიების ჩატვირთვა ვერ მოხერხდა", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async (categoryId) => {
    setAttributesLoading(true);
    try {
      const { data, error } = await supabase
        .from('category_attributes')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order');
        
      if (error) throw error;
      if (data) setAttributes(data);
    } catch (error) {
      console.error("Error fetching attributes:", error);
      toast({ 
        title: "ატრიბუტების ჩატვირთვა ვერ მოხერხდა", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setAttributesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setOperationLoading(true);

    try {
      let parsedOptions = [];
      if (['dropdown', 'checkbox'].includes(formData.attribute_type)) {
        try {
          if (formData.options.trim().startsWith('[') && formData.options.trim().endsWith(']')) {
             parsedOptions = JSON.parse(formData.options);
          } else {
             parsedOptions = formData.options.split(',').map(s => s.trim()).filter(Boolean);
          }
        } catch (err) {
          toast({ 
            title: "არასწორი ფორმატი", 
            description: "გთხოვთ გამოიყენოთ JSON ან მძიმით გამოყოფილი ტექსტი (მაგ: XS, S, M)", 
            variant: "destructive" 
          });
          setOperationLoading(false);
          return;
        }
      }

      const payload = {
        category_id: selectedCategory.id,
        attribute_name: formData.attribute_name, // KA name is stored in attribute_name
        name_en: formData.name_en,
        name_ru: formData.name_ru,
        attribute_type: formData.attribute_type,
        is_required: formData.is_required,
        display_order: parseInt(formData.display_order),
        options: parsedOptions
      };

      if (editingAttribute) {
        const { error } = await supabase.from('category_attributes').update(payload).eq('id', editingAttribute.id);
        if (error) throw error;
        toast({ 
          title: "წარმატება",
          description: "ატრიბუტი წარმატებით განახლდა",
          className: "bg-[#57c5cf] text-white"
        });
      } else {
        const { error } = await supabase.from('category_attributes').insert(payload);
        if (error) throw error;
        toast({ 
          title: "წარმატება",
          description: "ახალი ატრიბუტი წარმატებით დაემატა",
          className: "bg-[#57c5cf] text-white"
        });
      }

      setIsModalOpen(false);
      fetchAttributes(selectedCategory.id);
      resetForm();

    } catch (error) {
      console.error(error);
      toast({ 
        title: "შეცდომა შენახვისას", 
        description: error.message || "დაფიქსირდა ტექნიკური ხარვეზი", 
        variant: "destructive" 
      });
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('ნამდვილად გსურთ ამ ატრიბუტის წაშლა? ეს ქმედება შეუქცევადია.')) {
      setOperationLoading(true);
      try {
        const { error } = await supabase.from('category_attributes').delete().eq('id', id);
        if (error) throw error;
        
        fetchAttributes(selectedCategory.id);
        toast({ 
          title: "წარმატება",
          description: "ატრიბუტი წარმატებით წაიშალა",
          className: "bg-[#57c5cf] text-white"
        });
      } catch (error) {
        toast({ 
          title: "შეცდომა წაშლისას", 
          description: error.message,
          variant: "destructive" 
        });
      } finally {
        setOperationLoading(false);
      }
    }
  };

  const openEdit = (attr) => {
    setEditingAttribute(attr);
    setFormData({
      attribute_name: attr.attribute_name || '',
      name_en: attr.name_en || '',
      name_ru: attr.name_ru || '',
      attribute_type: attr.attribute_type,
      is_required: attr.is_required,
      display_order: attr.display_order,
      options: Array.isArray(attr.options) ? JSON.stringify(attr.options) : (attr.options || '')
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingAttribute(null);
    setFormData({
      attribute_name: '',
      name_en: '',
      name_ru: '',
      attribute_type: 'dropdown',
      is_required: false,
      display_order: attributes.length + 1,
      options: ''
    });
    setActiveTab('ka');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Helmet><title>Category Attributes - Admin</title></Helmet>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-800">ატრიბუტების მართვა</h1>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar: Categories */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
            კატეგორიები
            {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
          <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors ${selectedCategory?.id === cat.id ? 'bg-[#57c5cf]/10 text-[#57c5cf] border-r-4 border-[#57c5cf]' : 'text-gray-600'}`}
              >
                {cat.name}
              </button>
            ))}
            {!loading && categories.length === 0 && (
               <div className="p-4 text-sm text-gray-400 text-center">კატეგორიები ვერ მოიძებნა</div>
            )}
          </div>
        </div>

        {/* Main: Attributes List */}
        <div className="md:col-span-3">
          {selectedCategory ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-xl font-bold font-heading text-gray-800">{selectedCategory.name}</h2>
                   <p className="text-sm text-gray-500">ამ კატეგორიის ატრიბუტები</p>
                </div>
                <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-[#57c5cf] hover:bg-[#4bc0cb] shadow-md shadow-[#57c5cf]/20">
                  <Plus className="w-4 h-4 mr-2" /> ატრიბუტის დამატება
                </Button>
              </div>

              {attributesLoading ? (
                 <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-10 h-10 animate-spin text-[#57c5cf] mb-2" />
                    <p className="text-gray-400 text-sm">იტვირთება...</p>
                 </div>
              ) : attributes.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <List className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">ატრიბუტები არ არის დამატებული</p>
                  <p className="text-gray-400 text-sm mt-1">დააჭირეთ ღილაკს "ატრიბუტის დამატება"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                        <th className="py-3 pl-3 rounded-l-lg">რიგი</th>
                        <th className="py-3">სახელი (KA/EN/RU)</th>
                        <th className="py-3">ტიპი</th>
                        <th className="py-3">სავალდებულო</th>
                        <th className="py-3">ოფციები</th>
                        <th className="py-3 text-right pr-3 rounded-r-lg">მოქმედება</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attributes.map((attr) => (
                        <tr key={attr.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="py-3 pl-3 text-sm text-gray-600 font-mono">{attr.display_order}</td>
                          <td className="py-3 font-bold text-gray-800">
                             <div>{attr.attribute_name}</div>
                             <div className="text-xs font-normal text-gray-500">
                                {attr.name_en && <span className="mr-2">EN: {attr.name_en}</span>}
                                {attr.name_ru && <span>RU: {attr.name_ru}</span>}
                             </div>
                          </td>
                          <td className="py-3">
                            <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border border-blue-100">
                              {attr.attribute_type}
                            </span>
                          </td>
                          <td className="py-3">
                             {attr.is_required ? (
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                                 კი
                               </span>
                             ) : (
                               <span className="text-gray-400 text-xs font-medium">არა</span>
                             )}
                          </td>
                          <td className="py-3 max-w-xs text-xs text-gray-600">
                            {(attr.attribute_type === 'dropdown' || attr.attribute_type === 'checkbox') ? (
                               <div className="flex flex-wrap gap-1">
                                  {Array.isArray(attr.options) ? (
                                    attr.options.slice(0, 3).map((opt, i) => (
                                      <span key={i} className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">{opt}</span>
                                    ))
                                  ) : attr.options}
                                  {Array.isArray(attr.options) && attr.options.length > 3 && (
                                    <span className="text-gray-400 px-1">...</span>
                                  )}
                                </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 text-right pr-3">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => openEdit(attr)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors" title="რედაქტირება">
                                 <Edit2 className="w-4 h-4" />
                               </button>
                               <button onClick={() => handleDelete(attr.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="წაშლა">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4 text-gray-200" />
              <h3 className="font-bold text-lg text-gray-600">აირჩიეთ კატეგორია</h3>
              <p className="text-gray-400">აირჩიეთ კატეგორია მარცხენა მენიუდან ატრიბუტების სამართავად</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border border-gray-100 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold font-heading text-gray-800">{editingAttribute ? 'ატრიბუტის რედაქტირება' : 'ახალი ატრიბუტი'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-5">
                {/* Language Tabs */}
                <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-lg">
                   <button 
                     type="button" 
                     onClick={() => setActiveTab('ka')} 
                     className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'ka' ? 'bg-white text-[#57c5cf] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     KA 🇬🇪
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setActiveTab('en')} 
                     className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'en' ? 'bg-white text-[#57c5cf] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     EN 🇺🇸
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setActiveTab('ru')} 
                     className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'ru' ? 'bg-white text-[#57c5cf] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     RU 🇷🇺
                   </button>
                </div>

                <div className="min-h-[80px]">
                   {activeTab === 'ka' && (
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1.5">ატრიბუტის სახელი (KA)</label>
                       <input 
                         required 
                         value={formData.attribute_name}
                         onChange={e => setFormData({...formData, attribute_name: e.target.value})}
                         className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:border-[#57c5cf] focus:outline-none transition-all"
                         placeholder="მაგ: ზომა"
                       />
                     </div>
                   )}
                   {activeTab === 'en' && (
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1.5">Attribute Name (EN)</label>
                       <input 
                         value={formData.name_en}
                         onChange={e => setFormData({...formData, name_en: e.target.value})}
                         className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:border-[#57c5cf] focus:outline-none transition-all"
                         placeholder="e.g. Size"
                       />
                     </div>
                   )}
                   {activeTab === 'ru' && (
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-1.5">Attribute Name (RU)</label>
                       <input 
                         value={formData.name_ru}
                         onChange={e => setFormData({...formData, name_ru: e.target.value})}
                         className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:border-[#57c5cf] focus:outline-none transition-all"
                         placeholder="Например: Размер"
                       />
                     </div>
                   )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1.5">ტიპი</label>
                     <div className="relative">
                        <select 
                           value={formData.attribute_type}
                           onChange={e => setFormData({...formData, attribute_type: e.target.value})}
                           className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:border-[#57c5cf] focus:outline-none appearance-none cursor-pointer transition-all"
                        >
                           <option value="dropdown">ჩამოსაშლელი (Dropdown)</option>
                           <option value="checkbox">მონიშვნა (Checkbox/Multi)</option>
                           <option value="text">ტექსტური (Input)</option>
                           <option value="info">ინფო (Info)</option>
                        </select>
                     </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-1.5">რიგი</label>
                     <input 
                       type="number"
                       value={formData.display_order}
                       onChange={e => setFormData({...formData, display_order: e.target.value})}
                       className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:border-[#57c5cf] focus:outline-none transition-all"
                     />
                   </div>
                </div>

                {['dropdown', 'checkbox'].includes(formData.attribute_type) && (
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <label className="block text-sm font-bold text-gray-700 mb-1">ოფციები</label>
                      <p className="text-xs text-gray-500 mb-2">გამოყავით მძიმით (მაგ: S, M, L)</p>
                      <textarea 
                        rows="3"
                        value={formData.options}
                        onChange={e => setFormData({...formData, options: e.target.value})}
                        className="w-full p-3 border rounded-xl bg-white focus:border-[#57c5cf] focus:outline-none font-mono text-sm"
                        placeholder='"XS", "S", "M"'
                      />
                   </div>
                )}

                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                   <div className="relative flex items-center">
                     <input 
                       type="checkbox"
                       checked={formData.is_required}
                       onChange={e => setFormData({...formData, is_required: e.target.checked})}
                       className="w-5 h-5 text-[#57c5cf] rounded border-gray-300 focus:ring-[#57c5cf]"
                     />
                   </div>
                   <span className="font-bold text-gray-700 text-sm">სავალდებულო შესავსები ველი</span>
                </label>

                <div className="pt-4 flex gap-3 border-t border-gray-100 mt-2">
                   <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 rounded-xl hover:bg-gray-100">
                      გაუქმება
                   </Button>
                   <Button 
                      type="submit" 
                      className="flex-1 bg-[#57c5cf] hover:bg-[#4bc0cb] py-6 rounded-xl text-white shadow-lg shadow-[#57c5cf]/20 font-bold"
                      disabled={operationLoading}
                   >
                      {operationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingAttribute ? 'განახლება' : 'დამატება')}
                   </Button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategoryAttributes;