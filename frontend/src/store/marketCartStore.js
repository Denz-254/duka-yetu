import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMarketCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const items = [...get().items];
        const existing = items.find((item) => item.id === product.id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          items.push({
            id: product.id,
            name: product.name,
            selling_price: Number(product.selling_price),
            image_url: product.image_url,
            business_id: product.business_id,
            business_name: product.business_name,
            quantity,
          });
        }
        set({ items });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.id !== id) });
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        });
      },
      removeItem: (id) => set({ items: get().items.filter((item) => item.id !== id) }),
      clearCart: () => set({ items: [] }),
      total: () =>
        get().items.reduce(
          (sum, item) => sum + Number(item.selling_price) * item.quantity,
          0
        ),
    }),
    { name: 'market-cart-storage' }
  )
);

export default useMarketCartStore;
