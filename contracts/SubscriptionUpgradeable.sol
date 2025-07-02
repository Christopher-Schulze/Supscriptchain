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
    ) public onlyOwner whenNotPaused {
        _createPlan(_merchantAddress, _token, _price, _billingCycle, _priceInUsd, _usdPrice, _priceFeedAddress);
    }

    function updatePlan(
        uint256 _planId,
        uint256 _billingCycle,
        uint256 _price,
        bool _priceInUsd,
        uint256 _usdPrice,
        address _priceFeedAddress
    ) public onlyOwner whenNotPaused {
        _updatePlan(_planId, _billingCycle, _price, _priceInUsd, _usdPrice, _priceFeedAddress);
    }


    function subscribe(uint256 _planId) public whenNotPaused nonReentrant {
        _subscribe(_planId, msg.sender);
    }

    function subscribeWithPermit(
        uint256 _planId,
        uint256 _deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public whenNotPaused nonReentrant {
        _subscribeWithPermit(_planId, _deadline, v, r, s, msg.sender);
    }

    function processPayment(address _user, uint256 _planId) public whenNotPaused nonReentrant {
        _processPayment(_user, _planId);
    }

    function cancelSubscription(uint256 _planId) public whenNotPaused nonReentrant {
        _cancelSubscription(_planId, msg.sender);
    }

    /**
     * @notice Recover ERC20 tokens accidentally sent to this contract.
     * @dev Only callable by the owner.
     * @param token The ERC20 token address.
     * @param amount The amount of tokens to recover.
     */
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        _recoverERC20(token, amount, owner());
    }

    uint256[50] private __gap;
}

