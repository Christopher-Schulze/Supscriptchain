# Security Audit

This document collects notes from running `slither` against the contracts.

## Running Slither

Install slither via `pip` and run the provided npm script:

```bash
pip install slither-analyzer
npm run slither
```

## Findings

_No high severity issues were found._ The tool reported informational messages
about naming conventions and optimizer settings. Review the full report for
details and address any warnings relevant to your deployment.

### Arbitrary-from in `_processPayment`

Slither flags the call to `safeTransferFrom` inside
`BaseSubscription._processPayment` because tokens are transferred from a user
address rather than `msg.sender`. The function requires the merchant to be the
caller and checks the user's allowance before performing the transfer. This
pattern is intentional for subscription payments and is considered safe.

### Removed redundant oracle variables

`slither` reported unused variables `roundId`, `startedAt` and `answeredInRound`
in `BaseSubscription._processPayment`. These were previously assigned only to
avoid compiler warnings. The latest version ignores these values entirely.
