# Phase 11 - Connected and Nested Policy Canvas

## 위치

- 이 phase는 `Phase 10` 이후의 선택적 초고급 확장 phase다.
- `Phase 10`이 끝나면 rule frame 기반 policy canvas는 이미 usable 하다.
- `Phase 11`의 목적은 그 위에 `연결선`과 `중첩 블록 컨테이너`를 추가해서, 진짜 Scratch에 가까운 구조적 조합 경험을 만드는 것이다.

즉, 이 phase는 단순 UI polish가 아니라  
`slot-based canvas`를 `connection-aware structured canvas`로 올리는 단계다.

## 목표

사용자가 정책을 단순한 lane 배열이 아니라,
`블록 연결`과 `중첩 컨테이너`를 통해 더 복합적으로 조립할 수 있게 만든다.

핵심은 아래 두 가지를 동시에 만족하는 것이다.

- 사용자는 Scratch처럼 "붙이고 감싸는" 편집 경험을 얻는다.
- 엔진은 여전히 `typed AST -> validate -> compile -> apply` 구조를 유지한다.

## 왜 별도 phase가 필요한가

`Phase 10`은 rule frame과 lane만으로 의미를 안정적으로 유지한다.
하지만 연결선과 중첩이 들어오면 복잡도가 급격히 올라간다.

추가로 생기는 문제:

- block output / input slot 모델
- edge 생성 / 삭제 / 재연결
- nested container의 child ownership
- orphan block 처리
- 순환 참조 차단
- connection invalidation
- collapsed container 렌더링
- keyboard / accessibility 복잡도 증가
- visual tree와 semantic tree의 동기화 문제

이건 `Phase 10`의 드래그 UX를 조금 보강하는 수준이 아니다.
편집기 의미 계층이 하나 더 생기는 수준이다.
그래서 반드시 별도 phase로 관리해야 한다.

## 핵심 원칙

### 1. semantic core는 계속 별도 유지한다

연결선과 중첩 UI가 생겨도,
정책 실행은 여전히 `ComposerDocument`를 기준으로 한다.

흐름:

1. `ConnectedCanvasDocument`
2. normalize canvas graph
3. derive `ComposerDocument`
4. validate semantic structure
5. compile
6. apply on reset

즉, 선을 어떻게 그렸는지가 실행 의미가 되는 것이 아니라,
정규화된 구조가 실행 의미를 가진다.

### 2. 자유 연결은 주되, 일반 목적 그래프는 주지 않는다

`Scratch 느낌`은 주지만,
아무 노드나 아무 노드에 연결되는 범용 graph editor로 가면 안 된다.

허용:

- rule frame 내부 slot 연결
- container block 내부 child nesting
- target / condition / effect / modifier 블록 사이의 제한된 연결
- container block 안의 ordered child list

허용하지 않음:

- rule frame 간 arbitrary edge
- 순환 참조
- 여러 부모를 가진 block
- 실행 순서를 edge만으로 전부 해석하는 구조
- 사용자 정의 코드 노드

### 3. edge는 의미를 표현하지 장식을 표현하지 않는다

연결선은 예쁘게 보이기 위한 것이 아니라,
입력 slot이 어떤 block으로 채워졌는지를 표현해야 한다.

즉:

- edge가 없으면 slot은 비어 있음
- edge가 있으면 typed input이 채워짐
- nested container는 child ownership이 명확해야 함

### 4. nested block은 제한된 container만 허용한다

`if`, `group`, `weighted choice`, `bracket set` 같은
시스템 정의 container block만 children을 가질 수 있다.

아무 블록이나 child를 받도록 열면 validator와 compiler가 빠르게 불안정해진다.

### 5. keyboard와 fallback을 초반부터 고려한다

Scratch류 편집기는 pointer UX에 몰리기 쉽다.
하지만 이 프로젝트는 설정 도구이므로,
마우스 없이도 핵심 편집이 가능해야 한다.

최소 지원:

- tab focus
- selected node delete
- arrow 기반 이동
- connection unlink
- 모바일/좁은 화면에서는 `Phase 10` fallback 제공

## 반드시 구현

- typed input/output slot 모델
- block 간 connection 생성 / 삭제 / 재연결
- connection validation
- nested container block
- child drop zone
- collapsed / expanded container UI
- connection-aware selection
- graph -> composer derive
- cycle 방지
- orphan block 탐지
- invalid graph 시 apply 차단
- keyboard 기반 기본 조작
- `Phase 10` fallback 유지

## v1 범위 제한

첫 연결선/중첩 버전에서 아래는 하지 않는다.

- general-purpose flowchart editor
- loop / recursion
- arbitrary freeform comment node
- multi-canvas linking
- collaborative editing
- runtime debugger
- animation-heavy visual execution trace
- user-defined custom block schema

즉, v1은 `정책용 structured block canvas`이지,
범용 visual programming IDE는 아니다.

## 추천 UX 구조

### 1. 화면 구성

- 좌측: block palette + container block palette
- 중앙: connected canvas workspace
- 우측: selected node / edge / container inspector
- 하단 또는 탭: derived composer preview / validation / compiled preview

### 2. 기본 단위

캔버스에는 여전히 여러 `rule frame`이 있다.
하지만 frame 내부 블록은 이제 단순 lane 리스트가 아니라,
slot connection과 nested container를 가질 수 있다.

예:

- target block이 rule의 root target slot을 채운다
- condition group block이 여러 condition child를 가진다
- effect group block이 ordered effect child list를 가진다
- modifier block이 특정 effect block의 option input으로 연결된다

### 3. 연결 UX

