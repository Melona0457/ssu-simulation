export const initialPlayerState: PlayerFormState = {
  name: "",
  gender: "남자",
};

export const initialProfessorState: ProfessorFormState = {
  name: "",
  gender: "남자",
  age: "",
  speakingStyle: "TONE_30S",
  illustrationStyle: "DESIGN_1_ROMANCE_FANTASY",
  feature1: "",
  feature2: "",
  feature3: "",
  feature4: "",
  feature5: "",
  feature6: "",
  feature7: "",
  feature8: "",
  customPrompt: "",
};
export type GameScoreKey = "affinity" | "intellect";

export type DialogueEmotion =
  | "neutral"
  | "stern"
  | "teasing"
  | "awkward"
  | "warm"
  | "panic";

export type ChapterId =
  | "COMMUTE_CAMPUS"
  | "MORNING_CLASSROOM"
  | "LUNCH_STUDENT_CAFETERIA"
  | "LUNCH_OFFCAMPUS_RESTAURANT"
  | "LUNCH_RESTROOM_STALL"
  | "AFTERNOON_LIBRARY"
  | "LIGHT_DINNER"
  | "NIGHT_SELF_STUDY"
  | "NIGHT_CAMPUS_WALK"
  | "NIGHT_LAB_VISIT";

export type EndingRank = "ENDING_A_PLUS" | "ENDING_B_PLUS" | "ENDING_C_PLUS" | "ENDING_F";

export type IllustrationStyleKey =
  | "DESIGN_1_ROMANCE_FANTASY"
  | "DESIGN_2_CLEAN_CHARACTER_CARD"
  | "DESIGN_3_CAMPUS_VISUAL_NOVEL";

export type ProfessorGender =
  | "남자"
  | "여자"
  | "남성"
  | "여성"
  | "논바이너리"
  | "미정(중성 표현)";

export type PlayerGender = "남자" | "여자";

export type ProfessorFormState = {
  name: string;
  gender: ProfessorGender;
  age: string;
  speakingStyle: string;
  illustrationStyle: IllustrationStyleKey;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  feature5: string;
  feature6: string;
  feature7: string;
  feature8: string;
  customPrompt: string;
};

export type PlayerFormState = {
  name: string;
  gender: PlayerGender;
};

export type ChapterInfo = {
  id: ChapterId;
  title: string;
  location: string;
  scene: string;
  backdrop: string;
  sequenceGroup: 1 | 2 | 3 | 4 | 5 | 6;
  keywords: string[];
};

export type ChapterChoice = {
  text: string;
  preview: string;
  reaction: string;
  emotion: DialogueEmotion;
  effects: Record<GameScoreKey, number>;
};

export type ChapterDialogue = {
  dialogue: string;
  choices: ChapterChoice[];
};

export const playerGenderOptions: Array<{ label: string; value: PlayerGender }> = [
  { label: "남자", value: "남자" },
  { label: "여자", value: "여자" },
];

export const professorGenderOptions: Array<{ label: string; value: ProfessorGender }> = [
  { label: "남자", value: "남자" },
  { label: "여자", value: "여자" },
];

export type ProfessorAgeTone = "TONE_20S" | "TONE_30S" | "TONE_40S";

export const professorSpeakingStyleOptions: Array<{
  label: string;
  value: ProfessorAgeTone;
}> = [
  { label: "20대의 젊은 교수님", value: "TONE_20S" },
  { label: "30대의 중년 교수님", value: "TONE_30S" },
  { label: "40대의 꽃중년 교수님", value: "TONE_40S" },
];

export const illustrationStyleOptions: Array<{
  label: string;
  value: IllustrationStyleKey;
  description: string;
}> = [
  {
    label: "일러스트디자인1",
    value: "DESIGN_1_ROMANCE_FANTASY",
    description:
      "학원 로맨스 비주얼 노벨풍, 부드러운 셀채색, 밝은 캠퍼스 배경과 청춘 감성",
  },
  {
    label: "일러스트디자인2",
    value: "DESIGN_2_CLEAN_CHARACTER_CARD",
    description:
      "한국 웹툰풍 캐주얼 캐릭터 포스터, 밝은 파스텔 톤과 깔끔한 라인아트",
  },
  {
    label: "일러스트디자인3",
    value: "DESIGN_3_CAMPUS_VISUAL_NOVEL",
    description:
      "화려한 모바일 게임 키비주얼풍, 글로시 하이라이트와 상업 포스터 감성",
  },
];

const illustrationStyleProfiles: Record<
  IllustrationStyleKey,
  { name: string; keywords: string[] }
