const hre = require("hardhat");
const fs = require("fs");

const fmt = (x) => hre.ethers.formatEther(x);

async function mineSeconds(sec) {
  await hre.network.provider.send("evm_increaseTime", [sec]);
  await hre.network.provider.send("evm_mine");
}

function short(addr) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function pct(bps) {
  return (Number(bps) / 100).toFixed(2);
}

function assertEqBigint(a, b, msg) {
  if (a !== b) {
    throw new Error(
      `${msg}\nExpected: ${b.toString()} wei (${hre.ethers.formatEther(b)} ETH)\nGot:      ${a.toString()} wei (${hre.ethers.formatEther(a)} ETH)`
    );
  }
}

async function sendAndProveValue(txPromise, expectedValueWei, label, opts = {}) {
  const { payoutTo, contractAddress } = opts;

  let payoutBalanceBefore = null;
  let contractBalanceBefore = null;

  if (payoutTo) {
    if (!contractAddress) throw new Error("sendAndProveValue: missing contractAddress");
    payoutBalanceBefore = await hre.ethers.provider.getBalance(payoutTo);
    contractBalanceBefore = await hre.ethers.provider.getBalance(contractAddress);
  }

  const tx = await txPromise;

  console.log(`  ${label} tx hash:`, tx.hash);

  const chainTx = await hre.ethers.provider.getTransaction(tx.hash);
  if (!chainTx) throw new Error("Could not fetch tx from provider");

  console.log(`  ON-CHAIN value (wei): ${chainTx.value.toString()}`);
  console.log(`  ON-CHAIN value (eth): ${fmt(chainTx.value)} ETH`);

  assertEqBigint(
    chainTx.value,
    expectedValueWei,
    `Mismatch: on-chain tx value != expected value for ${label}`
  );

  await tx.wait();
  console.log(`  ${label} confirmed.`);

  if (payoutTo) {
    const payoutBalanceAfter = await hre.ethers.provider.getBalance(payoutTo);
    const contractBalanceAfter = await hre.ethers.provider.getBalance(contractAddress);

    const payoutWei = payoutBalanceAfter - payoutBalanceBefore;
    const paidWei = expectedValueWei;
    const contractDeltaWei = contractBalanceAfter - contractBalanceBefore;

    console.log(`  previousHolder payout: ${fmt(payoutWei)} ETH`);
    console.log(`  newHolder paid:        ${fmt(paidWei)} ETH`);
    console.log(`  contract balance Δ:    ${fmt(contractDeltaWei)} ETH`);
  }
}

