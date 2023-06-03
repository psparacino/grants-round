import { Provider } from "react-redux";
import { Contract } from "ethers";
import * as fs from "fs";
import { task } from "hardhat/config";
import * as utils from "../scripts/utils";

import { confirmContinue } from "../utils/script-utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import POLYGON from "../deployments/deployments-polygon.json";
import MUMBAI from "../deployments/deployments-polygon-mumbai.json";
import LOCALHOST from "../deployments/deployments-localhost.json";

import ProgramFactoryAbi from "../artifacts/contracts/program/ProgramFactory.sol/ProgramFactory.json";
import RoundFactoryAbi from "../artifacts/contracts/round/RoundFactory.sol/RoundFactory.json";
import QuadraticFundingRelayStrategyFactoryAbi from "../artifacts/contracts/votingStrategy/QuadraticFundingRelayStrategy/QuadraticFundingRelayStrategyFactory.sol/QuadraticFundingRelayStrategyFactory.json";
import MerklePayoutStrategyFactoryAbi from "../artifacts/contracts/payoutStrategy/MerklePayoutStrategy/MerklePayoutStrategyFactory.sol/MerklePayoutStrategyFactory.json";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Contracts =
  | "ProgramFactory"
  | "RoundFactory"
  | "QuadraticFundingRelayStrategyFactory"
  | "MerklePayoutStrategyFactory";

