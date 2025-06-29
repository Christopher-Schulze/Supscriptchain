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

## Running the Subgraph Locally

The `subgraph/` folder contains a basic [The Graph](https://thegraph.com) setup
that indexes events from `Subscription.sol`. To start a local Graph node and
query the data, follow these steps:

1. Install the Graph CLI:

   ```bash
   npm install -g @graphprotocol/graph-cli
   ```

2. Run a local Graph node using the docker configuration from the official
   repository:

   ```bash
   git clone https://github.com/graphprotocol/graph-node.git
   cd graph-node/docker
   docker compose up
   ```

3. In another terminal, generate and deploy the subgraph:

   ```bash
   npm run codegen
   npm run build-subgraph
   graph deploy \
     --node http://localhost:8020/ \
     --ipfs http://localhost:5001/ \
     subscription-subgraph subgraph/subgraph.yaml
   ```

4. Query the subgraph via GraphiQL at
   `http://localhost:8000/subgraphs/name/subscription-subgraph/graphql` or using
   `curl`:

   ```bash
   curl -X POST http://localhost:8000/subgraphs/name/subscription-subgraph/graphql \
     -H 'Content-Type: application/json' \
     -d '{"query":"{ plans { id merchant } }"}'
   ```

This returns the list of created plans indexed from your local chain.
