import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { env } from './env';
import {
  ActiveSubscriptionsDocument,
  PaymentsDocument,
  PlansDocument,
} from '../generated/graphql';

const client = new ApolloClient({
  uri: env.NEXT_PUBLIC_SUBGRAPH_URL,
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

export const PLANS_QUERY = gql`
  query Plans {
    plans {
      id
      totalPaid
    }
  }
`;

export async function getActiveSubscriptions() {
  const { data } = await client.query({ query: ActiveSubscriptionsDocument });
  return data.subscriptions;
}

export async function getPayments() {
  const { data } = await client.query({ query: PaymentsDocument });
  return data.payments;
}

export async function getPlans() {
  const { data } = await client.query({ query: PlansDocument });
  return data.plans;
}

export default client;

export {
  ActiveSubscriptionsDocument,
  PaymentsDocument,
  PlansDocument,
};