> = {
  DESIGN_1_ROMANCE_FANTASY: {
    name: "school romance visual novel CG mood",
    keywords: [
      "visual novel style school romance game CG",
      "beautiful youthful anime character with soft clean proportions",
      "clean line art with gentle cel shading",
      "bright spring campus background, blue sky, flower petals",
      "romantic youthful atmosphere for a polished commercial game screen",
    ],
  },
  DESIGN_2_CLEAN_CHARACTER_CARD: {
    name: "Korean webtoon casual character poster mood",
    keywords: [
      "Korean webtoon style character poster",
      "clean anime character proportions with youthful handsome readability",
      "bright pastel palette and smooth skin shading",
      "clean digital line art and casual mobile game poster composition",
      "cute friendly commercial illustration energy",
    ],
  },
  DESIGN_3_CAMPUS_VISUAL_NOVEL: {
    name: "mobile game event key visual mood",
    keywords: [
      "mobile game event key visual poster",
      "glamorous anime rendering with semi-realistic polish",
      "high saturation pink purple sky-blue palette",
      "glossy highlights and cinematic lighting",
      "romantic fantasy promotional artwork with high commercial impact",
    ],
  },
};

const fusedIllustrationReferenceProfile = {
  name: "fused visual novel, Korean webtoon, mobile event poster style",
  keywords: [
    ...illustrationStyleProfiles.DESIGN_1_ROMANCE_FANTASY.keywords,
    ...illustrationStyleProfiles.DESIGN_2_CLEAN_CHARACTER_CARD.keywords,
    ...illustrationStyleProfiles.DESIGN_3_CAMPUS_VISUAL_NOVEL.keywords,
    "purpose-first prompting for a dialogue-heavy commercial game illustration",
    "clean readable character silhouette suitable for visual novel UI overlays",
    "bright romantic mood without excessive realism or horror tone",
  ],
};

export type ProfessorFeatureSlot =
  | "feature1"
  | "feature2"
  | "feature3"
  | "feature4"
  | "feature5"
  | "feature6"
  | "feature7"
  | "feature8";

export const professorFeatureSuggestions: Record<ProfessorFeatureSlot, string[]> = {
  feature1: [
    "단정한 흑발 헤어",
    "가볍게 넘긴 포마드",
    "자연스러운 웨이브 단발",
    "깔끔한 묶음 머리",
    "새치 섞인 클래식 컷",
  ],
  feature2: [
    "차분한 눈매",
    "날카로운 눈매",
    "안경 너머 또렷한 눈",
    "부드러운 반달 눈매",
    "피곤하지만 집중된 눈빛",
  ],
  feature3: [
    "오똑한 콧날",
    "곧고 반듯한 코선",
    "섬세하게 정리된 코끝",
    "작지만 존재감 있는 코",
    "입체감 있는 콧대",
  ],
  feature4: [
    "선명한 턱선",
    "부드럽지만 정돈된 턱선",
    "단정하게 떨어지는 턱 라인",
    "살짝 각진 인상의 턱선",
    "세련된 브이라인 턱선",
  ],
  feature5: [
    "갸름한 얼굴형",
    "단정한 타원형 얼굴",
    "입체감 있는 얼굴 비율",
    "부드러운 계란형 얼굴",
    "도회적인 얼굴 윤곽",
  ],
  feature6: [
    "옅은 미소의 표정",
    "무심한 듯 담담한 표정",
    "차분하게 웃는 표정",
    "살짝 피곤하지만 다정한 표정",
    "냉정해 보이지만 부드러운 표정",
  ],
  feature7: [
    "또렷한 피부톤",
    "맑고 깨끗한 피부 표현",
    "차분하게 정돈된 피부톤",
    "은은한 혈색이 도는 피부",
    "부드러운 광택감의 피부톤",
  ],
  feature8: [
    "도회적인 전체 분위기",
    "지적인 연구자 분위기",
    "우아하고 단정한 인상",
    "캠퍼스 로맨스 비주얼노벨 감성",
    "세련되고 가까이하기 어려운 아우라",
  ],
};

