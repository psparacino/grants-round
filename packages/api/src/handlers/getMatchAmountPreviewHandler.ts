import { Request, Response } from "express";
import { fetchRoundMetadata, handleResponse } from "../utils";
import {
  fetchQFContributionsForRound,
  matchQFContributions
} from "../votingStrategies/linearQuadraticFunding";
import { hotfixForRounds } from "../hotfixes";
import { ChainId, QFContribution } from "../types";
import { BigNumber } from "ethers";
import { db } from "../database";

export const getMatchAmountPreviewHandler = async (
  req: Request,
  res: Response
) => {
  let { chainId, roundId, projectId: publicationId } = req.params;
  let { tipAmount, token, contributor } = req.query;

  if (!chainId || !roundId) {
    return handleResponse(
      res,
      400,
      "error: missing parameter chainId, roundId, tipAmount, or publicationId"
    );
  }

  if (typeof tipAmount !== "string") {
    return handleResponse(res, 400, "error: tipAmount must be a string");
  }

  if (typeof token !== "string") {
    return handleResponse(res, 400, "error: token must be a string");
  }

  if (typeof contributor !== "string") {
    return handleResponse(res, 400, "error: contributor must be a string");
  }

  try {
    let [contributions, metadata] = await Promise.all([
      fetchQFContributionsForRound(chainId as ChainId, roundId),
      fetchRoundMetadata(chainId as ChainId, roundId)
    ]);

    const currentMatchResult = await db.getProjectMatchDataByProjectIds(
      roundId,
      [publicationId]
    );

    const currentMatch = currentMatchResult?.result[0];

    contributions = await hotfixForRounds(roundId, contributions);

    const newContribution: QFContribution = {
      contributor: contributor,
      token: token,
      amount: BigNumber.from(tipAmount),
      projectId: publicationId,
      projectPayoutAddress: currentMatch?.projectPayoutAddress || "",
      createdAt: new Date().getTime() / 1000
    };

    contributions.push(newContribution);

    let results = await matchQFContributions(
      chainId as ChainId,
      metadata,
      contributions
    );

    const newMatch = results.distribution.find(
      match => match.projectId === publicationId
    );

    const currentMatchAmountInToken = currentMatch?.matchAmountInToken || 0;
    const newMatchAmountInToken = newMatch?.matchAmountInToken || 0;

    const differenceMatchAmountInToken = Math.max(
      newMatchAmountInToken - currentMatchAmountInToken,
      0
    );

    const currentMatchPoolPercentage = currentMatch?.matchPoolPercentage || 0;
    const newMatchPoolPercentage = newMatch?.matchPoolPercentage || 0;

    const differenceMatchPoolPercentage = Math.max(
      newMatchPoolPercentage - currentMatchPoolPercentage,
      0
    );

    return handleResponse(res, 200, `${req.originalUrl}`, {
      currentMatchAmountInToken,
      newMatchAmountInToken,
      differenceMatchAmountInToken,
      differenceMatchPoolPercentage,
      token,
      contributor,
      publicationId,
      roundId
    });
  } catch (error) {
    console.error("getMatchAmountPreviewHandler", error);
    return handleResponse(res, 500, "error: internal server error");
  }
};
