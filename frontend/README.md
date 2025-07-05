# Supscriptchain Frontend

This directory contains a simple Next.js application that interacts with the
`Subscription` smart contract using [`ethers.js`](https://docs.ethers.org/).

## Installation

Install dependencies in this directory:

```bash
npm install
```

## Environment Variables

Copy `.env.local.example` to `.env.local` and provide the required variables:

```bash
cp .env.local.example .env.local

NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
# EVM chain id used when no wallet is available
NEXT_PUBLIC_CHAIN_ID=1
# RPC provider used when MetaMask is not available
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
# GraphQL endpoint for the analytics page
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/subscription-subgraph/graphql
```

These values are required and the app will throw an error on startup if any are missing (see `lib/env.ts`):

- `NEXT_PUBLIC_CONTRACT_ADDRESS` – address of the deployed `Subscription` contract.
- `NEXT_PUBLIC_CHAIN_ID` – EVM chain id used when no wallet is available.
- `NEXT_PUBLIC_RPC_URL` – RPC provider used when no wallet is available.
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint for the analytics page.

## Start

Run the development server:

```bash
npm run dev
```

This command first validates `.env.local` via `scripts/check-env.js`.

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Pages

- `/plans` – displays all subscription plans stored in the contract.
- `/manage` – subscribe to or cancel a plan.
- `/payment` – merchant page to trigger a payment for a subscriber.
- `/analytics` – shows active subscriptions and past payments from the Subgraph.

Wallet connectivity supports MetaMask (injected provider), WalletConnect and
Coinbase Wallet. If no wallet is available the app falls back to the RPC URL for
read‑only operations.

## Using the Subgraph

The analytics page queries a Subgraph instance. To run one locally follow the
steps in [docs/usage-examples.md](../docs/usage-examples.md#running-the-subgraph-locally).
Set `NEXT_PUBLIC_SUBGRAPH_URL` in `.env.local` to the GraphQL endpoint exposed
by the node (e.g. `http://localhost:8000/subgraphs/name/subscription-subgraph/graphql`).
Once the Subgraph is synced, start the frontend with `npm run dev` and open
`/analytics` to view the indexed data.
