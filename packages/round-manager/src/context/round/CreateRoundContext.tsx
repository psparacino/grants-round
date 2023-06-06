import {
  ProgressStatus,
  Round,
  StorageProtocolID,
  VotingStrategy,
} from "../../features/api/types";
import React, {
  createContext,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { saveToIPFS } from "../../features/api/ipfs";
import { useWallet } from "../../features/common/Auth";
import {
  deployRoundContract,
  transferFundsToRound,
  updateRoundMatchAmount,
} from "../../features/api/round";
import { waitForSubgraphSyncTo } from "../../features/api/subgraph";
import { SchemaQuestion } from "../../features/api/utils";
import { datadogLogs } from "@datadog/browser-logs";
import { Signer } from "@ethersproject/abstract-signer";
import { deployQFVotingContract } from "../../features/api/votingStrategy/qfVotingStrategy";
import { deployQFRelayContract } from "../../features/api/votingStrategy/qfRelayStrategy";
import { deployMerklePayoutStrategyContract } from "../../features/api/payoutStrategy/merklePayoutStrategy";
import { BigNumberish } from "ethers";
import { updateDefenderSentinel } from "../../features/api/defender";

type SetStatusFn = React.Dispatch<SetStateAction<ProgressStatus>>;

export interface CreateRoundState {
  IPFSCurrentStatus: ProgressStatus;
  setIPFSCurrentStatus: SetStatusFn;
  votingContractDeploymentStatus: ProgressStatus;
  setVotingContractDeploymentStatus: SetStatusFn;
  payoutContractDeploymentStatus: ProgressStatus;
  setPayoutContractDeploymentStatus: SetStatusFn;
  roundContractDeploymentStatus: ProgressStatus;
  setRoundContractDeploymentStatus: SetStatusFn;
  roundTransferFundsStatus: ProgressStatus;
  setRoundTransferFundsStatus: SetStatusFn;
  roundUpdateMatchAmountStatus: ProgressStatus;
  setRoundUpdateMatchAmountStatus: SetStatusFn;
  defenderUpdateSentinelStatus: ProgressStatus;
  setDefenderUpdateSentinelStatus: SetStatusFn;
  indexingStatus: ProgressStatus;
  setIndexingStatus: SetStatusFn;
}

export type CreateRoundData = {
  roundMetadataWithProgramContractAddress: Round["roundMetadata"];
  applicationQuestions: {
    lastUpdatedOn: number;
    applicationSchema: SchemaQuestion[];
  };
  round: Round;
  votingStrategy: VotingStrategy;
};

export const initialCreateRoundState: CreateRoundState = {
  IPFSCurrentStatus: ProgressStatus.NOT_STARTED,
  setIPFSCurrentStatus: () => {
    /* provided in CreateRoundProvider */
  },
  votingContractDeploymentStatus: ProgressStatus.NOT_STARTED,
  setVotingContractDeploymentStatus: () => {
    /* provided in CreateRoundProvider */
  },
  payoutContractDeploymentStatus: ProgressStatus.NOT_STARTED,
  setPayoutContractDeploymentStatus: () => {
    /* provided in CreateRoundProvider */
  },
  roundContractDeploymentStatus: ProgressStatus.NOT_STARTED,
  setRoundContractDeploymentStatus: () => {
    /* provided in CreateRoundProvider */
  },
  roundTransferFundsStatus: ProgressStatus.NOT_STARTED,
  setRoundTransferFundsStatus: () => {
    /* provided in CreateRoundProvider */
  },
  roundUpdateMatchAmountStatus: ProgressStatus.NOT_STARTED,
  setRoundUpdateMatchAmountStatus: () => {
    /* provided in CreateRoundProvider */
  },
  defenderUpdateSentinelStatus: ProgressStatus.NOT_STARTED,
  setDefenderUpdateSentinelStatus: () => {
    /* provided in CreateRoundProvider */
  },
  indexingStatus: ProgressStatus.NOT_STARTED,
  setIndexingStatus: () => {
    /* provided in CreateRoundProvider */
  },
};

export const CreateRoundContext = createContext<CreateRoundState>(
  initialCreateRoundState
);

export const CreateRoundProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [IPFSCurrentStatus, setIPFSCurrentStatus] = useState(
    initialCreateRoundState.IPFSCurrentStatus
  );
  const [votingContractDeploymentStatus, setVotingContractDeploymentStatus] =
    useState(initialCreateRoundState.votingContractDeploymentStatus);
  const [payoutContractDeploymentStatus, setPayoutContractDeploymentStatus] =
    useState(initialCreateRoundState.payoutContractDeploymentStatus);
  const [roundContractDeploymentStatus, setRoundContractDeploymentStatus] =
    useState(initialCreateRoundState.roundContractDeploymentStatus);
  const [roundTransferFundsStatus, setRoundTransferFundsStatus] = useState(
    initialCreateRoundState.roundTransferFundsStatus
  );
  const [roundUpdateMatchAmountStatus, setRoundUpdateMatchAmountStatus] =
    useState(initialCreateRoundState.roundUpdateMatchAmountStatus);
  const [defenderUpdateSentinelStatus, setDefenderUpdateSentinelStatus] =
    useState(initialCreateRoundState.defenderUpdateSentinelStatus);
  const [indexingStatus, setIndexingStatus] = useState(
    initialCreateRoundState.indexingStatus
  );

  const providerProps: CreateRoundState = {
    IPFSCurrentStatus,
    setIPFSCurrentStatus,
    votingContractDeploymentStatus,
    setVotingContractDeploymentStatus,
    payoutContractDeploymentStatus,
    setPayoutContractDeploymentStatus,
    roundContractDeploymentStatus,
    setRoundContractDeploymentStatus,
    roundTransferFundsStatus,
    setRoundTransferFundsStatus,
    roundUpdateMatchAmountStatus,
    setRoundUpdateMatchAmountStatus,
    defenderUpdateSentinelStatus,
    setDefenderUpdateSentinelStatus,
    indexingStatus,
    setIndexingStatus,
  };

  return (
    <CreateRoundContext.Provider value={providerProps}>
      {children}
    </CreateRoundContext.Provider>
  );
};

