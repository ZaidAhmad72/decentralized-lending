/**
 * Deployment Script for DeFi Lending Protocol
 * 
 * Deploy order:
 * 1. LendingPool
 * 2. Reputation
 * 3. LoanManager
 * 4. Configure permissions
 * 
 * Usage (Hardhat):
 *   npx hardhat run contracts/deploy.js --network base
 * 
 * Usage (Foundry):
 *   forge script contracts/deploy.js --rpc-url $BASE_RPC_URL --broadcast
 */

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying DeFi Lending Protocol to Base...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ─── CONFIGURATION ─────────────────────────────────────────────────────────

  // USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  // For testnet, deploy a mock ERC20 or use testnet USDC
  const TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

  // ─── STEP 1: DEPLOY LENDING POOL ──────────────────────────────────────────

  console.log("📦 Deploying LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(TOKEN_ADDRESS);
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log("✅ LendingPool deployed at:", lendingPoolAddress, "\n");

  // ─── STEP 2: DEPLOY REPUTATION ────────────────────────────────────────────

  console.log("📦 Deploying Reputation...");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ Reputation deployed at:", reputationAddress, "\n");

  // ─── STEP 3: DEPLOY LOAN MANAGER ──────────────────────────────────────────

  console.log("📦 Deploying LoanManager...");
  const LoanManager = await ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    TOKEN_ADDRESS,
    lendingPoolAddress,
    reputationAddress
  );
  await loanManager.waitForDeployment();
  const loanManagerAddress = await loanManager.getAddress();
  console.log("✅ LoanManager deployed at:", loanManagerAddress, "\n");

  // ─── STEP 4: CONFIGURE PERMISSIONS ────────────────────────────────────────

  console.log("🔧 Configuring permissions...");

  // Set LoanManager in LendingPool
  console.log("Setting LoanManager in LendingPool...");
  const tx1 = await lendingPool.setLoanManager(loanManagerAddress);
  await tx1.wait();
  console.log("✅ LendingPool.setLoanManager() complete");

  // Set LoanManager in Reputation
  console.log("Setting LoanManager in Reputation...");
  const tx2 = await reputation.setLoanManager(loanManagerAddress);
  await tx2.wait();
  console.log("✅ Reputation.setLoanManager() complete\n");

  // ─── DEPLOYMENT SUMMARY ────────────────────────────────────────────────────

  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎉 DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Token (USDC):    ", TOKEN_ADDRESS);
  console.log("LendingPool:     ", lendingPoolAddress);
  console.log("Reputation:      ", reputationAddress);
  console.log("LoanManager:     ", loanManagerAddress);
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("📝 Save these addresses to your .env file:");
  console.log(`NEXT_PUBLIC_LENDING_POOL_ADDRESS=${lendingPoolAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_ADDRESS=${reputationAddress}`);
  console.log(`NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=${loanManagerAddress}`);
  console.log(`NEXT_PUBLIC_TOKEN_ADDRESS=${TOKEN_ADDRESS}\n`);

  // ─── VERIFICATION ──────────────────────────────────────────────────────────

  console.log("🔍 To verify contracts on Basescan:");
  console.log(`npx hardhat verify --network base ${lendingPoolAddress} ${TOKEN_ADDRESS}`);
  console.log(`npx hardhat verify --network base ${reputationAddress}`);
  console.log(`npx hardhat verify --network base ${loanManagerAddress} ${TOKEN_ADDRESS} ${lendingPoolAddress} ${reputationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
