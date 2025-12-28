# Deterministic Forced-Sale Mechanism (On-Chain Demo)

**Independent Research Project**

**Research Paper**
**Deterministic Forced-Sale Mechanism for Time-Bound Ownership**  
PDF → https://github.com/crliljedahl-13/deterministic-takeover-demo/blob/main/Deterministic_Forced_Sale_Mechanism.pdf

---

This repository contains an Ethereum-based implementation of the deterministic
forced-sale mechanism described in the paper, providing an on-chain validation
of its core rules and guarantees.

The implementation is referred to as *MomentTakeover*.

---

## Overview

The system demonstrates how a smart contract can enforce deterministic pricing
and forced asset transfers within a fixed activity window, without discretion,
negotiation, or off-chain coordination.

At every moment during the active period, there exists exactly one valid takeover
price. Any party may acquire the asset by paying that price, and the current
holder cannot refuse the transfer. All ownership transitions and ETH payments
are enforced and verified directly on-chain.

Once the activity window expires, the contract freezes permanently. User-initiated
transfers revert by design, preventing ownership from being renegotiated or
reinterpreted after expiry.

---

## Why This Exists

Most asset transfers rely on discretionary, negotiated selling. Even when
ownership is clearly defined, the current holder can refuse a sale, delay
execution, or impose off-chain conditions. That discretion becomes a market
failure when the intended property is a guaranteed right to acquire or retain an
asset under transparent, rule-based conditions.

Determinism matters because it makes ownership transfer auditable and
trust-minimized. When pricing schedules and expiry conditions are fixed on-chain,
participants can reason about outcomes in advance: exactly what it costs to
acquire, exactly what it takes to retain ownership, and exactly when the system
locks. Ownership becomes a verifiable rule rather than a social process.

---

## What This Demonstrates

- Deterministic takeover pricing enforced on-chain
- Forced sale semantics: the current holder cannot refuse a valid takeover
- Exactly one active holder at all times
- Time-bounded participation with a hard expiry
- On-chain verification that ETH payments match required prices
- Irreversible post-expiry freeze of ownership state

---

## Mechanism

- During the active window, there is always exactly one holder.
- Anyone may take over ownership by paying the next required deterministic price.
- Ownership transfers immediately and automatically upon valid payment.
- After expiry, the contract enters a frozen state and rejects all transfers.

Deterministic pricing follows a predefined, step-based schedule per takeover:  
+10% → +15% → +20% → +25% (then repeats).

---

## Representative Execution (Annotated)

Takeover executed  
→ Required takeover price: 0.022 ETH  
→ Buyer pays exactly 0.022 ETH  
→ Ownership transfers immediately (seller cannot refuse)

On-chain verification  
→ Payment matches the required takeover price

Takeover executed  
→ Required takeover price: 0.0253 ETH (+15% step)  
→ Another buyer pays exactly 0.0253 ETH  
→ Ownership transfers immediately to the new holder

On-chain verification  
→ Payment matches the required takeover price

Contract expiry reached  
→ Takeover window closes permanently  
→ All further transfer attempts revert by design: `TransfersDisabled()`

---

## License

MIT
