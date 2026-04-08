# Phase 1 - Project Setup

## 목표

빈 폴더를, Docker로 바로 실행 가능한 Next.js 개발 환경으로 만든다.

## 포함 범위

- Next.js App Router
- TypeScript
- Tailwind CSS
- Zustand
- Recharts
- shadcn/ui
- Vitest
- pnpm
- Dockerfile
- docker-compose.yml
- README

## 구현 조건

- package manager는 `pnpm` 고정
- `node:20-alpine`
- `WORKDIR /app`
- `package.json`과 `pnpm-lock.yaml` 먼저 복사 후 install
- `3000:3000`
- volume mount:
  - `.:/app`
  - `/app/node_modules`
- hot reload 동작

## 권장 추가 사항

- `.dockerignore`
- 기본 lint / typecheck / test 스크립트

## 절대 하지 말 것

- 시뮬레이션 로직 구현
- 상태 모델 구현
- Canvas 구현

## 완료 기준

- `docker compose up --build` 실행 가능
- `localhost:3000` 접속 가능
- 코드 수정 시 reload 동작
- `pnpm test` 또는 `vitest` 최소 실행 확인

## 다음 phase로 넘길 입력

- 고정 폴더 구조
- 테스트 가능한 최소 환경
