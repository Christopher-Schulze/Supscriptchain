import { ApolloClient } from '@apollo/client';

const queryMock = jest.fn();

jest.mock('@apollo/client', () => {
  const original = jest.requireActual('@apollo/client');
  return {
    ...original,
    ApolloClient: jest.fn().mockImplementation(() => ({ query: queryMock })),
    InMemoryCache: jest.fn(),
    gql: original.gql,
  };
});

describe('subgraph', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('getActiveSubscriptions returns data', async () => {
    const { getActiveSubscriptions, ACTIVE_SUBSCRIPTIONS_QUERY } = await import('../lib/subgraph');
    queryMock.mockResolvedValue({ data: { subscriptions: [{ id: '1' }] } });
    const res = await getActiveSubscriptions();
    expect(res).toEqual([{ id: '1' }]);
    expect(queryMock).toHaveBeenCalledWith({ query: ACTIVE_SUBSCRIPTIONS_QUERY });
  });

  test('getActiveSubscriptions propagates errors', async () => {
    const { getActiveSubscriptions } = await import('../lib/subgraph');
    queryMock.mockRejectedValue(new Error('fail'));
    await expect(getActiveSubscriptions()).rejects.toThrow('fail');
  });

  test('getPlans works', async () => {
    const { getPlans, PLANS_QUERY } = await import('../lib/subgraph');
    queryMock.mockResolvedValue({ data: { plans: [{ id: '1' }] } });
    const plans = await getPlans();
    expect(plans[0].id).toBe('1');
    expect(queryMock).toHaveBeenCalledWith({ query: PLANS_QUERY });
  });
});
