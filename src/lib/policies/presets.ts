import type { PolicyPreset } from "@/types/policies";

export const policyPresets: PolicyPreset[] = [
  {
    id: "laissez-faire",
    name: "Laissez-faire",
    description: "No policy intervention. Baseline run for comparison.",
    policies: [],
  },
  {
    id: "universal-basic-income",
    name: "Universal Basic Income",
    description: "Provides a yearly unconditional income to every agent.",
    policies: [
      {
        id: "ubi-yearly",
        type: "basicIncome",
        enabled: true,
        amount: 8,
        cadence: "year",
      },
    ],
  },
  {
    id: "progressive-tax-safety-net",
    name: "Progressive Tax + Safety Net",
    description: "Taxes top wealth and protects agents near bankruptcy.",
    policies: [
      {
        id: "progressive-tax-core",
        type: "progressiveTax",
        enabled: true,
        cadence: "year",
        brackets: [
          { threshold: 150, rate: 0.04 },
          { threshold: 300, rate: 0.08 },
          { threshold: 600, rate: 0.12 },
        ],
      },
      {
        id: "safety-floor",
        type: "bankruptcyFloor",
        enabled: true,
        minimumWealth: 10,
        cadence: "step",
      },
      {
        id: "rescue-bailout",
        type: "bailout",
        enabled: true,
        triggerWealth: 0,
        amount: 6,
        maxPerAgent: 2,
        cadence: "step",
      },
    ],
  },
  {
    id: "talent-rescue",
    name: "Talent Rescue",
    description: "Targets high-talent agents who remain trapped by low wealth.",
    policies: [
      {
        id: "talent-grant-core",
        type: "talentGrant",
        enabled: true,
        talentThreshold: 0.8,
        wealthCeiling: 90,
        amount: 25,
        cadence: "year",
      },
      {
        id: "talent-rescue-bailout",
        type: "bailout",
        enabled: true,
        triggerWealth: 0,
        amount: 5,
        maxPerAgent: 1,
        cadence: "step",
      },
    ],
  },
  {
    id: "balanced-welfare-state",
    name: "Balanced Welfare State",
    description:
      "Mixes redistribution, safety net protection, and targeted recovery support.",
    policies: [
      {
        id: "balanced-ubi",
        type: "basicIncome",
        enabled: true,
        amount: 5,
        cadence: "year",
      },
      {
        id: "balanced-wealth-tax",
        type: "wealthTax",
        enabled: true,
        threshold: 350,
        rate: 0.06,
        cadence: "year",
      },
      {
        id: "balanced-floor",
        type: "bankruptcyFloor",
        enabled: true,
        minimumWealth: 8,
        cadence: "step",
      },
      {
        id: "balanced-talent-grant",
        type: "talentGrant",
        enabled: true,
        talentThreshold: 0.75,
        wealthCeiling: 100,
        amount: 15,
        cadence: "year",
      },
    ],
  },
];

export function getPolicyPresets(): PolicyPreset[] {
  return structuredClone(policyPresets);
}

export function getPolicyPresetById(id: string): PolicyPreset | undefined {
  return policyPresets.find((preset) => preset.id === id);
}
