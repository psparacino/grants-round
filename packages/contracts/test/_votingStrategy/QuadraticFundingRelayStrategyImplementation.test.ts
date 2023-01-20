import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { deployContract } from "ethereum-waffle";
import { BytesLike, isAddress, formatBytes32String } from "ethers/lib/utils";
import { artifacts, ethers } from "hardhat";
import { Artifact } from "hardhat/types";
import {
  MockERC20,
  QuadraticFundingRelayStrategyImplementation,
} from "../../typechain";
import { Event, Wallet } from "ethers";
import { AddressZero } from "@ethersproject/constants";

describe("QuadraticFundingRelayStrategyImplementation", () => {
  let user: SignerWithAddress;
  let quadraticFundingRelayStrategy: QuadraticFundingRelayStrategyImplementation;
  let quadraticFundingRelayStrategyArtifact: Artifact;

  let mockERC20: MockERC20;
  let mockERC20Artifact: Artifact;

  const tokensToBeMinted = 1000;

  const VERSION = "0.1.0";

  describe("constructor", () => {
    it("deploys properly", async () => {
      [user] = await ethers.getSigners();

      quadraticFundingRelayStrategyArtifact = await artifacts.readArtifact(
        "QuadraticFundingRelayStrategyImplementation"
      );
      quadraticFundingRelayStrategy = <
        QuadraticFundingRelayStrategyImplementation
      >await deployContract(user, quadraticFundingRelayStrategyArtifact, []);

      mockERC20Artifact = await artifacts.readArtifact("MockERC20");
      mockERC20 = <MockERC20>(
        await deployContract(user, mockERC20Artifact, [tokensToBeMinted])
      );

      // Verify deploy
      expect(
        isAddress(quadraticFundingRelayStrategy.address),
        "Failed to deploy QuadraticFundingRelayStrategyImplementation"
      ).to.eq(true);
      expect(isAddress(mockERC20.address), "Failed to deploy MockERC20").to.eq(
        true
      );

      // Verify default value
      expect(await quadraticFundingRelayStrategy.roundAddress()).to.equal(
        AddressZero
      );
    });
  });

  describe("core functions", () => {
    const randomAddress = Wallet.createRandom().address;

    let grant1 = Wallet.createRandom();
    const grant1TokenTransferAmount = 150;
    const grant1NativeTokenTransferAmount = ethers.utils.parseUnits(
      "0.1",
      "ether"
    );

    let grant2 = Wallet.createRandom();
    const grant2TokenTransferAmount = 50;
    const grant2NativeTokenTransferAmount = ethers.utils.parseUnits(
      "0.05",
      "ether"
    );
    let encodedVotes: BytesLike[] = [];

    const nativeTokenAddress = AddressZero;

    const totalTokenTransfer =
      grant1TokenTransferAmount + grant2TokenTransferAmount;

    describe("test: init", () => {
      beforeEach(async () => {
        [user] = await ethers.getSigners();

        // Deploy MockERC20 contract
        mockERC20Artifact = await artifacts.readArtifact("MockERC20");
        mockERC20 = <MockERC20>(
          await deployContract(user, mockERC20Artifact, [tokensToBeMinted])
        );

        // Deploy QuadraticFundingVotingStrategy contract
        quadraticFundingRelayStrategyArtifact = await artifacts.readArtifact(
          "QuadraticFundingRelayStrategyImplementation"
        );
        quadraticFundingRelayStrategy = <
          QuadraticFundingRelayStrategyImplementation
        >await deployContract(user, quadraticFundingRelayStrategyArtifact, []);

        // Invoke init
        await quadraticFundingRelayStrategy.init();
      });

      it("invoking init once SHOULD set the contract version", async () => {
        expect(await quadraticFundingRelayStrategy.VERSION()).to.equal(VERSION);
      });

      it("invoking init once SHOULD set the round address", async () => {
        expect(await quadraticFundingRelayStrategy.roundAddress()).to.equal(
          user.address
        );
      });

      it("invoking init more than once SHOULD revert the transaction ", () => {
        expect(quadraticFundingRelayStrategy.init()).to.revertedWith(
          "init: roundAddress already set"
        );
      });
    });

    describe("test: vote", () => {
      beforeEach(async () => {
        [user] = await ethers.getSigners();

        // Deploy MockERC20 contract
        mockERC20Artifact = await artifacts.readArtifact("MockERC20");
        mockERC20 = <MockERC20>(
          await deployContract(user, mockERC20Artifact, [tokensToBeMinted])
        );

        // Deploy QuadraticFundingRelayStrategyImplementation contract
        quadraticFundingRelayStrategyArtifact = await artifacts.readArtifact(
          "QuadraticFundingRelayStrategyImplementation"
        );
        quadraticFundingRelayStrategy = <
          QuadraticFundingRelayStrategyImplementation
        >await deployContract(user, quadraticFundingRelayStrategyArtifact, []);

        encodedVotes = [];

        // Prepare Votes - only ERC20
        const votes = [
          [
            user.address,
            mockERC20.address,
            grant1TokenTransferAmount,
            grant1.address,
            formatBytes32String("grant1"),
          ],
          [
            user.address,
            mockERC20.address,
            grant2TokenTransferAmount,
            grant2.address,
            formatBytes32String("grant2"),
          ],
        ];

        for (let i = 0; i < votes.length; i++) {
          encodedVotes.push(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "address", "uint256", "address", "bytes32"],
              votes[i]
            )
          );
        }
      });

      it("invoking vote when roundAddress is not set SHOULD revert transaction", async () => {
        const txn = quadraticFundingRelayStrategy.vote(
          encodedVotes,
          user.address
        );
        await expect(txn).to.revertedWith(
          "error: voting contract not linked to a round"
        );
      });

      it("invoking vote when sender is not roundAddress SHOULD revert transaction", async () => {
        const [_, anotherUser] = await ethers.getSigners();

        // Invoke init
        await quadraticFundingRelayStrategy.connect(anotherUser).init();

        const txn = quadraticFundingRelayStrategy.vote(
          encodedVotes,
          randomAddress
        );
        await expect(txn).to.revertedWith(
          "error: can be invoked only by round contract"
        );
      });

      it("invoking vote without allowance SHOULD revert transaction ", async () => {
        // Invoke init
        await quadraticFundingRelayStrategy.init();

        const approveTx = await mockERC20.approve(
          quadraticFundingRelayStrategy.address,
          0
        );
        approveTx.wait();

        const txn = quadraticFundingRelayStrategy.vote(
          encodedVotes,
          user.address
        );

        await expect(txn).to.revertedWith("ERC20: insufficient allowance");
      });

      it("invoking vote not enough allowance SHOULD revert transaction ", async () => {
        // Invoke init
        await quadraticFundingRelayStrategy.init();

        const approveTx = await mockERC20.approve(
          quadraticFundingRelayStrategy.address,
          100
        );
        approveTx.wait();

        const txn = quadraticFundingRelayStrategy.vote(
          encodedVotes,
          user.address
        );
        await expect(txn).to.revertedWith("ERC20: insufficient allowance");
      });

      describe("test: vote with ERC20", () => {
        it("invoking vote SHOULD transfer balance from user to grant", async () => {
          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const beforeVotingUserBalance = await mockERC20.balanceOf(
            user.address
          );
          const beforeVotingGrant1Balance = await mockERC20.balanceOf(
            grant1.address
          );
          const beforeVotingGrant2Balance = await mockERC20.balanceOf(
            grant2.address
          );

          expect(beforeVotingGrant1Balance).to.equal("0");
          expect(beforeVotingGrant2Balance).to.equal("0");

          const approveTx = await mockERC20.approve(
            quadraticFundingRelayStrategy.address,
            totalTokenTransfer
          );
          approveTx.wait();

          const txn = await quadraticFundingRelayStrategy.vote(
            encodedVotes,
            user.address
          );
          txn.wait();

          const afterVotingUserBalance = await mockERC20.balanceOf(
            user.address
          );
          const afterVotingGrant1Balance = await mockERC20.balanceOf(
            grant1.address
          );
          const afterVotingGrant2Balance = await mockERC20.balanceOf(
            grant2.address
          );

          expect(afterVotingUserBalance).to.equal(
            Number(beforeVotingUserBalance) - totalTokenTransfer
          );
          expect(afterVotingGrant1Balance).to.equal(grant1TokenTransferAmount);
          expect(afterVotingGrant2Balance).to.equal(grant2TokenTransferAmount);
        });

        it("invoking vote SHOULD emit 2 Vote events", async () => {
          // Invoke init
          await quadraticFundingRelayStrategy.init();

          let votedEvents: Event[] = [];

          const approveTx = await mockERC20.approve(
            quadraticFundingRelayStrategy.address,
            totalTokenTransfer
          );
          approveTx.wait();

          const txn = await quadraticFundingRelayStrategy.vote(
            encodedVotes,
            user.address
          );
          txn.wait();

          // check if vote for first grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            mockERC20.address,
            grant1TokenTransferAmount,
            user.address,
            grant1.address,
            formatBytes32String("grant1"),
            user.address // note: this would be the round contract
          );

          // check if vote for second grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            mockERC20.address,
            grant2TokenTransferAmount,
            user.address,
            grant2.address,
            formatBytes32String("grant2"),
            user.address // note: this would be the round contract
          );

          const receipt = await txn.wait();
          if (receipt.events) {
            votedEvents = receipt.events.filter((e) => e.event === "Voted");
          }

          expect(votedEvents.length).to.equal(2);
        });
      });

      describe("test: vote with native tokens", async () => {
        [user] = await ethers.getSigners();

        let encodedVotesInNativeToken: BytesLike[] = [];

        // Prepare Votes - only ERC20
        const votesInNativeToken = [
          [
            user.address,
            nativeTokenAddress,
            grant1NativeTokenTransferAmount,
            grant1.address,
            formatBytes32String("grant1"),
          ],
          [
            user.address,
            nativeTokenAddress,
            grant2NativeTokenTransferAmount,
            grant2.address,
            formatBytes32String("grant2"),
          ],
        ];

        beforeEach(async () => {
          // Deploy QuadraticFundingRelayStrategyImplementation contract
          quadraticFundingRelayStrategyArtifact = await artifacts.readArtifact(
            "QuadraticFundingRelayStrategyImplementation"
          );
          quadraticFundingRelayStrategy = <
            QuadraticFundingRelayStrategyImplementation
          >await deployContract(
            user,
            quadraticFundingRelayStrategyArtifact,
            []
          );

          // Encode Votes
          encodedVotesInNativeToken = [];

          for (let i = 0; i < votesInNativeToken.length; i++) {
            encodedVotesInNativeToken.push(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "address", "uint256", "address", "bytes32"],
                votesInNativeToken[i]
              )
            );
          }
        });

        it("invoking vote SHOULD revert if there are insufficent funds", async () => {
          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const txn = quadraticFundingRelayStrategy.vote(
            encodedVotesInNativeToken,
            user.address,
            { value: "100000000000000000" }
          );

          await expect(txn).to.revertedWith("Address: insufficient balance");
        });

        it("invoking vote SHOULD transfer balance from user to grant", async () => {
          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const beforeVotingGrant1Balance = await ethers.provider.getBalance(
            grant1.address
          );
          const beforeVotingGrant2Balance = await ethers.provider.getBalance(
            grant2.address
          );

          expect(beforeVotingGrant1Balance).to.equal("0");
          expect(beforeVotingGrant2Balance).to.equal("0");

          await quadraticFundingRelayStrategy.vote(
            encodedVotesInNativeToken,
            user.address,
            { value: "150000000000000000" }
          );

          const afterVotingGrant1Balance = await ethers.provider.getBalance(
            grant1.address
          );
          const afterVotingGrant2Balance = await ethers.provider.getBalance(
            grant2.address
          );

          expect(afterVotingGrant1Balance).to.equal(
            grant1NativeTokenTransferAmount
          );
          expect(afterVotingGrant2Balance).to.equal(
            grant2NativeTokenTransferAmount
          );
        });

        it("invoking vote SHOULD emit 2 Vote events", async () => {
          let votedEvents: Event[] = [];

          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const txn = await quadraticFundingRelayStrategy.vote(
            encodedVotesInNativeToken,
            user.address,
            { value: "150000000000000000" }
          );

          // check if vote for first grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            nativeTokenAddress,
            grant1NativeTokenTransferAmount,
            user.address,
            grant1.address,
            formatBytes32String("grant1"),
            user.address // note: this would be the round contract
          );

          // check if vote for second grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            nativeTokenAddress,
            grant2NativeTokenTransferAmount,
            user.address,
            grant2.address,
            formatBytes32String("grant2"),
            user.address // note: this would be the round contract
          );

          const receipt = await txn.wait();
          if (receipt.events) {
            votedEvents = receipt.events.filter((e) => e.event === "Voted");
          }

          expect(votedEvents.length).to.equal(2);
        });
      });

      describe("test: vote with native and ERC20 tokens", () => {
        let encodedVotes: BytesLike[] = [];

        beforeEach(async () => {
          grant1 = Wallet.createRandom();
          grant2 = Wallet.createRandom();

          // Deploy QuadraticFundingRelayStrategyImplementation contract
          quadraticFundingRelayStrategyArtifact = await artifacts.readArtifact(
            "QuadraticFundingRelayStrategyImplementation"
          );
          quadraticFundingRelayStrategy = <
            QuadraticFundingRelayStrategyImplementation
          >await deployContract(
            user,
            quadraticFundingRelayStrategyArtifact,
            []
          );

          mockERC20Artifact = await artifacts.readArtifact("MockERC20");
          mockERC20 = <MockERC20>(
            await deployContract(user, mockERC20Artifact, [tokensToBeMinted])
          );

          // Prepare Votes - Native Token + ERC20
          const votes = [
            [
              user.address,
              nativeTokenAddress,
              grant1NativeTokenTransferAmount,
              grant1.address,
              formatBytes32String("grant1"),
            ],
            [
              user.address,
              mockERC20.address,
              grant2TokenTransferAmount,
              grant2.address,
              formatBytes32String("grant2"),
            ],
          ];

          // Encode Votes
          encodedVotes = [];

          for (let i = 0; i < votes.length; i++) {
            encodedVotes.push(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "address", "uint256", "address", "bytes32"],
                votes[i]
              )
            );
          }
        });

        it("invoking vote SHOULD transfer balance from user to grant", async () => {
          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const approveTx = await mockERC20.approve(
            quadraticFundingRelayStrategy.address,
            grant2TokenTransferAmount
          );
          approveTx.wait();

          const beforeVotingGrant1Balance = await ethers.provider.getBalance(
            grant1.address
          );
          const beforeVotingGrant2Balance = await mockERC20.balanceOf(
            grant2.address
          );

          expect(beforeVotingGrant1Balance).to.equal("0");
          expect(beforeVotingGrant2Balance).to.equal("0");

          await quadraticFundingRelayStrategy.vote(encodedVotes, user.address, {
            value: "100000000000000000",
          });

          const afterVotingGrant1Balance = await ethers.provider.getBalance(
            grant1.address
          );
          const afterVotingGrant2Balance = await mockERC20.balanceOf(
            grant2.address
          );

          expect(afterVotingGrant1Balance).to.equal(
            grant1NativeTokenTransferAmount
          );
          expect(afterVotingGrant2Balance).to.equal(grant2TokenTransferAmount);
        });

        it("invoking vote SHOULD emit 2 Vote events", async () => {
          let votedEvents: Event[] = [];

          // Invoke init
          await quadraticFundingRelayStrategy.init();

          const approveTx = await mockERC20.approve(
            quadraticFundingRelayStrategy.address,
            totalTokenTransfer
          );
          approveTx.wait();

          const txn = await quadraticFundingRelayStrategy.vote(
            encodedVotes,
            user.address,
            { value: "100000000000000000" }
          );

          // check if vote for first grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            nativeTokenAddress,
            grant1NativeTokenTransferAmount,
            user.address,
            grant1.address,
            formatBytes32String("grant1"),
            user.address // note: this would be the round contract
          );

          // check if vote for second grant fired
          expect(txn).to.emit(quadraticFundingRelayStrategy, "Voted").withArgs(
            mockERC20.address,
            grant2TokenTransferAmount,
            user.address,
            grant2.address,
            formatBytes32String("grant2"),
            user.address // note: this would be the round contract
          );

          const receipt = await txn.wait();
          if (receipt.events) {
            votedEvents = receipt.events.filter((e) => e.event === "Voted");
          }

          expect(votedEvents.length).to.equal(2);
        });
      });
    });
  });
});
