# Phase 5 - Engine and Canvas

## 목표

고정된 엔진을 화면에 안전하게 연결한다.

## 반드시 구현

- Canvas 렌더러
- `requestAnimationFrame`
- fixed-step simulation loop
- store subscribe
- 최소 re-render
- pause / resume 반영

## 구현 원칙

- React state로 매 프레임 렌더링 금지
- Canvas 내부에서 직접 그리기
- simulation step과 render frame 분리
- 객체 재생성 최소화

## 디버깅 포인트

- wealth 색상 또는 행복 색상 변화가 보이는가
- 시간이 갈수록 분포가 퍼지는가
- pause / resume 시 누적 오차가 심하지 않은가

## 절대 하지 말 것

- 차트부터 만들기
- 제어판 값 변경을 즉시 적용하기

## 완료 기준

- baseline이 브라우저에서 매끄럽게 실행
- 렌더링 성능이 눈에 띄게 무너지지 않음
- store와 Canvas의 책임이 분리되어 있음
