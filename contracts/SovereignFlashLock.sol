// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Uniswap V2 router interface for Base chain
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token, uint amountTokenDesired, uint amountTokenMin,
        uint amountETHMin, address to, uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}



contract SovereignFlashLock is ERC20, Ownable, ReentrancyGuard {
    // BASE chain BaseSwap router (most common DEX on Base)
    address public constant BASE_UNISWAP_ROUTER = 0x327Df1E6de05895d2ab08513aaDD9313Fe505d86;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 1e18;
    address public fundingWallet;
    uint256 public lockEnd;
    bool public liquidityInitialized;
    bool public reclaimed;

    event LiquidityInitialized(uint256 lockEnd);
    event LiquidityReclaimed(address fundingWallet, uint256 amountLP);

    modifier onlyAfterLock() {
        require(block.timestamp >= lockEnd, "Lock not expired");
        _;
    }

    constructor(address _fundingWallet) ERC20("SOVEREIGN LIQUIDITY", "SOVR") {
        require(_fundingWallet != address(0), "Invalid funding wallet");
        fundingWallet = _fundingWallet;
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    // Step 1: Inject liquidity, burn LP, set timer
    function initializeLiquidity(uint256 tokenAmount) external payable onlyOwner nonReentrant {
        require(!liquidityInitialized, "Already initialized");
        require(tokenAmount > 0 && msg.value > 0, "ETH or token amount zero");
        require(balanceOf(address(this)) >= tokenAmount, "Insufficient token balance in contract");

        // Approve tokens to router from contract
        _approve(address(this), BASE_UNISWAP_ROUTER, tokenAmount);

        IUniswapV2Router02 router = IUniswapV2Router02(BASE_UNISWAP_ROUTER);
        uint deadline = block.timestamp + 60;

        // Add liquidity
        (,, uint liquidity) = router.addLiquidityETH{value: msg.value}(
            address(this),
            tokenAmount,
            0,
            0,
            address(this),
            deadline
        );

        // Burn LP tokens (simulate full lock by sending to dead address)
        address pair = IUniswapV2Factory(router.factory()).getPair(address(this), router.WETH());
        require(pair != address(0), "Pair does not exist");
        
        // Check LP token balance
        uint256 lpBalance = IERC20(pair).balanceOf(address(this));
        require(lpBalance >= liquidity, "Insufficient LP tokens");
        
        // Transfer LP tokens to dead address instead of burning
        require(IERC20(pair).transfer(0x000000000000000000000000000000000000dEaD, liquidity), "LP transfer failed");

        liquidityInitialized = true;
        lockEnd = block.timestamp + 30 minutes;

        emit LiquidityInitialized(lockEnd);
    }

    // Step 2: After lock, auto-reinject and send LP to funding wallet
    function autoReclaim() external onlyAfterLock nonReentrant {
        require(liquidityInitialized, "Liquidity not init");
        require(!reclaimed, "Already reclaimed");

        IUniswapV2Router02 router = IUniswapV2Router02(BASE_UNISWAP_ROUTER);

        // Use retained tokens/ETH (must be in contract)
        uint256 tokenBal = balanceOf(address(this));
        uint256 ethBal = address(this).balance;
        require(tokenBal > 0 && ethBal > 0, "No tokens/ETH to reclaim");

        _approve(address(this), BASE_UNISWAP_ROUTER, tokenBal);

        uint deadline = block.timestamp + 60;
        (,, uint liquidity) = router.addLiquidityETH{value: ethBal}(
            address(this),
            tokenBal,
            0,
            0,
            fundingWallet,
            deadline
        );

        reclaimed = true;
        emit LiquidityReclaimed(fundingWallet, liquidity);
    }

    // Allow contract to receive ETH
    receive() external payable {}
}