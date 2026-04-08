# Phase 9 - Visual Policy Composer

## 위치

- 이 phase는 `Phase 8` 이후의 고급 확장 phase다.
- `Phase 8`이 끝나면 홈페이지와 제한형 rule builder는 이미 usable 하다.
- `Phase 9`의 목적은 그 위에 `Scratch` 스타일의 시각적 정책 조합기를 올리는 것이다.

즉, 이 phase는 MVP를 완성하는 단계가 아니라, `사용자 정의 자유도`를 한 단계 더 여는 단계다.

## 목표

사용자가 정책을 `preset 선택`이나 `폼 입력` 수준을 넘어서,  
허용된 블록을 조합해 직접 설계할 수 있게 만든다.

단, 아래 원칙은 절대 깨지지 않아야 한다.

- arbitrary code execution 금지
- 자유 문자열 수식 파싱 금지
- block registry 기반 제어
- 내부 표현은 JSON AST
- invalid composer draft는 applied로 넘기지 않음

## 이 phase가 필요한 이유

Phase 8의 rule builder는 실용적이지만, 정책 타입이 이미 정해져 있어야 한다.

하지만 이 프로젝트의 장기 방향은 다음에 가깝다.

- 시스템은 조합 가능한 요소를 제한한다
- 사용자는 그 제한 안에서 훨씬 자유롭게 조합한다
- 새 변수와 새 블록이 계속 추가돼도 UI 구조가 버텨야 한다

그래서 `정책 타입 목록을 선택하는 UI`에서 `정책 블록을 조합하는 UI`로 한 단계 올라가는 phase가 필요하다.

## 반드시 구현

- visual block composer
- 블록 추가 / 삭제 / 순서 변경
- 드래그 기반 재배치
- 모바일 fallback 조작 방식
- AST validation
- AST -> compiled rule preview
- preset -> composer draft import
- composer invalid state 차단
- 빈 상태 / 도움말 / 에러 상태
- 기존 same-seed comparison 흐름 유지

## v1 범위 제한

첫 버전에서 `자유 좌표 무한 캔버스`까지 가면 복잡도가 너무 커진다.  
따라서 v1은 아래처럼 제한한다.

- block editor는 `slot-based vertical composer`
- 블록은 위아래 reorder 가능
- desktop은 drag
- mobile은 `Move Up / Move Down` 버튼 fallback 허용

즉, 시각적으로는 Scratch처럼 `블록을 조합`하지만, 구현 복잡도는 통제된 형태로 유지한다.

## 지원할 블록 카테고리

### 1. Rule Shell

- rule name
- enabled
- cadence

### 2. Target Blocks

- all agents
- bottom X% by wealth
- top X% by wealth
- wealth below threshold
- wealth above threshold
- talent above threshold
- high talent + low wealth
- previously bankrupt agents

### 3. Condition Blocks

- wealth < X
- wealth > X
- talent < X
- talent > X
- rescuedCount < N
- bankruptCount >= N

### 4. Effect Blocks

- grant fixed amount
- apply wealth tax above threshold
- set minimum wealth floor
- bailout with amount / limit
- talent grant

### 5. Modifier Blocks

- max recipients
- budget cap
- weight multiplier
- priority score weight

## 반드시 하지 말 것

- JS 실행 기능 추가
- 문자열 DSL 추가
- `if wealth < 10 then ...` 같은 raw text rule 입력 허용
- block UI와 execution engine을 직접 강결합
- 모바일에서 drag만 강제

## 권장 아키텍처

### 1. Source of Truth

composer의 원본은 항상 `JSON AST`다.

UI는 AST를 수정할 뿐이고,
엔진은 AST를 직접 읽지 않고 `compiled rule`만 읽는다.

### 2. Registry Structure

각 블록은 registry에서 정의한다.

registry가 가져야 하는 것:

- block type id
- label
- category
- allowed child / sibling rule
- parameter schema
- default payload
- UI renderer metadata
- compiler handler
- validator handler

### 3. Compiler Layer

흐름은 아래와 같아야 한다.

1. Composer AST
2. Validate AST
3. Compile AST -> internal compiled rules
4. Apply compiled rules on reset

이 순서를 섞지 않는다.

### 4. Execution Adapter

