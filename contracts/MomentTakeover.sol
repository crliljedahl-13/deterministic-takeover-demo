// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * MomentTakeover
 * - Mint once during [startTime, endTime]
 * - Takeovers require paying requiredNextPrice() (deterministic bps schedule)
 * - On takeover, previous holder is automatically paid the prior price (currentPrice)
 *   and the spread remains in the contract
 * - After freeze(), user-initiated transfers are disabled forever
 * - Protocol/forced transfers are still possible via _update(..., auth = address(0))
 */
contract MomentTakeover is ERC721, ReentrancyGuard {
    // -------------------------
    // Errors
    // -------------------------
    error NotActive();
    error AlreadyMinted();
    error NotMinted();
    error WrongValue(uint256 expected, uint256 got);
    error TransfersDisabled();

    // -------------------------
    // State
    // -------------------------
    uint256 public immutable startTime;
    uint256 public immutable endTime;

    uint256 private constant TOKEN_ID = 1;

    uint256 public currentPrice;
    address public currentHolder;

    uint256 public takeoverCount;
    bool public frozen;

    uint256[] private _priceBumpsBps; // e.g. 1000 = +10%

    // -------------------------
    // Events
    // -------------------------
    event Minted(address indexed minter, uint256 pricePaid);

    // pricePaid: msg.value paid by new holder
    // payout: amount forwarded to previous holder (prior currentPrice)
    // nextPrice: requiredNextPrice() after state update (convenience)
    event TakenOver(
        address indexed previousHolder,
        address indexed newHolder,
        uint256 pricePaid,
        uint256 payout,
        uint256 nextPrice
    );

    event Frozen(uint256 timestamp);

    constructor(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _initialPrice,
        uint256[] memory bumpsBps
    ) ERC721("MomentTakeover", "MTO") {
        require(_startTime < _endTime, "bad window");
        require(_initialPrice > 0, "bad price");
        require(bumpsBps.length > 0, "need bumps");

        startTime = _startTime;
        endTime = _endTime;
        currentPrice = _initialPrice;

        for (uint256 i = 0; i < bumpsBps.length; i++) {
            require(bumpsBps[i] > 0, "bad bump");
            _priceBumpsBps.push(bumpsBps[i]);
        }
    }

    // -------------------------
    // View helpers
    // -------------------------
    function isActive() public view returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime && !frozen;
    }

    function priceBumpsLength() external view returns (uint256) {
        return _priceBumpsBps.length;
    }

    function priceBumps(uint256 i) external view returns (uint256) {
        return _priceBumpsBps[i];
    }

    function requiredNextPrice() public view returns (uint256) {
        // If not minted yet, mint price is currentPrice
        if (currentHolder == address(0)) return currentPrice;

        uint256 bump = _priceBumpsBps[
            takeoverCount < _priceBumpsBps.length ? takeoverCount : _priceBumpsBps.length - 1
        ];

        // next = currentPrice * (10000 + bump) / 10000
        return (currentPrice * (10_000 + bump)) / 10_000;
    }

    // -------------------------
    // Core actions
    // -------------------------
    function mintInitial() external payable nonReentrant {
        if (!isActive()) revert NotActive();
        if (currentHolder != address(0)) revert AlreadyMinted();

        uint256 expected = requiredNextPrice();
        if (msg.value != expected) revert WrongValue(expected, msg.value);

        _safeMint(msg.sender, TOKEN_ID);

        currentHolder = msg.sender;
        currentPrice = msg.value;

        emit Minted(msg.sender, msg.value);
    }

    function takeOver() external payable nonReentrant {
        if (!isActive()) revert NotActive();
        if (currentHolder == address(0)) revert NotMinted();

        uint256 expected = requiredNextPrice();
        if (msg.value != expected) revert WrongValue(expected, msg.value);

        address prev = currentHolder;

        // Pay previous holder ONLY the old price; spread stays in contract
        uint256 payout = msg.value;
        (bool ok, ) = prev.call{value: payout}("");
        require(ok, "payout failed");

        takeoverCount += 1;

        // Forced transfer: bypass normal user transfer checks
        // auth = address(0) marks it as protocol-driven transfer
        _update(msg.sender, TOKEN_ID, address(0));

        currentHolder = msg.sender;
        currentPrice = msg.value;

        emit TakenOver(prev, msg.sender, msg.value, payout, requiredNextPrice());
    }

    function freeze() external {
        require(block.timestamp > endTime, "not expired");
        if (!frozen) {
            frozen = true;
            emit Frozen(block.timestamp);
        }
    }

    // -------------------------
    // Transfer control (OpenZeppelin v5)
    // -------------------------
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        // After freezing:
        // - allow mint/burn
        // - allow protocol "forced transfers" if auth == address(0)
        // - block user-initiated transfers (auth != address(0))
        if (frozen) {
            bool isForced = (auth == address(0));
            if (!isForced) {
                revert TransfersDisabled();
            }
        }

        from = super._update(to, tokenId, auth);

        // Single-token invariant
        require(tokenId == TOKEN_ID, "bad id");

        return from;
    }
}