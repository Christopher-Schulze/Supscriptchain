# CLI Guide

This guide shows common ways to invoke `scripts/cli.ts` using `ts-node`.
All commands support the `--network` flag to select a Hardhat network.

## List existing plans

```bash
npx ts-node scripts/cli.ts list --subscription <address> --network hardhat
```

## Create a new plan

```bash
npx ts-node scripts/cli.ts create \
  --subscription <address> \
  --merchant <merchant> \
  --token <erc20> \
  --price 1000 \
  --billing-cycle 3600 \
  --network hardhat
```

## Update a plan

```bash
npx ts-node scripts/cli.ts update \
  --subscription <address> \
  --plan-id 0 \
  --price 2000 \
  --network hardhat
```

## Pause and unpause

```bash
npx ts-node scripts/cli.ts pause --subscription <address> --network hardhat
npx ts-node scripts/cli.ts unpause --subscription <address> --network hardhat
```

## Disable a plan

```bash
npx ts-node scripts/cli.ts disable --subscription <address> --plan-id 0 --network hardhat
```

## Update the merchant

```bash
npx ts-node scripts/cli.ts update-merchant \
  --subscription <address> \
  --plan-id 0 \
  --merchant <newMerchant> \
  --network hardhat
```

## Show contract status

```bash
npx ts-node scripts/cli.ts status --subscription <address> --network hardhat
```

## List user subscriptions

```bash
npx ts-node scripts/cli.ts list-subs \
  --subscription <address> \
  --user <address> \
  --network hardhat
```