interface _createRoundParams {
  context: CreateRoundState;
  signerOrProvider: Signer;
  createRoundData: CreateRoundData;
}

const _createRound = async ({
  context,
  signerOrProvider,
  createRoundData,
}: _createRoundParams) => {
  const {
    setIPFSCurrentStatus,
    setVotingContractDeploymentStatus,
    setPayoutContractDeploymentStatus,
    setRoundContractDeploymentStatus,
    setRoundTransferFundsStatus,
    setRoundUpdateMatchAmountStatus,
    setDefenderUpdateSentinelStatus,
    setIndexingStatus,
  } = context;
  const {
    roundMetadataWithProgramContractAddress,
    applicationQuestions,
    round,
    votingStrategy,
  } = createRoundData;
  try {
    datadogLogs.logger.info(`_createRound: ${round}`);

    const { roundMetadataIpfsHash, applicationSchemaIpfsHash } =
      await storeDocuments(
        setIPFSCurrentStatus,
        roundMetadataWithProgramContractAddress,
        applicationQuestions
      );

    const roundContractInputsWithPointers = {
      ...round,
      store: {
        protocol: StorageProtocolID.IPFS,
        pointer: roundMetadataIpfsHash,
      },
      applicationStore: {
        protocol: StorageProtocolID.IPFS,
        pointer: applicationSchemaIpfsHash,
      },
    };

    const votingContractAddress = await handleDeployVotingContract(
      setVotingContractDeploymentStatus,
      signerOrProvider,
      votingStrategy
    );

    const payoutContractAddress = await handleDeployPayoutContract(
      setPayoutContractDeploymentStatus,
      signerOrProvider
    );

    const roundContractInputsWithContracts = {
      ...roundContractInputsWithPointers,
      votingStrategy: votingContractAddress,
      payoutStrategy: payoutContractAddress,
    };

    const { roundAddress, transactionBlockNumber } =
      await handleDeployRoundContract(
        setRoundContractDeploymentStatus,
        roundContractInputsWithContracts,
        signerOrProvider
      );

    await handleTransferFundsToRound(
      setRoundTransferFundsStatus,
      roundMetadataWithProgramContractAddress?.matchingFunds
        ?.matchingFundsAvailable || 0,
      roundAddress!,
      round.token,
      signerOrProvider
    );

    await handleUpdateRoundMatchAmount(
      setRoundUpdateMatchAmountStatus,
      roundAddress!,
      roundMetadataWithProgramContractAddress?.matchingFunds
        ?.matchingFundsAvailable || 0,
      signerOrProvider
    );

    await handleUpdateDefenderSentinel(
      setDefenderUpdateSentinelStatus,
      votingContractAddress
    );

    await waitForSubgraphToUpdate(
      setIndexingStatus,
      signerOrProvider,
      transactionBlockNumber
    );
  } catch (error) {
    datadogLogs.logger.error(
      `error: _createRound ${error}. Data : ${createRoundData}`
    );

    console.error("_createRound", error);
  }
};

