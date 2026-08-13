import { renderHook, act } from '@testing-library/react';
import { useSavedSearches } from './useSavedSearches';

jest.mock('./savedSearches.service', () => ({
  saveSearch: jest.fn(),
}));

describe('useSavedSearches', () => {
  it('starts with empty values', () => {
    const { result } = renderHook(() => useSavedSearches());
    expect(result.current.values).toEqual({ name: '', query: '' });
  });

  it("rejects an empty submission with the exact messages search-service's saveSearch resolver would produce — both validate against the same saveSearchInputSchema", async () => {
    const { result } = renderHook(() => useSavedSearches());

    let errors: Record<string, unknown> = {};
    await act(async () => {
      errors = await result.current.validateForm();
    });

    expect(errors).toEqual({
      name: 'Give this search a name',
      query: 'Enter a search query first',
    });
  });
});
