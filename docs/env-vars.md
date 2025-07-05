# Environment Variables

This page lists important environment variables used across the project.

## Root Project

The main Hardhat scripts and tests load variables from `.env`.
Copy `.env.example` to `.env` and provide values for:

- `MERCHANT_ADDRESS` – address receiving subscription payments
- `TOKEN_ADDRESS` – ERC20 token used for payments
- `PRICE_FEED` – Chainlink oracle address when using USD pricing
- `BILLING_CYCLE` – billing interval in seconds
- `PRICE_IN_USD` – `true` if prices are denominated in USD
- `FIXED_PRICE` – token price when not using USD
- `USD_PRICE` – USD cent price when `PRICE_IN_USD=true`
- `SEPOLIA_RPC_URL` / `SEPOLIA_PRIVATE_KEY` – network credentials
- `MAINNET_RPC_URL` / `MAINNET_PRIVATE_KEY` – mainnet credentials

## Frontend

The Next.js app reads variables from `frontend/.env.local`:

- `NEXT_PUBLIC_CONTRACT_ADDRESS` – deployed `Subscription` address
- `NEXT_PUBLIC_CHAIN_ID` – EVM chain id used when no wallet is connected
- `NEXT_PUBLIC_RPC_URL` – RPC URL used when no wallet is connected
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint for analytics

Run `node frontend/scripts/check-env.js` to validate these values.

## Subgraph

Subgraph scripts look for these variables:

- `NETWORK` – network name like `sepolia`
- `CONTRACT_ADDRESS` – address of deployed contract
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint consumed by the frontend

`npm run prepare-subgraph` and `npm run build-subgraph` use these variables.
