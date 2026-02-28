import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { safeStorage } from '@/utils/safeStorage';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = safeStorage.getItem('cartItems');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const { toast } = useToast();

  useEffect(() => {
    safeStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity = 1) => {
    if (!product || !product.id) return;

    // Ensure we use a valid UUID if available
    let itemToStore = { ...product };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // If current ID is not UUID, but there is a 'uuid' field, swap them or use uuid
    if (!uuidRegex.test(itemToStore.id) && itemToStore.uuid && uuidRegex.test(itemToStore.uuid)) {
        itemToStore.id = itemToStore.uuid;
    }

    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === itemToStore.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === itemToStore.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...itemToStore, quantity }];
    });
    
    toast({
      title: "დაემატა კალათაში! 🛒",
      description: `${product.name} წარმატებით დაემატა.`,
      className: "bg-[#57c5cf] text-white border-none"
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    toast({
      title: "წაიშალა კალათიდან 🗑️",
      className: "bg-[#f292bc] text-white border-none"
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};