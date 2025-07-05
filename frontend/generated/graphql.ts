import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
  Bytes: { input: any; output: any; }
};

export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc'
}

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['BigInt']['output'];
  id: Scalars['ID']['output'];
  newNextPaymentDate: Scalars['BigInt']['output'];
  planId: Scalars['BigInt']['output'];
  user: Scalars['Bytes']['output'];
};

export type PaymentWhereInput = {
  newNextPaymentDate_gte?: InputMaybe<Scalars['BigInt']['input']>;
  newNextPaymentDate_lte?: InputMaybe<Scalars['BigInt']['input']>;
  planId?: InputMaybe<Scalars['BigInt']['input']>;
};

export enum Payment_OrderBy {
  Id = 'id'
}

export type Plan = {
  __typename?: 'Plan';
  active: Scalars['Boolean']['output'];
  billingCycle: Scalars['BigInt']['output'];
  id: Scalars['ID']['output'];
  merchant: Scalars['Bytes']['output'];
  price: Scalars['BigInt']['output'];
  priceFeedAddress: Scalars['Bytes']['output'];
  priceInUsd: Scalars['Boolean']['output'];
  token: Scalars['Bytes']['output'];
  tokenDecimals: Scalars['Int']['output'];
  totalPaid: Scalars['BigInt']['output'];
  usdPrice: Scalars['BigInt']['output'];
};

export type Query = {
  __typename?: 'Query';
  payments: Array<Payment>;
  plans: Array<Plan>;
  subscriptions: Array<Subscription>;
};


export type QueryPaymentsArgs = {
  orderBy?: InputMaybe<Payment_OrderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PaymentWhereInput>;
};


export type QuerySubscriptionsArgs = {
  where?: InputMaybe<SubscriptionWhereInput>;
};

export type Subscription = {
  __typename?: 'Subscription';
  cancelled?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  nextPaymentDate?: Maybe<Scalars['BigInt']['output']>;
  planId: Scalars['BigInt']['output'];
  user: Scalars['Bytes']['output'];
};

export type SubscriptionWhereInput = {
  cancelled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ActiveSubscriptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ActiveSubscriptionsQuery = { __typename?: 'Query', subscriptions: Array<{ __typename?: 'Subscription', id: string, user: any, planId: any, nextPaymentDate?: any | null }> };

export type PaymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentsQuery = { __typename?: 'Query', payments: Array<{ __typename?: 'Payment', id: string, user: any, planId: any, amount: any, newNextPaymentDate: any }> };

export type PlansQueryVariables = Exact<{ [key: string]: never; }>;


export type PlansQuery = { __typename?: 'Query', plans: Array<{ __typename?: 'Plan', id: string, totalPaid: any }> };

export type RevenueQueryVariables = Exact<{
  planId?: InputMaybe<Scalars['BigInt']['input']>;
  from?: InputMaybe<Scalars['BigInt']['input']>;
  to?: InputMaybe<Scalars['BigInt']['input']>;
}>;


export type RevenueQuery = { __typename?: 'Query', payments: Array<{ __typename?: 'Payment', planId: any, amount: any }> };


export const ActiveSubscriptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ActiveSubscriptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"cancelled"},"value":{"kind":"BooleanValue","value":false}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"nextPaymentDate"}}]}}]}}]} as unknown as DocumentNode<ActiveSubscriptionsQuery, ActiveSubscriptionsQueryVariables>;
export const PaymentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Payments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"EnumValue","value":"id"}},{"kind":"Argument","name":{"kind":"Name","value":"orderDirection"},"value":{"kind":"EnumValue","value":"desc"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"newNextPaymentDate"}}]}}]}}]} as unknown as DocumentNode<PaymentsQuery, PaymentsQueryVariables>;
export const PlansDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Plans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plans"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"totalPaid"}}]}}]}}]} as unknown as DocumentNode<PlansQuery, PlansQueryVariables>;
export const RevenueDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Revenue"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"planId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BigInt"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BigInt"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"to"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"BigInt"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"payments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"where"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"planId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"planId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"newNextPaymentDate_gte"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"newNextPaymentDate_lte"},"value":{"kind":"Variable","name":{"kind":"Name","value":"to"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]} as unknown as DocumentNode<RevenueQuery, RevenueQueryVariables>;
