interface IGovernanceController {
    function isPaused() external view returns (bool);
    function pause() external;
    function isGovernor(address _addr) external view returns (bool);
    function governor() external view returns (address);
}
