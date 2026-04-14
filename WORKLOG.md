# WORKLOG

이 문서는 프로젝트의 실제 의사결정과 구현 변경사항을 누적 기록합니다.
현재 기준 버전은 `v1`이며, 이후 변경은 아래 형식으로 계속 추가합니다.

## 버전 기준

### v0 (초기 베이스)

- Next.js + TypeScript 기반 초기 앱 구성
- 교수 커스터마이징 + 이미지 생성 + 챕터형 플레이의 프로토타입 구현
- TTS 실험 기능을 포함한 확장 테스트 진행

### v1 (현재 운영 기준, 와이어프레임 정렬 버전)

- 서비스 기획서 + 1차 회의 결과 + 와이어프레임(화면1~11) 기준으로 흐름 재정렬
- 베타 범위에서 TTS 제외, 저장/불러오기/설정은 후순위로 이동
- 챕터/엔딩 정책, UI 문구/연출, 내부 프롬프트 정책까지 반영 완료

## 2026-04-12 변경 로그 (v0 -> v1 핵심 반영)

### 기획 확정사항 반영

- 베타에서 TTS 제외
- 챕터 구조를 `10~15개 풀 중 6개 선별` 방식으로 확정
- 엔딩은 `5개 + 100점 구간` 방식으로 변경
- 화면 흐름을 와이어프레임 1~11 기준으로 고정
- 교수 커스터마이징 항목을 간단형(축소형)으로 조정
- `저장/불러오기/설정`은 로그인/회원가입 미도입 베타에서 후순위 처리
- 숭실 배경/문구는 내부 데모 전용 사용 범위로 정의

### 데이터/로직 변경

- 챕터 풀을 12개로 확장하고, 시퀀스 그룹별로 6개를 뽑는 선택 로직 추가
- 점수 정규화 로직(`100점 환산`) 기준으로 엔딩 분기 계산
- 임시 엔딩 5종(타이틀/설명) 세팅
- `요소1/요소2/요소3`를 외형 정보 입력 칸으로 명확화하고 추천 선택지(datalist) 제공

### 일러스트 프롬프트 정책

- 사용자 선택값 + LLM 입력을 합치는 내부 프롬프트에 `일러스트디자인1~3` 스타일 프로필 반영
- 스타일별 무드/키워드 고정값을 내부 프롬프트에 포함해 생성 일관성 강화

### UI/문구/버그 수정

- 대사 앞 중복 표기 버그 수정: `교수: 교수: ...` -> `교수: ...`
- 엔딩 후 현실 복귀 문구를 요청한 형식으로 변경
- 화면 흐름을 `타이틀 -> 주인공 입력 -> 교수 생성 -> 챕터 -> 엔딩 -> 현실 문구 -> 크레딧`으로 통일

### 크레딧 연출

- 크레딧 화면을 정적 목록에서 `아래 -> 위` 롤링 애니메이션으로 변경
- 롤링 종료 후 중앙에 `화면 터치시 메인 화면으로 돌아갑니다` 문구가 깜빡이도록 구현

### 수정된 주요 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)

## 2026-04-13 변경 로그

### 크레딧 타이밍 버그 수정

- 문제: 크레딧 이름이 다 올라가기 전에 `화면 터치시 메인 화면으로 돌아갑니다` 문구가 먼저 노출됨
- 조치: 크레딧 롤 애니메이션 종료 이벤트(`onAnimationEnd`) 이후에만 안내 문구가 뜨도록 조건 조정
- 결과: 전체 크레딧이 끝난 뒤 안내 문구가 노출됨

### 운영 요청 반영

- `WORKLOG.md`를 최신 기준으로 재정리
- 기존 장황한 초기 기록은 압축하고, 현재 의사결정 중심 로그 체계로 재구성

## 기획/개발 메모 (Gemini API 비용 효율)

- 모델 라우팅 분리: 기본 생성은 저비용 모델, 중요한 장면만 상위 모델 사용
- 호출 수 최소화: 챕터별 매턴 생성 대신 `세션 단위 선생성 + 재사용`
- 입력 토큰 절감: 시스템 프롬프트 고정 템플릿화 + 장문 컨텍스트 요약 저장
- 출력 제한: `maxOutputTokens`와 구조화 응답(JSON 스키마)로 낭비 축소
- 캐시 우선: 동일 조합(교수 설정/챕터/스타일)은 해시 키로 결과 재사용
- 배치 처리: 가능한 항목은 한 번에 생성해 왕복 호출 비용 절감

## 2026-04-13 추가 로그 (Gemini 최소비용 호출 설계안)

### 결정사항

- 챕터 본문(대사/선택지)은 런타임 매턴 생성 대신 사전 생성 우선
- 런타임 LLM 호출은 `세션 시작 1회`(+선택사항: 엔딩 polish 1회) 구조로 제한
- 대량 사전 생성은 Batch API 우선 적용, 실시간 경로는 Standard API로 분리

### 구현/수정 내용

- 호출 단위를 `chapter-turn` 기준에서 `session-pack` 기준으로 전환하기로 설계
- 출력 포맷을 구조화 JSON으로 고정해 재시도/파싱 비용을 줄이는 방향으로 확정
- 동일 파라미터(교수 설정/스타일/선택 챕터 조합)에 대해 결과 캐시 키를 두는 전략 확정

### 영향 파일

- 문서 설계 단계라 코드 파일 변경 없음
- WORKLOG 문서만 업데이트

### 남은 TODO

- `session-pack` JSON 스키마 정의
- Batch 사전생성 스크립트/잡 구성
- 런타임 캐시 계층(메모리/DB) 설계 및 만료 정책 정의

## 2026-04-13 추가 로그 (A1 실제 적용)

### 결정사항

- A1를 `세션 시작 1회 호출`로 실제 반영
- 호출 실패/미설정 시 즉시 fallback(기본 챕터/기본 엔딩)로 진행
- 엔딩 polish는 별도 호출 없이 세션팩 응답에 포함

### 구현/수정 내용

- 신규 API 추가: `/api/generate-session-pack`
- 입력: 선택된 6챕터 ID + 플레이어명 + 교수명 + 교수 요약
- 출력: 챕터별 대사/선택지/반응 + 5개 엔딩 polish JSON
- 프론트 `시작하기` 동작을 세션팩 선생성 흐름으로 변경
- `스토리 준비 중` 상태/메시지 표시 및 버튼 비활성화 처리
- 엔딩 계산 시 점수 랭크는 기존 로컬 로직 유지, 텍스트만 session polish 우선 사용

### 영향 파일

- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [README.md](/Users/jeongin/ssu-simulation/README.md)

### 남은 TODO

- Batch API 기반 사전 생성 파이프라인 구성
- session-pack 결과 캐시(조합 키) 도입
- README의 구 버전 문구(TTS 관련) 정리

## 2026-04-13 추가 로그 (이미지 생성 비용 질의 정리)

### 결정사항

- 표정 변형(화남/웃음 등)도 각각 별도 이미지 생성으로 과금됨
- 기본 캐릭터 1장 + 표정 2장을 만들면 총 3장 기준 비용으로 계산

### 구현/수정 내용

- 코드 수정 없음 (운영 비용 기준만 확정)

### 영향 파일

- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 표정 세트 생성 시 `필수 표정 수`를 먼저 고정해 월 비용 상한 계산표 만들기

