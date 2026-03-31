import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Filter, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

const ProductFilters = ({ 
  currentCategoryId, 
  onFilterChange, 
  initialFilters = {},
  className 
}) => {
  const { translations } = useLanguage();
  const [attributes, setAttributes] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState(initialFilters);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch Attributes when Category Changes
  useEffect(() => {
    const fetchAttributes = async () => {
      if (!currentCategoryId || currentCategoryId === 'all') {
        setAttributes([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('category_attributes')
          .select('*')
          .eq('category_id', currentCategoryId)
          .order('display_order');
        
        if (error) throw error;
        if (data) setAttributes(data.filter(a => a.attribute_type !== 'info')); 
      } catch (err) {
        console.error("Error loading filters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttributes();
  }, [currentCategoryId]);

  const handleAttributeChange = (attrName, value, type) => {
    const newFilters = { ...selectedFilters };
    
    // For Checkbox types (like Size), treat as array of values
    if (type === 'checkbox') {
        const currentValues = newFilters[attrName] || [];
        if (currentValues.includes(value)) {
            newFilters[attrName] = currentValues.filter(v => v !== value);
            if (newFilters[attrName].length === 0) delete newFilters[attrName];
        } else {
            newFilters[attrName] = [...currentValues, value];
        }
    } 
    // For Dropdown types (standard), treat as single value (or toggle if same)
    else {
        if (newFilters[attrName] === value) {
            delete newFilters[attrName];
        } else {
            newFilters[attrName] = value;
        }
    }

    setSelectedFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(selectedFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setSelectedFilters({});
    onFilterChange({});
    setIsOpen(false);
  };

  // Helper to count active filters (arrays count as 1 filter key)
  const activeFilterCount = Object.keys(selectedFilters).length;

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(!isOpen)}
            className={cn("gap-2 font-heading", activeFilterCount > 0 && "border-[#57c5cf] text-[#57c5cf]")}
          >
            <Filter className="w-4 h-4" />
            ფილტრაცია
            {activeFilterCount > 0 && (
              <span className="bg-[#57c5cf] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {isOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>

          {/* Active Filters Badges (Desktop) */}
          <div className="hidden md:flex flex-wrap gap-2">
            {Object.entries(selectedFilters).map(([key, value]) => (
              <span key={key} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-gray-200">
                {key}: {Array.isArray(value) ? value.join(', ') : value}
                <button onClick={() => {
                   const newFilters = {...selectedFilters};
                   delete newFilters[key];
                   setSelectedFilters(newFilters);
                   onFilterChange(newFilters);
                }}>
                  <X className="w-3 h-3 hover:text-red-500" />
                </button>
              </span>
            ))}
            {activeFilterCount > 0 && (
              <button 
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-red-500 underline font-bold px-2"
              >
                გასუფთავება
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dropdown Area */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
          {attributes.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">ამ კატეგორიას არ აქვს ფილტრები</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {attributes.map((attr) => {
                const isMulti = attr.attribute_type === 'checkbox';
                const currentVal = selectedFilters[attr.attribute_name];
                
                return (
                  <div key={attr.id} className="space-y-2">
                    <h4 className="font-bold text-gray-700 text-sm">{attr.attribute_name}</h4>
                    
                    {(attr.attribute_type === 'dropdown' || attr.attribute_type === 'checkbox') && attr.options && (
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((option) => {
                          const isSelected = isMulti 
                             ? (Array.isArray(currentVal) && currentVal.includes(option))
                             : currentVal === option;

                          return (
                            <button
                              key={option}
                              onClick={() => handleAttributeChange(attr.attribute_name, option, attr.attribute_type)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                                isSelected
                                  ? "bg-[#57c5cf] text-white border-[#57c5cf] shadow-sm"
                                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    
                    {attr.attribute_type === 'text' && (
                      <input 
                        type="text" 
                        placeholder="ძიება..."
                        className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#57c5cf]"
                        onChange={(e) => handleAttributeChange(attr.attribute_name, e.target.value, 'text')}
                        value={selectedFilters[attr.attribute_name] || ''}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
             <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
               გასუფთავება
             </Button>
             <Button onClick={applyFilters} className="bg-[#57c5cf] hover:bg-[#4bc0cb] text-white">
               გამოყენება
             </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFilters;