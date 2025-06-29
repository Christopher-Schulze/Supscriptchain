# Usage Examples

Below are small snippets showing how to interact with the Subscription contract from a Hardhat script or console.

## Creating a Plan
```ts
const subscription = await ethers.getContract("Subscription");
await subscription.createPlan(
  merchant.address,
  token.address,
  ethers.utils.parseUnits("10", 18), // token price
  30 * 24 * 60 * 60,                 // billing cycle in seconds
  false,                             // priceInUsd
  0,
  ethers.constants.AddressZero
);
```

## Subscribing
```ts
await subscription.connect(user).subscribe(0);
```

## Processing Recurring Payment
```ts
await subscription.connect(merchant).processPayment(user.address, 0);
```

## Cancelling a Subscription
```ts
await subscription.connect(user).cancelSubscription(0);
```

## Updating a Plan
```ts
await subscription.updatePlan(
  0,                              // planId
  60 * 60 * 24 * 60,             // new billing cycle
  ethers.utils.parseUnits("20", 18), // new price
  false,                         // priceInUsd
  0,
  ethers.constants.AddressZero
);
```
