# 두근두근 교수님과 시험기간 시뮬레이션 MVP

교수님 커스터마이징과 시험 전날 분기형 플레이를 중심으로 만든 최소 MVP입니다.

현재 포함된 범위:

- 교수님 외형 파츠 선택
- LLM용 자유 커스터마이징 문구 입력
- OpenAI 기반 학습 노트/PDF 텍스트 요약
- 5챕터 분기형 시뮬레이션
- 점수 기반 엔딩
- Supabase 플레이 기록 저장
- Gemini 기반 교수 스프라이트 생성
- Gemini 기반 챕터 대사/엔딩 생성
- Gemini 기반 TTS 생성
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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
OPENAI_SUMMARY_MODEL=gpt-4.1-mini
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY` 는 서버 전용입니다.
- 현재 MVP에서는 `/api/play-session` 에서만 사용합니다.
- 이 키는 절대 클라이언트 컴포넌트에 노출하면 안 됩니다.

## 배포

Vercel에 배포할 때도 같은 환경 변수를 프로젝트 설정에 넣으면 됩니다.

필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (학습 노트/PDF 텍스트 요약)
- `GEMINI_API_KEY` (이미지/스토리/TTS)

선택:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_IMAGE_MODEL`
- `GEMINI_TTS_MODEL`
- `OPENAI_SUMMARY_MODEL`

## 검증 명령어

```bash
npm run lint
npx next build --webpack
```

현재 이 개발 환경에서는 기본 `next build` 의 Turbopack 경로가 샌드박스 제약으로 실패할 수 있어 `--webpack` 검증을 사용했습니다.
