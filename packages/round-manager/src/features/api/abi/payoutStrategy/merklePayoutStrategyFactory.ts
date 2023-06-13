const merklePayoutStrategyFactoryAbi = [
  "event Initialized(uint8 version)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event PayoutContractCreated(address indexed payoutContractAddress, address indexed payoutImplementation)",
  "event PayoutImplementationUpdated(address merklePayoutStrategyAddress)",
  "function create() returns (address)",
  "function initialize()",
  "function nonce() view returns (uint256)",
  "function owner() view returns (address)",
  "function payoutImplementation() view returns (address)",
  "function renounceOwnership()",
  "function transferOwnership(address newOwner)",
  "function updatePayoutImplementation(address newPayoutImplementation)",
];

export default merklePayoutStrategyFactoryAbi;
