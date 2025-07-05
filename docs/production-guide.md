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

### Secrets Übersicht

Die folgenden Variablen enthalten vertrauliche Informationen und sollten nicht im Repository gespeichert werden.

| Variable | Verwendung | Empfohlener Speicherort |
| -------- | ---------- | ---------------------- |
| `SEPOLIA_RPC_URL` | RPC Endpoint für das Sepolia-Testnet | GitHub Secret oder Eintrag in HashiCorp Vault |
| `SEPOLIA_PRIVATE_KEY` | privater Schlüssel für Testnet-Deployments | GitHub Secret oder Eintrag in HashiCorp Vault |
| `MAINNET_RPC_URL` | RPC Endpoint für das Ethereum-Mainnet | GitHub Secret oder Eintrag in HashiCorp Vault |
| `MAINNET_PRIVATE_KEY` | privater Schlüssel für Mainnet-Deployments | GitHub Secret oder Eintrag in HashiCorp Vault |
| `MERCHANT_PRIVATE_KEY` | Schlüssel für `process-due-payments` | GitHub Secret oder Eintrag in HashiCorp Vault |

Bewahren Sie diese Werte nicht im Quellcode auf. GitHub Actions können sie direkt aus Repository-Secrets laden. Für eigene Server bieten sich zentrale Secret-Stores wie HashiCorp Vault oder AWS Secrets Manager an.

## Secure Key Management

Production deployments should inject secrets via your hosting provider's secret store or environment variables rather than storing them in plain text. Limit access to the `.env` file and do not reuse private keys across environments. When using Docker, mount secrets as read-only files or pass them via the `--env-file` option.

- Rotate private keys and API credentials regularly to reduce the impact of leaked secrets.

## Managing `PAUSER_ROLE`

- Grant the role only to accounts that must pause and unpause the contract in emergencies.
- Review assignments periodically and revoke the role from unused addresses.

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

## Health Checks

For the subgraph, monitor the Graph Node via its `/health` endpoint. The helper script `npm run subgraph-server` can automatically restart the node when a healthcheck fails. Configure the interval and URL using the `GRAPH_NODE_HEALTH_*` variables. Logging can be controlled with `LOG_FILE`, `LOG_LEVEL` and `LOKI_URL`.

Consider setting up additional service-level monitoring for your contract interactions and Docker containers.


## Monitoring

`scripts/subgraph-server.ts` serves Prometheus metrics on port `9091`.
Start the server with:

```bash
METRICS_PORT=9091 npm run subgraph-server
```

Add a scrape config in your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'subgraph-server'
    static_configs:
      - targets: ['localhost:9091']
```

Grafana can visualize these metrics using Prometheus as the data source. Alert on `graph_node_health_failures_total` or when `graph_node_health_status` stays `0` for several minutes.

`scripts/process-due-payments.ts` can expose similar metrics. Start the script or container with `METRICS_PORT` set:

```bash
METRICS_PORT=9092 node scripts/process-due-payments.ts
```

Add another scrape job:

```yaml
scrape_configs:
  - job_name: 'payments'
    static_configs:
      - targets: ['localhost:9092']
```

Grafana dashboards can track `payments_processed_total` and `payment_failures_total` to monitor successful charges and failures.
