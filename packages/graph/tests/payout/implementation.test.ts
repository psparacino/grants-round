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
} from "matchstick-as/assembly/index";

import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
  handleReadyForPayout,
  handleBatchPayoutSuccessful,
  handleFundsDistributed,
} from "../../src/payout/implementation";
import {
  ReadyForPayout as ReadyForPayoutEvent,
  BatchPayoutSuccessful as BatchPayoutSuccessfulEvent,
  FundsDistributed as FundsDistributedEvent,
} from "../../generated/MerklePayoutStrategyFactory/MerklePayoutStrategyImplementation";
import {
  QuadraticTipping,
  QuadraticTippingDistribution,
} from "../../generated/schema";

const roundContractAddress: Address = Address.fromString(
  "0x61ca4EB8a3aACA536c27172c96a453a5a7e47C55"
);

describe("MerkleStrategyImplementation Tests", () => {
  beforeAll(() => {
    createMockedFunction(
      roundContractAddress,
      "roundAddress",
      "roundAddress():(address)"
    ).returns([ethereum.Value.fromAddress(roundContractAddress)]);
  });

  beforeEach(() => {
    const quadraticTipping = new QuadraticTipping(roundContractAddress.toHex());

    quadraticTipping.id = roundContractAddress.toHex();
    quadraticTipping.round = roundContractAddress.toHex();
    quadraticTipping.matchAmount = BigInt.fromString("0");
    quadraticTipping.votes = [];
    quadraticTipping.distributions = [];
    quadraticTipping.batchPayoutCompleted = false;
    quadraticTipping.readyForPayout = false;
    quadraticTipping.save();

    const quadraticTippingDistribution = new QuadraticTippingDistribution(
      roundContractAddress.toHex()
    );
    quadraticTippingDistribution.id = roundContractAddress.toHex();
    quadraticTippingDistribution.round = roundContractAddress.toHex();
    quadraticTippingDistribution.amount = BigInt.fromString("0");
    quadraticTippingDistribution.address =
      "0x0000000000000000000000000000000000000000";
    quadraticTippingDistribution.token =
      "0x0000000000000000000000000000000000000000";
    quadraticTippingDistribution.projectId = "0x0000";
    quadraticTippingDistribution.save();
  });

  afterAll(() => {
    clearStore();
  });

  test("readyForPayout updated when handleReadyForPayout is called", () => {
    let newReadyForPayout = true;
    const readyForPayoutParam = new ethereum.EventParam(
      "readyForPayout",
      ethereum.Value.fromBoolean(newReadyForPayout)
    );
    const newReadyForPayoutEvent = changetype<ReadyForPayoutEvent>(
      newMockEvent()
    );
    newReadyForPayoutEvent.parameters.push(readyForPayoutParam);
    newReadyForPayoutEvent.address = roundContractAddress;
    handleReadyForPayout(newReadyForPayoutEvent);

    assert.fieldEquals(
      "QuadraticTipping",
      roundContractAddress.toHex(),
      "readyForPayout",
      "true"
    );
  });

  test("batchPayoutCompleted updated when handleBatchPayoutSuccessful is called", () => {
    let newBatchPayoutCompleted = true;
    const batchPayoutCompletedParam = new ethereum.EventParam(
      "batchPayoutCompleted",
      ethereum.Value.fromBoolean(newBatchPayoutCompleted)
    );
    const newBatchPayoutSuccessfulEvent =
      changetype<BatchPayoutSuccessfulEvent>(newMockEvent());
    newBatchPayoutSuccessfulEvent.parameters.push(batchPayoutCompletedParam);
    newBatchPayoutSuccessfulEvent.address = roundContractAddress;
    handleBatchPayoutSuccessful(newBatchPayoutSuccessfulEvent);

    assert.fieldEquals(
      "QuadraticTipping",
      roundContractAddress.toHex(),
      "batchPayoutCompleted",
      "true"
    );
  });

  test("quadraticTippingDistribution is updated on handleFundsDistributed", () => {
    const distributionAmount = BigInt.fromString("123456789");
    const amountParam = new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(distributionAmount)
    );
    const distributionGrantee = Address.fromString(
      "0xc0ffee254729296a45a3885639AC7E10F9d54979"
    );
    const granteeParam = new ethereum.EventParam(
      "grantee",
      ethereum.Value.fromAddress(distributionGrantee)
    );
    const distributionToken = Address.fromString(
      "0x999999cf1046e68e36E1aA2E0E07105eDDD1f08E"
    );
    const tokenParam = new ethereum.EventParam(
      "token",
      ethereum.Value.fromAddress(distributionToken)
    );
    const distributionProjectId = Bytes.fromHexString("0x0170");
    const projectIdParam = new ethereum.EventParam(
      "projectId",
      ethereum.Value.fromBytes(distributionProjectId)
    );

    const newFundsDistributedEvent = changetype<FundsDistributedEvent>(
      newMockEvent()
    );

    newFundsDistributedEvent.address = roundContractAddress;

    newFundsDistributedEvent.parameters.push(amountParam);
    newFundsDistributedEvent.parameters.push(granteeParam);
    newFundsDistributedEvent.parameters.push(tokenParam);
    newFundsDistributedEvent.parameters.push(projectIdParam);

    handleFundsDistributed(newFundsDistributedEvent);

    const quadraticTippingEntity = QuadraticTipping.load(
      roundContractAddress.toHex()
    );

    const distributions = QuadraticTippingDistribution.load(
      quadraticTippingEntity!.distributions[0]
    );

    assert.fieldEquals(
      "QuadraticTippingDistribution",
      distributions!.id,
      "amount",
      distributionAmount.toString()
    );

    assert.fieldEquals(
      "QuadraticTippingDistribution",
      distributions!.id,
      "address",
      distributionGrantee.toString()
    );
    assert.fieldEquals(
      "QuadraticTippingDistribution",
      distributions!.id,
      "token",
      distributionToken.toString()
    );
    assert.fieldEquals(
      "QuadraticTippingDistribution",
      distributions!.id,
      "projectId",
      distributionProjectId.toString()
    );
  });
});
