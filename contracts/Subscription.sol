// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract Subscription is Ownable {
    using SafeERC20 for IERC20;

    struct SubscriptionPlan {
        address merchant;
        address token; // Address of the ERC20 token for payment
        uint256 price; // Price in the smallest unit of the token (used if not USD based)
        uint256 billingCycle; // Duration in seconds
        bool priceInUsd; // True if price is set in USD cents
        uint256 usdPrice; // Price in USD cents (e.g., 1000 for $10.00)
        address priceFeedAddress; // Address of the Chainlink price feed for token/USD
    }

    mapping(uint256 => SubscriptionPlan) public plans;
    uint256 public nextPlanId;

    struct UserSubscription {
       address subscriber;
       uint256 planId;
       uint256 startTime; // Timestamp of when the subscription started
       uint256 nextPaymentDate;
       bool isActive;
    }

    // User address => planId => subscription details
    mapping(address => mapping(uint256 => UserSubscription)) public userSubscriptions;

    event PlanCreated(uint256 planId, address indexed merchant, address indexed token, uint256 price, uint256 billingCycle, bool priceInUsd, uint256 usdPrice, address priceFeedAddress);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 nextPaymentDate);
    event PaymentProcessed(address indexed user, uint256 indexed planId, uint256 amount, uint256 newNextPaymentDate);

    // Add constructor for Ownable if using OZ 5.x:
    // constructor() Ownable(initialOwner) {} // Where initialOwner is an address

    function createPlan(
        address _token,
        uint256 _price,
        uint256 _billingCycle,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public onlyOwner {
        if (_priceInUsd) {
            require(_priceFeedAddress != address(0), "Price feed address required for USD pricing");
        }
        uint256 planId = nextPlanId;
        plans[planId] = SubscriptionPlan({
            merchant: msg.sender, // Initially, merchant is the caller
            token: _token,
            price: _price, // Used if not USD based
            billingCycle: _billingCycle,
            priceInUsd: _priceInUsd,
            usdPrice: _usdPrice,
            priceFeedAddress: _priceFeedAddress
        });
        nextPlanId++;
        emit PlanCreated(planId, msg.sender, _token, _price, _billingCycle, _priceInUsd, _usdPrice, _priceFeedAddress);
    }

    function getPaymentAmount(uint256 _planId) internal view returns (uint256) {
        SubscriptionPlan storage plan = plans[_planId];
        if (plan.priceInUsd) {
            require(plan.priceFeedAddress != address(0), "Price feed not set");
            AggregatorV3Interface priceFeed = AggregatorV3Interface(plan.priceFeedAddress);
            (, int256 latestPrice, , , ) = priceFeed.latestRoundData();
            
            // This is a simplification. Ideally, token decimals should be fetched from the token contract
            // or stored in the SubscriptionPlan struct during its creation.
            uint8 tokenDecimals = 18; // Placeholder for token decimals (e.g., 18 for WETH)
            uint8 priceFeedDecimals = priceFeed.decimals();

            require(uint256(latestPrice) > 0, "Oracle price must be positive");
            // Formula: (plan.usdPrice * (10**tokenDecimals) * (10**priceFeedDecimals)) / (100 * uint256(latestPrice))
            // plan.usdPrice is in cents, so we divide by 100 to get dollars.
            // (target_USD_in_cents / 100) * (10^token_decimals) / (oracle_price_in_USD_per_token / 10^oracle_decimals)
            // = (plan.usdPrice * 10^token_decimals * 10^priceFeedDecimals) / (100 * latestPrice)
            uint256 tokenAmount = (plan.usdPrice * (10**tokenDecimals) * (10**priceFeedDecimals)) / (100 * uint256(latestPrice));
            return tokenAmount;
        } else {
            return plan.price;
        }
    }

    function subscribe(uint256 _planId) public {
        // Ensure the plan exists
        require(plans[_planId].merchant != address(0), "Plan does not exist"); 
        // Ensure user is not already actively subscribed to this plan
        require(!userSubscriptions[msg.sender][_planId].isActive, "Already subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        IERC20 token = IERC20(plan.token);

        uint256 amountToPay = getPaymentAmount(_planId);

        // Transfer the initial payment from the user to the merchant
        // Assumes user has already approved the contract to spend tokens
        token.safeTransferFrom(msg.sender, plan.merchant, amountToPay);

        uint256 startTime = block.timestamp;
        uint256 nextPaymentDate = startTime + plan.billingCycle;

        userSubscriptions[msg.sender][_planId] = UserSubscription({
            subscriber: msg.sender,
            planId: _planId,
            startTime: startTime,
            nextPaymentDate: nextPaymentDate,
            isActive: true
        });

        emit Subscribed(msg.sender, _planId, nextPaymentDate);
    }

    function processPayment(address _user, uint256 _planId) public {
       UserSubscription storage userSub = userSubscriptions[_user][_planId];
       SubscriptionPlan storage plan = plans[_planId];

       // Ensure the subscription is active
       require(userSub.isActive, "Subscription is not active");
       // Ensure the plan exists (sanity check, though covered by isActive)
       require(plan.merchant != address(0), "Plan does not exist");
       // Ensure the caller is authorized (for now, public, but could be restricted)
       // For example, restrict to merchant or an authorized automation service.
       // require(msg.sender == plan.merchant || msg.sender == automationAddress, "Not authorized to process payment");

       // Check if payment is due
       require(block.timestamp >= userSub.nextPaymentDate, "Payment not due yet");

       IERC20 token = IERC20(plan.token);

       uint256 amountToPay = getPaymentAmount(_planId);

       // Transfer the payment from the user to the merchant
       // Assumes user has maintained approval for the contract
       // SafeERC20 will revert on failure.
       token.safeTransferFrom(_user, plan.merchant, amountToPay); 

       userSub.nextPaymentDate = block.timestamp + plan.billingCycle; // Or userSub.nextPaymentDate + plan.billingCycle to be more precise to original schedule
       emit PaymentProcessed(_user, _planId, amountToPay, userSub.nextPaymentDate);
       
       // The old 'else' block for deactivation is removed. 
       // If safeTransferFrom fails, the whole transaction reverts.
   }
}
