# Phase 3 - Simulation Core

## 목표

UI 없는 순수 함수 엔진을 만든다.

## 반드시 구현

- seeded random
- Box-Muller
- `clamp`
- `lerp`
- movement
- collision detection
- initialize population
- wealth update
- happiness update
- fixed-step `stepSimulation()`

## 구현 원칙

- 순수 함수만 작성
- React 코드 금지
- Canvas 코드 금지
- 입력과 출력이 명확해야 함

## 권장 파일

- `src/lib/random.ts`
- `src/lib/math.ts`
- `src/lib/simulation/initialize.ts`
- `src/lib/simulation/movement.ts`
- `src/lib/simulation/collision.ts`
- `src/lib/simulation/happiness.ts`
- `src/lib/simulation/step.ts`

## 테스트 포인트

- RNG 재현성
- talent 초기화 분포 범위
- movement 경계 반사
- collision 판정 정확성
- 같은 seed + 같은 step 수 = 같은 결과

## 절대 하지 말 것

- Store 구독
- requestAnimationFrame
- DOM 접근

## 완료 기준

- 순수 함수 테스트만으로 엔진의 핵심 규칙을 검증 가능
- 정책 적용 전 baseline 엔진이 deterministic 하게 동작
