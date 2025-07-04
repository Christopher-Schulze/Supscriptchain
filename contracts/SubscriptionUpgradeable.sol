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
        address _merchantAddress,
        address _token,
        uint256 _price,
        uint256 _billingCycle,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public override onlyOwner whenNotPaused {
        super.createPlan(
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
    ) public override onlyOwner whenNotPaused {
        super.updatePlan(
            _planId,
            _billingCycle,
            _price,
            _priceInUsd,
            _usdPrice,
            _priceFeedAddress
        );
    }

    function updateMerchant(uint256 _planId, address _newMerchant) public override onlyOwner whenNotPaused {
        super.updateMerchant(_planId, _newMerchant);
    }


    function subscribe(uint256 _planId) public override whenNotPaused nonReentrant {
        super.subscribe(_planId);
    }

    function subscribeWithPermit(
        uint256 _planId,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override whenNotPaused nonReentrant {
        super.subscribeWithPermit(_planId, _deadline, v, r, s);
    }

    function processPayment(address _user, uint256 _planId) public override whenNotPaused nonReentrant {
        super.processPayment(_user, _planId);
    }

    function cancelSubscription(uint256 _planId) public override whenNotPaused nonReentrant {
        super.cancelSubscription(_planId);
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

    uint256[50] private __gap;
}

