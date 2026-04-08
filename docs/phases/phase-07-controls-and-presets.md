# Phase 7 - Controls and Presets

## 목표

시뮬레이터를 실제 사용 가능한 홈페이지 형태로 만든다.

## 반드시 구현

- Hero 또는 intro 카피
- 현재 seed 표시와 seed 변경 UI
- config control panel
- draft / applied 분리 UI
- `Apply + Reset` 버튼
- preset 정책 선택 UI
- baseline 복귀 버튼
- 주요 지표 카드
- 차트 섹션

## 구현 원칙

- control panel은 가능하면 field definition registry를 읽어 렌더링한다.
- 새 변수 추가 시 제어판 JSX를 여러 군데 수정하지 않도록 만든다.
- 그룹, 설명, min/max/step, valueType을 메타데이터에서 읽는다.

## UX 규칙

- 제어값 변경 즉시 실행 상태에 반영 금지
- `Apply + Reset` 또는 `Reset` 시에만 반영
- preset 변경 시도 역시 같은 규칙 적용

## 홈페이지 관점에서 꼭 필요한 것

- "이 사이트가 무엇인지" 한 문단 설명
- 기본 모드에서 왜 불평등이 커지는지 짧은 설명
- 같은 seed로 비교해야 공정하다는 안내
- 첫 실행을 유도하는 기본 preset 버튼

## 절대 하지 말 것

- 설정을 바꾸는 즉시 엔진에 주입하기
- 설명 없는 컨트롤 패널 만들기

## 완료 기준

- 처음 들어온 사람도 baseline 실행 -> preset 적용 -> 비교까지 혼자 할 수 있음
- control UX가 엔진 상태를 망가뜨리지 않음
- 새 변수 하나를 추가했을 때 제어판에 쉽게 노출 가능
