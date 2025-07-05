import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Pauses subscription related functions on the contract.
 *
 * Example:
 * npx hardhat pause --network hardhat --subscription 0xSUB
 */

task('pause', 'Pause the subscription contract')
  .addOptionalParam('subscription', 'Subscription contract address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt('SubscriptionUpgradeable', subscription, signer);
    const tx = await contract.pause();
    await tx.wait();
    console.log(`Contract paused with tx ${tx.hash}`);
  });

task('unpause', 'Unpause the subscription contract')
  .addOptionalParam('subscription', 'Subscription contract address')
  .setAction(async (args: any, hre: HardhatRuntimeEnvironment) => {
    const subscription = args.subscription ?? process.env.SUBSCRIPTION_ADDRESS;
    if (!subscription) throw new Error('subscription address missing');
    const [signer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt('SubscriptionUpgradeable', subscription, signer);
    const tx = await contract.unpause();
    await tx.wait();
    console.log(`Contract unpaused with tx ${tx.hash}`);
  });

export {};
