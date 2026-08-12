import { randomUUID } from 'node:crypto';

export interface BaseContext {
  requestId: string;
  log: (message: string, meta?: Record<string, unknown>) => void;
}

export interface CreateBaseContextOptions {
  requestId?: string;
}

/**
 * The context every service's own `context/` factory composes with —
 * gives a per-request id and a structured logger. A service adds its own
 * fields on top (auth principal, dataloaders, …):
 *
 *   async function createContext({ req }): Promise<AppContext> {
 *     return { ...createBaseContext({ requestId: req.headers['x-request-id'] }), authPrincipal };
 *   }
 */
export function createBaseContext({
  requestId = randomUUID(),
}: CreateBaseContextOptions = {}): BaseContext {
  return {
    requestId,
    log: (message, meta) => {
      console.log(JSON.stringify({ requestId, message, ...meta }));
    },
  };
}
