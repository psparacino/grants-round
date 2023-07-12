import { fetchRoundMetadata, getChainVerbose } from "../utils";
import {
  ChainId,
  MostRecentTip,
  QFContribution,
  QFDistribution,
  QFDistributionResults
} from "../types";
import { VotingStrategy } from "@prisma/client";
import {
  fetchQFContributionsForRound,
  matchQFContributions
} from "../votingStrategies/linearQuadraticFunding";
import { hotfixForRounds } from "../hotfixes";
import { db } from "../database";

export const updateRoundMatch = async (chainId: ChainId, _roundId: string) => {
  let results: QFDistributionResults | undefined;

  const roundId = _roundId.toLowerCase();
  const metadata = await fetchRoundMetadata(chainId as ChainId, roundId);
  const { votingStrategy } = metadata;

  const votingStrategyName = votingStrategy.strategyName as VotingStrategy;

  const chainIdVerbose = getChainVerbose(chainId);

  let contributions: QFContribution[] = [];
  switch (votingStrategyName) {
    case "LINEAR_QUADRATIC_FUNDING":
      contributions = await fetchQFContributionsForRound(
        chainId as ChainId,
        roundId
      );

      contributions = await hotfixForRounds(roundId, contributions);

      results = await matchQFContributions(
        chainId as ChainId,
        metadata,
        contributions
      );

      break;
  }

  if (results) {
    try {
      const upsetRecordStatus = await db.upsertRoundRecord(
        roundId,
        {
          isSaturated: results.isSaturated
        },
        {
          chainId: chainIdVerbose,
          roundId: roundId,
          votingStrategyName: votingStrategyName,
          isSaturated: results.isSaturated
        }
      );

      if (upsetRecordStatus.error) {
        throw upsetRecordStatus.error;
      }

      // save the distribution results to the db
      // TODO: figure out if there is a better way to batch transactions
      for (const projectMatch of results.distribution) {
        const upsertMatchStatus = await db.upsertProjectMatchRecord(
          chainId,
          roundId,
          metadata,
          projectMatch
        );
        if (upsetRecordStatus.error) {
          throw upsertMatchStatus.error;
        }
      }

      const mostRecentTips: Record<string, MostRecentTip> = {};

      // Collect most recent tips
      for (const contribution of contributions) {
        const { projectId, contributor } = contribution;
        if (!mostRecentTips[projectId]) {
          mostRecentTips[projectId] = {
            roundId,
            projectId,
            userId: contributor,
            mostRecentIncludedTipTimestamp: contribution.createdAt
          };
        } else if (
          mostRecentTips[projectId].mostRecentIncludedTipTimestamp <
          contribution.createdAt
        ) {
          mostRecentTips[projectId].mostRecentIncludedTipTimestamp =
            contribution.createdAt;
        }
      }

      await db.upsertMostRecentTipsRecord(
        chainId,
        Object.values(mostRecentTips)
      );

      const match = await db.getRoundMatchRecord(roundId);

      if (match.error) {
        throw match.error;
      }

      // cache.set(`cache_${req.originalUrl}`, match.result);
      return match.result as QFDistribution[];
      // return handleResponse(res, 200, `${req.originalUrl}`, match.result);
    } catch (error) {
      console.error(error);

      results.distribution = results.distribution.map(dist => {
        return {
          id: null,
          createdAt: null,
          updatedAt: new Date(),
          ...dist,
          roundId: roundId
        };
      });
      const dbFailResults = results.distribution;

      // cache.set(`cache_${req.originalUrl}`, dbFailResults);
      return dbFailResults;
      // return handleResponse(res, 200, `${req.originalUrl}`, dbFailResults);
    }
  } else {
    throw "error: no results";
  }
};
