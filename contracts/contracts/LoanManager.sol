// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ILendingPool {
    function borrow(uint256 amount) external;
    function repay(uint256 amount) external;
    function getAvailableLiquidity() external view returns (uint256);
}

interface IReputation {
    function recordLoan(address user, uint256 amount) external;
    function recordRepayment(address user, bool onTime) external;
    function recordDefault(address user) external;
    function getCreditScore(address user) external view returns (uint256);
    function getMaxLTV(address user) external view returns (uint256);
}

/**
 * @title LoanManager
 * @notice Manages loan lifecycle: creation, repayment, liquidation
 * @dev Integrates with LendingPool and Reputation contracts
 * 
 * FEATURES:
 * - Credit-based borrowing limits (LTV enforcement)
 * - Interest calculation (0.024% daily)
 * - On-time repayment tracking
 * - Liquidation for defaulted loans
 */
contract LoanManager is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─── STATE ───────────────────────────────────────────────────────────────

    IERC20 public immutable token;
    ILendingPool public immutable lendingPool;
    IReputation public immutable reputation;

    uint256 public loanIdCounter;

    // Interest rate: 0.024% per day = 24 basis points per day
    uint256 public constant DAILY_RATE_BP = 24; // basis points (0.024%)
    uint256 public constant BP_DIVISOR = 1000000; // 1,000,000 basis points = 100%

    enum LoanStatus { Active, Repaid, Defaulted }

    struct Loan {
        address borrower;
        uint256 amount;
        uint256 durationDays;
        uint256 interestRate; // daily rate in basis points
        uint256 createdAt;
        uint256 dueDate;
        LoanStatus status;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(address => uint256) public activeLoanId; // One active loan per user

    // ─── EVENTS ──────────────────────────────────────────────────────────────

    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 durationDays,
        uint256 dueDate
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 totalRepayment, bool onTime);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);

    // ─── ERRORS ──────────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroDuration();
    error ActiveLoanExists();
    error InsufficientLiquidity();
    error BorrowLimitExceeded(uint256 maxBorrow, uint256 requested);
    error LoanNotFound();
    error LoanNotActive();
    error Unauthorized();
    error InsufficientBalance();

    // ─── CONSTRUCTOR ─────────────────────────────────────────────────────────

    constructor(address _token, address _lendingPool, address _reputation) {
        token = IERC20(_token);
        lendingPool = ILendingPool(_lendingPool);
        reputation = IReputation(_reputation);
    }

    // ─── CREATE LOAN ─────────────────────────────────────────────────────────

    /**
     * @notice Create a new loan
     * @param amount Loan amount
     * @param durationDays Loan duration in days
     * @return loanId Created loan ID
     */
    function createLoan(uint256 amount, uint256 durationDays) external nonReentrant returns (uint256 loanId) {
        if (amount == 0) revert ZeroAmount();
        if (durationDays == 0) revert ZeroDuration();

        // 1. Check no existing active loan
        if (activeLoanId[msg.sender] != 0) revert ActiveLoanExists();

        // 2. Fetch credit score and max LTV
        uint256 maxLTVBP = reputation.getMaxLTV(msg.sender);

        // 3. Calculate max borrow based on available liquidity and LTV
        uint256 available = lendingPool.getAvailableLiquidity();
        uint256 maxBorrow = (available * maxLTVBP) / 10000; // Convert basis points to percentage

        if (amount > maxBorrow) {
            revert BorrowLimitExceeded(maxBorrow, amount);
        }

        // 4. Create loan record
        loanId = ++loanIdCounter;
        uint256 dueDate = block.timestamp + (durationDays * 1 days);

        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: amount,
            durationDays: durationDays,
            interestRate: DAILY_RATE_BP,
            createdAt: block.timestamp,
            dueDate: dueDate,
            status: LoanStatus.Active
        });

        userLoans[msg.sender].push(loanId);
        activeLoanId[msg.sender] = loanId;

        // 5. Call LendingPool.borrow()
        lendingPool.borrow(amount);

        // 6. Transfer tokens to borrower
        token.safeTransfer(msg.sender, amount);

        // 7. Update reputation
        reputation.recordLoan(msg.sender, amount);

        emit LoanCreated(loanId, msg.sender, amount, durationDays, dueDate);
    }

    // ─── REPAY LOAN ──────────────────────────────────────────────────────────

    /**
     * @notice Repay an active loan
     * @param loanId Loan ID to repay
     */
    function repayLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LoanNotFound();
        if (loan.status != LoanStatus.Active) revert LoanNotActive();
        if (msg.sender != loan.borrower) revert Unauthorized();

        // 1. Calculate total repayment = principal + interest
        uint256 interest = (loan.amount * loan.interestRate * loan.durationDays) / BP_DIVISOR;
        uint256 totalRepayment = loan.amount + interest;

        // 2. Check user balance
        if (token.balanceOf(msg.sender) < totalRepayment) {
            revert InsufficientBalance();
        }

        // 3. Determine if on-time
        bool onTime = block.timestamp <= loan.dueDate;

        // 4. Update loan status
        loan.status = LoanStatus.Repaid;
        activeLoanId[msg.sender] = 0;

        // 5. Transfer tokens from borrower to this contract
        token.safeTransferFrom(msg.sender, address(this), totalRepayment);

        // 6. Approve and call LendingPool.repay() with principal only
        token.approve(address(lendingPool), loan.amount);
        lendingPool.repay(loan.amount);

        // 7. Interest stays in LoanManager (can be distributed to protocol/treasury)
        // For simplicity, interest remains in contract (owner can withdraw)

        // 8. Update reputation
        reputation.recordRepayment(msg.sender, onTime);

        emit LoanRepaid(loanId, msg.sender, totalRepayment, onTime);
    }

    // ─── LIQUIDATE ───────────────────────────────────────────────────────────

    /**
     * @notice Liquidate defaulted loans (callable by anyone)
     * @param loanId Loan ID to liquidate
     */
    function liquidate(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.borrower == address(0)) revert LoanNotFound();
        if (loan.status != LoanStatus.Active) revert LoanNotActive();

        // Check if loan is overdue
        if (block.timestamp <= loan.dueDate) {
            revert("Loan not yet overdue");
        }

        // Mark as defaulted
        loan.status = LoanStatus.Defaulted;
        activeLoanId[loan.borrower] = 0;

        // Pool absorbs the loss (totalBorrowed decreases)
        lendingPool.repay(loan.amount);

        // Update reputation (credit score -= 75)
        reputation.recordDefault(loan.borrower);

        emit LoanDefaulted(loanId, loan.borrower);
    }

    // ─── VIEW FUNCTIONS ──────────────────────────────────────────────────────

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getUserLoans(address user) external view returns (uint256[] memory) {
        return userLoans[user];
    }

    function getActiveLoan(address user) external view returns (uint256) {
        return activeLoanId[user];
    }

    function calculateRepaymentAmount(uint256 loanId) external view returns (uint256 principal, uint256 interest, uint256 total) {
        Loan memory loan = loans[loanId];
        principal = loan.amount;
        interest = (loan.amount * loan.interestRate * loan.durationDays) / BP_DIVISOR;
        total = principal + interest;
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw accumulated interest (owner only)
     */
    function withdrawInterest() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
