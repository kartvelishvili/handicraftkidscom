import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Helmet } from 'react-helmet';

const GenericPage = ({ slug }) => {
  const { language } = useLanguage();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const { data, error } = await supabase
          .from('pages_content')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        
        if (error) throw error;
        if (data) setPageData(data);
      } catch (error) {
        console.error('Error fetching page:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) return <div className="p-20 text-center">Loading...</div>;
  
  if (!pageData) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <Helmet><title>{`Page Not Found - Handicraft`}</title></Helmet>
        <h1 className="text-2xl font-bold text-gray-800">გვერდი არ მოიძებნა</h1>
      </div>
    );
  }

  // Ensure title is always a string
  const title = pageData[`title_${language}`] || pageData.title_ka || 'Untitled Page';
  const content = pageData[`content_${language}`] || pageData.content_ka || '<p>Content coming soon...</p>';

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Helmet>
        <title>{`${title} - Handicraft`}</title>
      </Helmet>
      <h1 className="text-4xl font-heading font-bold mb-8 text-[#57c5cf]">{title}</h1>
      <div 
        className="prose prose-lg max-w-none text-gray-600 font-body"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
};

export default GenericPage;