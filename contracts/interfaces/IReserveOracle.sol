// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReserveOracle {
    function reserveRatio() external view returns (uint256);
}
