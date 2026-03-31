import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import ProductFilters from '@/components/ProductFilters';
import { getProductsByFilters } from '@/utils/productFilterUtils';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { translations } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState({});

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await getProductsByFilters({
         categoryId: null, // Global search across categories
         selectedAttributes: currentFilters,
         searchQuery: query, // Although utility handles text filter lightly, we'll verify matches
         limit: 100
      });
        
      if (data) setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, [query, currentFilters]);

  // Client side fallback for text search on top of attribute filtering
  const filteredProducts = products.filter(product => {
    if (!query) return true;
    const name = translations[`prod_name_${product.id}`]?.ka || '';
    const desc = translations[`prod_desc_${product.id}`]?.ka || '';
    const searchLower = query.toLowerCase();
    
    return name.toLowerCase().includes(searchLower) || 
           desc.toLowerCase().includes(searchLower);
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <Helmet>
        <title>{`ძიება: ${query} - Handicraft`}</title>
      </Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800 mb-4">
          ძიების შედეგები: <span className="text-[#57c5cf]">"{query}"</span>
        </h1>
        <p className="text-gray-500 font-body">
          {loading ? 'იტვირთება...' : `ნაპოვნია ${filteredProducts.length} პროდუქტი`}
        </p>
      </div>
      
      {/* Note: Filters might be less useful in global search if attributes differ widely, 
          but if search returns mostly "Bedding", then bedding attributes will appear 
          if we dynamically set category context. 
          For now, we disable category-specific filters in global search OR 
          we need a category selector in the filters. 
          ProductFilters handles "all" category which hides attributes, so it just acts as category navigation.
      */}
      <div className="mb-8">
          <ProductFilters 
             currentCategoryId="all" // Or pass null to hide specific attributes initially
             onFilterChange={setCurrentFilters} 
             initialFilters={currentFilters}
          />
      </div>

      {loading ? (
         <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#57c5cf]"></div>
         </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => {
              const name = translations[`prod_name_${product.id}`]?.ka || 'Product';
              const cardAttributes = product.product_attributes?.slice(0, 2) || [];
              
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link to={`/product/${product.id}`} className="group block bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <img 
                        src={product.image_url} 
                        alt={name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <button 
                        onClick={(e) => { e.preventDefault(); toast({ title: "დაემატა რჩეულებში ❤️" }); }}
                        className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow-sm hover:bg-[#f292bc] hover:text-white transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="mb-2">
                         <h3 className="font-heading font-bold text-gray-800 text-sm md:text-base group-hover:text-[#57c5cf] transition-colors line-clamp-2">{name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1 h-5 overflow-hidden">
                              {cardAttributes.map((attr, idx) => (
                                  <span key={idx} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                    {attr.attribute_name}: {attr.attribute_value}
                                  </span>
                              ))}
                          </div>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-lg font-heading font-bold" style={{ color: '#f292bc' }}>₾{product.price}</span>
                        <Button 
                          onClick={(e) => { e.preventDefault(); addToCart(product); }}
                          size="icon"
                          className="rounded-full hover:scale-110 transition-transform shadow-md h-8 w-8"
                          style={{ backgroundColor: '#57c5cf' }}
                        >
                          <ShoppingCart className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-gray-600 mb-2">სამწუხაროდ, ვერაფერი მოიძებნა</h2>
          <Button onClick={() => window.location.href='/category/all'} className="bg-[#57c5cf] rounded-full px-6">
            ყველა პროდუქტის ნახვა
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;