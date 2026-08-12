import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface CreateScopedStoreOptions {
  /** Shown in Redux DevTools, namespaced per MFE so two MFEs' stores are distinguishable. */
  name: string;
}

/**
 * Every MFE that picks Zustand calls this to create its own scoped store —
 * no shell-level store to prop-drill through, no risk of two MFEs
 * colliding on the same store instance.
 */
export function createScopedStore<T>(
  initializer: StateCreator<T>,
  { name }: CreateScopedStoreOptions,
) {
  return create<T>()(devtools(initializer, { name }));
}
