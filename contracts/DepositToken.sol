// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IReserveRegistry.sol";
import "./interfaces/IVerifier.sol";
import "./interfaces/IGovernanceController.sol";
import "./interfaces/IIdentityRegistry.sol";

/// @title DepositToken
/// @notice ERC-20 deposit token with reserve-gated minting, zk-KYC, and pause controls.
contract DepositToken is ERC20Permit, ReentrancyGuard {
    IReserveRegistry public reserveRegistry;
    IVerifier public verifier;
    IGovernanceController public governanceController;
    IIdentityRegistry public identityRegistry;

    uint256 public constant KAPPA_MINT = 1e18; // 1.0
    uint256 public constant KAPPA_PAUSE = 8e17; // 0.8

    bool public restrictedMode; // false = Mode A (open), true = Mode B (restricted)
    mapping(address => bool) public isMinter;
    event Mint(address indexed to, uint256 amount);
    event Redeem(address indexed from, uint256 amount);
    event ReserveBreach(uint256 ratio, string breachType);
    event AutoPauseTriggered(bool stale, bool underCollateralized);
    event MinterUpdated(address indexed minter, bool allowed);
    event VerifierUpdated(address indexed newVerifier);
    event ReserveRegistryUpdated(address indexed newRegistry);
    event GovernanceControllerUpdated(address indexed newGovernance);
    event IdentityRegistryUpdated(address indexed newRegistry);
    event RestrictedModeUpdated(bool enabled);

    modifier onlyWhenActive() {
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

        // Deployer starts as minter (often the initial issuer)
        isMinter[msg.sender] = true;
        emit MinterUpdated(msg.sender, true);
    }

    function mint(
        address to,
        uint256 amount,
        bytes calldata zkProof
    ) external onlyWhenActive onlyMinter {
        require(to != address(0), "Invalid to");
        require(amount > 0, "Invalid amount");
        require(verifier.verifyProof(zkProof), "Invalid zk-KYC proof");
        require(!reserveRegistry.isStale(), "Oracle data stale");

        uint256 ratio = reserveRegistry.reserveRatio();
        if (ratio < KAPPA_MINT) {
            emit ReserveBreach(ratio, "mint-threshold");
            revert("Reserve below mint threshold");
        }

        _mint(to, amount);
        emit Mint(to, amount);
    }

    function redeem(
        uint256 amount,
        bytes calldata zkProof
    ) external onlyWhenActive nonReentrant {
        require(amount > 0, "Invalid amount");
        require(verifier.verifyProof(zkProof), "Invalid zk-KYC proof");

        _burn(msg.sender, amount);
        emit Redeem(msg.sender, amount);
    }

    /// @notice Triggers Type 1 pause if reserves < κ_pause or oracle stale. Callable by anyone.
    function checkReserves() external {
        bool stale = reserveRegistry.isStale();
        bool underCollateralized = false;

        if (!stale) {
            uint256 ratio = reserveRegistry.reserveRatio();
            underCollateralized = ratio < KAPPA_PAUSE;
        }

        // Also check for deep staleness (2× τ_max) — treat as grounds for pause
        bool deeplyStale = false;
        if (reserveRegistry.lastUpdated() > 0) {
            deeplyStale =
                block.timestamp - reserveRegistry.lastUpdated() >
                2 * reserveRegistry.stalenessThreshold();
        }

        require(
            stale || underCollateralized || deeplyStale,
            "Reserves healthy"
        );
        require(!governanceController.isPaused(), "Already paused");
        governanceController.pauseType1();
        emit AutoPauseTriggered(stale || deeplyStale, underCollateralized);
    }

    /// @dev Enforces Mode B + EmergencyPaused transfer restrictions.
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from != address(0) && to != address(0)) {
            IGovernanceController.ProtocolState state = governanceController
                .protocolState();
            require(
                state != IGovernanceController.ProtocolState.EmergencyPaused,
                "Transfers halted: EmergencyPaused"
            );

            if (restrictedMode && address(identityRegistry) != address(0)) {
                require(
                    identityRegistry.isVerified(to),
                    "Receiver not on allowlist"
                );
            }
        }

        super._update(from, to, amount);
    }

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

    function setIdentityRegistry(address newRegistry) external onlyGovernor {
        identityRegistry = IIdentityRegistry(newRegistry);
        emit IdentityRegistryUpdated(newRegistry);
    }

    function setRestrictedMode(bool enabled) external onlyGovernor {
        restrictedMode = enabled;
        emit RestrictedModeUpdated(enabled);
    }
}
