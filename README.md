# 두근두근 교수님과 시험기간 시뮬레이션 MVP

교수님 커스터마이징과 시험 전날 분기형 플레이를 중심으로 만든 최소 MVP입니다.

현재 포함된 범위:

- 교수님 외형 파츠 선택
- LLM용 자유 커스터마이징 문구 입력
- OpenAI 기반 학습 노트/PDF 텍스트 요약
- 10~15개 챕터 풀 중 6개 선별형 분기 시뮬레이션
- 점수 기반 엔딩
- Supabase 플레이 기록 저장
- Gemini 기반 교수 스프라이트 생성
- Gemini 기반 A1 세션팩 생성(세션 시작 시 1회 호출로 6챕터+엔딩 보정)
- OpenAI 요약 결과를 기반으로 Gemini가 챕터 중 깜짝 퀴즈를 생성

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 열면 됩니다.

## Supabase 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 [schema.sql](/Users/jeongin/ssu-simulation/supabase/schema.sql) 내용을 실행합니다.
3. 프로젝트 설정에서 아래 값을 확인합니다.

- `Project URL`
- `anon public key`
- `service_role key`

4. 루트에 `.env.local` 파일을 만들고 아래처럼 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_BGM_BASE_URL=https://your-project-ref.supabase.co/storage/v1/object/public/bgm
NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL=https://your-project-ref.supabase.co/storage/v1/object/public/voice
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TEXT_MODEL=gemini-2.5-flash-lite
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
OPENAI_SUMMARY_MODEL=gpt-4.1-mini
BG_API_URL=https://your-bg-remove-api.example.com
BG_API_TIMEOUT_MS=45000
MONITORING_ADMIN_SECRET=your_monitoring_admin_secret
MONITORING_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook
CRON_SECRET=your_vercel_cron_secret
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용입니다.
- 현재 MVP에서는 `/api/play-session` 에서만 사용합니다.
- 이 키는 절대 클라이언트 컴포넌트에 노출하면 안 됩니다.
- `NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL` 은 `voice` public bucket 기준 URL입니다.
- 예시: `https://your-project-ref.supabase.co/storage/v1/object/public/voice`
- 자동 모니터링을 쓰려면 [monitoring_schema.sql](/Users/jeongin/ssu-simulation/supabase/monitoring_schema.sql) 도 함께 실행합니다.

## 배포

Vercel에 배포할 때도 같은 환경 변수를 프로젝트 설정에 넣으면 됩니다.

필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (학습 노트/PDF 텍스트 요약)
- `GEMINI_API_KEY` (이미지/스토리)
- `BG_API_URL` (외부 누끼 API 서버 주소, 예: Cloudflare Tunnel URL)

선택:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`
- `GEMINI_TTS_MODEL`
- `OPENAI_SUMMARY_MODEL`
- `BG_API_TIMEOUT_MS`
- `MONITORING_ADMIN_SECRET` (관리자 요약 API 보호용)
- `MONITORING_DISCORD_WEBHOOK_URL` (Discord 자동 경고 전송)
- `CRON_SECRET` (Vercel cron 인증)

## 자동 모니터링

- 관리자 요약 API: `GET /api/admin/monitoring-summary`
- 브라우저 대시보드: `/admin/monitoring`
- 인증: `Authorization: Bearer <MONITORING_ADMIN_SECRET>` 또는 `x-monitoring-secret` 헤더
- 일일 자동 점검: [vercel.json](/Users/jeongin/ssu-simulation/vercel.json) 의 `/api/cron/monitoring-check`
- Hobby 플랜에서는 Vercel cron 이 하루 1회만 실행됩니다.

자동 점검은 아래 항목을 확인합니다.

- 최근 이미지 생성 성공/경고/오류 수
- 최근 이미지 생성 평균 지연 시간
- 배경 제거 서버 `/health` 상태
- 임계치 초과 시 Discord 웹훅 경고

## GitHub Actions 모니터링

- 워크플로: [monitoring-check.yml](/Users/jeongin/ssu-simulation/.github/workflows/monitoring-check.yml)
- 주기: 15분마다 + 수동 실행(`workflow_dispatch`)
- 호출 엔드포인트: `/api/cron/monitoring-check`
- GitHub Actions는 에러 수준 경고가 감지되면 워크플로를 실패 처리합니다.

GitHub repository secrets 에는 아래 두 값이 필요합니다.

- `MONITORING_APP_BASE_URL`: 예시 `https://ssu-simulation.vercel.app`
- `CRON_SECRET`: Vercel에 넣은 값과 동일한 cron 인증용 시크릿

정리:

- `MONITORING_ADMIN_SECRET`: Vercel만 필요
- `MONITORING_DISCORD_WEBHOOK_URL`: Vercel만 필요
- `CRON_SECRET`: Vercel + GitHub 둘 다 필요
- `MONITORING_APP_BASE_URL`: GitHub만 필요

## 검증 명령어

```bash
npm run lint
npx next build --webpack
```

현재 이 개발 환경에서는 기본 `next build` 의 Turbopack 경로가 샌드박스 제약으로 실패할 수 있어 `--webpack` 검증을 사용했습니다.
