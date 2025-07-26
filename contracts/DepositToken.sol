// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "./interfaces/IReserveOracle.sol";
import "./interfaces/IVerifier.sol";
import "./interfaces/IGovernanceController.sol";

contract DepositToken is ERC20Permit {
    IReserveOracle public reserveOracle;
    IVerifier public verifier;
    IGovernanceController public governanceController;

    uint256 public constant KAPPA = 1e18; // Reserve ratio threshold (1.0 in 18 decimals)

    event Mint(address indexed to, uint256 amount);
    event Redeem(address indexed from, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        address _verifier,
        address _reserveOracle,
        address _governanceController
    ) ERC20(name, symbol) ERC20Permit(name) {
        verifier = IVerifier(_verifier);
        reserveOracle = IReserveOracle(_reserveOracle);
        governanceController = IGovernanceController(_governanceController);
    }

    modifier onlyWhenNotPaused() {
        require(!governanceController.isPaused(), "Protocol is paused");
        _;
    }

    function mint(address to, uint256 amount, bytes calldata zkProof) external onlyWhenNotPaused {
        require(verifier.verifyProof(zkProof), "Invalid zk-KYC proof");

        // Check reserve ratio before minting
        uint256 ratio = reserveOracle.reserveRatio();
        require(ratio >= KAPPA, "Reserve ratio too low");

        _mint(to, amount);
        emit Mint(to, amount);
    }

    function redeem(uint256 amount) external onlyWhenNotPaused {
        _burn(msg.sender, amount);
        emit Redeem(msg.sender, amount);
        // In a full implementation, this would initiate off-chain fiat redemption
    }

    function forcePause() external {
        require(
            reserveOracle.reserveRatio() < KAPPA,
            "Reserve ratio healthy"
        );
        governanceController.pause();
    }

    function setVerifier(address newVerifier) external {
        require(msg.sender == governanceController.governor(), "Not governor");
        verifier = IVerifier(newVerifier);
    }


    function setReserveOracle(address newOracle) external {
        require(governanceController.isGovernor(msg.sender), "Not governor");
        reserveOracle = IReserveOracle(newOracle);
    }

    function setGovernanceController(address newGov) external {
        require(governanceController.isGovernor(msg.sender), "Not governor");
        governanceController = IGovernanceController(newGov);
    }
}
