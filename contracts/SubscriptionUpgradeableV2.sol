// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./SubscriptionUpgradeable.sol";

/// @title Second version adding a simple getter to test upgrades
contract SubscriptionUpgradeableV2 is SubscriptionUpgradeable {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

