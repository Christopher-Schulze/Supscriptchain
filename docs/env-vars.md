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
- `NEXT_PUBLIC_REFRESH_INTERVAL` – reload interval for contract data in seconds (default `30`)

Run `node frontend/scripts/check-env.js` to validate these values.

## Subgraph

Subgraph scripts look for these variables:

- `NETWORK` – network name like `sepolia`
- `CONTRACT_ADDRESS` – address of deployed contract
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint consumed by the frontend

`npm run prepare-subgraph` and `npm run build-subgraph` use these variables.

`npm run deploy-subgraph` additionally expects:

- `GRAPH_NODE_URL` – Graph Node deployment endpoint (e.g. `https://your-node.example.com:8020/`)
- `IPFS_URL` – IPFS endpoint used by the node
- `SUBGRAPH_NAME` – name of the subgraph (default `subscription-subgraph`)
- `GRAPH_ACCESS_TOKEN` – access token for authenticated Graph Node (optional)
- `SUBGRAPH_VERSION` – version label passed to `graph deploy` (optional)

## Payment Script

`scripts/process-due-payments.ts` honours several variables:

- `SUBSCRIPTION_ADDRESS` – contract address to bill
- `PLAN_ID` – default plan id when the input file omits one
- `SUBSCRIBERS_FILE` – path to the subscribers list (JSON or YAML)
- `MERCHANT_PRIVATE_KEY` – private key used to sign transactions
- `PAYMENT_CONFIG` – optional JSON/YAML file with overrides
- `CACHE_SUBSCRIBERS` – `true` to cache the parsed list between runs
- `MAX_CONCURRENCY` – number of concurrent `processPayment` calls
- `MAX_RETRIES` – retries per failed payment
- `RETRY_BASE_DELAY_MS` – initial delay before a retry
- `FAIL_ON_FAILURE` – exit with status 1 when any payment fails
- `INTERVAL` – run continuously with this interval (in seconds)
- `NOTIFY_WEBHOOK` – POST each failure to this URL
- `LOG_FILE` – append console output to this file
- `LOKI_URL` – stream logs to a Loki instance
- `LOG_LEVEL` – minimum log level (`info`, `warn`, `error`)
- `FAILURES_FILE` – write a JSON summary of failed payments
- `METRICS_PORT` – serve Prometheus metrics on this port (optional)
- `DRY_RUN` – log each payment without sending a transaction

## Subgraph Server

`scripts/subgraph-server.ts` uses these variables:

- `GRAPH_NODE_CMD` – path to the `graph-node` binary (default `graph-node`)
- `GRAPH_NODE_ARGS` – additional arguments passed to the process
- `GRAPH_NODE_HEALTH` – healthcheck URL (default `http://localhost:8000/health`)
- `GRAPH_NODE_HEALTH_INTERVAL` – interval between health checks in ms
- `GRAPH_NODE_MAX_FAILS` – number of failed checks before a restart
- `GRAPH_NODE_RESTART_DELAY` – delay before restarting in ms
- `METRICS_PORT` – port for Prometheus metrics (default `9091`)
- `LOG_FILE` – append log output to this file
- `LOKI_URL` – stream logs to a Loki instance
- `LOG_LEVEL` – minimum log level (`info`, `warn`, `error`)
- `GRAPH_NODE_LOG` – log file path used when `LOG_FILE` is unset
