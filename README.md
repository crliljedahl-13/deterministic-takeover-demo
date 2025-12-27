
# MomentTakeover — Deterministic Forced-Sale NFT Demo

MomentTakeover is a minimal, local Ethereum demo that shows how a smart contract can enforce deterministic pricing, time-bounded ownership, and forced sales entirely on-chain.

During a fixed time window, ownership transfers automatically at a known price. Either the current holder keeps the asset by paying the next required price, or someone else buys it from them immediately by paying that price. The holder has no ability to refuse the sale. There is no negotiation, discretion, or off-chain logic.

This project is designed to be read, run, and verified locally on a Hardhat network.

## Core Idea

At any moment during the active window, there is exactly one holder.

If someone pays the deterministically defined takeover price, the contract:
- transfers the asset to the buyer automatically (forced sale)
- pays the previous holder immediately and in full (the entire takeover payment)
- retains no spread or surplus

After the window expires, the contract freezes and all user-initiated transfers revert permanently.

## What This Demonstrates

### 1) Time-Bounded Ownership
- Minting and takeovers are only allowed during [startTime, endTime].
- After expiry, the contract can be frozen permanently.

### 2) Deterministic Pricing
- Takeover prices follow a fixed basis-points schedule stored on-chain.
- The next required price is computable before sending any transaction.

### 3) Forced Sale With No Discretion
- The current holder cannot block or refuse a takeover.
- Paying the required price forces ownership transfer.

### 4) Immediate Payout to Previous Holder
- On takeover, the previous holder receives the entire payment made by the new holder (msg.value).
- The seller is paid more than they paid, immediately, in the same transaction.

### 5) On-Chain Value Enforcement
- The simulation verifies that the intended ETH sent matches the on-chain transaction value.

### 6) Irreversible Post-Expiry Lock
- After freeze(), user-initiated transfers revert permanently at the ERC-721 transfer layer.

## Economic Invariant

During the active window, each takeover satisfies:
- newHolder paid = requiredNextPrice
- previousHolder payout = newHolder paid
- contract balance change = 0

## Running the Demo

Terminal 1:
npx hardhat node

Terminal 2:
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/simulate.js --network localhost

## Proof (Local Simulation Output)

Below is a complete local run showing deterministic pricing, exact on-chain ETH values, forced takeovers, full payout to the previous holder, and permanent transfer lock after expiry:


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
camlil@Cams-MacBook-Air moment-nft % npx hardhat run scripts/simulate.js --network localhost
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
startTime: 1766745911
endTime:   1766746501
deployed initialPrice: 0.02 ETH
deployed initial (wei): 20000000000000000
--------------------------------------------------
Not active yet -> fast-forward 20s...
Active?: true
initial currentPrice: 0.02 ETH
--------------------------------------------------
STEP 1: mintInitial() by A
  Next required (mint): 0.02 ETH
  Next required (mint, wei): 20000000000000000
  intended value (wei): 20000000000000000
  intended value (eth): 0.02 ETH
  mintInitial tx hash: 0x266974639c3dd4c27c585bd6c95c225439bcf44880752daa6ea12242cea65a85
  ON-CHAIN value (wei): 20000000000000000
  ON-CHAIN value (eth): 0.02 ETH
  mintInitial confirmed.
  holder: 0xf39F...2266
--------------------------------------------------
STEP 2: takeOver() by B
  Next required: 0.022 ETH  (bump: +10.00% = 1000 bps, from 0.02 ETH)
  Next required (wei): 22000000000000000
  intended value (wei): 22000000000000000
  intended value (eth): 0.022 ETH
  takeOver#1 tx hash: 0x75643fdb32be989ce7104dd7f99df344cb8e720014ab263b28aece2a888a5945
  ON-CHAIN value (wei): 22000000000000000
  ON-CHAIN value (eth): 0.022 ETH
  takeOver#1 confirmed.
  previousHolder payout: 0.022 ETH
  newHolder paid:        0.022 ETH
  contract balance Δ:    0.0 ETH
  holder: 0x7099...79C8
--------------------------------------------------
STEP 3: takeOver() by C
  Next required: 0.0253 ETH  (bump: +15.00% = 1500 bps, from 0.022 ETH)
  Next required (wei): 25300000000000000
  intended value (wei): 25300000000000000
  intended value (eth): 0.0253 ETH
  takeOver#2 tx hash: 0x57e8735e283c2ac9e15a31113d554f5ce5e3a54c2198fadc00dc51bb049e8b9a
  ON-CHAIN value (wei): 25300000000000000
  ON-CHAIN value (eth): 0.0253 ETH
  takeOver#2 confirmed.
  previousHolder payout: 0.0253 ETH
  newHolder paid:        0.0253 ETH
  contract balance Δ:    0.0 ETH
  holder: 0x3C44...93BC
  takeoverCount: 2
  next required: 0.03036 ETH
--------------------------------------------------
STEP 4: expire + freeze
  frozen: true
  transferFrom would revert (expected): TransfersDisabled()
Done.

## Scope

This project intentionally avoids frontends, off-chain logic, governance, upgradeability, and fee models. The focus is the rule itself, enforced directly by the contract.

## Status

Complete, deterministic, and locally reproducible.
>>>>>>> ec1298e (Initial commit)
