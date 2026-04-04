import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import Hero from '@/components/Hero';
import FeaturedCategories from '@/components/FeaturedCategories';
import CategoryGrid from '@/components/CategoryGrid';
import PopularProducts from '@/components/PopularProducts';

const Home = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seo, setSeo] = useState(null);

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase.from('homepage_sections').select('*').order('sort_order');
      if (data) setSections(data);
      setLoading(false);
    };
    const fetchSeo = async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('key', 'home_seo').single();
      if (data?.value) setSeo(data.value);
    };
    fetchSections();
    fetchSeo();
  }, []);

  const components = {
    hero: <Hero key="hero" />,
    featured_categories: <FeaturedCategories key="featured_categories" />,
    category_grid: <CategoryGrid key="category_grid" />,
    popular_products: <PopularProducts key="popular_products" />
  };

  if (loading) return null; // or skeleton

  return (
    <>
      <Helmet>
        <title>{seo?.meta_title || 'Handicraft — პრემიუმ ხელნაკეთი ნივთები და სათამაშოები'}</title>
        <meta name="description" content={seo?.meta_description || 'Handicraft — უნიკალური, პრემიუმ ხარისხის ხელნაკეთი სათამაშოები და ბავშვის ნივთები. საძილე ტომარები, განმავითარებელი ხალიჩები, საწოლის ბამპერები. უფასო მიწოდება ₾150-ზე მეტ შეკვეთაზე.'} />
        {seo?.meta_keywords && <meta name="keywords" content={seo.meta_keywords} />}
        <link rel="canonical" href={seo?.canonical_url || 'https://handicraft.com.ge/'} />
        {seo?.og_image && <meta property="og:image" content={seo.og_image} />}
      </Helmet>
      {sections.filter(s => s.is_active).map(section => (
        <React.Fragment key={section.id}>
           {components[section.component_key]}
        </React.Fragment>
      ))}
    </>
  );
};

export default Home;