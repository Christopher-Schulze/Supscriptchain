# Contract Architecture

The core of this repository is `Subscription.sol`. The contract lets merchants create subscription plans that users can subscribe to. Payments can be denominated in the payment token itself or specified in USD cents and converted to token amounts using a Chainlink price feed.

### Key Components

- **SubscriptionPlan struct** – holds merchant address, payment token, billing cycle and pricing information.
- **UserSubscription struct** – records each subscriber's status and the date their next payment is due.
- **Mappings**
  - `plans` map plan IDs to `SubscriptionPlan` data.
  - `userSubscriptions` track subscriptions for each user and plan.
- **Functions**
  - `createPlan` – owner-only function to define a new plan.
  - `subscribe` – user function that transfers the first payment and records the subscription.
  - `processPayment` – merchant function to charge recurring payments.
  - `cancelSubscription` – subscriber function to cancel an active plan.

The project also contains `MockToken.sol` and `MockV3Aggregator.sol` for local testing. These mocks emulate an ERC20 token and a Chainlink price feed.

### Access Control

`Subscription.sol` relies on OpenZeppelin's `AccessControl`. The deployer
receives `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE`. Accounts with `PAUSER_ROLE`
can pause or unpause the contract when needed.

The contract also inherits from `ReentrancyGuard` and uses the `nonReentrant`
modifier on subscription-related functions to protect against reentrant calls.

### Plan Updates

The owner can adjust an existing plan using `updatePlan`. It checks that the plan exists and, when pricing in USD, that a valid price feed address is supplied. The billing cycle, price, USD price and feed can be changed and a `PlanUpdated` event is emitted.

### Proxy Pattern

`SubscriptionUpgradeable` is deployed behind a Transparent Proxy using the Hardhat Upgrades plugin. The proxy stores all state and forwards calls to the current implementation contract. Upgrading replaces the implementation while keeping data like plans and subscriptions intact.

### PAUSER_ROLE

`PAUSER_ROLE` holders may pause and unpause the contract via OpenZeppelin's `Pausable` extension. Pausing disables subscription and payment related functions so issues can be investigated without losing funds.

### Reentrancy Protection

Both versions of the contract inherit from `ReentrancyGuard`. Functions that transfer tokens such as `subscribe`, `processPayment` and `cancelSubscription` are marked `nonReentrant` to block malicious nested calls.
### Security Considerations

The contract follows the checks-effects-interactions pattern. State updates now occur **before** external token transfers to minimize reentrancy risk. Each token transfer additionally checks the spender's allowance to prevent unintended transfers.

`MaliciousToken`'s `setReentrancy` helper validates that the target address is non-zero. Price feed data is verified for staleness and positive values, mitigating oracle manipulation.
`processPayment` additionally checks that the subscriber address passed in
matches the stored subscription to stop merchants from charging arbitrary
users even if they have approved allowances.