- source slot에서 drag 시작
- pointer 근처에 edge preview 표시
- 유효 input slot만 highlight
- invalid target은 reject style 표시
- drop 시 connection 생성
- 기존 connection 위에 drop하면 replace 또는 merge 규칙 적용

### 4. 중첩 UX

- container block은 내부 child drop area를 가진다
- child drag 시 insertion bar 표시
- collapse 상태에서는 summary만 보인다
- expand 시 내부 children을 편집할 수 있다

### 5. 선택과 inspector

- block 선택
- edge 선택
- container 선택

각 선택 타입마다 inspector가 다르다.

- block: 파라미터 수정
- edge: unlink / reattach
- container: layout, child list, collapse 상태

### 6. fallback 전략

사용자나 화면 조건에 따라 아래 순서로 degrade 가능해야 한다.

1. `Phase 11` connected canvas
2. `Phase 10` scratch-style frame/lane canvas
3. `Phase 9` vertical composer

## 추천 데이터 모델

핵심은 `semantic AST`, `graph layout`, `connection state`를 분리하는 것이다.

```ts
type CanvasNodeKind =
  | "rule-frame"
  | "target-block"
  | "condition-block"
  | "effect-block"
  | "modifier-block"
  | "container-block"

type CanvasPortDirection = "input" | "output"

type CanvasPort = {
  id: string
  nodeId: string
  key: string
  direction: CanvasPortDirection
  accepts?: string[]
  provides?: string[]
  maxConnections: 0 | 1 | "many"
}

type CanvasEdge = {
  id: string
  fromPortId: string
  toPortId: string
}

type CanvasNodeLayout = {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
  collapsed?: boolean
}

type CanvasContainerChildOrder = {
  containerNodeId: string
  childNodeIds: string[]
}

type ConnectedCanvasDocument = {
  version: 1
  viewport: {
    x: number
    y: number
    zoom: number
  }
  nodes: ComposerCanvasNode[]
  ports: CanvasPort[]
  edges: CanvasEdge[]
  layouts: CanvasNodeLayout[]
  containers: CanvasContainerChildOrder[]
}
```

핵심 해석 규칙:

- edge는 port 간 typed connection만 표현한다
- nested relation은 `containers`가 가진다
- 좌표는 오직 편집 레이아웃용이다
- derive 단계에서만 `ComposerDocument`로 변환한다

## derive 전략

`Phase 11`에서 가장 위험한 부분은
canvas graph가 compiler 입력이 되는 순간이다.

권장 흐름:

1. graph normalize
2. disconnected / duplicate / orphan 검사
3. container child order normalize
4. root rule frame별 semantic tree 생성
5. semantic tree를 `ComposerDocument`로 변환
6. 기존 validator / compiler 재사용

즉, `Phase 9`, `Phase 10`에서 만든 semantic pipeline을 버리지 않는다.

## validator가 반드시 잡아야 할 것

- cycle 존재
- input slot 다중 연결
- output type mismatch
- required root slot 비어 있음
- child를 받을 수 없는 block에 nested child 존재
- container child 순서 중복
- rule frame 밖 orphan block 존재
- frame 간 잘못된 연결
- container 안과 edge 연결이 충돌하는 구조

## 추천 구현 순서

### Phase 11.1 - Data Model and Derive Pipeline

- `ConnectedCanvasDocument` 타입 추가
- port / edge / container 모델 추가
- normalize / validate / derive 함수 구현
- `Phase 10` canvas를 `Phase 11` document로 import 가능한 변환기 구현

### Phase 11.2 - Connection UX

- port 렌더링
- edge preview
- connect / reconnect / unlink
- valid target highlight
- edge selection inspector

### Phase 11.3 - Nested Container UX

- container block palette
- child drop zone
- collapse / expand
- nested reorder
- nested summary UI

### Phase 11.4 - Keyboard and Fallback Polish

- keyboard move / delete / unlink
- focus ring과 tab order
- 모바일 fallback
- invalid state messaging
- export / import 안정화

## 권장 파일 구조

```txt
src/
  types/
    composer-canvas.ts
    connected-canvas.ts

  lib/
    connected-canvas/
      defaults.ts
      normalize.ts
      validate.ts
      derive-composer.ts
      import-from-phase10.ts
      export.ts
      hit-testing.ts
      routing.ts

  components/
    control/
      connected-policy-canvas.tsx
      canvas-edge-layer.tsx
      canvas-node.tsx
      canvas-port.tsx
      container-block.tsx
      edge-inspector.tsx
```

## 완료 기준

- 사용자가 block 사이를 연결할 수 있다.
- 사용자가 container block 내부에 child를 중첩할 수 있다.
- invalid graph는 즉시 표시되고 apply되지 않는다.
- derive된 `ComposerDocument`가 기존 validator / compiler를 통과한다.
- `Phase 10` 문서에서 자연스럽게 migration/import 된다.
- desktop 사용성은 좋아지고, mobile에서는 안전하게 fallback 된다.

## 최종 판단

`Phase 11`은 지금부터 들어가도 된다.
단, 구현은 반드시 `데이터 모델 -> 연결선 -> 중첩 -> polish` 순서로 잘라야 한다.

핵심은 이것이다.

- `Phase 10`의 semantic core를 버리지 않는다.
- 연결선과 중첩은 UI 기능이 아니라 구조 기능으로 취급한다.
- 일반 목적 그래프 에디터로 새지 않는다.

이 선을 지키면,
Scratch 같은 자유도를 올리면서도 정책 시뮬레이터로서의 안정성을 유지할 수 있다.
