# Deployment Checklist

Use this checklist to track your deployment progress from development to mainnet launch.

## 📋 Pre-Deployment

### Environment Setup
- [ ] Node.js installed (v18+)
- [ ] npm/yarn installed
- [ ] Git installed
- [ ] MetaMask or hardware wallet ready
- [ ] Wallet has ETH on Base Sepolia (for testnet)
- [ ] Wallet has ETH on Base Mainnet (for production)

### Project Setup
- [ ] `cd contracts`
- [ ] `npm install` completed successfully
- [ ] `.env` file created with PRIVATE_KEY
- [ ] `.env` file created with BASESCAN_API_KEY
- [ ] `.env` added to `.gitignore`

### Code Review
- [ ] Read `LendingPool.sol` - understand share logic
- [ ] Read `Reputation.sol` - understand credit scoring
- [ ] Read `LoanManager.sol` - understand loan lifecycle
- [ ] Reviewed all constants (interest rate, LTV tiers, etc.)
- [ ] Confirmed token address (USDC on Base)

## 🧪 Testing Phase

### Compilation
- [ ] `npm run compile` runs without errors
- [ ] No compiler warnings
- [ ] Artifacts generated in `artifacts/` folder

### Local Testing (Optional)
- [ ] Created test file `test/LendingProtocol.test.js`
- [ ] Tests pass: `npm test`
- [ ] Deposit test passes
- [ ] Withdraw test passes
- [ ] Borrow test passes
- [ ] Repay test passes
- [ ] Credit score test passes
- [ ] Liquidation test passes

### Static Analysis (Recommended)
- [ ] Installed Slither: `pip install slither-analyzer`
- [ ] Run Slither: `slither contracts/`
- [ ] Reviewed and addressed critical issues
- [ ] Reviewed and addressed high issues
- [ ] Documented medium/low issues

## 🚀 Testnet Deployment (Base Sepolia)

### Pre-Deployment
- [ ] Wallet has Sepolia ETH (get from faucet)
- [ ] Confirmed network: Base Sepolia (Chain ID: 84532)
- [ ] Reviewed `deploy.js` script
- [ ] Confirmed token address for testnet

### Deployment
- [ ] Run: `npm run deploy:sepolia`
- [ ] Deployment successful
- [ ] LendingPool address saved: `___________________`
- [ ] Reputation address saved: `___________________`
- [ ] LoanManager address saved: `___________________`
- [ ] Transaction hashes saved
- [ ] Added addresses to `frontend/.env.local`

### Verification
- [ ] Verify LendingPool: `npx hardhat verify --network baseSepolia <ADDRESS> <TOKEN>`
- [ ] Verify Reputation: `npx hardhat verify --network baseSepolia <ADDRESS>`
- [ ] Verify LoanManager: `npx hardhat verify --network baseSepolia <ADDRESS> <TOKEN> <POOL> <REP>`
- [ ] All contracts verified on Basescan Sepolia
- [ ] Source code visible on Basescan

### Manual Testing on Testnet
- [ ] Get testnet USDC (or deploy mock token)
- [ ] Connect MetaMask to Base Sepolia
- [ ] Test 1: Deposit 100 USDC
  - [ ] Approve transaction confirmed
  - [ ] Deposit transaction confirmed
  - [ ] Shares received correctly
  - [ ] Event emitted: `Deposited`
- [ ] Test 2: Create loan for 50 USDC, 30 days
  - [ ] Transaction confirmed
  - [ ] Tokens received in wallet
  - [ ] Loan created with correct ID
  - [ ] Event emitted: `LoanCreated`
  - [ ] Credit score unchanged (still 500)
- [ ] Test 3: Repay loan on time
  - [ ] Calculated repayment amount correct
  - [ ] Approve transaction confirmed
  - [ ] Repay transaction confirmed
  - [ ] Loan status changed to "Repaid"
  - [ ] Event emitted: `LoanRepaid`
  - [ ] Credit score increased to 520 (+20)
- [ ] Test 4: Withdraw shares
  - [ ] Withdraw transaction confirmed
  - [ ] Tokens received in wallet
  - [ ] Shares burned correctly
  - [ ] Event emitted: `Withdrawn`
- [ ] Test 5: Create overdue loan (optional)
  - [ ] Create loan
  - [ ] Wait past due date (or manipulate time in test)
  - [ ] Call liquidate()
  - [ ] Loan status changed to "Defaulted"
  - [ ] Credit score decreased by 75
  - [ ] Event emitted: `LoanDefaulted`

### Pool Accounting Verification
- [ ] Check `totalLiquidity` matches deposits
- [ ] Check `totalBorrowed` matches active loans
- [ ] Check `totalShares` matches minted shares
- [ ] Check `availableLiquidity = totalLiquidity - totalBorrowed`
- [ ] Verify no accounting errors after multiple operations

### Multi-User Testing
- [ ] Create second test wallet
- [ ] User A deposits, User B borrows
- [ ] User B repays, User A withdraws
- [ ] Verify share values correct for both users
- [ ] Verify credit scores independent

