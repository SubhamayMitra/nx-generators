import type { ApolloServerPlugin, BaseContext } from '@apollo/server';

/**
 * A request-logging Apollo Server plugin every service's `middleware/`
 * registers alongside its own middleware (auth, etc.) — logs operation
 * name, duration, and any errors encountered, tagged with the context's
 * `requestId` from `createBaseContext` when available.
 */
export function createLoggingPlugin<
  TContext extends BaseContext = BaseContext,
>(): ApolloServerPlugin<TContext> {
  return {
    async requestDidStart({ request, contextValue }) {
      const start = Date.now();
      const operationName = request.operationName ?? 'anonymous operation';
      const requestId = (contextValue as { requestId?: string } | undefined)
        ?.requestId;

      return {
        async didEncounterErrors({ errors }) {
          for (const error of errors) {
            console.error(
              JSON.stringify({
                requestId,
                operationName,
                level: 'error',
                message: error.message,
              }),
            );
          }
        },
        async willSendResponse() {
          console.log(
            JSON.stringify({
              requestId,
              operationName,
              level: 'info',
              durationMs: Date.now() - start,
            }),
          );
        },
      };
    },
  };
}
