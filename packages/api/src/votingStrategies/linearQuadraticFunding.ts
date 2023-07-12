import { BigNumber } from "ethers";
import { formatEther, formatUnits, parseUnits } from "ethers/lib/utils";
import {
  ChainId,
  QFContributionSummary,
  QFContribution,
  QFVotedEvent,
  QFDistribution,
  RoundMetadata,
  QFDistributionResults
} from "../types";
import {
  fetchFromGraphQL,
  fetchCurrentTokenPrices,
  fetchPayoutAddressToProjectIdMapping,
  fetchAverageTokenPrices,
  fetchProjectIdToPayoutAddressMapping
} from "../utils";

/**
 * summarizeRound is an async function that summarizes a round of voting by counting the number of contributions, the number of unique contributors, the total amount of contributions in USD, and the average contribution in USD.
 *
 * @param {ChainId} chainId - The id of the chain to fetch token prices from.
 * @param {QFContribution[]} contributions - An array of QFContribution objects representing the contributions made in the round.
 * @return {Promise<QFContributionSummary>} - An object containing the summarized data for the round.
 */
export const summarizeQFContributions = async (
  chainId: ChainId,
  contributions: QFContribution[]
): Promise<QFContributionSummary> => {
  // Create an object to store the sums
  const summary: QFContributionSummary = {
    contributionCount: 0,
    uniqueContributors: 0,
    totalContributionsInUSD: 0,
    averageUSDContribution: 0,
    totalTippedInToken: "0",
    averageTipInToken: "0"
  };

  let totalTippedInToken = BigNumber.from("0");

  if (contributions.length == 0) {
    return summary;
  }

  const summaryContributions: any = {
    contributions: {},
    contributors: []
  };

  const uniqueContributors = new Set();

  // Iterate over the array of objects
  contributions.forEach((item: QFContribution) => {
    // Get the token
    const token = item.token;
    const contributor = item.contributor;

    totalTippedInToken = totalTippedInToken.add(item.amount);

    // Initialize the sum for the token if it doesn't exist
    if (!summaryContributions.contributions[token]) {
      summaryContributions.contributions[token] = BigNumber.from("0");
    }

    // Initialize the contributor if it doesn't exist
    // if (!summaryContributions.contributors.includes(contributor)) {
    //   summaryContributions.contributors.push(contributor);
    // }
    // add contributor to set
    uniqueContributors.add(contributor);
    // Update the sum for the token
    summaryContributions.contributions[
      token
    ] = summaryContributions.contributions[token].add(item.amount);
  });

  summary.totalTippedInToken = formatEther(totalTippedInToken);
  summary.averageTipInToken = formatEther(
    totalTippedInToken.div(contributions.length)
  );

  let totalContributionsInUSD = 0;

  const prices = await fetchCurrentTokenPrices(
    chainId,
    Object.keys(summaryContributions.contributions)
  );

  Object.keys(summaryContributions.contributions).map(async tokenAddress => {
    const tokenAmount: number = Number(
      formatUnits(summaryContributions.contributions[tokenAddress])
    );

    const conversionRate = prices[tokenAddress]?.usd;

    const amountInUSD = tokenAmount * conversionRate;
    totalContributionsInUSD += amountInUSD ? amountInUSD : 0;

    return;
  });

  summary.totalContributionsInUSD = totalContributionsInUSD;
  summary.contributionCount = contributions.length;
  summary.uniqueContributors = uniqueContributors.size;
  summary.averageUSDContribution =
    Number(summary.totalContributionsInUSD) / summary.uniqueContributors;

  return summary;
};

export const decodePublicationId = (encodedId: string) => {
  let profileId = encodedId.slice(2, 34);
  let postId = encodedId.slice(34, 66);

  profileId = "0x" + profileId.slice(0, profileId.lastIndexOf("1"));
  postId = "0x" + postId.slice(0, postId.lastIndexOf("1"));

  return profileId + "-" + postId;
};

