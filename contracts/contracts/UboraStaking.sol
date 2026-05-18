// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract UboraStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 duration;
        uint256 apy;
        bool withdrawn;
    }

    mapping(address => Stake[]) public userStakes;

    event Staked(address indexed user, uint256 amount, uint256 duration, uint256 apy, uint256 stakeIndex);
    event Unstaked(address indexed user, uint256 amount, uint256 reward, uint256 stakeIndex);
    event RewardFunded(uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(address _stakingToken) Ownable(msg.sender) {
        require(_stakingToken != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @dev Get the APY for a given duration in days
     * Returns APY in basis points (1% = 100, 10% = 1000)
     */
    function getApy(uint256 _durationDays) public pure returns (uint256) {
        if (_durationDays == 30) return 1000; // 10%
        if (_durationDays == 90) return 1500; // 15%
        if (_durationDays == 180) return 2500; // 25%
        if (_durationDays == 365) return 4000; // 40%
        revert("Invalid staking duration");
    }

    /**
     * @dev Stake tokens for a specific duration
     * @param _amount Amount to stake
     * @param _durationDays Duration in days (30, 90, 180, 365)
     */
    function stake(uint256 _amount, uint256 _durationDays) external nonReentrant {
        require(_amount > 0, "Cannot stake 0");
        
        uint256 apy = getApy(_durationDays);
        uint256 durationSeconds = _durationDays * 1 days;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        userStakes[msg.sender].push(Stake({
            amount: _amount,
            startTime: block.timestamp,
            duration: durationSeconds,
            apy: apy,
            withdrawn: false
        }));

        emit Staked(msg.sender, _amount, _durationDays, apy, userStakes[msg.sender].length - 1);
    }

    /**
     * @dev Calculate reward for a specific stake
     */
    function calculateReward(address _user, uint256 _index) public view returns (uint256) {
        Stake memory userStake = userStakes[_user][_index];
        if (userStake.amount == 0 || userStake.withdrawn) return 0;

        // Reward = Amount * APY% * (Duration / 365 days)
        // APY is in basis points, so we divide by 10000
        uint256 reward = (userStake.amount * userStake.apy * userStake.duration) / (10000 * 365 days);
        return reward;
    }

    /**
     * @dev Unstake tokens after duration has passed
     * @param _index Index of the stake in the user's array
     */
    function unstake(uint256 _index) external nonReentrant {
        require(_index < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage userStake = userStakes[msg.sender][_index];
        require(!userStake.withdrawn, "Already withdrawn");
        require(block.timestamp >= userStake.startTime + userStake.duration, "Lock period not ended");

        userStake.withdrawn = true;

        uint256 reward = calculateReward(msg.sender, _index);
        uint256 totalPayout = userStake.amount + reward;

        require(stakingToken.balanceOf(address(this)) >= totalPayout, "Insufficient contract balance for reward");

        stakingToken.safeTransfer(msg.sender, totalPayout);

        emit Unstaked(msg.sender, userStake.amount, reward, _index);
    }

    /**
     * @dev Get total number of stakes for a user
     */
    function getUserStakesCount(address _user) external view returns (uint256) {
        return userStakes[_user].length;
    }

    /**
     * @dev Admin function to fund the contract with reward tokens
     */
    function fundRewards(uint256 _amount) external onlyOwner {
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit RewardFunded(_amount);
    }

    /**
     * @dev Admin function to withdraw unallocated tokens (emergency only)
     */
    function adminWithdraw(uint256 _amount) external onlyOwner {
        stakingToken.safeTransfer(owner(), _amount);
    }
}
