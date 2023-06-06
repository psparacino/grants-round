import {matchQFContributions} from "../linearQuadraticFunding";
import {mockRoundMetadata} from "../../test-utils";
import {ChainId, QFDistribution} from "../../types";
import * as utils from "../../utils";
import {BigNumber, ethers} from "ethers";
import {faker} from "@faker-js/faker";

describe("linearQuadraticFunding", () => {
  it("summarizeQFContributions", () => {});

  it("fetchQFContributionsForRound", () => {});

  it("fetchQFContributionsForProjects", () => {});

  describe("matchQFContributions", () => {
    const mockProjectIdToPayoutAddressMapping = new Map<string, string>([
      ['1', '0x123'],
      ['2', '0x456'],
      ['3', '0x789'],
      ['4', '0xabc']
    ]);

    jest
      .spyOn(utils, "fetchProjectIdToPayoutAddressMapping")
      .mockResolvedValue(mockProjectIdToPayoutAddressMapping);

    const sumDistributions = (distributions: QFDistribution[]) => {
      return distributions.reduce((acc, curr) => acc + curr.matchAmountInToken, 0);
    }

    const defaultToken = '0x9c3c9283d3e44854697cd22d3faa240cfb032889';

    const createMockRoundMetadata = (totalPot: number) => ({
      ...mockRoundMetadata,
      totalPot,
    });

    const createMockVote = ({
      amount,
      token,
      contributor,
      projectId,
      projectPayoutAddress
    }: {
      amount: BigNumber;
      token?: string;
      contributor?: string;
      projectId?: string;
      projectPayoutAddress?: string;
    }) => {
      return {
        amount,
        token: token || defaultToken,
        contributor: contributor || faker.finance.ethereumAddress(),
        projectId: projectId || faker.datatype.number().toString(),
        projectPayoutAddress: projectPayoutAddress ? projectPayoutAddress : mockProjectIdToPayoutAddressMapping.get(projectId || "") || faker.finance.ethereumAddress()
      }
    }

    it('should distribute evenly with two equal votes', async function () {
      const pot = 100;
      const metaData = createMockRoundMetadata(pot);
      const matchResults = await matchQFContributions(ChainId.LOCAL_ROUND_LAB, metaData, [
        createMockVote({
          amount: BigNumber.from("1000"),
          projectId: '1',
        }),
        createMockVote({
          amount: BigNumber.from("1000"),
          projectId: '2',
        }),
      ]);
      expect(matchResults.distribution[0].matchAmountInToken).toEqual(matchResults.distribution[1].matchAmountInToken);
      expect(matchResults.distribution[0].matchAmountInToken).toEqual(pot / 2);
      expect(sumDistributions(matchResults.distribution)).toBeCloseTo(pot);
    });

    it('should distribute based on the number of votes when total contributions are equal', async function () {
      const pot = 1000;
      const metaData = createMockRoundMetadata(pot);
      const matchResults = await matchQFContributions(ChainId.LOCAL_ROUND_LAB, metaData, [
        createMockVote({
          amount: ethers.constants.WeiPerEther,
          projectId: '1',
        }),
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(2),
          projectId: '2',
        }),
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(2),
          projectId: '2',
        }),
      ]);

      expect(matchResults.distribution[0].matchAmountInToken).toBeCloseTo(matchResults.distribution[1].matchAmountInToken / 2);
      expect(matchResults.distribution[0].uniqueContributorsCount).toEqual(1);
      expect(matchResults.distribution[1].uniqueContributorsCount).toEqual(2);
      expect(sumDistributions(matchResults.distribution)).toBeCloseTo(pot);
    });

    it('should not be this hard to come up with names for good tests', async function () {
      const pot = 1000;
      const metaData = createMockRoundMetadata(pot);
      const matchResults = await matchQFContributions(ChainId.LOCAL_ROUND_LAB, metaData, [
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(2),
          projectId: '1',
        }),
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(4),
          projectId: '2',
        }),
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(4),
          projectId: '3',
        }),
        createMockVote({
          amount: ethers.constants.WeiPerEther.div(4),
          projectId: '3',
        }),
      ]);

      expect(matchResults.distribution[0].uniqueContributorsCount).toEqual(1);
      expect(matchResults.distribution[1].uniqueContributorsCount).toEqual(1);
      expect(matchResults.distribution[2].uniqueContributorsCount).toEqual(2);
      expect(sumDistributions(matchResults.distribution)).toBeCloseTo(pot);
      expect(matchResults.distribution[0].matchAmountInToken).toBeCloseTo(285.71, 2);
      expect(matchResults.distribution[1].matchAmountInToken).toBeCloseTo(142.86, 2);
      expect(matchResults.distribution[2].matchAmountInToken).toBeCloseTo(571.43, 2);
    });
  });
});