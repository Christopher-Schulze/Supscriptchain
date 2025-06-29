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
