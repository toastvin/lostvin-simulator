# Phase 2 - Store and Types

## 목표

UI 없이 상태 구조를 먼저 고정한다.

## 반드시 구현

- `Agent`, `EventNode`, `SimulationConfig`, `Policy`, `MetricsSnapshot` 타입
- `ConfigFieldDefinition` 타입
- `NormalizeIssue`, `NormalizeConfigResult`, `ValidationIssue`, `ValidateConfigResult` 타입
- Zustand store
- `seed`
- `draftConfig`
- `appliedConfig`
- `policiesDraft`
- `policiesApplied`
- `resetSimulation(seed?)`
- `applyDraftAndReset()`
- `pause`, `resume`, `setSeed`

## 설계 핵심

- reset 시 같은 seed면 같은 초기 상태가 나와야 한다.
- running 중 제어판 변경은 `draft`에만 쌓인다.
- 실제 엔진은 `applied`만 읽는다.
- config 기본값은 하드코딩된 객체 리터럴이 아니라 field registry 기반 생성이 가능해야 한다.
- config에는 `schemaVersion` 개념을 둘 준비를 한다.

## 확장성 요구

- 새 변수 추가 시 store 타입 전체를 다시 설계하지 않도록 구조를 잡는다.
- `createDefaultConfig`, `normalizeConfig`, `validateConfig`를 둘 수 있는 타입 기반을 만든다.
- 제어판이 나중에 메타데이터 기반 자동 렌더링을 할 수 있도록 field definition 구조를 먼저 잡는다.

## 이번 phase에서 기대하는 함수 시그니처

```ts
function createDefaultConfig(
  definitions: ConfigFieldDefinition[],
  schemaVersion: number
): SimulationConfig

function normalizeConfig(
  input: unknown,
  definitions: ConfigFieldDefinition[],
  schemaVersion: number
): NormalizeConfigResult

function validateConfig(
  config: SimulationConfig,
  definitions: ConfigFieldDefinition[]
): ValidateConfigResult
```

## 책임 분리

- `createDefaultConfig`: field registry 기반 완전한 기본 config 생성
- `normalizeConfig`: missing, clamp, rounding, option fallback 같은 기계적 정규화
- `validateConfig`: 교차 필드 포함 최종 승인 판단

이 세 함수는 store 내부에 묻지 말고 재사용 가능한 순수 함수로 둔다.

## 절대 하지 말 것

- React UI 구현
- Canvas 구현
- 차트 구현

## 테스트 포인트

- 같은 seed로 두 번 reset하면 동일한 초기 population 생성
- 다른 seed면 다른 초기 population 생성
- `draftConfig` 변경만으로 `appliedConfig`가 바뀌지 않음
- 신규 필드를 default 생성 경로에 추가했을 때 타입 오류 없이 확장 가능
- normalize가 누락 필드와 범위 이탈 값을 안전하게 보정
- validate가 논리 충돌을 error와 warning으로 나눠 반환

## 완료 기준

- store만 읽어도 현재 상태 전이가 설명 가능
- 후속 phase에서 상태 모델을 다시 뜯어고칠 필요가 없음
- 앞으로 변수 수가 늘어나도 store와 control UI가 감당 가능한 구조임
- config 관련 함수 책임이 섞이지 않고 분리되어 있음
