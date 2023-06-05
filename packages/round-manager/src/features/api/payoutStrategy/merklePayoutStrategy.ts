import { ethers, Signer } from "ethers";
import { merklePayoutStrategy } from "../contracts";

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
