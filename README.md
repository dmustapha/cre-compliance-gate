# CRE Compliance Gate

Compliance-gated ETH vault using Chainlink CRE to orchestrate World ID verification and OFAC sanctions screening before deposits.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Chainlink](https://img.shields.io/badge/Chainlink-CRE-375BD2?logo=chainlink)](https://chain.link/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-47_passing-brightgreen)]()

## Live Demo

**[cre-compliance-gate.vercel.app](https://cre-compliance-gate.vercel.app)**

Connect MetaMask on Sepolia, enter an ETH amount, and walk through the compliance flow.

---

## What Is CRE Compliance Gate?

CRE Compliance Gate is a DeFi vault that requires depositors to pass two compliance checks before funds are accepted. A Chainlink CRE workflow verifies the depositor is a real human (via World ID) and screens their address against OFAC sanctions lists. Only after both checks pass does the on-chain deposit execute.

---

## Features

- **CRE-Orchestrated Compliance**: Chainlink CRE workflow coordinates multi-step verification off-chain before executing on-chain
- **World ID Verification**: Proof-of-humanity via Worldcoin IDKit (device-level verification)
- **OFAC Sanctions Screening**: Address checked against sanctions databases before deposit approval
- **Gated Vault Deposits**: Smart contract only accepts deposits from the authorized CRE workflow address
- **Permissionless Withdrawals**: Depositors can withdraw their balance at any time without re-verification
- **Real-Time Status Panel**: Step-by-step compliance progress shown in the UI with pass/fail indicators

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.24, Foundry, OpenZeppelin v5 |
| CRE Workflow | Chainlink CRE SDK, TypeScript, HTTPClient + EVMClient capabilities |
| Frontend | Next.js 14, React 18, Tailwind CSS, wagmi v2, viem, RainbowKit |
| Identity | World ID (IDKit widget, device-level verification) |
| Network | Ethereum Sepolia testnet |

---

## Smart Contracts

| Contract | Address | Network |
|----------|---------|---------|
| ComplianceVault | [`0x8Bdd7640bb33fbB4e24735C33726bF568391B7De`](https://sepolia.etherscan.io/address/0x8Bdd7640bb33fbB4e24735C33726bF568391B7De) | Sepolia |

---

## How It Works

```
User connects wallet
      |
      v
Enters ETH amount, clicks "Verify & Deposit"
      |
      v
World ID widget opens --> user proves humanity
      |
      v
CRE Workflow receives proof + address
      |
      +---> Step 1: Validate World ID proof (HTTP capability)
      |
      +---> Step 2: Screen address against OFAC sanctions (HTTP capability)
      |
      +---> Step 3: Call vault.deposit() on Sepolia (EVM capability)
      |
      v
Transaction confirmed, balance updated
```

The CRE workflow acts as compliance middleware. The vault contract enforces that only the registered CRE address can call `deposit()`, so no deposit can bypass the verification pipeline.

---

## Testing the App

### Prerequisites

- MetaMask browser extension
- Sepolia ETH (get from [Sepolia faucet](https://sepoliafaucet.com/))

### Steps

1. Visit [cre-compliance-gate.vercel.app](https://cre-compliance-gate.vercel.app)
2. Click "Connect Wallet" and select MetaMask
3. Switch to Sepolia testnet if prompted
4. Enter an ETH deposit amount (e.g., 0.01)
5. Click "Verify & Deposit"
6. Complete the World ID verification in the popup
7. Watch the status panel as sanctions screening and deposit execute
8. View the transaction on Etherscan via the provided link

---

## Running Locally

```bash
git clone https://github.com/dmustapha/cre-compliance-gate.git
cd cre-compliance-gate
```

### Smart Contracts

```bash
cd contracts
forge install
forge build
forge test -vvv
```

### Frontend

```bash
cd frontend
npm install  # or bun install
cp .env.local.example .env.local
# Fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### CRE Workflow

The CRE workflow source is in `workflow/`. In production, this deploys to a Chainlink DON via `cre-cli`. For development, the frontend includes a mock API route (`/api/compliance`) that simulates the same 3-step compliance flow.

---

## Project Structure

```
cre-compliance-gate/
├── contracts/               # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── ComplianceVault.sol    # Compliance-gated ETH vault
│   ├── test/
│   │   ├── ComplianceVault.t.sol        # Unit tests (11 tests)
│   │   └── ComplianceVault.debug.t.sol  # Fuzz + edge case tests (17 tests)
│   └── script/
│       └── Deploy.s.sol           # Deployment script
├── frontend/                # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Main deposit page
│       │   └── api/compliance/    # Mock CRE API route
│       ├── components/
│       │   ├── DepositForm.tsx    # Deposit form with World ID
│       │   ├── StatusPanel.tsx    # Compliance status display
│       │   └── WalletProvider.tsx # wagmi + RainbowKit setup
│       └── lib/
│           ├── config.ts          # App configuration
│           └── contracts.ts       # Contract ABIs + addresses
├── workflow/                # Chainlink CRE workflow
│   ├── workflow.yaml              # CRE workflow definition
│   └── src/
│       └── index.ts               # Workflow implementation
└── .env.example             # Environment variable template
```

---

## Bounty Targets

- **Chainlink CRE: Risk & Compliance** - Core use case: compliance-gated DeFi vault
- **World ID** - Sybil resistance via proof-of-humanity verification

---

## License

MIT
