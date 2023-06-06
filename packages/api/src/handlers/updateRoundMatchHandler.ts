import { Request, Response } from "express";
import { ChainId, QFDistributionResults } from "../types";
import { fetchRoundMetadata, getChainVerbose, handleResponse } from "../utils";
import { fetchQFContributionsForRound, matchQFContributions, } from "../votingStrategies/linearQuadraticFunding";
import { VotingStrategy } from "@prisma/client";
import { hotfixForRounds } from "../hotfixes";
import { cache } from "../cacheConfig";
import { db } from "../database";

export const updateRoundMatchHandler = async (req: Request, res: Response) => {
  let { chainId, roundId } = req.params;

  // check if params are valid
  if (!chainId || !roundId) {
    return handleResponse(
      res,
      400,
      "error: missing parameter chainId or roundId"
    );
  }

  let results: QFDistributionResults | undefined;

  try {
    roundId = roundId.toLowerCase();
    const metadata = await fetchRoundMetadata(chainId as ChainId, roundId);
    const { votingStrategy } = metadata;

    const votingStrategyName = votingStrategy.strategyName as VotingStrategy;

    const chainIdVerbose = getChainVerbose(chainId);

    switch (votingStrategyName) {
      case "LINEAR_QUADRATIC_FUNDING":

        let contributions = await fetchQFContributionsForRound(
          chainId as ChainId,
          votingStrategy.id,
        );

        contributions = await hotfixForRounds(roundId, contributions);

        results = await matchQFContributions(
          chainId as ChainId,
          metadata,
          contributions
        );

        break;
    }

    if (!results) {
      throw "error: no results";
    }

    return handleResponse(res, 200, `${req.originalUrl}`, {
      ...results,
      distribution: results.distribution.map(result => ({
        ...result,
        roundId: roundId,
      }))
    });
  } catch (error) {
    console.error("updateRoundMatchHandler", error);
    return handleResponse(res, 500, "error: something went wrong");
  }
};
