import { BigInt, log } from "@graphprotocol/graph-ts";

import { PayoutContractCreated as PayoutContractCreatedEvent } from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyFactory";
import { MerklePayoutStrategyImplementation } from "../../generated/templates";
import { MerklePayoutStrategyImplementation as ImplementationContract } from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyImplementation";
import { QuadraticTipping } from "../../generated/schema";
const VERSION = "0.1.0";

/**
 * @dev Handles indexing on VotingContractCreated event.
 * @param event VotingContractCreatedEvent
 */
export function handlePayoutContractCreated(
  event: PayoutContractCreatedEvent
): void {
  const payoutContractAddress = event.params.payoutContractAddress;

  // const payoutContract = ImplementationContract.bind(payoutContractAddress);
  // const roundAddress = payoutContract.roundAddress();

  // const quadraticTipping = QuadraticTipping.load(roundAddress.toHex());
  // if (quadraticTipping == null) {
  //   const quadraticTipping = new QuadraticTipping(roundAddress.toHex());
  //   quadraticTipping.matchAmount = BigInt.fromI32(1);
  //   quadraticTipping.round = payoutContractAddress.toHex();
  //   quadraticTipping.readyForPayout = false;
  //   quadraticTipping.batchPayoutCompleted = false;
  //   quadraticTipping.distributions = [];
  //   quadraticTipping.votes = [];
  //   quadraticTipping.save();
  // }

  MerklePayoutStrategyImplementation.create(payoutContractAddress);
}
