// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./SubscriptionUpgradeable.sol";

/// @title Second version of the upgradeable subscription contract
/// @notice Adds a simple variable and getter to test upgrades
contract SubscriptionUpgradeableV2 is SubscriptionUpgradeable {
    uint256 public upgradeValue;

    function setUpgradeValue(uint256 value) public onlyOwner {
        upgradeValue = value;
    }

    function version() public pure returns (string memory) {
        return "v2";
    }
}