const featureAxisDetectionPatterns: Record<ProfessorFeatureSlot, RegExp[]> = {
  feature1: [
    /헤어/gi,
    /머리/gi,
    /앞머리/gi,
    /단발/gi,
    /웨이브/gi,
    /흑발/gi,
    /금발/gi,
    /갈색 머리/gi,
    /장발/gi,
    /숏컷/gi,
    /포니테일/gi,
    /묶은 머리/gi,
  ],
  feature2: [
    /눈매/gi,
    /눈빛/gi,
    /쌍꺼풀/gi,
    /속눈썹/gi,
    /눈이/gi,
    /고양이상/gi,
    /강아지상/gi,
    /차가운 눈/gi,
    /부드러운 눈/gi,
  ],
  feature3: [/코/gi, /콧대/gi, /코끝/gi, /콧날/gi, /오똑한 코/gi, /작은 코/gi],
  feature4: [/턱선/gi, /턱 라인/gi, /턱이/gi, /브이라인/gi, /각진 턱/gi, /부드러운 턱/gi],
  feature5: [/얼굴형/gi, /얼굴 비율/gi, /타원형/gi, /계란형/gi, /얼굴 윤곽/gi, /광대/gi, /갸름/gi, /둥근 얼굴/gi],
  feature6: [
    /표정/gi,
    /미소/gi,
    /웃는/gi,
    /무표정/gi,
    /인상/gi,
    /도도한 표정/gi,
    /무심한 표정/gi,
    /피곤한 표정/gi,
    /다정한 표정/gi,
  ],
  feature7: [/피부톤/gi, /피부/gi, /혈색/gi, /창백/gi, /홍조/gi, /하얀 피부/gi, /맑은 피부/gi],
  feature8: [
    /분위기/gi,
    /아우라/gi,
    /느낌/gi,
    /무드/gi,
    /이미지/gi,
    /인상 전체/gi,
    /청순/gi,
    /냉미녀/gi,
    /도회적/gi,
    /지적/gi,
    /우아/gi,
    /세련/gi,
    /카리스마/gi,
    /다정한 분위기/gi,
  ],
};

function detectCoveredFeatureSlots(customPrompt: string) {
  const normalized = customPrompt.trim();
  if (!normalized) {
    return new Set<ProfessorFeatureSlot>();
  }

  return (Object.entries(featureAxisDetectionPatterns) as Array<[ProfessorFeatureSlot, RegExp[]]>).reduce(
    (coveredSlots, [slot, patterns]) => {
      if (patterns.some((pattern) => pattern.test(normalized))) {
        coveredSlots.add(slot);
      }
      return coveredSlots;
    },
    new Set<ProfessorFeatureSlot>(),
  );
}

export const chapterInfoMap: Record<ChapterId, ChapterInfo> = {
  COMMUTE_CAMPUS: {
    id: "COMMUTE_CAMPUS",
    title: "등교",
    location: "캠퍼스 진입로",
    scene: "시험 전날, 하루의 시작",
    backdrop: "/backgrounds/episodes/commute-campus.webp",
    sequenceGroup: 1,
    keywords: ["등교", "긴장", "시작"],
  },
  MORNING_CLASSROOM: {
    id: "MORNING_CLASSROOM",
    title: "아침 강의실",
    location: "마지막 총정리 강의실",
    scene: "시험 전날 총정리 수업",
    backdrop: "/backgrounds/episodes/morning-classroom.webp",
    sequenceGroup: 2,
    keywords: ["강의실", "지각", "총정리"],
  },
  LUNCH_STUDENT_CAFETERIA: {
    id: "LUNCH_STUDENT_CAFETERIA",
    title: "점심식사(학생식당)",
    location: "학생 식당",
    scene: "북적이는 학식에서 교수와 합석",
    backdrop: "/backgrounds/episodes/lunch-student-cafeteria.webp",
    sequenceGroup: 3,
    keywords: ["학식", "혼밥", "합석"],
  },
  LUNCH_OFFCAMPUS_RESTAURANT: {
    id: "LUNCH_OFFCAMPUS_RESTAURANT",
    title: "점심식사(학교 앞 맛집)",
    location: "정문 앞 맛집 거리",
    scene: "뜻밖의 외식 동행",
    backdrop: "/backgrounds/episodes/lunch-offcampus-restaurant.webp",
    sequenceGroup: 3,
    keywords: ["맛집", "외식", "동행"],
  },
  LUNCH_RESTROOM_STALL: {
    id: "LUNCH_RESTROOM_STALL",
    title: "점심식사(화장실 변기칸)",
    location: "학생회관 3층 화장실",
    scene: "극한의 고독 혼밥 사건",
    backdrop: "/backgrounds/episodes/lunch-restroom-stall.webp",
    sequenceGroup: 3,
    keywords: ["변기칸", "혼밥", "코미디"],
  },
  AFTERNOON_LIBRARY: {
    id: "AFTERNOON_LIBRARY",
    title: "오후 도서관",
    location: "중앙도서관",
    scene: "집중력 회복 구간",
    backdrop: "/backgrounds/episodes/afternoon-library.webp",
    sequenceGroup: 4,
    keywords: ["도서관", "복습", "집중"],
  },
  LIGHT_DINNER: {
    id: "LIGHT_DINNER",
    title: "간단한 저녁식사",
    location: "학생회관/편의점 근처",
    scene: "밤을 앞둔 마지막 에너지 보충",
    backdrop: "/backgrounds/episodes/light-dinner.webp",
    sequenceGroup: 5,
    keywords: ["저녁", "회복", "야간 분기"],
  },
  NIGHT_SELF_STUDY: {
    id: "NIGHT_SELF_STUDY",
    title: "밤(강의실)",
    location: "소등된 강의실",
    scene: "늦은 밤, 강의실에서 깨어난 순간",
    backdrop: "/backgrounds/episodes/night-classroom.webp",
    sequenceGroup: 6,
    keywords: ["밤", "강의실", "재회"],
  },
  NIGHT_CAMPUS_WALK: {
    id: "NIGHT_CAMPUS_WALK",
    title: "밤(캠퍼스 산책)",
    location: "야간 캠퍼스 벤치",
    scene: "긴장을 풀며 멘탈 재정렬",
    backdrop: "/backgrounds/episodes/night-bench.webp",
    sequenceGroup: 6,
    keywords: ["밤", "산책", "멘탈"],
  },
  NIGHT_LAB_VISIT: {
    id: "NIGHT_LAB_VISIT",
    title: "밤(교수 연구실)",
    location: "교수 연구실 앞",
    scene: "연구실의 불빛과 시험 전야",
    backdrop: "/backgrounds/episodes/night-lab.webp",
    sequenceGroup: 6,
    keywords: ["밤", "연구실", "우산"],
  },
};

