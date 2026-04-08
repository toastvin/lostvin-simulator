# Phase 10 - Scratch-style Policy Canvas

## 위치

- 이 phase는 `Phase 9` 이후의 선택적 고급 확장 phase다.
- `Phase 9`가 끝나면 block 기반 정책 설계는 이미 usable 하다.
- `Phase 10`의 목적은 그 block 시스템을 `Scratch`처럼 공간적으로 조작 가능한 캔버스 편집기로 끌어올리는 것이다.

즉, 이 phase는 정책 의미를 바꾸는 phase가 아니라,  
`정책 조립 UX`를 한 단계 더 강하게 만드는 phase다.

## 목표

사용자가 정책 블록을 단순한 세로 리스트가 아니라,
`드래그 가능한 공간 캔버스` 위에서 조립하고 정리할 수 있게 만든다.

핵심은 아래 두 가지를 동시에 만족하는 것이다.

- 사용자는 Scratch처럼 "끌어다 놓고 조합하는 느낌"을 받는다.
- 엔진은 여전히 `typed AST -> validate -> compile -> apply` 구조를 유지한다.

## 왜 별도 phase가 필요한가

`Phase 9`는 이미 실용적이다.
하지만 Scratch 스타일로 가는 순간 복잡도가 갑자기 커진다.

추가로 생기는 문제:

- 자유 좌표 배치
- zoom / pan
- snap target
- drag ghost
- invalid drop 처리
- 레이아웃 저장
- 모바일 fallback
- semantic order와 visual position의 분리

이건 단순 UI polish가 아니라, 편집기 아키텍처가 하나 더 생기는 수준이다.
그래서 `Phase 9`에 섞지 않고 별도 phase로 관리해야 한다.

## 핵심 원칙

### 1. 의미 계층과 편집기 계층을 분리한다

정책 의미는 여전히 `ComposerDocument`가 가진다.

캔버스는 그 위에 얹히는 편집기 레이어다.

흐름:

1. `CanvasDocument`
2. normalize canvas structure
3. `ComposerDocument`
4. validate
5. compile
6. apply on reset

즉, 캔버스 좌표값이 정책 실행 의미를 직접 가지면 안 된다.

### 2. 자유 배치는 주되, 자유 그래프는 주지 않는다

Scratch처럼 보여도, v1에서는 `아무 데나 아무 연결`까지 열지 않는다.

허용:

- rule frame의 자유 위치 이동
- 블록의 drag reorder
- 블록의 lane 간 이동
- palette -> canvas 삽입

허용하지 않음:

- 임의의 edge drawing
- 순환 참조
- rule 간 임의 연결선
- 실행 순서를 좌표만으로 해석하는 방식

### 3. pointer 기반 drag 시스템을 쓴다

HTML5 native drag and drop만으로 가면
정밀 snap, auto-scroll, touch 대응, ghost preview가 금방 불안정해진다.

권장:

- Pointer Events 기반 custom drag layer
- drop zone hit testing
- snap preview overlay

### 4. mobile은 무리하게 desktop drag를 강제하지 않는다

desktop은 자유 drag
mobile은 아래 둘 중 하나로 간다.

- 축소 기능의 간단한 canvas drag + bottom sheet inspector
- 또는 `Phase 9`형 리스트 편집 fallback

모바일에서 desktop UX를 억지로 복제하면 품질이 급격히 떨어진다.

## 반드시 구현

- canvas workspace
- zoom / pan
- rule frame drag 이동
- palette에서 block drag insert
- lane 기반 snap
- rule frame 내부 block reorder
- lane 간 block 이동
- invalid drop reject
- selection / inspector panel
- canvas -> composer AST 변환
- composer AST -> compiled preview 유지
- autosave 가능한 draft 구조
- mobile fallback 전략
- 기존 same-seed comparison 흐름 유지

## v1 범위 제한

첫 Scratch-style 버전에서 아래는 하지 않는다.

- arbitrary graph editor
- custom expression builder
- if/else branching tree
- loop block
- user-defined block macro
- collaborative editing
- 멀티캔버스 프로젝트 저장

즉, v1은 `정책 블록 캔버스 편집기`이지,
일반 목적 시각 프로그래밍 언어는 아니다.

## 추천 UX 구조

### 1. 화면 구성

