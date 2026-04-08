import { createComposerBlock, createComposerRuleId } from "@/lib/composer/defaults";
import type {
  ComposerBlock,
  ComposerDocument,
  ImportPoliciesToComposerResult,
} from "@/types/composer";
import type { Policy } from "@/types/policies";

function createRuleNameFromPolicyType(type: Policy["type"]) {
  switch (type) {
    case "basicIncome":
      return "Imported Basic Income";
    case "wealthTax":
      return "Imported Wealth Tax";
    case "progressiveTax":
      return "Imported Progressive Tax";
    case "bankruptcyFloor":
      return "Imported Bankruptcy Floor";
    case "bailout":
      return "Imported Bailout";
    case "talentGrant":
      return "Imported Talent Grant";
  }
}

function withPayload<TBlock extends ComposerBlock>(
  block: TBlock,
  payload: TBlock["payload"],
): TBlock {
  return {
    ...block,
    payload,
  };
}

export function importPoliciesToComposer(
  policies: Policy[],
): ImportPoliciesToComposerResult {
  const warnings: string[] = [];
  const document: ComposerDocument = {
    version: 1,
    rules: [],
  };

  policies.forEach((policy) => {
    const ruleId = createComposerRuleId(document.rules);

    switch (policy.type) {
      case "basicIncome":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            createComposerBlock("allAgents"),
            withPayload(createComposerBlock("grantAmount"), {
              amount: policy.amount,
            }),
          ],
        });
        break;
      case "wealthTax":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            createComposerBlock("allAgents"),
            withPayload(createComposerBlock("wealthTax"), {
              threshold: policy.threshold,
              rate: policy.rate,
            }),
          ],
        });
        break;
      case "progressiveTax":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            createComposerBlock("allAgents"),
            withPayload(createComposerBlock("progressiveTax"), {
              brackets: structuredClone(policy.brackets),
            }),
          ],
        });
        break;
      case "bankruptcyFloor":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            withPayload(createComposerBlock("wealthBelow", [], undefined, "target"), {
              threshold: policy.minimumWealth,
            }),
            withPayload(createComposerBlock("setWealthFloor"), {
              minimumWealth: policy.minimumWealth,
            }),
          ],
        });
        break;
      case "bailout":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            createComposerBlock("allAgents"),
            withPayload(createComposerBlock("bailout"), {
              triggerWealth: policy.triggerWealth,
              amount: policy.amount,
              maxPerAgent: policy.maxPerAgent,
            }),
          ],
        });
        break;
      case "talentGrant":
        document.rules.push({
          id: ruleId,
          name: createRuleNameFromPolicyType(policy.type),
          enabled: policy.enabled,
          cadence: policy.cadence,
          blocks: [
            withPayload(createComposerBlock("highTalentLowWealth"), {
              talentThreshold: policy.talentThreshold,
              wealthCeiling: policy.wealthCeiling,
            }),
            withPayload(createComposerBlock("talentGrant"), {
              talentThreshold: policy.talentThreshold,
              wealthCeiling: policy.wealthCeiling,
              amount: policy.amount,
            }),
          ],
        });
        break;
      default:
        warnings.push(`Unsupported policy type was skipped during import.`);
    }
  });

  return { document, warnings };
}
