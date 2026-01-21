// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IReserveRegistry.sol";
import "./interfaces/IVerifier.sol";
import "./interfaces/IGovernanceController.sol";

contract DepositToken is ERC20Permit, ReentrancyGuard {
    IReserveRegistry public reserveRegistry;
    IVerifier public verifier;
    IGovernanceController public governanceController;

    // Reserve ratio threshold (1.0 in 18 decimals)
    uint256 public constant KAPPA = 1e18;

    // Issuer/minter allowlist (keeps transfers unrestricted)
    mapping(address => bool) public isMinter;

    event Mint(address indexed to, uint256 amount);
    event Redeem(address indexed from, uint256 amount);

    // Emitted when minting is blocked due to reserves below KAPPA
    event ReserveBreach(uint256 ratio);

    event MinterUpdated(address indexed minter, bool allowed);
    event VerifierUpdated(address indexed newVerifier);
    event ReserveRegistryUpdated(address indexed newRegistry);
    event GovernanceControllerUpdated(address indexed newGovernance);

    modifier onlyWhenNotPaused() {
        require(!governanceController.isPaused(), "Protocol is paused");
        _;
    }

    modifier onlyGovernor() {
        bool ok = (msg.sender == governanceController.governor()) ||
            governanceController.isGovernor(msg.sender);
        require(ok, "Not governor");
        _;
    }

    modifier onlyMinter() {
        require(isMinter[msg.sender], "Not minter");
        _;
    }

    /// @notice Constructor to initialize the deposit token
    /// @param name Name of the token
    /// @param symbol Symbol of the token
    /// @param _verifier Address of the zk-KYC verifier contract
    /// @param _reserveRegistry Address of the reserve registry contract
    /// @param _governanceController Address of the governance controller contract
    constructor(
        string memory name,
        string memory symbol,
        address _verifier,
        address _reserveRegistry,
        address _governanceController
    ) ERC20(name, symbol) ERC20Permit(name) {
        require(_verifier != address(0), "Invalid verifier");
        require(_reserveRegistry != address(0), "Invalid reserve registry");
        require(_governanceController != address(0), "Invalid governance");

        verifier = IVerifier(_verifier);
        reserveRegistry = IReserveRegistry(_reserveRegistry);
        governanceController = IGovernanceController(_governanceController);

        // Reasonable default: deployer starts as minter (often the initial issuer in tests)
        isMinter[msg.sender] = true;
        emit MinterUpdated(msg.sender, true);
    }

    function mint(
        address to,
        uint256 amount,
        bytes calldata zkProof
    ) external onlyWhenNotPaused onlyMinter {
        require(to != address(0), "Invalid to");
        require(amount > 0, "Invalid amount");

        // zk-KYC / membership verification
        require(verifier.verifyProof(zkProof), "Invalid zk-KYC proof");

        // Reserve safety check
        uint256 ratio = reserveRegistry.reserveRatio();
        if (ratio < KAPPA) {
            emit ReserveBreach(ratio);
            revert("Paused: Reserve below threshold");
        }

        _mint(to, amount);
        emit Mint(to, amount);
    }

    function redeem(uint256 amount) external onlyWhenNotPaused nonReentrant {
        require(amount > 0, "Invalid amount");
        _burn(msg.sender, amount);
        emit Redeem(msg.sender, amount);
        // Off-chain fiat settlement would be triggered by events in a full implementation
    }

    /// @notice Allow or revoke a minter (issuer) address
    function setMinter(address minter, bool allowed) external onlyGovernor {
        require(minter != address(0), "Invalid minter");
        isMinter[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    function setVerifier(address newVerifier) external onlyGovernor {
        require(newVerifier != address(0), "Invalid verifier");
        verifier = IVerifier(newVerifier);
        emit VerifierUpdated(newVerifier);
    }

    function setReserveRegistry(address newRegistry) external onlyGovernor {
        require(newRegistry != address(0), "Invalid reserve registry");
        reserveRegistry = IReserveRegistry(newRegistry);
        emit ReserveRegistryUpdated(newRegistry);
    }

    function setGovernanceController(address newGov) external onlyGovernor {
        require(newGov != address(0), "Invalid governance");
        governanceController = IGovernanceController(newGov);
        emit GovernanceControllerUpdated(newGov);
    }

    /// @notice Allow anyone to trigger pause if reserves fall below KAPPA
    /// @dev This provides an automatic circuit breaker when reserve backing deteriorates
    function forcePause() external {
        uint256 ratio = reserveRegistry.reserveRatio();
        require(ratio < KAPPA, "Reserve ratio sufficient");
        require(!governanceController.isPaused(), "Already paused");

        // Pause through governance controller
        governanceController.pause();
    }
}