### Gas Cost Analysis
- [ ] Record gas used for deposit: `_______` gas
- [ ] Record gas used for withdraw: `_______` gas
- [ ] Record gas used for borrow: `_______` gas
- [ ] Record gas used for repay: `_______` gas
- [ ] Record gas used for liquidate: `_______` gas
- [ ] Calculate costs at current gas price
- [ ] Confirm costs are acceptable

### Frontend Integration Testing
- [ ] Copy `integration-example.ts` to `frontend/services/contractService.ts`
- [ ] Update contract addresses in `.env.local`
- [ ] Test deposit from frontend
- [ ] Test borrow from frontend
- [ ] Test repay from frontend
- [ ] Test credit score display
- [ ] Test pool stats display
- [ ] Test transaction status (pending/confirmed)
- [ ] Test error handling

## 🔒 Security Audit

### Automated Tools
- [ ] Slither analysis complete
- [ ] Mythril analysis: `myth analyze contracts/LendingPool.sol`
- [ ] Mythril analysis: `myth analyze contracts/Reputation.sol`
- [ ] Mythril analysis: `myth analyze contracts/LoanManager.sol`
- [ ] All critical issues resolved
- [ ] All high issues resolved
- [ ] Medium/low issues documented

### Manual Review
- [ ] Reentrancy protection verified
- [ ] Integer overflow/underflow checked
- [ ] Access control verified
- [ ] Input validation checked
- [ ] External call safety verified
- [ ] Event emission verified
- [ ] Gas optimization reviewed

### Professional Audit (Recommended for Mainnet)
- [ ] Contacted audit firm (optional)
- [ ] Audit report received
- [ ] Issues addressed
- [ ] Final audit approval

## 🎯 Mainnet Deployment (Base)

### Pre-Deployment
- [ ] All testnet tests passed
- [ ] Security audit complete
- [ ] Team review complete
- [ ] Wallet has sufficient ETH for deployment (~0.01 ETH)
- [ ] Confirmed network: Base Mainnet (Chain ID: 8453)
- [ ] Confirmed token address: USDC on Base
- [ ] Backup of private key stored securely
- [ ] Emergency response plan documented

### Deployment
- [ ] Final code review
- [ ] Run: `npm run deploy:base`
- [ ] Deployment successful
- [ ] LendingPool address saved: `___________________`
- [ ] Reputation address saved: `___________________`
- [ ] LoanManager address saved: `___________________`
- [ ] Transaction hashes saved
- [ ] Deployment cost recorded: `_______` ETH
- [ ] Added addresses to `frontend/.env.local` (production)

### Verification
- [ ] Verify LendingPool on Basescan
- [ ] Verify Reputation on Basescan
- [ ] Verify LoanManager on Basescan
- [ ] All contracts verified
- [ ] Source code visible on Basescan

### Initial Testing on Mainnet
- [ ] Small deposit test (e.g., 10 USDC)
- [ ] Small borrow test (e.g., 5 USDC)
- [ ] Repay test
- [ ] Withdraw test
- [ ] All functions working correctly

## 📢 Launch

### Documentation
- [ ] Update README with mainnet addresses
- [ ] Create user guide
- [ ] Create FAQ
- [ ] Document known issues/limitations
- [ ] Create troubleshooting guide

### Frontend
- [ ] Update contract addresses to mainnet
- [ ] Test all pages with mainnet contracts
- [ ] Add network detection (warn if not on Base)
- [ ] Add transaction status indicators
- [ ] Add error messages for common issues
- [ ] Test on mobile devices
- [ ] Test on different browsers

### Monitoring
- [ ] Set up Basescan alerts for contract
- [ ] Monitor first transactions
- [ ] Set up analytics dashboard
- [ ] Create incident response plan
- [ ] Document emergency procedures

### Communication
- [ ] Announce launch on social media
- [ ] Share contract addresses publicly
- [ ] Create demo video
- [ ] Write launch blog post
- [ ] Notify early users

## 📊 Post-Launch

### Week 1
- [ ] Monitor all transactions daily
- [ ] Check for any errors or reverts
- [ ] Gather user feedback
- [ ] Track gas costs
- [ ] Monitor pool liquidity
- [ ] Track credit score distribution

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Identify optimization opportunities
- [ ] Plan feature updates
- [ ] Consider bug bounty program
- [ ] Evaluate need for upgrades

### Ongoing
- [ ] Regular security reviews
- [ ] Monitor for new vulnerabilities
- [ ] Track protocol metrics
- [ ] Engage with community
- [ ] Plan future improvements

## 🚨 Emergency Procedures

### If Critical Bug Found
- [ ] Pause new deposits (if pause function exists)
- [ ] Notify users immediately
- [ ] Assess impact
- [ ] Develop fix
- [ ] Deploy new version
- [ ] Migrate users if needed

### If Exploit Detected
- [ ] Contact security team immediately
- [ ] Pause contracts if possible
- [ ] Analyze exploit
- [ ] Notify affected users
- [ ] Work with auditors on fix
- [ ] Post-mortem report

## ✅ Completion

- [ ] All checklist items completed
- [ ] Protocol live on Base mainnet
- [ ] Users successfully using the protocol
- [ ] No critical issues detected
- [ ] Monitoring systems in place
- [ ] Documentation complete

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Network:** Base Mainnet (Chain ID: 8453)
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
