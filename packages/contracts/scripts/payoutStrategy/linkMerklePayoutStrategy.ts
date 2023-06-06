// This script deals with link the QF Implementation to QF Factory
import { ethers } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../utils/script-utils.ts";
import { PayoutParams } from "../config/payoutStrategy.config";
import * as utils from "../utils";

utils.assertEnvironment();

export async function main(
  merklePayoutStrategyFactory?: string,
  merklePayoutStrategyImplementation?: string
) {
  const network = hre.network;

  const networkParams = PayoutParams[network.name];
  if (!networkParams) {
    throw new Error(`Invalid network ${network.name}`);
  }

  if (!merklePayoutStrategyFactory) {
    merklePayoutStrategyFactory = networkParams.merklePayoutStrategyFactory;
  }

  if (!merklePayoutStrategyImplementation) {
    merklePayoutStrategyImplementation = networkParams.merklePayoutStrategyImplementation;
  }

  if (!merklePayoutStrategyFactory) {
    throw new Error(`error: missing merklePayoutStrategyFactory`);
  }

  if (!merklePayoutStrategyImplementation) {
    throw new Error(`error: missing merklePayoutImplementaiton`);
  }

  const merklePayoutFactory = await ethers.getContractAt(
    "MerklePayoutStrategyFactory",
    merklePayoutStrategyFactory
  );

  await confirmContinue({
    "contract"                     : "PayoutFactory",
    "merklePayoutFactory"         : merklePayoutStrategyFactory,
    "merklePayoutStrategyImplementation"  : merklePayoutStrategyImplementation,
    "network"                      : network.name,
    "chainId"                      : network.config.chainId
  });

  // Update QuadraticFundingVotingStrategyImplementation
  const updateTx = await merklePayoutFactory.updatePayoutImplementation(
    merklePayoutStrategyImplementation
  );
  await updateTx.wait();

  console.log(
    "✅ QuadraticFundingRelayStrategyImplementation Contract Linked to QuadraticFundingRelayStrategyFactory contract"
  );
  console.log("Txn hash", updateTx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
