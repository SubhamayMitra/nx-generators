import { configureStore, type ConfigureStoreOptions } from '@reduxjs/toolkit';

/**
 * Every MFE that picks Redux Toolkit calls this to build its OWN store from
 * its own feature slices, instead of the shell composing one root reducer
 * for every MFE. That keeps each MFE independently deployable — it owns
 * its store the same way it owns its own bundle.
 */
export function createAppStore<S>(options: ConfigureStoreOptions<S>) {
  return configureStore(options);
}

export type AppStore<S> = ReturnType<typeof createAppStore<S>>;
export type AppDispatch<S> = AppStore<S>['dispatch'];
