// This script deals with deploying the QuadraticFundingVotingStrategyFactory on a given network
import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../../utils/script-utils";
import * as utils from "../../utils";

import fs from "fs";

utils.assertEnvironment();

export async function main() {
  // Wait 10 blocks for re-org protection
  const blocksToWait = hre.network.name === "localhost" ? 0 : 10;

  await confirmContinue({
    contract: "QuadraticFundingVotingStrategyFactory",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
  });

  // Deploy QuadraticFundingVotingStrategyFactory
  const contractFactory = await ethers.getContractFactory(
    "QuadraticFundingVotingStrategyFactory"
  );
  const contract = await upgrades.deployProxy(contractFactory);

  console.log(
    `Deploying Upgradable QuadraticFundingVotingStrategyFactory to ${contract.address}`
  );

  await contract.deployTransaction.wait(blocksToWait);
  console.log("✅ Deployed.");

  const filePath = "./scripts/config/votingStrategy.config.ts";
  let fileContent = fs.readFileSync(filePath, "utf8");
  const localhostRegex =
    /(localhost\s*:\s*{[^}]*factory\s*:\s*['"])[^'"]*(['"])/gm;
  fileContent = fileContent.replace(localhostRegex, `$1${contract.address}$2`);

  console.log("✅ Updated voting strategy factory address in round.config.ts");

  fs.writeFileSync(filePath, fileContent);

  const configFilePath = "../graph/config/localhost.json";
  const config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
  config.QFVotingStrategyFactoryAddress = contract.address;
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 4));
  console.log("✅ Updated QF Voting Strategy factory address in config.json");

  return contract.address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
