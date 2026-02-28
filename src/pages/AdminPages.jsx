import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Home, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminAboutUs from '@/components/AdminAboutUs';
import AdminContact from '@/components/AdminContact';

const AdminPages = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      console.log("Fetching pages list...");
      const { data, error } = await supabase.from('pages_content').select('*').order('slug');
      if (error) throw error;
      console.log("Pages fetched:", data);
      if (data) setPages(data);
    } catch (error) {
      console.error("Error fetching pages:", error);
      toast({ title: "გვერდების ჩატვირთვა ვერ მოხერხდა", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySave = async () => {
    if (!selectedPage) return;
    try {
      console.log(`Verifying save for page ${selectedPage.id}...`);
      const { data, error } = await supabase
        .from('pages_content')
        .select('*')
        .eq('id', selectedPage.id)
        .single();
      
      if (error) throw error;
      
      console.log("Verified Data from DB:", data);
      alert(`Data verification successful!\n\nTitle (KA): ${data.title_ka}\nUpdated At: ${new Date(data.updated_at).toLocaleString()}`);
    } catch (error) {
      console.error("Verification failed:", error);
      alert("Verification failed. Check console for details.");
    }
  };

  const handleSave = async (updatedData) => {
    if (!selectedPage) return;
    
    setSaving(true);
    try {
      // Basic fields that apply to all pages
      const payload = {
        title_ka: updatedData.title_ka,
        title_en: updatedData.title_en,
        title_ru: updatedData.title_ru,
        content_ka: updatedData.content_ka,
        content_en: updatedData.content_en,
        content_ru: updatedData.content_ru,
        updated_at: new Date().toISOString()
      };

      // Page specific fields
      if (selectedPage.slug === 'about') {
        payload.hero_image_url = updatedData.hero_image_url;
        payload.staff_data = updatedData.staff_data;
        if (updatedData.about_extra) {
          payload.about_extra = updatedData.about_extra;
        }
      }

      if (selectedPage.slug === 'contact') {
        payload.contact_info = updatedData.contact_info;
        payload.map_url = updatedData.map_url;
      }

      console.log("Saving Page Data:", { id: selectedPage.id, slug: selectedPage.slug, payload });

      const { data, error } = await supabase
        .from('pages_content')
        .update(payload)
        .eq('id', selectedPage.id)
        .select();

      console.log("Supabase Update Response:", { data, error });

      if (error) throw error;
      
      toast({ 
        title: "წარმატება", 
        description: "გვერდი წარმატებით განახლდა",
        className: "bg-[#57c5cf] text-white"
      });
      
      // Update local state to reflect changes immediately
      setSelectedPage(prev => ({ ...prev, ...payload }));
      fetchPages(); // refresh list to update sidebar state if titles changed
      
    } catch (error) {
      console.error("Content update error:", error);
      let errorMessage = error.message || "დაფიქსირდა ტექნიკური შეცდომა";
      
      if (error.code === '42501') {
        errorMessage = "Permission denied (RLS). Please check database policies.";
      }

      toast({ 
        title: "შეცდომა შენახვისას", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (!selectedPage) return null;

    if (selectedPage.slug === 'about') {
      return (
        <>
          <AdminAboutUs pageData={selectedPage} onSave={handleSave} isSaving={saving} />
          <div className="flex justify-end pr-4 -mt-14 mb-10 relative z-20 pointer-events-none">
            <div className="pointer-events-auto mr-48">
               <Button variant="outline" size="sm" onClick={handleVerifySave} className="gap-2 text-gray-500 border-gray-300 hover:text-[#57c5cf] hover:border-[#57c5cf]">
                 <CheckCircle2 className="w-4 h-4"/> Verify Save
               </Button>
            </div>
          </div>
        </>
      );
    }

    if (selectedPage.slug === 'contact') {
      return (
        <>
          <AdminContact pageData={selectedPage} onSave={handleSave} isSaving={saving} />
          <div className="flex justify-end pr-4 -mt-14 mb-10 relative z-20 pointer-events-none">
            <div className="pointer-events-auto mr-48">
               <Button variant="outline" size="sm" onClick={handleVerifySave} className="gap-2 text-gray-500 border-gray-300 hover:text-[#57c5cf] hover:border-[#57c5cf]">
                 <CheckCircle2 className="w-4 h-4"/> Verify Save
               </Button>
            </div>
          </div>
        </>
      );
    }

    // Default Generic Editor
    return (
      <div className="space-y-8 pb-10 animate-in fade-in duration-300">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* KA */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
               <span className="text-xs font-bold bg-white px-2 py-1 rounded border">KA</span>
               <h3 className="font-bold text-gray-700">Georgian</h3>
            </div>
            <input 
              className="w-full p-2 border rounded-lg text-sm font-bold focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Page Title (KA)"
              value={selectedPage.title_ka || ''}
              onChange={e => setSelectedPage({...selectedPage, title_ka: e.target.value})}
            />
            <textarea 
              className="w-full p-2 border rounded-lg h-[400px] font-mono text-xs leading-relaxed focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Content HTML/Text (KA)"
              value={selectedPage.content_ka || ''}
              onChange={e => setSelectedPage({...selectedPage, content_ka: e.target.value})}
            />
          </div>

          {/* EN */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
               <span className="text-xs font-bold bg-white px-2 py-1 rounded border">EN</span>
               <h3 className="font-bold text-gray-700">English</h3>
            </div>
            <input 
              className="w-full p-2 border rounded-lg text-sm font-bold focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Page Title (EN)"
              value={selectedPage.title_en || ''}
              onChange={e => setSelectedPage({...selectedPage, title_en: e.target.value})}
            />
            <textarea 
              className="w-full p-2 border rounded-lg h-[400px] font-mono text-xs leading-relaxed focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Content HTML/Text (EN)"
              value={selectedPage.content_en || ''}
              onChange={e => setSelectedPage({...selectedPage, content_en: e.target.value})}
            />
          </div>

          {/* RU */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-2">
               <span className="text-xs font-bold bg-white px-2 py-1 rounded border">RU</span>
               <h3 className="font-bold text-gray-700">Russian</h3>
            </div>
            <input 
              className="w-full p-2 border rounded-lg text-sm font-bold focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Page Title (RU)"
              value={selectedPage.title_ru || ''}
              onChange={e => setSelectedPage({...selectedPage, title_ru: e.target.value})}
            />
            <textarea 
              className="w-full p-2 border rounded-lg h-[400px] font-mono text-xs leading-relaxed focus:border-[#57c5cf] focus:outline-none" 
              placeholder="Content HTML/Text (RU)"
              value={selectedPage.content_ru || ''}
              onChange={e => setSelectedPage({...selectedPage, content_ru: e.target.value})}
            />
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 sticky bottom-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 shadow-lg">
            <Button variant="outline" size="sm" onClick={handleVerifySave} className="gap-2 text-gray-500 border-gray-300 hover:text-[#57c5cf] hover:border-[#57c5cf]">
                 <CheckCircle2 className="w-4 h-4"/> Verify Save
            </Button>
            <Button 
              onClick={() => handleSave(selectedPage)} 
              className="bg-[#57c5cf] hover:bg-[#4bc0cb] gap-2 shadow-lg shadow-[#57c5cf]/20"
              disabled={saving}
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4"/>}
                {saving ? 'ინახება...' : 'შენახვა'}
            </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <Helmet><title>Admin - Pages Management</title></Helmet>

      <div className="flex justify-between items-center mb-6 pb-4 border-b px-6 pt-4">
         <h1 className="text-3xl font-heading font-bold text-gray-800">გვერდების მართვა</h1>
         <div className="flex gap-3">
             <Link to="/">
                <Button variant="outline" className="gap-2 border-[#57c5cf] text-[#57c5cf] hover:bg-[#57c5cf] hover:text-white">
                  <Home className="w-4 h-4" /> საიტის ნახვა
                </Button>
            </Link>
         </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
          {/* Sidebar List */}
          <div className="w-64 border-r overflow-y-auto bg-gray-50/50">
            <h2 className="font-bold text-xs text-gray-400 uppercase mb-4 px-6 pt-6">აირჩიეთ გვერდი</h2>
            <div className="space-y-1 px-4">
              {loading ? (
                 <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : (
                pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      selectedPage?.id === page.id 
                        ? 'bg-[#57c5cf] text-white shadow-md shadow-[#57c5cf]/20' 
                        : 'hover:bg-white hover:text-[#57c5cf] text-gray-600 hover:shadow-sm'
                    }`}
                  >
                    {page.slug.charAt(0).toUpperCase() + page.slug.slice(1)}
                  </button>
                ))
              )}
              {!loading && pages.length === 0 && <div className="text-sm text-gray-400 px-4 text-center">გვერდები არ მოიძებნა.</div>}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 pl-6 overflow-y-auto custom-scrollbar pr-6 pb-6">
            {selectedPage ? (
              renderEditor()
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                   <Home className="w-8 h-8 text-gray-300" />
                </div>
                <div className="text-center">
                   <p className="font-bold text-gray-600">აირჩიეთ გვერდი</p>
                   <p className="text-sm">რედაქტირების დასაწყებად აირჩიეთ გვერდი მარცხენა მენიუდან.</p>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default AdminPages;