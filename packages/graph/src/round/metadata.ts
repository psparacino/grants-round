import {
  Bytes,
  json,
  dataSource,
  JSONValueKind,
  log,
} from "@graphprotocol/graph-ts";
import { RoundMetaData } from "../../generated/schema";

export function handleMetaData(content: Bytes): void {
  log.info("handleMetadata fired: {}", [dataSource.stringParam()]);
  let roundMetadata = new RoundMetaData(dataSource.stringParam());

  roundMetadata.id = dataSource.stringParam();
  roundMetadata.name = "";
  roundMetadata.description = "";
  roundMetadata.requirements = [];
  roundMetadata.supportEmail = "";


  const value = json.fromBytes(content).toObject();


  if (value) {
    const name = value.get("name");

    if (name) {
      log.info("handleMetaData name {}", [name.toString()]);
      roundMetadata.name = name.toString();
    }

    const support = value.get("support");
    roundMetadata.supportEmail = "";

    if (support && support.kind == JSONValueKind.OBJECT) {
      const supportObject = support.toObject();
      if (supportObject.isSet("info")) {
        const info = supportObject.get("info");

        if (info && info.kind == JSONValueKind.STRING) {
          log.info("handleMetaData support info {}", [info.toString()]);
          roundMetadata.supportEmail = info.toString();
        }
      }
    }

    const eligibility = value.get("eligibility");
    roundMetadata.requirements = [];

    if (eligibility && eligibility.kind == JSONValueKind.OBJECT) {
      const eligibilityObject = eligibility.toObject();

      if (eligibilityObject.isSet("description")) {
        const description = eligibilityObject.get("description");
        if (description) {
          log.info("description: {}", [description.toString()]);
          roundMetadata.description = description ? description.toString() : "";
        }
      }

      const requirementsArray = eligibilityObject.get("requirements");

      if (requirementsArray) {
        if (requirementsArray.kind == JSONValueKind.ARRAY) {
          const requirementsConverted = requirementsArray.toArray();
          let requirements: string[] = [];

          for (let i = 0; i < requirementsConverted.length; i++) {
            if (requirementsConverted[i].kind == JSONValueKind.OBJECT) {
              let requirementObject = requirementsConverted[i].toObject();
              let requirement = requirementObject.get("requirement");

              if (requirement && requirement.kind == JSONValueKind.STRING) {
                requirements.push(requirement.toString());
              }
            }
          }

          roundMetadata.requirements = requirements;
        }
      }
    }

    log.info("final handleMetaData check: {}", [roundMetadata.name.toString()]);
    log.info("final handleMetaData check: {}", [roundMetadata.description.toString()]);
    log.info("final handleMetaData check: {}", [roundMetadata.supportEmail.toString()]);
    roundMetadata.save();
  }
}
