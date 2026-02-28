import { supabase } from '@/lib/customSupabaseClient';

/**
 * Fetches products based on category, attribute filters, and search query.
 * 
 * @param {Object} params
 * @param {string} params.categoryId - UUID of the category (optional)
 * @param {Object} params.selectedAttributes - Object key-value pairs { "Attribute Name": "Value" or ["Value1", "Value2"] }
 * @param {string} params.searchQuery - Text search query (optional)
 * @param {number} params.page - Current page number (1-based)
 * @param {number} params.limit - Items per page
 */
export const getProductsByFilters = async ({
  categoryId,
  selectedAttributes = {},
  searchQuery = '',
  page = 1,
  limit = 20
}) => {
  try {
    // 1. Start building the product query
    let query = supabase
      .from('products')
      .select('*, product_attributes(*)')
      .eq('is_active', true)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    // 2. Filter by Category if provided
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    if (!products) return { data: [], count: 0 };

    // 4. Perform Attribute Filtering in Memory
    let filteredProducts = products.filter(product => {
      const entries = Object.entries(selectedAttributes);
      if (entries.length === 0) return true;

      const productAttrs = product.product_attributes || [];
      
      // Check if product matches ALL selected attribute filters
      return entries.every(([key, filterValue]) => {
        if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true;
        
        // Get all values this product has for this attribute name
        const productValues = productAttrs
            .filter(attr => attr.attribute_name === key)
            .map(attr => attr.attribute_value);

        // If filter is an array (multi-select), check intersection (OR logic within the attribute)
        if (Array.isArray(filterValue)) {
            // Does product have ANY of the selected values?
            return filterValue.some(val => productValues.includes(val));
        } else {
            // Single value match
            return productValues.includes(filterValue);
        }
      });
    });

    // 5. Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredProducts.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      count: filteredProducts.length,
      totalRaw: products.length
    };

  } catch (error) {
    console.error('Error fetching filtered products:', error);
    return { data: [], count: 0, error };
  }
};