import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery.js';

function mockMatchMedia(initialMatches: boolean) {
  let listener: (() => void) | undefined;
  let matches = initialMatches;
  window.matchMedia = jest.fn().mockReturnValue({
    get matches() {
      return matches;
    },
    addEventListener: (_event: string, cb: () => void) => {
      listener = cb;
    },
    removeEventListener: () => {
      listener = undefined;
    },
  });
  return {
    change(next: boolean) {
      matches = next;
      listener?.();
    },
  };
}

describe('useMediaQuery', () => {
  it('reflects the current match state and updates on change', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);

    act(() => media.change(true));
    expect(result.current).toBe(true);
  });
});
