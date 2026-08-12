import { type SaveSearchMutationVariables } from '../../services/generated/graphql';
export declare function saveSearch(
  input: SaveSearchMutationVariables['input'],
): Promise<
  | {
      id: string;
      name: string;
      query: string;
    }
  | undefined
>;
//# sourceMappingURL=savedSearches.service.d.ts.map
