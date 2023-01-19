// This script deals with deploying the QuadraticFundingVotingStrategyFactory on a given network
import { ethers } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../utils/script-utils";
import * as utils from "../utils";
import ts from "typescript";
import fs from "fs";
const jsonfile = require("jsonfile");

utils.assertEnvironment();

export async function main() {
  // Wait 10 blocks for re-org protection
  const blocksToWait = hre.network.name === "localhost" ? 0 : 10;

  await confirmContinue({
    contract: "MerklePayoutStrategy",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
  });

  // Deploy MerklePayoutStrategy
  const contractFactory = await ethers.getContractFactory(
    "MerklePayoutStrategy"
  );
  const contract = await contractFactory.deploy();

  console.log(`Deploying MerklePayoutStrategy to ${contract.address}`);

  await contract.deployTransaction.wait(blocksToWait);
  console.log("✅ Deployed.");

  const filePath = "./scripts/config/payoutStrategy.config.ts";
  let fileContent = fs.readFileSync(filePath, "utf8");
  const localhostRegex =
    /(localhost\s*:\s*{[^}]*merklePayoutContract\s*:\s*['"])[^'"]*(['"])/gm;
  fileContent = fileContent.replace(localhostRegex, `$1${contract.address}$2`);

  console.log(
    "✅ Updated localhost merkle address in payoutStrategy.config.ts"
  );

  // write the modified content back to the file
  fs.writeFileSync(filePath, fileContent);

  return contract.address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