- 좌측: block palette
- 중앙: canvas workspace
- 우측: selected block / rule inspector
- 하단 또는 탭: AST preview / compiled preview / validation

### 2. 캔버스 단위

캔버스에는 여러 `rule frame`이 존재한다.

각 rule frame은 내부적으로 lane을 가진다.

- target lane
- condition lane
- effect lane
- modifier lane

사용자는 frame 위치를 자유롭게 옮길 수 있지만,
블록 의미는 lane과 lane 내부 순서로만 해석한다.

### 3. 드래그 동작

- palette block drag 시작
- 현재 pointer 위치에 insertion ghost 표시
- 유효 lane 위에서는 snap highlight
- 유효하지 않은 위치에서는 reject style
- drop 시 semantic order 갱신

### 4. 선택과 편집

- block 클릭 시 inspector 열기
- 숫자 파라미터, select, bracket editor는 inspector에서 수정
- block 직접 본문에는 최소 핵심 정보만 표시

### 5. 모바일 fallback

모바일에서는 우선순위를 이렇게 둔다.

1. rule frame 선택
2. lane 내부 아이템 reorder
3. inspector에서 값 편집
4. 필요 시 `Phase 9` vertical composer fallback 제공

## 추천 데이터 모델

핵심은 `semantic AST`와 `layout metadata`를 분리하는 것이다.

```ts
type CanvasViewport = {
  x: number
  y: number
  zoom: number
}

type CanvasRuleFrame = {
  id: string
  ruleId: string
  x: number
  y: number
  width: number
  collapsed: boolean
  laneOrder: {
    target: string[]
    condition: string[]
    effect: string[]
    modifier: string[]
  }
}

type CanvasBlockLayout = {
  blockId: string
  ruleId: string
  lane: "target" | "condition" | "effect" | "modifier"
}

type ComposerCanvasDocument = {
  version: 1
  viewport: CanvasViewport
  composer: ComposerDocument
  frames: CanvasRuleFrame[]
  blockLayouts: CanvasBlockLayout[]
}
```

여기서 핵심은:

- 실제 정책 의미는 `composer`
- 위치와 접힘 상태는 `frames`, `blockLayouts`

이 구조면 `Phase 9` 자산을 거의 그대로 재사용할 수 있다.

## 상태 모델 권장안

```ts
type ComposerCanvasState = {
  canvasDraft: ComposerCanvasDocument
  canvasApplied: ComposerCanvasDocument
  canvasSelection: {
    ruleId: string | null
    blockId: string | null
  }
  viewport: {
    x: number
    y: number
    zoom: number
  }
  dragState: {
    type: "palette-block" | "canvas-block" | "rule-frame" | null
    sourceId: string | null
    sourceRuleId: string | null
    overRuleId: string | null
    overLane: "target" | "condition" | "effect" | "modifier" | null
    overIndex: number | null
  }
}
```

주의:

- drag 중간 상태를 semantic AST에 바로 쓰지 않는다.
- hover 상태와 committed 상태를 분리한다.

## 변환 파이프라인

### 1. import

기존 `ComposerDocument`를 읽어서
기본 frame layout을 자동 생성한다.

### 2. edit

사용자는 canvas에서 rule frame과 blocks를 조작한다.

### 3. normalize

drop 이후 lane order와 layout metadata를 정리한다.

### 4. derive

`CanvasDocument -> ComposerDocument` 변환

### 5. validate / compile

`Phase 9`의 validator와 compiler를 최대한 재사용한다.

## 반드시 하지 말 것

- canvas state를 엔진 입력으로 직접 사용
- 좌표 순서로 정책 의미를 해석
- drop 성공 여부를 시각적으로만 처리하고 데이터 검증을 생략
- phase 9 validator/compiler를 버리고 별도 룰 엔진 재작성
- mobile 지원 없이 desktop 전용으로 확정

## 구현 순서 권장

### 10.1 Canvas Schema

- `ComposerCanvasDocument` 정의
- import / export / migration 정의
- 기본 frame layout 생성

### 10.2 Viewport and Drag Core

- pan / zoom
- pointer drag layer
- ghost preview
- hit testing

### 10.3 Rule Frame Editing

- rule frame 생성 / 이동 / 삭제
- lane 표시
- snap insertion

