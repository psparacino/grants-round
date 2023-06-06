import {
  test,
  newMockEvent,
  describe,
  beforeEach,
  afterAll,
  beforeAll,
  clearStore,
  assert,
  createMockedFunction,
  log
} from "matchstick-as/assembly/index";

import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { handlePayoutContractCreated } from "../../src/payout/factory";
import { PayoutContractCreated } from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyFactory";
import { QuadraticTipping } from "../../generated/schema";

const roundContractAddress: Address = Address.fromString(
  "0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55"
);

describe("handlePayoutContractCreated", () => {
  beforeAll(() => {
    createMockedFunction(
      roundContractAddress,
      "roundAddress",
      "roundAddress():(address)"
    ).returns([ethereum.Value.fromAddress(roundContractAddress)]);
  });
  test("new payout contract created", () => {
    const payoutContractCreatedEvent = changetype<PayoutContractCreated>(
      newMockEvent()
    );

    const cloneParam = new ethereum.EventParam(
      "clone",
      ethereum.Value.fromAddress(
        Address.fromString("0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55")
      )
    );
    const payoutContractParam = new ethereum.EventParam(
      "payoutContract",
      ethereum.Value.fromAddress(
        Address.fromString("0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55")
      )
    );

    payoutContractCreatedEvent.parameters.push(cloneParam);
    payoutContractCreatedEvent.parameters.push(payoutContractParam);

    const payoutContractAddress = Address.fromString(
      "0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55"
    );

    payoutContractCreatedEvent.address = payoutContractAddress;

    handlePayoutContractCreated(payoutContractCreatedEvent);

    const quadraticTipping = QuadraticTipping.load(
      payoutContractAddress.toHex()
    );

    assert.assertNotNull(quadraticTipping);
    assert.entityCount("QuadraticTipping", 1);
  });
});