task("createRound", "Create a new Round")
  .addOptionalParam(
    "programCid",
    "the cid for the program factory metapointer",
    "bafybeif43xtcb7zfd6lx7rfq42wjvpkbqgoo7qxrczbj4j4iwfl5aaqv2q"
  )
  .addOptionalParam(
    "applicationCid",
    "the cid for the application metapointer",
    "bafkreih3mbwctlrnimkiizqvu3zu3blszn5uylqts22yvsrdh5y2kbxaia"
  )
  .addOptionalParam(
    "roundCid",
    "the cid for the round metapointer",
    "bafybeia4khbew3r2mkflyn7nzlvfzcb3qpfeftz5ivpzfwn77ollj47gqi"
  )
  .addOptionalParam("admin", "an array of addresses of administrators")
  .addOptionalParam(
    "operators",
    "an array of addresses you want to assign the operator role to"
  )
  .setAction(
    async (
      { programCid, applicationCid, roundCid, admin, operators },
      { ethers }
    ) => {
      let addresses;
      const signers: SignerWithAddress[] = await hre.ethers.getSigners();

      let adminAddress: string[] = [];
      if (admin === undefined) {
        signers.forEach((signer) => {
          return adminAddress.push(signer.address);
        });
      } else {
        adminAddress = admin;
      }

      let programOperators: string[] = [];

      if (operators === undefined) {
        signers.forEach((signer) => programOperators.push(signer.address));
      } else {
        programOperators = operators;
      }
      console.log("NETWORK");
      if (hre.network.name == "polygon-mainnet") {
        addresses = POLYGON;
      } else if (hre.network.name == "polygon-mumbai") {
        addresses = MUMBAI;
      } else if (hre.network.name == "localhost") {
        addresses = LOCALHOST;
      } else {
        addresses = MUMBAI;
      }

      const toFile = (path: string, deployment: Record<Contracts, string>) => {
        fs.writeFileSync(path, JSON.stringify(deployment), {
          encoding: "utf-8",
        });
      };

      const contracts: Record<Contracts, Contract> = {
        ProgramFactory: new ethers.Contract(
          addresses.ProgramFactory,
          ProgramFactoryAbi.abi
        ),
        RoundFactory: new ethers.Contract(
          addresses.RoundFactory,
          RoundFactoryAbi.abi
        ),
        QuadraticFundingRelayStrategyFactory: new ethers.Contract(
          addresses.QuadraticFundingRelayStrategyFactory,
          QuadraticFundingRelayStrategyFactoryAbi.abi
        ),
        MerklePayoutStrategyFactory: new ethers.Contract(
          addresses.MerklePayoutStrategyFactory,
          MerklePayoutStrategyFactoryAbi.abi
        ),
      };
      const deployments: Record<string, string> = {
        ProgramContract: "",
        RoundContract: "",
        QuadraticFundingRelayStrategyContract: "",
        MerklePayoutStrategyContract: "",
      };
      // clone program
      console.log("LACALHOST");
      try {
        if (!addresses.ProgramFactory) {
          throw new Error("Missing programFactory address");
        }
        if (!addresses.ProgramImplementation) {
          throw new Error("Missing ProgramImplementation address");
        }
        await confirmContinue({
          info: "create a Program",
          programFactoryContract: addresses.ProgramFactory,
          programImplementationContract: addresses.ProgramImplementation,
          network: hre.network.name,
          chainId: hre.network.config.chainId,
        });

        const params = [
          {
            protocol: 1,
            pointer: programCid,
          }, // metaPtr
          adminAddress, // adminRoles
          programOperators, // programOperators
        ];

        const encodedParameters = utils.encodeProgramParameters(params);

        const programTx = await contracts.ProgramFactory.connect(
          signers[0]
        ).create(encodedParameters);

        const receipt = await programTx.wait();

        if (receipt.events) {
          const event = receipt.events.find(
            (e) => e.event === "ProgramCreated"
          );
          if (event && event.args) {
            deployments.ProgramContract = event.args.programContractAddress;
          }
        }

        console.log("✅ Txn hash: " + programTx.hash);
        console.log("✅ Program created: ", deployments.ProgramContract);
      } catch (err) {
        console.error(err);
      }
      // clone voting strategy
      try {
        await confirmContinue({
          info: "create a QF voting strategy",
          QFVotingRelayStrategyFactoryContract:
            addresses.QuadraticFundingRelayStrategyFactory,
          QFVotingRelayStrategyImplementationContract:
            addresses.QuadraticFundingRelayStrategyImplementation,
          network: hre.network.name,
          chainId: hre.network.config.chainId,
        });

        const votingStrategyTx =
          await contracts.QuadraticFundingRelayStrategyFactory.connect(
            signers[0]
          ).create();

        const receipt = await votingStrategyTx.wait();

        if (receipt.events) {
          const event = receipt.events.find(
            (e) => e.event === "VotingContractCreated"
          );
          if (event && event.args) {
            deployments.QuadraticFundingRelayStrategyContract =
              event.args.votingContractAddress;
          }
        }

        console.log("✅ Txn hash: " + votingStrategyTx.hash);
        console.log(
          "✅ QF Voting contract created: ",
          deployments.QuadraticFundingRelayStrategyContract
        );
      } catch (err) {
        console.error(err);
      }
      // clone payout strategy
      try {
        if (!addresses.MerklePayoutStrategyFactory) {
          throw new Error(`error: missing factory`);
        }

        if (!addresses.MerklePayoutStrategyImplementation) {
          throw new Error(`error: missing implementation`);
        }
        await confirmContinue({
          info: "create a merkle payout strategy",
          merklePayoutStrategyFactory: addresses.MerklePayoutStrategyFactory,
          merklePayoutStrategyImplementation:
            addresses.MerklePayoutStrategyImplementation,
          network: hre.network.name,
          chainId: hre.network.config.chainId,
        });

        const payoutStrategy =
          await contracts.MerklePayoutStrategyFactory.connect(
            signers[0]
          ).create();

        const receipt = await payoutStrategy.wait();

        if (receipt.events) {
          const event = receipt.events.find(
            (e) => e.event === "PayoutContractCreated"
          );
          if (event && event.args) {
            deployments.MerklePayoutStrategyContract =
              event.args.payoutImplementation;
          }
          if (!event) {
            const event = receipt.events.find((e) => e.event === "Initialized");
            deployments.MerklePayoutStrategyContract = event?.address;
          }
        }
        console.log("✅ Txn hash: " + receipt.hash);
        console.log(
          "✅ Merkle Payout Contract Created: ",
          deployments.MerklePayoutStrategyContract
        );
      } catch (err) {
        console.error(err);
      }
      // create round
      try {
        if (!contracts.RoundFactory) {
          throw new Error(`error: missing roundFactoryContract`);
        }

        if (!addresses.RoundImplementation) {
          throw new Error(`error: missing roundImplementationContract`);
        }

        if (!contracts.QuadraticFundingRelayStrategyFactory) {
          throw new Error(`error: missing votingContract`);
        }

        if (!deployments.MerklePayoutStrategyContract) {
          throw new Error(`error: missing deployed payout contract`);
        }
        if (!deployments.ProgramContract) {
          throw new Error(`error: missing deployed program contract`);
        }
        if (!deployments.QuadraticFundingRelayStrategyContract) {
          throw new Error(`error: missing deployed voting contract`);
        }

        await confirmContinue({
          info: "create a Round",
          roundFactoryContract: contracts.RoundFactory.address,
          roundImplementationContract: addresses.RoundImplementation,
          programContractAddress: deployments.ProgramContract,
          votingContractAddress:
            deployments.QuadraticFundingRelayStrategyContract,
          payoutContractAddress: deployments.MerklePayoutStrategyContract,
          network: hre.network.name,
          chainId: hre.network.config.chainId,
        });
        let currentTimestamp: number;
        if (hre.network.name === "localHost") {
          currentTimestamp = await time.latest();
        } else {
          const block = await ethers.provider.getBlock(
            await ethers.provider.getBlockNumber()
          );
          currentTimestamp = block.timestamp;
        }
        const applicationsStartTime = currentTimestamp + 10; // 1 second later
        const applicationsEndTime = currentTimestamp + 20; // 2 seconds later
        const roundStartTime = currentTimestamp + 50; // 1 hour later
        const roundEndTime = currentTimestamp + 100; // 1 day later

        const params = [
          deployments.QuadraticFundingRelayStrategyContract, // votingStrategyAddress
          deployments.MerklePayoutStrategyContract, // payoutStrategyAddress
          applicationsStartTime, // applicationsStartTime
          applicationsEndTime, // applicationsEndTime
          roundStartTime, // roundStartTime
          roundEndTime, // roundEndTime
          "0x7f329D36FeA6b3AD10E6e36f2728e7e6788a938D", // token
          { protocol: 1, pointer: roundCid }, // roundMetaPtr
          { protocol: 1, pointer: applicationCid }, // applicationMetaPtr
          adminAddress, // adminRoles
          programOperators, // roundOperators
        ];

        const encodedParameters = utils.encodeRoundParameters(params);

        const roundTx = await contracts.RoundFactory.connect(signers[0]).create(
          encodedParameters,
          deployments.ProgramContract // ownedBy (Program)
        );

        const receipt = await roundTx.wait();

        if (receipt.events) {
          const event = receipt.events.find((e) => e.event === "RoundCreated");
          if (event && event.args) {
            deployments.RoundContract = event.args.roundAddress;
          }
        }

        console.log("Txn hash: " + roundTx.hash);
        console.log("✅ Round created: ", deployments.RoundContract);
      } catch (err) {
        console.error(err);
      }
      toFile(
        `deployments/clone-deployments-${hre.network.name}.json`,
        deployments
      );
    }
  );
