# Phase 0 - Spec Freeze

## 목표

코드를 쓰기 전에, 이후 phase에서 다시 뒤집히면 안 되는 규칙을 문서로 고정한다.

## 이번 phase에서 확정할 것

- 제품의 한 줄 정의
- 시뮬레이션 목적
- agent / event / policy / metrics 타입 개념
- wealth, happiness, bankruptcy 공식
- 정책 적용 순서
- baseline 비교 규칙
- seed 재현성 규칙

## 산출물

- `docs/MASTER_PLAN.md`의 명세 섹션 확정

## 절대 하지 말 것

- Next.js 코드 작성
- Store 작성
- Canvas 작성
- UI 시안 작성

## 완료 기준

- 같은 seed로 baseline을 다시 실행하면 같은 결과가 나와야 한다는 규칙이 문서에 명확히 적혀 있다.
- 정책이 어떤 JSON 구조인지 정의돼 있다.
- 어떤 지표로 "좋은 정책"을 판단할지 정리돼 있다.
- wealth, happiness, bankruptcy가 어떻게 계산되는지 문서만 보고 설명할 수 있다.

## 다음 phase로 넘길 입력

- 고정된 기본값
- 타입 개념
- 정책 리스트
- 통계 리스트
