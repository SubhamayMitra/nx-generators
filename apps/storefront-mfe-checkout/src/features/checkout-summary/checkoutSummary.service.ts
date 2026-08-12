import { gql } from '@apollo/client';
import { apolloClient } from '../../services/apollo-client';

// TODO: replace with a real query once this feature has a GraphQL operation
// to call — generated purely as a structural placeholder so `CheckoutSummary`
// has somewhere real to call through, per this workspace's service-layer
// convention (components call services/, not inline useQuery + gql).
const CHECKOUTSUMMARY_PLACEHOLDER_QUERY = gql`
  query CheckoutSummaryPlaceholder {
    __typename
  }
`;

export async function fetchCheckoutSummary() {
  return apolloClient.query({ query: CHECKOUTSUMMARY_PLACEHOLDER_QUERY });
}
