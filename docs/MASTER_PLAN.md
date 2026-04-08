# Lostvin Simulator Master Plan

## 1. 목표

이 사이트는 복잡한 정책 편집기를 먼저 보여주는 곳이 아니다.

먼저 아주 단순한 기본모델을 보여주고,
사용자가 그 기본모델의 핵심 수치만 바꿔 보게 하는 곳이다.

핵심은 아래 3가지다.

1. 어떤 조건으로 세계가 돌아가는지 보인다.
2. 기본모델 시뮬레이션이 바로 보인다.
3. 사람들의 자산과 행복 분포가 실시간으로 보인다.

## 2. 기본모델

기본모델은 아래처럼 단순해야 한다.

- 모든 사람은 같은 자산으로 시작한다.
- 사람들은 공간 안을 돌아다닌다.
- 초록점을 만나면 재능 확률로 성공하고 자산이 늘어난다.
- 빨간점을 만나면 자산이 줄어든다.

사용자가 직접 바꿀 수 있어야 하는 값은 많지 않아야 한다.

필수 설정값:

1. 시작 자산
2. 초록점 비율
3. 초록점을 만났을 때 자산이 몇 배가 되는지
4. 빨간점을 만났을 때 자산이 얼마나 남는지
5. 사람 이동 속도

## 3. 화면 구조

페이지 구조도 단순해야 한다.

### 3.1 기본모델 설정

왼쪽 또는 상단에서 아래 내용을 바로 본다.

- 현재 기본모델 규칙
- 현재 적용된 수치
- 수치를 바꿀 수 있는 슬라이더 또는 입력창
- 적용 + 리셋 버튼

여기서 사용자는 "빨간점이 자산에 어떻게 작용하는지", "초록점이 몇 배 효과를 주는지"를 바로 이해해야 한다.

### 3.2 시뮬레이션 화면

가운데 또는 오른쪽에서는 기본모델 시뮬레이션이 바로 보여야 한다.

- 사람들 이동
- 초록점 / 빨간점
- 현재 상태

복잡한 정책 캔버스나 phase 설명은 메인 흐름에서 뺀다.

### 3.3 실시간 분포

하단에는 분포를 단순하게 보여준다.

필수:

1. 자산 분포 히스토그램
2. 행복 분포 히스토그램

보조 지표:

- 평균 자산
- 중앙 자산
- 평균 행복
- 지니계수

## 4. 제외할 것

현재 메인 화면에서 우선순위가 아닌 것:

- phase 번호 설명
- 고급 정책 편집기
- 연결형 캔버스
- 복잡한 비교 설명
- 구현 내부 구조 설명

이런 요소들은 기본모델을 이해한 뒤에만 필요하다.

## 5. Phase 요약 로드맵

아래 phase들은 구현 순서를 설명하기 위한 문서용 로드맵이다.

메인 화면 UX에는 직접 노출하지 않지만, 개발과 우선순위 정렬에는 필요하다.

### Phase 0 - Spec Freeze

시뮬레이터의 핵심 규칙, 지표, seed 재현성, 정책 적용 순서를 먼저 문서로 고정한다.

이 단계에서 뒤집히면 이후 store, engine, UI가 모두 흔들리므로 명세를 먼저 잠근다.

### Phase 1 - Project Setup

빈 폴더를 Docker로 바로 실행 가능한 Next.js 개발 환경으로 만든다.

이후 모든 phase가 같은 실행 환경과 테스트 기반 위에서 진행되도록 작업 기반을 깐다.

### Phase 2 - Store and Types

UI보다 먼저 상태 구조와 타입 시스템을 고정해서 `draft`와 `applied`의 책임을 분리한다.

새 설정값과 정책이 늘어나도 구조를 다시 뒤엎지 않도록 확장 가능한 store 기반을 만든다.

### Phase 3 - Simulation Core

브라우저 UI와 분리된 순수 함수 엔진을 만든다.

같은 seed와 같은 step 수에서 항상 같은 결과가 나오는 deterministic baseline을 확보하는 단계다.

### Phase 4 - Policy Core

정책을 문자열이 아니라 JSON 기반 구조로 정의하고, 엔진에 안전하게 적용할 수 있게 만든다.

preset, parameter metadata, validation 구조를 여기서 잡아야 이후 rule builder와 composer로 자연스럽게 확장된다.