## 2026-04-13 추가 로그 (PM 논의 반영 메모)

### 결정사항

- PM 방향(시간대/장소 기반 분기 그래프, 공감 가능한 대학생 상황 중심)을 우선 채택
- 런타임 비용 최소화를 위해 `사전 스토리 구조 고정 + 런타임 최소 호출(A1)` 혼합 전략이 적합
- 표정 이미지는 감정 키워드 매핑으로 로컬 전환 가능, 단 생성 장수만큼 비용은 선형 증가

### 구현/수정 내용

- 코드 수정 없음 (설계 정렬 단계)

### 영향 파일

- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 챕터 플로우 다이어그램(시간대별 노드/분기) 수령 후 데이터 스키마 확정
- 선택지 중립 텍스트 + 페르소나별 점수 가중치 규칙 설계
- 표정 세트(기본/웃음/화남/슬픔) 생성 시점: 시작 시 일괄 vs 필요 시 지연생성 결정

## 2026-04-13 추가 로그 (사용자 확정안 반영)

### 결정사항

- 점수 UI는 숫자 대신 게이지형으로 노출
- 선택 직후 게이지가 끊기지 않고 부드럽게 증가하는 모션 적용
- 표정 이미지 생성(기본+감정 3종)은 현재 릴리즈 범위에서 제외
- A1 응답은 `배점 + 문장 톤 보정`을 모두 포함하도록 유지

### 구현/수정 내용

- 플레이 화면 상단에 `호감도 게이지`와 상태 문구 추가
- 게이지 fill width에 transition을 적용해 20 -> 40 같은 구간이 자연스럽게 애니메이션되도록 처리
- session-pack 프롬프트 제약 강화:
  - 선택지는 중립적으로 작성
  - 배점은 교수 페르소나에 따라 차등
  - 문장 톤과 배점의 일관성 유지

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 게이지 시안(색/두께/위치) 최종 디자인 튜닝
- PM 플로우차트 기준으로 챕터 노드/분기 데이터 정규화

## 2026-04-13 추가 로그 (화면1~3 시안 반영)

### 결정사항

- 화면1~3 프리게임 UI를 전달받은 시안 기준으로 우선 반영
- 배경은 이미지 교체가 쉬운 URL 슬롯 방식으로 구성
- 화면3은 시안 우선 배치(대형 폼 + 만들기 버튼 중심)로 개편

### 구현/수정 내용

- 화면1:
  - 메인표지 태그, 중앙 대형 프레임, 하단 타이틀/시작문구 오버레이 구성
- 화면2:
  - 대형 타이틀, 반투명 입력 패널, 성별 토글, 핑크 확인 버튼 구성
- 화면3:
  - 좌우 2열 입력 구조(이름/성별/나이/말투 + 요소1~3), 요구사항 대형 텍스트영역, 하단 만들기 버튼 구성
  - `만들기` 클릭 시 교수 이미지 생성 후 스토리 시작으로 연결
- 배경 URL 슬롯 추가:
  - `/backgrounds/pre-game-bg.png`
  - `/backgrounds/screen1-cover.png`
  - 파일이 없어도 그라디언트 fallback으로 화면이 유지되게 처리

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실사용 배경 원본 이미지 파일을 `public/backgrounds`에 배치
- 화면2에서 성별 UI 위치/크기 최종 미세조정

## 2026-04-13 추가 로그 (화면1 시안 변경 반영)

### 결정사항

- 변경된 화면1 시안 기준으로 메인표지 구조를 재조정
- 프레임/라벨형 구성에서 `풀스크린 일러스트 + 하단 타이틀 오버레이` 구조로 변경
- 배경 이미지는 기존과 동일하게 교체 가능한 URL 슬롯 방식 유지

### 구현/수정 내용

- `screen1_title` 섹션 JSX 재구성
  - 배경 레이어: 이미지 + 색보정 그라디언트
  - 전면 레이어: 하단 중심 대형 타이틀/안내문구
- 기존 `메인표지` 라벨 및 카드 프레임 제거

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 최종 배경 이미지 파일 교체 후 텍스트 위치 미세조정

## 2026-04-13 추가 로그 (화면1 시작문구 블링크)

### 결정사항

- 화면1 `화면을 클릭하여 게임을 시작해 주세요` 문구에 깜빡임 모션 적용

### 구현/수정 내용

- `screen1-touch-guide` 클래스 추가
- `screen1-touch-guide-blink` keyframes로 on/off 형태 블링크 애니메이션 적용

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 깜빡임 속도(1.05s) 체감 확인 후 필요 시 조정

## 2026-04-13 추가 로그 (화면2 확인 버튼 디테일 재현)

### 결정사항

- 화면2 `확인` 버튼을 참고 이미지 기준으로 재질감/외곽선/양끝 하트까지 세밀하게 구현

### 구현/수정 내용

- 버튼 전용 클래스 `screen2-confirm-btn` 추가
- 반투명 광택 그라디언트, 이중 외곽선, 내부 검은 내각선, 눌림 그림자 적용
- 좌우 끝 하트 장식을 별도 요소(`screen2-confirm-heart-left/right`)로 배치
- 중앙 라벨 고정 정렬(`screen2-confirm-label`) 처리

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 하트 크기/간격 1차 미세조정

## 2026-04-13 추가 로그 (화면2 버튼 단순화 재수정)

### 결정사항

- 화면2 확인 버튼은 텍스처(광택/입자) 없이 단순 형태 중심으로 조정
- 하트는 원 안 장식이 아닌 `하트 모양` 자체로 배치
- 버튼 세로 길이를 기존보다 크게 확장

### 구현/수정 내용

- `screen2-confirm-btn` 스타일 단순화:
  - 단색에 가까운 그라디언트
  - 외곽선/내각선 유지
  - 과한 광택 효과 제거
- `screen2-confirm-heart`에서 원형 배경/테두리 제거 후 하트 글리프만 남김
- 버튼 높이/패딩 증가로 세로 비율 확장

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 버튼 높이와 하트 좌우 여백 픽셀 단위 추가 튜닝

## 2026-04-13 추가 로그 (화면2 버튼 글씨 롤백)

### 결정사항

- 화면2 확인 버튼의 글씨 스타일은 이전(원래) 톤으로 복원

### 구현/수정 내용

- `screen2-confirm-btn`의 글씨 관련 스타일 변경
  - 색상: `#5e1f3e`
  - 글자 간격: 원래 값으로 조정
  - stroke/shadow 제거
- `screen2-confirm-label`이 버튼의 글씨 스타일을 그대로 상속하도록 정리

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 버튼 형태 확정 후 글씨 크기 최종 미세조정

## 다음 로그 작성 규칙

- 날짜별로 섹션 추가
- 아래 4가지는 반드시 기록
- `결정사항`
- `구현/수정 내용`
- `영향 파일`
- `남은 TODO`

## 2026-04-13 추가 로그 (화면2 버튼 교차선 제거 및 외곽선만 유지)

### 결정사항

- 화면2 확인 버튼 내부 검은선은 교차 표현을 없애고 외곽 윤곽만 보이도록 변경

### 구현/수정 내용

- `screen2-confirm-btn::before`
  - 기존 전체 테두리/마스킹 방식 제거
  - 수평 0~100%, 수직 20~80% 영역에서 `border-top`, `border-bottom`만 표시
