/**
 * Integration Example: Next.js Frontend → Base Smart Contracts
 * 
 * This file shows how to integrate the deployed contracts into your Next.js app.
 * Replace the existing Supabase service calls with ethers.js contract calls.
 */

import { ethers } from "ethers";

// ─── CONTRACT ADDRESSES (from deployment) ────────────────────────────────────

const LENDING_POOL_ADDRESS = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS!;
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS!;
const LOAN_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_LOAN_MANAGER_ADDRESS!;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS!; // USDC on Base

// ─── ABIs (simplified - use full ABIs from compiled contracts) ───────────────

const LENDING_POOL_ABI = [
  "function deposit(uint256 amount) external returns (uint256)",
  "function withdraw(uint256 shares) external returns (uint256)",
  "function shares(address user) external view returns (uint256)",
  "function getUserShareValue(address user) external view returns (uint256)",
  "function getPoolStats() external view returns (uint256, uint256, uint256, uint256)",
  "function getAvailableLiquidity() external view returns (uint256)",
];

const REPUTATION_ABI = [
  "function getCreditScore(address user) external view returns (uint256)",
  "function getMaxLTV(address user) external view returns (uint256)",
  "function getCreditTier(address user) external view returns (string)",
  "function getReputation(address user) external view returns (uint256, uint256, uint256, uint256, uint256)",
];

