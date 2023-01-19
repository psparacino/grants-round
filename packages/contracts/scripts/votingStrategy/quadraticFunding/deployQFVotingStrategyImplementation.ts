// This script deals with deploying QuadraticFundingVotingStrategyImplementation on a given network
import { ethers } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../../utils/script-utils";
import * as utils from "../../utils";

import fs from "fs";

utils.assertEnvironment();

export async function main() {
  // Wait 10 blocks for re-org protection
  const blocksToWait = hre.network.name === "localhost" ? 0 : 10;

  await confirmContinue({
    contract: "QuadraticFundingVotingStrategyImplementation",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
  });

  // Deploy QFImplementation
  const contractFactory = await ethers.getContractFactory(
    "QuadraticFundingVotingStrategyImplementation"
  );
  const contract = await contractFactory.deploy();

  console.log(
    `Deploying QuadraticFundingVotingStrategyImplementation to ${contract.address}`
  );
  await contract.deployTransaction.wait(blocksToWait);
  console.log("✅ Deployed.");

  const filePath = "./scripts/config/votingStrategy.config.ts";
  let fileContent = fs.readFileSync(filePath, "utf8");
  const localhostRegex =
    /(localhost\s*:\s*{[^}]*implementation\s*:\s*['"])[^'"]*(['"])/gm;
  fileContent = fileContent.replace(localhostRegex, `$1${contract.address}$2`);

  console.log(
    "✅ Updated voting strategy implementation address in round.config.ts"
  );

  fs.writeFileSync(filePath, fileContent);

  return contract.address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
