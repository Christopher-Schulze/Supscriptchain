// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockV3Aggregator is AggregatorV3Interface {
    int256 public latestAnswer;
    uint256 public latestTimestamp;
    uint8 public _decimals;
    uint256 public version;

    constructor(uint8 decimals_, int256 initialAnswer) {
        _decimals = decimals_;
        latestAnswer = initialAnswer;
        latestTimestamp = block.timestamp;
        version = 0;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock V3 Aggregator";
    }

    function getRoundData(uint80 _roundId)
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
        return (_roundId, latestAnswer, latestTimestamp, latestTimestamp, _roundId);
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

    function setLatestAnswer(int256 _newAnswer) external {
        latestAnswer = _newAnswer;
        latestTimestamp = block.timestamp;
    }
    
    function setDecimals(uint8 _newDecimals) external {
        _decimals = _newDecimals;
    }
}
