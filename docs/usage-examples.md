# Usage Examples

This page collects tips and commands for working with the repository.

## Running the Subgraph Locally {#running-the-subgraph-locally}

Follow these steps to generate the Graph files and deploy a local instance.

### 1. Install the Graph CLI

```bash
npm install -g @graphprotocol/graph-cli
```

### 2. Start a Graph Node

Using Docker is the quickest option:

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

Alternatively run the binary directly:

```bash
graph-node \
  --postgres-url postgresql://graph:password@localhost:5432/graph-node \
  --ethereum-rpc NETWORK:http://localhost:8545 \
  --ipfs 127.0.0.1:5001
```

### 3. Prepare the Subgraph

The `prepare-subgraph` script fills in the network and contract address in the
manifest. When a deployment exists under `deployments/<network>` or an
OpenZeppelin upgrades file in `.openzeppelin/`, the script automatically reads
the network and address from those files. If nothing can be detected, provide
the values via environment variables or CLI arguments.

1. Generate the types with `npm run codegen` (automatically done by
   `npm run build-subgraph`).
2. Run `npm run prepare-subgraph` to create `subgraph/subgraph.local.yaml`.

```bash
# Optional overrides
export NETWORK=sepolia
export CONTRACT_ADDRESS=0xYourContract

npm run codegen
npm run prepare-subgraph
```

### 4. Build the Subgraph

The build script runs `npm run codegen` and `npm run prepare-subgraph` before
compiling the subgraph:

```bash
npm run build-subgraph -- --network $NETWORK --address $CONTRACT_ADDRESS
```

The compiled files are written to `subgraph/build/` and the manifest used by
`graph build` is `subgraph/subgraph.local.yaml`.

### 5. Deploy

```bash
graph deploy \
  --node http://localhost:8020/ \
  --ipfs http://localhost:5001/ \
  subscription-subgraph subgraph/subgraph.local.yaml
```

### 6. Query

Open GraphiQL at:

```
http://localhost:8000/subgraphs/name/subscription-subgraph/graphql
```

Or query via cURL:

```bash
curl -X POST http://localhost:8000/subgraphs/name/subscription-subgraph/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ plans { id merchant } }"}'
```

### Environment Variables

`npm run prepare-subgraph` and `npm run build-subgraph` read the following
variables:

- `NETWORK` – network name used when preparing the manifest
- `CONTRACT_ADDRESS` – address of the deployed contract
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint consumed by the frontend

Export them in your shell or provide `--network` and `--address` on the command
line. To connect the frontend create `frontend/.env.local` with:

```ini
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/subscription-subgraph/graphql
```

Start the app with `npm run dev` and open `/analytics` once the subgraph has
synced.

## Deploying to a Hosted Graph Node

If you run a Graph Node on a remote server, set `GRAPH_NODE_URL` and `IPFS_URL`
(and optionally `GRAPH_ACCESS_TOKEN` and `SUBGRAPH_VERSION`) and run:

```bash
npm run deploy-subgraph
```

Point the frontend to the hosted endpoint:

Configure the frontend with the hosted endpoint:

```ini
NEXT_PUBLIC_SUBGRAPH_URL=https://your-node.example.com/subgraphs/name/subscription-subgraph/graphql
```

Monitoring the node can be automated with `npm run subgraph-server`, which
restarts `graph-node` on failure and logs health check errors.

`subgraph-server` accepts the following environment variables:

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

Example systemd service using these variables:

```ini
[Service]
Environment=GRAPH_NODE_CMD=/usr/local/bin/graph-node
Environment=GRAPH_NODE_ARGS=--config /etc/graph-node/config.toml
Environment=GRAPH_NODE_HEALTH=http://localhost:8000/health
Environment=GRAPH_NODE_HEALTH_INTERVAL=60000
Environment=GRAPH_NODE_MAX_FAILS=5
Environment=GRAPH_NODE_RESTART_DELAY=10000
ExecStart=/usr/bin/npm run subgraph-server --prefix /opt/supscriptchain
```

## Running Subgraph Integration Tests

The integration tests spin up a local Hardhat node and a Graph Node Docker
container. Ensure Docker is installed and running, then execute:

```bash
npx hardhat test subgraph/tests/integration.test.ts
```

This compiles the contracts, deploys both `SubscriptionUpgradeable` versions
through a proxy and verifies indexed events by querying the running Graph Node.

## Lokaler Komplettbetrieb

Eine `docker-compose.yml` im Projektroot startet Hardhat, den Subgraph-Server und das Frontend.
Legen Sie eine `.env`-Datei an, um Variablen für `subgraph` und `frontend` bereitzustellen.

Starten der gesamten Umgebung:

```bash
docker compose up --build
```

Hardhat läuft anschließend auf Port 8545, der Graph Node auf 8000 und das
Frontend unter <http://localhost:3000>.

## Beispiel `prometheus.yml`

Um Metriken sowohl vom Subgraph-Server als auch vom Zahlungs-Skript zu erfassen,
kann Prometheus wie folgt konfiguriert werden:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'subgraph'
    static_configs:
      - targets: ['localhost:9091']
  - job_name: 'payments'
    static_configs:
      - targets: ['localhost:9092']
```