/**
 * fetchContributionsForRound is an async function that retrieves a
 * list of all votes made in a round identified by
 * the votingStrategyId parameter.
 * The function uses pagination to retrieve all votes from the GraphQL API and returns them as an array of QFContribution objects.
 *
 * @param {ChainId} chainId - The id of the chain to fetch the votes from.
 * @param {string} roundId - The id of the voting strategy to retrieve votes for.
 * @param {string} lastCreatedAt - The createdAt timestamp of the most recent vote retrieved in the previous iteration of the function. Used for pagination. * @param {QFContribution[]} votes - An array of QFContribution objects representing the votes retrieved in previous iterations of the function. Used for pagination.
 * @param {QFContribution[]} votes - An array of QFContribution objects representing the votes retrieved in previous iterations of the function. Used for pagination.
 * @return {Promise<QFContribution[]>} - An array of QFContribution objects representing the votes made in the specified round.
 */
export const fetchQFContributionsForRound = async (
  chainId: ChainId,
  roundId: string,
  lastCreatedAt: string = "0",
  votes: QFContribution[] = []
): Promise<QFContribution[]> => {
  const query = `
    query GetContributionsForRound($roundId: String, $lastCreatedAt: String) {
      quadraticTipping(id: $roundId) {
        matchAmount
        votes( 
          first: 1000
          orderBy: createdAt
          orderDirection: desc
          where: {createdAt_gt: $lastCreatedAt}
        ) {
          amount
          from
          to
          id
          projectId
          token
          version
          createdAt
        }
        round {
          roundEndTime
          roundStartTime
          roundMetaPtr {
            id
            pointer
            protocol
          }
        }
      }
    }
  `;
  const variables = { roundId, lastCreatedAt };

  const response = await fetchFromGraphQL(chainId, query, variables);

  if (response.errors) {
    console.log("errors", response.errors);
    return [];
  }

  if (response.data?.quadraticTipping?.votes.length === 0) {
    return votes;
  }

  response.data?.quadraticTipping?.votes.map((vote: QFVotedEvent) => {
    let projectId = decodePublicationId(vote.projectId);

    if (!projectId) {
      return;
    }

    if (projectId) {
      votes.push({
        amount: BigNumber.from(vote.amount),
        token: vote.token,
        contributor: vote.from,
        projectId: projectId,
        projectPayoutAddress: vote.to,
        createdAt: parseInt(vote.createdAt, 10)
      });
    }
  });

  return await fetchQFContributionsForRound(
    chainId,
    roundId,
    response.data?.quadraticTipping?.votes[0].createdAt,
    votes
  );
};

/**
 * fetchContributionsForProject is a function that fetches a list of contributions for
 * a given project from a GraphQL API.
 *
 * @param {ChainId} chainId - The ID of the chain to fetch data from.
 * @param roundId
 * @param metadata
 * @param {string} votingStrategyId - The ID of the voting strategy to fetch data for.
 * @param {string[]} projectIds - An array of project IDs to filter the contributions by.
 * @param {string} lastID - The ID of the last contribution fetched. Used for pagination.
 * @param {QFContribution[]} votes - An array of QFContribution objects to append the new contributions to.
 * @returns {Promise<QFContribution[]>} A promise that resolves to an array of QFContribution objects.
 */
export const fetchQFContributionsForProjects = async (
  chainId: ChainId,
  roundId: string,
  metadata: RoundMetadata,
  votingStrategyId: string,
  projectIds: string[],
  lastID: string = "",
  votes: QFContribution[] = []
): Promise<QFContribution[]> => {
  const query = `
    query GetContributionsForProject($votingStrategyId: String, $lastID: String, $to: [String]) {
      votingStrategies(where:{
        id: $votingStrategyId
      }) {
        votes(first: 1000, where: {
            id_gt: $lastID
            to_in: $to
        }) {
          id
          amount
          token
          from
          to
        }
        round {
          roundStartTime
          roundEndTime
          token
        }
      }
    }
  `;

  // convert projectIds to payout addresses
  const projectPayoutAddresses = await fetchProjectIdToPayoutAddressMapping(
    metadata.projectsMetaPtr
  );
  // convert payout addresses to array of strings
  const payoutAddresses = Array.from(projectPayoutAddresses.values());

  // fetch projectId -> payoutAddress mapping
  const projectPayoutToIdMapping = await fetchPayoutAddressToProjectIdMapping(
    metadata.projectsMetaPtr
  );

  // fetch from graphql
  const response = await fetchFromGraphQL(chainId, query, {
    votingStrategyId,
    lastID,
    to: payoutAddresses
  });

  if (response.errors) {
    console.log("errors", response.errors);
    return [];
  }

  response.data.votingStrategies[0].votes.map((vote: QFVotedEvent) => {
    // TODO: remove update to projectID after contract upgrade
    const projectId = projectPayoutToIdMapping.get(vote.to);
    //
    votes.push({
      amount: BigNumber.from(vote.amount),
      token: vote.token,
      contributor: vote.from,
      projectId: projectId!,
      projectPayoutAddress: vote.to,
      createdAt: parseInt(vote.createdAt, 10)
    });

    lastID = vote.id;
  });

  // Check if the votes field is empty. If it is, return the final results
  if (response.data.votingStrategies[0].votes.length === 0) {
    return votes;
  }

  // Recursively call the function to paginate through results
  return fetchQFContributionsForProjects(
    chainId,
    roundId,
    metadata,
    votingStrategyId,
    projectIds,
    lastID,
    votes
  );
};

