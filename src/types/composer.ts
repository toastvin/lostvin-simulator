import type { PolicyBracket } from "@/types/policies";

export type ComposerVersion = 1;
export type ComposerCadence = "step" | "year";

export type ComposerBlockCategory =
  | "target"
  | "condition"
  | "effect"
  | "modifier";

export type ComposerTargetType =
  | "allAgents"
  | "bottomWealthPercent"
  | "topWealthPercent"
  | "wealthBelow"
  | "wealthAbove"
  | "talentAbove"
  | "highTalentLowWealth"
  | "bankruptAgents";

export type ComposerConditionType =
  | "wealthBelow"
  | "wealthAbove"
  | "talentBelow"
  | "talentAbove"
  | "rescuedCountBelow"
  | "bankruptCountAtLeast";

export type ComposerEffectType =
  | "grantAmount"
  | "wealthTax"
  | "progressiveTax"
  | "setWealthFloor"
  | "bailout"
  | "talentGrant";

export type ComposerModifierType =
  | "budgetCap"
  | "maxRecipients"
  | "weightMultiplier"
  | "priorityScoreWeight";

export type ComposerBlockType =
  | ComposerTargetType
  | ComposerConditionType
  | ComposerEffectType
  | ComposerModifierType;

export type AllAgentsTargetPayload = Record<string, never>;

export type BottomWealthPercentTargetPayload = {
  percent: number;
};

export type TopWealthPercentTargetPayload = {
  percent: number;
};

export type WealthThresholdTargetPayload = {
  threshold: number;
};

export type TalentThresholdTargetPayload = {
  threshold: number;
};

export type HighTalentLowWealthTargetPayload = {
  talentThreshold: number;
  wealthCeiling: number;
};

export type BankruptAgentsTargetPayload = {
  minBankruptCount: number;
};

export type TargetPayloadMap = {
  allAgents: AllAgentsTargetPayload;
  bottomWealthPercent: BottomWealthPercentTargetPayload;
  topWealthPercent: TopWealthPercentTargetPayload;
  wealthBelow: WealthThresholdTargetPayload;
  wealthAbove: WealthThresholdTargetPayload;
  talentAbove: TalentThresholdTargetPayload;
  highTalentLowWealth: HighTalentLowWealthTargetPayload;
  bankruptAgents: BankruptAgentsTargetPayload;
};

export type WealthConditionPayload = {
  threshold: number;
};

export type TalentConditionPayload = {
  threshold: number;
};

export type RescuedCountConditionPayload = {
  maxRescuedCount: number;
};

export type BankruptCountConditionPayload = {
  minBankruptCount: number;
};

export type ConditionPayloadMap = {
  wealthBelow: WealthConditionPayload;
  wealthAbove: WealthConditionPayload;
  talentBelow: TalentConditionPayload;
  talentAbove: TalentConditionPayload;
  rescuedCountBelow: RescuedCountConditionPayload;
  bankruptCountAtLeast: BankruptCountConditionPayload;
};

export type GrantAmountEffectPayload = {
  amount: number;
};

export type WealthTaxEffectPayload = {
  threshold: number;
  rate: number;
};

export type ProgressiveTaxEffectPayload = {
  brackets: PolicyBracket[];
};

export type SetWealthFloorEffectPayload = {
  minimumWealth: number;
};

export type BailoutEffectPayload = {
  triggerWealth: number;
  amount: number;
  maxPerAgent: number;
};

export type TalentGrantEffectPayload = {
  talentThreshold: number;
  wealthCeiling: number;
  amount: number;
};

export type EffectPayloadMap = {
  grantAmount: GrantAmountEffectPayload;
  wealthTax: WealthTaxEffectPayload;
  progressiveTax: ProgressiveTaxEffectPayload;
  setWealthFloor: SetWealthFloorEffectPayload;
  bailout: BailoutEffectPayload;
  talentGrant: TalentGrantEffectPayload;
};

export type BudgetCapModifierPayload = {
  maxBudget: number;
};

export type MaxRecipientsModifierPayload = {
  count: number;
};

export type WeightMultiplierModifierPayload = {
  value: number;
};

export type PriorityScoreWeightModifierPayload = {
  talentWeight: number;
  wealthWeight: number;
  bankruptWeight: number;
};

export type ModifierPayloadMap = {
  budgetCap: BudgetCapModifierPayload;
  maxRecipients: MaxRecipientsModifierPayload;
  weightMultiplier: WeightMultiplierModifierPayload;
  priorityScoreWeight: PriorityScoreWeightModifierPayload;
};

export type ComposerTargetBlock<T extends ComposerTargetType = ComposerTargetType> = {
  id: string;
  category: "target";
  type: T;
  payload: TargetPayloadMap[T];
};

export type ComposerConditionBlock<
  T extends ComposerConditionType = ComposerConditionType,
> = {
  id: string;
  category: "condition";
  type: T;
  payload: ConditionPayloadMap[T];
};

export type ComposerEffectBlock<T extends ComposerEffectType = ComposerEffectType> = {
  id: string;
  category: "effect";
  type: T;
  payload: EffectPayloadMap[T];
};

