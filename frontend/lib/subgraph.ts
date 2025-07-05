import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { env } from './env';
import {
  ActiveSubscriptionsDocument,
  PaymentsDocument,
  PlansDocument,
  RevenueDocument,
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

export const REVENUE_QUERY = gql`
  query Revenue($planId: BigInt, $from: BigInt, $to: BigInt) {
    payments(
      where: {
        planId: $planId
        newNextPaymentDate_gte: $from
        newNextPaymentDate_lte: $to
      }
    ) {
      planId
      amount
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

export async function getRevenue(planId?: string, from?: number, to?: number) {
  const { data } = await client.query({
    query: RevenueDocument,
    variables: { planId, from, to },
  });
  return data.payments;
}

export default client;

export {
  ActiveSubscriptionsDocument,
  PaymentsDocument,
  PlansDocument,
  RevenueDocument,
};
