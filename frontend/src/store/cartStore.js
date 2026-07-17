import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  total: 0,

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);
      let updatedItems;
      
      if (existingItem) {
        updatedItems = state.items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updatedItems = [
          ...state.items,
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            selling_price: product.selling_price,
            stock_quantity: product.stock_quantity,
            image_url: product.image_url || null, // ← ADD THIS
            quantity: quantity,
          },
        ];
      }
      
      const total = updatedItems.reduce(
        (sum, item) => sum + item.selling_price * item.quantity,
        0
      );
      
      return { items: updatedItems, total };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const updatedItems = state.items.filter((item) => item.id !== productId);
      const total = updatedItems.reduce(
        (sum, item) => sum + item.selling_price * item.quantity,
        0
      );
      return { items: updatedItems, total };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const updatedItems = state.items.filter((item) => item.id !== productId);
        const total = updatedItems.reduce(
          (sum, item) => sum + item.selling_price * item.quantity,
          0
        );
        return { items: updatedItems, total };
      }
      
      const updatedItems = state.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      const total = updatedItems.reduce(
        (sum, item) => sum + item.selling_price * item.quantity,
        0
      );
      return { items: updatedItems, total };
    });
  },

  clearCart: () => set({ items: [], total: 0 }),
}));

export default useCartStore;