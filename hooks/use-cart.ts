import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;          // productId
  variantId?: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  variantName?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  total: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.id === item.id && i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id && i.variantId === item.variantId
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, item.stock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      removeItem: (id, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.id === id && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (id, quantity, variantId) => {
        if (quantity < 1) {
          get().removeItem(id, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id && i.variantId === variantId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      total: () => get().subtotal(),
    }),
    { name: "elp-cart" }
  )
);