export const useCreateRound = () => {
  const context = useContext(CreateRoundContext);
  if (context === undefined) {
    throw new Error("useCreateRound must be used within a CreateRoundProvider");
  }

  const {
    setIPFSCurrentStatus,
    setVotingContractDeploymentStatus,
    setPayoutContractDeploymentStatus,
    setRoundContractDeploymentStatus,
    setRoundTransferFundsStatus,
    setRoundUpdateMatchAmountStatus,
    setIndexingStatus,
  } = context;
  const { signer: walletSigner } = useWallet();

  const createRound = (createRoundData: CreateRoundData) => {
    resetToInitialState(
      setIPFSCurrentStatus,
      setVotingContractDeploymentStatus,
      setPayoutContractDeploymentStatus,
      setRoundContractDeploymentStatus,
      setRoundTransferFundsStatus,
      setRoundUpdateMatchAmountStatus,
      setIndexingStatus
    );

    return _createRound({
      context,
      signerOrProvider: walletSigner as Signer,
      createRoundData,
    });
  };

  return {
    createRound,
    IPFSCurrentStatus: context.IPFSCurrentStatus,
    votingContractDeploymentStatus: context.votingContractDeploymentStatus,
    payoutContractDeploymentStatus: context.payoutContractDeploymentStatus,
    roundContractDeploymentStatus: context.roundContractDeploymentStatus,
    roundTransferFundsStatus: context.roundTransferFundsStatus,
    roundUpdateMatchAmountStatus: context.roundUpdateMatchAmountStatus,
    defenderUpdateSentinelStatus: context.defenderUpdateSentinelStatus,
    indexingStatus: context.indexingStatus,
  };
};

function resetToInitialState(
  setStoringStatus: SetStatusFn,
  setVotingDeployingStatus: SetStatusFn,
  setPayoutDeployingStatus: SetStatusFn,
  setDeployingStatus: SetStatusFn,
  setRoundTransferFundsStatus: SetStatusFn,
  setRoundUpdateMatchStatus: SetStatusFn,
  setIndexingStatus: SetStatusFn
): void {
  setStoringStatus(initialCreateRoundState.IPFSCurrentStatus);
  setVotingDeployingStatus(
    initialCreateRoundState.votingContractDeploymentStatus
  );
  setPayoutDeployingStatus(
    initialCreateRoundState.payoutContractDeploymentStatus
  );
  setDeployingStatus(initialCreateRoundState.roundContractDeploymentStatus);
  setRoundTransferFundsStatus(initialCreateRoundState.roundTransferFundsStatus);
  setRoundUpdateMatchStatus(
    initialCreateRoundState.roundUpdateMatchAmountStatus
  );
  setIndexingStatus(initialCreateRoundState.indexingStatus);
}

