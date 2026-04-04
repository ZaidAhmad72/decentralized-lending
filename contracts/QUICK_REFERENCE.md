# Quick Reference Card

## 🚀 Common Commands

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:sepolia

# Deploy to mainnet
npm run deploy:base

# Run tests
npm test

# Verify contract
npx hardhat verify --network base <ADDRESS> <CONSTRUCTOR_ARGS>

# Clean build artifacts
npm run clean
```

## 📝 Contract Addresses (Update After Deployment)

```env
# Base Mainnet
LENDING_POOL=0x...
REPUTATION=0x...
LOAN_MANAGER=0x...
TOKEN_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Base Sepolia Testnet
LENDING_POOL_TESTNET=0x...
REPUTATION_TESTNET=0x...
LOAN_MANAGER_TESTNET=0x...
```

## 🔗 Important Links

- **Base Mainnet RPC:** https://mainnet.base.org
- **Base Sepolia RPC:** https://sepolia.base.org
- **Basescan:** https://basescan.org
- **Sepolia Basescan:** https://sepolia.basescan.org
- **Base Faucet:** https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **USDC on Base:** 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

## 💻 Frontend Integration Snippets

### Setup Provider

```typescript
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

### Deposit to Pool

```typescript
const amount = ethers.parseUnits("100", 6); // 100 USDC

// 1. Approve
await token.approve(LENDING_POOL_ADDRESS, amount);

// 2. Deposit
const tx = await lendingPool.deposit(amount);
await tx.wait();
```

### Create Loan

```typescript
const amount = ethers.parseUnits("50", 6); // 50 USDC
const durationDays = 30;

const tx = await loanManager.createLoan(amount, durationDays);
const receipt = await tx.wait();
```

### Repay Loan

```typescript
const loanId = 1;

// 1. Get repayment amount
const [principal, interest, total] = await loanManager.calculateRepaymentAmount(loanId);

// 2. Approve
await token.approve(LOAN_MANAGER_ADDRESS, total);

// 3. Repay
const tx = await loanManager.repayLoan(loanId);
await tx.wait();
```

### Get Credit Score

```typescript
const score = await reputation.getCreditScore(userAddress);
const tier = await reputation.getCreditTier(userAddress);
const maxLTV = await reputation.getMaxLTV(userAddress);

console.log(`Score: ${score}, Tier: ${tier}, Max LTV: ${maxLTV / 100}%`);
```

## 📊 Contract Functions Quick Reference

### LendingPool

```solidity
// User functions
deposit(uint256 amount) → uint256 shares
withdraw(uint256 shares) → uint256 amount

// View functions
shares(address user) → uint256
getUserShareValue(address user) → uint256
getPoolStats() → (liquidity, borrowed, shares, available)
getAvailableLiquidity() → uint256

// Admin
setLoanManager(address manager)
```

### LoanManager

```solidity
// User functions
createLoan(uint256 amount, uint256 days) → uint256 loanId
repayLoan(uint256 loanId)

// Anyone can call
liquidate(uint256 loanId)

// View functions
getLoan(uint256 loanId) → Loan
getUserLoans(address user) → uint256[]
getActiveLoan(address user) → uint256
calculateRepaymentAmount(uint256 loanId) → (principal, interest, total)
isLoanOverdue(uint256 loanId) → bool

// Admin
withdrawInterest()
```

### Reputation

```solidity
// View functions (anyone can call)
getCreditScore(address user) → uint256
getMaxLTV(address user) → uint256
getCreditTier(address user) → string
getReputation(address user) → (score, loans, repayments, defaults, borrowed)

// Admin
setLoanManager(address manager)
```

## 🔢 Constants

```solidity
// Interest Rate
DAILY_RATE_BP = 24          // 0.024% per day
BP_DIVISOR = 1000000

// Credit Scoring
DEFAULT_SCORE = 500
MAX_SCORE = 1000
MIN_SCORE = 0
ON_TIME_BONUS = 20
LATE_BONUS = 5
DEFAULT_PENALTY = 75

// LTV Tiers
EXCELLENT_LTV = 8500        // 85% (score > 800)
GOOD_LTV = 7500             // 75% (score 600-800)
FAIR_LTV = 6000             // 60% (score < 600)
```

