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

Set the network and contract address as environment variables or pass them via
CLI arguments. Then generate the code and create a local manifest:

```bash
export NETWORK=sepolia
export CONTRACT_ADDRESS=0xYourContract

npm run codegen
npm run prepare-subgraph -- --network $NETWORK --address $CONTRACT_ADDRESS
```

### 4. Build the Subgraph

The build script runs `prepare-subgraph` automatically:

```bash
npm run build-subgraph -- --network $NETWORK --address $CONTRACT_ADDRESS
```

This writes `subgraph/subgraph.local.yaml`.

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

The subgraph scripts read the following variables:

- `NETWORK` – network name used when preparing the manifest
- `CONTRACT_ADDRESS` – address of the deployed contract
- `NEXT_PUBLIC_SUBGRAPH_URL` – GraphQL endpoint used by the frontend

For the frontend create `frontend/.env.local` with:

```ini
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/subscription-subgraph/graphql
```

Start the app with `npm run dev` and open `/analytics` once the subgraph has
synced.
