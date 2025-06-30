import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
  cache: new InMemoryCache(),
});

export const ACTIVE_SUBSCRIPTIONS_QUERY = gql`
  query ActiveSubscriptions {
    subscriptions(where: { cancelled: false }) {
      id
      user
      planId
      nextPaymentDate
    }
  }
`;

export const PAYMENTS_QUERY = gql`
  query Payments {
    payments(orderBy: id, orderDirection: desc) {
      id
      user
      planId
      amount
      newNextPaymentDate
    }
  }
`;

export async function getActiveSubscriptions() {
  const { data } = await client.query({ query: ACTIVE_SUBSCRIPTIONS_QUERY });
  return data.subscriptions;
}

export async function getPayments() {
  const { data } = await client.query({ query: PAYMENTS_QUERY });
  return data.payments;
}

export default client;