const LOAN_MANAGER_ABI = [
  "function createLoan(uint256 amount, uint256 durationDays) external returns (uint256)",
  "function repayLoan(uint256 loanId) external",
  "function liquidate(uint256 loanId) external",
  "function getLoan(uint256 loanId) external view returns (tuple(address borrower, uint256 amount, uint256 durationDays, uint256 interestRate, uint256 createdAt, uint256 dueDate, uint8 status))",
  "function getUserLoans(address user) external view returns (uint256[])",
  "function getActiveLoan(address user) external view returns (uint256)",
  "function calculateRepaymentAmount(uint256 loanId) external view returns (uint256, uint256, uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// ─── SETUP PROVIDER & SIGNER ──────────────────────────────────────────────────

async function getContracts() {
  // Use MetaMask or other wallet provider
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const lendingPool = new ethers.Contract(LENDING_POOL_ADDRESS, LENDING_POOL_ABI, signer);
  const reputation = new ethers.Contract(REPUTATION_ADDRESS, REPUTATION_ABI, signer);
  const loanManager = new ethers.Contract(LOAN_MANAGER_ADDRESS, LOAN_MANAGER_ABI, signer);
  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

  return { lendingPool, reputation, loanManager, token, signer };
}

// ─── EXAMPLE 1: DEPOSIT TO POOL ───────────────────────────────────────────────

export async function depositToPool(amountInUSDC: string) {
  const { lendingPool, token, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  // Convert to token decimals (USDC = 6 decimals)
  const amount = ethers.parseUnits(amountInUSDC, 6);

  // 1. Check balance
  const balance = await token.balanceOf(userAddress);
  if (balance < amount) {
    throw new Error(`Insufficient balance. Have: ${ethers.formatUnits(balance, 6)} USDC`);
  }

  // 2. Approve LendingPool to spend tokens
  const allowance = await token.allowance(userAddress, LENDING_POOL_ADDRESS);
  if (allowance < amount) {
    console.log("Approving LendingPool...");
    const approveTx = await token.approve(LENDING_POOL_ADDRESS, amount);
    await approveTx.wait();
    console.log("✅ Approval complete");
  }

  // 3. Deposit
  console.log("Depositing to pool...");
  const tx = await lendingPool.deposit(amount);
  const receipt = await tx.wait();
  console.log("✅ Deposit complete. Tx:", receipt.hash);

  return receipt.hash;
}

// ─── EXAMPLE 2: WITHDRAW FROM POOL ────────────────────────────────────────────

export async function withdrawFromPool(sharesToBurn: string) {
  const { lendingPool } = await getContracts();

  const shares = ethers.parseUnits(sharesToBurn, 6);

  console.log("Withdrawing from pool...");
  const tx = await lendingPool.withdraw(shares);
  const receipt = await tx.wait();
  console.log("✅ Withdrawal complete. Tx:", receipt.hash);

  return receipt.hash;
}

// ─── EXAMPLE 3: GET POOL STATS ────────────────────────────────────────────────

export async function getPoolStats() {
  const { lendingPool } = await getContracts();

  const [totalLiquidity, totalBorrowed, totalShares, availableLiquidity] = 
    await lendingPool.getPoolStats();

  return {
    totalLiquidity: ethers.formatUnits(totalLiquidity, 6),
    totalBorrowed: ethers.formatUnits(totalBorrowed, 6),
    totalShares: ethers.formatUnits(totalShares, 6),
    availableLiquidity: ethers.formatUnits(availableLiquidity, 6),
  };
}

// ─── EXAMPLE 4: GET USER CREDIT SCORE ─────────────────────────────────────────

export async function getUserCreditScore() {
  const { reputation, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  const score = await reputation.getCreditScore(userAddress);
  const tier = await reputation.getCreditTier(userAddress);
  const maxLTV = await reputation.getMaxLTV(userAddress);

  return {
    creditScore: Number(score),
    tier,
    maxLTV: Number(maxLTV) / 100, // Convert basis points to percentage
  };
}

// ─── EXAMPLE 5: CREATE LOAN ───────────────────────────────────────────────────

export async function createLoan(amountInUSDC: string, durationDays: number) {
  const { loanManager } = await getContracts();

  const amount = ethers.parseUnits(amountInUSDC, 6);

  console.log("Creating loan...");
  const tx = await loanManager.createLoan(amount, durationDays);
  const receipt = await tx.wait();
  console.log("✅ Loan created. Tx:", receipt.hash);

  // Extract loanId from event
  const event = receipt.logs.find((log: any) => log.eventName === "LoanCreated");
  const loanId = event?.args?.loanId;

  return { txHash: receipt.hash, loanId: loanId?.toString() };
}

// ─── EXAMPLE 6: REPAY LOAN ────────────────────────────────────────────────────

export async function repayLoan(loanId: string) {
  const { loanManager, token, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  // 1. Calculate repayment amount
  const [principal, interest, total] = await loanManager.calculateRepaymentAmount(loanId);

  console.log(`Repayment: ${ethers.formatUnits(total, 6)} USDC (Principal: ${ethers.formatUnits(principal, 6)}, Interest: ${ethers.formatUnits(interest, 6)})`);

  // 2. Check balance
  const balance = await token.balanceOf(userAddress);
  if (balance < total) {
    throw new Error(`Insufficient balance. Need: ${ethers.formatUnits(total, 6)} USDC`);
  }

  // 3. Approve LoanManager
  const allowance = await token.allowance(userAddress, LOAN_MANAGER_ADDRESS);
  if (allowance < total) {
    console.log("Approving LoanManager...");
    const approveTx = await token.approve(LOAN_MANAGER_ADDRESS, total);
    await approveTx.wait();
    console.log("✅ Approval complete");
  }

  // 4. Repay
  console.log("Repaying loan...");
  const tx = await loanManager.repayLoan(loanId);
  const receipt = await tx.wait();
  console.log("✅ Loan repaid. Tx:", receipt.hash);

  return receipt.hash;
}

// ─── EXAMPLE 7: GET USER LOANS ────────────────────────────────────────────────

export async function getUserLoans() {
  const { loanManager, signer } = await getContracts();
  const userAddress = await signer.getAddress();

  const loanIds = await loanManager.getUserLoans(userAddress);

  const loans = await Promise.all(
    loanIds.map(async (id: bigint) => {
      const loan = await loanManager.getLoan(id);
      return {
        id: id.toString(),
        borrower: loan.borrower,
        amount: ethers.formatUnits(loan.amount, 6),
        durationDays: Number(loan.durationDays),
        interestRate: Number(loan.interestRate),
        createdAt: new Date(Number(loan.createdAt) * 1000),
        dueDate: new Date(Number(loan.dueDate) * 1000),
        status: ["Active", "Repaid", "Defaulted"][loan.status],
      };
    })
  );

  return loans;
}

// ─── EXAMPLE 8: LIQUIDATE OVERDUE LOAN ────────────────────────────────────────

export async function liquidateLoan(loanId: string) {
  const { loanManager } = await getContracts();

  console.log("Liquidating loan...");
  const tx = await loanManager.liquidate(loanId);
  const receipt = await tx.wait();
  console.log("✅ Loan liquidated. Tx:", receipt.hash);

  return receipt.hash;
}

// ─── USAGE IN NEXT.JS COMPONENTS ──────────────────────────────────────────────

/*
// Example: Deposit Page

import { depositToPool, getPoolStats } from "@/contracts/integration-example";

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    try {
      setLoading(true);
      const txHash = await depositToPool(amount);
      toast.success(`Deposit successful! Tx: ${txHash}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button onClick={handleDeposit} disabled={loading}>
        {loading ? "Processing..." : "Deposit"}
      </button>
    </div>
  );
}
*/
