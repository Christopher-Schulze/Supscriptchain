// Usage Examples for SubscriptionUpgradeable (TypeScript, Bash, Environment, Curl, komplett in einem Block)

// --- TypeScript (Hardhat Console/Scripts) ---

// Creating a Plan
const subscription = await ethers.getContract("Subscription");
await subscription.createPlan(
  merchant.address,
  token.address,
  ethers.utils.parseUnits("10", 18), // token price
  30 * 24 * 60 * 60,                 // billing cycle in seconds
  false,                             // priceInUsd
  0,
  ethers.constants.AddressZero
);

// Subscribing
await subscription.connect(user).subscribe(0);

// Subscribing with Permit
const deadline = Math.floor(Date.now() / 1000) + 3600;
const { v, r, s } = await getPermitSignature(
  user,
  token,
  subscription.address,
  price,
  deadline
);
await subscription.connect(user).subscribeWithPermit(0, deadline, v, r, s);

// Processing Recurring Payment
await subscription.connect(merchant).processPayment(user.address, 0);

// Cancelling a Subscription
await subscription.connect(user).cancelSubscription(0);

// Updating a Plan
await subscription.updatePlan(
  0,                                   // planId
  60 * 60 * 24 * 60,                   // new billing cycle
  ethers.utils.parseUnits("20", 18),   // new price
  false,                               // priceInUsd
  0,
  ethers.constants.AddressZero
);

// --- Subgraph Setup & Usage ---

# 1. Install the Graph CLI
npm install -g @graphprotocol/graph-cli

# 2. Start Graph Node (Docker recommended)
docker run -it --rm -p 8000:8000 -p 8020:8020 \
  -e postgres_host=host.docker.internal \
  -e postgres_user=graph \
  -e postgres_pass=password \
  -e postgres_db=graph-node \
  -e ethereum=NETWORK:http://host.docker.internal:8545 \
  -e ipfs=host.docker.internal:5001 \
  graphprotocol/graph-node:latest

# OR: (if you want to run graph-node locally, not in Docker)
graph-node \
  --postgres-url postgresql://graph:password@localhost:5432/graph-node \
  --ethereum-rpc NETWORK:http://localhost:8545 \
  --ipfs 127.0.0.1:5001

# 3. Prepare & build the subgraph (replace <network> and <address>)
# Set env or pass via command line, both are fine:
NETWORK=<network> CONTRACT_ADDRESS=<address> \
  npx ts-node scripts/prepare-subgraph.ts

npm run codegen
npm run prepare-subgraph -- --network <network> --address <address>
npm run build-subgraph

# ...OR directly (build-subgraph auto-runs prepare-subgraph)
npm run build-subgraph -- --network <network> --address <address>

# 4. Deploy to local graph-node
graph deploy \
  --node http://localhost:8020/ \
  --ipfs http://localhost:5001/ \
  subscription-subgraph subgraph/subgraph.local.yaml

# 5. Query the subgraph (GraphiQL or Curl)
# Web:
# http://localhost:8000/subgraphs/name/subscription-subgraph/graphql

# Curl:
curl -X POST http://localhost:8000/subgraphs/name/subscription-subgraph/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ plans { id merchant } }"}'

# Returns:
# {
#   "data": {
#     "plans": [
#       { "id": "...", "merchant": "..." },
#       ...
#     ]
#   }
# }

# --- Environment Variables for prepare-subgraph/build-subgraph ---

# Export these for easy CI or local use:
export NETWORK=sepolia
export CONTRACT_ADDRESS=0xYourContract
npm run build-subgraph

# --- Frontend Integration: .env.local for Analytics Page ---

# In frontend/.env.local:
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/subscription-subgraph/graphql

// ----- END OF ONE-BLOCK USAGE-DOKU -----
// Einfach alles in eins. Keine Splitter mehr, keine dummen Merge-Tags. Copy. Paste. Fertig. 💸