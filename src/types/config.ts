export type ConfigValuePrimitive = boolean | number | string;

export type ConfigFieldScope = "simulation" | "policy";

export type ConfigFieldGroup =
  | "population"
  | "arena"
  | "movement"
  | "events"
  | "economy"
  | "happiness"
  | "policies"
  | "advanced";

export type ConfigTargetPath = string;

export type SpeedProfile = "slow" | "normal" | "fast";

export type SimulationConfig = {
  schemaVersion: number;
  population: {
    agentCount: number;
    initialWealth: number;
    wealthFloor: number;
    agentRadius: number;
  };
  arena: {
    width: number;
    height: number;
  };
  movement: {
    agentSpeed: number;
    eventSpeed: number;
    speedProfile: SpeedProfile;
  };
  events: {
    gridRingCount: number;
    luckSharePercent: number;
    luckyGainBase: number;
    unluckyLossBase: number;
  };
  economy: {
    yearInterval: number;
    capitalReturnBase: number;
    talentReturnBonus: number;
  };
  happiness: {
    comfortableWealth: number;
    trendClamp: number;
    bankruptcyPenalty: number;
  };
};

export type BaseFieldDefinition = {
  id: string;
  scope: ConfigFieldScope;
  group: ConfigFieldGroup;
  label: string;
  description: string;
  targetPath: ConfigTargetPath;
  applyMode: "draft-reset" | "live";
  version: number;
  visible: boolean;
  experimental?: boolean;
  advanced?: boolean;
  unit?: string;
};

export type NumberFieldDefinition = BaseFieldDefinition & {
  valueType: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  normalize?: {
    clamp?: boolean;
    roundToStep?: boolean;
    precision?: number;
  };
};

export type BooleanFieldDefinition = BaseFieldDefinition & {
  valueType: "boolean";
  defaultValue: boolean;
};

export type SelectFieldDefinition = BaseFieldDefinition & {
  valueType: "select";
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
};

export type ConfigFieldDefinition =
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | SelectFieldDefinition;

export type NormalizeIssueCode =
  | "missing"
  | "invalid_type"
  | "coerced"
  | "below_min"
  | "above_max"
  | "rounded_to_step"
  | "invalid_option";

export type NormalizeIssue = {
  fieldId: string;
  path: string;
  code: NormalizeIssueCode;
  input: unknown;
  output: ConfigValuePrimitive;
};

export type NormalizeConfigResult = {
  config: SimulationConfig;
  issues: NormalizeIssue[];
};

export type ValidationSeverity = "error" | "warning";

export type ValidationIssueCode =
  | "required"
  | "range"
  | "option"
  | "cross_field"
  | "unsupported";

export type ValidationIssue = {
  fieldId?: string;
  path?: string;
  severity: ValidationSeverity;
  code: ValidationIssueCode;
  message: string;
};

export type ValidateConfigResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export type MigrationNote = {
  fromVersion: number | null;
  toVersion: number;
  message: string;
};

export type MigrateConfigResult = {
  input: Record<string, unknown>;
  notes: MigrationNote[];
};
