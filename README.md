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

## Running Tests

```bash
npm test
```

The project now includes a local Solidity compiler. Hardhat will compile using
`node_modules/solc/soljson.js`, so no network access is required during
compilation.

## Deployment

Two deployment scripts are provided under `scripts/`.

- **Testnet** – `scripts/deploy-testnet.ts`
- **Mainnet** – `scripts/deploy-mainnet.ts`

Both scripts read configuration from environment variables such as `MERCHANT_ADDRESS`, `TOKEN_ADDRESS`, `PRICE_FEED`, `BILLING_CYCLE`, `PRICE_IN_USD`, `FIXED_PRICE` and `USD_PRICE`.

Example deployment to a testnet network configured in `hardhat.config.ts`:

```bash
npx hardhat run scripts/deploy-testnet.ts --network sepolia
```

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

## Contracts

- `Subscription.sol` – core subscription logic. Uses `Ownable2Step` and `SafeERC20`.
- `MockV3Aggregator.sol` – mock oracle implementing the Chainlink Aggregator interface.
- `MockToken.sol` – simple ERC20 token for testing.

Additional documentation can be found in the [docs](docs/) directory.

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

## License

Released under the MIT License. See [LICENSE](LICENSE).
