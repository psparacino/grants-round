import {
  Bytes,
  json,
  dataSource,
  JSONValueKind,
  log,
} from "@graphprotocol/graph-ts";
import { RoundMetaData } from "../../generated/schema";

export function handleMetadata(content: Bytes): void {
  log.info("hit", []);
  log.info("handleMetadata log: {}", [dataSource.stringParam()]);
  let roundMetadata = new RoundMetaData(dataSource.stringParam());
  
  const value = json.fromBytes(content).toObject();

  roundMetadata.id = dataSource.stringParam();
  roundMetadata.name = "";
  roundMetadata.description = "";
  roundMetadata.requirements = [];
  roundMetadata.supportEmail = "";

  if (value) {
    log.info("value hit", []);
    const name = value.get("name");

    const eligibility = value.get("eligibility");
    const support = value.get("support");

    if (name && eligibility && support) {
      log.info("hitname: {}", [name.toString()]);
      roundMetadata.name = name.toString();
      roundMetadata.supportEmail = "";
      if (support) {
        const supportObject = support.toObject();
        const info = supportObject.get("info");

        if (info) {
          roundMetadata.supportEmail = info.toString();
        }
      }

      const eligibilityObject = eligibility.toObject();
      const description = eligibilityObject.get("description");
      const requirementsJSON = eligibilityObject.get("requirements");

      if (requirementsJSON && description) {
        log.info("description: {}", [description.toString()]);
        roundMetadata.description = description ? description.toString() : "";

        if (requirementsJSON.kind == JSONValueKind.ARRAY) {
          const requirementsArray = requirementsJSON.toArray();
          let requirements: string[] = [];

          for (let i = 0; i < requirementsArray.length; i++) {
            if (requirementsArray[i].kind == JSONValueKind.OBJECT) {
              let requirementObject = requirementsArray[i].toObject();
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

    
  }
  log.info("before save", [])
  log.info("final check: {}", [roundMetadata.name.toString()]  );
  log.info("final check: {}", [roundMetadata.description.toString()]  );
  log.info("final check: {}", [roundMetadata.supportEmail.toString()]  );
  roundMetadata.save();
}
