import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

const CategoryAttributeFilter = ({ 
  attributes, 
  selectedAttributes, 
  onChange, 
  onClear,
  isOpen,
  onClose
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const getAttributeName = (attr) => {
    if (language === 'en' && attr.name_en) return attr.name_en;
    if (language === 'ru' && attr.name_ru) return attr.name_ru;
    return attr.attribute_name; // Default to Georgian
  };

  const handleToggle = (attrName, value) => {
    const current = selectedAttributes[attrName] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    
    const newFilters = { ...selectedAttributes };
    if (newValues.length > 0) {
      newFilters[attrName] = newValues;
    } else {
      delete newFilters[attrName];
    }
    onChange(newFilters);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
          <h2 className="font-heading font-bold text-lg text-gray-800">
             {language === 'en' ? 'Filters' : language === 'ru' ? 'Фильтры' : 'ფილტრები'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 flex-grow space-y-8">
           {attributes.map(attr => (
             <div key={attr.id} className="space-y-3">
               <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b pb-2 border-gray-100">
                 {getAttributeName(attr)}
               </h3>
               <div className="flex flex-wrap gap-2">
                 {Array.isArray(attr.options) ? attr.options.map((opt, idx) => {
                   const isSelected = selectedAttributes[attr.attribute_name]?.includes(opt);
                   return (
                     <button
                       key={idx}
                       onClick={() => handleToggle(attr.attribute_name, opt)}
                       className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                         isSelected 
                           ? 'bg-[#57c5cf] text-white border-[#57c5cf] shadow-md shadow-[#57c5cf]/20' 
                           : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                       }`}
                     >
                       <div className="flex items-center gap-2">
                         {isSelected && <Check className="w-3 h-3" />}
                         {opt}
                       </div>
                     </button>
                   );
                 }) : (
                    <p className="text-gray-400 text-sm italic">No options available</p>
                 )}
               </div>
             </div>
           ))}

           {attributes.length === 0 && (
              <p className="text-center text-gray-500 py-10">
                {language === 'en' ? 'No filters available' : language === 'ru' ? 'Нет доступных фильтров' : 'ფილტრები არ მოიძებნა'}
              </p>
           )}
        </div>

        <div className="p-4 border-t bg-gray-50 sticky bottom-0 z-10 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 py-6 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200"
            onClick={() => { onClear(); onClose(); }}
          >
            {language === 'en' ? 'Clear All' : language === 'ru' ? 'Очистить' : 'გასუფთავება'}
          </Button>
          <Button 
            className="flex-1 bg-[#57c5cf] hover:bg-[#4bc0cb] py-6 rounded-xl text-white shadow-lg shadow-[#57c5cf]/20 font-bold"
            onClick={onClose}
          >
            {language === 'en' ? 'Show Results' : language === 'ru' ? 'Показать' : 'ჩვენება'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryAttributeFilter;