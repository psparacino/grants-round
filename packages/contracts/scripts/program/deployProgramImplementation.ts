// This script deals with deploying the ProgramImplementation on a given network
import { ethers } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../utils/script-utils";
import * as utils from "../utils";

import fs from "fs";

utils.assertEnvironment();

export async function main() {
  // Wait 10 blocks for re-org protection
  const blocksToWait = hre.network.name === "localhost" ? 0 : 10;

  await confirmContinue({
    contract: "ProgramImplementation",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
  });

  // Deploy ProgramImplementation
  const contractFactory = await ethers.getContractFactory(
    "ProgramImplementation"
  );
  const contract = await contractFactory.deploy();

  console.log(`Deploying ProgramImplementation to ${contract.address}`);
  await contract.deployTransaction.wait(blocksToWait);
  console.log("✅ Deployed");

  const filePath = "./scripts/config/program.config.ts";
  let fileContent = fs.readFileSync(filePath, "utf8");
  const localhostRegex =
    /(localhost\s*:\s*{[^}]*programImplementationContract\s*:\s*['"])[^'"]*(['"])/gm;
  fileContent = fileContent.replace(localhostRegex, `$1${contract.address}$2`);

  console.log("✅ Updated program implementation address in program.config.ts");

  fs.writeFileSync(filePath, fileContent);

  return contract.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
