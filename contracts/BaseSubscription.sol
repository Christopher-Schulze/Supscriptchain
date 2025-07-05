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
    }

    mapping(uint256 => SubscriptionPlan) public plans;
    uint256 public nextPlanId;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 private constant MAX_STALE_TIME = 1 hours;

    struct UserSubscription {
        address subscriber;
        uint256 planId;
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

    event Subscribed(address indexed user, uint256 indexed planId, uint256 nextPaymentDate);
    event PaymentProcessed(address indexed user, uint256 indexed planId, uint256 amount, uint256 newNextPaymentDate);
    event SubscriptionCancelled(address indexed user, uint256 indexed planId);

    function _createPlan(
        address _merchantAddress,
        address _token,
        uint256 _price,
        uint256 _billingCycle,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) internal {
        require(_billingCycle > 0, "Billing cycle must be > 0");
        if (_priceInUsd) {
            require(_priceFeedAddress != address(0), "Price feed address required for USD pricing");
            require(_usdPrice > 0, "USD price must be > 0");
        } else {
            require(_price > 0, "Token price must be > 0");
        }
        require(_token != address(0), "Token address cannot be zero");

        IERC20Metadata tokenContract = IERC20Metadata(_token);
        uint8 tokenDecimals = tokenContract.decimals();

        address merchant = (_merchantAddress == address(0)) ? msg.sender : _merchantAddress;

        uint256 planId = nextPlanId;
        plans[planId] = SubscriptionPlan({
            merchant: merchant,
            token: _token,
            tokenDecimals: tokenDecimals,
            price: _price,
            billingCycle: _billingCycle,
            priceInUsd: _priceInUsd,
            usdPrice: _usdPrice,
            priceFeedAddress: _priceFeedAddress
        });
        nextPlanId++;
        emit PlanCreated(planId, merchant, _token, tokenDecimals, _price, _billingCycle, _priceInUsd, _usdPrice, _priceFeedAddress);
    }

    function _updatePlan(
        uint256 _planId,
        uint256 _billingCycle,
        uint256 _price,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) internal {
        SubscriptionPlan storage plan = plans[_planId];
        require(plan.merchant != address(0), "Plan does not exist");

        require(_billingCycle > 0, "Billing cycle must be > 0");

        if (_priceInUsd) {
            require(_priceFeedAddress != address(0), "Price feed address required for USD pricing");
            require(_usdPrice > 0, "USD price must be > 0");
        } else {
            require(_price > 0, "Token price must be > 0");
        }

        plan.billingCycle = _billingCycle;
        plan.price = _price;
        plan.priceInUsd = _priceInUsd;
        plan.usdPrice = _usdPrice;
        plan.priceFeedAddress = _priceFeedAddress;

        emit PlanUpdated(_planId, _billingCycle, _price, _priceInUsd, _usdPrice, _priceFeedAddress);
    }

    function _updateMerchant(uint256 _planId, address _newMerchant) internal {
        SubscriptionPlan storage plan = plans[_planId];
        require(plan.merchant != address(0), "Plan does not exist");
        require(_newMerchant != address(0), "Merchant cannot be zero");
        address oldMerchant = plan.merchant;
        plan.merchant = _newMerchant;
        emit MerchantUpdated(_planId, oldMerchant, _newMerchant);
    }

    function _getPaymentAmount(uint256 _planId) internal view returns (uint256 amount) {
        SubscriptionPlan storage plan = plans[_planId];
        if (plan.priceInUsd) {
            require(plan.priceFeedAddress != address(0), "Price feed not set for USD plan");
            AggregatorV3Interface priceFeed = AggregatorV3Interface(plan.priceFeedAddress);
            (
                uint80 roundId,
                int256 latestPrice,
                uint256 startedAt,
                uint256 updatedAt,
                uint80 answeredInRound
            ) = priceFeed.latestRoundData();
            // Prevent unused-variable compiler warnings
            roundId;
            startedAt;
            answeredInRound;
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

    function _subscribe(uint256 _planId, address _subscriber) internal {
        require(plans[_planId].merchant != address(0), "Plan does not exist");
        require(!userSubscriptions[_subscriber][_planId].isActive, "Already actively subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        IERC20 token = IERC20(plan.token);

        uint256 amountToPay = _getPaymentAmount(_planId);

        uint256 startTime = block.timestamp;
        uint256 nextPaymentDate = startTime + plan.billingCycle;

        // Effects: store subscription before interacting with token contract
        userSubscriptions[_subscriber][_planId] = UserSubscription({
            subscriber: _subscriber,
            planId: _planId,
            startTime: startTime,
            nextPaymentDate: nextPaymentDate,
            isActive: true
        });

        // Interactions
        require(token.allowance(_subscriber, address(this)) >= amountToPay, "Insufficient allowance");
        token.safeTransferFrom(_subscriber, plan.merchant, amountToPay);

        emit Subscribed(_subscriber, _planId, nextPaymentDate);
    }

    function _subscribeWithPermit(
        uint256 _planId,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address _subscriber
    ) internal {
        require(plans[_planId].merchant != address(0), "Plan does not exist");
        require(!userSubscriptions[_subscriber][_planId].isActive, "Already actively subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        uint256 amountToPay = _getPaymentAmount(_planId);

        uint256 startTime = block.timestamp;
        uint256 nextPaymentDate = startTime + plan.billingCycle;

        // Effects
        userSubscriptions[_subscriber][_planId] = UserSubscription({
            subscriber: _subscriber,
            planId: _planId,
            startTime: startTime,
            nextPaymentDate: nextPaymentDate,
            isActive: true
        });

        // Interactions
        IERC20Permit permitToken = IERC20Permit(plan.token);
        permitToken.permit(_subscriber, address(this), amountToPay, _deadline, v, r, s);

        IERC20 token = IERC20(plan.token);
        token.safeTransferFrom(_subscriber, plan.merchant, amountToPay);

        emit Subscribed(_subscriber, _planId, nextPaymentDate);
    }

    function _processPayment(address _user, uint256 _planId) internal {
        UserSubscription storage userSub = userSubscriptions[_user][_planId];
        SubscriptionPlan storage plan = plans[_planId];

        require(userSub.isActive, "Subscription is not active");
        require(plan.merchant != address(0), "Plan does not exist");
        require(msg.sender == plan.merchant, "Only plan merchant can process payment");
        require(userSub.subscriber == _user, "Subscriber mismatch");
        require(block.timestamp >= userSub.nextPaymentDate, "Payment not due yet");

        IERC20 token = IERC20(plan.token);
        uint256 amountToPay = _getPaymentAmount(_planId);

        // Effects
        userSub.nextPaymentDate = userSub.nextPaymentDate + plan.billingCycle;

        // Interactions
        require(token.allowance(_user, address(this)) >= amountToPay, "Insufficient allowance");
        // Slither warns about arbitrary-from in transferFrom. The allowance check
        // above and the merchant-only access control ensure this call is safe.
        token.safeTransferFrom(_user, plan.merchant, amountToPay);

        emit PaymentProcessed(_user, _planId, amountToPay, userSub.nextPaymentDate);
    }

    function _cancelSubscription(uint256 _planId, address _subscriber) internal {
        UserSubscription storage userSub = userSubscriptions[_subscriber][_planId];

        require(userSub.subscriber == _subscriber, "Not subscribed to this plan or subscription data mismatch");
        require(userSub.isActive, "Subscription is already inactive");

        userSub.isActive = false;
        emit SubscriptionCancelled(_subscriber, _planId);
    }

    function _recoverERC20(address token, uint256 amount, address recipient) internal {
        IERC20(token).safeTransfer(recipient, amount);
    }

    // ----- Public wrappers to be overridden with access control -----

    function createPlan(
        address _merchantAddress,
        address _token,
        uint256 _price,
        uint256 _billingCycle,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public virtual {
        _createPlan(
            _merchantAddress,
            _token,
            _price,
            _billingCycle,
            _priceInUsd,
            _usdPrice,
            _priceFeedAddress
        );
    }

    function updatePlan(
        uint256 _planId,
        uint256 _billingCycle,
        uint256 _price,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public virtual {
        _updatePlan(
            _planId,
            _billingCycle,
            _price,
            _priceInUsd,
            _usdPrice,
            _priceFeedAddress
        );
    }

    function updateMerchant(uint256 _planId, address _newMerchant) public virtual {
        _updateMerchant(_planId, _newMerchant);
    }

    function subscribe(uint256 _planId) public virtual {
        _subscribe(_planId, msg.sender);
    }

    function subscribeWithPermit(
        uint256 _planId,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        _subscribeWithPermit(_planId, _deadline, v, r, s, msg.sender);
    }

    function processPayment(address _user, uint256 _planId) public virtual {
        _processPayment(_user, _planId);
    }

    function cancelSubscription(uint256 _planId) public virtual {
        _cancelSubscription(_planId, msg.sender);
    }

    function recoverERC20(address token, uint256 amount) external virtual {
        _recoverERC20(token, amount, msg.sender);
    }
}

