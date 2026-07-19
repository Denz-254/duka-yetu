import { create } from 'zustand';
import { subscription } from '../api/endpoints';

const useSubscriptionStore = create((set, get) => ({
  plan: null,
  status: null,
  active: false,
  features: [],
  limits: {},
  loading: false,
  loaded: false,

  fetchSubscription: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data } = await subscription.get();
      set({ ...data, loading: false, loaded: true });
    } catch {
      set({ loading: false, loaded: true, active: false, features: [] });
    }
  },

  hasFeature: (feature) => get().active && get().features.includes(feature),
  clear: () => set({
    plan: null, status: null, active: false, features: [], limits: {}, loaded: false,
  }),
}));

export default useSubscriptionStore;