기존 `Policy[]`와 완전히 분리해서 새 엔진을 만드는 게 아니라,
가능한 부분은 기존 `Policy[]`로 compile한다.

권장 전략:

- 단순 블록 조합은 기존 `Policy[]`로 lowering
- 기존 구조로 표현 불가능한 경우만 `CompiledComposerRule[]` 사용

즉, 완전 별도 엔진을 바로 만드는 것이 아니라,
기존 정책 코어를 최대한 재사용하는 방향이 맞다.

## 권장 타입 초안

```ts
type ComposerVersion = 1;
type ComposerCadence = "step" | "year";
type ComposerBlockCategory =
  | "target"
  | "condition"
  | "effect"
  | "modifier";

type ComposerDocument = {
  version: ComposerVersion;
  rules: ComposerRule[];
};

type ComposerRule = {
  id: string;
  name: string;
  enabled: boolean;
  cadence: ComposerCadence;
  blocks: ComposerBlock[];
};

type ComposerBlock =
  | TargetBlock
  | ConditionBlock
  | EffectBlock
  | ModifierBlock;

type TargetBlock = {
  id: string;
  category: "target";
  type:
    | "allAgents"
    | "bottomWealthPercent"
    | "topWealthPercent"
    | "wealthBelow"
    | "wealthAbove"
    | "talentAbove"
    | "highTalentLowWealth"
    | "bankruptAgents";
  payload: Record<string, number | string | boolean>;
};

type ConditionBlock = {
  id: string;
  category: "condition";
  type:
    | "wealthBelow"
    | "wealthAbove"
    | "talentBelow"
    | "talentAbove"
    | "rescuedCountBelow"
    | "bankruptCountAtLeast";
  payload: Record<string, number | string | boolean>;
};

type EffectBlock = {
  id: string;
  category: "effect";
  type:
    | "grantAmount"
    | "wealthTax"
    | "setWealthFloor"
    | "bailout"
    | "talentGrant";
  payload: Record<string, number | string | boolean>;
};

type ModifierBlock = {
  id: string;
  category: "modifier";
  type: "budgetCap" | "maxRecipients" | "weightMultiplier";
  payload: Record<string, number | string | boolean>;
};
```

이건 초안이며, 핵심은 `string rule text`가 아니라 `typed AST`라는 점이다.

## 세부 타입 초안

아래는 실제 구현 파일을 만들 때 바로 옮겨갈 수 있는 수준의 1차 타입안이다.

### 1. `src/types/composer.ts`

```ts
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

export type AllAgentsTargetPayload = {};

export type BottomWealthPercentTargetPayload = {
  percent: number;
};

export type TopWealthPercentTargetPayload = {
  percent: number;
};

export type WealthBelowTargetPayload = {
  threshold: number;
};

export type WealthAboveTargetPayload = {
  threshold: number;
};

export type TalentAboveTargetPayload = {
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
  wealthBelow: WealthBelowTargetPayload;
  wealthAbove: WealthAboveTargetPayload;
  talentAbove: TalentAboveTargetPayload;
  highTalentLowWealth: HighTalentLowWealthTargetPayload;
  bankruptAgents: BankruptAgentsTargetPayload;
};

export type WealthBelowConditionPayload = {
  threshold: number;
};

export type WealthAboveConditionPayload = {
  threshold: number;
};

export type TalentBelowConditionPayload = {
  threshold: number;
};

export type TalentAboveConditionPayload = {
  threshold: number;
};

export type RescuedCountBelowConditionPayload = {
  maxRescuedCount: number;
};

export type BankruptCountAtLeastConditionPayload = {
  minBankruptCount: number;
};

export type ConditionPayloadMap = {
  wealthBelow: WealthBelowConditionPayload;
  wealthAbove: WealthAboveConditionPayload;
  talentBelow: TalentBelowConditionPayload;
  talentAbove: TalentAboveConditionPayload;
  rescuedCountBelow: RescuedCountBelowConditionPayload;
  bankruptCountAtLeast: BankruptCountAtLeastConditionPayload;
};

export type GrantAmountEffectPayload = {
  amount: number;
};

export type WealthTaxEffectPayload = {
  threshold: number;
  rate: number;
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
```

핵심은 `payload`를 전부 `Record<string, unknown>`로 뭉개지 않고,  
block type별로 좁혀 두는 것이다. 그래야 validator와 compiler가 얇아진다.

