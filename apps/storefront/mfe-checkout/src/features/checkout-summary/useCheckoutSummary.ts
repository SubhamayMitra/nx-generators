import { useCheckoutSummaryStore } from './checkoutSummary.store';
import { fetchCheckoutSummary } from './checkoutSummary.service';

export function useCheckoutSummary() {
  const checkoutSummary = useCheckoutSummaryStore();

  async function load() {
    checkoutSummary.setStatus('loading');
    const result = await fetchCheckoutSummary();
    checkoutSummary.setStatus('loaded');
    return result;
  }

  return { checkoutSummary, load };
}
