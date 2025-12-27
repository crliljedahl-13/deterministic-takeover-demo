# MomentTakeover — Deterministic Forced-Sale NFT Demo

TL;DR  
A minimal Ethereum demo showing how a smart contract can enforce deterministic pricing and forced asset transfers within a fixed time window — with no discretion, no fees, and full on-chain verification.

MomentTakeover is a local Ethereum demo that shows how a smart contract can enforce deterministic pricing, time-bounded ownership, and forced sales entirely on-chain.

During a fixed time window, ownership transfers automatically at a known price. Either the current holder keeps the asset by paying the next required price, or someone else buys it from them immediately by paying that price. The holder has no ability to refuse the sale. There is no negotiation, discretion, or off-chain logic.

This project is designed to be read, run, and verified locally on a Hardhat network.

---

## Core Idea

At any moment during the active window, there is exactly one holder.

If someone pays the deterministically defined takeover price, the contract:
- transfers the asset to the buyer automatically (forced sale)
- pays the previous holder immediately and in full (the entire takeover payment)
- retains no spread or surplus

After the window expires, the contract freezes and all user-initiated transfers revert permanently.

---

## What This Demonstrates

### 1) Time-Bounded Ownership
- Minting and takeovers are only allowed during `[startTime, endTime]`.
- After expiry, the contract can be frozen permanently.

### 2) Deterministic Pricing
- Takeover prices follow a fixed basis-points schedule stored on-chain.
- The next required price is computable before sending any transaction.

### 3) Forced Sale With No Discretion
- The current holder cannot block or refuse a takeover.
- Paying the required price forces ownership transfer.

### 4) Immediate Payout to Previous Holder
- On takeover, the previous holder receives the entire payment made by the new holder (`msg.value`).
- The seller is paid more than they paid, immediately, in the same transaction.

### 5) On-Chain Value Enforcement
- The simulation verifies that the intended ETH sent matches the on-chain transaction value.

### 6) Irreversible Post-Expiry Lock
- After `freeze()`, user-initiated transfers revert permanently at the ERC-721 transfer layer.

---

## Economic Invariant

During the active window, each takeover satisfies:
- `newHolder paid = requiredNextPrice`
- `previousHolder payout = newHolder paid`
- `contract balance change = 0`

---

## Why This Matters

This pattern is useful for modeling systems where ownership is conditional, time-bounded, and non-negotiable — such as tickets, licenses, leases, or usage rights that must transfer at predefined prices under strict rules.

The key insight is that enforcement is embedded directly in the asset itself, rather than delegated to an intermediary, marketplace, or legal process.

---

## Running the Demo

**Terminal 1**
```
npx hardhat node
```

**Terminal 2**
```
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/simulate.js --network localhost
```

---

## Proof: Deterministic On-Chain Execution (Local Simulation)

```text
camlil@Cams-MacBook-Air ~ % cd ~/moment-nft
camlil@Cams-MacBook-Air moment-nft % npx hardhat clean
camlil@Cams-MacBook-Air moment-nft % npx hardhat compile
Compiled 16 Solidity files successfully (evm target: paris).

camlil@Cams-MacBook-Air moment-nft % npx hardhat run scripts/deploy.js --network localhost
MomentTakeover deployed
Address:        0x5FbDB2315678afecb367f032d93F642f64180aa3
Initial price:  0.02 ETH
Initial (wei):  20000000000000000

Schedule:
  Takeover #1: +10.00% (1000 bps)
  Takeover #2: +15.00% (1500 bps)
  Takeover #3: +20.00% (2000 bps)
  Takeover #4: +25.00% (2500 bps)
  After that: repeats +25.00%

Saved to deployed.json

STEP 1: mintInitial() by A
  ON-CHAIN value: 0.02 ETH
  holder: 0xf39F...2266

STEP 2: takeOver() by B
  required: 0.022 ETH
  previousHolder payout: 0.022 ETH
  contract balance Δ: 0
  holder: 0x7099...79C8

STEP 3: takeOver() by C
  required: 0.0253 ETH
  previousHolder payout: 0.0253 ETH
  contract balance Δ: 0
  holder: 0x3C44...93BC
  next required: 0.03036 ETH

STEP 4: expire + freeze
  TransfersDisabled() confirmed
```

---

## Scope

This project intentionally avoids frontends, off-chain logic, governance, upgradeability, and fee models. The focus is the rule itself, enforced directly by the contract.

---

## Status

Complete, deterministic, and locally reproducible.
