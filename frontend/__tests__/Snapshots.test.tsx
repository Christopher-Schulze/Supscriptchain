import { render } from '@testing-library/react';
import Manage from '../app/manage/page';
import Payment from '../app/payment/page';
import Plans from '../app/plans/page';
import { StoreProvider } from '../lib/store';

jest.mock('../lib/useWallet', () => () => ({ account: '0xabc', connect: jest.fn() }));
jest.mock('../lib/plansStore', () => ({ usePlans: () => ({ plans: [], reload: jest.fn() }) }));
jest.mock('../lib/useUserSubscriptions', () => () => ({ subs: [], reload: jest.fn() }));

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
