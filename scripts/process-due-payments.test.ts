import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function deployFixture() {
  const [merchant, userSuccess, userFail] = await ethers.getSigners();

  const Token = await ethers.getContractFactory('MockToken', merchant);
  const token = await Token.deploy('Mock', 'MOCK', 18);
  await token.waitForDeployment();
  await token.mint(userSuccess.address, ethers.parseUnits('1000', 18));

  const Subscription = await ethers.getContractFactory('Subscription', merchant);
  const subscription = await Subscription.deploy();
  await subscription.waitForDeployment();

  await token.connect(userSuccess).approve(subscription.target, ethers.parseUnits('1000', 18));

  const price = ethers.parseUnits('10', 18);
  const cycle = 24 * 60 * 60;
  await subscription.createPlan(merchant.address, token.target, price, cycle, false, 0, ethers.ZeroAddress);
  await subscription.connect(userSuccess).subscribe(0);

  await time.increase(cycle);

  return { merchant, userSuccess, userFail, subscription };
}

describe('process-due-payments script', function () {
  it('processes payments and reports failures', async function () {
    const { merchant, userSuccess, userFail, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.test.tmp.json');
    const data = [userSuccess.address, { user: userFail.address, plan: 0 }];
    fs.writeFileSync(tmpJson, JSON.stringify(data, null, 2));

    const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'], {
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        SUBSCRIPTION_ADDRESS: subscription.target,
        PLAN_ID: '0',
        SUBSCRIBERS_FILE: tmpJson,
        MERCHANT_PRIVATE_KEY: merchant.privateKey,
      },
      encoding: 'utf8',
    });

    fs.unlinkSync(tmpJson);

    expect(res.status).to.equal(1);
    expect(res.stdout).to.match(new RegExp(`Processing payment for ${userSuccess.address}`));
    expect(res.stdout).to.match(/Failed payments summary/);

    const sub = await subscription.userSubscriptions(userSuccess.address, 0);
    expect(sub.nextPaymentDate).to.be.gt(BigInt(await time.latest()));
  });

  it('runs in interval mode', async function () {
    const { merchant, userSuccess, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.interval.tmp.json');
    fs.writeFileSync(tmpJson, JSON.stringify([userSuccess.address], null, 2));

    const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'], {
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        SUBSCRIPTION_ADDRESS: subscription.target,
        PLAN_ID: '0',
        SUBSCRIBERS_FILE: tmpJson,
        MERCHANT_PRIVATE_KEY: merchant.privateKey,
        INTERVAL: '1',
      },
      encoding: 'utf8',
      timeout: 2000,
    });

    fs.unlinkSync(tmpJson);

    expect(res.signal).to.equal('SIGTERM');
    expect(res.stdout).to.match(new RegExp(`Processing payment for ${userSuccess.address}`));

    const sub = await subscription.userSubscriptions(userSuccess.address, 0);
    expect(sub.nextPaymentDate).to.be.gt(BigInt(await time.latest()));
  });

  it('fails on invalid env vars', async function () {
    const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/check-env.ts'], {
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        MERCHANT_ADDRESS: 'invalid',
        TOKEN_ADDRESS: 'invalid',
        PRICE_FEED: 'invalid',
        BILLING_CYCLE: 'abc',
        PRICE_IN_USD: 'maybe',
        FIXED_PRICE: 'x',
        USD_PRICE: 'y',
        SUBSCRIPTION_ADDRESS: 'invalid',
        PLAN_ID: 'z',
      },
      encoding: 'utf8',
    });

    expect(res.status).to.equal(1);
    expect(res.stderr).to.match(/Invalid environment variables/);
  });
});
