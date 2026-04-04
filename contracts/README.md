# DeFi Lending Protocol - Smart Contracts

Production-ready Solidity contracts for a share-based lending protocol on Base (EVM-compatible chain).

## 📋 Overview

This protocol consists of three core contracts:

1. **LendingPool.sol** - Share-based liquidity pool (ERC-4626 style)
2. **Reputation.sol** - Credit scoring system (0-1000)
3. **LoanManager.sol** - Loan lifecycle management

## 🏗️ Architecture

```
Frontend (Next.js + ethers.js)
         ↓
   LoanManager.sol
    ↙         ↘
LendingPool.sol  Reputation.sol
```

### Contract Interactions

- **LoanManager** is the only contract that can call `LendingPool.borrow()` and `LendingPool.repay()`
- **LoanManager** is the only contract that can update `Reputation` scores
- Users interact directly with **LendingPool** for deposits/withdrawals
- Users interact with **LoanManager** for borrowing/repaying

## 🧠 Core Logic

### LendingPool (Share-Based Accounting)

**CRITICAL RULES:**
- `totalLiquidity` = total deposits (NEVER changes on borrow/repay)
- `totalBorrowed` = active loans
- `availableLiquidity` = totalLiquidity - totalBorrowed

**Share Calculation:**
```solidity
// First deposit
shares = amount

// Subsequent deposits
shares = (amount * totalShares) / totalLiquidity

// Withdrawal
amount = (shares * totalLiquidity) / totalShares
```

### Reputation (Credit Scoring)

**Score Range:** 0-1000 (default: 500)

**Score Changes:**
- On-time repayment: +20
- Late repayment: +5
- Default: -75

**LTV Tiers:**
| Credit Score | LTV  | Tier      |
|--------------|------|-----------|
| > 800        | 85%  | Excellent |
| 600-800      | 75%  | Good      |
| < 600        | 60%  | Fair/Poor |

### LoanManager

**Interest Rate:** 0.024% per day (24 basis points)

**Loan Lifecycle:**
1. User requests loan → checks credit score → determines max LTV
2. Validates borrow amount ≤ (available liquidity × maxLTV)
3. Calls `LendingPool.borrow()` → transfers tokens to user
4. Updates `Reputation.recordLoan()`
5. User repays → calculates interest → transfers tokens back
6. Calls `LendingPool.repay()` → updates `Reputation.recordRepayment()`
7. If overdue → anyone can call `liquidate()` → marks default

## 🚀 Deployment

### Prerequisites

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts ethers
```

### Hardhat Setup

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    base: {
      url: "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY,
      baseSepolia: process.env.BASESCAN_API_KEY,
    },
  },
};
```

### Deploy to Base

```bash
# 1. Set environment variables
export PRIVATE_KEY="your-private-key"
export BASESCAN_API_KEY="your-basescan-api-key"

# 2. Deploy to Base Sepolia (testnet)
npx hardhat run contracts/deploy.js --network baseSepolia

# 3. Deploy to Base Mainnet
npx hardhat run contracts/deploy.js --network base
```

### Verify Contracts

```bash
npx hardhat verify --network base <LENDING_POOL_ADDRESS> <TOKEN_ADDRESS>
npx hardhat verify --network base <REPUTATION_ADDRESS>
npx hardhat verify --network base <LOAN_MANAGER_ADDRESS> <TOKEN_ADDRESS> <LENDING_POOL_ADDRESS> <REPUTATION_ADDRESS>
```

## 🔗 Integration with Next.js

### 1. Install Dependencies

```bash
cd frontend
npm install ethers
```

### 2. Add Contract Addresses to `.env.local`

```env
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### 3. Use Integration Functions

See `contracts/integration-example.ts` for complete examples.

```typescript
import { depositToPool, createLoan, repayLoan } from "@/contracts/integration-example";

// Deposit 100 USDC
await depositToPool("100");

// Borrow 50 USDC for 30 days
const { loanId } = await createLoan("50", 30);

