import {fetchRoundMetadata,  } from "../utils";
import {ChainId} from "../types";
import {VotingStrategy} from "@prisma/client";
import {db} from "../database";
import {getRoundSummary} from "../handlers/updateRoundSummaryHandler";

export const updateRoundSummary = async (chainId: ChainId, _roundId: string) => {
  let result: any;
  const roundId = _roundId.toLowerCase();
  const metadata = await fetchRoundMetadata(chainId as ChainId, roundId);
  const { votingStrategy } = metadata;

  const votingStrategyName = votingStrategy.strategyName as VotingStrategy;

  // throw error if voting strategy is not supported
  if (votingStrategyName !== VotingStrategy.LINEAR_QUADRATIC_FUNDING) {
    throw "error: unsupported voting strategy";
  }

  const results = await getRoundSummary(
    chainId as ChainId,
    roundId,
    metadata
  );
  try {
    const upsertRoundStatus = await db.upsertRoundSummaryRecord(
      chainId,
      roundId,
      metadata,
      results
    );
    if (upsertRoundStatus.error) {
      throw upsertRoundStatus.error;
    }

    const roundSummary = await db.getRoundSummaryRecord(roundId);
    if (roundSummary.error) {
      throw roundSummary.error;
    }

    result = roundSummary.result;
  } catch (error) {
    console.error("updateRoundSummaryHandler", error);
    const dbFailResults = {
      id: null,
      createdAt: null,
      updatedAt: new Date(),
      ...results,
      roundId: roundId,
    };
    result = dbFailResults;
  }

  return result;
}