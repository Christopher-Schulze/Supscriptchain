# Supscriptchain

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

## Running Tests

```bash
npm test
```

The project now includes a local Solidity compiler. Hardhat will compile using
`node_modules/solc/soljson.js`, so no network access is required during
compilation.

## E2E-Tests

Die Playwright-Tests befinden sich im Ordner `e2e/` und lassen sich mit

```bash
npm run test:e2e
```

ausführen.

## Deployment

Two deployment scripts are provided under `scripts/`.

- **Testnet** – `scripts/deploy-testnet.ts`
- **Mainnet** – `scripts/deploy-mainnet.ts`

Both scripts require the following environment variables:

- `MERCHANT_ADDRESS`
- `TOKEN_ADDRESS`
- `PRICE_FEED`
- `BILLING_CYCLE`
- `PRICE_IN_USD`
- `FIXED_PRICE`
- `USD_PRICE`

Example deployment to a testnet network configured in `hardhat.config.ts`:

```bash
npx hardhat run scripts/deploy-testnet.ts --network sepolia
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

Run the analyzer against the project:

```bash
slither .
```

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

- `Subscription.sol` – core subscription logic. Uses `Ownable2Step` and `SafeERC20`. Includes `recoverERC20` for the owner to withdraw tokens.
- `SubscriptionUpgradeable.sol` – upgradeable variant with the same functionality including `recoverERC20`.
- `MockV3Aggregator.sol` – mock oracle implementing the Chainlink Aggregator interface.
- `MockToken.sol` – simple ERC20 token for testing.

Additional documentation can be found in the [docs](docs/) directory.

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
been processed. Set the environment variable `FAIL_ON_FAILURE` to `true` to exit
with a non-zero status when any payments fail.

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

## Upgradeprozess

Der Vertrag `SubscriptionUpgradeable` wird über einen Transparent Proxy bereitgestellt.
Mit dem Hardhat-Upgrades-Plugin kann ein neues Implementierungscontract einfach über `upgradeProxy` eingespielt werden.
Ein Beispiel findet sich im Test `test/SubscriptionUpgradeable.ts`.
Für reale Deployments steht das Skript `scripts/upgrade.ts` bereit, welches die Proxy-Adresse aus `SUBSCRIPTION_ADDRESS` liest und auf `SubscriptionUpgradeableV2` oder spätere Versionen aktualisiert.

```bash
npx hardhat run scripts/upgrade.ts --network <network>
```

## Subgraph

The `subgraph/` directory contains a minimal [The Graph](https://thegraph.com) setup for indexing events emitted by `Subscription.sol`. Run the following commands to generate types and build the manifest:

```bash
npm run codegen
npm run build-subgraph
```

See [docs/usage-examples.md](docs/usage-examples.md) for instructions on running a local Graph node.

## Frontend

The repository also contains a simple Next.js application under
[`frontend/`](frontend/). Follow the instructions in
[`frontend/README.md`](frontend/README.md) to run the interface.

## License

Released under the MIT License. See [LICENSE](LICENSE).
