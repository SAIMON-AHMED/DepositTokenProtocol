// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReserveOracle {
    uint256 private _reserveRatio;

    function setReserveRatio(uint256 ratio) external {
        _reserveRatio = ratio;
    }

    function reserveRatio() external view returns (uint256) {
        return _reserveRatio;
    }
}