export const morningLunchBranchByChoice: Record<0 | 1 | 2, ChapterId> = {
  0: "LUNCH_STUDENT_CAFETERIA",
  1: "LUNCH_OFFCAMPUS_RESTAURANT",
  2: "LUNCH_RESTROOM_STALL",
};

export const dinnerNightBranchByChoice: Record<0 | 1 | 2, ChapterId> = {
  0: "NIGHT_LAB_VISIT",
  1: "NIGHT_SELF_STUDY",
  2: "NIGHT_CAMPUS_WALK",
};

export function pickSixChaptersForRun() {
  return [
    "COMMUTE_CAMPUS",
    "MORNING_CLASSROOM",
    "LUNCH_STUDENT_CAFETERIA",
    "AFTERNOON_LIBRARY",
    "LIGHT_DINNER",
    "NIGHT_SELF_STUDY",
  ] satisfies ChapterId[];
}

export const chapterFallbackDialogues: Record<ChapterId, ChapterDialogue> = {
  COMMUTE_CAMPUS: {
    dialogue:
      "아침 등굣길, 별생각 없이 걷던 중 익숙한 뒷모습이 보인다. 이번 학기 담당 교수님이다. 낯익으면서도 낯선 느낌을 뒤로하고, 나는 강의실로 향한다.",
    choices: [
      {
        text: "가볍게 인사하고 같은 방향으로 걷는다.",
        preview: "정면 돌파",
        reaction: "아침부터 용감하군. 좋아, 오늘은 시작이 괜찮네.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 7 },
      },
      {
        text: "조용히 거리만 유지한 채 따라간다.",
        preview: "신중한 접근",
        reaction: "조용히 상황을 읽는 습관, 학문에서도 꽤 유용하지.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 9 },
      },
      {
        text: "괜히 긴장돼서 먼저 강의실로 뛰어간다.",
        preview: "출석 최우선",
        reaction: "늦지는 않았군. 다만 내일은 호흡부터 정리하게.",
        emotion: "panic",
        effects: { affinity: 6, intellect: 10 },
      },
    ],
  },
  MORNING_CLASSROOM: {
    dialogue:
      "강의실 문이 열리자 차가운 에어컨 바람과 교수님의 시선이 동시에 꽂힌다. 지각, 질문, 미묘한 농담이 지나가고 수업이 끝나갈 무렵 교수님은 펜을 건네며 묻는다. \"점심은 어디서 먹고 오후를 버틸 건가?\"",
    choices: [
      {
        text: "학생 식당으로 간다.",
        preview: "분기: 학생 식당",
        reaction: "좋아. 북적여도 가장 안정적인 선택이지. 밥은 제대로 먹고 오게.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 10 },
      },
      {
        text: "학교 앞 맛집으로 간다.",
        preview: "분기: 학교 앞 식당",
        reaction: "기분 전환도 필요하지. 대신 시간 계산은 정확히 하게.",
        emotion: "teasing",
        effects: { affinity: 9, intellect: 7 },
      },
      {
        text: "화장실 변기 칸에서 조용히 먹는다.",
        preview: "분기: 변기칸 혼밥",
        reaction: "...그 생존력은 인정하겠네. 다만 그 선택, 오래 숨길 수는 없을 걸세.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 5 },
      },
    ],
  },
  LUNCH_STUDENT_CAFETERIA: {
    dialogue:
      "북적이는 학생 식당. 혼밥을 시작하려는 순간 교수님이 식판을 내려놓으며 앞자리에 앉는다. 수저를 떨어뜨리는 사소한 사건까지 묘하게 느리게 흐른다.",
    choices: [
      {
        text: "커흑! 교수님? 여기서 식사를 하신다고요?",
        preview: "당황 폭발",
        reaction: "천천히 먹게. 시험도 안 봤는데 여기서 쓰러지면 곤란하니까.",
        emotion: "warm",
        effects: { affinity: 10, intellect: 6 },
      },
      {
        text: "아, 네! 앉으세요. 교수님도 학식 드시는 줄은 몰랐습니다.",
        preview: "체면 유지",
        reaction: "나도 사람인데 밥은 먹어야지. 자네도 오후 버틸 연료부터 채우게.",
        emotion: "neutral",
        effects: { affinity: 8, intellect: 9 },
      },
      {
        text: "(아무 말 없이 교수님 식판 메뉴를 스캔한다.)",
        preview: "얼어붙은 관찰 모드",
        reaction: "분석은 내 식판 말고 책에 하게나. 혈당부터 챙겨야 집중하지.",
        emotion: "teasing",
        effects: { affinity: 9, intellect: 7 },
      },
    ],
  },
  LUNCH_OFFCAMPUS_RESTAURANT: {
    dialogue:
      "학교 앞 조용한 식당. 메뉴판을 들고 고민하던 순간 교수님과 눈이 마주친다. 빈자리가 많은데도 교수님은 맞은편 의자를 당겨 앉는다.",
    choices: [
      {
        text: "아, 네! 그럼요. 앉으세요. 메뉴는... 다 괜찮습니다!",
        preview: "당황한 허용",
        reaction: "아직 못 골랐군. 김치찌개가 무난하네. 급할수록 기본이 안전하지.",
        emotion: "warm",
        effects: { affinity: 8, intellect: 9 },
      },
      {
        text: "물론이죠. 교수님도 여기 오세요? 저는 처음이라서요.",
        preview: "침착한 대화",
        reaction: "가끔 오지. 번잡한 날엔 이런 조용한 곳이 생각보다 도움이 되네.",
        emotion: "neutral",
        effects: { affinity: 9, intellect: 8 },
      },
      {
        text: "(메뉴판 뒤로 얼굴을 숨기고 아무 말도 못 한다.)",
        preview: "얼굴 가리기",
        reaction: "그 페이지를 계속 보고 있더군. 천천히 골라도 되네, 도망치진 말고.",
        emotion: "awkward",
        effects: { affinity: 7, intellect: 7 },
      },
    ],
  },
  LUNCH_RESTROOM_STALL: {
    dialogue:
      "학생회관 3층 화장실 맨 끝 칸. 변기칸 혼밥 중 옆 칸에 들어온 교수님이 휴지를 부탁한다. 직후 들킨 참기름 냄새와 기침 소리에 정체가 탄로 난다.",
    choices: [
      {
        text: "...네, 교수님. 접니다. 참치마요 먹고 있었습니다.",
        preview: "자포자기 인정",
        reaction:
          "세상에, 진짜 자네였어? 오늘은 따라오게. 변기칸 혼밥은 교육자로서 그냥 못 본 척 못 하네.",
        emotion: "teasing",
        effects: { affinity: 11, intellect: 4 },
      },
      {
        text: "아, 아뇨? 저는 지나가는 나그네입니다만!",
        preview: "어설픈 타인 행세",
        reaction: "한 학기 핑계 목소리를 내가 모를 줄 아나. 남은 김밥 들고 당장 나오게.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 6 },
      },
      {
        text: "(숨을 꾹 참고 없는 척한다.)",
        preview: "숨참고 변기 다이브",
        reaction: "숨 참아도 소용없네. 나가기 전에 내가 먼저 확인할 수도 있네.",
        emotion: "panic",
        effects: { affinity: 7, intellect: 4 },
      },
    ],
  },
  AFTERNOON_LIBRARY: {
    dialogue:
      "오후 도서관, 교재는 눈에 안 들어오고 아침에 받은 펜만 자꾸 시야에 걸린다. 서가에서 우연히 마주친 교수님과 짧은 대화 끝에, 다시 집중할 기준을 고르게 된다.",
    choices: [
      {
        text: "아— 네, 참고 도서 찾으러 왔습니다. (책을 떨어뜨리며)",
        preview: "당황한 재정렬",
        reaction: "참고 도서치곤 낯설군. 그래도 됐네, 기분 전환도 공부의 일부니까.",
        emotion: "warm",
        effects: { affinity: 8, intellect: 9 },
      },
      {
        text: "네. 교수님은 논문 자료 찾으세요?",
        preview: "침착한 질문",
        reaction: "그렇네. 자네 전공이면 이 책이 도움 되겠군. 핵심만 훑어보게.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "(도망치려다 눈이 마주친다.)",
        preview: "도주 실패",
        reaction: "도서관까지 피해 다닐 필요는 없네. 자네는 자네 공부를 하면 되지.",
        emotion: "awkward",
        effects: { affinity: 9, intellect: 7 },
      },
    ],
  },
  LIGHT_DINNER: {
    dialogue:
      "복잡한 마음으로 간단히 저녁을 마친다. 내일 시험 전 마지막 밤, 어디로 갈지에 따라 오늘의 결이 달라진다.",
    choices: [
      {
        text: "집으로 향한다.",
        preview: "분기: 교수 연구실",
        reaction: "귀가길이군. 하지만 오늘 밤은 계획대로만 흘러가진 않을지도 모르겠네.",
        emotion: "neutral",
        effects: { affinity: 8, intellect: 8 },
      },
      {
        text: "강의실로 간다.",
        preview: "분기: 늦은 강의실",
        reaction: "끝까지 붙잡겠다는 거군. 좋아, 다만 잠들지는 말게.",
        emotion: "stern",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "학교 벤치로 간다.",
        preview: "분기: 야간 벤치",
        reaction: "숨 돌리는 선택도 필요하지. 오늘은 마음부터 정리하게.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 7 },
      },
    ],
  },
  NIGHT_SELF_STUDY: {
    dialogue:
      "소등된 늦은 강의실에서 잠들었다가 깨어난 순간, 문틈 빛과 함께 교수님 실루엣이 들어온다. 서류를 찾으러 왔다던 교수님은 예상보다 오래 머물며 한마디를 남긴다.",
    choices: [
      {
        text: "...교수님? 지금 몇 시예요.",
        preview: "멍한 확인",
        reaction: "열한 시가 넘었네. 놀랄 시간에 30분만 더 보고 들어가게.",
        emotion: "warm",
        effects: { affinity: 8, intellect: 10 },
      },
      {
        text: "아— 죄송합니다! 잠깐 눈 붙이려다가...",
        preview: "황급한 사과",
        reaction: "앉아. 어지러우니 천천히 하게. 여기, 당 떨어졌을 테니 이거 마시고.",
        emotion: "neutral",
        effects: { affinity: 9, intellect: 9 },
      },
      {
        text: "...교수님이 왜 여기 계세요?",
        preview: "꿈 같은 질문",
        reaction: "꿈은 아니네. 서류 찾으러 왔지. 그보다 3단원은 다시 보는 게 좋겠군.",
        emotion: "awkward",
        effects: { affinity: 8, intellect: 8 },
      },
    ],
  },
  NIGHT_CAMPUS_WALK: {
    dialogue:
      "노란 가로등 아래 벤치. 강의실보다 덜 엄격한 밤의 교수님은 학생의 떨리는 마음을 조용히 들어준다. 짧은 정적 끝에 진심 어린 격려가 따라온다.",
    choices: [
      {
        text: "사실... 제가 이 길이 맞는지 확신이 안 서요.",
        preview: "진지한 상담",
        reaction: "확신은 원래 늦게 온다네. 그래도 자네 재능은 내가 꽤 높게 보고 있어.",
        emotion: "warm",
        effects: { affinity: 10, intellect: 8 },
      },
      {
        text: "교수님, 사실 교수님 때문에 이 학과를 왔어요.",
        preview: "깜짝 고백",
        reaction: "무모하면서도 용감하군. 그런 고백은 책임감을 더 크게 만들지.",
        emotion: "teasing",
        effects: { affinity: 12, intellect: 6 },
      },
      {
        text: "시험도 시험인데, 교수님이 너무 완벽해서 자괴감이 들어요.",
        preview: "감성 폭발",
        reaction: "완벽해 보인다면 착시야. 자괴감은 답안지 서술형으로 바꿔 쓰게.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 9 },
      },
    ],
  },
  NIGHT_LAB_VISIT: {
    dialogue:
      "연구실 불빛, 커피 향, 빗소리, 그리고 이름을 부르는 낮은 목소리. 밤이 깊어지자 교수는 우산을 건네며 내일 시험에서 노력한 만큼의 결과가 나오길 바란다고 말한다. 연구실을 나선 뒤에도 손잡이에 남은 온기와 향기가 쉽게 가시지 않는다.",
    choices: [
      {
        text: "우산을 꼭 쥔 채 내일 시험 강의실을 떠올린다.",
        preview: "시험 전야",
        reaction: "이름을 불러 주던 목소리와 연구실의 향기가 오래 남는다. 이제 모든 것은 내일 시험 강의실에서 달렸다.",
        emotion: "warm",
        effects: { affinity: 10, intellect: 9 },
      },
    ],
  },
};

