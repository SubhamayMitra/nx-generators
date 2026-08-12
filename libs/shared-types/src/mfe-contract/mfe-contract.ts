/**
 * The shell<->MFE contract: every MFE's Module-Federation-exposed
 * top-level component is typed against `MfeProps`, and every shell mounts
 * remotes by passing an `MfeMountConfig` + `MfeEmitter` that satisfy it.
 * This is the one place that shape is defined, so a shell and an MFE built
 * independently (by different generators, at different times) still agree
 * on how they talk to each other.
 */
export interface MfeMountConfig {
  /** The path prefix the shell mounted this MFE under, e.g. "/search". */
  basePath: string;
  /** Optional override for the MFE's own GraphQL endpoint, env-driven so it can change without a rebuild. */
  apiBaseUrl?: string;
}

export interface MfeEventMap {
  /** The MFE wants the shell's router to navigate (e.g. after a checkout completes). */
  'mfe:navigate': { path: string };
  /** The MFE hit an unrecoverable error and wants the shell's error boundary/toast to know. */
  'mfe:error': { message: string };
}

export type MfeEventName = keyof MfeEventMap;

export interface MfeEmitter {
  emit<K extends MfeEventName>(event: K, payload: MfeEventMap[K]): void;
}

export interface MfeProps {
  config: MfeMountConfig;
  emitter: MfeEmitter;
}
