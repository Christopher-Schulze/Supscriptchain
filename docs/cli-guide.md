# CLI Guide

This page collects the command line calls used throughout the project. Every script accepts the `--network` flag when run via Hardhat.

## Subscription Management (`scripts/cli.ts`)

All subcommands support `--network` and `--json`.

### `list`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | address of the subscription contract |
| `--json`          | return JSON instead of text          |

```bash
npx ts-node scripts/cli.ts list --subscription <address> --network hardhat
```

### `create`

| Option             | Description                             |
|--------------------|-----------------------------------------|
| `--subscription`   | contract address                        |
| `--merchant`       | merchant wallet address                 |
| `--token`          | ERC20 used for billing                  |
| `--price`          | price per cycle                         |
| `--billing-cycle`  | seconds between payments                |

```bash
npx ts-node scripts/cli.ts create \
  --subscription <address> \
  --merchant <merchant> \
  --token <erc20> \
  --price 1000 \
  --billing-cycle 3600 \
  --network hardhat
```

### `update`

| Option            | Description                          |
|-------------------|--------------------------------------|
| `--subscription`  | contract address                     |
| `--plan-id`       | id of the plan to update             |
| `--price`         | new price                             |

```bash
npx ts-node scripts/cli.ts update \
  --subscription <address> \
  --plan-id 0 \
  --price 2000 \
  --network hardhat
```

### `pause` / `unpause`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | contract address                    |

```bash
npx ts-node scripts/cli.ts pause --subscription <address> --network hardhat
npx ts-node scripts/cli.ts unpause --subscription <address> --network hardhat
```

### `disable`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | contract address                    |
| `--plan-id`       | plan to disable                     |

```bash
npx ts-node scripts/cli.ts disable --subscription <address> --plan-id 0 --network hardhat
```

### `update-merchant`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | contract address                    |
| `--plan-id`       | plan to update                      |
| `--merchant`      | new merchant address                |

```bash
npx ts-node scripts/cli.ts update-merchant \
  --subscription <address> \
  --plan-id 0 \
  --merchant <newMerchant> \
  --network hardhat
```

### `status`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | contract address                    |

```bash
npx ts-node scripts/cli.ts status --subscription <address> --network hardhat
```

### `list-subs`

| Option            | Description                         |
|-------------------|-------------------------------------|
| `--subscription`  | contract address                    |
| `--user`          | user address                        |

```bash
npx ts-node scripts/cli.ts list-subs \
  --subscription <address> \
  --user <address> \
  --network hardhat
```

### `metrics`

| Option        | Description                                   |
|---------------|-----------------------------------------------|
| `--subgraph`  | URL of the subgraph metrics endpoint          |
| `--payments`  | URL of the payment processor metrics endpoint |

```bash
npx ts-node scripts/cli.ts metrics
```

Example output:

```text
Subgraph Server:
  restarts: 0
  health failures: 0

Payment Processor:
  plan 0: 1 success, 0 failure
```

## Deployment Scripts

### `deploy.ts`

| Option       | Description             |
|--------------|-------------------------|
| `--network`  | Hardhat network         |
| env vars     | see `docs/env-vars.md`  |

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

### `verify.ts`

| Option       | Description                          |
|--------------|--------------------------------------|
| `--network`  | Hardhat network                      |
| `ETHERSCAN_API_KEY` | API key for verification       |

```bash
npx hardhat run scripts/verify.ts --network <network>
```

### `upgrade.ts`

| Option       | Description                                |
|--------------|--------------------------------------------|
| `--network`  | Hardhat network                            |
| `SUBSCRIPTION_ADDRESS` | proxy address to upgrade          |

```bash
npx hardhat run scripts/upgrade.ts --network <network>
```

## Processing Due Payments (`process-due-payments.ts`)

| Option/Variable        | Description                                   |
|------------------------|-----------------------------------------------|
| `--config`             | path to JSON or YAML config file              |
| `--daemon`             | run continuously using `INTERVAL`             |
| `SUBSCRIPTION_ADDRESS` | address of the subscription contract          |
| `PLAN_ID`              | default plan id used when none provided       |
| `SUBSCRIBERS_FILE`     | subscribers list in JSON or YAML              |
| `MERCHANT_PRIVATE_KEY` | private key used for payments                 |
| `PAYMENT_CONFIG`       | alternative way to specify the config file    |
| `MAX_RETRIES`          | retries per failed payment                    |
| `RETRY_BASE_DELAY_MS`  | base delay before a retry                     |
| `DRY_RUN`              | log payments without sending                  |
| `METRICS_PORT`         | serve Prometheus metrics                      |

```bash
npx hardhat run scripts/process-due-payments.ts --network sepolia --config cfg.yaml
```

The config file may be JSON or YAML and can contain any option or environment variable. Pass the path via `--config` or set `PAYMENT_CONFIG`.

## Subgraph

### Build

| Variable           | Description                                    |
|--------------------|------------------------------------------------|
| `NETWORK`          | target network for the manifest                |
| `CONTRACT_ADDRESS` | deployed contract address                      |

```bash
NETWORK=sepolia CONTRACT_ADDRESS=0xYourContract npm run build-subgraph
```

### Deploy

| Variable             | Description                               |
|----------------------|-------------------------------------------|
| `GRAPH_NODE_URL`     | Graph Node deployment endpoint            |
| `IPFS_URL`           | IPFS endpoint used by the node            |
| `SUBGRAPH_NAME`      | name of the subgraph (default `subscription-subgraph`) |
| `GRAPH_ACCESS_TOKEN` | optional access token                      |
| `SUBGRAPH_VERSION`   | version label for `graph deploy`           |

```bash
npm run deploy-subgraph
```

### Subgraph Server

| Variable                    | Description                           |
|-----------------------------|---------------------------------------|
| `GRAPH_NODE_CMD`            | path to `graph-node` binary           |
| `GRAPH_NODE_ARGS`           | extra arguments                       |
| `GRAPH_NODE_HEALTH`         | healthcheck URL                       |
| `GRAPH_NODE_HEALTH_INTERVAL`| interval between checks in ms         |
| `GRAPH_NODE_MAX_FAILS`      | failed checks before restart          |
| `GRAPH_NODE_RESTART_DELAY`  | delay before restart in ms            |
| `METRICS_PORT`              | metrics port                          |
| `LOG_FILE`                  | append log output                     |
| `LOKI_URL`                  | stream logs to Loki                   |
| `LOG_LEVEL`                 | minimum log level                     |

```bash
npm run subgraph-server
# or with env file
./scripts/start-subgraph.sh .env
```

## Development Utilities

| Command                  | Purpose                             |
|--------------------------|-------------------------------------|
| `npm run test:e2e`       | run Playwright tests                |
| `npm run slither`        | execute static analysis             |
| `npm run solhint`        | lint Solidity contracts             |
| `npm run coverage`       | generate coverage report            |
| `npm run gas`            | estimate gas usage                  |
| `npm run devstack`       | start Hardhat, subgraph and frontend |

```bash
npx playwright test --headless
```
