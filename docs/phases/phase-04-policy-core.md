# Phase 4 - Policy Core

## 목표

정책 시스템을 JSON 기반 순수 함수로 먼저 고정한다.

## 반드시 구현

- `Policy` 타입 구체화
- policy parameter definition 또는 metadata 구조
- `applyPolicies()` 순수 함수
- 정책 cadence 처리
- preset 정책 세트
- policy cost 집계

## v1 정책 목록

- basic income
- wealth tax
- progressive tax
- bankruptcy floor
- bailout
- talent grant

## 구현 원칙

- 문자열 DSL 금지
- eval 금지
- 파싱 기반 문법 금지
- JSON + dropdown 친화 구조 유지
- 새 정책 타입이 추가될 때 parameter UI와 validation이 같이 확장될 수 있는 구조 유지

## 확장성 요구

- 정책별 파라미터는 메타데이터로 기술 가능해야 한다.
- `basicIncome.amount`, `wealthTax.rate` 같은 필드를 하드코딩 폼 조각에만 묶지 않는다.
- 장기적으로 block builder 또는 visual composer로 확장할 수 있도록 내부 표현을 안정적으로 유지한다.

## 테스트 포인트

- 정책 off 상태에서 no-op
- 기본소득 적용 시 전체 wealth 증가 확인
- 세금 정책 적용 시 상위 wealth 감소 확인
- bailout이 파산 상태를 제한하는지 확인
- talent grant가 고재능 저자산 대상에게만 적용되는지 확인

## 완료 기준

- policy preset을 나중에 UI에서 그대로 불러다 쓸 수 있음
- 엔진이 policy 유무와 무관하게 안정적으로 step 가능
