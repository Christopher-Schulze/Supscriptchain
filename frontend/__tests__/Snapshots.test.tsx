import { render } from '@testing-library/react';
import Manage from '../app/manage/page';
import Payment from '../app/payment/page';
import Plans from '../app/plans/page';
import { StoreProvider } from '../lib/store';

jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));
jest.mock('../lib/plansStore', () => ({ usePlans: () => ({ plans: [], reload: jest.fn() }) }));
jest.mock('../lib/useUserSubscriptions', () => () => ({ subs: [], reload: jest.fn() }));
jest.mock(
  'typechain/factories/contracts/interfaces/AggregatorV3Interface__factory',
  () => ({
    AggregatorV3Interface__factory: { connect: jest.fn() },
  }),
  { virtual: true },
);
jest.mock('../lib/contract', () => ({
  getContract: jest.fn(),
  subscribeWithPermit: jest.fn(),
  subscribe: jest.fn(),
  cancelSubscription: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  updateMerchant: jest.fn(),
  disablePlan: jest.fn(),
  processPayment: jest.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}

test('manage page snapshot', () => {
  const { asFragment } = render(
    <Wrapper>
      <Manage />
    </Wrapper>
  );
  expect(asFragment()).toMatchSnapshot();
});

test('plans page snapshot', () => {
  const { asFragment } = render(
    <Wrapper>
      <Plans />
    </Wrapper>
  );
  expect(asFragment()).toMatchSnapshot();
});

test('payment page snapshot', () => {
  const { asFragment } = render(
    <Wrapper>
      <Payment />
    </Wrapper>
  );
  expect(asFragment()).toMatchSnapshot();
});