### 10.4 Inspector and Preview

- block inspector
- validation panel
- compiled preview
- AST preview

### 10.5 Mobile Fallback

- simplified reorder path
- bottom sheet inspector
- phase 9 fallback route

### 10.6 Polish

- keyboard shortcut
- duplicate rule / duplicate block
- fit to screen
- canvas reset layout

## 완료 기준

- 사용자가 rule frame을 캔버스에서 이동할 수 있다.
- block을 palette에서 끌어와 유효 lane에 넣을 수 있다.
- invalid drop은 시각적으로 거부되고 데이터도 오염되지 않는다.
- canvas 편집 후 semantic AST가 안정적으로 생성된다.
- validator / compiler / apply 흐름이 `Phase 9`와 충돌하지 않는다.
- 모바일에서 최소한의 usable fallback이 존재한다.
- same-seed comparison 흐름은 그대로 유지된다.

## 권장 파일 구조

```txt
src/
  types/
    composer-canvas.ts

  lib/
    composer-canvas/
      defaults.ts
      normalize.ts
      validate.ts
      import.ts
      export.ts
      derive-composer.ts
      hit-testing.ts
      snapping.ts

  store/
    simulationStore.ts

  components/
    composer-canvas/
      scratch-policy-canvas.tsx
      canvas-stage.tsx
      rule-frame.tsx
      block-chip.tsx
      palette-panel.tsx
      inspector-panel.tsx
      preview-panel.tsx
```

## 세부 타입 초안

아래는 `Phase 10` 구현에 바로 들어갈 수 있는 수준의 1차 타입안이다.

핵심 원칙은 두 가지다.

- semantic 의미는 `ComposerDocument`
- canvas는 `layout + drag + selection + viewport`를 담당

### 1. `src/types/composer-canvas.ts`

```ts
import type {
  ComposerBlockCategory,
  ComposerBlockType,
  ComposerDocument,
  ComposerSelection,
} from "@/types/composer"

export type ComposerCanvasVersion = 1

export type ComposerCanvasLane =
  | "target"
  | "condition"
  | "effect"
  | "modifier"

export type CanvasPoint = {
  x: number
  y: number
}

export type CanvasRect = {
  x: number
  y: number
  width: number
  height: number
}

export type CanvasViewport = {
  x: number
  y: number
  zoom: number
}

export type CanvasViewportConstraints = {
  minZoom: number
  maxZoom: number
  panPadding: number
}

export type CanvasRuleFrame = {
  id: string
  ruleId: string
  x: number
  y: number
  width: number
  collapsed: boolean
  zIndex: number
  laneOrder: Record<ComposerCanvasLane, string[]>
}

export type CanvasBlockLayout = {
  blockId: string
  ruleId: string
  lane: ComposerCanvasLane
}

export type ComposerCanvasDocument = {
  version: ComposerCanvasVersion
  viewport: CanvasViewport
  composer: ComposerDocument
  frames: CanvasRuleFrame[]
  blockLayouts: CanvasBlockLayout[]
}
```

설명:

- `laneOrder`가 실제 semantic order를 가진다.
- `x`, `y`, `width`, `collapsed`, `zIndex`는 편집기 표현만 담당한다.
- `blockLayouts`는 block이 어느 rule/lane에 속하는지 빠르게 찾기 위한 인덱스다.

### 2. 선택 / 패널 / drag 타입

```ts
export type ComposerCanvasPanelTab =
  | "palette"
  | "inspector"
  | "astPreview"
  | "compiledPreview"
  | "validation"

export type CanvasSelection =
  ComposerSelection & {
    frameId: string | null
    lane: ComposerCanvasLane | null
  }

export type CanvasDragType =
  | "palette-block"
  | "canvas-block"
  | "rule-frame"

export type CanvasDropTarget =
  | {
      kind: "frame"
      frameId: string
    }
  | {
      kind: "lane"
      frameId: string
      ruleId: string
      lane: ComposerCanvasLane
      index: number
    }
  | {
      kind: "trash"
    }

export type CanvasDragState = {
  type: CanvasDragType | null
  sourceBlockType: ComposerBlockType | null
  sourceBlockId: string | null
  sourceRuleId: string | null
  sourceFrameId: string | null
  originClient: CanvasPoint | null
  currentClient: CanvasPoint | null
  dropTarget: CanvasDropTarget | null
  active: boolean
}

export type ComposerCanvasUiState = {
  activeTab: ComposerCanvasPanelTab
  mobilePaletteOpen: boolean
  mobileInspectorOpen: boolean
  previewCollapsed: boolean
  dragging: CanvasDragState
}
```

