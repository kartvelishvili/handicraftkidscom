import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import Hero from '@/components/Hero';
import FeaturedCategories from '@/components/FeaturedCategories';
import CategoryGrid from '@/components/CategoryGrid';
import PopularProducts from '@/components/PopularProducts';

const Home = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase.from('homepage_sections').select('*').order('sort_order');
      if (data) setSections(data);
      setLoading(false);
    };
    fetchSections();
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
      {sections.filter(s => s.is_active).map(section => (
        <React.Fragment key={section.id}>
           {components[section.component_key]}
        </React.Fragment>
      ))}
    </>
  );
};

export default Home;