// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// Enhanced Uniswap V2 router interface for Base chain
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token, uint amountTokenDesired, uint amountTokenMin,
        uint amountETHMin, address to, uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function removeLiquidityETH(
        address token, uint liquidity, uint amountTokenMin,
        uint amountETHMin, address to, uint deadline
    ) external returns (uint amountToken, uint amountETH);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Pair {
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function transfer(address to, uint value) external returns (bool);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

/**
 * @title SovereignFlashLock V2.0 - Enhanced Liquidity Management Engine
 * @dev Advanced dual-phase liquidity system with sophisticated lock mechanisms
 * @author JARVIS 2.0 Core Commander
 */
contract SovereignFlashLockV2 is ERC20, Ownable, ReentrancyGuard, Pausable {
    // === CONSTANTS & CONFIGURATION ===
    // Base mainnet SushiSwap V2 router (verified operational)
    address public constant BASE_UNISWAP_ROUTER = 0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 1e18;
    uint256 public constant MIN_LOCK_DURATION = 15 minutes; // Minimum lock time
    uint256 public constant MAX_LOCK_DURATION = 24 hours;   // Maximum lock time
    uint256 public constant SLIPPAGE_TOLERANCE = 300; // 3% in basis points

    // === STATE VARIABLES ===
    address public fundingWallet;
    uint256 public lockEnd;
    uint256 public lockDuration;
    bool public liquidityInitialized;
    bool public reclaimed;
    uint256 public totalLiquidityBurned;
    uint256 public reclaimCount;

    // Enhanced tracking
    mapping(address => uint256) public userContributions;
    mapping(uint256 => LiquiditySnapshot) public snapshots;
    uint256 public snapshotCount;

    struct LiquiditySnapshot {
        uint256 timestamp;
        uint256 tokenAmount;
        uint256 ethAmount;
        uint256 lpTokens;
        address executor;
    }

    // === EVENTS ===
    event LiquidityInitialized(uint256 lockEnd, uint256 lpTokensBurned);
    event LiquidityReclaimed(address indexed fundingWallet, uint256 amountLP, uint256 reclaimId);
    event EmergencyWithdraw(address indexed token, uint256 amount);
    event LockDurationUpdated(uint256 newDuration);
    event SnapshotCreated(uint256 indexed snapshotId, uint256 tokenAmount, uint256 ethAmount);

    // === MODIFIERS ===
    modifier onlyAfterLock() {
        require(block.timestamp >= lockEnd, "Lock period active");
        _;
    }

    modifier validLockDuration(uint256 duration) {
        require(duration >= MIN_LOCK_DURATION && duration <= MAX_LOCK_DURATION, "Invalid lock duration");
        _;
    }

    constructor(
        address _fundingWallet,
        uint256 _lockDuration
    ) ERC20("SOVEREIGN LIQUIDITY V2", "SOVR2") validLockDuration(_lockDuration) {
        require(_fundingWallet != address(0), "Invalid funding wallet");
        fundingWallet = _fundingWallet;
        lockDuration = _lockDuration;
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Enhanced liquidity initialization with sophisticated burn mechanism
     * @param tokenAmount Amount of tokens to inject into liquidity
     */
    function initializeLiquidity(uint256 tokenAmount)
        external
        payable
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(!liquidityInitialized, "Liquidity already initialized");
        require(tokenAmount > 0 && msg.value > 0, "Invalid amounts");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient contract balance");

        // Create snapshot
        _createSnapshot(tokenAmount, msg.value, msg.sender);

        // Enhanced approval with safety checks
        _approve(address(this), BASE_UNISWAP_ROUTER, tokenAmount);

        IUniswapV2Router02 router = IUniswapV2Router02(BASE_UNISWAP_ROUTER);
        uint256 deadline = block.timestamp + 300; // 5-minute deadline

        // Calculate minimum amounts with slippage protection
        uint256 minTokenAmount = (tokenAmount * (10000 - SLIPPAGE_TOLERANCE)) / 10000;
        uint256 minETHAmount = (msg.value * (10000 - SLIPPAGE_TOLERANCE)) / 10000;

        // Add liquidity with slippage protection
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            minTokenAmount,
            minETHAmount,
            address(this),
            deadline
        );

        // Enhanced LP token burning mechanism
        address pair = IUniswapV2Factory(router.factory()).getPair(address(this), router.WETH());
        require(pair != address(0), "Pair creation failed");

        uint256 lpBalance = IERC20(pair).balanceOf(address(this));
        require(lpBalance >= liquidity, "LP token mismatch");

        // Burn LP tokens to dead address (irreversible lock)
        require(IERC20(pair).transfer(0x000000000000000000000000000000000000dEaD, liquidity), "LP burn failed");

        // Update state
        liquidityInitialized = true;
        lockEnd = block.timestamp + lockDuration;
        totalLiquidityBurned += liquidity;
        userContributions[msg.sender] += amountToken;

        emit LiquidityInitialized(lockEnd, liquidity);
    }

    /**
     * @dev Enhanced auto-reclaim with sophisticated LP routing
     */
    function autoReclaim() external onlyAfterLock nonReentrant whenNotPaused {
        require(liquidityInitialized, "Liquidity not initialized");
        require(!reclaimed, "Already reclaimed");

        IUniswapV2Router02 router = IUniswapV2Router02(BASE_UNISWAP_ROUTER);

        // Enhanced balance verification
        uint256 tokenBal = balanceOf(address(this));
        uint256 ethBal = address(this).balance;
        require(tokenBal > 0 || ethBal > 0, "No assets to reclaim");

        if (tokenBal > 0 && ethBal > 0) {
            // Re-inject liquidity and send to funding wallet
            _approve(address(this), BASE_UNISWAP_ROUTER, tokenBal);

            uint256 deadline = block.timestamp + 300;
            uint256 minTokenAmount = (tokenBal * (10000 - SLIPPAGE_TOLERANCE)) / 10000;
            uint256 minETHAmount = (ethBal * (10000 - SLIPPAGE_TOLERANCE)) / 10000;

            (,, uint256 liquidity) = router.addLiquidityETH{value: ethBal}(
                address(this),
                tokenBal,
                minTokenAmount,
                minETHAmount,
                fundingWallet, // Direct LP tokens to funding wallet
                deadline
            );

            reclaimCount++;
            emit LiquidityReclaimed(fundingWallet, liquidity, reclaimCount);
        } else {
            // Handle single-asset scenarios
            if (tokenBal > 0) {
                require(transfer(fundingWallet, tokenBal), "Token transfer failed");
            }
            if (ethBal > 0) {
                (bool success, ) = payable(fundingWallet).call{value: ethBal}("");
                require(success, "ETH transfer failed");
            }
        }

        reclaimed = true;
        _createSnapshot(tokenBal, ethBal, msg.sender);
    }

    /**
     * @dev Emergency functions for enhanced security
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }

    function emergencyUnpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(owner()).call{value: amount}("");
            require(success, "ETH withdrawal failed");
        } else {
            require(IERC20(token).transfer(owner(), amount), "Token withdrawal failed");
        }
        emit EmergencyWithdraw(token, amount);
    }

    /**
     * @dev Update lock duration (only before initialization)
     */
    function updateLockDuration(uint256 newDuration)
        external
        onlyOwner
        validLockDuration(newDuration)
    {
        require(!liquidityInitialized, "Cannot modify after initialization");
        lockDuration = newDuration;
        emit LockDurationUpdated(newDuration);
    }

    /**
     * @dev Internal snapshot creation for tracking
     */
    function _createSnapshot(uint256 tokenAmount, uint256 ethAmount, address executor) internal {
        snapshots[snapshotCount] = LiquiditySnapshot({
            timestamp: block.timestamp,
            tokenAmount: tokenAmount,
            ethAmount: ethAmount,
            lpTokens: totalLiquidityBurned,
            executor: executor
        });

        emit SnapshotCreated(snapshotCount, tokenAmount, ethAmount);
        snapshotCount++;
    }

    /**
     * @dev Enhanced view functions
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= lockEnd) return 0;
        return lockEnd - block.timestamp;
    }

    function getLiquiditySnapshot(uint256 snapshotId) external view returns (LiquiditySnapshot memory) {
        require(snapshotId < snapshotCount, "Invalid snapshot ID");
        return snapshots[snapshotId];
    }

    function getPairAddress() external view returns (address) {
        IUniswapV2Router02 router = IUniswapV2Router02(BASE_UNISWAP_ROUTER);
        return IUniswapV2Factory(router.factory()).getPair(address(this), router.WETH());
    }

    function getContractStatus() external view returns (
        bool initialized,
        bool isReclaimed,
        uint256 timeRemaining,
        uint256 contractTokenBalance,
        uint256 contractETHBalance
    ) {
        uint256 remaining = 0;
        if (block.timestamp < lockEnd) {
            remaining = lockEnd - block.timestamp;
        }

        return (
            liquidityInitialized,
            reclaimed,
            remaining,
            balanceOf(address(this)),
            address(this).balance
        );
    }

    // Enhanced receive function with event logging
    event ETHReceived(address indexed sender, uint256 amount);

    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    // Fallback function for enhanced compatibility
    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
}
