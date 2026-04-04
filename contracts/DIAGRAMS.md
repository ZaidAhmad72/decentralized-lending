# System Diagrams

## 🏗️ Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    (Next.js + ethers.js)                     │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │  LendingPool    │          │  LoanManager   │
    │                 │◄─────────┤                │
    │  - deposit()    │  borrow()│  - createLoan()│
    │  - withdraw()   │  repay() │  - repayLoan() │
    │  - shares       │          │  - liquidate() │
    └─────────────────┘          └───────┬────────┘
                                         │
                                         │
                                  ┌──────▼──────┐
                                  │  Reputation │
                                  │             │
                                  │  - record*()│
                                  │  - getScore │
                                  └─────────────┘
```

## 🔄 Deposit Flow

```
User                LendingPool              Token (USDC)
 │                       │                        │
 │  1. approve()         │                        │
 ├──────────────────────────────────────────────►│
 │                       │                        │
 │  2. deposit(100)      │                        │
 ├──────────────────────►│                        │
 │                       │  3. transferFrom()     │
 │                       ├───────────────────────►│
 │                       │                        │
 │                       │  4. Calculate shares   │
 │                       │     shares = 100       │
 │                       │                        │
 │                       │  5. Update state       │
 │                       │     totalLiquidity += 100
 │                       │     totalShares += 100
 │                       │     shares[user] += 100
 │                       │                        │
 │  6. emit Deposited    │                        │
 │◄──────────────────────┤                        │
 │                       │                        │
```

## 💸 Borrow Flow

```
User            LoanManager         LendingPool      Reputation
 │                   │                   │                │
 │  1. createLoan()  │                   │                │
 ├──────────────────►│                   │                │
 │                   │  2. getCreditScore│                │
 │                   ├──────────────────────────────────►│
 │                   │◄──────────────────────────────────┤
 │                   │     score = 500                    │
 │                   │                   │                │
 │                   │  3. Calculate maxLTV               │
 │                   │     maxLTV = 75% (score 500)       │
 │                   │                   │                │
 │                   │  4. Validate amount                │
 │                   │     amount ≤ available × maxLTV    │
 │                   │                   │                │
 │                   │  5. borrow(50)    │                │
 │                   ├──────────────────►│                │
 │                   │                   │  Update:       │
 │                   │                   │  totalBorrowed += 50
 │                   │◄──────────────────┤                │
 │                   │                   │                │
 │                   │  6. transfer(50)  │                │
 │◄──────────────────┤                   │                │
 │                   │                   │                │
 │                   │  7. recordLoan()  │                │
 │                   ├──────────────────────────────────►│
 │                   │                   │  totalLoans++  │
 │                   │◄──────────────────────────────────┤
 │                   │                   │                │
 │  8. emit LoanCreated                  │                │
 │◄──────────────────┤                   │                │
 │                   │                   │                │
```

## 🔁 Repay Flow

```
User            LoanManager         LendingPool      Reputation
 │                   │                   │                │
 │  1. approve()     │                   │                │
 ├──────────────────►│                   │                │
 │                   │                   │                │
 │  2. repayLoan()   │                   │                │
 ├──────────────────►│                   │                │
 │                   │  3. Calculate repayment            │
 │                   │     total = 50 + 0.036 = 50.036    │
 │                   │                   │                │
 │                   │  4. transferFrom(50.036)           │
 │◄──────────────────┤                   │                │
 │                   │                   │                │
 │                   │  5. repay(50)     │                │
 │                   ├──────────────────►│                │
 │                   │                   │  Update:       │
 │                   │                   │  totalBorrowed -= 50
 │                   │◄──────────────────┤                │
 │                   │                   │                │
 │                   │  6. recordRepayment(true)          │
 │                   ├──────────────────────────────────►│
 │                   │                   │  score += 20   │
 │                   │◄──────────────────────────────────┤
 │                   │                   │                │
 │  7. emit LoanRepaid                   │                │
 │◄──────────────────┤                   │                │
 │                   │                   │                │
