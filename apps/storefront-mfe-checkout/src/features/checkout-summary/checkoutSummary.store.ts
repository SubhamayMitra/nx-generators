import { createScopedStore } from '@nx-generators/shared-state';

export interface CheckoutSummaryState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  setStatus: (status: CheckoutSummaryState['status']) => void;
}

export const useCheckoutSummaryStore = createScopedStore<CheckoutSummaryState>(
  (set) => ({
    status: 'idle',
    setStatus: (status) => set({ status }),
  }),
  { name: 'checkoutSummary' },
);
