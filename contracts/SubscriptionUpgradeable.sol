// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/AggregatorV3Interface.sol";
import "./BaseSubscription.sol";

/// @title Upgradeable version of Subscription contract
contract SubscriptionUpgradeable is
    Initializable,
    Ownable2StepUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    BaseSubscription
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Initializer instead of constructor for upgradeable contracts
    function initialize(address initialOwner) public initializer {
        __Ownable2Step_init();
        _transferOwnership(initialOwner);
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
        address merchantAddress,
        address tokenAddress,
        uint256 price,
        uint256 billingCycle,
        bool priceInUsd,
        uint256 usdPrice,
        address priceFeedAddress
    ) public override onlyOwner whenNotPaused {
        super.createPlan(
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
    ) public override onlyOwner whenNotPaused {
        super.updatePlan(
            planId,
            billingCycle,
            price,
            priceInUsd,
            usdPrice,
            priceFeedAddress
        );
    }

    function updateMerchant(uint256 planId, address newMerchant) public override onlyOwner whenNotPaused {
        super.updateMerchant(planId, newMerchant);
    }

    function disablePlan(uint256 planId) public override onlyOwner whenNotPaused {
        super.disablePlan(planId);
    }


    function subscribe(uint256 planId) public override whenNotPaused nonReentrant {
        super.subscribe(planId);
    }

    function subscribeWithPermit(
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override whenNotPaused nonReentrant {
        super.subscribeWithPermit(planId, deadline, v, r, s);
    }

    function processPayment(address user, uint256 planId) public override whenNotPaused nonReentrant {
        super.processPayment(user, planId);
    }

    function cancelSubscription(uint256 planId) public override whenNotPaused nonReentrant {
        super.cancelSubscription(planId);
    }

    /**
     * @notice Recover ERC20 tokens accidentally sent to this contract.
     * @dev Only callable by the owner.
     * @param token The ERC20 token address.
     * @param amount The amount of tokens to recover.
     */
    function recoverERC20(address token, uint256 amount) external override onlyOwner {
        _recoverERC20(token, amount, owner());
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private _gap;
}

