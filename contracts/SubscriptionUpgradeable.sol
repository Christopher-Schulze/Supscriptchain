// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/AggregatorV3Interface.sol";

/// @title Upgradeable version of Subscription contract
contract SubscriptionUpgradeable is
    Initializable,
    Ownable2StepUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

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

    event Subscribed(address indexed user, uint256 indexed planId, uint256 nextPaymentDate);
    event PaymentProcessed(address indexed user, uint256 indexed planId, uint256 amount, uint256 newNextPaymentDate);
    event SubscriptionCancelled(address indexed user, uint256 indexed planId);

    /// @notice Initializer instead of constructor for upgradeable contracts
    function initialize(address initialOwner) public initializer {
        __Ownable2Step_init(initialOwner);
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
    }

    function pause() public {
        require(hasRole(PAUSER_ROLE, msg.sender) || msg.sender == owner(), "Not pauser or owner");
        _pause();
    }

    function unpause() public {
        require(hasRole(PAUSER_ROLE, msg.sender) || msg.sender == owner(), "Not pauser or owner");
        _unpause();
    }

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

        IERC20Upgradeable tokenContract = IERC20Upgradeable(_token);
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
            amount = (plan.usdPrice * (10 ** tokenDecimals) * (10 ** priceFeedDecimals)) / (100 * uint256(latestPrice));
            return amount;
        } else {
            return plan.price;
        }
    }

    function subscribe(uint256 _planId) public whenNotPaused nonReentrant {
        require(plans[_planId].merchant != address(0), "Plan does not exist");
        require(!userSubscriptions[msg.sender][_planId].isActive, "Already actively subscribed to this plan");

        SubscriptionPlan storage plan = plans[_planId];
        IERC20Upgradeable token = IERC20Upgradeable(plan.token);

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

        IERC20PermitUpgradeable permitToken = IERC20PermitUpgradeable(plan.token);
        permitToken.permit(msg.sender, address(this), amountToPay, _deadline, v, r, s);

        IERC20Upgradeable token = IERC20Upgradeable(plan.token);
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

    function processPayment(address _user, uint256 _planId) public whenNotPaused nonReentrant {
        UserSubscription storage userSub = userSubscriptions[_user][_planId];
        SubscriptionPlan storage plan = plans[_planId];

        require(userSub.isActive, "Subscription is not active");
        require(plan.merchant != address(0), "Plan does not exist");
        require(msg.sender == plan.merchant, "Only plan merchant can process payment");
        require(block.timestamp >= userSub.nextPaymentDate, "Payment not due yet");

        IERC20Upgradeable token = IERC20Upgradeable(plan.token);
        uint256 amountToPay = getPaymentAmount(_planId);

        token.safeTransferFrom(_user, plan.merchant, amountToPay);

        userSub.nextPaymentDate = userSub.nextPaymentDate + plan.billingCycle;
        emit PaymentProcessed(_user, _planId, amountToPay, userSub.nextPaymentDate);
    }

    function cancelSubscription(uint256 _planId) public whenNotPaused nonReentrant {
        UserSubscription storage userSub = userSubscriptions[msg.sender][_planId];

        require(userSub.subscriber == msg.sender, "Not subscribed to this plan or subscription data mismatch");
        require(userSub.isActive, "Subscription is already inactive");

        userSub.isActive = false;
        emit SubscriptionCancelled(msg.sender, _planId);
    }

    uint256[50] private __gap;
}

