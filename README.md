# 오 나의 교수님! 비밀 에피소드

교수님을 직접 커스터마이징하고, 시험 전날의 선택지를 따라가며 엔딩을 확인하는 웹 기반 비주얼 노벨 MVP입니다.

사용자는 교수님의 외형과 말투를 설정하고, Gemini 이미지 생성으로 캐릭터 스프라이트를 만든 뒤, 시험 전날 캠퍼스에서 벌어지는 분기형 에피소드를 플레이합니다. 플레이 결과는 점수와 선택 로그를 기준으로 엔딩에 반영되고, Supabase에 기록됩니다.

![오 나의 교수님! 비밀 에피소드](./src/app/opengraph-image.png)

## 프로젝트 개요

- **목표**: 짧은 시간 안에 플레이 가능한 AI 캐릭터 커스터마이징 기반 시뮬레이션 MVP 제작
- **형태**: Next.js App Router 기반 반응형 웹 앱
- **핵심 경험**: 교수님 생성 → 분기형 스토리 플레이 → 점수 기반 엔딩 → 크레딧 메시지 공유
- **배포 환경**: Vercel + Supabase
- **현재 상태**: MVP 구현 및 운영 모니터링 기능 포함

## 주요 기능

### 교수님 커스터마이징

- 성별, 연령대, 말투, 일러스트 스타일, 세부 특징을 조합해 교수님 캐릭터를 구성합니다.
- 자유 입력 프롬프트는 서버에서 안전성 검사를 거친 뒤 이미지 생성 프롬프트에 반영합니다.
- 교수 설정은 스토리 대사 톤과 이미지 생성에 함께 사용됩니다.

### Gemini 기반 교수 이미지 생성

- Gemini 이미지 모델로 교수님 전신 스프라이트를 생성합니다.
- 생성된 이미지는 `sharp`로 트리밍하고, 스토리 컷인과 대화 초상화에 맞게 가공합니다.
- 외부 배경 제거 API가 연결되어 있으면 누끼 처리된 이미지를 사용합니다.
- 생성 원본과 메타데이터는 Supabase Storage와 DB에 저장합니다.

### 분기형 시뮬레이션 플레이

- 시험 전날 캠퍼스 상황을 중심으로 여러 챕터와 선택지를 제공합니다.
- 선택지마다 호감도/지성 등 점수 변화가 있고, 누적 결과로 엔딩 등급이 결정됩니다.
- 교수 성별/연령대별 스크립트 프로필을 분리해 말투 변화를 관리합니다.

### 플레이 기록과 크레딧 메시지

- 플레이 세션, 교수 설정, 점수, 엔딩, 스토리 로그를 Supabase에 저장합니다.
- 엔딩 이후 플레이어가 짧은 크레딧 메시지를 남길 수 있습니다.
- 중복 메시지와 과도한 요청을 막기 위해 간단한 서버 측 검증과 rate limit을 적용했습니다.

### 운영 모니터링

- 이미지 생성 성공/경고/오류, 평균 지연 시간, 배경 제거 서버 상태를 기록합니다.
- 관리자 대시보드에서 최근 생성 상태와 플랫폼 사용량을 확인할 수 있습니다.
- Vercel Cron과 GitHub Actions로 주기적인 상태 점검을 실행할 수 있습니다.
- Discord 웹훅을 연결하면 임계치 초과 시 자동 경고를 보냅니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Framework | Next.js 16, React 19, App Router |
| Language | TypeScript |
| Styling | Tailwind CSS 4, CSS Module |
| AI Image | Gemini API, `@google/genai` |
| Image Processing | `sharp`, 외부 background removal API |
| Database / Storage | Supabase PostgreSQL, Supabase Storage |
| Deployment | Vercel |
| Monitoring | Vercel Cron, GitHub Actions, Discord Webhook |

## 구현 포인트

- **프롬프트 안정화**: 교수 커스터마이징 입력을 정규화하고, 안전하지 않은 표현을 사전에 차단합니다.
- **이미지 후처리 파이프라인**: 생성 이미지 → 배경 제거 → 트리밍 → 스토리용 crop → Storage 업로드 순서로 처리합니다.
- **서버 전용 Supabase 사용**: `service_role` 키는 API route 내부에서만 사용하고 클라이언트에 노출하지 않습니다.
- **운영 관측성**: AI 이미지 생성처럼 실패 가능성이 높은 기능에 이벤트 로깅, 대시보드, 자동 점검을 붙였습니다.
- **MVP 친화적 구조**: 시나리오와 교수 말투 데이터를 코드/마크다운 파일로 관리해 빠르게 수정할 수 있게 했습니다.

## 프로젝트 구조

```text
src/
  app/
    api/                         # 이미지 생성, 플레이 저장, 모니터링 API
    admin/monitoring/            # 관리자 모니터링 대시보드
    page.tsx                     # 메인 플레이 화면
  data/professor-script-profiles/ # 교수 성별/연령대별 말투 프로필
  lib/
    bg-remove/                   # 배경 제거 API 연동
    gemini/                      # Gemini 클라이언트/응답 파서
    monitoring/                  # 이벤트 로깅, 요약, 플랫폼 사용량 조회
    supabase/                    # 서버 전용 Supabase 클라이언트
supabase/
  schema.sql                     # 플레이/교수 생성/크레딧 메시지 테이블
  monitoring_schema.sql          # 모니터링 이벤트 테이블
.github/workflows/
  monitoring-check.yml           # 운영 점검 workflow
```

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 [supabase/schema.sql](./supabase/schema.sql)을 실행합니다.
3. 모니터링 기능을 사용할 경우 [supabase/monitoring_schema.sql](./supabase/monitoring_schema.sql)도 실행합니다.
4. Storage에 교수 이미지용 public bucket을 만듭니다. 기본 bucket 이름은 `professor-images`입니다.
5. 필요한 환경 변수를 `.env.local`에 설정합니다.