- `screen2-confirm-btn::after`
  - 기존 전체 테두리/마스킹 방식 제거
  - 수평 20~80%, 수직 0~100% 영역에서 `border-left`, `border-right`만 표시
- 결과적으로 중앙 교차선이 사라지고 바깥 윤곽선만 남도록 정리

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 화면에서 하트와 선 끝 맞물림(코너 접점) 최종 미세조정

## 2026-04-13 추가 로그 (화면2 버튼 선 구조 정리 및 시안 근접화)

### 결정사항

- 교차형 검은선 구조를 폐기하고 시안 기준으로 더 깔끔한 단일 내부 타원선 중심으로 정리

### 구현/수정 내용

- `screen2-confirm-btn::before`
  - 검은 내부선을 단일 타원 테두리로 변경 (`border` 전체 적용)
  - 위치를 `left/right 5.5%`, `top/bottom 18%`로 조정해 교차 없이 안정적으로 배치
- `screen2-confirm-btn::after`
  - 보조 장식선을 연한 핑크 타원 테두리로 변경 (`border` 전체 적용)
  - 위치를 `left/right 3.6%`, `top/bottom 11%`로 조정
  - `inset` 하이라이트를 추가해 시안의 레이어감에 가깝게 정리
- 결과: 모서리 겹침/교차 아티팩트 제거, 버튼 라인이 더 단정한 형태로 렌더링

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 하트 위치(좌우 여백)와 검은선 굵기(2px/3px) 최종 미세조정

## 2026-04-13 추가 로그 (화면2 확인 버튼 SVG 전환)

### 결정사항

- 화면2 확인 버튼은 CSS 가상요소 합성 방식을 중단하고 SVG 기반으로 교체

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `screen2-confirm-btn` 내부를 인라인 SVG로 변경
  - 버튼 외곽/내곽 라인, 내부 검은 타원선, 좌우 하트를 SVG에서 직접 렌더링
  - 텍스트 `확인`은 기존처럼 HTML 레이어(`screen2-confirm-label`) 유지
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - 기존 `::before`, `::after`, 하트 관련 CSS 제거
  - SVG 전용 레이아웃 클래스(`.screen2-confirm-svg`) 추가
  - 버튼 상호작용(hover/active/focus-visible)만 남겨 단순화

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 SVG 좌우 하트 위치/내부 검은선 굵기 미세조정

## 2026-04-13 추가 로그 (가져온 확인 버튼 SVG 파일 연결)

### 결정사항

