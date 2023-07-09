import { Request, Response } from "express";
import { ChainId } from "../types";
import { handleResponse } from "../utils";
import { cache } from "../cacheConfig";
import {updateRoundMatch} from "../lib/updateRoundMatch";

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

  try {
    const results = await updateRoundMatch(chainId as ChainId, roundId);
    cache.set(`cache_${req.originalUrl}`, results);
    return handleResponse(res, 200, `${req.originalUrl}`, results);
  } catch (error) {
    console.error("updateRoundMatchHandler", error);
    return handleResponse(res, 500, "error: something went wrong");
  }
};
