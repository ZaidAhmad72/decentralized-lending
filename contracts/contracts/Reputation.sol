// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Reputation
 * @notice Credit scoring system for DeFi lending protocol
 * @dev Tracks user credit scores (0-1000) and loan history
 * 
 * SCORING RULES:
 * - Default score: 500
 * - On-time repayment: +20
 * - Late repayment: +5
 * - Default: -75
 * - Score clamped between 0 and 1000
 * 
 * LTV TIERS:
 * - Score > 800: 85% LTV (Excellent)
 * - Score 600-800: 75% LTV (Good)
 * - Score < 600: 60% LTV (Fair/Poor)
 */
contract Reputation is Ownable {

    // ─── STATE ───────────────────────────────────────────────────────────────

    address public loanManager; // Only LoanManager can update reputation

    struct UserReputation {
        uint256 creditScore;            // 0-1000
        uint256 totalLoans;             // Total loans taken
        uint256 successfulRepayments;   // Successful repayments
        uint256 defaults;               // Number of defaults
        uint256 totalBorrowedAmount;    // Lifetime borrowed amount
    }

    mapping(address => UserReputation) public reputation;

    // ─── CONSTANTS ───────────────────────────────────────────────────────────

    uint256 public constant DEFAULT_SCORE = 500;
    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant MIN_SCORE = 0;

    uint256 public constant ON_TIME_BONUS = 20;
    uint256 public constant LATE_BONUS = 5;
    uint256 public constant DEFAULT_PENALTY = 75;

    // LTV tiers (basis points: 8500 = 85%)
    uint256 public constant EXCELLENT_LTV = 8500; // > 800 score
    uint256 public constant GOOD_LTV = 7500;      // 600-800 score
    uint256 public constant FAIR_LTV = 6000;      // < 600 score

    // ─── EVENTS ──────────────────────────────────────────────────────────────
    
    event LoanRecorded(address indexed user, uint256 amount);
    event RepaymentRecorded(address indexed user, bool onTime, uint256 newScore);
    event DefaultRecorded(address indexed user, uint256 newScore);
    event LoanManagerUpdated(address indexed newManager);

    // ─── ERRORS ──────────────────────────────────────────────────────────────

    error OnlyLoanManager();
    error ZeroAddress();
    error ZeroAmount();

    // ─── MODIFIERS ───────────────────────────────────────────────────────────

    modifier onlyLoanManager() {
        if (msg.sender != loanManager) revert OnlyLoanManager();
        _;
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setLoanManager(address _loanManager) external onlyOwner {
        if (_loanManager == address(0)) revert ZeroAddress();
        loanManager = _loanManager;
        emit LoanManagerUpdated(_loanManager);
    }

    // ─── RECORD LOAN ─────────────────────────────────────────────────────────

    /**
     * @notice Record a new loan (called by LoanManager)
     * @param user Borrower address
     * @param amount Loan amount
     */
    function recordLoan(address user, uint256 amount) external onlyLoanManager {
        if (amount == 0) revert ZeroAmount();

        UserReputation storage rep = reputation[user];

        // Initialize credit score if first loan
        if (rep.totalLoans == 0) {
            rep.creditScore = DEFAULT_SCORE;
        }

        rep.totalLoans += 1;
        rep.totalBorrowedAmount += amount;

        emit LoanRecorded(user, amount);
    }

    // ─── RECORD REPAYMENT ────────────────────────────────────────────────────

    /**
     * @notice Record loan repayment (called by LoanManager)
     * @param user Borrower address
     * @param onTime Whether repayment was on time
     */
    function recordRepayment(address user, bool onTime) external onlyLoanManager {
        UserReputation storage rep = reputation[user];

        uint256 bonus = onTime ? ON_TIME_BONUS : LATE_BONUS;
        uint256 newScore = rep.creditScore + bonus;

        // Clamp to MAX_SCORE
        if (newScore > MAX_SCORE) {
            newScore = MAX_SCORE;
        }

        rep.creditScore = newScore;
        rep.successfulRepayments += 1;

        emit RepaymentRecorded(user, onTime, newScore);
    }

    // ─── RECORD DEFAULT ──────────────────────────────────────────────────────

    /**
     * @notice Record loan default (called by LoanManager)
     * @param user Borrower address
     */
    function recordDefault(address user) external onlyLoanManager {
        UserReputation storage rep = reputation[user];

        uint256 newScore;
        if (rep.creditScore > DEFAULT_PENALTY) {
            newScore = rep.creditScore - DEFAULT_PENALTY;
        } else {
            newScore = MIN_SCORE;
        }

        rep.creditScore = newScore;
        rep.defaults += 1;

        emit DefaultRecorded(user, newScore);
    }

    // ─── VIEW FUNCTIONS ──────────────────────────────────────────────────────

    /**
     * @notice Get user credit score
     * @param user User address
     * @return Credit score (0-1000)
     */
    function getCreditScore(address user) external view returns (uint256) {
        uint256 score = reputation[user].creditScore;
        // Return default score if user has no history
        return score == 0 && reputation[user].totalLoans == 0 ? DEFAULT_SCORE : score;
    }

    /**
     * @notice Get max LTV for user based on credit score
     * @param user User address
     * @return LTV in basis points (8500 = 85%)
     */
    function getMaxLTV(address user) external view returns (uint256) {
        uint256 score = this.getCreditScore(user);

        if (score > 800) return EXCELLENT_LTV; // 85%
        if (score >= 600) return GOOD_LTV;     // 75%
        return FAIR_LTV;                        // 60%
    }

    /**
     * @notice Get credit tier name
     * @param user User address
     * @return Tier name: "Excellent", "Good", "Fair", "Poor"
     */
    function getCreditTier(address user) external view returns (string memory) {
        uint256 score = this.getCreditScore(user);

        if (score > 800) return "Excellent";
        if (score >= 600) return "Good";
        if (score >= 400) return "Fair";
        return "Poor";
    }

    /**
     * @notice Get full reputation data
     * @param user User address
     */
    function getReputation(address user) external view returns (
        uint256 creditScore,
        uint256 totalLoans,
        uint256 successfulRepayments,
        uint256 defaults,
        uint256 totalBorrowedAmount
    ) {
        UserReputation memory rep = reputation[user];
        creditScore = rep.creditScore == 0 && rep.totalLoans == 0 ? DEFAULT_SCORE : rep.creditScore;
        return (
            creditScore,
            rep.totalLoans,
            rep.successfulRepayments,
            rep.defaults,
            rep.totalBorrowedAmount
        );
    }
}
