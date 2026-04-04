import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Star, ShoppingCart, Heart, Minus, Plus, Share2, Package, ArrowLeft, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import AttributeDisplay from '@/components/AttributeDisplay';
import { trackViewItem, trackAddToCart } from '@/utils/analytics';

// Normalize options: support both old format (["S","M"]) and new format ([{value:"S",price:85,value_en,value_ru}])
const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    if (typeof opt === 'string') return { value: opt, price: null, value_en: null, value_ru: null };
    if (typeof opt === 'object' && opt !== null) return { 
      value: opt.value || '', 
      price: opt.price ?? null,
      value_en: opt.value_en || null,
      value_ru: opt.value_ru || null
    };
    return { value: String(opt), price: null, value_en: null, value_ru: null };
  });
};

const ProductDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { translations, language } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [productAttributes, setProductAttributes] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [selectedAttrName, setSelectedAttrName] = useState(null);
  const [selectedAttrPrice, setSelectedAttrPrice] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("[ProductDetail] Product ID from URL:", id);
        
        // Fetch Product
        const { data: productData, error } = await supabase
          .from('products')
          .select('*, categories(*)')
          .eq('id', id)
          .single();
          
        if (error) {
            console.error("[ProductDetail] API Error:", error);
            console.error("[ProductDetail] Error details:", JSON.stringify(error));
            throw error;
        }
        
        if (!productData) {
          console.error("[ProductDetail] No product data returned");
          throw new Error('Product not found');
        }
        
        setProduct(productData);

        // Fetch Images
        const { data: images } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', id)
          .order('sort_order');
        if (images) setAdditionalImages(images);

        // Fetch Attributes
        const { data: attrs } = await supabase
          .from('product_attributes')
          .select('*')
          .eq('product_id', id);
        if (attrs) setProductAttributes(attrs);

        // Fetch Category Attributes (for selectable options with prices)
        if (productData.category_id) {
          const { data: catAttrs } = await supabase
            .from('category_attributes')
            .select('*')
            .eq('category_id', productData.category_id)
            .order('display_order');
          if (catAttrs) setCategoryAttributes(catAttrs);
        }
      } catch (error) {
        console.error("ProductDetail Fetch Error:", error);
        toast({ title: "პროდუქტი ვერ მოიძებნა", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
        fetchData();
    }
  }, [id]);

  // Track product view — must be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (product) trackViewItem(product);
  }, [product?.id]);

  // Build merged attributes: product_attributes + category_attributes options for missing groups
  const mergedAttributes = React.useMemo(() => {
    if (!product) return [];
    // Start with product-specific attributes
    const result = [...productAttributes];
    const existingNames = new Set(productAttributes.map(pa => pa.attribute_name));
    
    // Add category attribute options for groups not already in product_attributes
    categoryAttributes.forEach(ca => {
      if (existingNames.has(ca.attribute_name)) return;
      if (!['dropdown', 'checkbox'].includes(ca.attribute_type)) return;
      const opts = normalizeOptions(ca.options);
      if (opts.length === 0) return;
      opts.forEach(opt => {
        result.push({
          attribute_name: ca.attribute_name,
          attribute_value: opt.value,
          price: opt.price,
          _fromCategory: true,
          _opt: opt // keep full option for translations
        });
      });
    });
    return result;
  }, [productAttributes, categoryAttributes, product?.id]);

  // Auto-select the cheapest option per selectable attribute group
  useEffect(() => {
    if (mergedAttributes.length === 0 || !product) return;
    const basePrice = Number(product.price) || 0;
    const attrGroups = {};
    mergedAttributes.forEach(pa => {
      if (!attrGroups[pa.attribute_name]) attrGroups[pa.attribute_name] = [];
      attrGroups[pa.attribute_name].push(pa);
    });
    
    let firstGroupItem = null;
    const autoSelections = {};
    Object.entries(attrGroups).forEach(([name, items]) => {
      const hasPrices = items.some(it => it.price != null && it.price > 0);
      if (items.length > 1 || hasPrices) {
        const sorted = [...items].sort((a, b) => (a.price ?? basePrice) - (b.price ?? basePrice));
        autoSelections[name] = sorted[0].attribute_value;
        if (!firstGroupItem) firstGroupItem = sorted[0];
      }
    });
    
    if (Object.keys(autoSelections).length > 0) {
      setSelectedOptions(autoSelections);
      if (firstGroupItem) {
        const effectivePrice = firstGroupItem.price ?? basePrice;
        setSelectedAttrPrice(effectivePrice);
        setSelectedAttrName(Object.keys(autoSelections)[0]);
      }
    }
  }, [mergedAttributes, product?.id]);

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#57c5cf]"></div>
     </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">პროდუქტი ვერ მოიძებნა</h2>
      <Link to="/">
        <Button>მთავარზე დაბრუნება</Button>
      </Link>
    </div>
  );

  const allImages = [product.image_url, ...additionalImages.map(img => img.image_url)].filter(Boolean);
  
  // Multi-language Logic
  let displayName = product.name;
  let displayDesc = product.description;

  if (language === 'en' && product.name_en) {
    displayName = product.name_en;
    displayDesc = product.description_en;
  } else if (language === 'ru' && product.name_ru) {
    displayName = product.name_ru;
    displayDesc = product.description_ru;
  } else {
    // Fallback to existing logic if columns are empty but translations table might have it
    // Or just use 'name' column which stores Georgian
    if (!displayName) displayName = translations[`prod_name_${product.id}`]?.ka || 'Product Name';
    if (!displayDesc) displayDesc = translations[`prod_desc_${product.id}`]?.ka || 'No description available.';
  }

  const categoryNameTranslationKey = `cat_${product.categories?.slug}`;
  let categoryName = product.categories?.name;
  if (language === 'en') categoryName = translations?.[categoryNameTranslationKey]?.en || categoryName;
  if (language === 'ru') categoryName = translations?.[categoryNameTranslationKey]?.ru || categoryName;
  if (!categoryName) categoryName = translations?.[categoryNameTranslationKey]?.ka || product.categories?.slug;

  const isOutOfStock = product.manage_inventory && product.stock_quantity === 0;

  const handleAddToCart = () => {
    if(!isOutOfStock) {
      // Build a variant key from selected options for unique cart identification
      const optionsSuffix = Object.entries(selectedOptions)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      
      const productForCart = {
        ...product,
        price: selectedAttrPrice ?? product.price,
        selectedOptions: { ...selectedOptions },
        // Unique cart key so different sizes are separate items
        cartKey: optionsSuffix ? `${product.id}__${optionsSuffix}` : product.id,
      };
      
      addToCart(productForCart, quantity);
      trackAddToCart(productForCart, quantity);
      toast({ 
        title: "კალათაში დაემატა!",
        description: `${quantity} x ${displayName}`,
        className: "bg-[#57c5cf] text-white border-none"
      });
    }
  };

  const productUrl = `https://handicraft.com.ge/product/${id}`;
  const productImage = allImages[0] || product?.image_url || '';

  return (
    <div className="min-h-screen bg-white pb-20 pt-8">
      <Helmet>
        <title>{displayName} - Handicraft</title>
        <meta name="description" content={displayDesc?.substring(0, 160) || `${displayName} — პრემიუმ ხარისხის ხელნაკეთი ნივთი Handicraft-ისგან.`} />
        <link rel="canonical" href={productUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${displayName} - Handicraft`} />
        <meta property="og:description" content={displayDesc?.substring(0, 160) || ''} />
        <meta property="og:image" content={productImage} />
        <meta property="og:url" content={productUrl} />
        <meta property="og:locale" content="ka_GE" />
        <meta property="product:price:amount" content={product?.price} />
        <meta property="product:price:currency" content="GEL" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": displayName,
            "description": displayDesc || '',
            "image": productImage,
            "url": productUrl,
            "sku": id,
            "brand": { "@type": "Brand", "name": "Handicraft" },
            "offers": {
              "@type": "Offer",
              "price": product?.price,
              "priceCurrency": "GEL",
              "availability": product?.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": productUrl,
              "seller": { "@type": "Organization", "name": "Handicraft" }
            },
            "category": categoryName || ''
          })}
        </script>
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        <nav className="flex items-center text-sm text-gray-500 mb-8 font-medium">
          <Link to="/" className="hover:text-[#57c5cf] transition-colors">მთავარი</Link>
          <span className="mx-2">/</span>
          <Link to={`/category/${product.categories?.slug || 'all'}`} className="hover:text-[#57c5cf] transition-colors">
            {categoryName || 'კატეგორია'}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 truncate max-w-[200px]">{displayName}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
            
            <div className="space-y-6">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm group">
                 <img 
                   src={allImages[selectedImage]} 
                   alt={displayName} 
                   width="600"
                   height="600"
                   className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                 />
                 {isOutOfStock && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                       <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-xl rotate-[-5deg]">
                          მარაგში არ არის
                       </span>
                    </div>
                 )}
                 {product.is_new && !isOutOfStock && (
                    <div className="absolute top-4 left-4 bg-[#57c5cf] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider">
                      ახალი კოლექცია
                    </div>
                 )}
              </div>
              
              {allImages.length > 1 && (
                <div className="grid grid-cols-5 gap-4">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImage === idx 
                          ? 'border-[#57c5cf] ring-2 ring-[#57c5cf]/20 opacity-100' 
                          : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" width="120" height="120" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col">
               <div className="mb-8 border-b border-gray-100 pb-8">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-gray-900 mb-4 leading-tight">
                     {displayName}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-6 mb-6">
                     <div className="text-3xl font-bold font-heading text-[#57c5cf]">
                        ₾{selectedAttrPrice ?? product.price}
                     </div>
                     {selectedAttrPrice != null && selectedAttrPrice !== Number(product.price) && (
                       <span className="text-sm text-gray-400 line-through">₾{product.price}</span>
                     )}
                     <div className="w-px h-8 bg-gray-200"></div>
                     {product.rating && (
                       <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-gray-900 ml-1 text-lg">{Number(product.rating).toFixed(1)}</span>
                       </div>
                     )}
                  </div>

                  <p className="text-gray-600 leading-relaxed font-body text-lg">
                     {displayDesc}
                  </p>
               </div>
               
               {/* Selectable Attributes with Prices */}
               {(() => {
                 // Group mergedAttributes by attribute_name to find multi-option attributes
                 const attrGroups = {};
                 mergedAttributes.forEach(pa => {
                   if (!attrGroups[pa.attribute_name]) attrGroups[pa.attribute_name] = [];
                   attrGroups[pa.attribute_name].push(pa);
                 });
                 
                 // Separate: multi-option groups (selectable) vs simple single-value attributes
                 const selectableGroups = [];
                 const simpleAttrs = [];
                 
                 Object.entries(attrGroups).forEach(([name, items]) => {
                   const hasPrices = items.some(it => it.price != null && it.price > 0);
                   if (items.length > 1 || hasPrices) {
                     selectableGroups.push({ name, items, hasPrices });
                   } else {
                     simpleAttrs.push(...items);
                   }
                 });
                 
                 if (selectableGroups.length === 0 && simpleAttrs.length === 0) return null;
                 
                 // Find matching category attribute for display name translation
                 const getCatAttr = (attrName) => categoryAttributes.find(ca => ca.attribute_name === attrName);
                 
                 return (
                   <div className="mb-8 space-y-4">
                     <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#57c5cf]" /> მახასიათებლები
                     </h3>
                     
                     {/* Selectable options (sizes etc.) */}
                     {selectableGroups.map(({ name, items, hasPrices }) => {
                       const catAttr = getCatAttr(name);
                       let displayLabel = name;
                       if (language === 'en' && catAttr?.name_en) displayLabel = catAttr.name_en;
                       if (language === 'ru' && catAttr?.name_ru) displayLabel = catAttr.name_ru;
                       
                       const selectedOpt = selectedOptions[name];
                       // Sort by price ascending (null prices use base price for sorting)
                       const basePrice = Number(product.price) || 0;
                       const sorted = [...items].sort((a, b) => (a.price ?? basePrice) - (b.price ?? basePrice));
                       
                       return (
                         <div key={name} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                           <label className="text-sm font-bold text-gray-700 mb-3 block">
                             {displayLabel}
                             <span className="text-xs font-normal text-gray-400 ml-2">({sorted.length} ვარიანტი)</span>
                           </label>
                           <div className="flex flex-wrap gap-2">
                             {sorted.map((item, i) => {
                               const isSelected = selectedOpt === item.attribute_value;
                               // Get translated option display value
                               let optDisplayValue = item.attribute_value;
                               if (item._opt) {
                                 // From category attributes - has direct translations
                                 if (language === 'en' && item._opt.value_en) optDisplayValue = item._opt.value_en;
                                 else if (language === 'ru' && item._opt.value_ru) optDisplayValue = item._opt.value_ru;
                               } else if (catAttr) {
                                 // From product_attributes - look up translation in category attribute options
                                 const catOpts = normalizeOptions(catAttr.options);
                                 const matchOpt = catOpts.find(o => o.value === item.attribute_value);
                                 if (matchOpt) {
                                   if (language === 'en' && matchOpt.value_en) optDisplayValue = matchOpt.value_en;
                                   else if (language === 'ru' && matchOpt.value_ru) optDisplayValue = matchOpt.value_ru;
                                 }
                               }
                               return (
                                 <button
                                   key={i}
                                   type="button"
                                   onClick={() => {
                                     setSelectedOptions(prev => ({...prev, [name]: item.attribute_value}));
                                     const effectivePrice = item.price ?? Number(product.price);
                                     if (effectivePrice != null) {
                                       setSelectedAttrPrice(effectivePrice);
                                       setSelectedAttrName(name);
                                     }
                                   }}
                                   className={cn(
                                     "px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all flex flex-col items-center min-w-[80px]",
                                     isSelected
                                       ? "bg-[#57c5cf] text-white border-[#57c5cf] shadow-lg shadow-[#57c5cf]/25 scale-[1.02]"
                                       : "bg-white text-gray-700 border-gray-200 hover:border-[#57c5cf]/50 hover:bg-[#57c5cf]/5 hover:shadow-sm"
                                   )}
                                 >
                                   <span>{optDisplayValue}</span>
                                   {hasPrices && (
                                     <span className={cn(
                                       "text-xs mt-0.5 font-bold",
                                       isSelected ? "text-white/90" : "text-[#f292bc]"
                                     )}>
                                       ₾{item.price ?? product.price}
                                     </span>
                                   )}
                                 </button>
                               );
                             })}
                           </div>
                         </div>
                       );
                     })}

                     {/* Simple attributes (non-priced, single value) */}
                     {simpleAttrs.length > 0 && (
                       <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                          <AttributeDisplay 
                            initialAttributes={simpleAttrs} 
                            language={language}
                          />
                       </div>
                     )}
                   </div>
                 );
               })()}

               <div className="mt-auto space-y-8">
                  <div className="flex flex-wrap items-end gap-6">
                     <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-900 uppercase tracking-wider block">
                          რაოდენობა
                        </label>
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-1">
                           <button 
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#57c5cf] hover:bg-white rounded-lg transition-all disabled:opacity-50"
                              disabled={isOutOfStock || quantity <= 1}
                           >
                              <Minus className="w-4 h-4" />
                           </button>
                           <span className="w-12 text-center font-bold text-lg text-gray-900">{quantity}</span>
                           <button 
                              onClick={() => setQuantity(quantity + 1)}
                              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#57c5cf] hover:bg-white rounded-lg transition-all disabled:opacity-50"
                              disabled={isOutOfStock}
                           >
                              <Plus className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                     
                     <div className="pb-3 text-sm font-medium text-gray-500">
                        {product.manage_inventory ? (
                           <span className={product.stock_quantity > 0 ? "text-green-600 flex items-center gap-1.5" : "text-red-500 flex items-center gap-1.5"}>
                              <div className={`w-2 h-2 rounded-full ${product.stock_quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              {product.stock_quantity} მარაგშია
                           </span>
                        ) : (
                           <span className="text-green-600 flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              მარაგშია
                           </span>
                        )}
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                     <Button 
                        onClick={handleAddToCart}
                        className="flex-1 py-7 text-lg font-heading bg-[#57c5cf] hover:bg-[#4bc0cb] text-white shadow-lg shadow-[#57c5cf]/25 hover:shadow-[#57c5cf]/40 transition-all hover:-translate-y-1 rounded-2xl"
                        disabled={isOutOfStock}
                     >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {isOutOfStock ? 'მარაგი ამოწურულია' : 'კალათაში დამატება'}
                     </Button>
                     <Button 
                        variant="outline" 
                        className="py-7 px-6 border-2 border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all rounded-2xl group"
                     >
                        <Heart className="w-6 h-6 text-gray-400 group-hover:fill-current group-hover:text-red-500 transition-colors" />
                     </Button>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-100">
                     <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                           <Truck className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600">სწრაფი მიწოდება</span>
                     </div>
                     <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                           <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600">დაცული გადახდა</span>
                     </div>
                     <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                           <RefreshCw className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600">მარტივი დაბრუნება</span>
                     </div>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;