import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      // Support both productId (legacy) and itemId (new format)
      const itemId = action.payload.itemId || action.payload.productId;
      const itemType = action.payload.itemType || 'marketplace';
      const existingItem = state.items.find(
        (item) => {
          const existingItemId = item.itemId || item.productId;
          return existingItemId === itemId && item.itemType === itemType;
        }
      );

      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      } else {
        const newItems = [...state.items, action.payload];
        return {
          ...state,
          items: newItems,
          total: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          itemCount: newItems.reduce((sum, item) => sum + item.quantity, 0),
        };
      }

    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter((item) => item.id !== action.payload);
      return {
        ...state,
        items: filteredItems,
        total: filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemCount: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
      };

    case 'UPDATE_QUANTITY':
      const updatedItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        )
        .filter((item) => item.quantity > 0);

      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemCount: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
      };

    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
        itemCount: 0,
      };

    case 'LOAD_CART':
      return {
        items: action.payload,
        total: action.payload.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemCount: action.payload.reduce((sum, item) => sum + item.quantity, 0),
      };

    default:
      return state;
  }
};

const CartContext = createContext(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
  });

  const { user } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${user?.uid || 'anonymous'}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: cartData });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, [user]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`cart_${user?.uid || 'anonymous'}`, JSON.stringify(state.items));
  }, [state.items, user]);

  const addToCart = (item) => {
    const itemId = item.itemId || item.productId;
    const itemType = item.itemType || 'marketplace';
    const cartItem = {
      ...item,
      itemId,
      itemType,
      id: `${itemId}_${itemType}_${item.size || 'default'}_${Date.now()}`,
    };
    dispatch({ type: 'ADD_ITEM', payload: cartItem });
    toast.success('Added to cart!');
  };

  const removeFromCart = (id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    toast.success('Removed from cart');
  };

  const updateQuantity = (id, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast.success('Cart cleared');
  };

  const value = {
    ...state,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
