import programFactory from "./programFactory";
import programImplementation from "./programImplementation";
import projectRegistry from "./projectRegistry";
import roundFactory from "./roundFactory";
import roundImplementation from "./roundImplementation";
import qfVotingStrategyFactory from "./votingStrategy/qfVotingStrategyFactory";
import qfRelayStrategyFactory from "./votingStrategy/qfRelayStrategyFactory";
import merklePayoutStrategy from "./payoutStrategy/merklePayoutStrategy";
import merklePayoutStrategyFactory from "./payoutStrategy/merklePayoutStrategyFactory";
import erc20Abi from "./erc20";

const abi = {
  // External
  projectRegistry,

  // Program
  programFactory,
  programImplementation,

  // Round
  roundFactory,
  roundImplementation,

  // VotingStrategy
  qfVotingStrategyFactory,

  // VotingRelayStrategy
  qfRelayStrategyFactory,

  // PayoutStrategy
  merklePayoutStrategy,
  merklePayoutStrategyFactory,

  erc20Abi,
};

export default abi;
