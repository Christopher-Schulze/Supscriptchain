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

Any change to `package-lock.json` must be included in your commit, even if the
dependency versions appear unchanged.

This project uses [Husky](https://typicode.github.io/husky) and
[lint-staged](https://github.com/okonet/lint-staged) to run checks before each
commit. After cloning the repository, install dependencies to set up the Git
hooks:

```bash
npm install
```

The pre-commit hook runs `npm run lint` and `prettier --check`. Commits that fail
these checks will be rejected.
