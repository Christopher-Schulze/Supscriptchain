# Contributing

This project uses [Slither](https://github.com/crytic/slither) for static analysis of the Solidity contracts.
Install it with:

```bash
pip install slither-analyzer
```

Before submitting a pull request, run:

```bash
slither .
```

Pull requests should not introduce any high severity Slither findings.

The `package-lock.json` file tracks exact dependency versions and must remain
committed to the repository. If you add or update dependencies, make sure to
commit the updated lockfile in the same pull request.
