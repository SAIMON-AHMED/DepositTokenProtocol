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
  event Paused();
  bool public paused;

  /// @notice Constructor to initialize the deposit token
  /// @param name Name of the token
  /// @param symbol Symbol of the token
  /// @param _verifier Address of the zk-KYC verifier contract
  /// @param _reserveOracle Address of the reserve oracle contract
  /// @param _governanceController Address of the governance controller contract
  /// @dev Initializes the ERC20 token with name and symbol, and sets the verifier,
  /// reserve oracle, and governance controller addresses.
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

  function mint(
    address to,
    uint256 amount,
    bytes calldata zkProof
  ) external onlyWhenNotPaused {
    require(verifier.verifyProof(zkProof), "Invalid zk-KYC proof");

    uint256 ratio = reserveOracle.reserveRatio(); 
    if (ratio < KAPPA) {
      paused = true;
      emit Paused();
      revert("Paused: Reserve below threshold");
    }

    _mint(to, amount);
    emit Mint(to, amount);
  }


  function redeem(uint256 amount) external onlyWhenNotPaused {
    _burn(msg.sender, amount);
    emit Redeem(msg.sender, amount);
    // In a full implementation, this would initiate off-chain fiat redemption
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