### 2. `src/lib/composer/registry.ts`

```ts
export type ComposerParameterValueType =
  | "number"
  | "boolean"
  | "select";

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

export type ComposerRegistry = {
  targets: ComposerBlockDefinition<ComposerTargetBlock>[];
  conditions: ComposerBlockDefinition<ComposerConditionBlock>[];
  effects: ComposerBlockDefinition<ComposerEffectBlock>[];
  modifiers: ComposerBlockDefinition<ComposerModifierBlock>[];
};
```

registry는 UI 전용이 아니라,

- palette 노출
- 기본 payload 생성
- inline editor 생성
- validator 범위 체크
- compiler dispatch

까지 같이 쓰는 공통 메타데이터여야 한다.

### 3. `src/lib/composer/defaults.ts`

```ts
export type CreateComposerDocumentOptions = {
  version?: ComposerVersion;
};

export type CreateComposerRuleOptions = {
  id: string;
  name?: string;
  cadence?: ComposerCadence;
};

export function createEmptyComposerDocument(
  options?: CreateComposerDocumentOptions,
): ComposerDocument;

export function createEmptyComposerRule(
  options: CreateComposerRuleOptions,
): ComposerRule;

export function createComposerBlock<T extends ComposerBlockType>(
  type: T,
  id: string,
): Extract<ComposerBlock, { type: T }>;
```

### 4. `src/lib/composer/validate.ts`

```ts
export type ComposerValidationIssueCode =
  | "missing_rule_name"
  | "duplicate_rule_id"
  | "duplicate_block_id"
  | "missing_target"
  | "missing_effect"
  | "invalid_payload"
  | "below_min"
  | "above_max"
  | "invalid_order"
  | "unsupported_cadence"
  | "unsupported_combination"
  | "empty_document";

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

export function validateComposerDocument(
  document: ComposerDocument,
): ValidateComposerResult;
```

validator는 최소한 아래를 잡아야 한다.

- rule id 중복
- block id 중복
- rule당 target 최소 1개
- rule당 effect 최소 1개
- modifier만 있는 rule 금지
- parameter range 위반
- cadence와 block 조합 불일치
- effect 순서 / block 순서 제약 위반

### 5. `src/lib/composer/compile.ts`

```ts
import type { Policy } from "@/types/policies";

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
  policyLowerings: Policy[];
  compiledRules: CompiledComposerRule[];
  warnings: string[];
};

export function compileComposerDocument(
  document: ComposerDocument,
): CompileComposerResult;
```

여기서 중요한 건 두 갈래 출력이다.

- `policyLowerings`
  - 기존 `Policy[]`로 표현 가능한 것
- `compiledRules`
  - 기존 정책 타입으로는 못 담는 블록 조합

즉, compiler는 “무조건 새 엔진”이 아니라  
“가능하면 기존 엔진으로 낮춘다”가 기본 전략이다.

### 6. `src/lib/composer/import.ts`

```ts
import type { Policy } from "@/types/policies";

export type ImportPoliciesToComposerResult = {
  document: ComposerDocument;
  warnings: string[];
};

export function importPoliciesToComposer(
  policies: Policy[],
): ImportPoliciesToComposerResult;

export function importPresetToComposer(
  presetId: string,
): ImportPoliciesToComposerResult;
```

이 단계에서 100% 역변환이 어려운 경우가 생길 수 있다.  
그래서 import 결과에는 항상 `warnings`를 열어두는 것이 좋다.

### 7. `src/lib/composer/export.ts`

```ts
export type ExportComposerResult = {
  json: string;
  filename: string;
};

export function exportComposerDocument(
  document: ComposerDocument,
): ExportComposerResult;
```

### 8. store 연동 초안

`Phase 8` store와 이어지는 최소 타입은 아래 정도가 맞다.

```ts
export type ComposerStoreSlice = {
  composerDraft: ComposerDocument | null;
  composerApplied: ComposerDocument | null;
  composerSelection: ComposerSelection;
  composerMode: ComposerMode | null;
  composerValidationIssues: ComposerValidationIssue[];
  composerCompileWarnings: string[];
  setComposerDraft: (document: ComposerDocument | null) => void;
  setComposerSelection: (selection: ComposerSelection) => void;
  importPresetToComposerDraft: (presetId: string) => void;
  clearComposerDraft: () => void;
  applyComposerDraftAndReset: () => boolean;
};
```

