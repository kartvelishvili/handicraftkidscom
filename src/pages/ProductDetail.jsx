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

const ProductDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { translations, language } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [productAttributes, setProductAttributes] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [additionalImages, setAdditionalImages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("[ProductDetail] Product ID from URL:", id);
        console.log("[ProductDetail] Supabase URL:", import.meta.env.VITE_SUPABASE_URL || 'Using fallback');
        
        // Fetch Product
        const { data: productData, error } = await supabase
          .from('products')
          .select('*, categories(*)')
          .eq('id', id)
          .single();
          
        if (error) {
            console.error("[ProductDetail] Supabase Error:", error);
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
      addToCart(product, quantity);
      trackAddToCart(product, quantity);
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
                        ₾{product.price}
                     </div>
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
               
               {/* Selected Attributes Section */}
               {productAttributes.length > 0 && (
                  <div className="mb-8 space-y-4">
                     <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#57c5cf]" /> მახასიათებლები
                     </h3>
                     <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <AttributeDisplay initialAttributes={productAttributes} language={language} />
                     </div>
                  </div>
               )}

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