# Phase 8 - Rule Builder and Polish

## 목표

정책 조합을 직접 만들 수 있게 하고, 최종적으로 홈페이지 품질을 마감한다.

## 반드시 구현

- dropdown 기반 rule builder
- 정책 추가 / 수정 / 삭제
- 숫자 입력 validation
- policy JSON 미리보기 또는 내부 디버그 표시
- 모바일 대응
- 빈 상태 / 도움말 / 에러 상태
- 최종 카피 다듬기

## rule builder 원칙

- 문자열 파싱 금지
- 타입에 맞는 form 조합 사용
- 정책 타입별 파라미터 노출
- invalid rule은 applied로 넘기지 않음
- parameter 입력 UI는 policy metadata에서 최대한 자동 생성

## 확장성 목표

- 앞으로 정책 타입과 조정 가능한 변수가 늘어나도 rule builder가 버티는 구조여야 한다.
- 새 정책 타입 추가 시:
  1. 정책 타입 정의 추가
  2. parameter metadata 추가
  3. validator 추가
  4. preset 선택 반영

이 정도 수정으로 끝나는 구조를 목표로 한다.

## 마감 체크

- 1,000 agent 기본값에서 사용감이 무너지지 않는가
- baseline, preset, custom rule 모두 reset 기준으로 일관되게 동작하는가
- 첫 방문자가 설명 없이도 핵심 플로우를 따라갈 수 있는가
- 모바일에서도 control 패널과 차트가 읽히는가

## 최종 완료 기준

- 제품 의도와 구현이 일치
- 정책 실험 결과를 설명 가능
- 홈페이지로서의 첫인상과 사용성도 확보
