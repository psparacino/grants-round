/** MerklePayoutStrategy contract ABI in Human Readable ABI Format  */

const merklePayoutStrategy = [
  "event BatchPayoutSuccessful(address indexed sender)",
  "event DistributionUpdated(bytes32 merkleRoot, tuple(uint256 protocol, string pointer) distributionMetaPtr)",
  "event FundsDistributed(uint256 amount, address grantee, address indexed token, bytes32 indexed projectId)",
  "event FundsWithdrawn(address indexed tokenAddress, uint256 amount, address withdrawAddress)",
  "event Initialized(uint8 version)",
  "event ReadyForPayout()",
  "function ROUND_OPERATOR_ROLE() view returns (bytes32)",
  "function distributionMetaPtr() view returns (uint256 protocol, string pointer)",
  "function init()",
  "function initialize()",
  "function isDistributionSet() view returns (bool)",
  "function isReadyForPayout() view returns (bool)",
  "function merkleRoot() view returns (bytes32)",
  "function payout(tuple(address grantee, uint256 amount, bytes32[] merkleProof, bytes32 projectId)[] _distributions) payable",
  "function roundAddress() view returns (address)",
  "function setReadyForPayout() payable",
  "function tokenAddress() view returns (address)",
  "function updateDistribution(bytes encodedDistribution)",
  "function withdrawFunds(address withdrawAddress) payable"
];

export default merklePayoutStrategy;
