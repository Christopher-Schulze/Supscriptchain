import { expect } from 'chai';
import { spawnSync } from 'child_process';

function run(args: string[]) {
  return spawnSync(
    'node',
    ['-r', 'ts-node/register/transpile-only', 'scripts/cli.ts', ...args],
    { encoding: 'utf8' }
  );
}

describe('cli.ts', function () {
  this.timeout(20000);
  it('shows global help', function () {
    const res = run(['--help']);
    expect(res.stdout).to.contain('Manage subscription plans');
  });

  it('shows help for subcommands', function () {
    expect(run(['list', '--help']).stdout).to.contain('List existing plans');
    expect(run(['create', '--help']).stdout).to.contain('Create a new plan');
    expect(run(['update', '--help']).stdout).to.contain('Update an existing plan');
    expect(run(['pause', '--help']).stdout).to.contain('Pause the subscription contract');
    expect(run(['unpause', '--help']).stdout).to.contain('Unpause the subscription contract');
    expect(run(['disable', '--help']).stdout).to.contain('Disable a subscription plan');
    expect(run(['update-merchant', '--help']).stdout).to.contain('Update the merchant of a plan');
    expect(run(['subscribe', '--help']).stdout).to.contain('Subscribe to a plan');
    expect(run(['cancel', '--help']).stdout).to.contain('Cancel an active subscription');
    expect(run(['process-payment', '--help']).stdout).to.contain('Process a subscription payment');
  });

  it('shows help for status command', function () {
    const res = run(['status', '--help']);
    expect(res.stdout).to.contain('Show subscription contract status');
  });

  it('fails when subscription is missing', function () {
    const res = run(['list']);
    expect(res.status).to.not.equal(0);
    expect(res.stderr).to.match(/subscription address missing/i);

    const resSub = run(['subscribe']);
    expect(resSub.status).to.not.equal(0);
    expect(resSub.stderr).to.match(/subscription address missing/i);

    const resCancel = run(['cancel']);
    expect(resCancel.status).to.not.equal(0);
    expect(resCancel.stderr).to.match(/subscription address missing/i);

    const resPay = run(['process-payment']);
    expect(resPay.status).to.not.equal(0);
    expect(resPay.stderr).to.match(/subscription address missing/i);

    const resPayUser = run(['process-payment', '--subscription', '0x0000000000000000000000000000000000000000']);
    expect(resPayUser.status).to.not.equal(0);
    expect(resPayUser.stderr).to.match(/user address missing/i);
  });
});