async function main() {
  const [a, b, c] = await hre.ethers.getSigners();

  if (!fs.existsSync("deployed.json")) {
    throw new Error("deployed.json not found. Run deploy.js first.");
  }

  const meta = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const address = meta.address;

  if (!meta.initialPriceWei) {
    throw new Error("deployed.json missing initialPriceWei. Re-run deploy.js.");
  }

  const deployedInitialWei = BigInt(meta.initialPriceWei);

  const artifact = await hre.artifacts.readArtifact("MomentTakeover");
  const contract = new hre.ethers.Contract(address, artifact.abi, a);

  const bumpsLen = Number(await contract.priceBumpsLength());
  const bumps = [];
  for (let i = 0; i < bumpsLen; i++) bumps.push(Number(await contract.priceBumps(i)));
  const bumpFor = (count) => bumps[Math.min(count, bumps.length - 1)];

  console.log("Contract:", address);
  console.log("startTime:", (await contract.startTime()).toString());
  console.log("endTime:  ", (await contract.endTime()).toString());
  console.log("deployed initialPrice:", fmt(deployedInitialWei), "ETH");
  console.log("deployed initial (wei):", deployedInitialWei.toString());
  console.log("--------------------------------------------------");

  if (!(await contract.isActive())) {
    console.log("Not active yet -> fast-forward 20s...");
    await mineSeconds(20);
  }

  console.log("Active?:", await contract.isActive());
  console.log("initial currentPrice:", fmt(await contract.currentPrice()), "ETH");
  console.log("--------------------------------------------------");

  async function noteNextPrice() {
    const minted = (await contract.currentHolder()) !== hre.ethers.ZeroAddress;
    const last = await contract.currentPrice();
    const next = await contract.requiredNextPrice();

    if (!minted) {
      console.log(`  Next required (mint): ${fmt(next)} ETH`);
      console.log(`  Next required (mint, wei): ${next.toString()}`);
      return;
    }

    const tc = Number(await contract.takeoverCount());
    const bump = bumpFor(tc);
    console.log(
      `  Next required: ${fmt(next)} ETH  (bump: +${pct(bump)}% = ${bump} bps, from ${fmt(last)} ETH)`
    );
    console.log(`  Next required (wei): ${next.toString()}`);
  }

  // STEP 1: mintInitial
  console.log("STEP 1: mintInitial() by A");
  await noteNextPrice();

  const mintPrice = await contract.requiredNextPrice();

  console.log("  intended value (wei):", mintPrice.toString());
  console.log("  intended value (eth):", fmt(mintPrice), "ETH");

  assertEqBigint(
    mintPrice,
    deployedInitialWei,
    "Mismatch: requiredNextPrice() != deployed initial price"
  );

  await sendAndProveValue(
    contract.connect(a).mintInitial({ value: mintPrice }),
    mintPrice,
    "mintInitial"
  );

  console.log("  holder:", short(await contract.currentHolder()));
  console.log("--------------------------------------------------");

  // STEP 2: takeOver by B
  console.log("STEP 2: takeOver() by B");
  await noteNextPrice();

  const p1 = await contract.requiredNextPrice();

  console.log("  intended value (wei):", p1.toString());
  console.log("  intended value (eth):", fmt(p1), "ETH");

  const prevHolder1 = await contract.currentHolder();

  await sendAndProveValue(
    contract.connect(b).takeOver({ value: p1 }),
    p1,
    "takeOver#1",
    { payoutTo: prevHolder1, contractAddress: address }
  );

  console.log("  holder:", short(await contract.currentHolder()));
  console.log("--------------------------------------------------");

  // STEP 3: takeOver by C
  console.log("STEP 3: takeOver() by C");
  await noteNextPrice();

  const p2 = await contract.requiredNextPrice();

  console.log("  intended value (wei):", p2.toString());
  console.log("  intended value (eth):", fmt(p2), "ETH");

  const prevHolder2 = await contract.currentHolder();

  await sendAndProveValue(
    contract.connect(c).takeOver({ value: p2 }),
    p2,
    "takeOver#2",
    { payoutTo: prevHolder2, contractAddress: address }
  );

  console.log("  holder:", short(await contract.currentHolder()));
  console.log("  takeoverCount:", (await contract.takeoverCount()).toString());
  console.log("  next required:", fmt(await contract.requiredNextPrice()), "ETH");
  console.log("--------------------------------------------------");

  // STEP 4: expire + freeze + prove relic lock
  console.log("STEP 4: expire + freeze + prove relic lock");
  await mineSeconds(60 * 20);

  await (await contract.freeze()).wait();
  console.log("  frozen:", await contract.frozen());

  // Raw provider call so revert NEVER bubbles into a thrown tx error
  const data = contract.interface.encodeFunctionData(
    "transferFrom",
    [c.address, a.address, 1]
  );

  try {
    await hre.ethers.provider.call({
      to: address,
      from: c.address,
      data,
    });

    console.log("  transferFrom would succeed (unexpected)");
  } catch {
    console.log("  transferFrom would revert (expected): TransfersDisabled()");
  }

  console.log("Done.");
}

/* -------------------------------------------------------------------------- */
/*                                   RUNNER                                   */
/* -------------------------------------------------------------------------- */

main().catch((err) => {
  console.error(err);
  process.exit(1);
});