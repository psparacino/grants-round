import { ethers, Signer } from "ethers";
import { QFDistribution } from "../api";
import { Web3Provider } from "@ethersproject/providers";
import { generateStandardMerkleTree } from "../utils";
import { merklePayoutStrategy } from "../contracts";
import merklePayoutStrategyAbi from "../abi/payoutStrategy/merklePayoutStrategy";

/**
 * Deploys a QFVotingStrategy contract by invoking the
 * create on QuadraticFundingVotingStrategyFactory contract
 *
 * @param signerOrProvider
 * @returns
 */
export const deployMerklePayoutStrategyContract = async (
  signerOrProvider: Signer
): Promise<{ payoutContractAddress: string }> => {
  try {
    const chainId = await signerOrProvider.getChainId();
    const { address, abi } = merklePayoutStrategy(chainId);

    const payoutStrategyFactory = new ethers.Contract(
      address,
      abi,
      signerOrProvider
    );

    // Deploy a new MerklePayoutStrategy contract
    const tx = await payoutStrategyFactory.create();
    const receipt = await tx.wait();

    let payoutContractAddress;

    if (receipt.events) {
      const event = receipt.events.find(
        (e: { event: string }) => e.event === "PayoutContractCreated"
      );
      if (event && event.args) {
        payoutContractAddress = event.args.payoutContractAddress;
      }
    } else {
      throw new Error("No PayoutStrategyCreated event");
    }

    console.log("✅ Merkle Payout Transaction hash: ", receipt.transactionHash);
    console.log("✅ Merkle Payout Strategy address: ", payoutContractAddress);

    return { payoutContractAddress };
  } catch (error) {
    console.error("deployMerklePayoutStrategyContract", error);
    throw new Error("Unable to deploy merkle payout strategy contract");
  }
};

export async function finalizeRoundToContract({
  payoutStrategyAddress,
  encodedDistribution,
  signerOrProvider,
}: FinalizeRoundToContractProps) {
  try {
    const merklePayoutImplementation = new ethers.Contract(
      payoutStrategyAddress,
      merklePayoutStrategyAbi,
      signerOrProvider
    );

    const isReadyForPayout =
      await merklePayoutImplementation.isReadyForPayout();

    if (isReadyForPayout) {
      console.log("✅ Merkle Payout Strategy is ready for payout");
      return {
        transactionBlockNumber: undefined,
      };
    }

    // Finalize round
    const tx = await merklePayoutImplementation.updateDistribution(
      encodedDistribution
    );
    const receipt = await tx.wait();

    console.log("✅ Update distribution transaction hash: ", tx.hash);

    const blockNumber = receipt.blockNumber;
    return {
      transactionBlockNumber: blockNumber,
    };
  } catch (error) {
    console.error("finalizeRoundToContract", error);
    throw new Error("Unable to finalize Round");
  }
}

interface FinalizeRoundToContractProps {
  payoutStrategyAddress: string;
  encodedDistribution: string;
  signerOrProvider: Signer;
}

export async function handlePayout(
  payoutStrategyAddress: string,
  distribution: QFDistribution[],
  signerOrProvider: Web3Provider
) {
  const { tree, values } = generateStandardMerkleTree(distribution);
  const payouts = values.map((value) => {
    const [grantee, amount, projectId] = value;
    const merkleProof = tree.getProof(value);
    return {
      grantee,
      amount,
      merkleProof,
      projectId,
    };
  });

  const merklePayoutImplementation = new ethers.Contract(
    payoutStrategyAddress,
    merklePayoutStrategyAbi,
    signerOrProvider
  );

  // Finalize round
  const tx = await merklePayoutImplementation.payout(payouts);
  const receipt = await tx.wait();

  return {
    transactionBlockNumber: receipt.blockNumber,
  };
}