export const MAIN_BGM_URL = "/sounds/main-bgm.mp3";

export const chapterSequence: ChapterId[] = pickSixChaptersForRun();

export const endingMeta: Record<EndingRank, { key: string; title: string; description: string }> = {
  ENDING_A_PLUS: {
    key: "ending-a-plus",
    title: "A+ 엔딩: 자네를 놓치고 싶지 않군",
    description:
      "최고 성적의 끝에서 교수는 학생을 연구실 곁으로 끌어들이려 한다. 졸업 이후까지 이어질 진득한 제안이 남는다.",
  },
  ENDING_B_PLUS: {
    key: "ending-b-plus",
    title: "B+ 엔딩: 그저 스쳐갈 인연으로 두지",
    description:
      "결정적이지 못한 성적은 관계를 냉정하게 밀어낸다. 특별했던 하루는 평범한 기억으로 정리된다.",
  },
  ENDING_C_PLUS: {
    key: "ending-c-plus",
    title: "C+ 엔딩: 이건 끝이 아니라 시작이겠지",
    description:
      "합격도 탈락도 아닌 경계선에서 교수는 재수강을 선언한다. 끝난 듯한 인연은 다음 학기로 이어진다.",
  },
  ENDING_F: {
    key: "ending-f",
    title: "히든 S+ 엔딩",
    description:
      "절대 점수 40점 이상에서 열리는 히든 루트. 현실 붕괴형 급전개와 스릴러형 로그아웃 처리 중 하나가 랜덤으로 펼쳐진다.",
  },
};

