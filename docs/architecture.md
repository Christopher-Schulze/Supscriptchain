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