/**
 *
 * @param {ChainId} chainId  - The ID of the chain on which the round is running
 * @param {RoundMetadata} metadata - Round Metadata
 * @param {QFContribution[]} contributions - Contributions made to the round
 * @returns
 */
export const matchQFContributions = async (
  chainId: ChainId,
  metadata: RoundMetadata,
  contributions: QFContribution[]
): Promise<QFDistributionResults> => {
  const {
    totalPot,
    roundStartTime,
    roundEndTime,
    token,
    matchingCapPercentage
  } = metadata;

  // let isSaturated: boolean;

  const contributionsByProject: {
    [projectId: string]: any;
  } = {};

  let contributionTokens: string[] = [];

  for (const contribution of contributions) {
    if (!contributionTokens.includes(contribution.token)) {
      contributionTokens.push(contribution.token);
    }
  }

  const prices: any = await fetchAverageTokenPrices(
    chainId,
    contributionTokens,
    roundStartTime,
    roundEndTime
  );

  // group contributions by project
  for (const contribution of contributions) {
    const { projectId, amount, token, contributor } = contribution;

    const usdAmount = Number(formatUnits(amount)) * prices[token];

    // check if projectID is already in the mapping
    if (!contributionsByProject[projectId]) {
      // add projectID to mapping along with the contribution
      contributionsByProject[projectId] = {
        payoutAddress: contribution.projectPayoutAddress,
        contributions: {
          // all contributions made to the projectId
          [contributor]: {
            // all contributions made by contributor to the projectId
            ...contribution, // list of all contributions made by contributor to the projectId
            usdValue: usdAmount, // total USD amount for all contributions made by contributor to the projectId
            totalAmountInToken: amount
          }
        }
      };
      continue;
    }

    // check if contributor has already made contributions to the project
    if (!contributionsByProject[projectId].contributions[contributor]) {
      // append contributor to the projectId mapping
      contributionsByProject[projectId].contributions[contributor] = {
        ...contribution,
        usdValue: usdAmount,
        totalAmountInToken: amount
      };
    } else {
      // update total USD amount as this contributor has already made contributions to the project
      contributionsByProject[projectId].contributions[
        contributor
      ].usdValue += usdAmount; // all contributions made by contributor to the projectId // total USD amount for all contributions made by contributor to the projectId
      contributionsByProject[projectId].contributions[
        contributor
      ].totalAmountInToken = contributionsByProject[projectId].contributions[
        contributor
      ].totalAmountInToken.add(amount);
    }
  }

  let matchResults: QFDistribution[] = [];
  let totalMatchInUSD = 0;

  // const contributorsWhoShouldBeMatched = await fetchContributorsAboveThreshold();

  for (const projectId in contributionsByProject) {
    let sumOfSquares = 0;
    let sumOfContributions = 0;
    let sumOfContributionsInToken = BigNumber.from(0);

    const uniqueContributors = new Set();

    const contributions: (QFContribution & {
      totalAmountInToken: BigNumber;
    })[] = Object.values(contributionsByProject[projectId].contributions);
    const projectPayoutAddress =
      contributionsByProject[projectId].payoutAddress;
    contributions.forEach(contribution => {
      const { contributor, usdValue, totalAmountInToken } = contribution;

      uniqueContributors.add(contributor);
      sumOfContributionsInToken = sumOfContributionsInToken.add(
        totalAmountInToken
      );

      if (usdValue) {
        sumOfSquares += Math.sqrt(usdValue);
        sumOfContributions += usdValue;
      }
    });

    const matchInUSD = Math.pow(sumOfSquares, 2);
    // TODO: This was originally in the code but seems to be wrong? Ask @owocki maybe
    // const matchInUSD = Math.pow(sumOfSquares, 2) - sumOfContributions;

    matchResults.push({
      projectId: projectId,
      matchAmountInUSD: matchInUSD,
      totalContributionsInUSD: sumOfContributions,
      totalContributionsInToken: formatEther(sumOfContributionsInToken),
      matchPoolPercentage: 0, // init to zero
      matchAmountInToken: 0,
      projectPayoutAddress: projectPayoutAddress,
      uniqueContributorsCount: uniqueContributors.size,
      matchAmount: "0"
    });
    totalMatchInUSD += isNaN(matchInUSD) ? 0 : matchInUSD; // TODO: what should happen when matchInUSD is NaN?
    // TODO: Error out if NaN
  }

  for (const matchResult of matchResults) {
    // update matching data
    matchResult.matchPoolPercentage =
      matchResult.matchAmountInUSD / totalMatchInUSD;
    matchResult.matchAmountInToken = matchResult.matchPoolPercentage * totalPot;
  }

  const potTokenPrice: any = await fetchAverageTokenPrices(
    chainId,
    [token],
    roundStartTime,
    roundEndTime
  );

  const totalPotInUSD = totalPot * potTokenPrice[token];

  // TODO: enable this as a feature
  // isSaturated = totalMatchInUSD > totalPotInUSD;

  let totalMatchInUSDAfterNormalising = 0;

  // NOTE: Earlier scaling down the match would
  // happen only when a round is saturated. In this implementation,
  // the pot is always distributed at 100% even if there aren't enough
  // donations

  let matchPotWeiLeftOver = parseUnits(totalPot.toFixed(18).toString());

  // If match exceeds pot, scale down match to pot size
  matchResults.forEach((result, index) => {
    const isLastResult = index === matchResults.length - 1;
    const matchAmountInWei = parseUnits(
      result.matchAmountInToken.toFixed(18).toString()
    );

    const updatedMatchAmountInUSD =
      result.matchAmountInUSD * (totalPotInUSD / totalMatchInUSD);

    // update matching data
    result.matchAmountInUSD = updatedMatchAmountInUSD;
    result.matchPoolPercentage = result.matchAmountInUSD / totalPotInUSD;
    result.matchAmountInToken = result.matchPoolPercentage * totalPot;

    if (isLastResult) {
      result.matchAmount = matchPotWeiLeftOver.toString();
    } else {
      result.matchAmount = matchAmountInWei.toString();
    }

    totalMatchInUSDAfterNormalising += updatedMatchAmountInUSD;
    matchPotWeiLeftOver = matchPotWeiLeftOver.sub(matchAmountInWei);
  });

  if (matchingCapPercentage) {
    const matchingCapInUSD = (totalPotInUSD * matchingCapPercentage) / 100;

    console.log("=========== BEFORE CAPPING ===========");
    console.log("matchingCapPercentage", matchingCapPercentage);
    console.log("matchingCapInUSD", matchingCapInUSD);

    console.log("totalMatchInUSD", totalMatchInUSD);
    console.log(
      "totalMatchInUSDAfterNormalising",
      totalMatchInUSDAfterNormalising
    );

    console.log("totalPot", totalPot);
    console.log("totalPotInUSD", totalPotInUSD);

    console.log("=====================");
    matchResults.forEach((match, index) => {
      console.log(
        "Before capping. project: ",
        index,
        "matchAmountInUSD:",
        match.matchAmountInUSD
      );
    });
    console.log("=====================");

    matchResults = applyMatchingCap(
      matchResults,
      totalPot,
      totalMatchInUSDAfterNormalising,
      matchingCapInUSD
    );

    console.log("=========== AFTER CAPPING =========== ");
    let _totalMatchAmountInUSD = 0;
    let _totalMatchAmountInToken = 0;
    let _totalMatchAmountInPercentage = 0;
    matchResults.forEach(result => {
      _totalMatchAmountInUSD += result.matchAmountInUSD;
      _totalMatchAmountInToken += result.matchAmountInToken;
      _totalMatchAmountInPercentage += result.matchPoolPercentage;
    });
    console.log("_totalMatchAmountInUSD", _totalMatchAmountInUSD);
    console.log("_totalMatchAmountInToken", _totalMatchAmountInToken);
    console.log("_totalMatchAmountInPercentage", _totalMatchAmountInPercentage);

    console.log("=====================");
    matchResults.forEach((match, index) => {
      console.log(
        "After capping. project: ",
        index,
        "matchAmountInUSD:",
        match.matchAmountInUSD
      );
    });
    console.log("=====================");
  }

  return {
    distribution: matchResults
    // isSaturated: isSaturated,
  };
};

