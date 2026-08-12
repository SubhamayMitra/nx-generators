import { apolloClient } from '../../services/apollo-client';
import {
  SaveSearchDocument,
  type SaveSearchMutationVariables,
} from '../../services/generated/graphql';

export async function saveSearch(input: SaveSearchMutationVariables['input']) {
  const result = await apolloClient.mutate({
    mutation: SaveSearchDocument,
    variables: { input },
  });
  return result.data?.saveSearch;
}
