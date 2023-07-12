import { Request, Response } from "express";
import { db } from "../database";
import { handleResponse } from "../utils";
import * as Sentry from "@sentry/node";

export const getTipIncludedHandler = async (
  req: Request<
    {
      chainId: string;
    },
    undefined,
    {
      publicationsToCheck: {
        publicationId: string;
        from: string;
        mostRecentCreatedAt: number;
        roundId: string;
      }[];
    }
  >,
  res: Response
) => {
  try {
    let { chainId } = req.params;
    const { publicationsToCheck } = req.body;

    const result: Record<string, boolean> = {};

    for (const {
      publicationId,
      from,
      mostRecentCreatedAt,
      roundId
    } of publicationsToCheck) {
      const isVoteIncluded = await db.getMostRecentTipRecord(
        chainId,
        roundId,
        publicationId,
        from
      );

      if (!isVoteIncluded.result) {
        result[publicationId] = false;
        continue;
      }

      result[publicationId] =
        isVoteIncluded.result.mostRecentIncludedTipTimestamp >=
        mostRecentCreatedAt;
    }

    return handleResponse(res, 200, `${req.originalUrl}`, result);
  } catch (error) {
    Sentry.captureException(error);
    console.error("getVoteIncludedHandler", error);
    return handleResponse(
      res,
      500,
      `${req.originalUrl}`,
      "error: internal server error"
    );
  }
};
