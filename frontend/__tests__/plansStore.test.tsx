import { renderHook, act, waitFor } from '@testing-library/react';
import { PlansProvider, usePlans, Plan } from '../lib/plansStore';
import { getContract } from '../lib/contract';

jest.mock('../lib/contract', () => ({ getContract: jest.fn() }));

const mockedGetContract = getContract as jest.Mock;

function makePlan(token: string): Plan {
  return {
    id: 0n,
    merchant: '0x',
    token,
    tokenDecimals: 18n,
    price: 1n,
    billingCycle: 1n,
    priceInUsd: false,
    usdPrice: 0n,
    priceFeedAddress: '0x',
    active: true,
  };
}

describe('plansStore', () => {
  test('loads plans on mount and reloads', async () => {
    const contract = {
      nextPlanId: jest.fn().mockResolvedValue(2n),
      plans: jest
        .fn()
        .mockResolvedValueOnce(makePlan('t1'))
        .mockResolvedValueOnce(makePlan('t2')),
    };
    mockedGetContract.mockResolvedValue(contract);
    const { result } = renderHook(() => usePlans(), {
      wrapper: PlansProvider,
    });
    await waitFor(() => expect(result.current.plans).toHaveLength(2));
    expect(result.current.plans).toHaveLength(2);
    expect(contract.nextPlanId).toHaveBeenCalled();

    contract.plans
      .mockResolvedValueOnce(makePlan('t3'))
      .mockResolvedValueOnce(makePlan('t4'));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.plans[0].token).toBe('t3');
  });

  test('handles errors gracefully', async () => {
    const contract = {
      nextPlanId: jest.fn().mockRejectedValue(new Error('fail')),
    };
    mockedGetContract.mockResolvedValue(contract);
    const { result } = renderHook(() => usePlans(), {
      wrapper: PlansProvider,
    });
    await waitFor(() => expect(result.current.plans).toHaveLength(0));
    expect(result.current.plans).toHaveLength(0);
  });

  test('reloads periodically and cleans up', async () => {
    jest.useFakeTimers();
    const contract = {
      nextPlanId: jest.fn().mockResolvedValue(1n),
      plans: jest.fn().mockResolvedValue(makePlan('t1')),
    };
    mockedGetContract.mockResolvedValue(contract);
    const { result, unmount } = renderHook(() => usePlans(), {
      wrapper: PlansProvider,
    });
    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    contract.plans.mockResolvedValue(makePlan('t2'));
    jest.advanceTimersByTime(30000);
    await waitFor(() => expect(result.current.plans[0].token).toBe('t2'));
    unmount();
    jest.advanceTimersByTime(30000);
    expect(contract.nextPlanId).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
