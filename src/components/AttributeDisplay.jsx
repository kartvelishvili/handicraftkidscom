import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const AttributeDisplay = ({ 
  productId, 
  initialAttributes = null, 
  compact = false, 
  showLabel = true,
  className,
  language // passed from parent or we can use context
}) => {
  const [attributes, setAttributes] = useState(initialAttributes || []);
  const [loading, setLoading] = useState(!initialAttributes);
  const { language: contextLanguage } = useLanguage();

  const currentLang = language || contextLanguage || 'ka';

  useEffect(() => {
    // If we have initial data, use it
    if (initialAttributes) {
        setAttributes(initialAttributes);
        setLoading(false);
        return;
    }

    // If no initial data and no ID, do nothing
    if (!productId) return;

    // Fetch if needed
    const fetchAttributes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('product_attributes')
          .select('*')
          .eq('product_id', productId)
          .order('attribute_name');
        
        if (!error && data) {
          setAttributes(data);
        }
      } catch (err) {
        console.error("Error fetching attributes", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttributes();
  }, [productId, initialAttributes]);

  if (loading) return <div className="animate-pulse h-5 w-24 bg-gray-100 rounded-md"></div>;
  if (!attributes || attributes.length === 0) return null;

  // Filter out empty values just in case
  const validAttributes = attributes.filter(a => {
     if (currentLang === 'en' && a.attribute_value_en) return true;
     if (currentLang === 'ru' && a.attribute_value_ru) return true;
     return a.attribute_value && a.attribute_value !== '';
  });

  // For compact view (cards), limit items
  const displayAttributes = compact ? validAttributes.slice(0, 3) : validAttributes;
  const remaining = validAttributes.length - displayAttributes.length;

  return (
    <div className={cn("flex flex-wrap gap-2 items-center", className)}>
      {displayAttributes.map((attr, idx) => {
        let val = attr.attribute_value;
        if (currentLang === 'en' && attr.attribute_value_en) val = attr.attribute_value_en;
        if (currentLang === 'ru' && attr.attribute_value_ru) val = attr.attribute_value_ru;

        return (
            <span 
                key={`${attr.id || idx}-${attr.attribute_name}`} 
                className={cn(
                    "inline-flex items-center rounded-md font-medium transition-colors",
                    compact 
                    ? "bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 text-[10px]" 
                    : "bg-[#57c5cf]/10 text-[#57c5cf] border border-[#57c5cf]/20 px-3 py-1 text-sm shadow-sm"
                )}
            >
            {showLabel && (
                <span className={cn("opacity-70 mr-1", compact ? "font-normal" : "font-semibold")}>
                {attr.attribute_name}:
                </span>
            )}
            <span className="font-bold">{val}</span>
            </span>
        );
      })}
      {compact && remaining > 0 && (
          <span className="text-[10px] text-gray-400 font-medium px-1">+{remaining}</span>
      )}
    </div>
  );
};

export default AttributeDisplay;