// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LendingPool
 * @notice Share-based liquidity pool for DeFi lending protocol
 * @dev Implements ERC-4626 style share accounting
 * 
 * CRITICAL ACCOUNTING RULES:
 * - totalLiquidity = total deposits (NEVER changes on borrow/repay)
 * - totalBorrowed = active loans
 * - availableLiquidity = totalLiquidity - totalBorrowed
 * - Share calculation: shares = (amount * totalShares) / totalLiquidity
 */
contract LendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── STATE ───────────────────────────────────────────────────────────────

    IERC20 public immutable token; // e.g., USDC
    address public loanManager;    // Only LoanManager can call borrow/repay

    uint256 public totalLiquidity;  // Total deposits (never changes on borrow/repay)
    uint256 public totalBorrowed;   // Active loans
    uint256 public totalShares;     // Total shares minted

    mapping(address => uint256) public shares; // User shares

    // ─── EVENTS ──────────────────────────────────────────────────────────────

    event Deposited(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdrawn(address indexed user, uint256 amount, uint256 sharesBurned);
    event Borrowed(uint256 amount);
    event Repaid(uint256 amount);
    event LoanManagerUpdated(address indexed newManager);

    // ─── ERRORS ──────────────────────────────────────────────────────────────

    error ZeroAmount();
    error InsufficientShares();
    error InsufficientLiquidity();
    error OnlyLoanManager();
    error ZeroAddress();

    // ─── MODIFIERS ───────────────────────────────────────────────────────────

    modifier onlyLoanManager() {
        if (msg.sender != loanManager) revert OnlyLoanManager();
        _;
    }

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────────────

    constructor(address _token) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setLoanManager(address _loanManager) external onlyOwner {
        if (_loanManager == address(0)) revert ZeroAddress();
        loanManager = _loanManager;
        emit LoanManagerUpdated(_loanManager);
    }

    // ─── DEPOSIT ─────────────────────────────────────────────────────────────

    /**
     * @notice Deposit tokens into the pool and receive shares
     * @param amount Amount of tokens to deposit
     * @return sharesMinted Number of shares minted
     */
    function deposit(uint256 amount) external nonReentrant returns (uint256 sharesMinted) {
        if (amount == 0) revert ZeroAmount();

        // Calculate shares to mint (ERC-4626 style)
        // IF first deposit: shares = amount
        // ELSE: shares = (amount * totalShares) / totalLiquidity
        if (totalShares == 0 || totalLiquidity == 0) {
            sharesMinted = amount;
        } else {
            sharesMinted = (amount * totalShares) / totalLiquidity;
        }

        // Update state
        shares[msg.sender] += sharesMinted;
        totalShares += sharesMinted;
        totalLiquidity += amount;

        // Transfer tokens from user
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount, sharesMinted);
    }

    // ─── WITHDRAW ────────────────────────────────────────────────────────────

    /**
     * @notice Burn shares and withdraw tokens
     * @param sharesToBurn Number of shares to burn
     * @return amount Amount of tokens withdrawn
     */
    function withdraw(uint256 sharesToBurn) external nonReentrant returns (uint256 amount) {
        if (sharesToBurn == 0) revert ZeroAmount();
        if (sharesToBurn > shares[msg.sender]) revert InsufficientShares();

        // Calculate amount: amount = (shares * totalLiquidity) / totalShares
        amount = (sharesToBurn * totalLiquidity) / totalShares;

        // Check available liquidity
        uint256 available = totalLiquidity - totalBorrowed;
        if (amount > available) revert InsufficientLiquidity();

        // Update state
        shares[msg.sender] -= sharesToBurn;
        totalShares -= sharesToBurn;
        totalLiquidity -= amount;

        // Transfer tokens to user
        token.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, sharesToBurn);
    }

    // ─── BORROW (INTERNAL - ONLY LOANMANAGER) ───────────────────────────────

    /**
     * @notice Borrow tokens from pool (only LoanManager)
     * @dev Increases totalBorrowed, does NOT change totalLiquidity
     * @param amount Amount to borrow
     */
    function borrow(uint256 amount) external onlyLoanManager {
        if (amount == 0) revert ZeroAmount();

        uint256 available = totalLiquidity - totalBorrowed;
        if (amount > available) revert InsufficientLiquidity();

        // Update state: ONLY totalBorrowed changes
        totalBorrowed += amount;

        // Transfer tokens to LoanManager
        token.safeTransfer(loanManager, amount);

        emit Borrowed(amount);
    }

    // ─── REPAY (INTERNAL - ONLY LOANMANAGER) ────────────────────────────────

    /**
     * @notice Repay borrowed tokens (only LoanManager)
     * @dev Decreases totalBorrowed, does NOT change totalLiquidity
     * @param amount Amount to repay
     */
    function repay(uint256 amount) external onlyLoanManager {
        if (amount == 0) revert ZeroAmount();

        // Update state: ONLY totalBorrowed changes
        totalBorrowed = totalBorrowed > amount ? totalBorrowed - amount : 0;

        // Transfer tokens from LoanManager
        token.safeTransferFrom(loanManager, address(this), amount);

        emit Repaid(amount);
    }

    // ─── VIEW FUNCTIONS ──────────────────────────────────────────────────────

    function getAvailableLiquidity() external view returns (uint256) {
        return totalLiquidity - totalBorrowed;
    }

    function getUserShareValue(address user) external view returns (uint256) {
        if (totalShares == 0 || shares[user] == 0) return 0;
        return (shares[user] * totalLiquidity) / totalShares;
    }

    function getPoolStats() external view returns (
        uint256 _totalLiquidity,
        uint256 _totalBorrowed,
        uint256 _totalShares,
        uint256 _availableLiquidity
    ) {
        return (
            totalLiquidity,
            totalBorrowed,
            totalShares,
            totalLiquidity - totalBorrowed
        );
    }
}
