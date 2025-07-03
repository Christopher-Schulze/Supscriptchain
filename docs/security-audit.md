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
