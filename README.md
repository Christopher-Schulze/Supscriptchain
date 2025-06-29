# Supscriptchain

This project contains a simple subscription smart contract written in Solidity along with TypeScript tests using Hardhat. It allows merchants to create subscription plans that can be paid in ERC20 tokens or in USD via a Chainlink price feed.

## Requirements

- Node.js
- npm

## Installation

```bash
npm install
```

## Running Tests

```bash
npm test
```

Note: downloading the Solidity compiler requires network access. In restricted environments the tests may fail to compile.

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

## Contracts

- `Subscription.sol` – core subscription logic. Uses `Ownable2Step` and `SafeERC20`.
- `MockV3Aggregator.sol` – mock oracle implementing the Chainlink Aggregator interface.
- `MockToken.sol` – simple ERC20 token for testing.

## License

Released under the MIT License. See [LICENSE](LICENSE).
