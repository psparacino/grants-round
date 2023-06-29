import { RoundCreated as RoundCreatedEvent } from "../../generated/Round/RoundFactory";

import {
  Program,
  Round,
  VotingStrategy,
  QuadraticTipping,
  QuadraticTippingDistribution,
  RoundMetaData,
} from "../../generated/schema";
import {
  RoundImplementation,
  RoundMetaData as RoundMetaDataTemplate,
} from "../../generated/templates";
import { RoundImplementation as RoundImplementationContract } from "../../generated/templates/RoundImplementation/RoundImplementation";
import { updateMetaPtr } from "../utils";
import { log, BigInt } from "@graphprotocol/graph-ts";

/**
 * @dev Handles indexing on RoundCreatedEvent event.
 * @param event RoundCreatedEvent
 */
export function handleRoundCreated(event: RoundCreatedEvent): void {
  const roundContractAddress = event.params.roundAddress;
  let round = Round.load(roundContractAddress.toHex());

  if (round) {
    log.warning("--> handleRoundCreated {} : round already exists", [
      roundContractAddress.toHex(),
    ]);
    return;
  }

  // create new round entity
  round = new Round(roundContractAddress.toHex());

  // load round contract
  const roundContract = RoundImplementationContract.bind(roundContractAddress);

  // index global variables
  round.token = roundContract.token().toHex();
  round.payoutStrategy = roundContract.payoutStrategy().toHex();
  round.applicationsStartTime = roundContract
    .applicationsStartTime()
    .toString();
  round.applicationsEndTime = roundContract.applicationsEndTime().toString();
  round.roundStartTime = roundContract.roundStartTime().toString();
  round.roundEndTime = roundContract.roundEndTime().toString();

  // set roundMetaPtr
  const roundMetaPtrId = ["roundMetaPtr", roundContractAddress.toHex()].join(
    "-"
  );
  let roundMetaPtr = roundContract.roundMetaPtr();

  let metaPtr = updateMetaPtr(
    roundMetaPtrId,
    roundMetaPtr.getProtocol().toI32(),
    roundMetaPtr.getPointer().toString()
  );
  round.roundMetaPtr = metaPtr.id;

  const pointer = roundMetaPtr.getPointer().toString();

  log.info("roundAddress {}, pointer: {}", [
    roundContractAddress.toHexString(),
    pointer,
  ]);

  RoundMetaDataTemplate.create(pointer);

  // set applicationsMetaPtr
  const applicationsMetaPtrId = [
    "applicationsMetaPtr",
    roundContractAddress.toHex(),
  ].join("-");
  let applicationsMetaPtr = roundContract.applicationMetaPtr();
  metaPtr = updateMetaPtr(
    applicationsMetaPtrId,
    applicationsMetaPtr.getProtocol().toI32(),
    applicationsMetaPtr.getPointer().toString()
  );
  round.applicationMetaPtr = metaPtr.id;

  // link round to program
  const programContractAddress = event.params.ownedBy.toHex();
  let program = Program.load(programContractAddress);
  if (!program) {
    // avoid creating a round if program does not exist
    log.warning("--> handleRoundCreated {} : program {} is null", [
      roundContractAddress.toHex(),
      programContractAddress,
    ]);
    return;
  }
  round.program = program.id;

  // link round to votingStrategy
  const votingStrategyAddress = roundContract.votingStrategy().toHex();
  const votingStrategy = VotingStrategy.load(votingStrategyAddress);
  if (!votingStrategy) {
    // avoid creating a round if votingStrategy does not exist
    log.warning("--> handleRoundCreated {} : votingStrategy {} is null", [
      roundContractAddress.toHex(),
      votingStrategyAddress,
    ]);
    return;
  }
  round.votingStrategy = votingStrategy.id;

  // Initialize Quadratic Tipping
  let quadraticTipping = QuadraticTipping.load(roundContractAddress.toHex());

  if (!quadraticTipping) {
    let quadraticTipping: QuadraticTipping = new QuadraticTipping(
      roundContractAddress.toHex()
    );

    quadraticTipping.id = round.id;
    quadraticTipping.round = round.id;
    quadraticTipping.matchAmount = BigInt.fromI32(0);
    quadraticTipping.votes = [];
    quadraticTipping.distributions = [];
    quadraticTipping.batchPayoutCompleted = false;
    quadraticTipping.readyForPayout = false;
    quadraticTipping.save();
  }
  let quadraticTippingDistribution: QuadraticTippingDistribution =
    new QuadraticTippingDistribution(roundContractAddress.toHex());
  quadraticTippingDistribution.id = round.id;
  quadraticTippingDistribution.round = round.id;
  quadraticTippingDistribution.address = "";
  quadraticTippingDistribution.amount = BigInt.fromI32(0);
  quadraticTippingDistribution.projectId = "";
  quadraticTippingDistribution.token = "";
  quadraticTippingDistribution.save();

  // set timestamp
  round.createdAt = event.block.timestamp;
  round.updatedAt = event.block.timestamp;
  round.save();
  RoundImplementation.create(roundContractAddress);
}
