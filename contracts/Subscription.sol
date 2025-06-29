// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol"; // Changed from Ownable
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/AggregatorV3Interface.sol"; // Changed to local import

contract Subscription is Ownable2Step, AccessControl, Pausable, ReentrancyGuard { // Changed from Ownable
    using SafeERC20 for IERC20;

    /**
     * @title Subscription Plan Details
     * @notice Defines the structure for a subscription plan.
     * @param merchant The address that receives payments for this plan.
     * @param token The ERC20 token used for payments.
     * @param tokenDecimals The number of decimals for the payment token.
     * @param price The price in the smallest unit of the token (if not USD based).
     * @param billingCycle The duration of one billing cycle in seconds.
     * @param priceInUsd True if the price is denominated in USD cents.
     * @param usdPrice The price in USD cents (e.g., 1000 for $10.00), used if priceInUsd is true.
     * @param priceFeedAddress The Chainlink price feed address for token/USD, required if priceInUsd is true.
     */
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

    /// @notice Mapping from plan ID to SubscriptionPlan details.
    mapping(uint256 => SubscriptionPlan) public plans;
    /// @notice Counter for the next available plan ID.
    uint256 public nextPlanId;

    /// @notice Role that allows pausing and unpausing the contract.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @dev Price data older than this value is considered stale.
    uint256 private constant MAX_STALE_TIME = 1 hours;

    /**
     * @title User Subscription Details
     * @notice Defines the structure for a user's specific subscription to a plan.
     * @param subscriber The address of the user subscribed to the plan.
     * @param planId The ID of the plan the user is subscribed to.
     * @param startTime Timestamp of when the subscription initially started.
     * @param nextPaymentDate Timestamp of when the next payment is due.
     * @param isActive True if the subscription is currently active.
     */
    struct UserSubscription {
       address subscriber;
       uint256 planId;
       uint256 startTime;
       uint256 nextPaymentDate;
       bool isActive;
    }

    /// @notice Mapping from user address to (mapping of plan ID to UserSubscription details).
    mapping(address => mapping(uint256 => UserSubscription)) public userSubscriptions;

    /**
     * @notice Emitted when a new subscription plan is created.
     * @param planId The ID of the newly created plan.
     * @param merchant The address of the merchant for this plan.
     * @param token The address of the ERC20 token for payment.
     * @param tokenDecimals The decimals of the payment token.
     * @param price The price in token units (if not USD based).
     * @param billingCycle The billing cycle duration in seconds.
     * @param priceInUsd True if the price is in USD cents.
     * @param usdPrice The price in USD cents (if priceInUsd is true).
     * @param priceFeedAddress The Chainlink price feed address (if priceInUsd is true).
     */
    event PlanCreated(uint256 planId, address indexed merchant, address indexed token, uint8 tokenDecimals, uint256 price, uint256 billingCycle, bool priceInUsd, uint256 usdPrice, address priceFeedAddress);

    /**
     * @notice Emitted when a subscription plan is updated.
     * @param planId The ID of the plan that was updated.
     * @param billingCycle The new billing cycle duration in seconds.
     * @param price The new fixed token price (if priceInUsd is false).
     * @param priceInUsd True if the plan is now priced in USD cents.
     * @param usdPrice The new USD price in cents (if priceInUsd is true).
     * @param priceFeedAddress The Chainlink price feed address for USD pricing.
     */
    event PlanUpdated(
        uint256 planId,
        uint256 billingCycle,
        uint256 price,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    );

    /**
     * @notice Emitted when a user subscribes to a plan.
     * @param user The address of the subscriber.
     * @param planId The ID of the plan subscribed to.
     * @param nextPaymentDate Timestamp for the next payment.
     */
    event Subscribed(address indexed user, uint256 indexed planId, uint256 nextPaymentDate);

    /**
     * @notice Emitted when a recurring payment is successfully processed.
     * @param user The address of the subscriber.
     * @param planId The ID of the plan for which payment was processed.
     * @param amount The amount paid in token units.
     * @param newNextPaymentDate The new timestamp for the next payment.
     */
    event PaymentProcessed(address indexed user, uint256 indexed planId, uint256 amount, uint256 newNextPaymentDate);

    /**
     * @notice Emitted when a user cancels their subscription to a plan.
     * @param user The address of the user who cancelled.
     * @param planId The ID of the plan that was cancelled.
     */
    event SubscriptionCancelled(address indexed user, uint256 indexed planId);

    /**
     * @notice Contract constructor. Initializes Ownable2Step and grants roles to the deployer.
     */
    constructor() Ownable2Step(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /// @notice Pauses subscription related functions.
    function pause() public {
        require(hasRole(PAUSER_ROLE, msg.sender) || msg.sender == owner(), "Not pauser or owner");
        _pause();
    }

    /// @notice Unpauses subscription related functions.
    function unpause() public {
        require(hasRole(PAUSER_ROLE, msg.sender) || msg.sender == owner(), "Not pauser or owner");
        _unpause();
    }

    /**
     * @notice Creates a new subscription plan.
     * @dev Can only be called by the contract owner.
     * Fetches and stores token decimals. Merchant defaults to owner if _merchantAddress is address(0).
     * @param _merchantAddress The address to receive payments. If address(0), defaults to contract owner.
     * @param _token The ERC20 token for payments.
     * @param _price Price in the smallest unit of the token (if not USD based).
     * @param _billingCycle Duration of one billing cycle in seconds.
     * @param _priceInUsd True if price is in USD cents.
     * @param _usdPrice Price in USD cents (if _priceInUsd is true).
     * @param _priceFeedAddress Chainlink price feed for token/USD (if _priceInUsd is true).
     */
    function createPlan(
        address _merchantAddress,
        address _token,
        uint256 _price,
        uint256 _billingCycle,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public onlyOwner whenNotPaused {
        if (_priceInUsd) {
            require(_priceFeedAddress != address(0), "Price feed address required for USD pricing");
        }
        require(_token != address(0), "Token address cannot be zero");

        IERC20 tokenContract = IERC20(_token);
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

    /**
     * @notice Updates an existing subscription plan.
     * @dev Only the contract owner can call this function.
     * @param _planId The ID of the plan to update.
     * @param _billingCycle New billing cycle duration in seconds.
     * @param _price New fixed token price (ignored if _priceInUsd is true).
     * @param _priceInUsd Whether pricing is denominated in USD cents.
     * @param _usdPrice New USD price in cents (if _priceInUsd is true).
     * @param _priceFeedAddress Chainlink price feed address for USD pricing.
     */
    function updatePlan(
        uint256 _planId,
        uint256 _billingCycle,
        uint256 _price,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public onlyOwner whenNotPaused {
        SubscriptionPlan storage plan = plans[_planId];
        require(plan.merchant != address(0), "Plan does not exist");

        if (_priceInUsd) {
            require(_priceFeedAddress != address(0), "Price feed address required for USD pricing");
        }

        plan.billingCycle = _billingCycle;
        plan.price = _price;
        plan.priceInUsd = _priceInUsd;
        plan.usdPrice = _usdPrice;
        plan.priceFeedAddress = _priceFeedAddress;

        emit PlanUpdated(_planId, _billingCycle, _price, _priceInUsd, _usdPrice, _priceFeedAddress);
    }

    /**
     * @notice Calculates the payment amount for a given plan.
     * @dev For USD-based plans, uses Chainlink price feed. Otherwise, uses fixed token price.
     * @param _planId The ID of the subscription plan.
     * @return amount The payment amount in the smallest unit of the plan's token.
     */
    function getPaymentAmount(uint256 _planId) internal view returns (uint256 amount) {
        SubscriptionPlan storage plan = plans[_planId];
        if (plan.priceInUsd) {
            require(plan.priceFeedAddress != address(0), "Price feed not set for USD plan");
            AggregatorV3Interface priceFeed = AggregatorV3Interface(plan.priceFeedAddress);
            (, int256 latestPrice, , uint256 updatedAt, ) = priceFeed.latestRoundData();
            require(block.timestamp - updatedAt < MAX_STALE_TIME, "Price feed stale");
            
            uint8 tokenDecimals = plan.tokenDecimals;
            uint8 priceFeedDecimals = priceFeed.decimals();

            require(uint256(latestPrice) > 0, "Oracle price must be positive");
            // Formula: (plan.usdPrice (cents) / 100) * (10^tokenDecimals) / (oraclePriceInUSD / 10^priceFeedDecimals)
            // This can be rewritten as: (plan.usdPrice * 10^tokenDecimals * 10^priceFeedDecimals) / (100 * oraclePriceInUSD)
            amount = (plan.usdPrice * (10**tokenDecimals) * (10**priceFeedDecimals)) / (100 * uint256(latestPrice));
            return amount;
        } else {
            return plan.price;
        }
    }

    /**
     * @notice Allows a user to subscribe to a plan.
     * @dev Transfers initial payment from user to merchant. User must approve contract for token spending.
     * @param _planId The ID of the plan to subscribe to.
     */
    function subscribe(uint256 _planId) public whenNotPaused nonReentrant {
        require(plans[_planId].merchant != address(0), "Plan does not exist");
        require(!userSubscriptions[msg.sender][_planId].isActive, "Already actively subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        IERC20 token = IERC20(plan.token);

        uint256 amountToPay = getPaymentAmount(_planId);
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

    /**
     * @notice Allows a user to subscribe to a plan using an ERC20 permit.
     * @dev Calls permit on the token then transfers the payment.
     * @param _planId The ID of the plan to subscribe to.
     * @param _deadline Expiration time for the permit signature.
     * @param v Signature v value.
     * @param r Signature r value.
     * @param s Signature s value.
     */
    function subscribeWithPermit(
        uint256 _planId,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public whenNotPaused nonReentrant {
        require(plans[_planId].merchant != address(0), "Plan does not exist");
        require(!userSubscriptions[msg.sender][_planId].isActive, "Already actively subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        uint256 amountToPay = getPaymentAmount(_planId);

        IERC20Permit permitToken = IERC20Permit(plan.token);
        permitToken.permit(msg.sender, address(this), amountToPay, _deadline, v, r, s);

        IERC20 token = IERC20(plan.token);
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

    /**
     * @notice Processes a recurring payment for a user's subscription.
     * @dev Can only be called by the plan's merchant. Transfers payment from user to merchant.
     * User must maintain token approval. Updates next payment date.
     * @param _user The address of the subscriber whose payment is being processed.
     * @param _planId The ID of the plan for which payment is processed.
     */
    function processPayment(address _user, uint256 _planId) public whenNotPaused nonReentrant {
       UserSubscription storage userSub = userSubscriptions[_user][_planId];
       SubscriptionPlan storage plan = plans[_planId];

       require(userSub.isActive, "Subscription is not active");
       require(plan.merchant != address(0), "Plan does not exist"); // Sanity check
       require(msg.sender == plan.merchant, "Only plan merchant can process payment");

       require(block.timestamp >= userSub.nextPaymentDate, "Payment not due yet");

       IERC20 token = IERC20(plan.token);
       uint256 amountToPay = getPaymentAmount(_planId);

       token.safeTransferFrom(_user, plan.merchant, amountToPay); 

       userSub.nextPaymentDate = userSub.nextPaymentDate + plan.billingCycle; // Maintain original billing cadence
       emit PaymentProcessed(_user, _planId, amountToPay, userSub.nextPaymentDate);
   }

    /**
     * @notice Allows a subscriber to cancel their active subscription.
     * @dev Sets the subscription to inactive. No refunds for the current billing cycle.
     * @param _planId The ID of the plan to cancel.
     */
    function cancelSubscription(uint256 _planId) public whenNotPaused nonReentrant {
        UserSubscription storage userSub = userSubscriptions[msg.sender][_planId];

        require(userSub.subscriber == msg.sender, "Not subscribed to this plan or subscription data mismatch");
        require(userSub.isActive, "Subscription is already inactive");

        userSub.isActive = false;
        emit SubscriptionCancelled(msg.sender, _planId);
    }
}
