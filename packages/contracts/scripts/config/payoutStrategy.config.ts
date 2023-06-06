// Update this file any time a new Payout Strategy contract has been added
type PayoutStrategies = {
  merklePayoutStrategyFactory?: string;
  merklePayoutStrategyImplementation?: string;
  merklePayoutContract?: string;
};

type DeployParams = Record<string, PayoutStrategies>;

export const PayoutParams: DeployParams = {
  mainnet: {
    merklePayoutContract: "0xC068C0EAF90533D3817a1782847eAA6719ABB6c7",
  },
  goerli: {
    merklePayoutContract: "0xEC041ea461a59B355671CC1F87c904519375A6FD",
  },
  "optimism-mainnet": {
    merklePayoutContract: "0x835A581472Ce6a1f1108d9484567a2162C9959C8",
  },
  "fantom-mainnet": {
    merklePayoutContract: "0xB5CF3fFD3BDfC6A124aa9dD96fE14118Ed8083e5",
  },
  "fantom-testnet": {
    merklePayoutContract: "0xcaC94621584a1a0121c0B5664A9FFB0B86588B8a",
  },
  "polygon-mumbai": {
    merklePayoutStrategyFactory: "0xa558eC037B858BbaBBd32f70754c4C818d7835b7",
    merklePayoutStrategyImplementation:
      "0xFC6B95AC4bd5e94DFa16d9952532F35701be8db5",
    merklePayoutContract:
      "0x6B40c07A3E61eFe37be42e215C4D1E74394d9f97",
  },
};
