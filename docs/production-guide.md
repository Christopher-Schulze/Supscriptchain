# Production Guide

This document summarizes best practices for running the Supscriptchain stack in a production environment.

## Recommended `.env` Setup

Create a `.env` file based on `.env.example` and provide the required values:

- `MERCHANT_ADDRESS` – address receiving subscription payments
- `TOKEN_ADDRESS` – ERC20 token used for payments
- `PRICE_FEED` – Chainlink oracle when pricing in USD
- `BILLING_CYCLE` – interval between charges in seconds
- `PRICE_IN_USD` – `true` when using USD pricing
- `FIXED_PRICE` – token amount when not using USD
- `USD_PRICE` – price in USD cents when `PRICE_IN_USD=true`
- `SEPOLIA_RPC_URL` / `SEPOLIA_PRIVATE_KEY` – testnet credentials
- `MAINNET_RPC_URL` / `MAINNET_PRIVATE_KEY` – mainnet credentials
- `SUBSCRIPTION_ADDRESS` – proxy address after deployment
- `PLAN_ID` – optional default plan ID used by the payment script

Avoid committing this file to version control. Use different files per environment and keep them in a secure location.

## Secure Key Management

Production deployments should inject secrets via your hosting provider's secret store or environment variables rather than storing them in plain text. Limit access to the `.env` file and do not reuse private keys across environments. When using Docker, mount secrets as read-only files or pass them via the `--env-file` option.

## Deploying the Subgraph

Generate the Graph manifest and compile the subgraph:

```bash
NETWORK=<network> CONTRACT_ADDRESS=<deployed contract> npm run build-subgraph
```

Deploy `subgraph/subgraph.local.yaml` using `graph deploy` to your Graph Node. See [docs/usage-examples.md](usage-examples.md#running-the-subgraph-locally) for a detailed walkthrough.

## Running `process-due-payments.ts` in Docker

The repository ships `Dockerfile.payments` for processing recurring payments. Build and run the container with your `.env` file:

```bash
docker build -f Dockerfile.payments -t payments .
docker run --env-file .env payments
```

Important variables include `SUBSCRIPTION_ADDRESS`, `PLAN_ID` and `MERCHANT_PRIVATE_KEY`. The container runs `scripts/process-due-payments.ts` and exits with a non-zero status when any payments fail if `FAIL_ON_FAILURE=true`.

## Monitoring and Healthchecks

For the subgraph, monitor the Graph Node via its `/health` endpoint. The helper script `npm run subgraph-server` can automatically restart the node when a healthcheck fails. Configure the interval and URL using the `GRAPH_NODE_HEALTH_*` environment variables.

Consider setting up additional service-level monitoring for your contract interactions and Docker containers.

## Docker Compose Setup

An example compose file at `docs/docker-compose.example.yml` runs the full stack including Graph Node, a local Ethereum node and the frontend. Adjust the environment variables as needed and start the services with:

```bash
docker compose -f docs/docker-compose.example.yml up -d
```

This command launches Postgres, IPFS, Graph Node, an `anvil` chain and the production frontend.