export type ComposerModifierBlock<
  T extends ComposerModifierType = ComposerModifierType,
> = {
  id: string;
  category: "modifier";
  type: T;
  payload: ModifierPayloadMap[T];
};

export type ComposerBlock =
  | ComposerTargetBlock
  | ComposerConditionBlock
  | ComposerEffectBlock
  | ComposerModifierBlock;

export type ComposerRule = {
  id: string;
  name: string;
  enabled: boolean;
  cadence: ComposerCadence;
  blocks: ComposerBlock[];
};

export type ComposerDocument = {
  version: ComposerVersion;
  rules: ComposerRule[];
};

export type ComposerMode =
  | "preset_import"
  | "custom_draft"
  | "custom_applied";

export type ComposerSelection = {
  ruleId: string | null;
  blockId: string | null;
};

export type ComposerParameterValueType = "number" | "boolean" | "select";

export type ComposerParameterDefinition = {
  key: string;
  label: string;
  description: string;
  valueType: ComposerParameterValueType;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
};

export type ComposerBlockDefinition<TBlock extends ComposerBlock = ComposerBlock> = {
  type: TBlock["type"];
  category: TBlock["category"];
  label: string;
  description: string;
  parameters: ComposerParameterDefinition[];
  defaultPayload: TBlock["payload"];
  allowedRuleCadences?: ComposerCadence[];
  allowsMultiplePerRule?: boolean;
  sortOrder: number;
};

export type ComposerValidationIssueCode =
  | "missing_rule_name"
  | "duplicate_rule_id"
  | "duplicate_block_id"
  | "missing_target"
  | "missing_effect"
  | "multiple_targets"
  | "invalid_payload"
  | "below_min"
  | "above_max"
  | "invalid_order"
  | "unsupported_cadence"
  | "unsupported_combination"
  | "empty_document"
  | "empty_brackets"
  | "invalid_bracket";

export type ComposerValidationIssue = {
  ruleId?: string;
  blockId?: string;
  path: string;
  severity: "error" | "warning";
  code: ComposerValidationIssueCode;
  message: string;
};

export type ValidateComposerResult = {
  valid: boolean;
  errors: ComposerValidationIssue[];
  warnings: ComposerValidationIssue[];
};

export type CompiledTargetSelector =
  | { kind: "allAgents" }
  | { kind: "bottomWealthPercent"; percent: number }
  | { kind: "topWealthPercent"; percent: number }
  | { kind: "wealthBelow"; threshold: number }
  | { kind: "wealthAbove"; threshold: number }
  | { kind: "talentAbove"; threshold: number }
  | {
      kind: "highTalentLowWealth";
      talentThreshold: number;
      wealthCeiling: number;
    }
  | { kind: "bankruptAgents"; minBankruptCount: number };

export type CompiledCondition =
  | { kind: "wealthBelow"; threshold: number }
  | { kind: "wealthAbove"; threshold: number }
  | { kind: "talentBelow"; threshold: number }
  | { kind: "talentAbove"; threshold: number }
  | { kind: "rescuedCountBelow"; maxRescuedCount: number }
  | { kind: "bankruptCountAtLeast"; minBankruptCount: number };

export type CompiledEffect =
  | { kind: "grantAmount"; amount: number }
  | { kind: "wealthTax"; threshold: number; rate: number }
  | { kind: "progressiveTax"; brackets: PolicyBracket[] }
  | { kind: "setWealthFloor"; minimumWealth: number }
  | {
      kind: "bailout";
      triggerWealth: number;
      amount: number;
      maxPerAgent: number;
    }
  | {
      kind: "talentGrant";
      talentThreshold: number;
      wealthCeiling: number;
      amount: number;
    };

export type CompiledModifier =
  | { kind: "budgetCap"; maxBudget: number }
  | { kind: "maxRecipients"; count: number }
  | { kind: "weightMultiplier"; value: number }
  | {
      kind: "priorityScoreWeight";
      talentWeight: number;
      wealthWeight: number;
      bankruptWeight: number;
    };

export type CompiledComposerRule = {
  id: string;
  name: string;
  enabled: boolean;
  cadence: ComposerCadence;
  target: CompiledTargetSelector;
  conditions: CompiledCondition[];
  effects: CompiledEffect[];
  modifiers: CompiledModifier[];
};

export type CompileComposerResult = {
  compiledRules: CompiledComposerRule[];
  warnings: string[];
};

export type ImportPoliciesToComposerResult = {
  document: ComposerDocument;
  warnings: string[];
};

export type ExportComposerResult = {
  json: string;
  filename: string;
};

export type ComposerPanelTab =
  | "palette"
  | "inspector"
  | "astPreview"
  | "compiledPreview";

export type ComposerDragState = {
  draggingRuleId: string | null;
  draggingBlockId: string | null;
  overRuleId: string | null;
  overBlockId: string | null;
};

export type ComposerUiState = {
  activeTab: ComposerPanelTab;
  dragState: ComposerDragState;
  mobilePaletteOpen: boolean;
  previewCollapsed: boolean;
};
