import * as cron from 'node-cron';
import {fetchActiveRounds} from "../votingStrategies/linearQuadraticFunding";
import {ChainId} from "../types";
import {updateRoundMatch} from "../lib/updateRoundMatch";

export function setupCronJobs() {
  cron.schedule('*/60 * * * * *', async () => {
    console.log('Running update match results cron job every 60 seconds');

    const activeChainIds = [ChainId.MUMBAI];

    // Get all active rounds ids per chain
    try {
      await Promise.all(activeChainIds.map(async (chainId) => {
        return await fetchActiveRounds(chainId).then((rounds) => {
          // For each round on each chain, update the results
          return Promise.all(rounds.map(async (round) => {
            const updateResults = await updateRoundMatch(chainId, round.id);
            console.log(
              'Updated matching results for round',
              round.id,
              'on',
              chainId,
              'to',
              updateResults
            );
          }));
        });
      }));
      console.log('Successfully updated match results for all active rounds');
    } catch (error) {
      console.error('Error updating match results for all active rounds during cron job', error);
    }

    console.log('Finished update match results cron job');
  });
}