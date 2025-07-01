# Usage Examples

Below are small snippets showing how to interact with the Subscription contract from a Hardhat script or console. The contract is deployed as an upgradeable proxy (`SubscriptionUpgradeable`).

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

## Subscribing with Permit
```ts
const deadline = Math.floor(Date.now() / 1000) + 3600;
const { v, r, s } = await getPermitSignature(
  user,
  token,
  subscription.address,
  price,
  deadline
);
await subscription.connect(user).subscribeWithPermit(0, deadline, v, r, s);
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
that indexes events from the upgradeable `SubscriptionUpgradeable.sol` contract.
To start a local Graph node and
query the data, follow these steps:

1. Install the Graph CLI:

   ```bash
   npm install -g @graphprotocol/graph-cli
   ```

2. Install `graph-node` using the [official packages](https://github.com/graphprotocol/graph-node/releases)
   or by building it from source. `graph-node` requires a running PostgreSQL
   database and an IPFS daemon. Create a database called `graph-node` and ensure
   IPFS is available on `localhost:5001`.

   The Docker image exposes two ports: `8000` for GraphQL queries and `8020` for
   management operations. Replace `NETWORK` with the name of your chain
   (e.g. `localhost`) and adjust the PostgreSQL settings if they differ from the
   values below.

   A quick way to start the node is using Docker:

   ```bash
    docker run -it --rm -p 8000:8000 -p 8020:8020 \
      -e postgres_host=host.docker.internal \
      -e postgres_user=graph \
      -e postgres_pass=password \
      -e postgres_db=graph-node \
      -e ethereum=NETWORK:http://host.docker.internal:8545 \
      -e ipfs=host.docker.internal:5001 \
      graphprotocol/graph-node:latest
    ```

     `NETWORK` should match the chain that the subgraph indexes. When using a
     local Hardhat node it usually is `localhost`.

   If you have the binary installed locally, start it as follows:

   ```bash
   graph-node \
     --postgres-url postgresql://graph:password@localhost:5432/graph-node \
     --ethereum-rpc NETWORK:http://localhost:8545 \
     --ipfs 127.0.0.1:5001
   ```

3. In another terminal, generate and deploy the subgraph. First create a
   local manifest by replacing the placeholders in `subgraph.yaml`:

   ```bash
  # Replace with the network name and address of your deployed proxy
  NETWORK=<network> CONTRACT_ADDRESS=<address> \
    npx ts-node scripts/prepare-subgraph.ts
   npm run codegen
   graph build subgraph/subgraph.local.yaml
   graph deploy \
     --node http://localhost:8020/ \
     --ipfs http://localhost:5001/ \
     subscription-subgraph subgraph/subgraph.local.yaml
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
