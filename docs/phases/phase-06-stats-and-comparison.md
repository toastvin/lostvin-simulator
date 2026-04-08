# Phase 6 - Stats and Comparison

## 목표

이제부터는 "보여주는 것"이 아니라 "비교 가능한 지표"를 만든다.

## 반드시 구현

- metrics aggregation
- metrics history
- histogram data
- talent vs wealth scatter data
- Gini coefficient
- poverty rate
- bankruptcy rate
- policy cost
- throttled update

## 비교 규칙

- baseline과 policy run은 같은 seed 사용
- seed 고정 상태에서 preset만 바꿔 비교 가능
- 비교 대상은 절대값과 변화량 둘 다 제공

## 성능 규칙

- 매 프레임 계산 금지
- `500ms` 간격 집계 권장
- 차트용 데이터는 snapshot에서 파생

## 절대 하지 말 것

- 차트 라이브러리 상태와 엔진 상태를 직접 강결합
- 계산이 무거운 통계를 render path에 넣기

## 완료 기준

- 정책 효과를 최소 3개 이상의 핵심 KPI로 읽을 수 있음
- 같은 seed 기준 baseline vs policy 결과를 설명할 수 있음
