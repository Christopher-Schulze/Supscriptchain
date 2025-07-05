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

## Monitoring and Healthchecks

For the subgraph, monitor the Graph Node via its `/health` endpoint. The helper script `npm run subgraph-server` can automatically restart the node when a healthcheck fails. Configure the interval and URL using the `GRAPH_NODE_HEALTH_*` environment variables.

Consider setting up additional service-level monitoring for your contract interactions and Docker containers.

- Expose metrics to Prometheus and build Grafana dashboards to visualize contract and service performance.

### Example Prometheus Setup

The helper script exposes metrics on `localhost:9091/metrics` by default.
Run it with:

```bash
METRICS_PORT=9091 npm run subgraph-server
```

Add a scrape configuration in your Prometheus `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'subgraph'
    static_configs:
      - targets: ['localhost:9091']
```

Example alert rule for Prometheus:

```yaml
alert: GraphNodeDown
expr: graph_node_health_status == 0
for: 5m
labels:
  severity: critical
annotations:
  summary: Graph node is not responding
```

Grafana can visualize these metrics using the Prometheus data source. Configure alert rules for high `graph_node_health_failures_total` or when `graph_node_health_status` remains `0` for an extended period. Alerts can send notifications via email, Slack or any supported service.
