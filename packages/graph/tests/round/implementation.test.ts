import {
  test,
  newMockEvent,
  describe,
  beforeEach,
  clearStore,
  afterEach,
  assert,
} from "matchstick-as/assembly/index";

import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import {
  handleEscrowFundsToPayoutContract,
  handleMatchAmountUpdated,
} from "../../src/round/implementation";
import {
  EscrowFundsToPayoutContract as EscrowFundsToPayoutContractEvent,
  MatchAmountUpdated as MatchAmountUpdatedEvent,
} from "../../generated/templates/RoundImplementation/RoundImplementation";
import { QuadraticTipping } from "../../generated/schema";

let newEscrowFundsToContractEvent: EscrowFundsToPayoutContractEvent;

const roundContractAddress: Address = Address.fromString(
  "0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55"
);

function createNewEscrowFundsToContractEvent(): EscrowFundsToPayoutContractEvent {
  let matchFromEscrow = BigInt.fromString("123456789");

  const matchAmountParam = new ethereum.EventParam(
    "matchAmount",
    ethereum.Value.fromUnsignedBigInt(matchFromEscrow)
  );

  const newEscrowFundsToContractEvent =
    changetype<EscrowFundsToPayoutContractEvent>(newMockEvent());

  newEscrowFundsToContractEvent.address = roundContractAddress;

  newEscrowFundsToContractEvent.parameters.push(matchAmountParam);

  return newEscrowFundsToContractEvent;
}

describe("Match Amount Tests in Round Implementation", () => {
  beforeEach(() => {
    let quadraticTippingEntity = new QuadraticTipping(
      roundContractAddress.toHex()
    );

    quadraticTippingEntity.id = roundContractAddress.toHex();
    quadraticTippingEntity.round = roundContractAddress.toHex();
    quadraticTippingEntity.matchAmount = BigInt.fromString("0");
    quadraticTippingEntity.votes = [];
    quadraticTippingEntity.distributions = [];
    quadraticTippingEntity.batchPayoutCompleted = false;
    quadraticTippingEntity.readyForPayout = false;
    quadraticTippingEntity.save();

    newEscrowFundsToContractEvent = createNewEscrowFundsToContractEvent();
  });

  afterEach(() => {
    clearStore();
  });

  test("match amount set when escrow funds are sent to round contract", () => {
    handleEscrowFundsToPayoutContract(newEscrowFundsToContractEvent);

    assert.fieldEquals(
      "QuadraticTipping",
      roundContractAddress.toHex(),
      "matchAmount",
      "123456789"
    );
  });

  test("match amount updated when handleMatchAmountUpdated is called", () => {
    let newMatchAmount = BigInt.fromString("987654321");
    const matchAmountParam = new ethereum.EventParam(
      "matchAmount",
      ethereum.Value.fromUnsignedBigInt(newMatchAmount)
    );
    const newMatchAmountUpdatedEvent = changetype<MatchAmountUpdatedEvent>(
      newMockEvent()
    );
    newMatchAmountUpdatedEvent.parameters.push(matchAmountParam);

    newMatchAmountUpdatedEvent.address = roundContractAddress;

    handleMatchAmountUpdated(newMatchAmountUpdatedEvent);

    assert.fieldEquals(
      "QuadraticTipping",
      roundContractAddress.toHex(),
      "matchAmount",
      "987654321"
    );
  });
});
