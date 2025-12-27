const hre = require("hardhat");
const fs = require("fs");

function pct(bps) {
  return (Number(bps) / 100).toFixed(2);
}

async function main() {
  const now = Math.floor(Date.now() / 1000);

  const startTime = now + 10;
  const endTime = now + 10 * 60;

  const initialPrice = hre.ethers.parseEther("0.02");
  const initialPriceWei = initialPrice.toString();

  const bumps = [1000, 1500, 2000, 2500];

  const Factory = await hre.ethers.getContractFactory("MomentTakeover");
  const contract = await Factory.deploy(startTime, endTime, initialPrice, bumps);
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  fs.writeFileSync(
    "deployed.json",
    JSON.stringify(
      { address, startTime, endTime, bumps, initialPriceWei },
      null,
      2
    )
  );

  console.log("MomentTakeover deployed");
  console.log("Address:       ", address);
  console.log("Initial price: ", hre.ethers.formatEther(initialPrice), "ETH");
  console.log("Initial (wei): ", initialPriceWei);
  console.log("Schedule:");
  bumps.forEach((b, i) =>
    console.log(`  Takeover #${i + 1}: +${pct(b)}% (${b} bps)`)
  );
  console.log(`  After that: repeats +${pct(bumps[bumps.length - 1])}%`);
  console.log("Saved to deployed.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});