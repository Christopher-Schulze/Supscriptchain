import { renderHook, waitFor } from '@testing-library/react';
import useUserSubscriptions from '../lib/useUserSubscriptions';
import { getContract } from '../lib/contract';
import useWallet from '../lib/useWallet';

jest.mock('../lib/contract', () => ({ getContract: jest.fn() }));
jest.mock('../lib/useWallet');

const mockGetContract = getContract as jest.Mock;
const mockUseWallet = useWallet as jest.Mock;

function makeSub(date: bigint, active = true) {
  return { subscriber: '0xabc', nextPaymentDate: date, isActive: active };
}

describe('useUserSubscriptions', () => {
  test('reloads periodically and cleans up', async () => {
    jest.useFakeTimers();
    mockUseWallet.mockReturnValue({ account: '0xabc' });
    const contract = {
      nextPlanId: jest.fn().mockResolvedValue(1n),
      userSubscriptions: jest.fn().mockResolvedValue(makeSub(10n)),
    };
    mockGetContract.mockResolvedValue(contract);
    const { result, unmount } = renderHook(() => useUserSubscriptions());
    await waitFor(() => expect(result.current.subs).toHaveLength(1));
    contract.userSubscriptions.mockResolvedValue(makeSub(20n, false));
    jest.advanceTimersByTime(30000);
    await waitFor(() =>
      expect(result.current.subs[0].nextPaymentDate).toBe(20n),
    );
    unmount();
    jest.advanceTimersByTime(30000);
    expect(contract.nextPlanId).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