### 3. hit-testing / snapping 결과 타입

```ts
export type CanvasHitTarget =
  | {
      kind: "frame"
      frameId: string
      ruleId: string
      rect: CanvasRect
    }
  | {
      kind: "lane"
      frameId: string
      ruleId: string
      lane: ComposerCanvasLane
      rect: CanvasRect
      insertionIndex: number
    }
  | {
      kind: "block"
      frameId: string
      ruleId: string
      blockId: string
      lane: ComposerCanvasLane
      rect: CanvasRect
      index: number
    }

export type CanvasSnapPreview =
  | {
      visible: false
    }
  | {
      visible: true
      frameId: string
      lane: ComposerCanvasLane
      index: number
      rect: CanvasRect
      allowed: boolean
    }

export type FindDropTargetResult = {
  dropTarget: CanvasDropTarget | null
  snapPreview: CanvasSnapPreview
}
```

### 4. normalize / derive / import / export 결과 타입

```ts
export type CanvasNormalizationIssue = {
  severity: "warning" | "error"
  code:
    | "missing_frame"
    | "missing_rule"
    | "missing_block_layout"
    | "duplicate_frame_id"
    | "duplicate_rule_binding"
    | "invalid_lane"
    | "orphan_block"
    | "frame_order_rebuilt"
  message: string
  frameId?: string
  ruleId?: string
  blockId?: string
}

export type NormalizeCanvasDocumentResult = {
  document: ComposerCanvasDocument
  issues: CanvasNormalizationIssue[]
}

export type ValidateCanvasDocumentResult = {
  valid: boolean
  errors: CanvasNormalizationIssue[]
  warnings: CanvasNormalizationIssue[]
}

export type DeriveComposerFromCanvasResult = {
  composer: ComposerDocument
  issues: CanvasNormalizationIssue[]
}

export type ImportComposerToCanvasResult = {
  document: ComposerCanvasDocument
  issues: CanvasNormalizationIssue[]
}

export type ExportCanvasDocumentResult = {
  json: string
  filename: string
}
```

### 5. 추천 함수 시그니처

#### `src/lib/composer-canvas/defaults.ts`

```ts
export function createDefaultCanvasViewport(): CanvasViewport

export function createCanvasFrameId(existingFrames?: CanvasRuleFrame[]): string

export function createDefaultRuleFrame(
  ruleId: string,
  position?: Partial<CanvasPoint>,
): CanvasRuleFrame

export function createEmptyCanvasDocument(
  composer?: ComposerDocument,
): ComposerCanvasDocument
```

#### `src/lib/composer-canvas/import.ts`

```ts
export function importComposerToCanvas(
  composer: ComposerDocument,
): ImportComposerToCanvasResult
```

#### `src/lib/composer-canvas/derive-composer.ts`

```ts
export function deriveComposerFromCanvas(
  document: ComposerCanvasDocument,
): DeriveComposerFromCanvasResult
```

#### `src/lib/composer-canvas/normalize.ts`

```ts
export function normalizeCanvasDocument(
  input: ComposerCanvasDocument,
): NormalizeCanvasDocumentResult
```

#### `src/lib/composer-canvas/validate.ts`

```ts
export function validateCanvasDocument(
  document: ComposerCanvasDocument,
): ValidateCanvasDocumentResult
```

#### `src/lib/composer-canvas/hit-testing.ts`

```ts
export function findCanvasHitTarget(
  document: ComposerCanvasDocument,
  clientPoint: CanvasPoint,
): CanvasHitTarget | null
```

#### `src/lib/composer-canvas/snapping.ts`

```ts
export function findCanvasDropTarget(
  document: ComposerCanvasDocument,
  dragState: CanvasDragState,
): FindDropTargetResult
```

### 6. store 연동 초안

`Phase 9` store를 완전히 갈아엎지 말고, 아래 필드를 추가하는 식으로 간다.

