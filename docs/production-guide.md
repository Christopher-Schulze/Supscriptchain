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

## Monitoring

`scripts/subgraph-server.ts` runs the Graph Node with automatic restarts when
its health endpoint becomes unreachable. In production you typically want this
script supervised by `systemd` or a process manager such as **PM2**.

### Using systemd

Create a unit file `/etc/systemd/system/subgraph-server.service`:

```ini
[Unit]
Description=Supscriptchain subgraph server
After=network.target

[Service]
WorkingDirectory=/path/to/app
EnvironmentFile=/path/to/.env
ExecStart=/usr/bin/npm run subgraph-server
Restart=always

[Install]
WantedBy=multi-user.target
```

Reload the systemd daemon with `systemctl daemon-reload` and enable the service
via `systemctl enable --now subgraph-server.service`.

### Using PM2

Alternatively run the server under PM2:

```bash
pm2 start scripts/subgraph-server.ts --name subgraph-server --interpreter ts-node
pm2 save
pm2 startup
```

PM2 keeps the process alive and can integrate with systemd through
`pm2 startup`.

### Healthchecks

Monitor the Graph Node via its `/health` endpoint. The helper script `npm run
subgraph-server` can automatically restart the node when a healthcheck fails.
Configure the interval and URL with the `GRAPH_NODE_HEALTH_*` environment
variables. Tools like **Prometheus** and **Grafana** are helpful for storing
metrics and visualizing the health status of your node.

Consider setting up additional service-level monitoring for your contract
interactions and Docker containers.
