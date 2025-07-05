import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import type {
  ActiveSubscriptionsQuery,
  PaymentsQuery,
  PlansQuery,
  Subscription,
  Payment,
  Plan,
} from '../generated/graphql';
import { env } from './env';

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

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const { data } = await client.query<ActiveSubscriptionsQuery>({
    query: ACTIVE_SUBSCRIPTIONS_QUERY,
  });
  return data.subscriptions;
}

export async function getPayments(): Promise<Payment[]> {
  const { data } = await client.query<PaymentsQuery>({ query: PAYMENTS_QUERY });
  return data.payments;
}

export async function getPlans(): Promise<Plan[]> {
  const { data } = await client.query<PlansQuery>({ query: PLANS_QUERY });
  return data.plans;
}

export default client;
