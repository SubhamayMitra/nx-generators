import { createScopedStore } from './create-scoped-store.js';

interface CounterState {
  value: number;
  increment: () => void;
}

describe('createScopedStore', () => {
  it('creates an independent, hook-usable store', () => {
    const useCounter = createScopedStore<CounterState>(
      (set) => ({
        value: 0,
        increment: () => set((state) => ({ value: state.value + 1 })),
      }),
      { name: 'counter' },
    );

    expect(useCounter.getState().value).toBe(0);
    useCounter.getState().increment();
    expect(useCounter.getState().value).toBe(1);
  });

  it('scopes state to each store instance independently', () => {
    const build = () =>
      createScopedStore<CounterState>(
        (set) => ({
          value: 0,
          increment: () => set((state) => ({ value: state.value + 1 })),
        }),
        { name: 'counter' },
      );

    const storeA = build();
    const storeB = build();

    storeA.getState().increment();
    expect(storeA.getState().value).toBe(1);
    expect(storeB.getState().value).toBe(0);
  });
});
