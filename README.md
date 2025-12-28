# MomentTakeover — Deterministic Forced-Sale NFT (Research Demo)

Independent research demo exploring rule-based asset ownership.

MomentTakeover is an Ethereum project demonstrating how a smart contract can
enforce deterministic pricing and forced asset transfers within a fixed time
window, with no discretion, no negotiation, and fully on-chain verification.

---

Why This Exists

Most asset transfers rely on discretionary, negotiated selling. Owners can
refuse a sale, delay price discovery, or impose off-chain conditions. That
discretion becomes a market failure when the desired property is a guaranteed
right to acquire or retain an asset under transparent rules, such as
time-bounded ownership, lease-like rights, or takeover mechanisms where refusal
undermines the product.

Determinism matters because it makes ownership transfer auditable and
trust-minimized. When price schedules and expiry conditions are fixed on-chain,
participants can reason about outcomes before acting: exactly what it costs to
acquire, exactly what it takes to keep ownership, and exactly when the system
freezes. Ownership becomes a verifiable rule, not a social process.

---

## What This Demonstrates

- Deterministic takeover pricing enforced on-chain
- Forced sale: the current holder cannot refuse a valid takeover
- Exactly one active holder at all times
- Time-bounded participation with a hard expiry
- On-chain verification of ETH payment correctness
- Irreversible post-expiry freeze

---

## Mechanism Overview

- During the active window, there is always exactly one holder.
- Anyone may take over ownership by paying the next required deterministic price.
- Ownership transfers immediately and automatically.
- After expiry, the contract enters a frozen state and rejects transfers.

Deterministic pricing uses a predefined step-based schedule per takeover:  
+10% → +15% → +20% → +25% (then repeats).

---

## Representative Output (Annotated)

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
→ All further transfer attempts revert by design: TransfersDisabled()

---

## License

MIT