async function storeDocuments(
  setStoringStatus: SetStatusFn,
  roundMetadataWithProgramContractAddress: CreateRoundData["roundMetadataWithProgramContractAddress"],
  applicationQuestions: CreateRoundData["applicationQuestions"]
) {
  try {
    setStoringStatus(ProgressStatus.IN_PROGRESS);

    const [roundMetadataIpfsHash, applicationSchemaIpfsHash] =
      await Promise.all([
        saveToIPFS({
          content: roundMetadataWithProgramContractAddress,
          metadata: {
            name: "round-metadata",
          },
        }),
        saveToIPFS({
          content: applicationQuestions,
          metadata: {
            name: "application-schema",
          },
        }),
      ]);

    setStoringStatus(ProgressStatus.IS_SUCCESS);

    return {
      roundMetadataIpfsHash,
      applicationSchemaIpfsHash,
    };
  } catch (error) {
    console.error("storeDocuments", error);

    setStoringStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleDeployVotingContract(
  setDeploymentStatus: SetStatusFn,
  signerOrProvider: Signer,
  votingStrategy: VotingStrategy
): Promise<string> {
  try {
    setDeploymentStatus(ProgressStatus.IN_PROGRESS);
    const { votingContractAddress } =
      votingStrategy === "QFVoting"
        ? await deployQFVotingContract(signerOrProvider)
        : await deployQFRelayContract(signerOrProvider);

    setDeploymentStatus(ProgressStatus.IS_SUCCESS);
    return votingContractAddress;
  } catch (error) {
    console.error("handleDeployVotingContract", error);
    setDeploymentStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleDeployPayoutContract(
  setDeploymentStatus: SetStatusFn,
  signerOrProvider: Signer
): Promise<string> {
  try {
    setDeploymentStatus(ProgressStatus.IN_PROGRESS);
    const { payoutContractAddress } = await deployMerklePayoutStrategyContract(
      signerOrProvider
    );

    setDeploymentStatus(ProgressStatus.IS_SUCCESS);
    return payoutContractAddress;
  } catch (error) {
    console.error("handleDeployPayoutContract", error);
    setDeploymentStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleDeployRoundContract(
  setDeploymentStatus: SetStatusFn,
  round: Round,
  signerOrProvider: Signer
) {
  try {
    setDeploymentStatus(ProgressStatus.IN_PROGRESS);
    const result = await deployRoundContract(round, signerOrProvider);

    setDeploymentStatus(ProgressStatus.IS_SUCCESS);

    return result;
  } catch (error) {
    console.error("handleDeployRoundContract", error);
    setDeploymentStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleUpdateRoundMatchAmount(
  setDeploymentStatus: SetStatusFn,
  roundId: string,
  amount: BigNumberish,
  signerOrProvider: Signer
) {
  try {
    setDeploymentStatus(ProgressStatus.IN_PROGRESS);
    const { transactionBlockNumber } = await updateRoundMatchAmount(
      roundId,
      amount,
      signerOrProvider
    );

    setDeploymentStatus(ProgressStatus.IS_SUCCESS);
    return transactionBlockNumber;
  } catch (error) {
    console.error("updateMatchAmount", error);
    setDeploymentStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleUpdateDefenderSentinel(
  setDefenderUpdateSentinelStatus: SetStatusFn,
  votingContractAddress: string
) {
  try {
    setDefenderUpdateSentinelStatus(ProgressStatus.IN_PROGRESS);
    const success = await updateDefenderSentinel(votingContractAddress);

    setDefenderUpdateSentinelStatus(ProgressStatus.IS_SUCCESS);
    return success;
  } catch (error) {
    console.error("updateDefenderSentinel", error);
    setDefenderUpdateSentinelStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function handleTransferFundsToRound(
  setDeploymentStatus: SetStatusFn,
  amount: BigNumberish,
  roundId: string,
  tokenAddress: string,
  signerOrProvider: Signer
) {
  try {
    setDeploymentStatus(ProgressStatus.IN_PROGRESS);
    const { transactionBlockNumber } = await transferFundsToRound(
      amount,
      roundId,
      tokenAddress,
      signerOrProvider
    );

    setDeploymentStatus(ProgressStatus.IS_SUCCESS);
    return transactionBlockNumber;
  } catch (error) {
    console.error("handleTransferFundsToRound", error);
    setDeploymentStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}

async function waitForSubgraphToUpdate(
  setIndexingStatus: SetStatusFn,
  signerOrProvider: Signer,
  transactionBlockNumber: number
) {
  try {
    setIndexingStatus(ProgressStatus.IN_PROGRESS);

    const chainId = await signerOrProvider.getChainId();
    await waitForSubgraphSyncTo(chainId, transactionBlockNumber);

    setIndexingStatus(ProgressStatus.IS_SUCCESS);
  } catch (error) {
    console.error("waitForSubgraphToUpdate", error);
    setIndexingStatus(ProgressStatus.IS_ERROR);
    throw error;
  }
}
