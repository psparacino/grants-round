import { ContractFactory } from "ethers";
import * as fs from "fs";
import { task } from "hardhat/config";
import { confirmContinue } from "../utils/script-utils";

type Contracts =
  | "ProgramFactory"
  | "ProgramImplementation"
  | "RoundFactory"
  | "RoundImplementation"
  | "QuadraticFundingRelayStrategyFactory"
  | "QuadraticFundingRelayStrategyImplementation"
  | "MerklePayoutStrategyFactory"
  | "MerklePayoutStrategyImplementation";

task("deployAll", "Deploy contracts and verify").setAction(
  async (_, { ethers }) => {
    const contracts: Record<Contracts, ContractFactory> = {
      ProgramFactory: await ethers.getContractFactory("ProgramFactory"),
      ProgramImplementation: await ethers.getContractFactory(
        "ProgramImplementation"
      ),
      RoundFactory: await ethers.getContractFactory("RoundFactory"),
      RoundImplementation: await ethers.getContractFactory(
        "RoundImplementation"
      ),
      QuadraticFundingRelayStrategyFactory: await ethers.getContractFactory(
        "QuadraticFundingRelayStrategyFactory"
      ),
      QuadraticFundingRelayStrategyImplementation:
        await ethers.getContractFactory(
          "QuadraticFundingRelayStrategyImplementation"
        ),
      MerklePayoutStrategyFactory: await ethers.getContractFactory(
        "MerklePayoutStrategyFactory"
      ),
      MerklePayoutStrategyImplementation: await ethers.getContractFactory(
        "MerklePayoutStrategyImplementation"
      ),
    };

    const deployments: Record<Contracts, string> = {
      ProgramFactory: "",
      ProgramImplementation: "",
      RoundFactory: "",
      RoundImplementation: "",
      QuadraticFundingRelayStrategyFactory: "",
      QuadraticFundingRelayStrategyImplementation: "",
      MerklePayoutStrategyFactory: "",
      MerklePayoutStrategyImplementation: "",
    };

    const toFile = (path: string, deployment: Record<Contracts, string>) => {
      fs.writeFileSync(path, JSON.stringify(deployment), { encoding: "utf-8" });
    };

    for (const [name, contract] of Object.entries(contracts)) {
      console.log(`Starting deployment of ${name}`);
      const factory = contract;
      let instance;
      if (name.includes("Factory")) {
        instance = await hre.upgrades.deployProxy(factory);
        console.log(`Deploying factory to: ${instance.address}`);
      }

      if (name.includes("Implementation")) {
        instance = await factory.deploy();
        console.log(`Deploying Implementation to: ${instance.address}`);
      }
      await instance.deployed();

      console.log(`${name} is deployed to address: ${instance.address}`);

      deployments[name as Contracts] = instance.address;

      toFile(`deployments/deployments-${hre.network.name}.json`, deployments);

      if (hre.network.name !== ("localhost" || "hardhat")) {
        try {
          const code = await instance.instance?.provider.getCode(
            instance.address
          );
          if (code === "0x") {
            console.log(
              `${instance.name} contract deployment has not completed. waiting to verify...`
            );
            await instance.instance?.deployed();
          }

          await hre.run("verify:verify", {
            address: instance.address,
          });
        } catch ({ message }) {
          if ((message as string).includes("Reason: Already Verified")) {
            console.log("Reason: Already Verified");
          }
          console.error(message);
        }
      }
    }

    // link contracts
    for (const [name, address] of Object.entries(deployments)) {
      if (name.includes("Factory")) {
        // get string cutting off last 7 letters
        const substring = name.slice(0, -7);
        // search add "Implementation" to the end of string
        const implementationString = substring.concat("Implementation");
        // find implementation address
        const implementationAddress = Object.entries(deployments).filter(
          (deployment) => deployment[0] === implementationString
        )[0][1];

        switch (name) {
          case "ProgramFactory":
            {
              if (!address) {
                throw new Error("missing programFactoryContract address");
              }
              if (!implementationAddress) {
                throw new Error(
                  "missing programImplementationContract address"
                );
              }
              const factory = await ethers.getContractAt(
                "ProgramFactory",
                address
              );
              await confirmContinue({
                contract: "ProgramFactory",
                programFactoryContract: address,
                programImplementationContract: implementationAddress,
                network: hre.network.name,
                chainId: hre.network.config.chainId,
              });

              // Update ProgramImplementation
              const updateTx = await factory.updateProgramContract(
                implementationAddress
              );
              await updateTx.wait();

              console.log(
                "✅ ProgramImplementation Contract Linked to ProgramFactory contract"
              );
            }
            break;
          case "RoundFactory":
            {
              if (!address) {
                throw new Error("missing RoundFactoryContract address");
              }
              if (!implementationAddress) {
                throw new Error(
                  "missing programImplementationContract address"
                );
              }
              const factory = await ethers.getContractAt(
                "RoundFactory",
                address
              );
              await confirmContinue({
                contract: "RoundFactory",
                RoundFactoryContract: address,
                programImplementationContract: implementationAddress,
                network: hre.network.name,
                chainId: hre.network.config.chainId,
              });

              // Update ProgramImplementation
              const updateTx = await factory.updateRoundContract(
                implementationAddress
              );
              await updateTx.wait();

              console.log(
                "✅ RoundImplementation Contract Linked to RoundFactory contract"
              );
            }
            break;
          case "QuadraticFundingRelayStrategyFactory":
            {
              if (!address) {
                throw new Error(
                  "missing QuadraticFundingRelayStrategyFactoryContract address"
                );
              }
              if (!implementationAddress) {
                throw new Error(
                  "missing programImplementationContract address"
                );
              }
              const factory = await ethers.getContractAt(
                "QuadraticFundingRelayStrategyFactory",
                address
              );
              await confirmContinue({
                contract: "QuadraticFundingRelayStrategyFactory",
                QuadraticFundingRelayStrategyFactoryContract: address,
                programImplementationContract: implementationAddress,
                network: hre.network.name,
                chainId: hre.network.config.chainId,
              });

              // Update ProgramImplementation
              const updateTx = await factory.updateVotingContract(
                implementationAddress
              );
              await updateTx.wait();

              console.log(
                "✅ QuadraticFundingRelayStrategyImplementation Contract Linked to QuadraticFundingRelayStrategyFactory contract"
              );
            }
            break;
          case "MerklePayoutStrategyFactory":
            try {
              if (!address) {
                throw new Error(
                  "missing MerklePayoutStrategyFactoryContract address"
                );
              }
              if (!implementationAddress) {
                throw new Error(
                  "missing programImplementationContract address"
                );
              }
              const factory = await ethers.getContractAt(
                "MerklePayoutStrategyFactory",
                address
              );
              await confirmContinue({
                contract: "MerklePayoutStrategyFactory",
                MerklePayoutStrategyFactoryContract: address,
                programImplementationContract: implementationAddress,
                network: hre.network.name,
                chainId: hre.network.config.chainId,
              });

              // Update ProgramImplementation
              const updateTx = await factory.updatePayoutImplementation(
                implementationAddress
              );
              await updateTx.wait();

              console.log(
                "✅ MerklePayoutStrategyImplementation Contract Linked to MerklePayoutStrategyFactory contract"
              );
            } catch (err) {
              console.error(err);
            }
            break;
        }
      }
    }
  }
);
