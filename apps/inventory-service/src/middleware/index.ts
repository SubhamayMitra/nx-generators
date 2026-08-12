import { createLoggingPlugin } from '@nx-generators/graphql-service-core';

/** Composed with libs/graphql-service-core's shared middleware — add this service's own (e.g. auth verification) alongside it. */
export const plugins = [createLoggingPlugin()];
