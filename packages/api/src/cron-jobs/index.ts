import * as cron from "node-cron";
import { fetchActiveRounds } from "../votingStrategies/linearQuadraticFunding";
import { ChainId } from "../types";
import { updateRoundMatch } from "../lib/updateRoundMatch";
import { updateRoundSummary } from "../lib/updateRoundSummary";
import * as Sentry from "@sentry/node";

let matchUpdateJobRunning = false;

export function setupCronJobs() {
  const timeInterval = 30;
  cron.schedule(
    `*/${timeInterval} * * * * *`,
    async () => {
      if (matchUpdateJobRunning) {
        console.log(
          `⏱️‍️ Running update match results cron job every ${timeInterval} seconds, but job is already running.`
        );
        return;
      }

      matchUpdateJobRunning = true;

      const currentTime = new Date();
      console.log(
        `⏱️‍️ Running update match results cron job every ${timeInterval} seconds`
      );

      const activeChainIds = [ChainId.MUMBAI];

      // Get all active rounds ids per chain
      try {
        await Promise.all(
          activeChainIds.map(async chainId => {
            return await fetchActiveRounds(chainId).then(rounds => {
              console.log(
                "ℹ️ Updating match amount for rounds:\n",
                rounds.map(r => r.id).join("\n"),
                "\non chain",
                chainId
              );
              // For each round on each chain, update the results
              return Promise.all(
                rounds.map(async round => {
                  try {
                    const updateResults = await updateRoundMatch(
                      chainId,
                      round.id
                    );
                    console.log(
                      "✅ Updated matching results for round",
                      round.id,
                      "on",
                      chainId,
                      "to",
                      updateResults
                    );
                  } catch (error) {
                    Sentry.captureException(error, {
                      extra: {
                        chainId,
                        roundId: round.id,
                        message: "Error updating match results"
                      }
                    });
                    console.log(
                      "🛑 Error updating match results for round",
                      round.id,
                      "on",
                      chainId,
                      "during cron job",
                      error
                    );
                  }
                  try {
                    const roundSummaryUpdateResults = await updateRoundSummary(
                      chainId,
                      round.id
                    );
                    console.log(
                      "✅ Updated summary results for round",
                      round.id,
                      "on",
                      chainId,
                      "to",
                      roundSummaryUpdateResults
                    );
                  } catch (error) {
                    console.log(
                      "🛑 Error updating summary results for round",
                      round.id,
                      "on",
                      chainId,
                      "during cron job",
                      error
                    );
                  }
                })
              );
            });
          })
        );
        console.log(
          "✅ Successfully updated match results for all active rounds"
        );
      } catch (error) {
        console.error(
          "🛑 Error updating match results for all active rounds during cron job",
          error
        );
      }

      const endTime = new Date();
      const timeDiff = endTime.getTime() - currentTime.getTime();
      console.log(
        "🕣 Time taken to update match results for all active rounds:",
        timeDiff / 1000,
        "s"
      );
      matchUpdateJobRunning = false;
      console.log("✅ Finished update match results cron job");
    },
    {}
  );
}
