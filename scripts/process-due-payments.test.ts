import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { spawn, spawnSync } from 'child_process';
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
    const failuresJson = path.join(__dirname, 'failures.test.tmp.json');
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
        FAILURES_FILE: failuresJson,
      },
      encoding: 'utf8',
    });

    fs.unlinkSync(tmpJson);
    const failures = JSON.parse(fs.readFileSync(failuresJson, 'utf8'));
    fs.unlinkSync(failuresJson);

    expect(res.status).to.equal(1);
    expect(res.stdout).to.match(new RegExp(`Processing payment for ${userSuccess.address}`));
    expect(res.stdout).to.match(/Failed payments summary/);
    expect(failures).to.have.lengthOf(1);
    expect(failures[0].user).to.equal(userFail.address);

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

  it('runs in daemon mode and stops on signal', function (done) {
    loadFixture(deployFixture).then(({ merchant, userSuccess, subscription }) => {
      const tmpJson = path.join(__dirname, 'subscribers.daemon.tmp.json');
      fs.writeFileSync(tmpJson, JSON.stringify([userSuccess.address], null, 2));

      const child = spawn(
        'node',
        ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts', '--daemon'],
        {
          env: {
            ...process.env,
            TS_NODE_TRANSPILE_ONLY: '1',
            SUBSCRIPTION_ADDRESS: subscription.target,
            PLAN_ID: '0',
            SUBSCRIBERS_FILE: tmpJson,
            MERCHANT_PRIVATE_KEY: merchant.privateKey,
            INTERVAL: '1',
          },
          stdio: 'ignore',
        },
      );

      child.on('exit', (code) => {
        fs.unlinkSync(tmpJson);
        try {
          expect(code).to.equal(0);
          expect(() => process.kill(child.pid!, 0)).to.throw();
          done();
        } catch (err) {
          done(err as Error);
        }
      });

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 500);
    }, done);
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

  it('skips entries with invalid addresses', async function () {
    const { merchant, userSuccess, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.invalidaddr.tmp.json');
    const data = [userSuccess.address, '0xINVALID'];
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

    expect(res.status).to.equal(0);
    expect(res.stderr).to.match(/Invalid address/);
    expect(res.stdout).to.match(new RegExp(`Processing payment for ${userSuccess.address}`));
  });

  it('skips entries with invalid plan ids', async function () {
    const { merchant, userSuccess, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.invalidplan.tmp.json');
    const data = [userSuccess.address, { user: userSuccess.address, plan: -1 }];
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

    expect(res.status).to.equal(0);
    expect(res.stderr).to.match(/No valid plan IDs/);
    expect(res.stdout).to.match(new RegExp(`Processing payment for ${userSuccess.address}`));
  });

  it('overrides env vars using a config file', async function () {
    const { merchant, userSuccess, userFail, subscription } = await loadFixture(deployFixture);

    const subsJson = path.join(__dirname, 'subscribers.config.tmp.json');
    const cfgYaml = path.join(__dirname, 'payment.config.tmp.yaml');
    const data = [userSuccess.address, { user: userFail.address, plan: 0 }];
    fs.writeFileSync(subsJson, JSON.stringify(data, null, 2));
    fs.writeFileSync(cfgYaml, 'LOG_LEVEL: error\nMAX_CONCURRENCY: 2\n');

    const res = spawnSync(
      'node',
      ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts', '--config', cfgYaml],
      {
        env: {
          ...process.env,
          TS_NODE_TRANSPILE_ONLY: '1',
          SUBSCRIPTION_ADDRESS: subscription.target,
          PLAN_ID: '0',
          SUBSCRIBERS_FILE: subsJson,
          MERCHANT_PRIVATE_KEY: merchant.privateKey,
          LOG_LEVEL: 'info',
        },
        encoding: 'utf8',
      },
    );

    fs.unlinkSync(subsJson);
    fs.unlinkSync(cfgYaml);

    expect(res.status).to.equal(1);
    expect(res.stdout).to.not.match(/Processing payment/);
    expect(res.stderr).to.match(new RegExp(userFail.address));
  });

  it('skips transactions when DRY_RUN=true', async function () {
    const { merchant, userSuccess, userFail, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.dryrun1.tmp.json');
    fs.writeFileSync(tmpJson, JSON.stringify([userSuccess.address, { user: userFail.address, plan: 0 }], null, 2));

    const before = (await subscription.userSubscriptions(userSuccess.address, 0)).nextPaymentDate;

    const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'], {
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        SUBSCRIPTION_ADDRESS: subscription.target,
        PLAN_ID: '0',
        SUBSCRIBERS_FILE: tmpJson,
        MERCHANT_PRIVATE_KEY: merchant.privateKey,
        DRY_RUN: 'true',
      },
      encoding: 'utf8',
    });

    fs.unlinkSync(tmpJson);

    expect(res.status).to.equal(0);
    expect(res.stdout).to.match(/DRY_RUN/);
    const after = (await subscription.userSubscriptions(userSuccess.address, 0)).nextPaymentDate;
    expect(after).to.equal(before);
  });

  it('accepts DRY_RUN=1', async function () {
    const { merchant, userSuccess, subscription } = await loadFixture(deployFixture);

    const tmpJson = path.join(__dirname, 'subscribers.dryrun2.tmp.json');
    fs.writeFileSync(tmpJson, JSON.stringify([userSuccess.address], null, 2));

    const before = (await subscription.userSubscriptions(userSuccess.address, 0)).nextPaymentDate;

    const res = spawnSync('node', ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'], {
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        SUBSCRIPTION_ADDRESS: subscription.target,
        PLAN_ID: '0',
        SUBSCRIBERS_FILE: tmpJson,
        MERCHANT_PRIVATE_KEY: merchant.privateKey,
        DRY_RUN: '1',
      },
      encoding: 'utf8',
    });

    fs.unlinkSync(tmpJson);

    expect(res.status).to.equal(0);
    const after = (await subscription.userSubscriptions(userSuccess.address, 0)).nextPaymentDate;
    expect(after).to.equal(before);
  });

  it('caches subscribers when CACHE_SUBSCRIBERS=true', function (done) {
    loadFixture(deployFixture).then(({ merchant, userSuccess, subscription }) => {
      const tmpJson = path.join(__dirname, 'subscribers.cache.tmp.json');
      fs.writeFileSync(tmpJson, JSON.stringify([userSuccess.address], null, 2));

      const child = spawn(
        'node',
        ['-r', 'ts-node/register/transpile-only', 'scripts/process-due-payments.ts'],
        {
          env: {
            ...process.env,
            TS_NODE_TRANSPILE_ONLY: '1',
            SUBSCRIPTION_ADDRESS: subscription.target,
            PLAN_ID: '0',
            SUBSCRIBERS_FILE: tmpJson,
            MERCHANT_PRIVATE_KEY: merchant.privateKey,
            INTERVAL: '1',
            CACHE_SUBSCRIBERS: 'true',
          },
        },
      );

      let output = '';
      child.stdout.on('data', (d) => {
        output += d.toString();
      });

      setTimeout(() => {
        fs.unlinkSync(tmpJson);
      }, 1200);

      setTimeout(() => {
        child.kill('SIGTERM');
      }, 2500);

      child.on('exit', (_code, signal) => {
        try {
          const re = new RegExp(`Processing payment for ${userSuccess.address}`, 'g');
          const matches = output.match(re) || [];
          expect(signal).to.equal('SIGTERM');
          expect(matches.length).to.be.greaterThan(1);
          done();
        } catch (err) {
          done(err as Error);
        }
      });
    }, done);
  });
});
