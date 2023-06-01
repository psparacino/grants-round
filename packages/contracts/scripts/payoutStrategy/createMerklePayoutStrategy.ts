
// This is a helper script to create a program.
// This should be created via the frontend and this script is meant to be used for quick test
import { ethers } from "hardhat";
import hre from "hardhat";
import { confirmContinue } from "../../utils/script-utils";
import { PayoutParams } from "./../config/payoutStrategy.config";
import * as utils from "../utils";

utils.assertEnvironment();

export async function main() {
  const network = hre.network;

  const networkParams = PayoutParams[network.name];
  if (!networkParams) {
    throw new Error(`Invalid network ${network.name}`);
  }

  const merklePayoutStrategyFactory = networkParams.merklePayoutStrategyFactory;
  const merklePayoutStrategyImplementation = networkParams.merklePayoutStrategyImplementation;

  if (!merklePayoutStrategyFactory) {
    throw new Error(`error: missing factory`);
  }

  if (!merklePayoutStrategyImplementation) {
    throw new Error(`error: missing implementation`);
  }

  const QFRelayStrategyFactory = await ethers.getContractAt(
    "QuadraticFundingRelayStrategyFactory",
    merklePayoutStrategyFactory
  );

  await confirmContinue({
    info: "create a merkle payout strategy",
    merklePayoutStrategyFactory: merklePayoutStrategyFactory,
    merklePayoutStrategyImplementation: merklePayoutStrategyImplementation,
    network: network.name,
    chainId: network.config.chainId,
  });

  const payoutStrategy = await QFRelayStrategyFactory.create();

  const receipt = await payoutStrategy.wait();
  let payoutStrategyAddress;
  console.log(receipt);
  if (receipt.events) {
    const event = receipt.events.find(
      (e) => e.event === "PayoutContractCreated"
    );
    if (event && event.args) {
      console.log(event.args);
      payoutStrategyAddress = event.args.payoutImplementation;
    }
    if (!event) {
      const event = receipt.events.find((e) => e.event === "Initialized");
      payoutStrategyAddress = event?.address;
    }
  }

  console.log("✅ Txn hash: " + payoutStrategy.hash);
  console.log("✅ Merkle payout contract created: ", payoutStrategyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