// Repay loan
await repayLoan(loanId);
```

## 🧪 Testing

Create `test/LendingProtocol.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lending Protocol", function () {
  let lendingPool, reputation, loanManager, token;
  let owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20
    const MockToken = await ethers.getContractFactory("MockERC20");
    token = await MockToken.deploy("Mock USDC", "USDC", 6);

    // Deploy contracts
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(token.target);

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy();

    const LoanManager = await ethers.getContractFactory("LoanManager");
    loanManager = await LoanManager.deploy(token.target, lendingPool.target, reputation.target);

    // Configure
    await lendingPool.setLoanManager(loanManager.target);
    await reputation.setLoanManager(loanManager.target);

    // Mint tokens
    await token.mint(user1.address, ethers.parseUnits("1000", 6));
    await token.mint(user2.address, ethers.parseUnits("1000", 6));
  });

  it("Should deposit and mint shares", async function () {
    const amount = ethers.parseUnits("100", 6);
    await token.connect(user1).approve(lendingPool.target, amount);
    await lendingPool.connect(user1).deposit(amount);

    const shares = await lendingPool.shares(user1.address);
    expect(shares).to.equal(amount); // First deposit: shares = amount
  });

  it("Should create loan with credit check", async function () {
    // User1 deposits
    const depositAmount = ethers.parseUnits("1000", 6);
    await token.connect(user1).approve(lendingPool.target, depositAmount);
    await lendingPool.connect(user1).deposit(depositAmount);

    // User2 borrows
    const borrowAmount = ethers.parseUnits("100", 6);
    await loanManager.connect(user2).createLoan(borrowAmount, 30);

    const activeLoanId = await loanManager.getActiveLoan(user2.address);
    expect(activeLoanId).to.be.gt(0);
  });

  it("Should repay loan and update credit score", async function () {
    // Setup: deposit + borrow
    const depositAmount = ethers.parseUnits("1000", 6);
    await token.connect(user1).approve(lendingPool.target, depositAmount);
    await lendingPool.connect(user1).deposit(depositAmount);

    const borrowAmount = ethers.parseUnits("100", 6);
    await loanManager.connect(user2).createLoan(borrowAmount, 30);
    const loanId = await loanManager.getActiveLoan(user2.address);

    // Calculate repayment
    const [principal, interest, total] = await loanManager.calculateRepaymentAmount(loanId);

    // Repay
    await token.connect(user2).approve(loanManager.target, total);
    await loanManager.connect(user2).repayLoan(loanId);

    // Check credit score increased
    const score = await reputation.getCreditScore(user2.address);
    expect(score).to.be.gt(500); // Default score + on-time bonus
  });
});
```

Run tests:
```bash
npx hardhat test
```

## 🔒 Security Features

- **ReentrancyGuard** on all state-changing functions
- **SafeERC20** for token transfers
- **Ownable** for admin functions
- **Input validation** (zero checks, balance checks)
- **Access control** (onlyLoanManager modifiers)
- **Integer overflow protection** (Solidity 0.8+)

## 📊 Gas Optimization

- Immutable variables for addresses
- Efficient storage packing
- Minimal external calls
- No loops over unbounded arrays

## 🛠️ Maintenance

### Upgrade Strategy

Contracts are NOT upgradeable by design (trustless). To upgrade:
1. Deploy new contracts
2. Migrate liquidity (users withdraw from old, deposit to new)
3. Update frontend addresses

### Emergency Functions

- `LoanManager.withdrawInterest()` - Owner can withdraw accumulated interest
- `LoanManager.liquidate()` - Anyone can liquidate overdue loans

## 📚 Additional Resources

- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [ethers.js Documentation](https://docs.ethers.org/)

## 🎯 Next Steps

1. Deploy to Base Sepolia testnet
2. Test all functions with testnet USDC
3. Run security audit (Slither, Mythril)
4. Deploy to Base mainnet
5. Update frontend to use contract addresses
6. Replace Supabase calls with ethers.js calls

## 📝 License

MIT
