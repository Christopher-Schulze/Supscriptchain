import { expect } from 'chai';
import { ethers, upgrades, run } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import type { SubscriptionUpgradeable, MockToken } from '../typechain';

async function deployFixture() {
  const [owner] = await ethers.getSigners();
  const Token = await ethers.getContractFactory('MockToken', owner);
  const token = (await Token.deploy('Mock', 'MOCK', 18)) as MockToken;
  await token.waitForDeployment();
  const Sub = await ethers.getContractFactory('SubscriptionUpgradeable', owner);
  const proxy = (await upgrades.deployProxy(Sub, [owner.address], {
    initializer: 'initialize',
  })) as SubscriptionUpgradeable;
  await proxy.waitForDeployment();
  return { owner, token, proxy };
}

describe('Hardhat tasks', function () {
  it('runs create/update/pause/unpause/disable tasks', async function () {
    const { owner, token, proxy } = await loadFixture(deployFixture);
    const addr = await proxy.getAddress();

    await run('create-plan', {
      subscription: addr,
      merchant: owner.address,
      token: token.target,
      price: '100',
      billingCycle: '60',
      priceInUsd: false,
      usdPrice: '0',
      priceFeed: ethers.ZeroAddress,
    });

    let plan = await proxy.plans(0);
    expect(plan.merchant).to.equal(owner.address);

    await run('update-plan', {
      subscription: addr,
      planId: '0',
      billingCycle: '120',
      price: '200',
      priceInUsd: false,
      usdPrice: '0',
      priceFeed: ethers.ZeroAddress,
    });

    plan = await proxy.plans(0);
    expect(plan.billingCycle).to.equal(120n);
    expect(plan.price).to.equal(200n);

    await run('pause', { subscription: addr });
    expect(await proxy.paused()).to.equal(true);

    await run('unpause', { subscription: addr });
    expect(await proxy.paused()).to.equal(false);

    await run('disable-plan', { subscription: addr, planId: '0' });
    plan = await proxy.plans(0);
    expect(plan.active).to.equal(false);
  });

  it('runs update-merchant task', async function () {
    const { owner, token, proxy } = await loadFixture(deployFixture);
    const [, newMerchant] = await ethers.getSigners();
    const addr = await proxy.getAddress();

    await run('create-plan', {
      subscription: addr,
      merchant: owner.address,
      token: token.target,
      price: '100',
      billingCycle: '60',
      priceInUsd: false,
      usdPrice: '0',
      priceFeed: ethers.ZeroAddress,
    });

    await run('update-merchant', {
      subscription: addr,
      planId: '0',
      merchant: newMerchant.address,
    });

    const plan = await proxy.plans(0);
    expect(plan.merchant).to.equal(newMerchant.address);
  });
});
