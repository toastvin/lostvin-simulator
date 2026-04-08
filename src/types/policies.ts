import type { Agent } from "@/types/simulation";

export type PolicyCadence = "step" | "year";
export type PolicyType =
  | "basicIncome"
  | "wealthTax"
  | "progressiveTax"
  | "bankruptcyFloor"
  | "bailout"
  | "talentGrant";

export type PolicyBracket = {
  threshold: number;
  rate: number;
};

export type BasicIncomePolicy = {
  id: string;
  type: "basicIncome";
  enabled: boolean;
  amount: number;
  cadence: "step" | "year";
};

export type WealthTaxPolicy = {
  id: string;
  type: "wealthTax";
  enabled: boolean;
  threshold: number;
  rate: number;
  cadence: "year";
};

export type ProgressiveTaxPolicy = {
  id: string;
  type: "progressiveTax";
  enabled: boolean;
  brackets: PolicyBracket[];
  cadence: "year";
};

export type BankruptcyFloorPolicy = {
  id: string;
  type: "bankruptcyFloor";
  enabled: boolean;
  minimumWealth: number;
  cadence: "step";
};

export type BailoutPolicy = {
  id: string;
  type: "bailout";
  enabled: boolean;
  triggerWealth: number;
  amount: number;
  maxPerAgent: number;
  cadence: "step";
};

export type TalentGrantPolicy = {
  id: string;
  type: "talentGrant";
  enabled: boolean;
  talentThreshold: number;
  wealthCeiling: number;
  amount: number;
  cadence: "year";
};

export type Policy =
  | BasicIncomePolicy
  | WealthTaxPolicy
  | ProgressiveTaxPolicy
  | BankruptcyFloorPolicy
  | BailoutPolicy
  | TalentGrantPolicy;

export type PolicyParameterValueType =
  | "number"
  | "boolean"
  | "select"
  | "brackets";

export type PolicyParameterDefinition = {
  key: string;
  label: string;
  description: string;
  valueType: PolicyParameterValueType;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
};

export type PolicyTypeDefinition = {
  type: PolicyType;
  label: string;
  description: string;
  supportedCadences: PolicyCadence[];
  parameters: PolicyParameterDefinition[];
};

export type PolicyPreset = {
  id: string;
  name: string;
  description: string;
  policies: Policy[];
};

export type PolicyApplicationSummary = {
  netCost: number;
  grossSpend: number;
  grossRevenue: number;
  appliedPolicyIds: string[];
};

export type PolicyApplicationResult = {
  agents: Agent[];
  summary: PolicyApplicationSummary;
};

export type PolicyValidationIssueCode =
  | "required"
  | "duplicate_id"
  | "unsupported_cadence"
  | "invalid_number"
  | "below_min"
  | "above_max"
  | "empty_brackets"
  | "invalid_bracket"
  | "unsorted_brackets";

export type PolicyValidationIssue = {
  policyId?: string;
  path: string;
  severity: "error" | "warning";
  code: PolicyValidationIssueCode;
  message: string;
};

export type ValidatePoliciesResult = {
  valid: boolean;
  errors: PolicyValidationIssue[];
  warnings: PolicyValidationIssue[];
};