```

## 📊 State Transitions

### Loan Status

```
        createLoan()
┌──────────────────────┐
│                      │
│      No Loan         │
│                      │
└──────────┬───────────┘
           │
           │
           ▼
┌──────────────────────┐
│                      │
│   Active Loan        │◄──────┐
│                      │       │
└──────┬───────────────┘       │
       │                       │
       │ repayLoan()           │ liquidate()
       │                       │
       ▼                       │
┌──────────────────────┐       │
│                      │       │
│   Loan Repaid        │       │
│                      │       │
└──────────────────────┘       │
                               │
                               ▼
                    ┌──────────────────────┐
                    │                      │
                    │   Loan Defaulted     │
                    │                      │
                    └──────────────────────┘
```

### Credit Score Progression

```
Score
1000 ┤                                    ┌─────
     │                                ┌───┘
 800 ┤                            ┌───┘        Excellent
     │                        ┌───┘            (85% LTV)
 600 ┤                    ┌───┘                Good
     │                ┌───┘                    (75% LTV)
 500 ┤────────────────┘ (Default)
     │            ┌───┘                        Fair
 400 ┤        ┌───┘                            (60% LTV)
     │    ┌───┘
   0 ┤────┘                                    Poor
     └────────────────────────────────────────► Time
        Default  Late   On-time  On-time
                 +5     +20      +20
```

## 🔐 Access Control

```
┌─────────────────────────────────────────────────────────┐
│                      LendingPool                         │
├─────────────────────────────────────────────────────────┤
│  Public Functions:                                       │
│    ✓ deposit()         - Anyone can deposit             │
│    ✓ withdraw()        - Anyone can withdraw own shares │
│                                                          │
│  Restricted Functions:                                   │
│    ⚠ borrow()          - Only LoanManager               │
│    ⚠ repay()           - Only LoanManager               │
│    ⚠ setLoanManager()  - Only Owner                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      LoanManager                         │
├─────────────────────────────────────────────────────────┤
│  Public Functions:                                       │
│    ✓ createLoan()      - Anyone can borrow              │
│    ✓ repayLoan()       - Borrower only                  │
│    ✓ liquidate()       - Anyone (if overdue)            │
│                                                          │
│  Restricted Functions:                                   │
│    ⚠ withdrawInterest() - Only Owner                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Reputation                          │
├─────────────────────────────────────────────────────────┤
│  Public Functions:                                       │
│    ✓ getCreditScore()  - Anyone can read               │
│    ✓ getMaxLTV()       - Anyone can read               │
│    ✓ getCreditTier()   - Anyone can read               │
│                                                          │
│  Restricted Functions:                                   │
│    ⚠ recordLoan()      - Only LoanManager               │
│    ⚠ recordRepayment() - Only LoanManager               │
│    ⚠ recordDefault()   - Only LoanManager               │
│    ⚠ setLoanManager()  - Only Owner                     │
└─────────────────────────────────────────────────────────┘
```

## 💰 Pool Accounting

```
Pool State:
┌─────────────────────────────────────────┐
│  totalLiquidity = 1000 USDC             │  ◄── NEVER changes on borrow/repay
│  totalBorrowed  = 300 USDC              │  ◄── Changes on borrow/repay
│  totalShares    = 1000                  │
│  availableLiquidity = 700 USDC          │  ◄── Calculated: total - borrowed
└─────────────────────────────────────────┘

Operations:
┌─────────────┬──────────────┬──────────────┬──────────────┐
│  Operation  │ totalLiquidity│ totalBorrowed│ totalShares  │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ Initial     │     0        │     0        │     0        │
│ Deposit 500 │   +500       │     0        │   +500       │
│ Deposit 500 │   +500       │     0        │   +500       │
│ Borrow 300  │     0        │   +300       │     0        │
│ Repay 300   │     0        │   -300       │     0        │
│ Withdraw 250│   -250       │     0        │   -250       │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

