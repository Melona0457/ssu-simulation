# WORKLOG

이 파일은 이 프로젝트의 작업 기록을 누적하는 용도입니다.
앞으로 기능을 추가하거나 수정할 때마다 여기에 이어서 정리하면 됩니다.

## 2026-04-09

### 프로젝트 초기 세팅

- 빈 레포에 Next.js App Router + TypeScript + Tailwind 기반 앱 생성
- 기본 메타데이터와 전역 스타일을 프로젝트 톤에 맞게 정리
- Google 폰트 의존성을 제거하고 로컬 시스템 폰트 스택으로 변경

### MVP 핵심 흐름 구현

- 교수님 커스터마이징 중심의 메인 화면 구현
- 정형 파츠 선택:
  - 머리
  - 눈
  - 코
  - 얼굴형
  - 분위기
- 자유 텍스트 입력:
  - LLM 추가 커스터마이징 문구 입력 가능
- 커스터마이징 결과를 바탕으로 아래 값 생성
  - 교수 페르소나 요약 문장
  - 이미지 생성용 프롬프트 초안

### 시뮬레이션 MVP 구현

- 3챕터 분기형 시뮬레이션 구현
- 챕터별 선택지와 결과 로그 표시
- 점수 축 3개 구성
  - 교수 대응력
  - 시험 전략
  - 멘탈 유지력
- 총점 기반 엔딩 분기 구현

### 데이터 구조 분리

- 시뮬레이션용 데이터와 커스터마이징 옵션을 [mvp-data.ts](/Users/jeongin/ssu-simulation/src/lib/mvp-data.ts)에 분리
- 이후 6챕터 확장, 선택지 추가, 엔딩 추가가 쉽도록 구조화

### Supabase 연동 준비 및 적용

- Supabase를 결과 저장용 DB로 사용하도록 구조 설계
- 플레이 결과 저장 API 구현
- Supabase 서버 클라이언트 helper 추가
- `play_sessions` 테이블 스키마 작성
- `.env.local` 기반 환경 변수 구조 정리

관련 파일:

- [schema.sql](/Users/jeongin/ssu-simulation/supabase/schema.sql)
- [route.ts](/Users/jeongin/ssu-simulation/src/app/api/play-session/route.ts)
- [server.ts](/Users/jeongin/ssu-simulation/src/lib/supabase/server.ts)

### OpenAI 이미지 생성 연결

- OpenAI SDK 설치
- `OPENAI_API_KEY` 기반 서버 클라이언트 추가
- 교수 커스터마이징 데이터를 바탕으로 이미지 생성 API 구현
- 모델 설정:
  - `gpt-image-1.5`
  - `quality: medium`
  - `background: transparent`
  - `output_format: png`
- 메인 화면에 `교수님 이미지 생성` 버튼과 결과 프리뷰 패널 추가

관련 파일:

- [route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
- [server.ts](/Users/jeongin/ssu-simulation/src/lib/openai/server.ts)
- [page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)

### 문서화

- 프로젝트 실행/설정 방법을 [README.md](/Users/jeongin/ssu-simulation/README.md)에 정리
- Supabase 및 OpenAI 환경 변수 예시 추가
- 작업 기록용 문서로 이 파일 생성

### 검증

- `npm run lint` 통과
- `npx next build --webpack` 통과

### 현재 상태 요약

- 로컬에서 교수 커스터마이징 가능
- 로컬에서 교수 이미지 생성 가능
- 3챕터 시뮬레이션 플레이 가능
- 결과 저장 API 연결 완료
- Supabase 값이 맞으면 실제 저장 가능

### 다음 작업 후보

- 생성된 교수 이미지를 Supabase Storage에 저장
- 이미지 재생성 / variation 버튼 추가
- 3챕터를 6챕터 구조로 확장
- PDF 기반 시험 정보 주입 설계
- LLM으로 챕터 텍스트 일부 동적 생성
- 엔딩 연출 화면 강화

## 2026-04-09 추가 작업

### 전신 스프라이트 방향 반영

- 교수 이미지 생성 프롬프트를 상반신 중심에서 전신 스프라이트 중심으로 수정
- 발끝이 잘리지 않도록 full-body, standing pose, margin 지시를 프롬프트에 추가

### 비주얼노벨형 플레이 화면 구성

- `이 교수님으로 시험 전날 시작하기` 이후 화면을 비주얼노벨 느낌으로 개편
- 챕터별 배경 톤을 가진 대형 장면 패널 추가
- 생성된 교수 이미지를 배경 위에 오버레이하도록 구성
- 하단에 이름 태그 + 대화문 + 선택지 버튼이 함께 있는 대화창 레이아웃 구현

### 챕터 시각 정보 추가

- 각 챕터에 `location`, `backdrop` 정보를 추가
- 기숙사, 도서관, 시험장 앞 장면이 서로 다른 분위기로 보이도록 구성

## 2026-04-09 추가 수정

### 전신 이미지 잘림 보정

- 이미지 생성 해상도를 정사각형에서 세로형 `1024x1536`으로 변경
- 머리와 발이 잘리지 않도록 프롬프트에 여백과 비크롭 지시를 강화
- 미리보기 이미지에도 `object-top`과 더 큰 세로 높이를 적용

### 화면 전환 구조 수정

- `이 교수님으로 시험 전날 시작하기`를 누르면 같은 페이지 내 일부 영역이 아니라
  플레이 전용 화면이 보이도록 렌더링 구조를 분리
- 커스터마이징 화면, 플레이 화면, 엔딩 화면이 각각 독립된 전체 화면처럼 보이게 조정

### 불필요 파일 정리

- 더 이상 쓰지 않는 `.env.example` 삭제
- Next 기본 스타터 SVG 파일 삭제
  - `public/file.svg`
  - `public/globe.svg`
  - `public/next.svg`
  - `public/vercel.svg`
  - `public/window.svg`

## 2026-04-11 추가 작업

### Google Cloud TTS 준비

- Google Cloud 서비스 계정 JSON 키 파일을 로컬에 배치
- `.env.local`에 Google Cloud TTS 관련 환경 변수 추가
- 서비스 계정 키가 GitHub에 올라가지 않도록 [.gitignore](/Users/jeongin/ssu-simulation/.gitignore)에 JSON 키 파일명 추가

### Google Cloud TTS 연동

- Google Cloud Text-to-Speech 서버 helper 추가
- `/api/tts` API route 추가
- 교수 성별 표현에 따라 한국어 Google TTS 음성을 다르게 매핑
- 챕터 대사와 선택 직후 반응이 바뀔 때 자동으로 TTS를 생성하고 재생하도록 플레이 화면에 연결
- 자동 재생이 막힐 때를 대비해 `음성 다시 듣기` 버튼 추가

### TTS 연출 개선

- 교수 생성 화면에 `교수님 목소리` 선택 드롭다운 추가
- 성별 표현에 맞는 Google 한국어 음성 옵션만 보이도록 연결
- 챕터 대사/반응 텍스트가 TTS 준비 전에 먼저 뜨지 않도록 표시 타이밍 조정
- 오디오 길이를 기준으로 타이핑 속도를 조정해 TTS와 텍스트 진행감을 더 가깝게 맞춤

### 감정 기반 TTS 연출 추가

- 챕터 대사 생성 API에서 `emotion` 태그를 함께 생성하도록 확장
- 선택지 반응에도 감정 태그를 포함하도록 구조 수정
- Google TTS는 emotion 값에 따라 speaking rate와 pitch를 달리 적용하도록 설정
- 플레이 화면에서 현재 대사 감정 상태를 확인할 수 있게 표시
