## 2026-04-16 MVP 구현 로그

### 요청 기준 반영
- 사용자 지시 기준으로 구현 우선순위 고정:
  - 밤 에피소드 종료 후 바로 결과형 엔딩 화면
  - 히든 엔딩 2종만 유지, 호감도 100일 때 랜덤 진입
  - 교수 이미지 생성은 기본 1장만 생성
  - 교수 대사 단위 음성 슬롯 경로 제공
  - 반응형 유지 + 텍스트 드래그 방지
  - 구현 로그는 `WORKLOG2.md`에 기록

### 구현 내용
- `src/lib/professor-script-profile.ts` 추가
  - 성별/연령대(`TONE_20S|30S|40S`) 기반으로 6개 `.md` 파일 매핑
  - `.md`에서 `교수:`/`교수(옆칸):` 라인 추출 로직 구현
- `src/app/api/professor-script-profile/route.ts` 추가
  - `gender`, `ageTone` 쿼리로 교수 스크립트 프로필 라인 반환
- `src/lib/game-data.ts` 수정
  - 말투 선택지를 `20대/30대/40대` 옵션으로 전환
  - 말투 선택 값이 이미지 LLM 프롬프트에 들어가지 않도록 분리
  - `getEndingRank`가 기본적으로 A/B/C만 반환하도록 조정
- `src/app/page.tsx` 수정
  - 기존 말투 치환 로직 제거
  - 선택한 프로필 스크립트 라인을 교수 대사에 주입하는 구조 추가
  - 교수 대사별 음성 슬롯 경로 생성(`/voice/{profile}/{index}.wav`)
  - 현재 교수 대사에 해당하는 오디오 플레이어(슬롯) UI 추가
  - 엔딩 결정 시 `score100 >= 100`이면 `ENDING_F`(히든) 강제 진입
  - 히든 엔딩은 2개 변형 중 랜덤 선택
  - 장면 배경에 그라디언트 더미 레이어 추가
- `src/app/api/generate-professor-image/route.ts` 전면 단순화
  - 표정 3장 생성 루프 제거
  - 기본 교수 이미지 1장만 생성/누끼 처리 후 반환
- `src/app/globals.css` 수정
  - 전역 텍스트 드래그 방지(`user-select: none`)
  - 입력 요소는 텍스트 선택 허용
  - 이미지 드래그 방지
- `src/lib/professor-route-story.ts` 수정
  - `ep06_night_bench` 배경 경로를 실제 파일명(`night-bench.webp`)으로 보정
- `supabase/script_voice_schema.sql` 추가
  - 교수 스크립트 프로필/음성 슬롯 저장용 기본 테이블 DDL 추가

### 검증
- `npm run lint` 통과
- `npm run build` 통과
  - Turbopack 경고 1건:
    - `src/lib/professor-script-profile.ts`에서 `process.cwd()` 기반 파일 추적으로 인한 NFT 경고
    - 빌드 자체는 성공
- 스크립트 원본 파일 점검:
  - 현재 파서 기준 프로필별 추출 교수 대사 수:
    - male_20s: 67, male_30s: 67, male_40s: 66
    - female_20s: 67, female_30s: 67, female_40s: 67

## 2026-04-16 더미 모드 정리 로그 (추가)

### 요청 기준 반영
- `남자30대중년교수님.md` 재확인 및 연결 상태 점검
- 기본 교수 대사 슬롯 86개를 별도 `INI.md`로 생성
- 이전 이미지/컷인 중심 로직 및 관련 UI 제거
- 배경/이미지 요소는 더미 그라디언트로 단순화

### 구현 내용
- `src/app/page.tsx` 대규모 정리
  - 이미지 생성 함수(`generateProfessorImage`) 및 생성 버튼 흐름 제거
  - `스토리 시작` 단일 버튼 흐름으로 단순화
  - 표정/컷인/엔딩 이미지 참조 상태 및 setter 제거
  - 타이틀/크레딧 이미지 참조 제거, 텍스트 기반 더미 화면으로 교체
  - 플레이/엔딩 배경을 단색/그라디언트 더미 레이어로 통일
  - `EndingState`에서 제거된 `expressionKey` 잔여 참조 정리