/**
 * Apply matching cap if project match is greater than the cap.
 *
 * @param distribution
 * @param totalPot
 * @param totalMatchInUSD
 * @param matchingCapInUSD
 */
const applyMatchingCap = (
  distribution: QFDistribution[],
  totalPot: number,
  totalMatchInUSD: number,
  matchingCapInUSD: number
): QFDistribution[] => {
  if (matchingCapInUSD == 0) return distribution;

  let amountLeftInPoolAfterCapping = 0;
  let totalMatchForProjectWhichHaveNotCapped = 0;

  distribution.forEach(projectMatch => {
    if (projectMatch.matchAmountInUSD >= matchingCapInUSD) {
      // increase amountLeftInPoolAfterCapping by the amount that is over the cap
      const amountOverCap = projectMatch.matchAmountInUSD - matchingCapInUSD;
      amountLeftInPoolAfterCapping += amountOverCap;

      // update matching data
      // update projectMatch to capped amount
      projectMatch.matchAmountInUSD = matchingCapInUSD;
      projectMatch.matchPoolPercentage =
        projectMatch.matchAmountInUSD / totalMatchInUSD;
      projectMatch.matchAmountInToken =
        projectMatch.matchPoolPercentage * totalPot;
    } else {
      // track project matches which have not been capped
      totalMatchForProjectWhichHaveNotCapped += projectMatch.matchAmountInUSD;
    }
  });

  // If there is any amount left in the pool after capping ->
  // Distribute it proportionally to the projects which have not been capped
  if (
    amountLeftInPoolAfterCapping > 0 &&
    totalMatchForProjectWhichHaveNotCapped > 0
  ) {
    const reminderPercentage =
      amountLeftInPoolAfterCapping / totalMatchForProjectWhichHaveNotCapped;

    // reset amountLeftInPoolAfterCapping to check if any project's match is more the capAmount after spreading the remainder
    amountLeftInPoolAfterCapping = 0;

    distribution.forEach(projectMatch => {
      if (projectMatch.matchAmountInUSD < matchingCapInUSD) {
        // distribute the remainder proportionally to the projects which have not been capped
        projectMatch.matchAmountInUSD +=
          projectMatch.matchAmountInUSD * reminderPercentage;
        projectMatch.matchPoolPercentage =
          projectMatch.matchAmountInUSD / totalMatchInUSD;
        projectMatch.matchAmountInToken =
          projectMatch.matchPoolPercentage * totalPot;

        // check if the project's match is more the capAmount after spreading the remainder
        if (projectMatch.matchAmountInUSD > matchingCapInUSD) {
          // increase amountLeftInPoolAfterCapping by the amount that is over the cap
          const amountOverCap =
            projectMatch.matchAmountInUSD - matchingCapInUSD;
          amountLeftInPoolAfterCapping += amountOverCap;
        }
      }
    });

    // apply the cap again (recursively)
    if (amountLeftInPoolAfterCapping > 0) {
      applyMatchingCap(
        distribution,
        totalPot,
        totalMatchInUSD,
        matchingCapInUSD
      );
    }
  }

  return distribution;
};

export const fetchActiveRounds = async (chainId: ChainId) => {
  const unixTimestamp = Math.floor(Date.now() / 1000 + 60 * 60);
  const query = `
    query GetActiveRounds($unixTimestamp: String!) {
      rounds(
        where: { roundEndTime_gte: $unixTimestamp }
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        roundEndTime
        createdAt
        token
        roundMetaPtr {
          id
          pointer
        }
      }
    }
  `;

  const variables = { unixTimestamp: unixTimestamp.toString() };

  const response = await fetchFromGraphQL(chainId, query, variables);
  return response.data.rounds as { id: string }[];
};