### Phase 5 - Engine and Canvas

고정된 엔진을 브라우저 Canvas에 연결해 실제로 움직이는 시뮬레이션 화면을 만든다.

simulation loop와 render loop를 분리해서 성능 저하 없이 baseline을 눈으로 확인할 수 있어야 한다.

### Phase 6 - Stats and Comparison

시뮬레이션 결과를 단순 애니메이션이 아니라 비교 가능한 지표와 분포 데이터로 바꾼다.

같은 seed 기준으로 baseline과 policy run의 차이를 설명할 수 있는 KPI 체계를 만드는 단계다.

### Phase 7 - Controls and Presets

설정 패널, preset 선택, seed 제어, 주요 차트를 붙여서 실제 홈페이지 형태로 완성한다.

처음 들어온 사람도 baseline 실행, preset 적용, 비교까지 혼자 따라갈 수 있어야 한다.

### Phase 8 - Rule Builder and Polish

사용자가 정책 조합을 직접 추가, 수정, 삭제할 수 있는 제한형 rule builder를 만든다.

동시에 모바일 대응, 빈 상태, 도움말, 카피 정리까지 포함해 제품 품질을 마감한다.

### Phase 9 - Visual Policy Composer

이 phase부터는 MVP 이후의 고급 확장이다.

폼 기반 rule builder를 넘어, 허용된 블록을 시각적으로 조합하는 Scratch 스타일의 세로형 composer를 만든다.

### Phase 10 - Scratch-style Policy Canvas

Phase 9의 블록 조합기를 자유 배치 가능한 공간 캔버스로 확장한다.

정책 의미는 그대로 유지하면서, 사용자는 더 직관적인 drag-and-drop 편집 경험을 얻게 된다.

### Phase 11 - Connected and Nested Policy Canvas

연결선과 중첩 컨테이너를 추가해 Scratch에 더 가까운 구조적 정책 편집기로 확장한다.

이 단계는 단순 UI 강화가 아니라 편집기 의미 계층이 하나 더 생기는 초고급 확장 단계다.

## 6. 엔진 동일성 규칙

이 프로젝트는 앞으로 사용자 설정, preset, rule builder, visual composer, canvas editor까지 확장된다.

하지만 입력 방식이 늘어나도 엔진 의미는 바뀌면 안 된다.

반드시 지켜야 할 규칙:

1. 같은 seed, 같은 applied config, 같은 policy 의미, 같은 step 수라면 항상 같은 결과가 나와야 한다.
2. 성능 최적화는 엔진 의미를 바꾸면 안 된다. 계산 순서를 바꾸거나 spatial index를 넣더라도, 산출되는 충돌 집합과 결과 상태는 기존 기준 구현과 동등해야 한다.
3. 새로운 편집 UI는 각각 따로 실행 규칙을 가지면 안 된다. slider, preset, rule builder, composer, canvas는 모두 같은 엔진 입력 구조로 컴파일되어야 한다.
4. UI 차이는 표현 차이여야 하고, 의미 차이가 되면 안 된다. 의미 차이가 필요하면 그것은 최적화가 아니라 명세 변경으로 취급한다.

동일성 검증 원칙:

1. baseline deterministic test: 같은 seed와 같은 step 수에서 runtime state가 동일해야 한다.
2. reference equivalence test: 최적화된 알고리즘은 naive 기준 구현과 같은 collision set 또는 같은 최종 state를 내야 한다.
3. editor equivalence test: 서로 다른 편집 경로가 같은 semantic config/AST를 만들면, 같은 seed에서 동일한 결과를 내야 한다.
4. regression snapshot test: 대표 seed 집합에 대해 step 구간별 핵심 지표와 분포가 의도치 않게 바뀌지 않는지 확인한다.

이 규칙은 Phase 3의 deterministic baseline 요구를 이후 Phase 4~11 확장에도 그대로 유지하기 위한 장치다.

## 7. 성공 기준

페이지를 처음 본 사람이 바로 아래처럼 말할 수 있어야 한다.

1. "아, 이건 기본모델 수치를 바꾸면서 분포가 어떻게 달라지는지 보는 곳이구나."
2. "빨간점과 초록점 효과를 직접 바꿔볼 수 있구나."
3. "시뮬레이션 결과가 자산과 행복 분포로 바로 보이는구나."
