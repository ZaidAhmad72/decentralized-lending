# Quick Setup Guide

## 🚀 Deploy Smart Contracts to Base

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Configure Environment

Create `.env` file in `contracts/` directory:

```env
# Your wallet private key (NEVER commit this!)
PRIVATE_KEY=your_private_key_here

# Basescan API key for contract verification
BASESCAN_API_KEY=your_basescan_api_key
```

### Step 3: Compile Contracts

```bash
npm run compile
```

This will create `artifacts/` and `cache/` directories with compiled contracts.

### Step 4: Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:sepolia
```

**Expected Output:**
```
🚀 Deploying DeFi Lending Protocol to Base...

Deployer address: 0x...
Deployer balance: 0.5 ETH

📦 Deploying LendingPool...
✅ LendingPool deployed at: 0x...

📦 Deploying Reputation...
✅ Reputation deployed at: 0x...

📦 Deploying LoanManager...
✅ LoanManager deployed at: 0x...

🔧 Configuring permissions...
✅ LendingPool.setLoanManager() complete
✅ Reputation.setLoanManager() complete

═══════════════════════════════════════════════════════════
🎉 DEPLOYMENT COMPLETE
═══════════════════════════════════════════════════════════
Token (USDC):     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
LendingPool:      0x...
Reputation:       0x...
LoanManager:      0x...
═══════════════════════════════════════════════════════════
```

### Step 5: Save Contract Addresses

Copy the addresses to `frontend/.env.local`:

```env
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_ADDRESS=0x...
NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### Step 6: Verify Contracts (Optional)

```bash
npx hardhat verify --network baseSepolia <LENDING_POOL_ADDRESS> <TOKEN_ADDRESS>
npx hardhat verify --network baseSepolia <REPUTATION_ADDRESS>
npx hardhat verify --network baseSepolia <LOAN_MANAGER_ADDRESS> <TOKEN_ADDRESS> <LENDING_POOL_ADDRESS> <REPUTATION_ADDRESS>
```

### Step 7: Deploy to Base Mainnet

Once tested on Sepolia:

```bash
npm run deploy:base
```

## 🔗 Integrate with Frontend

### Option 1: Use Integration Helper (Recommended)

Copy `integration-example.ts` to `frontend/services/contractService.ts` and use the helper functions:

```typescript
import { depositToPool, createLoan, repayLoan } from "@/services/contractService";

// In your component
const handleDeposit = async () => {
  const txHash = await depositToPool("100"); // 100 USDC
  console.log("Deposit tx:", txHash);
};
```

### Option 2: Direct Contract Calls

```typescript
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const lendingPool = new ethers.Contract(
  process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS,
  LENDING_POOL_ABI,
  signer
);

const tx = await lendingPool.deposit(ethers.parseUnits("100", 6));
await tx.wait();
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test
```

### Manual Testing on Testnet

1. Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Get testnet USDC (deploy mock or use faucet)
3. Test deposit → borrow → repay flow
4. Verify credit score updates
5. Test liquidation for overdue loans

## 📊 Monitor Contracts

- **Basescan (Mainnet):** https://basescan.org/
- **Basescan (Sepolia):** https://sepolia.basescan.org/

Search for your contract addresses to view:
- Transactions
- Events
- Contract state
- Verified source code

## 🐛 Troubleshooting

### "Insufficient funds for gas"
- Ensure your wallet has ETH on Base network
- Get testnet ETH from faucet for Sepolia

### "Contract not deployed"
- Check you're on the correct network (Base/Sepolia)
- Verify contract addresses in `.env.local`

### "Transaction reverted"
- Check error message in Basescan
- Common issues:
  - Insufficient token balance
  - Missing approval
  - Borrow limit exceeded
  - Active loan already exists

### "Cannot read properties of undefined"
- Ensure MetaMask is installed and connected
- Check wallet is on Base network
- Verify contract addresses are set

## 🔄 Migration from Supabase

To fully migrate from Supabase to smart contracts:

1. **Deploy contracts** (Steps 1-5 above)
2. **Update service files:**
   - Replace `poolService.ts` calls with `LendingPool` contract calls
   - Replace `loanService.ts` calls with `LoanManager` contract calls
   - Replace `reputationService.ts` calls with `Reputation` contract calls
3. **Update UI components:**
   - Add wallet connection (MetaMask/WalletConnect)
   - Replace Supabase auth with wallet auth
   - Update transaction flows to show pending/confirmed states
4. **Remove Supabase dependencies:**
   - Keep Supabase for user profiles/metadata (optional)
   - Or migrate to decentralized storage (IPFS, Ceramic)

## 📚 Next Steps

1. ✅ Deploy to Base Sepolia
2. ✅ Test all functions
3. ✅ Verify contracts on Basescan
4. ✅ Update frontend integration
5. ✅ Run security audit
6. ✅ Deploy to Base Mainnet
7. ✅ Launch! 🚀
