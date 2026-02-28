/**
 * Analytics utility for GA4 via GTM
 * 
 * How to activate:
 * 1. Create a GTM account at https://tagmanager.google.com
 * 2. Create a GA4 property at https://analytics.google.com  
 * 3. In GTM, add a GA4 Configuration tag with your Measurement ID
 * 4. In index.html, uncomment the GTM script and replace GTM-XXXXXXX with your container ID
 * 5. Publish the GTM container
 * 
 * All events below will automatically flow to GA4 once GTM is connected.
 */

// Push event to dataLayer (GTM picks this up)
export const pushEvent = (eventName, params = {}) => {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
  } catch (e) {
    console.debug('[Analytics]', eventName, params);
  }
};

// E-commerce: View product
export const trackViewItem = (product) => {
  pushEvent('view_item', {
    ecommerce: {
      currency: 'GEL',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categories?.name || '',
        price: product.price,
        quantity: 1,
      }],
    },
  });
};

// E-commerce: View category/list
export const trackViewItemList = (listName, products) => {
  pushEvent('view_item_list', {
    ecommerce: {
      item_list_name: listName,
      items: products.slice(0, 20).map((p, i) => ({
        item_id: p.id,
        item_name: p.name,
        item_category: p.categories?.name || '',
        price: p.price,
        index: i,
      })),
    },
  });
};

// E-commerce: Add to cart
export const trackAddToCart = (product, quantity = 1) => {
  pushEvent('add_to_cart', {
    ecommerce: {
      currency: 'GEL',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.categories?.name || '',
        price: product.price,
        quantity,
      }],
    },
  });
};

// E-commerce: Remove from cart
export const trackRemoveFromCart = (product, quantity = 1) => {
  pushEvent('remove_from_cart', {
    ecommerce: {
      currency: 'GEL',
      value: product.price * quantity,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity,
      }],
    },
  });
};

// E-commerce: Begin checkout
export const trackBeginCheckout = (items, total) => {
  pushEvent('begin_checkout', {
    ecommerce: {
      currency: 'GEL',
      value: total,
      items: items.map((item, i) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        index: i,
      })),
    },
  });
};

// E-commerce: Purchase
export const trackPurchase = (orderId, items, total, shipping = 0) => {
  pushEvent('purchase', {
    ecommerce: {
      transaction_id: orderId,
      currency: 'GEL',
      value: total,
      shipping,
      items: items.map((item, i) => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        index: i,
      })),
    },
  });
};

// Search
export const trackSearch = (searchTerm) => {
  pushEvent('search', { search_term: searchTerm });
};
