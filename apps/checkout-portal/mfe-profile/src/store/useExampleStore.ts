import { createScopedStore } from '@nx-generators/shared-state';

interface ExampleState {
  lastQuery: string | null;
  setLastQuery: (query: string) => void;
}

export const useExampleStore = createScopedStore<ExampleState>(
  (set) => ({
    lastQuery: null,
    setLastQuery: (query) => set({ lastQuery: query }),
  }),
  { name: 'profile-example' },
);