초기 전략은 아래가 안전하다.

- `policiesDraft`와 `composerDraft`를 동시에 source of truth로 두지 않는다
- 둘 중 하나만 draft source가 되게 한다
- composer가 활성화되면 `selectedPresetId`는 `null`
- apply 시에는
  1. composer validate
  2. composer compile
  3. lowered `Policy[]`와 compiled rules 저장
  4. reset

### 9. UI 상태 타입 초안

```ts
export type ComposerPanelTab =
  | "palette"
  | "inspector"
  | "astPreview"
  | "compiledPreview";

export type ComposerDragState = {
  draggingBlockId: string | null;
  overBlockId: string | null;
};

export type ComposerUiState = {
  activeTab: ComposerPanelTab;
  dragState: ComposerDragState;
  mobilePaletteOpen: boolean;
  previewCollapsed: boolean;
};
```

### 10. 파일별 책임 분리

- `types/composer.ts`
  - AST와 UI/store 공용 타입
- `lib/composer/registry.ts`
  - block definition 메타데이터
- `lib/composer/defaults.ts`
  - 새 문서 / 새 rule / 새 block 생성
- `lib/composer/validate.ts`
  - AST 검증
- `lib/composer/compile.ts`
  - AST -> execution 모델 변환
- `lib/composer/import.ts`
  - preset / phase 8 rule draft -> composer
- `lib/composer/export.ts`
  - JSON export

이 분리가 중요한 이유는,

- UI가 registry를 읽고
- validator가 같은 registry를 읽고
- compiler는 AST만 읽고
- store는 결과만 조합

하도록 경계를 유지하기 위해서다.

## 구현 순서 권장

1. `types/composer.ts`
2. `registry.ts`
3. `defaults.ts`
4. `validate.ts`
5. `import.ts`
6. `compile.ts`
7. 최소 UI
8. drag and mobile fallback

이 순서를 거꾸로 가면 UI가 타입을 끌고 가게 된다.  
이 phase는 반드시 `타입 -> validator -> compiler -> UI` 순서로 가는 게 맞다.

## UI 원칙

- 첫 줄에서 현재 mode를 명확히 보여준다
  - preset draft
  - custom draft
  - imported from preset
- 블록 추가는 dropdown + add button
- 블록 reorder는 drag handle + 모바일 fallback 버튼
- 각 블록은 inline validation을 가진다
- invalid block은 빨간 badge
- rule 전체 invalid면 `Apply + Reset` 비활성화
- compiled preview와 AST preview는 접을 수 있게 둔다

## import / export 규칙

- preset은 composer draft로 import 가능해야 한다
- phase 8의 단순 rule draft도 가능하면 composer로 import 가능해야 한다
- export는 최소한 JSON download 또는 clipboard copy 형태로 제공할 수 있다
- 가져온 draft가 현재 버전과 다르면 migrate 후 validation 수행

## 모바일 규칙

- drag만 의존하지 않는다
- `Add`, `Delete`, `Move Up`, `Move Down`은 항상 존재
- block card는 세로 스택 기준으로 읽혀야 한다
- preview 영역은 접힘 가능해야 한다

## 파일 구조 권장

```text
src/
  types/
    composer.ts
  lib/
    composer/
      registry.ts
      defaults.ts
      validate.ts
      compile.ts
      import.ts
      export.ts
  components/
    composer/
      visual-policy-composer.tsx
      composer-rule-card.tsx
      composer-block-card.tsx
      composer-palette.tsx
      composer-preview.tsx
```

## 완료 기준

- 사용자가 preset 없이도 허용된 블록을 조합해 custom draft를 만들 수 있음
- invalid composer draft는 applied로 넘어가지 않음
- 같은 seed 기준 비교 흐름이 그대로 유지됨
- desktop과 mobile 모두에서 조작 가능
- 새 block type 추가가 `registry + validator + compiler` 중심으로 끝남

## 성공 기준

- 사용자가 “정책을 선택한다”가 아니라 “정책을 설계한다”는 감각을 얻는다
- 하지만 시스템 안정성은 여전히 통제된다
- 자유도는 높아지지만 재현성과 설명 가능성은 유지된다