## 환경 변수

### 앱 실행 필수

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 API route에서 사용하는 Supabase service role key |
| `GEMINI_API_KEY` | 교수 이미지 생성을 위한 Gemini API key |

### 이미지와 에셋

| 이름 | 설명 | 기본값 |
| --- | --- | --- |
| `GEMINI_IMAGE_MODEL` | Gemini 이미지 생성 모델 | `gemini-2.5-flash-image` |
| `SUPABASE_PROFESSOR_IMAGE_BUCKET` | 생성 이미지 저장 bucket | `professor-images` |
| `BG_API_URL` | 외부 배경 제거 API 서버 URL | 미설정 시 배경 제거 생략 |
| `BG_API_TIMEOUT_MS` | 배경 제거 API timeout | `45000` |
| `NEXT_PUBLIC_SUPABASE_BGM_BASE_URL` | BGM public bucket URL | `/bgm` |
| `NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL` | voice public bucket URL | `/voice` |

### 관리자/모니터링

| 이름 | 설명 |
| --- | --- |
| `MONITORING_ADMIN_SECRET` | 관리자 모니터링 API와 대시보드 접근용 secret |
| `CRON_SECRET` | Vercel Cron/GitHub Actions 점검 요청 인증용 secret |
| `MONITORING_DISCORD_WEBHOOK_URL` | Discord 자동 경고 웹훅 URL |
| `MONITORING_LOOKBACK_HOURS` | 모니터링 요약 조회 기간 |
| `MONITORING_GENERATION_ERROR_COUNT_THRESHOLD` | 이미지 생성 오류 수 경고 임계치 |
| `MONITORING_GENERATION_ERROR_RATE_THRESHOLD` | 이미지 생성 실패율 경고 임계치 |
| `MONITORING_GENERATION_WARNING_COUNT_THRESHOLD` | 이미지 생성 경고 수 임계치 |
| `VERCEL_API_TOKEN` | Vercel 사용량 snapshot 조회용 token |
| `VERCEL_TEAM_ID` 또는 `VERCEL_TEAM_SLUG` | 팀 프로젝트의 Vercel 사용량 조회 범위 |
| `SUPABASE_MANAGEMENT_API_TOKEN` | Supabase API 요청량 조회용 management token |
| `SUPABASE_PROJECT_REF` | Supabase project ref. 없으면 URL에서 추출 시도 |
| `DEBUG_PANEL_PASSWORD` | 디버그 패널 접근 비밀번호 |

예시:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
SUPABASE_PROFESSOR_IMAGE_BUCKET=professor-images
BG_API_URL=https://your-bg-remove-api.example.com
BG_API_TIMEOUT_MS=45000
MONITORING_ADMIN_SECRET=your_monitoring_admin_secret
CRON_SECRET=your_cron_secret
```

> `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키입니다. `NEXT_PUBLIC_` 접두사를 붙이거나 클라이언트 컴포넌트에서 사용하면 안 됩니다.

## 배포

Vercel에 배포할 때는 로컬과 동일한 환경 변수를 Vercel Project Settings에 등록합니다.

필수 기능만 배포하려면 아래 세 값이 필요합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

이미지 배경 제거, 에셋 CDN, 모니터링, 플랫폼 사용량 조회는 선택 환경 변수로 확장할 수 있습니다.

## 모니터링

- 관리자 요약 API: `GET /api/admin/monitoring-summary`
- 관리자 수동 실행 API: `POST /api/admin/monitoring-run`
- 브라우저 대시보드: `/admin/monitoring`
- Cron 점검 API: `GET /api/cron/monitoring-check`
- Vercel Cron 설정: [vercel.json](./vercel.json)
- GitHub Actions 점검: [.github/workflows/monitoring-check.yml](./.github/workflows/monitoring-check.yml)

GitHub repository secrets에는 아래 값이 필요합니다.

- `MONITORING_APP_BASE_URL`: 배포된 앱 URL
- `CRON_SECRET`: Vercel에 등록한 값과 동일한 secret

## 검증 명령어

```bash
npm run lint
npx next build --webpack
```

현재 개발 환경에서는 기본 `next build`의 Turbopack 경로가 샌드박스 제약으로 실패할 수 있어 `--webpack` 검증을 사용했습니다.

## 포트폴리오에서 강조할 점

- AI 이미지 생성 결과를 실제 서비스 플로우에 연결한 점
- 실패 가능성이 높은 AI 기능에 rate limit, 안전성 검사, 모니터링을 함께 설계한 점
- Supabase Storage/DB와 Vercel Cron/GitHub Actions를 연결해 작은 규모의 운영 체계를 구성한 점
- MVP 범위 안에서 커스터마이징, 분기형 스토리, 엔딩, 크레딧까지 하나의 플레이 루프로 완성한 점