## 🎯 Share Calculation Example

```
Scenario: Multiple deposits

Initial State:
  totalLiquidity = 0
  totalShares = 0

User A deposits 100 USDC:
  shares = 100 (first deposit)
  totalLiquidity = 100
  totalShares = 100

User B deposits 100 USDC:
  shares = (100 × 100) / 100 = 100
  totalLiquidity = 200
  totalShares = 200

User C deposits 50 USDC:
  shares = (50 × 200) / 200 = 50
  totalLiquidity = 250
  totalShares = 250

User A withdraws 50 shares:
  amount = (50 × 250) / 250 = 50 USDC
  totalLiquidity = 200
  totalShares = 200

Final State:
┌──────┬────────┬──────────────┐
│ User │ Shares │ Value (USDC) │
├──────┼────────┼──────────────┤
│  A   │   50   │     50       │
│  B   │  100   │    100       │
│  C   │   50   │     50       │
├──────┼────────┼──────────────┤
│Total │  200   │    200       │
└──────┴────────┴──────────────┘
```

## 🔄 Credit Score Lifecycle

```
New User
   │
   │ (Default score: 500)
   │
   ▼
┌──────────────┐
│  Score: 500  │
│  Tier: Good  │
│  LTV: 75%    │
└──────┬───────┘
       │
       │ Takes loan
       │
       ▼
┌──────────────┐
│  Score: 500  │  ◄── No change on loan creation
│  Loans: 1    │
└──────┬───────┘
       │
       │ Repays on time
       │
       ▼
┌──────────────┐
│  Score: 520  │  ◄── +20 for on-time
│  Repays: 1   │
└──────┬───────┘
       │
       │ 15 more on-time repayments
       │
       ▼
┌──────────────┐
│  Score: 820  │  ◄── Excellent tier!
│  Tier: Excellent
│  LTV: 85%    │
└──────────────┘
```

## 🚨 Liquidation Flow

```
Time ──────────────────────────────────────────────►

Loan Created          Due Date         Liquidation
     │                   │                  │
     │                   │                  │
     ▼                   ▼                  ▼
┌─────────┐        ┌─────────┐        ┌─────────┐
│ Active  │───────►│ Overdue │───────►│Defaulted│
│         │        │         │        │         │
│ Day 0   │        │ Day 30  │        │ Day 31+ │
└─────────┘        └─────────┘        └─────────┘
                                           │
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Pool absorbs │
                                    │ loss         │
                                    │ Score -= 75  │
                                    └──────────────┘
```

## 📈 Interest Accumulation

```
Interest = (Principal × Rate × Days) / 1,000,000

Example: 100 USDC for 30 days at 0.024% daily

Day  0: Principal = 100.000 USDC
Day  1: Interest  =   0.0024 USDC
Day  2: Interest  =   0.0048 USDC
...
Day 30: Interest  =   0.072 USDC

Total Repayment = 100.072 USDC

Graph:
Amount
100.072 ┤                                        ┌─
        │                                    ┌───┘
        │                                ┌───┘
        │                            ┌───┘
        │                        ┌───┘
100.000 ┤────────────────────────┘
        └────────────────────────────────────────► Days
        0                                        30
```

## 🎨 Frontend Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (Deposit Page, Loan Page, Dashboard, etc.)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ User clicks "Deposit"
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              contractService.ts                          │
│  - depositToPool()                                       │
│  - createLoan()                                          │
│  - repayLoan()                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ ethers.js calls
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  MetaMask / Wallet                       │
│  - Sign transaction                                      │
│  - Broadcast to network                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Transaction
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Base Blockchain                         │
│  - Execute smart contract                                │
│  - Update state                                          │
│  - Emit events                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Transaction receipt
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  - Show success message                                  │
│  - Update balances                                       │
│  - Display transaction hash                              │
└─────────────────────────────────────────────────────────┘
```

---

These diagrams provide a visual understanding of the system architecture, data flows, and state transitions.