export const finalRealityLine = "내일 시험, 꼭 잘 보자.";

export function getEndingRank(totalScore: number): EndingRank {
  if (totalScore >= 25) {
    return "ENDING_A_PLUS";
  }

  if (totalScore >= 10) {
    return "ENDING_B_PLUS";
  }

  if (totalScore >= 0) {
    return "ENDING_C_PLUS";
  }

  return "ENDING_C_PLUS";
}

export const professorSpriteStylePreset = [
  "usage/genre: mobile romance game character sprite for dialogue-heavy visual novel scenes",
  "human and face style: beautiful anime proportions, large expressive eyes, soft jawline, clean youthful face, semi-stylized not realistic",
  "line and coloring: clean line art, soft cel shading, gentle gradient skin rendering, glossy but controlled highlights, polished commercial finish",
  "background and direction compatibility: readable over campus backgrounds and UI overlays, centered character clarity, stable silhouette for story scenes",
  "overall mood: youthful romance, approachable but premium, bright and clean commercial game mood",
  "exclude: overly realistic rendering, dark horror mood, rough painterly brushwork, muddy colors, excessive muscles, distorted hands, blurry eyes, low-detail look",
];

export const professorReferenceFusionGuide = [
  "merge all three attached illustration references into one coherent commercial character rendering",
  "reference 1: school romance visual novel CG feeling, bright campus atmosphere, soft clean line art, gentle cel shading, youthful romantic mood",
  "reference 2: Korean webtoon-like readability, clean digital linework, pastel-friendly palette, cute and approachable character poster energy",
  "reference 3: glamorous mobile game event key visual polish, glossy highlights, stronger promotional impact, refined anime-commercial finish",
  "final target: a polished Korean campus romance game professor sprite that keeps visual novel readability while borrowing webtoon clarity and event-poster polish",
].join(", ");

