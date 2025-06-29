# Supscriptchain Frontend

This directory contains a simple Next.js application that interacts with the
`Subscription` smart contract using [`ethers.js`](https://docs.ethers.org/).

## Installation

Install dependencies in this directory:

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and enter the contract address and an optional RPC URL:

```bash
cp .env.local.example .env.local
```

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
# Optional RPC provider used when MetaMask is not available
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

## Start

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Pages

- `/plans` – displays all subscription plans stored in the contract.
- `/manage` – subscribe to or cancel a plan.
- `/payment` – merchant page to trigger a payment for a subscriber.

Wallet connectivity uses the injected provider (MetaMask or Wallet‑Connect
compatible). If no wallet is available the app falls back to the RPC URL for
read‑only operations.
