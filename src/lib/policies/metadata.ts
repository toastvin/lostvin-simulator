import type {
  Policy,
  PolicyCadence,
  PolicyType,
  PolicyTypeDefinition,
} from "@/types/policies";

const policyTypeDefinitions: Record<PolicyType, PolicyTypeDefinition> = {
  basicIncome: {
    type: "basicIncome",
    label: "Basic Income",
    description: "Distributes fixed income to every agent on a fixed cadence.",
    supportedCadences: ["step", "year"],
    parameters: [
      {
        key: "amount",
        label: "Amount",
        description: "Transfer amount per application.",
        valueType: "number",
        min: 0,
        max: 1000,
        step: 1,
      },
    ],
  },
  wealthTax: {
    type: "wealthTax",
    label: "Wealth Tax",
    description:
      "Taxes wealth above a threshold and reduces concentration at the top.",
    supportedCadences: ["year"],
    parameters: [
      {
        key: "threshold",
        label: "Threshold",
        description: "Wealth above this threshold becomes taxable.",
        valueType: "number",
        min: 0,
        max: 100000,
        step: 10,
      },
      {
        key: "rate",
        label: "Rate",
        description: "Marginal rate applied to wealth above the threshold.",
        valueType: "number",
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  progressiveTax: {
    type: "progressiveTax",
    label: "Progressive Tax",
    description: "Taxes wealth progressively with multiple brackets.",
    supportedCadences: ["year"],
    parameters: [
      {
        key: "brackets",
        label: "Brackets",
        description: "Ordered threshold and rate pairs.",
        valueType: "brackets",
      },
    ],
  },
  bankruptcyFloor: {
    type: "bankruptcyFloor",
    label: "Bankruptcy Floor",
    description:
      "Prevents agents from staying below a minimum wealth threshold.",
    supportedCadences: ["step"],
    parameters: [
      {
        key: "minimumWealth",
        label: "Minimum Wealth",
        description: "Wealth floor enforced after each step.",
        valueType: "number",
        min: 0,
        max: 10000,
        step: 1,
      },
    ],
  },
  bailout: {
    type: "bailout",
    label: "Bailout",
    description:
      "Rescues agents under a trigger wealth until the per-agent limit is used.",
    supportedCadences: ["step"],
    parameters: [
      {
        key: "triggerWealth",
        label: "Trigger Wealth",
        description: "Rescue applies when wealth is less than or equal to this value.",
        valueType: "number",
        min: 0,
        max: 10000,
        step: 1,
      },
      {
        key: "amount",
        label: "Amount",
        description: "Relief amount added on each bailout.",
        valueType: "number",
        min: 0,
        max: 10000,
        step: 1,
      },
      {
        key: "maxPerAgent",
        label: "Max Per Agent",
        description: "Maximum bailout count allowed per agent.",
        valueType: "number",
        min: 1,
        max: 100,
        step: 1,
      },
    ],
  },
  talentGrant: {
    type: "talentGrant",
    label: "Talent Grant",
    description:
      "Supports high-talent, low-wealth agents with a targeted yearly grant.",
    supportedCadences: ["year"],
    parameters: [
      {
        key: "talentThreshold",
        label: "Talent Threshold",
        description: "Minimum talent required to qualify.",
        valueType: "number",
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: "wealthCeiling",
        label: "Wealth Ceiling",
        description: "Maximum wealth allowed to stay eligible.",
        valueType: "number",
        min: 0,
        max: 100000,
        step: 1,
      },
      {
        key: "amount",
        label: "Amount",
        description: "Grant amount distributed to eligible agents.",
        valueType: "number",
        min: 0,
        max: 10000,
        step: 1,
      },
    ],
  },
};

export function getPolicyTypeDefinitions(): PolicyTypeDefinition[] {
  return Object.values(policyTypeDefinitions);
}

export function createPolicyId(
  type: PolicyType,
  existingPolicies: Policy[] = [],
): string {
  const existingIds = new Set(existingPolicies.map((policy) => policy.id));
  let index = existingPolicies.filter((policy) => policy.type === type).length + 1;
  let candidate = `${type}-${index}`;

  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `${type}-${index}`;
  }

  return candidate;
}

export function getPolicyTypeDefinition(
  type: PolicyType,
): PolicyTypeDefinition {
  return policyTypeDefinitions[type];
}

export function createDefaultPolicy(
  type: PolicyType,
  id = `${type}-policy`,
): Policy {
  switch (type) {
    case "basicIncome":
      return {
        id,
        type,
        enabled: true,
        amount: 5,
        cadence: "year",
      };
    case "wealthTax":
      return {
        id,
        type,
        enabled: true,
        threshold: 300,
        rate: 0.05,
        cadence: "year",
      };
    case "progressiveTax":
      return {
        id,
        type,
        enabled: true,
        brackets: [
          { threshold: 200, rate: 0.05 },
          { threshold: 400, rate: 0.1 },
        ],
        cadence: "year",
      };
    case "bankruptcyFloor":
      return {
        id,
        type,
        enabled: true,
        minimumWealth: 10,
        cadence: "step",
      };
    case "bailout":
      return {
        id,
        type,
        enabled: true,
        triggerWealth: 0,
        amount: 8,
        maxPerAgent: 3,
        cadence: "step",
      };
    case "talentGrant":
      return {
        id,
        type,
        enabled: true,
        talentThreshold: 0.8,
        wealthCeiling: 120,
        amount: 20,
        cadence: "year",
      };
  }
}

export function supportsCadence(
  type: PolicyType,
  cadence: PolicyCadence,
): boolean {
  return getPolicyTypeDefinition(type).supportedCadences.includes(cadence);
}
