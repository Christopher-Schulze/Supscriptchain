# Audit Planning

This document outlines potential next steps for a full smart contract security audit.

## Slither review

A run of `slither` was executed after installing dependencies (`pip install slither-analyzer && npm run slither`). The tool reported only low and informational findings, mainly related to naming conventions and minor code patterns. No high severity vulnerabilities were detected.

The raw output from the run is stored at `slither-output.txt`.

## Potential auditors

The following firms are well known for auditing Solidity projects:

- Trail of Bits
- OpenZeppelin
- ConsenSys Diligence
- CertiK
- Runtime Verification

## Estimated timeline and cost

A typical engagement for ~900 lines of Solidity across several contracts can take **2&ndash;4 weeks** depending on auditor availability. Reported costs range from **USD 25k to 60k**. Quotes will vary based on scope and requested turnaround time.

