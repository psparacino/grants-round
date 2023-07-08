import { Request, Response } from "express";
import { handleResponse } from "../utils";
import { cache } from "../cacheConfig";
import { db } from "../database";

export const getProjectMatchDataByProjectIdsHandler = async (
  req: Request,
  res: Response
) => {
  let { chainId, roundId } = req.params;
  let { projectId: projectIdsQuery = []} = req.query;


  // check if params are valid
  if (!chainId || !roundId || !Array.isArray(projectIdsQuery) || projectIdsQuery.length === 0) {
    return handleResponse(
      res,
      400,
      "error: missing parameter chainId, roundId, or projectId"
    );
  }

  const projectIds = projectIdsQuery as string[]
  roundId = roundId.toLowerCase();

  // // check if match is cached
  // const cachedRoundMatchData = cache.get(
  //   `cache_/data/round/match/${chainId}/${roundId}`
  // ) as QFDistributionResults;
  // // TODO: also check data round cache
  // if (cachedRoundMatchData) {
  //   const cachedProjectMatch = cachedRoundMatchData.distribution.filter(
  //     (match) => match.projectId === projectId
  //   )[0];
  //   return handleResponse(res, 200, `${req.originalUrl}`, cachedProjectMatch);
  // }

  try {
    const match = await db.getProjectMatchDataByProjectIds(roundId, projectIds);
    if (match.error) {
      throw match.error;
    }

    // if match is not in database, return error
    if (!match.result || match.result.length === 0) {
      return handleResponse(res, 404, "error: project matches not found");
    }

    cache.set(`${req.originalUrl}`, match.result);

    // if match is in database, return match
    return handleResponse(res, 200, `${req.originalUrl}`, match.result);
  } catch (error) {
    console.error("getProjectMatchDataHandler", error);
    return handleResponse(res, 500, "error: internal server error");
  }
};