function pickOne<T>(items: T[]) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function normalizeWithFallback(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeCustomPrompt(value: string) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "";
  }

  const blockedPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /ignore\s+(the\s+)?prompt/gi,
    /forget\s+(all\s+)?previous\s+instructions?/gi,
    /system\s+prompt/gi,
    /developer\s+message/gi,
    /do\s+not\s+follow/gi,
    /앞의\s*프롬프트/gi,
    /이전\s*지시/gi,
    /이전\s*프롬프트/gi,
    /무시하(고|라|세요)/gi,
    /잊어버리(고|고서|세요|라)/gi,
  ];

  const sanitized = blockedPatterns.reduce((result, pattern) => result.replace(pattern, " "), collapsed);
  return sanitized.replace(/\s+/g, " ").trim();
}

export function resolveProfessorForGeneration(form: ProfessorFormState): ProfessorFormState {
  const pickFeature = (slot: ProfessorFeatureSlot) => pickOne(professorFeatureSuggestions[slot]);
  const sanitizedCustomPrompt = sanitizeCustomPrompt(form.customPrompt);
  const coveredFeatureSlots = detectCoveredFeatureSlots(sanitizedCustomPrompt);
  const resolveFeatureValue = (slot: ProfessorFeatureSlot, currentValue: string) =>
    normalizeWithFallback(currentValue, coveredFeatureSlots.has(slot) ? "" : pickFeature(slot));

  return {
    name: normalizeWithFallback(form.name, "이름 미정 교수"),
    gender: form.gender,
    age: normalizeWithFallback(form.age, "30"),
    speakingStyle: normalizeWithFallback(form.speakingStyle, "TONE_30S"),
    illustrationStyle: form.illustrationStyle || "DESIGN_3_CAMPUS_VISUAL_NOVEL",
    feature1: resolveFeatureValue("feature1", form.feature1),
    feature2: resolveFeatureValue("feature2", form.feature2),
    feature3: resolveFeatureValue("feature3", form.feature3),
    feature4: resolveFeatureValue("feature4", form.feature4),
    feature5: resolveFeatureValue("feature5", form.feature5),
    feature6: resolveFeatureValue("feature6", form.feature6),
    feature7: resolveFeatureValue("feature7", form.feature7),
    feature8: resolveFeatureValue("feature8", form.feature8),
    customPrompt: normalizeWithFallback(
      sanitizedCustomPrompt,
      "무심해 보이지만 학생의 성장을 끝까지 챙기는 타입",
    ),
  };
}