- 구 이미지 API 제거
  - `src/app/api/generate-professor-image/route.ts` 삭제
- 기본 교수 대사 슬롯 문서화
  - `INI.md` 생성 (총 86개 슬롯, 001~086)

### 검증
- `npx tsc --noEmit` 통과
- `npm run lint` 통과

## 2026-04-17 BGM 9종 매핑 적용

### 요청 기준 반영
- BGM 9개 기준으로 화면/에피소드별 자동 전환 적용
  - 초기화면~교수생성
  - 등굣길
  - 밤
  - 엔딩화면~엔딩크레딧
  - 오후도서관
  - 학생식당+학교앞식당
  - 아침강의실
  - 저녁식사
  - 화장실

### 구현 내용
- `src/app/page.tsx`에 스토리 BGM 경로 상수 추가:
  - `/bgm/intro_professor_setup.ogg`
  - `/bgm/morning_classroom.ogg`
  - `/bgm/commute_episode.ogg`
  - `/bgm/cafeteria_restaurant_episode.ogg`
  - `/bgm/restroom_episode.ogg`
  - `/bgm/afternoon_library_episode.ogg`
  - `/bgm/dinner_episode.ogg`
  - `/bgm/night_episode.ogg`
  - `/bgm/ending_credit.ogg`
- `resolveBgmUrlByContext` 함수 추가
  - `phase` + `episodeId` 기준으로 BGM URL 반환
- 오디오 태그 `src`를 동적 BGM URL로 변경
- BGM 켜진 상태에서 장면/화면 전환 시 새 BGM을 즉시 재생하도록 `useEffect` 추가

## 2026-04-17 Supabase Storage BGM 전환

### 요청 기준 반영
- Supabase Storage(`bgm` public bucket)에 업로드한 BGM 파일을 앱에서 직접 재생하도록 전환

### 구현 내용
- `src/app/page.tsx`
  - `NEXT_PUBLIC_SUPABASE_BGM_BASE_URL` 환경변수 기반 BGM 베이스 URL 추가
  - 베이스 URL 끝 슬래시 정규화 처리(`replace(/\/+$/, "")`)
  - 기존 `/bgm/*.ogg` 하드코딩 경로를 `${BGM_BASE_URL}/*.ogg`로 변경
  - 환경변수 미설정 시 로컬 `/bgm` fallback 유지
- `.env.local`
  - `NEXT_PUBLIC_SUPABASE_BGM_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/bgm` 추가

## 2026-04-17 교수 스크립트 포맷 변경 대응 + 효과음 트리거 반영

### 요청 기준 반영
- 사용자 수정본 교수 `.md` 6개 재검증
- `STORY.md`에서 `효과음:`이 비어있지 않은 지점만 트리거
- `효과음: (공란)`은 무시

### 구현 내용
- `src/lib/professor-script-profile.ts`
  - `001 = ...` 형태의 인덱스 기반 스크립트 파싱 지원 추가
  - 인덱스 정렬 후 교수 대사 배열 생성
  - 기존 `교수:` 형식 파싱은 fallback으로 유지
- `src/app/page.tsx`
  - 효과음 자산 경로 상수(`public/sfx/story/*.ogg`) 추가
  - `episodeId + sceneId + lineText` 기반 효과음 매핑 함수 추가
  - `screen4_8_chapter` 진행 시 해당 대사/연출 라인 진입 시 효과음 재생
  - 같은 라인에서 중복 재생 방지를 위한 트리거 키(ref) 적용
  - BGM OFF 상태에서는 효과음도 재생하지 않도록 처리

### 검증
- 교수 스크립트 인덱스 파싱 수: 6개 파일 모두 86개 확인
- `npx tsc --noEmit` 통과
- `npm run lint` 통과

## 2026-04-17 디버그 패널 최신화

### 요청 기준 반영
- 디버그 패널 UI/동작을 현재 스토리/엔딩 로직 기준으로 정비

