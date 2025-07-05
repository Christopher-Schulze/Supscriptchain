# Supscriptchain

[![CI](https://github.com/Christopher-Schulze/Supscriptchain/actions/workflows/ci.yml/badge.svg)](https://github.com/Christopher-Schulze/Supscriptchain/actions/workflows/ci.yml)

This project contains a simple subscription smart contract written in Solidity along with TypeScript tests using Hardhat. It allows merchants to create subscription plans that can be paid in ERC20 tokens or in USD via a Chainlink price feed.

## Requirements

- Node.js
- npm

## Setup

Clone the repository and install dependencies:

```bash
npm install
npm install --save-dev solc
```

Copy `.env.example` to `.env` and adjust the values for your deployment:

```bash
cp .env.example .env
```

See [docs/env-vars.md](docs/env-vars.md) for a full list of environment variables used across the project.

## Running Tests

```bash
npm test
```

The project now includes a local Solidity compiler. Hardhat will compile using
`node_modules/solc/soljson.js`, so no network access is required during
compilation.

## E2E-Tests

Die Playwright-Tests befinden sich im Ordner `e2e/`. Sie laufen standardmäßig
im Headless-Modus. Starte sie mit:

```bash
npm run test:e2e
```

Dies ruft `playwright test` auf und öffnet keinen Browser. Die Tests starten
einen lokalen Hardhat-Knoten sowie den Next.js-Server und setzen dabei die
Umgebungsvariablen `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_RPC_URL` und
`NEXT_PUBLIC_SUBGRAPH_URL` automatisch. Weitere Einstellungen sind nicht
erforderlich.

Um die Tests manuell aufzurufen, können die Variablen auch explizit gesetzt
werden:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=<address> \
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545 \
NEXT_PUBLIC_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/subscription-subgraph/graphql \
npx playwright test --headless
```

## Deployment

Deployment is handled by a single script `scripts/deploy.ts`.
Specify the Hardhat network via the `--network` flag.

Before deploying, each script runs `scripts/check-env.ts` to verify that all
variables in `.env.example` are set.

Both scripts require the following environment variables:

- `MERCHANT_ADDRESS`
- `TOKEN_ADDRESS`
- `PRICE_FEED`
- `BILLING_CYCLE`
- `PRICE_IN_USD`
- `FIXED_PRICE`
- `USD_PRICE`

The Hardhat networks `sepolia` and `mainnet` read their RPC URLs and
private keys from `.env` as well:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`
- `MAINNET_RPC_URL`
- `MAINNET_PRIVATE_KEY`

Your `hardhat.config.ts` should include network settings that load these values:

```ts
networks: {
  sepolia: {
    url: process.env.SEPOLIA_RPC_URL || "",
    accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
  },
  mainnet: {
    url: process.env.MAINNET_RPC_URL || "",
    accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
  },
}
```

Example deployment to a testnet network configured in `hardhat.config.ts`:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Contract Verification

After deployment you can verify both proxy and implementation contracts using the
script `scripts/verify.ts`:

```bash
npx hardhat run scripts/verify.ts --network <network>
```

Make sure `ETHERSCAN_API_KEY` is set in your environment so the Hardhat verify
plugin can submit the contract source to the block explorer.

## Static Analysis

Install [Slither](https://github.com/crytic/slither) using `pip`:

```bash
pip install slither-analyzer
```

Run the analyzer using the npm script:

```bash
npm run slither
```

This executes `slither .` under the hood.

CI will fail if Slither reports any high severity findings.

## Linting

Run Solhint to check Solidity style and best practices:

```bash
npm run solhint
```

## Coverage

Generate a test coverage report using:

```bash
npm run coverage
```

## Gas Report

Estimate gas consumption during tests:

```bash
npm run gas
```

The command sets `REPORT_GAS=true` and prints a table similar to:

```
·---------------------------------|---------------|------------|-------------·
|  Contract                        ·  Min Gas      ·  Max Gas   ·  Avg Gas   |
·---------------------------------|---------------|------------|-------------·
|  Subscription                    ·       50,000  ·   150,000  ·    80,000  |
·---------------------------------|---------------|------------|-------------·
```

## Contracts

- `BaseSubscription.sol` – shared internal logic used by the concrete subscription contracts.
- `Subscription.sol` – core subscription logic. Uses `Ownable2Step` and `SafeERC20`. Includes `recoverERC20` for the owner to withdraw tokens.
- `SubscriptionUpgradeable.sol` – upgradeable variant with the same functionality including `recoverERC20`.
- `MockV3Aggregator.sol` – mock oracle implementing the Chainlink Aggregator interface.
- `MockToken.sol` – simple ERC20 token for testing.

Additional documentation can be found in the [docs](docs/) directory.
For a step-by-step production deployment guide see
[docs/production-guide.md](docs/production-guide.md).
For a reference of CLI commands see
[docs/cli-guide.md](docs/cli-guide.md).

## Creating a Plan

When calling `createPlan`, the `billingCycle` parameter must be greater than
zero. Attempts to create or update a plan with `billingCycle = 0` will
revert with `"Billing cycle must be > 0"`.

## Access Control

`Subscription.sol` uses OpenZeppelin's `AccessControl` to manage privileged
functions. The deployer is granted both `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE`.
Accounts with the pauser role can pause or unpause the contract.

`Subscription.sol` also inherits from `ReentrancyGuard`. The subscription,
payment and cancellation functions are marked with `nonReentrant` to prevent
reentrancy attacks.

Grant the role to another account:

```bash
npx hardhat console --network <network>
> const sub = await ethers.getContractAt("Subscription", "<address>")
> const role = await sub.PAUSER_ROLE()
> await sub.grantRole(role, "0xPAUSER")
```

Revoke it when no longer needed:

```bash
> await sub.revokeRole(role, "0xPAUSER")
```

## Updating Plans

The contract owner can modify existing subscription plans using `updatePlan`.
This function lets you change the billing cycle, price, USD price and price feed
address. A `PlanUpdated` event is emitted when a plan is changed.

## Processing Due Payments

The script `scripts/process-due-payments.ts` reads a list of subscribers from a
JSON file and executes `processPayment` for those whose `nextPaymentDate` has
passed. Failures are collected and printed in a summary after all users have
been processed. Set `FAIL_ON_FAILURE=true` to exit with a non-zero status when
any payments fail. Use `MAX_CONCURRENCY` to limit parallel calls and
`MAX_RETRIES` with `RETRY_BASE_DELAY_MS` for exponential backoff. Configure
`LOG_LEVEL` (`info`, `warn`, `error`) and `LOG_FILE` to control logging. When
`FAILURES_FILE` is set, failed payments are written to that path as JSON.
Optional `NOTIFY_WEBHOOK` triggers a POST request for each failure and `LOKI_URL`
streams logs to Loki. Run the script continuously by defining an `INTERVAL`
in seconds.

The file can either contain a simple array of Ethereum addresses or an array of
objects where each entry defines the user and their plan(s). When using the
object form, the entry may contain either a `plan` or `plans` field. Both fields
accept a single plan ID, a comma separated list or an array of plan IDs.
See [`scripts/subscribers.example.json`](scripts/subscribers.example.json) for
an example.

```json
[
  { "user": "0x1111111111111111111111111111111111111111", "plans": [1, 2, 3] },
  { "user": "0x2222222222222222222222222222222222222222", "plan": [2, 4] },
  { "user": "0x3333333333333333333333333333333333333333", "plan": 1 },
  { "user": "0x4444444444444444444444444444444444444444", "plan": "5,6" }
]
```

### Running via Hardhat

Use Hardhat to execute the script:

```bash
npx hardhat run scripts/process-due-payments.ts --network <network>
```

### Cron Example

To automate processing, add a cron entry. This example runs hourly:

```cron
0 * * * * cd /path/to/project && npx hardhat run scripts/process-due-payments.ts --network <network> >> cron.log 2>&1
```

## Zahlungs-Skript in Docker

Um für die Verarbeitung offener Zahlungen keinen separaten Node-Task betreiben zu müssen, lässt sich `scripts/process-due-payments.ts` auch in einem Container starten. Das bereitgestellte `Dockerfile.payments` liest alle Variablen aus einer `.env`-Datei.

```bash
docker build -f Dockerfile.payments -t payments .
docker run --env-file .env payments
```

### Subgraph-Server

Der Dienst `scripts/subgraph-server.ts` überwacht einen Graph Node. In der mitgelieferten `docker-compose.yml` wird er als Service `subgraph` eingebunden und lässt sich zusammen mit Hardhat und dem Frontend starten:

```bash
docker compose up --build
```

Das Skript kann ebenso eigenständig ausgeführt werden:

```bash
npm run subgraph-server
```

## Upgradeprozess

Der Vertrag `SubscriptionUpgradeable` wird über einen Transparent Proxy bereitgestellt.
Mit dem Hardhat-Upgrades-Plugin kann ein neues Implementierungscontract einfach über `upgradeProxy` eingespielt werden.
Ein Beispiel findet sich im Test `test/SubscriptionUpgradeable.ts`.
Für reale Deployments steht das Skript `scripts/upgrade.ts` bereit, welches die Proxy-Adresse aus `SUBSCRIPTION_ADDRESS` liest und auf `SubscriptionUpgradeableV2` oder spätere Versionen aktualisiert.

```bash
npx hardhat run scripts/upgrade.ts --network <network>
```

## Subgraph

The `subgraph/` directory contains a minimal [The Graph](https://thegraph.com) setup for indexing events emitted by `Subscription.sol`.
After changing `schema.graphql` or files in `subgraph/src/`, run

```bash
npm run build-subgraph
```

to regenerate the manifest and type definitions used by tests.
Provide the network name and the deployed contract address via the `NETWORK` and
`CONTRACT_ADDRESS` variables (or `--network` and `--address` arguments) before
building. These variables are also used by `npm run prepare-subgraph`:

```bash
NETWORK=sepolia CONTRACT_ADDRESS=0xYourContract npm run build-subgraph
```

This command runs `npm run codegen` and `npm run prepare-subgraph` internally and
produces `subgraph/subgraph.local.yaml`.

See [docs/usage-examples.md#running-the-subgraph-locally](docs/usage-examples.md#running-the-subgraph-locally)
for a step-by-step guide on `npm run prepare-subgraph` and `npm run build-subgraph`.
To deploy the compiled subgraph, set `GRAPH_NODE_URL` and `IPFS_URL` (plus
optionally `GRAPH_ACCESS_TOKEN` and `SUBGRAPH_VERSION`) and run:

```bash
npm run deploy-subgraph
```

That section also lists the required environment variables and explains how to
configure `NEXT_PUBLIC_SUBGRAPH_URL` for the frontend.

To run a Graph Node locally with automatic restarts, use:

```bash
./scripts/start-subgraph.sh [path/to/.env]
```

The script loads the optional `.env` file and then invokes
`ts-node scripts/subgraph-server.ts`.

## Frontend

The repository also contains a simple Next.js application under
[`frontend/`](frontend/). Follow the instructions in
[`frontend/README.md`](frontend/README.md) to run the interface.

## CI/CD

Automated workflows under `.github/workflows` handle contract and frontend deployments. Secrets provide all required keys.

- **deploy-testnet.yml** deploys to Sepolia on pushes to `main` or via "Run workflow".
- **deploy-mainnet.yml** deploys to mainnet when a version tag `v*.*.*` is pushed.
- **deploy-frontend.yml** builds the Next.js app and deploys it to Vercel.
- **release.yml** builds artifacts, generates a changelog with commit and pull request titles and attaches `CHANGELOG.md` to the GitHub release.

Example environment variables are listed in `deploy.env.example`. See `vercel.json.example` for a basic rewrite setup.

## Production Deployment

To deploy the entire stack for production use:

1. Build and deploy the subgraph:

   ```bash
   NETWORK=<network> CONTRACT_ADDRESS=<deployed contract> npm run build-subgraph
   # deploy using graph-cli as needed
   ```

2. Deploy the contracts via Hardhat:

   ```bash
   npx hardhat run scripts/deploy.ts --network <network>
   ```

3. Build the Next.js frontend and upload it to your hosting provider (Vercel is used in CI):

   ```bash
   cd frontend
   npm run build
   ```


   Ensure `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_RPC_URL` and `NEXT_PUBLIC_SUBGRAPH_URL` are set in `.env.local` before building.

## Security

See [docs/audit-checklist.md](docs/audit-checklist.md) for a checklist of security-relevant functions, roles and edge cases to consider during audits.

## License

Released under the MIT License. See [LICENSE](LICENSE).