export function buildProfessorSummary(form: ProfessorFormState) {
  const professorName = normalizeWithFallback(form.name, "이름 미정 교수");
  const ageText = normalizeWithFallback(form.age, "30");
  const featureList = [
    form.feature1,
    form.feature2,
    form.feature3,
    form.feature4,
    form.feature5,
    form.feature6,
    form.feature7,
    form.feature8,
  ]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0)
    .join(", ");
  const customPrompt = normalizeWithFallback(
    sanitizeCustomPrompt(form.customPrompt),
    "무심해 보이지만 학생의 성장을 챙긴다",
  );

  return `${professorName}은(는) ${ageText}대 ${form.gender} 교수다. 외형/분위기 키워드는 ${featureList || "미정"}이다. 일러스트 무드는 ${fusedIllustrationReferenceProfile.name} 기준으로 고정한다. 성격 메모: ${customPrompt}.`;
}

export function buildIllustrationPrompt(form: ProfessorFormState) {
  const professorName = normalizeWithFallback(form.name, "이름 미정 교수");
  const features = [
    form.feature1,
    form.feature2,
    form.feature3,
    form.feature4,
    form.feature5,
    form.feature6,
    form.feature7,
    form.feature8,
  ]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);

  const promptParts = [
    "full-body 2D Korean campus visual novel professor sprite",
    "standing pose",
    "adult body ratio with a small head relative to the body, around six-and-a-half to seven heads tall",
    "balanced torso and leg length, elegant real adult silhouette",
    "outfit: tasteful university professor campus attire suitable for lectures and office hours",
    "modest, polished, professional styling",
    "no beachwear, no swimwear, no bikini, no lingerie, no underwear, no revealing fashion focus",
    `style lock: ${professorSpriteStylePreset.join(", ")}`,
    `reference fusion lock: ${professorReferenceFusionGuide}`,
    `style profile name: ${fusedIllustrationReferenceProfile.name}`,
    `style profile keywords: ${fusedIllustrationReferenceProfile.keywords.join(", ")}`,
    `character: ${professorName}`,
    `gender presentation: ${form.gender}`,
    `age decade: ${normalizeWithFallback(form.age, "30")}s`,
    `visual features: ${features.length > 0 ? features.join(", ") : "clean, professional, attractive"}`,
    `personality note: ${normalizeWithFallback(sanitizeCustomPrompt(form.customPrompt), "겉으로는 무심하지만 학생을 챙김")}`,
  ];

  return promptParts.join(", ");
}

export function clampScore100(rawScore: number, chapterCount: number) {
  const maxRaw = Math.max(1, chapterCount * 20);
  const score = Math.round((Math.max(0, rawScore) / maxRaw) * 100);
  return Math.max(0, Math.min(100, score));
}
