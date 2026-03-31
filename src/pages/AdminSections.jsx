import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { GripVertical, Eye, EyeOff, Home } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminSections = () => {
  const [sections, setSections] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    const { data } = await supabase.from('homepage_sections').select('*').order('sort_order');
    if (data) setSections(data);
  };

  const toggleVisibility = async (id, current) => {
    await supabase.from('homepage_sections').update({ is_active: !current }).eq('id', id);
    setSections(sections.map(s => s.id === id ? { ...s, is_active: !current } : s));
  };

  const moveSection = async (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === sections.length - 1)) return;
    
    const newSections = [...sections];
    const targetIndex = index + direction;
    
    // Swap sort order locally
    const tempOrder = newSections[index].sort_order;
    newSections[index].sort_order = newSections[targetIndex].sort_order;
    newSections[targetIndex].sort_order = tempOrder;

    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);

    // Save
    await supabase.from('homepage_sections').upsert([
        { id: newSections[index].id, sort_order: newSections[index].sort_order },
        { id: newSections[targetIndex].id, sort_order: newSections[targetIndex].sort_order }
    ]);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Helmet><title>Admin - Homepage Sections</title></Helmet>
      
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-heading font-bold text-gray-800">სექციების მართვა</h1>
        <Link to="/">
            <Button variant="outline" className="gap-2 border-[#57c5cf] text-[#57c5cf]">
              <Home className="w-4 h-4" /> View Site
            </Button>
        </Link>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center justify-between p-6 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
             <div className="flex items-center gap-4">
               <div className="flex flex-col">
                 <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                 <button onClick={() => moveSection(index, 1)} disabled={index === sections.length -1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
               </div>
               <span className="font-heading font-bold text-lg text-gray-700">{section.name}</span>
             </div>
             
             <div className="flex items-center gap-4">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${section.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {section.is_active ? 'Active' : 'Hidden'}
                </span>
                <Button size="icon" variant="ghost" onClick={() => toggleVisibility(section.id, section.is_active)}>
                   {section.is_active ? <Eye className="w-5 h-5 text-gray-500" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                </Button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AdminSections;