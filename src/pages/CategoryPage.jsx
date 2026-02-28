import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, ShoppingCart, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import ProductFilters from '@/components/ProductFilters';
import AttributeDisplay from '@/components/AttributeDisplay';
import CategoryAttributeFilter from '@/components/CategoryAttributeFilter';

const CategoryPage = () => {
  const { categoryName } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { translations, language } = useLanguage();
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 9;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentCategoryData, setCurrentCategoryData] = useState(null);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stores selected attribute filters: { "Color": ["Red", "Blue"], "Size": ["M"] }
  const [selectedAttributeFilters, setSelectedAttributeFilters] = useState({});

  const decodedParam = decodeURIComponent(categoryName || 'all');

  useEffect(() => {
    // Initial load of category metadata (needed for menu and title)
    const fetchMetadata = async () => {
      console.log("Fetching category metadata for:", decodedParam);
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_hidden', false)
        .order('sort_order');
      
      if (categoriesData) setCategories(categoriesData);

      let targetCategoryObj = null;

      if (decodedParam !== 'all') {
        const matchedById = categoriesData?.find(c => c.id === decodedParam);
        const matchedBySlug = categoriesData?.find(c => c.slug === decodedParam);

        if (matchedById) targetCategoryObj = matchedById;
        else if (matchedBySlug) targetCategoryObj = matchedBySlug;

        if (targetCategoryObj) {
           setCurrentCategoryData(targetCategoryObj);
        }
      } else {
        setCurrentCategoryData({ name: 'ყველა კატეგორია', slug: 'all', id: 'all' });
      }
    };

    fetchMetadata();
  }, [decodedParam]);

  // Fetch Category Attributes whenever current category changes
  useEffect(() => {
    const fetchAttributes = async () => {
      if (!currentCategoryData) return;
      
      let query = supabase.from('category_attributes').select('*').order('display_order');
      
      if (currentCategoryData.id !== 'all') {
         query = query.eq('category_id', currentCategoryData.id);
      }
      
      const { data } = await query;
      if (data) setCategoryAttributes(data);
      else setCategoryAttributes([]); // Clear if no attributes
    };

    fetchAttributes();
    // Reset filters when category changes
    setSelectedAttributeFilters({});
  }, [currentCategoryData]);

  useEffect(() => {
    // Fetch products whenever filters or category changes
    const loadProducts = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('products')
          .select('*, product_attributes(*)')
          .eq('is_hidden', false);

        if (currentCategoryData && currentCategoryData.id !== 'all') {
            query = query.eq('category_id', currentCategoryData.id);
        }

        const { data: allProducts, error } = await query;
        
        if (error) throw error;
        
        let filteredProducts = allProducts || [];

        // Apply Client-Side Attribute Filtering
        // A product must match ALL selected filter keys (AND logic between attributes)
        // A product matches a key if it has ANY of the selected values (OR logic within attribute)
        
        const filterKeys = Object.keys(selectedAttributeFilters);
        
        if (filterKeys.length > 0) {
           filteredProducts = filteredProducts.filter(product => {
              const productAttrs = product.product_attributes || [];
              
              return filterKeys.every(attrName => {
                 const selectedValues = selectedAttributeFilters[attrName];
                 if (!selectedValues || selectedValues.length === 0) return true;
                 
                 // Find if product has this attribute
                 // Note: we match by attribute_name which is stored in Georgian/Default key
                 const productAttr = productAttrs.find(pa => pa.attribute_name === attrName);
                 
                 if (!productAttr) return false;
                 
                 // Check if product's attribute value is in selected values
                 // For now assuming exact match on value string
                 // Multilingual values might need handling if we filter by ID instead of value string in future
                 return selectedValues.includes(productAttr.attribute_value);
              });
           });
        }

        console.log("Products Loaded:", filteredProducts.length);
        setProducts(filteredProducts);

      } catch (err) {
        console.error("Error loading products:", err);
        toast({ title: "Failed to load products", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (currentCategoryData || decodedParam === 'all') {
        loadProducts();
    }
  }, [currentCategoryData, selectedAttributeFilters, decodedParam]);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const displayProducts = sortedProducts.slice(0, page * itemsPerPage);
  const hasMore = displayProducts.length < sortedProducts.length;

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const getCategoryName = (cat) => {
      if(!cat) return '';
      if(cat.id === 'all') return language === 'en' ? 'All Products' : language === 'ru' ? 'Все продукты' : 'ყველა პროდუქტი';
      
      const translationKey = `cat_${cat.slug}`;
      let name = cat.name || cat.slug;
      if (language === 'en') name = translations?.[translationKey]?.en || name;
      if (language === 'ru') name = translations?.[translationKey]?.ru || name;
      if (language === 'ka') name = translations?.[translationKey]?.ka || name;
      return name;
  };

  const currentCategoryName = currentCategoryData 
      ? getCategoryName(currentCategoryData)
      : (language === 'en' ? 'Products' : language === 'ru' ? 'Продукты' : 'პროდუქცია');

  const activeFilterCount = Object.keys(selectedAttributeFilters).length;

  return (
    <>
      <Helmet>
        <title>{`${currentCategoryName} - Handicraft`}</title>
      </Helmet>

      {/* Filter Modal */}
      <CategoryAttributeFilter 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        attributes={categoryAttributes}
        selectedAttributes={selectedAttributeFilters}
        onChange={setSelectedAttributeFilters}
        onClear={() => setSelectedAttributeFilters({})}
      />

      <section className="bg-[#57c5cf]/10 py-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="#57c5cf" />
          </svg>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-gray-800">
              {currentCategoryName}
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-600 font-body">
              <Link to="/" className="hover:text-[#57c5cf]">{language === 'en' ? 'Home' : language === 'ru' ? 'Главная' : 'მთავარი'}</Link>
              <span>/</span>
              <span className="text-[#f292bc] font-bold">{language === 'en' ? 'Categories' : language === 'ru' ? 'Категории' : 'კატეგორიები'}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="lg:hidden mb-4">
            <Button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              variant="outline"
              className="w-full flex justify-between items-center border-2 border-[#57c5cf] text-[#57c5cf]"
            >
              <span className="flex items-center gap-2 font-heading"><Filter className="w-4 h-4" /> {language === 'en' ? 'Categories' : language === 'ru' ? 'Категории' : 'კატეგორიები'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          <aside className={`lg:w-1/4 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 sticky top-24">
              <h3 className="font-heading font-bold text-xl mb-6 pb-4 border-b border-gray-100" style={{ color: '#57c5cf' }}>
                {language === 'en' ? 'Categories' : language === 'ru' ? 'Категории' : 'კატეგორიები'}
              </h3>
              <ul className="space-y-3">
                 <li key="all">
                    <Link 
                      to="/category/all"
                      className={`group flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 font-body text-sm font-bold ${
                        decodedParam === 'all'
                          ? 'bg-gray-50 text-[#f292bc] shadow-sm' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#57c5cf] hover:pl-5'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${decodedParam === 'all' ? 'bg-[#57c5cf] w-3 h-3' : 'bg-gray-300'}`}></div>
                      <span className="flex-1">{language === 'en' ? 'All Categories' : language === 'ru' ? 'Все категории' : 'ყველა კატეგორია'}</span>
                    </Link>
                 </li>
                {categories.map((cat) => {
                  const isActive = currentCategoryData?.id === cat.id;
                  const catName = getCategoryName(cat);
                  
                  return (
                    <li key={cat.id}>
                      <Link 
                        to={`/category/${cat.id}`}
                        className={`group flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 font-body text-sm font-bold ${
                          isActive 
                            ? 'bg-gray-50 text-[#f292bc] shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-[#57c5cf] hover:pl-5'
                        }`}
                      >
                         <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-[#57c5cf] w-3 h-3' : 'bg-gray-300'}`}></div>
                        <span className="flex-1 line-clamp-1">{catName}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <main className="lg:w-3/4">
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                 {/* Filter Button */}
                 <Button 
                   onClick={() => setIsFilterModalOpen(true)}
                   className={`gap-2 font-heading shadow-md transition-all ${activeFilterCount > 0 ? 'bg-[#57c5cf] hover:bg-[#4bc0cb] text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                 >
                    <Filter className="w-4 h-4" /> 
                    {language === 'en' ? 'Filter' : language === 'ru' ? 'Фильтр' : 'ფილტრაცია'}
                    {activeFilterCount > 0 && (
                       <span className="bg-white text-[#57c5cf] w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold">
                          {activeFilterCount}
                       </span>
                    )}
                 </Button>

                 {activeFilterCount > 0 && (
                    <Button 
                       variant="ghost" 
                       size="sm"
                       onClick={() => setSelectedAttributeFilters({})}
                       className="text-red-500 hover:bg-red-50 hover:text-red-600 h-10 px-3"
                    >
                       <X className="w-4 h-4 mr-1" />
                       {language === 'en' ? 'Clear' : language === 'ru' ? 'Сброс' : 'გასუფთავება'}
                    </Button>
                 )}
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-sm text-gray-500 font-body whitespace-nowrap">{language === 'en' ? 'Sort by:' : language === 'ru' ? 'Сортировка:' : 'დალაგება:'}</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:border-[#57c5cf] cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <option value="newest">{language === 'en' ? 'Newest' : language === 'ru' ? 'Новые' : 'ახალი დამატებული'}</option>
                  <option value="price-low">{language === 'en' ? 'Price: Low to High' : language === 'ru' ? 'Цена: по возрастанию' : 'ფასი: დაბლიდან მაღლა'}</option>
                  <option value="price-high">{language === 'en' ? 'Price: High to Low' : language === 'ru' ? 'Цена: по убыванию' : 'ფასი: მაღლიდან დაბლა'}</option>
                </select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
               <div className="flex flex-wrap gap-2 mb-6">
                  {Object.entries(selectedAttributeFilters).map(([attrName, values]) => (
                     values.map(val => (
                        <span key={`${attrName}-${val}`} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium border border-gray-200">
                           {val}
                           <button onClick={() => {
                              const newVals = values.filter(v => v !== val);
                              const newFilters = { ...selectedAttributeFilters };
                              if(newVals.length) newFilters[attrName] = newVals;
                              else delete newFilters[attrName];
                              setSelectedAttributeFilters(newFilters);
                           }}>
                              <X className="w-3 h-3 hover:text-red-500" />
                           </button>
                        </span>
                     ))
                  ))}
               </div>
            )}

            <div className="mb-4 text-sm text-gray-500 font-medium">
                {language === 'en' ? 'Found' : language === 'ru' ? 'Найдено' : 'ნაპოვნია'}: <span className="text-[#57c5cf] font-bold">{products.length}</span>
            </div>

            {loading ? (
               <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57c5cf]"></div>
               </div>
            ) : products.length === 0 ? (
               <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-600">{language === 'en' ? 'No products found' : language === 'ru' ? 'Продукты не найдены' : 'პროდუქტები ვერ მოიძებნა'}</h3>
                  <p className="text-gray-500">{language === 'en' ? 'Try changing filters' : language === 'ru' ? 'Попробуйте изменить фильтры' : 'სცადეთ შეცვალოთ ფილტრები'}</p>
                  <Button variant="outline" onClick={() => setSelectedAttributeFilters({})} className="mt-4">
                     {language === 'en' ? 'Clear All Filters' : language === 'ru' ? 'Очистить фильтры' : 'ფილტრების გასუფთავება'}
                  </Button>
               </div>
            ) : (
               <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  <AnimatePresence>
                    {displayProducts.map((product) => {
                      // Determine product name based on language
                      let displayName = product.name;
                      if (language === 'en' && product.name_en) displayName = product.name_en;
                      if (language === 'ru' && product.name_ru) displayName = product.name_ru;
                      // Fallback to translations table if columns empty
                      if (!displayName) displayName = translations[`prod_name_${product.id}`]?.ka || `Product ${product.id.slice(0,4)}`;

                      return (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Link to={`/product/${product.id}`} className="group block bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col">
                          <div className="relative aspect-square overflow-hidden bg-gray-100">
                            {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={displayName} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">No Image</div>
                            )}
                            
                            {product.is_new && (
                              <div className="absolute top-3 left-3 bg-[#57c5cf] text-white text-xs font-heading font-bold px-3 py-1 rounded-full shadow-md">
                                {language === 'en' ? 'NEW' : language === 'ru' ? 'НОВОЕ' : 'ახალი'}
                              </div>
                            )}
                          </div>
                          
                          <div className="p-5 flex flex-col flex-grow">
                            <div className="mb-2">
                               <h3 className="font-heading font-bold text-gray-800 text-lg group-hover:text-[#57c5cf] transition-colors line-clamp-1">
                                  {displayName}
                               </h3>
                               
                               {/* Attributes Display */}
                               <div className="mt-2 h-6">
                                  {product.product_attributes && product.product_attributes.length > 0 && (
                                    <AttributeDisplay initialAttributes={product.product_attributes} compact language={language} />
                                  )}
                               </div>
                            </div>
                            
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-xl font-heading font-bold" style={{ color: '#f292bc' }}>₾{product.price}</span>
                              <Button 
                                onClick={(e) => { e.preventDefault(); addToCart(product); }}
                                size="icon"
                                className="rounded-full hover:scale-110 transition-transform shadow-md"
                                style={{ backgroundColor: '#57c5cf' }}
                              >
                                <ShoppingCart className="w-4 h-4 text-white" />
                              </Button>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    )})}
                  </AnimatePresence>
                </div>

                {hasMore && (
                  <div className="text-center pt-8 border-t border-gray-100">
                    <Button 
                      onClick={handleLoadMore}
                      variant="outline"
                      className="px-8 py-6 rounded-full text-lg font-heading border-2 hover:bg-[#57c5cf] hover:text-white hover:border-[#57c5cf] transition-all"
                      style={{ borderColor: '#57c5cf', color: '#57c5cf' }}
                    >
                      {language === 'en' ? 'Load More' : language === 'ru' ? 'Загрузить еще' : 'მეტის ნახვა'}
                    </Button>
                  </div>
                )}
               </>
            )}

          </main>
        </div>
      </div>
    </>
  );
};

export default CategoryPage;