## 🧮 Calculations

### Share Calculation

```
First deposit:
  shares = amount

Subsequent deposits:
  shares = (amount × totalShares) / totalLiquidity

Withdrawal:
  amount = (shares × totalLiquidity) / totalShares
```

### Interest Calculation

```
interest = (amount × DAILY_RATE_BP × durationDays) / BP_DIVISOR
totalRepayment = principal + interest

Example:
  Borrow: 100 USDC for 30 days
  Interest: (100 × 24 × 30) / 1,000,000 = 0.072 USDC
  Repay: 100.072 USDC
```

### Credit Score Updates

```
On-time repayment:
  newScore = min(score + 20, 1000)

Late repayment:
  newScore = min(score + 5, 1000)

Default:
  newScore = max(score - 75, 0)
```

### Max Borrow Calculation

```
availableLiquidity = totalLiquidity - totalBorrowed
maxLTV = getMaxLTV(user)  // 60%, 75%, or 85%
maxBorrow = availableLiquidity × maxLTV
```

## 🐛 Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ZeroAmount()` | Amount is 0 | Use amount > 0 |
| `InsufficientShares()` | Not enough shares | Check shares balance |
| `InsufficientLiquidity()` | Pool has no liquidity | Wait for deposits |
| `ActiveLoanExists()` | User has active loan | Repay existing loan first |
| `BorrowLimitExceeded()` | Amount > max borrow | Reduce amount or improve credit |
| `InsufficientBalance()` | Not enough tokens | Get more tokens |
| `OnlyLoanManager()` | Unauthorized call | Only LoanManager can call |
| `LoanNotActive()` | Loan already repaid/defaulted | Check loan status |

## 📱 Testing Checklist

- [ ] Compile contracts without errors
- [ ] Deploy to testnet successfully
- [ ] Deposit tokens and receive shares
- [ ] Withdraw shares and receive tokens
- [ ] Create loan with credit check
- [ ] Repay loan on time (score +20)
- [ ] Repay loan late (score +5)
- [ ] Liquidate overdue loan (score -75)
- [ ] Verify credit score updates
- [ ] Check pool accounting (liquidity/borrowed)
- [ ] Test with multiple users
- [ ] Verify events emitted
- [ ] Check gas costs
- [ ] Verify contracts on Basescan

## 🎯 Gas Estimates (Base Mainnet)

| Operation | Gas | Cost @ 0.5 gwei | Cost @ 1 gwei |
|-----------|-----|-----------------|---------------|
| Deposit | ~100k | $0.02 | $0.04 |
| Withdraw | ~80k | $0.016 | $0.032 |
| Create Loan | ~150k | $0.03 | $0.06 |
| Repay Loan | ~120k | $0.024 | $0.048 |
| Liquidate | ~100k | $0.02 | $0.04 |

## 🔐 Security Checklist

- [x] ReentrancyGuard on all state-changing functions
- [x] SafeERC20 for token transfers
- [x] Input validation (zero checks)
- [x] Access control (onlyOwner, onlyLoanManager)
- [x] Integer overflow protection (Solidity 0.8+)
- [x] No loops over unbounded arrays
- [x] Events for all major actions
- [x] Custom errors (gas efficient)
- [ ] External audit (recommended for mainnet)
- [ ] Bug bounty program (recommended for mainnet)

## 📞 Support

- **Documentation:** See README.md, SETUP.md, ARCHITECTURE.md
- **Issues:** Check ARCHITECTURE.md for TypeScript → Solidity mapping
- **Base Docs:** https://docs.base.org/
- **OpenZeppelin:** https://docs.openzeppelin.com/contracts/
- **Hardhat:** https://hardhat.org/docs

---

**Quick Start:** `npm install` → `npm run compile` → `npm run deploy:sepolia` → Test → `npm run deploy:base` → Launch! 🚀
