// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/AggregatorV3Interface.sol";

contract MockV3Aggregator is AggregatorV3Interface {
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint8 public mockDecimals;
    uint256 public immutable version;

    constructor(uint8 decimals_, int256 initialAnswer) {
        mockDecimals = decimals_;
        latestAnswer = initialAnswer;
        latestTimestamp = block.timestamp;
        version = 0;
    }

    function decimals() external view override returns (uint8) {
        return mockDecimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock V3 Aggregator";
    }

    function getRoundData(uint80 roundId_)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (roundId_, latestAnswer, latestTimestamp, latestTimestamp, roundId_);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        // Increment roundId for realism if needed, but for basic mocking, 1 is fine.
        return (1, latestAnswer, latestTimestamp, latestTimestamp, 1);
    }

    function setLatestAnswer(int256 newAnswer) external {
        latestAnswer = newAnswer;
        latestTimestamp = block.timestamp;
    }

    function setDecimals(uint8 newDecimals) external {
        mockDecimals = newDecimals;
    }
}