```ts
type SimulationStore = {
  canvasDraft: ComposerCanvasDocument
  canvasApplied: ComposerCanvasDocument
  canvasSelection: CanvasSelection
  canvasUiState: ComposerCanvasUiState
  canvasValidationIssues: CanvasNormalizationIssue[]

  setCanvasDraft: (document: ComposerCanvasDocument) => void
  importComposerToCanvasDraft: (composer?: ComposerDocument) => void
  setCanvasSelection: (selection: CanvasSelection) => void
  setCanvasViewport: (viewport: CanvasViewport) => void
  setCanvasDragState: (dragState: CanvasDragState) => void
  resetCanvasLayoutDraft: () => void
}
```

중요:

- `composerDraft`와 `canvasDraft`는 동시에 존재할 수 있다.
- 하지만 실제 apply 전에는 `canvasDraft -> composerDraft -> compile` 순서로 정리해야 한다.
- 최종 엔진 입력은 여전히 `composerCompiledApplied`다.

### 7. UI props 권장안

#### `scratch-policy-canvas.tsx`

```ts
type ScratchPolicyCanvasProps = {
  document: ComposerCanvasDocument
  selection: CanvasSelection
  uiState: ComposerCanvasUiState
  validationIssues: CanvasNormalizationIssue[]
  onDocumentChange: (next: ComposerCanvasDocument) => void
  onSelectionChange: (selection: CanvasSelection) => void
  onUiStateChange: (next: ComposerCanvasUiState) => void
}
```

#### `rule-frame.tsx`

```ts
type RuleFrameProps = {
  frame: CanvasRuleFrame
  ruleId: string
  selected: boolean
  onMoveFrame: (frameId: string, next: CanvasPoint) => void
  onToggleCollapse: (frameId: string) => void
}
```

#### `block-chip.tsx`

```ts
type BlockChipProps = {
  blockId: string
  ruleId: string
  lane: ComposerCanvasLane
  selected: boolean
  dragging: boolean
  onSelect: () => void
  onDelete: () => void
}
```

#### `inspector-panel.tsx`

```ts
type InspectorPanelProps = {
  document: ComposerCanvasDocument
  selection: CanvasSelection
  onDocumentChange: (next: ComposerCanvasDocument) => void
}
```

### 8. 구현 시 주의할 타입 경계

#### 경계 1. semantic block와 visual block를 분리한다

`ComposerBlock` 자체에 `x`, `y`를 넣지 않는다.

왜냐하면:

- export/import 시 semantic JSON이 더러워진다.
- `Phase 9` compiler 재사용이 깨진다.
- canvas를 안 쓰는 fallback UI와 충돌한다.

#### 경계 2. drag state는 document에 저장하지 않는다

`dragging`, `hover`, `ghost preview`는 `ui state`다.

`canvasDraft`에는 저장하지 않는다.

#### 경계 3. lane order가 진짜 의미를 가진다

frame 좌표나 block 화면 순서가 아니라,
`laneOrder`와 `blockLayouts`가 semantic 정렬 기준이다.

#### 경계 4. derive는 항상 순수 함수여야 한다

`deriveComposerFromCanvas()`는 React나 store에 의존하지 않고,
`document -> composer`만 수행해야 한다.

## 권장 구현 순서 보강

1. `composer-canvas.ts` 타입 먼저 확정
2. `importComposerToCanvas()`와 `deriveComposerFromCanvas()`를 순수 함수로 먼저 구현
3. 그 다음 normalize / validate
4. 그 다음 viewport / drag core
5. 마지막에 UI와 store 연결

이 순서를 지키면 편집기 UI를 만들다가 semantic 계층을 다시 뜯는 일을 줄일 수 있다.

## 최종 판단

`Phase 10`은 단순한 UI 개선이 아니다.
이건 `정책 편집 경험`을 제품 차별점으로 끌어올리는 phase다.

하지만 성공하려면 반드시 아래를 지켜야 한다.

- `Phase 9`의 semantic core를 버리지 않는다.
- canvas는 editor layer이고, compiler는 semantic layer다.
- 자유도를 늘리되 arbitrary graph programming으로 넘어가지 않는다.

이 원칙만 지키면 Scratch 스타일의 강한 UX를 만들면서도,
현재 시스템의 안정성과 확장성을 유지할 수 있다.
