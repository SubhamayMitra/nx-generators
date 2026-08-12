import { renderHook } from '@testing-library/react';
import { useCheckoutSummary } from './useCheckoutSummary';

describe('useCheckoutSummary', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useCheckoutSummary());
    expect(result.current.checkoutSummary.status).toBe('idle');
  });
});
