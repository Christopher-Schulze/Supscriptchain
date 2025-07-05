# Audit Checklist

This checklist expands on the notes from [audit-plan.md](audit-plan.md). It summarises security-relevant functions, roles and potential edge cases to review during an audit.

## Security-Relevant Functions

- `pause()` / `unpause()` – restrict subscription actions in an emergency. Callable by owner or accounts with `PAUSER_ROLE`.
- `createPlan()` – owner-only; validates parameters and sets up new subscription plans.
- `updatePlan()` – owner-only; enforces existing plan and price feed checks.
- `updateMerchant()` – owner-only; prevents zero address assignments.
- `subscribe()` / `subscribeWithPermit()` – user entry points with allowance and permit checks.
- `processPayment()` – merchant-only recurring charge; verifies subscriber and due date.
- `cancelSubscription()` – user-controlled cancellation.
- `recoverERC20()` – owner-only token recovery for assets sent by mistake.

## Roles and Access Control

- **Owner** – granted all privileged operations through `Ownable2Step`.
- **`DEFAULT_ADMIN_ROLE`** – initial owner receives this role; can manage other roles.
- **`PAUSER_ROLE`** – accounts allowed to pause and unpause the contract.

## Edge Cases and Validations

- Billing cycle must be greater than zero.
- USD pricing requires a non-zero price feed address.
- Token address cannot be zero when creating a plan.
- Oracle price must be positive and not stale (`MAX_STALE_TIME` = 1 hour).
- Token and price feed decimals may not exceed 38 digits.
- Price calculations revert when the exponent would overflow (`price overflow`).
- `processPayment` only succeeds when called by the plan merchant and the subscriber matches.
- Subscription functions check allowances and revert on insufficient balance or allowance.
- Duplicate subscriptions are rejected (`Already actively subscribed`).
- Cancellation fails if the subscription is already inactive or never existed.
- Pausing disables subscribe, payment processing and cancellation.
- Reentrancy is prevented by `nonReentrant` modifiers on state-changing functions.

## Automated Analysis

Run `pip install slither-analyzer` and `npm run slither` to generate `slither-output.txt` and review new warnings. Consider engaging professional auditors such as Trail of Bits, OpenZeppelin or ConsenSys Diligence as noted in [audit-plan.md](audit-plan.md).