- 화면2 확인 버튼은 로컬 생성 SVG 대신 디자이너 제공 파일(`public/ui/buttons/confirm-button.svg`)을 직접 사용

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 인라인 SVG 마크업 제거
  - `next/image`의 `Image` 컴포넌트로 `/ui/buttons/confirm-button.svg` 렌더링하도록 변경
  - 버튼 접근성을 위해 `aria-label="확인"` 유지
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen2-confirm-svg`를 파일 기반 SVG 렌더에 맞게 유지(`object-fit: contain`)

### 영향 파일

- [public/ui/buttons/confirm-button.svg](/Users/jeongin/ssu-simulation/public/ui/buttons/confirm-button.svg)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 버튼 크기(clamp 값)와 vertical 정렬 위치 미세조정

## 2026-04-13 추가 로그 (엔딩2 화면 가독성 문제 해결)

### 결정사항

- 엔딩2(`screen10_reality`)는 항상 밝은 배경에서 검은 텍스트로 표시되도록 고정

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `screen10_reality` 섹션에 배경색 `bg-[#e6e6e6]` 적용
  - 엔딩 문구 컨테이너의 반응형 글자 크기/줄간격을 시안 톤으로 조정
  - `크레딧 보기` 버튼 크기/테두리 굵기/타이포를 시안에 맞게 상향 조정
- 결과: 다크 배경 위 검은 글자 문제(가독성 저하) 제거

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 문장 줄바꿈 위치와 버튼 y축 위치 미세조정

## 2026-04-14 추가 로그 (챕터 교수 대사 한글 조합형 타이핑 효과 적용)

### 결정사항

- 챕터 화면에서 교수 대사는 한 번에 표시하지 않고 타이핑 애니메이션으로 출력
- 한글은 조합 과정을 보이도록 단계 출력 적용
  - 예: `안` -> `ㅇ`, `아`, `안`
  - 예: `안녕` -> `ㅇ`, `아`, `안`, `안ㄴ`, `안녀`, `안녕`

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `useEffect` 추가: `activeProfessorLine` 변경 시 프레임 단위 타이핑 재생
  - `buildHangulTypingFrames` 헬퍼 추가: 한글 음절(초성/중성/종성) 기반 조합형 출력 프레임 생성
  - `typedProfessorLine` 상태 추가 후 챕터 대사 렌더를 해당 상태로 전환
- 결과: 챕터 진입/선택지 반응 대사 모두 타이핑 효과로 표시됨

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 타이핑 속도(현재 52ms/frame) 사용자 체감 기준으로 추가 미세조정 가능

## 2026-04-14 추가 로그 (화면1/2/3 배경 이미지 webp 교체)

### 결정사항

- 화면1은 `screen1-cover.webp` 사용
- 화면2/3은 `pre-game-bg.webp` 공용 사용

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `mainCoverImageUrl` 경로를 `/backgrounds/screen1-cover.webp`로 변경
  - `preGameBackgroundImageUrl` 경로를 `/backgrounds/pre-game-bg.webp`로 변경
- 결과: 화면1/2/3 배경이 업로드한 webp 파일로 반영됨

### 영향 파일

- [public/backgrounds/screen1-cover.webp](/Users/jeongin/ssu-simulation/public/backgrounds/screen1-cover.webp)
- [public/backgrounds/pre-game-bg.webp](/Users/jeongin/ssu-simulation/public/backgrounds/pre-game-bg.webp)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 화면에서 배경 크롭(모바일/데스크톱) 시안 대비 위치 미세조정 필요 시 `background-position` 값 조정

## 2026-04-14 추가 로그 (화면1 배경 잘림 완화 레이어 구조 적용)

### 결정사항

- 화면1 배경은 단일 `cover` 방식 대신, `contain` 전면 + 블러 `cover` 후면 구조로 변경
- 목적: 모바일/데스크톱 비율 차이에서 메인 이미지 잘림 최소화

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 배경 레이어를 5단계로 분리
  - 베이스 단색 레이어 추가
  - 후면: `mainCoverImageUrl`를 `cover + blur`로 깔아 빈 공간 자연스럽게 채움
  - 전면: `mainCoverImageUrl`를 `background-size: contain`으로 전체 이미지 노출
  - 상단: 기존 방사/선형 그라데이션 오버레이 유지
- 결과: 기기 비율이 달라도 화면1 메인 배경 잘림이 크게 완화됨

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 모바일에서 전면 이미지 위치를 더 위/아래로 미세 조정 필요 시 `background-position` 퍼센트 조절

## 2026-04-14 추가 로그 (화면1 풀/반 화면 글자 크기 편차 완화)

### 결정사항

- 화면1 제목/서브텍스트의 `vw` 의존도를 낮추고 최대 크기 상한을 줄여, 창 너비 변화 시 과도한 확대를 방지

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 제목 컨테이너 `max-width`를 `1300px -> 1120px`로 조정
  - 제목 글자 크기 `clamp(56px, 8.2vw, 150px) -> clamp(42px, 6.6vw, 110px)`
  - 안내 문구 글자 크기 `clamp(26px, 2.9vw, 50px) -> clamp(18px, 2.2vw, 34px)`
  - 제목 줄간격을 `0.98 -> 1.01`로 완만하게 조정
- 결과: 컴퓨터 전체화면에서 텍스트가 과도하게 커져 화면을 가리는 문제 완화

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 대비 제목 위치(하단 offset) 필요 시 `py`/`margin-top` 미세조정

## 2026-04-14 추가 로그 (화면2 확인 버튼 검은 타원선 컴포넌트화)

### 결정사항

- 화면2 확인 버튼의 검은 타원선 2개를 CSS 가상요소(`::before`, `::after`) 대신 DOM 컴포넌트(`span`)로 전환

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 버튼 내부에 선 전용 컴포넌트 2개 추가
  - `screen2-confirm-line-vertical`
  - `screen2-confirm-line-horizontal`
  - 레이어 순서: 버튼 배경 -> 선 컴포넌트 -> 하트/글자
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - 기존 `screen2-confirm-btn::before`, `screen2-confirm-btn::after` 제거
  - 공통 선 클래스 `.screen2-confirm-line` + 방향별 클래스 2개로 분리

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 필요 시 선 굵기(3px) 및 inset 비율(0/5/15%)을 시안 기준으로 추가 미세조정

## 2026-04-14 추가 로그 (화면2 확인 버튼 하트 좌표 퍼센트 고정)

### 결정사항

- 화면2 확인 버튼의 좌우 하트는 버튼 기준 좌표 `5%`, `95%` 지점에 배치

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - 하트 공통 transform을 `translateY(-50%)` -> `translate(-50%, -50%)`로 변경해 좌표 중심 정렬 적용
  - 좌측 하트: `left: 5%`
  - 우측 하트: `left: 95%`
- 결과: 하트 중심점이 버튼 너비 기준 5%/95%에 고정됨

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안 기준 하트 크기/외곽선 굵기 추가 미세조정

## 2026-04-14 추가 로그 (화면2 버튼 선 컴포넌트 내부 연핑크 채움)

### 결정사항

- 화면2 확인 버튼의 선 컴포넌트 2개 내부를 아주 연한 핑크색으로 채움

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen2-confirm-line-vertical`에 `background: rgba(255, 238, 247, 0.38)` 적용
  - `.screen2-confirm-line-horizontal`에 `background: rgba(255, 238, 247, 0.38)` 적용
- 결과: 두 선 컴포넌트 내부가 연한 핑크 톤으로 채워져 시안 질감에 가까워짐

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안 비교 후 채움 농도(alpha) 0.30~0.45 범위 미세조정 가능

## 2026-04-14 추가 로그 (화면2 버튼 선 컴포넌트 내부 불투명 처리)

### 결정사항

- 화면2 확인 버튼 선 컴포넌트 2개의 내부 채움은 반투명 대신 불투명으로 고정

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen2-confirm-line-vertical` 배경
    - `rgba(255, 238, 247, 0.38)` -> `rgb(255, 238, 247)`
  - `.screen2-confirm-line-horizontal` 배경
    - `rgba(255, 238, 247, 0.38)` -> `rgb(255, 238, 247)`
- 결과: 선 컴포넌트 내부가 완전 불투명 연핑크로 렌더링됨

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안과 비교해 연핑크 명도 자체(색상값) 미세조정 가능

## 2026-04-14 추가 로그 (화면2 확인 버튼 시안 근접 미세조정)

### 결정사항

- 화면2 확인 버튼을 시안 톤에 맞추기 위해 색/선 굵기/하트 스케일을 한 번에 조정

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - 버튼 본체 색감을 `크림 -> 핑크` 그라데이션으로 변경
  - 바깥 링/그림자 명암을 완화해 덜 딱딱하게 조정
  - 상단 광택 레이어(`.screen2-confirm-btn::before`) 추가
  - 선 컴포넌트 2개 내부를 동일 그라데이션으로 통일
  - 검은 타원선 굵기 `3px -> 2px`, 색 농도 완화
  - 하트 크기 축소 및 외곽선 농도 완화
  - 버튼 텍스트 최대 크기 축소(풀화면 과대 느낌 완화)
- 결과: 기존 대비 시안의 부드러운 핑크 질감/광택/선 강도에 더 근접

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 하트 라인 두께와 내부 선 inset(5%/15%)을 시안 픽셀 기준으로 마지막 미세조정

## 2026-04-14 추가 로그 (화면2 버튼 내부 2컴포넌트 일체감/그라데이션 강화)

### 결정사항

- 내부 선 컴포넌트 2개가 분리되어 보이지 않고 하나의 내부 패널처럼 보이도록 톤을 통일
- 버튼 본체와 내부 패널의 색 대비를 더 뚜렷하게 조정

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - 버튼 본체 배경을 더 진한 핑크 계열로 조정
  - 내부 하이라이트(`.screen2-confirm-btn::before`) 위치/농도 미세 조정
  - 내부 2컴포넌트(`vertical`, `horizontal`)에 동일 그라데이션 적용
  - 내부 2컴포넌트 보더 색/농도를 통일하여 연결감 강화
  - 내부 2컴포넌트에 동일한 inset 하이라이트를 넣어 한 덩어리 질감 부여
  - horizontal inset을 `5% -> 4.8%`로 소폭 조정해 접합부 완화
- 결과: 내부 두 컴포넌트가 시각적으로 하나의 패널처럼 보이면서 버튼 본체와 명확히 구분됨

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안 대비 코너 접합부(노치) 형태가 더 필요하면 `top/bottom`과 `left/right` 비율을 픽셀 단위로 추가 튜닝

## 2026-04-14 추가 로그 (화면2 버튼 내부 2컴포넌트 검은 외곽선 제거)

### 결정사항

- 화면2 확인 버튼 내부 2컴포넌트(세로/가로)의 검은 외곽선을 모두 제거

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen2-confirm-line-vertical`의 좌우 보더 삭제
  - `.screen2-confirm-line-horizontal`의 상하 보더 삭제
- 결과: 내부 패널은 그라데이션 면으로만 표현되고 검은 라인은 사라짐

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 필요 시 내부 패널 경계 표현을 연한 톤 보더(비검은색)로 대체 가능

## 2026-04-14 추가 로그 (화면2 확인 버튼 광택 레이어 추가)

### 결정사항

- 화면2 확인 버튼에 유리광 느낌을 주기 위해 광택 레이어 1개 추가

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 버튼 내부에 `.screen2-confirm-gloss` 컴포넌트 추가
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen2-confirm-gloss` 스타일 추가
  - 상단 선형 하이라이트 + 좌측 상단 타원 하이라이트를 중첩해 광택 표현
  - `mix-blend-mode: screen` 적용
  - 광택 클리핑을 위해 버튼에 `overflow: hidden` 추가
  - 글자/하트 z-index를 상향(`5`)하여 광택 레이어 위에 유지

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 광택 강도가 과하면 opacity 값(0.52/0.32 등) 소폭 하향 조정 가능

## 2026-04-14 추가 로그 (화면2 문구 위치 변경)

### 결정사항

- 화면2의 `이름은 최대 3자까지 가능합니다.` 문구를 상단 안내 텍스트에서 이름 입력칸 placeholder 위치로 이동

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 제목 아래 안내문(`이름은 최대 3자까지 가능합니다.`) 블록 제거
  - 이름 입력 input의 placeholder를 `이름은 최대 3자까지 가능합니다.`로 변경
- 결과: 요청대로 해당 문구가 `이름 입력 (미입력 시 김멋사)` 자리(입력칸 placeholder 위치)에 표시됨

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 필요 시 placeholder 폰트 크기/색 농도를 시안 기준으로 추가 조정 가능

## 2026-04-14 추가 로그 (화면3 요소4 추가/문구 위치 이동/만들기 버튼 동일화/생성 예시 표시)

### 결정사항

- 화면3 우측 요소 입력칸을 `요소1~요소3`에서 `요소1~요소4`로 확장
- 요구사항 예시 문구(`ex) ...`)를 텍스트 라인에서 textarea placeholder 위치로 이동
- `만들기` 버튼은 화면2 확인 버튼과 동일 디자인으로 통일
- 생성 완료 시 화면3에서 생성 이미지 예시를 즉시 표시

### 구현/수정 내용

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
  - `ProfessorFormState`에 `feature4` 추가
  - `professorFeatureSuggestions`에 `feature4` 옵션 추가
  - `resolveProfessorForGeneration`에 `feature4` fallback 처리 추가
  - `buildProfessorSummary`/`buildIllustrationPrompt`에 `feature4` 반영
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `initialProfessorState`에 `feature4` 필드 추가
  - 화면3 우측 입력칸 `요소4` + datalist(`feature4-options`) 추가
  - `ex) ...` 안내 문구 라인 제거
  - textarea placeholder를 `ex) ...` 문구로 변경
  - `만들기` 버튼을 `screen2-confirm-btn` 구조(광택/라인/하트/라벨)로 교체
  - `generatedImageUrl` 존재 시 `생성 예시 이미지` 프리뷰 카드 추가

### 영향 파일

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안과 1:1 매칭을 위해 화면3 `만들기` 버튼 크기(가로폭/폰트)만 개별 오버라이드로 미세조정 가능

## 2026-04-14 추가 로그 (화면3 만들기 버튼 크기 분리 적용)

### 결정사항

- 화면3 `만들기` 버튼은 화면2 디자인(장식/레이어)만 공유하고, 크기는 기존 화면3 버튼 크기로 유지

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `만들기` 버튼 클래스에 `screen3-create-btn` 추가
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen3-create-btn` 신규 추가
  - `min-width/min-height` 해제
  - `padding: 0.75rem 4rem` (기존 `py-3 px-16` 크기감)
  - `font-size: clamp(44px, 5vw, 72px)` (기존 만들기 버튼 폰트 크기감)
- 결과: 화면2 스타일은 유지하면서 화면3 `만들기` 버튼 크기만 기존 기준으로 분리됨

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 시안 기준으로 필요 시 `screen3-create-btn` 너비/폰트 상한만 추가 미세조정

## 2026-04-14 추가 로그 (화면3 요소1~4 라벨 줄바꿈 방지)

### 결정사항

- 화면3 우측 `요소1~요소4` 라벨은 항상 한 줄로 표시

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 요소 라벨 그리드 폭을 `96px -> 132px`로 확대
  - 라벨에 `whitespace-nowrap` 추가
- 결과: `요소1~4`가 2줄로 꺾이지 않고 한 줄 유지

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 필요 시 화면3 전체 비율에 맞춰 라벨 폰트 크기(현재 44px)도 추가 미세조정 가능

## 2026-04-14 추가 로그 (화면3 만들기 버튼 라벨 잘림 수정)

### 결정사항

- 화면3 `만들기` 버튼은 flex 레이아웃에서 축소되지 않도록 고정

### 구현/수정 내용

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.screen3-create-btn`에 `flex-shrink: 0` 추가
  - 최소 너비/높이 지정(`min-width`, `min-height`)으로 버튼 형태 유지
  - `white-space: nowrap` 추가로 라벨 줄바꿈/잘림 방지
- 결과: `만들기` 텍스트가 가운데에서 잘려 보이던 문제 완화

### 영향 파일

- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 필요 시 시안 대비 화면3 만들기 버튼 폭/글자크기 상한 추가 미세조정

## 2026-04-14 추가 로그 (스토리 라인 v2 구조 변경: 6에피소드 고정 + 점심/밤 분기)

### 결정사항

- 챕터 랜덤 선별 구조를 중단하고, `시간 순서 6에피소드 고정` 구조로 전환
- 에피소드 순서: `등교 -> 아침 강의실 -> 점심식사(분기) -> 오후 도서관 -> 간단한 저녁식사 -> 밤(분기)`
- 엔딩 등급 체계를 `A+ / B+ / C+ / F` 4단계로 변경
- 세부 서브엔딩은 추후 확장 가능하도록 메이저 등급 중심으로 우선 운영
- 세션 시작 API 호출 시 `스토리 전체를 커스텀 교수 말투에 맞춰 통일`하도록 프롬프트 제약 강화

### 구현/수정 내용

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
  - ChapterId를 시간대 기반 에피소드 + 분기 에피소드(점심 3종, 밤 3종)로 재구성
  - 기본 6에피소드 루트(`pickSixChaptersForRun`)를 고정 시퀀스로 변경
  - 분기 매핑 추가
    - `morningLunchBranchByChoice` (아침 선택 -> 점심 경로)
    - `dinnerNightBranchByChoice` (저녁 선택 -> 밤 경로)
  - session-pack 생성용 전체 ID(`sessionPackEpisodeIds`) 추가
  - 아침 강의실/점심식사(학생식당, 화장실 변기칸 포함) fallback 대사 반영
  - 엔딩 메타/랭크를 5단계에서 4단계(A+/B+/C+/F)로 변경
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 스토리 시작 시 세션팩 요청 대상 ID를 `전체 분기 포함 목록`으로 변경
  - 에피소드 선택 시 분기 라우트 동적 변경
    - `MORNING_CLASSROOM` 선택 후 `selectedChapterIds[2]` 점심 경로 업데이트
    - `LIGHT_DINNER` 선택 후 `selectedChapterIds[5]` 밤 경로 업데이트
  - 챕터 표기를 `CHAPTER` -> `EPISODE`로 변경
  - 엔딩 배경을 고정 ID 대신 `실제 마지막 에피소드 경로` 기반으로 표시
- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
  - endingPolish 키를 `ENDING_A_PLUS / ENDING_B_PLUS / ENDING_C_PLUS / ENDING_F`로 교체
  - 프롬프트에 `전체 에피소드 말투 통일` 및 `분기 타임라인 자연스러운 연결` 제약 추가
  - chapterIds 수집 상한을 6에서 24로 완화(분기 일괄 생성 대응)

### 영향 파일

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 점심식사 `학교 앞 맛집` 상세 시나리오 확정본 반영
- 밤 분기 3개 상세 시나리오(대사/선지) 확정본 반영
- A+/B+/C+/F 내부 서브엔딩(세부 분기 규칙) 확정 후 데이터 스키마 확장

## 2026-04-14 추가 로그 (에피소드 화면 UI 개편: 진행도 제거 + 중앙 선택 오버레이)

### 결정사항

- 에피소드 화면 우측 상단 진행도 UI는 제거
- 선택지 UI는 배경 위에 중앙 오버레이 버튼 형태로 변경
- 선택지 노출 시 기존 배경은 약한 블러/딤 처리
- 하단 대사창은 노트형(상단 톱니 패턴) 스타일로 개편

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 우측 상단 진행도 바 제거
  - 선택지 노출 타이밍(`selectedChoiceIndex === null`)에 중앙 오버레이 버튼 3개 렌더링
  - 선택지 오버레이와 대사창 레이어 분리 (`z-index` 정리)
  - 하단 대사창 구조를 `perforation + content + action` 구조로 재구성
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.episode-choice-dim`, `.episode-choice-btn` 신규 추가
  - `.episode-dialog-*` 스타일(노트형 대사창, 화자 라벨, 액션 영역) 신규 추가

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 시안 픽셀 기준으로 대사창 상단 톱니 패턴 간격/두께 미세조정
- 선택지 버튼 높이/간격(모바일, 반화면) 최종 튜닝

## 2026-04-14 추가 로그 (에피소드 배경 이미지 실파일 연결)

### 결정사항

- 업로드된 에피소드 배경 `.webp` 파일을 각 에피소드 ID에 1:1 매핑
- 점심/밤 분기 배경도 각각 독립 이미지로 적용

### 구현/수정 내용

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
  - `chapterInfoMap`의 `backdrop` 경로를 실제 파일로 교체
  - 적용 경로
    - `COMMUTE_CAMPUS` -> `/backgrounds/episodes/commute-campus.webp`
    - `MORNING_CLASSROOM` -> `/backgrounds/episodes/morning-classroom.webp`
    - `LUNCH_STUDENT_CAFETERIA` -> `/backgrounds/episodes/lunch-student-cafeteria.webp`
    - `LUNCH_OFFCAMPUS_RESTAURANT` -> `/backgrounds/episodes/lunch-offcampus-restaurant.webp`
    - `LUNCH_RESTROOM_STALL` -> `/backgrounds/episodes/lunch-restroom-stall.webp`
    - `AFTERNOON_LIBRARY` -> `/backgrounds/episodes/afternoon-library.webp`
    - `LIGHT_DINNER` -> `/backgrounds/episodes/light-dinner.webp`
    - `NIGHT_SELF_STUDY` -> `/backgrounds/episodes/night-classroom.webp`
    - `NIGHT_CAMPUS_WALK` -> `/backgrounds/episodes/night-bench.webp`
    - `NIGHT_LAB_VISIT` -> `/backgrounds/episodes/night-lab.webp`
  - 미사용 상수 `DEFAULT_BACKDROP` 제거

### 영향 파일

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 남은 TODO

- 실제 플레이에서 각 분기 진입 시 배경 전환 타이밍/위치(`background-position`) 미세조정

## 2026-04-14 추가 로그 (대사 완료 후 선택지 노출 + 에피소드 연핑크 톤)

### 결정사항

- 선택지는 대사가 모두 출력된 뒤에만 노출
- 선택지 노출 시에만 화면을 살짝 어둡게 처리
- 화면1~3의 분위기와 자연스럽게 이어지도록 에피소드 화면에 아주 약한 연핑크 틴트 추가

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `isProfessorLineTyping`, `shouldShowChoiceOverlay` 상태 파생값 추가
  - 선택지 오버레이/딤 레이어 렌더 조건을 `selectedChoiceIndex === null`에서 `shouldShowChoiceOverlay`로 변경
  - 에피소드 배경 오버레이 색조를 청색 계열에서 핑크 계열로 미세 조정
  - 연핑크 분위기 유지용 `episode-soft-pink-tint` 레이어 추가
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
  - `.episode-soft-pink-tint` 신규 추가
  - `.episode-choice-dim` 색상/블러값을 선택지 등장 연출에 맞게 조정
  - `.episode-choice-layer` 및 `@keyframes episode-choice-fade-in` 추가

### 영향 파일

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [src/app/globals.css](/Users/jeongin/ssu-simulation/src/app/globals.css)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 검증

- `npm run lint` 통과

## 2026-04-15 추가 로그 (교수 이미지 스타일: 3개 레퍼런스 통합 고정)

### 요청사항

- 일러스트디자인1/2/3 중 선택 방식이 아니라, 3개 레퍼런스 특징을 모두 합친 스타일을 내부 보정에 고정 적용

### 구현/수정 내용

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
  - `fusedIllustrationReferenceProfile` 추가: 기존 3개 스타일 키워드를 합성한 통합 프로필 정의
  - `professorSpriteStylePreset`를 통합 스타일 방향으로 보강
  - `professorReferenceFusionGuide` 추가: “3개 레퍼런스 통합” 지시문을 내부 공통 가이드로 정의
  - `buildProfessorSummary`에서 스타일 설명을 선택값 기반에서 통합 고정 프로필 기반으로 변경
  - `buildIllustrationPrompt`에서 스타일 선택 의존을 제거하고 통합 가이드/키워드를 항상 포함하도록 변경
- [src/app/api/generate-professor-image/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
  - 이미지 생성 서버 프롬프트 `styleGuideLine`에 통합 가이드(`professorReferenceFusionGuide`)를 추가해 서버 단계에서도 고정 반영

### 검증

- `npm run lint` 통과

## 2026-04-14 추가 로그 (선택지 오버레이 UI 강제 복구)

### 이슈

- 선택지 버튼이 중앙 오버레이 형태가 아닌 일반 텍스트처럼 보이는 렌더 깨짐 발생

### 조치

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 선택지 딤 레이어(`bg + backdrop-blur`)를 JSX에서 직접 지정
  - 선택지 버튼 스타일(배경/보더/그림자/폰트/hover)을 JSX 클래스에서 직접 지정
  - 커스텀 CSS 클래스 의존도를 줄여 환경별 렌더 편차를 제거

### 검증

- `npm run lint` 통과

## 2026-04-14 추가 로그 (노트형 대화창 강제 복구 2차)

### 이슈

- 하단 노트형 대화창이 일부 실행 환경에서 계속 보이지 않음

### 조치

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 노트형 대화창 스타일을 커스텀 CSS 클래스 의존에서 벗어나 JSX(Tailwind + inline style)로 직접 명시
  - 하단 고정 레이어(`fixed`, `z-[70]`)는 유지하고, 노트 헤더/본문/액션 영역의 배경/보더를 모두 명시적으로 지정

### 검증

- `npm run lint` 통과

## 2026-04-14 추가 로그 (에피소드 노트형 대사창 고정 복구)

### 이슈

- 특정 화면 높이/배경 조건에서 하단 노트형 대사창이 화면 아래로 밀려 보이지 않는 현상 발생

### 조치

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 대사창 컨테이너를 내부 `absolute` 배치에서 `viewport fixed` 배치로 전환
  - `pointer-events`를 분리해 하단 대사창은 항상 보이면서 버튼 클릭은 정상 동작하도록 조정

### 검증
- `npm run lint` 통과

## 2026-04-14 추가 로그 (BGM 컨트롤 기능 추가)

### 결정사항
- 게임의 현장감과 몰입감을 높이기 위해 BGM(배경음악) 기능을 도입함
- 브라우저 자동 재생 방지 정책을 고려하여 사용자가 수동으로 끄고 켤 수 있는 토글 버튼을 UI에 배치함
- 버튼 위치는 사용자 시선이 잘 닿으면서도 게임 플레이에 방해가 되지 않는 우측 상단으로 고정함

### 구현/수정 내용
- `MAIN_BGM_URL` 상수를 `game-data.ts`에 추가하여 음원 경로 관리
- `src/app/page.tsx` 내부에 `audio` 태그 및 `Volume` 아이콘을 활용한 토글 버튼 로직 설계

### 영향 파일
- src/lib/game-data.ts
- WORKLOG.md

### 남은 TODO
- `public/sounds/main-bgm.mp3` 경로에 실제 고품질 BGM 파일 배치
- `npm run lint` 통과

## 2026-04-14 추가 로그 (BGM 버튼 시인성 개선)

### 결정사항
- BGM 토글 버튼이 배경에 묻히지 않도록 불투명(Solid) 색상으로 변경함
- 버튼 레이어를 최상위(`z-[100]`)로 고정하여 모든 화면에서 가려지지 않게 함

### 구현/수정 내용
- `bg-white` 및 `bg-[#ffb8d5]`를 사용하여 선명한 버튼 디자인 적용
- 버튼 크기 및 아이콘 굵기를 상향 조정하여 시인성 확보

## 2026-04-15 추가 로그 (누끼 API 연동 + 교수 표정 3종 생성 파이프라인)

### 결정사항

- 기존 `Gemini 생성 + route 내부 sharp 누끼` 구조를 `Gemini 생성 + 외부 BG API(rembg)` 구조로 전환
- 보안/운영 안정성을 위해 브라우저가 BG API를 직접 호출하지 않고, Next.js 서버 라우트가 프록시/중계
- 교수 이미지 생성 플로우를 `기본 이미지 1장 + 표정 3장(미소/단호/당황)`으로 확장
- 표정 3장은 배치 누끼(`/remove-batch`)를 우선 사용해 호출 수를 최소화

### 구현/수정 내용

- [src/lib/bg-remove/server.ts](/Users/jeongin/ssu-simulation/src/lib/bg-remove/server.ts)
  - 신규 추가: BG API 전용 서버 유틸
  - 단일 누끼 함수 `removeBackgroundSingle` 구현 (`/remove`)
  - 배치 누끼 함수 `removeBackgroundBatch` 구현 (`/remove-batch?response_type=json`)
  - `BG_API_URL` 환경변수 강제 사용, 타임아웃/네트워크/비정상 응답 에러 처리 추가
- [src/app/api/generate-professor-image/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
  - 내부 sharp 누끼 로직 제거 후 BG API 유틸 기반으로 교체
  - 기본 교수 이미지 생성 -> 단일 누끼 적용
  - 누끼된 기본 이미지를 레퍼런스로 표정 3종 재생성
  - 표정 3종에 배치 누끼 적용 후 `expressionImageDataUrls` 반환
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - 표정 이미지 상태(`generatedExpressionImageUrls`) 추가
  - 이미지 생성 응답에서 표정 data URL 수신/저장
  - 선택지 반응 `emotion` 값에 따라 교수 스프라이트 자동 교체(미소/단호/당황 매핑)
  - 교수 생성 화면에 표정 3종 썸네일 미리보기 추가
- [README.md](/Users/jeongin/ssu-simulation/README.md)
  - `BG_API_URL`, `BG_API_TIMEOUT_MS` 환경변수 안내 추가

### 영향 파일

- [src/lib/bg-remove/server.ts](/Users/jeongin/ssu-simulation/src/lib/bg-remove/server.ts)
- [src/app/api/generate-professor-image/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
- [README.md](/Users/jeongin/ssu-simulation/README.md)
- [WORKLOG.md](/Users/jeongin/ssu-simulation/WORKLOG.md)

### 검증

- `npm run lint` 통과

### 남은 TODO

- `BG_API_URL`이 Quick Tunnel 주소일 경우 재시작 시 주소 변경 대응(고정 도메인/Named Tunnel 전환)
- 표정 매핑 규칙을 챕터/분기 기반으로 세분화할지 기획 확정
- 표정 생성 실패 시 기본 이미지만으로 플레이하는 UX 문구/상태 정리

## 2026-04-15 추가 로그 (스토리 기반 표정 큐 적용 + 세션 선생성 플로우 전환)

### 결정사항

- 기존 `emotion -> 고정 표정(미소/단호/당황)` 매핑을 제거하고, 세션 생성 시점에 `expressionSet(3종)` + `spriteCues`를 함께 생성해 실제 챕터 구간에 맞춰 표정을 교체하도록 전환
- `만들기` 버튼 플로우를 `세션팩 생성 -> 해당 세션의 표정셋으로 교수 이미지/누끼 생성 -> 게임 진입` 순서로 변경
- 표정 이미지가 일부 실패해도 `spriteCues` 키에 대응되는 이미지가 없으면 기본 이미지로 자동 fallback

### 구현/수정 내용

- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
  - `expressionSet`(EXP_1~3)과 `spriteCues`(chapter별 대사/선택지 반응 키) 반환 구조 확장
  - 응답 누락/이상 시 fallback `expressionSet`/`spriteCues` 자동 생성 로직 추가
  - 프롬프트에 “표정 3개 선정 근거 + 챕터별 cue 작성” 제약을 명시
- [src/app/api/generate-professor-image/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
  - 요청 payload로 `expressionSet` 수신 가능하도록 확장
  - 세션에서 전달된 표정 정의를 기준으로 표정 3종 생성 + 배치 누끼 후 `expressionImageDataUrls` 반환
  - 생성 결과에 `expressionSet`, `expressionPromptUsed` 포함
- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `sessionExpressionSet`, `sessionSpriteCues` 상태 추가
  - 교수 스프라이트 선택 로직을 감정 기반에서 `spriteCues` 기반으로 교체
    - 선택 전: `dialogueExpressionKey`
    - 선택 후 반응: `choiceReactionExpressionKeys[index]`
  - `makeProfessorAndStartStory`를 세션 선생성 방식으로 재구성해 세션 표정셋을 이미지 생성에 전달
  - 표정 썸네일 미리보기를 고정 키가 아닌 동적 `expressionSet` 기반으로 렌더링
- [src/lib/bg-remove/server.ts](/Users/jeongin/ssu-simulation/src/lib/bg-remove/server.ts)
  - `BG_API_TIMEOUT_MS` 환경변수를 기본 타임아웃으로 반영하도록 보강

### 검증

- `npm run lint` 통과

## 2026-04-15 추가 로그 (세션 JSON 파싱 실패 안정화)

### 이슈

- 교수 생성 버튼 클릭 시 간헐적으로 `세션 생성 실패로 기본 데이터로 진행합니다: Unterminated string in JSON ...` 메시지 발생
- 원인: `generate-session-pack`에서 Gemini 응답 JSON이 일부 케이스에서 완전한 JSON 형식을 지키지 못해 `JSON.parse` 실패

### 조치

- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
  - `responseJsonSchema`를 추가해 응답 형식 준수 강제
  - `temperature`를 `0.8 -> 0.4`로 낮춰 형식 불안정성 완화
  - `parseSessionPackJson` 추가:
    - 원문 파싱 실패 시 code fence 제거/JSON 블록 추출 후 재시도

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (사용자 제공 전체 에피소드 스토리 반영)

### 결정사항

- 사용자 제공 시나리오 흐름(등교 -> 아침 강의실 -> 점심 3분기 -> 도서관 -> 저녁 3분기 -> 밤 3분기 -> 엔딩)을 기본 스토리 데이터에 반영
- 저녁 선택지 순서를 원문에 맞춰 `집 / 강의실 / 학교 벤치`로 유지

### 구현/수정 내용

- [src/lib/game-data.ts](/Users/jeongin/ssu-simulation/src/lib/game-data.ts)
  - `chapterInfoMap`의 밤 에피소드 메타 갱신
    - `NIGHT_SELF_STUDY`를 도서관 기반에서 `소등된 강의실` 흐름으로 재정의
    - `NIGHT_LAB_VISIT`를 연구실+빗속 클라이맥스 흐름으로 보강
  - `dinnerNightBranchByChoice` 매핑 변경
    - `0 -> NIGHT_LAB_VISIT` (집)
    - `1 -> NIGHT_SELF_STUDY` (강의실)
    - `2 -> NIGHT_CAMPUS_WALK` (학교 벤치)
  - `chapterFallbackDialogues` 전체를 사용자 시나리오 기반으로 교체
  - `endingMeta`를 A+/B+/C+/F 제공 엔딩 톤으로 교체
  - `finalRealityLine`을 `"내일 시험, 꼭 잘 보자."`로 변경

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (챕터 내 다중 선택 스텝 구조 전환)

### 결정사항

- 기존 `챕터당 선택 1회` 진행 방식에서, 사용자 제공 시나리오 흐름에 맞춰 `챕터 내 다중 선택(step)` 방식으로 전환
- 챕터 분기 로직은 동일하게 유지하되, 분기 트리거를 챕터의 특정 스텝 인덱스에서만 동작하도록 명확화
  - 점심 분기: `MORNING_CLASSROOM` 3번째 스텝
  - 밤 분기: `LIGHT_DINNER` 1번째 스텝

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `ChapterStep` 기반 `chapterStepScripts`를 실제 런타임 진행 로직과 연결
  - 상태 추가: `chapterStepIndex`
  - 현재 진행 데이터 계산을 `chapter -> step -> choice` 구조로 변경
    - `currentChapterSteps`
    - `currentDialogue`
    - `currentChoiceList`
    - `hasCurrentChoices`
    - `canAdvanceCurrentStep`
  - `chooseOption` 수정
    - 현재 스텝 선택지만 처리하도록 검증 강화
    - 분기 처리 시 스텝 인덱스 조건 추가
  - `moveNextChapter` 수정
    - 선택 완료 후 바로 다음 챕터로 가지 않고, 같은 챕터의 다음 스텝으로 우선 이동
    - 마지막 스텝 종료 시에만 다음 챕터로 이동
  - UI 수정
    - 헤더에 `STEP x / y` 표기 추가
    - 선택 오버레이를 현재 스텝 선택지 기준으로 렌더링
    - 선택지가 없는 스텝에서도 `다음` 버튼으로 진행 가능
  - 초기화/시작 시 `chapterStepIndex` 리셋 처리 추가

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (하트 호감도 게이지 UI/UX 복구)

### 결정사항

- 충돌 과정에서 누락된 하트 스타일 호감도 게이지를 기존 의도대로 복구
- 단순 막대 UI 대신 하트 아이콘/글로우 바/노브/+N 애니메이션/파티클 캔버스 효과를 다시 적용

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `heartParticle` 임포트 및 파티클용 `canvas`/`image`/`requestAnimationFrame` 레퍼런스 추가
  - `affinityDelta` 상태 및 타이머(`+N` 표시 후 자동 소멸) 추가
  - 선택지 클릭 시 획득 점수만큼 `+N` 애니메이션과 하트 파티클 버스트 실행
  - 상단 호감도 UI를 하트 스타일 컴포넌트로 교체
    - 하트 아이콘 (`/ui/heart-gauge.svg`)
    - 글로우 게이지 바
    - 노브 이동
    - 파티클 캔버스 오버레이
  - 노브 위치가 0%/100%에서 튀지 않도록 범위 클램프 적용

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (세션 JSON 파싱 실패 자동 복구 강화)

### 이슈

- 로컬 실행 중 간헐적으로 `Expected ',' or ']' after array element in JSON ...` 오류가 발생하며 세션 생성이 fallback으로 전환됨
- 원인: Gemini가 드물게 JSON 스키마를 요청해도 문법이 깨진 JSON을 반환

### 구현/수정 내용

- [src/app/api/generate-session-pack/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-session-pack/route.ts)
  - 세션 생성 공통 설정 `SESSION_GENERATION_CONFIG`로 통합
  - `parseSessionPackJson` 후보 문자열 전처리 강화
    - code fence 제거 외에 smart quote/nbsp/trailing comma 보정 추가
  - 최초 파싱 실패 시 자동 복구 단계 추가
    - 깨진 원문 + 파싱 에러 메시지를 Gemini에 다시 보내 JSON 문법만 보정하도록 요청
    - 보정본 재파싱 시도 후 정상 데이터 사용
  - 최종 실패 시 사용자 메시지를 내부 파싱 상세 대신 친화적 문구로 정리

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (호감도 게이지 가시성 보정)

### 이슈

- 선택 시 `+xx` 애니메이션은 보이지만, 게이지 채움 바가 잘 보이지 않는 케이스 발생

### 구현/수정 내용

- [src/app/page.tsx](/Users/jeongin/ssu-simulation/src/app/page.tsx)
  - `visibleAffinityPercent` 도입
    - 점수 증가 후 초기 구간에서도 채움 바가 확실히 보이도록 최소 가시 폭(6%) 적용
  - 채움 바에 인라인 그라디언트/글로우 스타일을 추가해 스타일 누락 상황에서도 시인성 유지
  - 노브 위치를 `visibleAffinityPercent` 기준으로 동기화

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (교수 이미지 생성 500 원인 확인 및 사전 차단)

### 이슈

- 로컬에서 `POST /api/generate-professor-image 500` 발생
- 원인 확인 결과, `.env.local`에 `BG_API_URL`이 없어 누끼 단계에서 실패
  - 기존 흐름은 Gemini 이미지 생성 이후 누끼 단계에서 실패가 드러나 응답까지 시간이 길어짐

### 구현/수정 내용

- [src/app/api/generate-professor-image/route.ts](/Users/jeongin/ssu-simulation/src/app/api/generate-professor-image/route.ts)
  - 요청 초기에 `BG_API_URL` 존재 여부를 확인하도록 보강
  - 누락 시 즉시 500과 안내 메시지 반환
  - 불필요한 이미지 생성 호출/대기 시간/비용을 줄이도록 실패를 앞단에서 차단

### 검증

- `npm run lint` 통과
- `npm run build` 통과

## 2026-04-15 추가 로그 (로컬 env 누락 수정)

### 이슈

- `/api/generate-professor-image` 500(빠른 실패) 발생
- 원인: `.env.local`에 `BG_API_URL` 키 자체가 누락되어 있었음

### 구현/수정 내용

- [.env.local](/Users/jeongin/ssu-simulation/.env.local)
  - `BG_API_URL=https://angela-authentic-gauge-likes.trycloudflare.com` 추가
  - `BG_API_TIMEOUT_MS=45000` 추가

### 후속 조치

- Next.js 개발 서버 재시작 후 적용 확인 필요 (`.env.local`은 서버 시작 시 로드됨)
