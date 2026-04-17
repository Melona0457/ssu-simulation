## 2026-04-17 점검 정리

### 이번 점검 목적
- `WORKLOG2.md` 기준으로 실제 반영 상태 재확인
- 누락되었거나 로그와 현재 코드가 어긋난 부분 정리
- 바로 다음 작업 우선순위 정리

### 확인된 구현 항목
- 교수 스크립트 프로필 API/파서 존재
  - `src/lib/professor-script-profile.ts`
  - `src/app/api/professor-script-profile/route.ts`
- 엔딩 카탈로그/히든 엔딩/성별 엔딩 대사 분기 반영됨
  - `src/lib/game-data.ts`
  - `src/lib/professor-route-story.ts`
  - `src/app/page.tsx`
- BGM 베이스 URL 환경변수 반영됨
  - `.env.local`
  - `src/app/page.tsx`
- 효과음 경로 및 재생 로직 반영됨
  - `public/sfx/story/*.ogg`
  - `src/app/page.tsx`
- 타이틀/커스터마이즈/엔딩 이미지 자산 반영됨
  - `public/ui/title-screen/*.webp`
  - `public/ui/ending-screen/*.webp`
- `INI.md`, `ENDING.md`, `supabase/script_voice_schema.sql` 파일 존재 확인
- `.gitignore`의 `*_old.md` 무시 규칙 반영됨

### 점검 중 확인된 문제
- 폰트 404 발생 원인 확인
  - `src/app/globals.css`에서 `/fonts/OwnglyphMeetme.ttf`를 `@font-face`로 불러오고 있음
  - 하지만 현재 저장소에는 `public/fonts/OwnglyphMeetme.ttf` 파일이 없음
  - 그래서 브라우저에서 `GET /fonts/OwnglyphMeetme.ttf 404`가 발생함
- 폰트는 실제로 사용 중
  - `src/app/page.tsx`에서 `.font-story` 클래스가 여러 UI에 적용되어 있음
  - 즉 “예전에 연결만 해둔 흔적”이 아니라 현재도 적용 대상이 있음

### 로그와 현재 코드가 어긋나는 부분
- `WORKLOG2.md`에는 한 시점에 “이미지 생성 함수/버튼 흐름 제거”라고 적혀 있음
- 하지만 현재 `src/app/page.tsx`에는 아래가 다시 존재함
  - `generateProfessorImage()` 함수
  - `교수님 생성` 버튼
- 따라서 이 항목은 “안 한 것”이라기보다, 이후 작업으로 다시 되돌아온 상태로 보는 편이 맞음

### 추가로 해야 할 일
- `public/fonts/OwnglyphMeetme.ttf`를 실제로 추가하거나, 폰트 사용을 중단할 경우 `@font-face`와 `.font-story` 적용부를 정리할 것
- Turbopack 경고 원인인 `process.cwd()` 기반 스크립트 파일 접근 방식을 추후 정리할 것
  - 현재 빌드는 되지만 경고가 계속 남아 있음
- Supabase Storage BGM 파일들이 실제 bucket 경로와 모두 일치하는지 운영 환경에서 최종 점검할 것
- 현재 로그 문서와 실제 코드 상태가 어긋난 부분이 있으므로 이후 작업부터는 “제거”와 “재도입” 이력을 분리해서 기록할 것

### 우선순위 제안
1. 폰트 파일 누락부터 정리
2. 운영 경로 기반 BGM/이미지 자산 실서버 점검
3. `process.cwd()` 경고 제거
4. 다음 로그부터 `WORKLOG3.md` 기준으로 이어서 기록
