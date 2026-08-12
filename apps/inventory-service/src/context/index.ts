import type { IncomingMessage } from 'node:http';
import {
  createBaseContext,
  type BaseContext,
} from '@nx-generators/graphql-service-core';

export type AppContext = BaseContext;

/** Composes libs/graphql-service-core's base context — add auth principal, dataloaders, etc. here as this service grows. */
export async function createContext({
  req,
}: {
  req: IncomingMessage;
}): Promise<AppContext> {
  const requestId = req.headers['x-request-id'];
  return createBaseContext({
    requestId: typeof requestId === 'string' ? requestId : undefined,
  });
}
