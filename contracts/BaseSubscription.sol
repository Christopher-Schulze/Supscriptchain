// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./interfaces/AggregatorV3Interface.sol";

abstract contract BaseSubscription {
    using SafeERC20 for IERC20;

    struct SubscriptionPlan {
        address merchant;
        address token;
        uint8 tokenDecimals;
        uint256 price;
        uint256 billingCycle;
        bool priceInUsd;
        uint256 usdPrice;
        address priceFeedAddress;
        bool active;
    }

    mapping(uint256 => SubscriptionPlan) public plans;
    uint256 public nextPlanId;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private constant MAX_STALE_TIME = 1 hours;

    struct UserSubscription {
        address subscriber;
        uint256 startTime;
        uint256 nextPaymentDate;
        bool isActive;
    }

    mapping(address => mapping(uint256 => UserSubscription)) public userSubscriptions;

    event PlanCreated(
        uint256 planId,
        address indexed merchant,
        address indexed token,
        uint8 tokenDecimals,
        uint256 price,
        uint256 billingCycle,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    );

    event PlanUpdated(
        uint256 planId,
        uint256 billingCycle,
        uint256 price,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    );

    event MerchantUpdated(
        uint256 planId,
        address oldMerchant,
        address newMerchant
    );

    event PlanDisabled(uint256 planId);

    event Subscribed(address indexed user, uint256 indexed planId, uint256 nextPaymentDate);
    event PaymentProcessed(address indexed user, uint256 indexed planId, uint256 amount, uint256 newNextPaymentDate);
    event SubscriptionCancelled(address indexed user, uint256 indexed planId);

    function _createPlan(
        address merchantAddress,
        address tokenAddress,
        uint256 price,
        uint256 billingCycle,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    ) internal {
        require(billingCycle > 0, "Billing cycle must be > 0");
        if (priceInUsd) {
            require(priceFeedAddress != address(0), "Price feed address required for USD pricing");
            require(usdPrice > 0, "USD price must be > 0");
        } else {
            require(price > 0, "Token price must be > 0");
        }
        require(tokenAddress != address(0), "Token address cannot be zero");

        IERC20Metadata tokenContract = IERC20Metadata(tokenAddress);
        uint8 tokenDecimals = tokenContract.decimals();

        address merchant = (merchantAddress == address(0)) ? msg.sender : merchantAddress;

        uint256 planId = nextPlanId;
        plans[planId] = SubscriptionPlan({
            merchant: merchant,
            token: tokenAddress,
            tokenDecimals: tokenDecimals,
            price: price,
            billingCycle: billingCycle,
            priceInUsd: priceInUsd,
            usdPrice: usdPrice,
            priceFeedAddress: priceFeedAddress,
            active: true
        });
        nextPlanId++;
        emit PlanCreated(planId, merchant, tokenAddress, tokenDecimals, price, billingCycle, priceInUsd, usdPrice, priceFeedAddress);
    }

    function _updatePlan(
        uint256 planId,
        uint256 billingCycle,
        uint256 price,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    ) internal {
        SubscriptionPlan storage plan = plans[planId];
        require(plan.merchant != address(0), "Plan does not exist");

        require(billingCycle > 0, "Billing cycle must be > 0");

        if (priceInUsd) {
            require(priceFeedAddress != address(0), "Price feed address required for USD pricing");
            require(usdPrice > 0, "USD price must be > 0");
        } else {
            require(price > 0, "Token price must be > 0");
        }

        plan.billingCycle = billingCycle;
        plan.price = price;
        plan.priceInUsd = priceInUsd;
        plan.usdPrice = usdPrice;
        plan.priceFeedAddress = priceFeedAddress;

        emit PlanUpdated(planId, billingCycle, price, priceInUsd, usdPrice, priceFeedAddress);
    }

    function _updateMerchant(uint256 planId, address newMerchant) internal {
        SubscriptionPlan storage plan = plans[planId];
        require(plan.merchant != address(0), "Plan does not exist");
        require(newMerchant != address(0), "Merchant cannot be zero");
        address oldMerchant = plan.merchant;
        plan.merchant = newMerchant;
        emit MerchantUpdated(planId, oldMerchant, newMerchant);
    }

    function _disablePlan(uint256 planId) internal {
        SubscriptionPlan storage plan = plans[planId];
        require(plan.merchant != address(0), "Plan does not exist");
        require(plan.active, "Plan already disabled");
        plan.active = false;
        emit PlanDisabled(planId);
    }

    function _getPaymentAmount(SubscriptionPlan storage plan) internal view returns (uint256 amount) {
        if (plan.priceInUsd) {
            require(plan.priceFeedAddress != address(0), "Price feed not set for USD plan");
            AggregatorV3Interface priceFeed = AggregatorV3Interface(plan.priceFeedAddress);
            // slither-disable-next-line unused-return
            (, int256 latestPrice, , uint256 updatedAt, ) = priceFeed.latestRoundData();
            require(block.timestamp - updatedAt < MAX_STALE_TIME, "Price feed stale");

            uint8 tokenDecimals = plan.tokenDecimals;
            uint8 priceFeedDecimals = priceFeed.decimals();

            require(tokenDecimals <= 38 && priceFeedDecimals <= 38, "decimals too large");

            require(uint256(latestPrice) > 0, "Oracle price must be positive");

            uint256 exponent = uint256(tokenDecimals) + uint256(priceFeedDecimals);
            uint256 digits = _numDigits(plan.usdPrice);
            require(exponent + digits <= 77, "price overflow");

            uint256 multiplier = 10 ** exponent;
            amount = Math.mulDiv(plan.usdPrice, multiplier, 100 * uint256(latestPrice));
            return amount;
        } else {
            return plan.price;
        }
    }

    function _numDigits(uint256 number) internal pure returns (uint256 digits) {
        while (number != 0) {
            digits++;
            number /= 10;
        }
        if (digits == 0) {
            digits = 1;
        }
        return digits;
    }

    function _subscribe(uint256 planId, address subscriber) internal {
        SubscriptionPlan storage plan = plans[planId];
        require(plan.merchant != address(0), "Plan does not exist");
        require(plan.active, "Plan is disabled");
        require(!userSubscriptions[subscriber][planId].isActive, "Already actively subscribed to this plan");

        IERC20 token = IERC20(plan.token);

        uint256 amountToPay = _getPaymentAmount(plan);

        uint256 startTime = block.timestamp;
        uint256 nextPaymentDate = startTime + plan.billingCycle;

        // Effects: store subscription before interacting with token contract
        userSubscriptions[subscriber][planId] = UserSubscription({
            subscriber: subscriber,
            startTime: startTime,
            nextPaymentDate: nextPaymentDate,
            isActive: true
        });

        // Interactions
        require(token.allowance(subscriber, address(this)) >= amountToPay, "Insufficient allowance");
        // slither-disable-next-line arbitrary-from-in-transferfrom,reentrancy-benign
        token.safeTransferFrom(subscriber, plan.merchant, amountToPay);

        emit Subscribed(subscriber, planId, nextPaymentDate);
    }

    function _subscribeWithPermit(
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address subscriber
    ) internal {
        SubscriptionPlan storage plan = plans[planId];
        require(plan.merchant != address(0), "Plan does not exist");
        require(plan.active, "Plan is disabled");
        require(!userSubscriptions[subscriber][planId].isActive, "Already actively subscribed to this plan");

        uint256 amountToPay = _getPaymentAmount(plan);

        uint256 startTime = block.timestamp;
        uint256 nextPaymentDate = startTime + plan.billingCycle;

        // Effects
        userSubscriptions[subscriber][planId] = UserSubscription({
            subscriber: subscriber,
            startTime: startTime,
            nextPaymentDate: nextPaymentDate,
            isActive: true
        });

        // Interactions
        IERC20Permit permitToken = IERC20Permit(plan.token);
        permitToken.permit(subscriber, address(this), amountToPay, deadline, v, r, s);

        IERC20 token = IERC20(plan.token);
        // slither-disable-next-line arbitrary-from-in-transferfrom,reentrancy-benign
        token.safeTransferFrom(subscriber, plan.merchant, amountToPay);

        emit Subscribed(subscriber, planId, nextPaymentDate);
    }

    function _processPayment(address user, uint256 planId) internal {
        UserSubscription storage userSub = userSubscriptions[user][planId];
        SubscriptionPlan storage plan = plans[planId];

        require(userSub.isActive, "Subscription is not active");
        require(plan.merchant != address(0), "Plan does not exist");
        require(plan.active, "Plan is disabled");
        require(msg.sender == plan.merchant, "Only plan merchant can process payment");
        require(userSub.subscriber == user, "Subscriber mismatch");
        require(block.timestamp >= userSub.nextPaymentDate, "Payment not due yet");

        IERC20 token = IERC20(plan.token);
        uint256 amountToPay = _getPaymentAmount(plan);

        // Effects
        userSub.nextPaymentDate = userSub.nextPaymentDate + plan.billingCycle;

        // Interactions
        require(token.allowance(user, address(this)) >= amountToPay, "Insufficient allowance");
        // slither-disable-next-line arbitrary-from-in-transferfrom,reentrancy-benign
        token.safeTransferFrom(user, plan.merchant, amountToPay);

        emit PaymentProcessed(user, planId, amountToPay, userSub.nextPaymentDate);
    }

    function _cancelSubscription(uint256 planId, address subscriber) internal {
        UserSubscription storage userSub = userSubscriptions[subscriber][planId];

        require(userSub.subscriber == subscriber, "Not subscribed to this plan or subscription data mismatch");
        require(userSub.isActive, "Subscription is already inactive");

        userSub.isActive = false;
        emit SubscriptionCancelled(subscriber, planId);
    }

    function _recoverERC20(address token, uint256 amount, address recipient) internal {
        IERC20(token).safeTransfer(recipient, amount);
    }

    // ----- Public wrappers to be overridden with access control -----

    function createPlan(
        address merchantAddress,
        address tokenAddress,
        uint256 price,
        uint256 billingCycle,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    ) public virtual {
        _createPlan(
            merchantAddress,
            tokenAddress,
            price,
            billingCycle,
            priceInUsd,
            usdPrice,
            priceFeedAddress
        );
    }

    function updatePlan(
        uint256 planId,
        uint256 billingCycle,
        uint256 price,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    ) public virtual {
        _updatePlan(
            planId,
            billingCycle,
            price,
            priceInUsd,
            usdPrice,
            priceFeedAddress
        );
    }

    function updateMerchant(uint256 planId, address newMerchant) public virtual {
        _updateMerchant(planId, newMerchant);
    }

    function disablePlan(uint256 planId) public virtual {
        _disablePlan(planId);
    }

    function subscribe(uint256 planId) public virtual {
        _subscribe(planId, msg.sender);
    }

    function subscribeWithPermit(
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        _subscribeWithPermit(planId, deadline, v, r, s, msg.sender);
    }

    function processPayment(address user, uint256 planId) public virtual {
        _processPayment(user, planId);
    }

    function cancelSubscription(uint256 planId) public virtual {
        _cancelSubscription(planId, msg.sender);
    }

    function recoverERC20(address token, uint256 amount) external virtual {
        _recoverERC20(token, amount, msg.sender);
    }
}

