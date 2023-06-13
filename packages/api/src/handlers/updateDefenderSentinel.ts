import { Request, Response } from "express";
import {SentinelClient} from 'defender-sentinel-client';
import {handleResponse} from "../utils";

const sentinelName = 'ql - on vote received';
export const updateDefenderSentinelHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { votingStrategyAddress} = req.params;
    const creds = { apiKey: process.env.DEFENDER_ADMIN_API_KEY!, apiSecret: process.env.DEFENDER_ADMIN_API_SECRET! };
    const client = new SentinelClient(creds);

    const listSentinelResponse = await client.list()

    const currentSentinel = listSentinelResponse
      .items
      .find((sentinel) => sentinel.name === sentinelName);

    if (!currentSentinel) {
      throw new Error('No sentinel found')
    }

    console.log(currentSentinel);
    // @ts-ignore
    const currentAddresses: string[] = currentSentinel.addressRules[0].addresses
    console.log(currentAddresses);

    const updateSentinelResponse = await client.update(currentSentinel.subscriberId, {
      ...currentSentinel,
      addresses: [
        ...currentAddresses,
        votingStrategyAddress
      ]
    });

    return handleResponse(res, 200, 'Sentinel updated', updateSentinelResponse);
  } catch (e) {
    return handleResponse(
      res,
      500,
      "error: error updating sentinel",
    )
  }
}