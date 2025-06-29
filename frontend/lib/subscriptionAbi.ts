export default [
  "function nextPlanId() view returns (uint256)",
  "function plans(uint256) view returns (address merchant, address token, uint8 tokenDecimals, uint256 price, uint256 billingCycle, bool priceInUsd, uint256 usdPrice, address priceFeedAddress)",
  "function subscribe(uint256 _planId)",
  "function cancelSubscription(uint256 _planId)",
  "function processPayment(address _user, uint256 _planId)"
];
