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
  BigInt: { input: string; output: string; }
  Bytes: { input: string; output: string; }
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

export enum Payment_OrderBy {
  Id = 'id'
}

export type Plan = {
  __typename?: 'Plan';
  id: Scalars['ID']['output'];
  totalPaid: Scalars['BigInt']['output'];
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
};


export type QuerySubscriptionsArgs = {
  where?: InputMaybe<Subscription_Filter>;
};

export type Subscription = {
  __typename?: 'Subscription';
  id: Scalars['ID']['output'];
  nextPaymentDate?: Maybe<Scalars['BigInt']['output']>;
  planId: Scalars['BigInt']['output'];
  user: Scalars['Bytes']['output'];
};

export type Subscription_Filter = {
  cancelled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ActiveSubscriptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ActiveSubscriptionsQuery = { __typename?: 'Query', subscriptions: Array<{ __typename?: 'Subscription', id: string, user: string, planId: string, nextPaymentDate?: string | null }> };

export type PaymentsQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentsQuery = { __typename?: 'Query', payments: Array<{ __typename?: 'Payment', id: string, user: string, planId: string, amount: string, newNextPaymentDate: string }> };

export type PlansQueryVariables = Exact<{ [key: string]: never; }>;


export type PlansQuery = { __typename?: 'Query', plans: Array<{ __typename?: 'Plan', id: string, totalPaid: string }> };
