import {
  FundsDistributed as FundsDistributedEvent,
  ReadyForPayout as ReadyForPayoutEvent,
  BatchPayoutSuccessful as BatchPayoutSuccessfulEvent,
} from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyImplementation";
import {
  QuadraticTipping,
  QuadraticTippingDistribution,
} from "../../generated/schema";
import { MerklePayoutStrategyImplementation } from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyImplementation";

import { log } from "@graphprotocol/graph-ts";

const VERSION = "0.1.0";

/**
 * @dev Handles indexing on VotingContractCreated event.
 * @param event VotingContractCreatedEvent
 */
export function handleReadyForPayout(event: ReadyForPayoutEvent): void {
  const payoutContractAddress = event.address;

  const payoutContract = MerklePayoutStrategyImplementation.bind(
    payoutContractAddress
  );

  const roundAddress = payoutContract.roundAddress();

  const quadraticTipping = QuadraticTipping.load(roundAddress.toHex());
  if (quadraticTipping) {
    quadraticTipping.readyForPayout = true;
    quadraticTipping.save();
  }
}

export function handleBatchPayoutSuccessful(
  event: BatchPayoutSuccessfulEvent
): void {
  const payoutContractAddress = event.address;

  const payoutContract = MerklePayoutStrategyImplementation.bind(
    payoutContractAddress
  );

  const roundAddress = payoutContract.roundAddress();

  const quadraticTipping = QuadraticTipping.load(roundAddress.toHex());
  if (quadraticTipping) {
    quadraticTipping.batchPayoutCompleted = true;
    quadraticTipping.save();
  }
}

export function handleFundsDistributed(event: FundsDistributedEvent): void {
  const payoutContractAddress = event.address;

  const payoutContract = MerklePayoutStrategyImplementation.bind(
    payoutContractAddress
  );

  const roundAddress = payoutContract.roundAddress();

  const quadraticTippingDistribution = QuadraticTippingDistribution.load(
    roundAddress.toHex()
  );
  if (!quadraticTippingDistribution) {
    log.warning("no quadraticTippingDistribution found", []);
    return;
  }

  quadraticTippingDistribution.amount = event.params.amount;
  quadraticTippingDistribution.round = roundAddress.toHex();
  quadraticTippingDistribution.address = event.params.grantee.toHex();
  quadraticTippingDistribution.projectId = event.params.projectId.toHexString();
  quadraticTippingDistribution.token = event.params.token.toHex();
  quadraticTippingDistribution.save();

  const quadraticTipping = QuadraticTipping.load(roundAddress.toHex());
  if (quadraticTipping) {
    const distributions = quadraticTipping.distributions;
    distributions.push(quadraticTippingDistribution.id);
    quadraticTipping.distributions = distributions;

    quadraticTipping.save();
    log.info("quadraticTippingDistribution.id {}", [
      quadraticTippingDistribution.id,
    ]);
  } else {
    log.warning("No Quadratic Tipping Entity found", []);
  }
}
