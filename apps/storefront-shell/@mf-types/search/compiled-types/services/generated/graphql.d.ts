/** Internal type. DO NOT USE DIRECTLY. */
type Exact<
  T extends {
    [key: string]: unknown;
  },
> = {
  [K in keyof T]: T[K];
};
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type SaveSearchInput = {
  name: string;
  query: string;
};
export type SaveSearchMutationVariables = Exact<{
  input: SaveSearchInput;
}>;
export type SaveSearchMutation = {
  saveSearch: {
    id: string;
    name: string;
    query: string;
  };
};
export declare const SaveSearchDocument: DocumentNode<
  SaveSearchMutation,
  SaveSearchMutationVariables
>;
export {};
//# sourceMappingURL=graphql.d.ts.map