### 구현 내용
- `src/app/page.tsx`
  - 디버그 화면 이동 버튼 라벨 최신화
  - `화면9 엔딩` 직접 이동 버튼 추가
  - 현재 상태 패널에 스크립트 프로필 키/로드 줄 수/BGM URL 표시
  - 히든 엔딩(`ENDING_F`) 디버그 변형 목록을 2개로 제한
  - 히든 엔딩 조건 안내 문구(호감도 100 트리거) 추가
  - 디버그 엔딩 점수 맵에서 `ENDING_F`를 100으로 정렬
  - 디버그 점프/리셋 시 효과음 트리거 키 초기화
  - 스토리 점프 보조 버튼 문구 명확화

## 2026-04-17 ENDING.md 동기화 반영

### 요청 기준 반영
- `ENDING.md`를 엔딩 단일 기준 문서로 보고 코드 엔딩 카탈로그를 동기화
- 불필요하게 분기되던 A/B/C 엔딩 변형을 단일화
- 히든 엔딩은 2개만 유지

### 구현 내용
- `src/lib/professor-route-story.ts`
  - `storyEndingCatalog`를 `ENDING.md` 서술 기준으로 교체
  - A/B/C: 각 1개 변형으로 정리
  - 히든: 2개 변형(`진정한 멋사인으로 변신`, `로그아웃 처리`)만 유지
- `src/app/page.tsx`
  - `pickEndingVariant`를 현재 규칙에 맞게 단순화
    - 일반 엔딩: 단일 변형 고정
    - 히든 엔딩: 2개 중 랜덤
  - 구 분기용 `choiceHistory` 상태 제거
  - 엔딩 변형 요약 문구 맵 갱신
- `src/lib/game-data.ts`
  - `endingMeta`의 타이틀/설명을 최신 엔딩 톤에 맞게 갱신

### 검증
- `npm run lint` 통과
- `npx tsc --noEmit` 통과

## 2026-04-17 ENDING 성별 대사 분기 + 문서 오타 정정

### 요청 기준 반영
- 엔딩 대사를 교수 성별(남/여)에 맞춰 분기 출력
- `ENDING.md` B 섹션의 `엔딩 A+` 오타를 `엔딩 B+`로 정정

### 구현 내용
- `src/app/page.tsx`
  - 엔딩 variant id별 성별 대사 맵(`GENDERED_ENDING_PROFESSOR_LINES`) 추가
  - `buildVariantLines`에 `professorGender` 인자 추가
  - 엔딩 표시 시 교수 대사는 성별 분기 텍스트를 우선 사용하도록 적용
- `ENDING.md`
  - B 엔딩 제목 오타 수정: `엔딩 A+` → `엔딩 B+`

### 검증
- `npm run lint` 통과
- `npx tsc --noEmit` 통과

## 2026-04-17 dev UI 변경 병합 반영

### 요청 기준 반영
- `origin/dev`에 반영된 상단 UI 개선 및 하트 게이지 효과를 현재 스토리 오버홀 작업본에 병합
- 새 UI를 반영하되 현재 스토리 진행 정보(Scene/장소)는 유지

### 구현 내용
- `src/app/page.tsx`
  - `origin/dev` 머지로 하트 게이지 pulse 효과 및 100% 도달 시 강조 연출 반영
  - 상단 Episode 카드 형태 UI 반영
  - Scene 진행도와 현재 장소 텍스트를 새 상단 카드 안에 재배치

### 검증
- `npm run lint` 통과
- `npx tsc --noEmit` 통과

## 2026-04-17 백업 파일 정리 + 대사창 UI 선택 반영

### 요청 기준 반영
- 로컬 백업용 `*_old.md` 파일이 Git 상태창에 뜨지 않도록 정리
- `PR #37` 계열의 대사창 UI 변경 중 대사창 레이아웃만 현재 로직 위에 선택 반영

### 구현 내용
- `.gitignore`
  - `*_old.md` 패턴 추가
- `src/app/page.tsx`
  - 기존 종이 느낌 대사창을 패널형 하단 대사창으로 교체
  - `PR #37` 스타일의 이름표/컨트롤 바 구조를 반영
  - 현재 프로젝트의 음성 슬롯 영역과 한국어 진행 문구는 유지
  - 버튼 클릭 시 부모 대사창 클릭 이벤트가 섞이지 않도록 `stopPropagation` 적용

### 검증
- `npm run lint` 통과
- `npx tsc --noEmit` 통과
