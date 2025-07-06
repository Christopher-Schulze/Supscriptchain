// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol"; // Changed from Ownable
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/AggregatorV3Interface.sol"; // Changed to local import
import "./BaseSubscription.sol";

contract Subscription is Ownable2Step, AccessControl, Pausable, ReentrancyGuard, BaseSubscription { // Changed from Ownable
    using SafeERC20 for IERC20;

    /**
     * @notice Contract constructor. Initializes Ownable2Step and grants roles to the deployer.
     */
    constructor() Ownable2Step() {
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

    /**
     * @notice Calculates the payment amount for a given plan.
     * @dev For USD-based plans, uses Chainlink price feed. Otherwise, uses fixed token price.
     * @param _planId The ID of the subscription plan.
     * @return amount The payment amount in the smallest unit of the plan's token.
     */

    /**
     * @notice Allows a user to subscribe to a plan.
     * @dev Transfers initial payment from user to merchant. User must approve contract for token spending.
     * @param _planId The ID of the plan to subscribe to.
     */
    function subscribe(uint256 planId) public override whenNotPaused nonReentrant {
        super.subscribe(planId);
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
        uint256 planId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override whenNotPaused nonReentrant {
        super.subscribeWithPermit(planId, deadline, v, r, s);
    }

    /**
     * @notice Processes a recurring payment for a user's subscription.
     * @dev Can only be called by the plan's merchant. Transfers payment from user to merchant.
     * User must maintain token approval. Updates next payment date.
     * @param _user The address of the subscriber whose payment is being processed.
     * @param _planId The ID of the plan for which payment is processed.
     */
    function processPayment(address user, uint256 planId) public override whenNotPaused nonReentrant {
        super.processPayment(user, planId);
    }

    /**
     * @notice Allows a subscriber to cancel their active subscription.
     * @dev Sets the subscription to inactive. No refunds for the current billing cycle.
     * @param _planId The ID of the plan to cancel.
     */
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
}
