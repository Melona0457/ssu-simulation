export const initialPlayerState: PlayerFormState = {
  name: "",
  gender: "남자",
};

export const initialProfessorState: ProfessorFormState = {
  name: "",
  gender: "남자",
  age: "",
  speakingStyle: "차분하고 이성적인 말투",
  illustrationStyle: "DESIGN_1_ROMANCE_FANTASY",
  feature1: "",
  feature2: "",
  feature3: "",
  feature4: "",
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

export const professorSpeakingStyleOptions = [
  "차분하고 이성적인 말투",
  "무심한 츤데레 말투",
  "유머 섞인 직설 말투",
  "다정하지만 단호한 말투",
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
      "고채도 핑크/바이올렛, 반짝이는 하이라이트, 로맨스 판타지 포스터 감성",
  },
  {
    label: "일러스트디자인2",
    value: "DESIGN_2_CLEAN_CHARACTER_CARD",
    description:
      "밝은 파스텔 톤, 깔끔한 라인, 캐릭터 카드형 구성, 캐주얼하고 또렷한 느낌",
  },
  {
    label: "일러스트디자인3",
    value: "DESIGN_3_CAMPUS_VISUAL_NOVEL",
    description:
      "캠퍼스 배경 위 비주얼노벨 스프라이트, 안정적인 채도, 서사 중심 게임 화면 톤",
  },
];

const illustrationStyleProfiles: Record<
  IllustrationStyleKey,
  { name: string; keywords: string[] }
> = {
  DESIGN_1_ROMANCE_FANTASY: {
    name: "romance fantasy poster mood",
    keywords: [
      "vivid magenta and rose accents",
      "glossy hair and eye highlights",
      "cinematic rim lighting",
      "sparkle particles and soft bloom",
      "dramatic, premium anime game poster finish",
    ],
  },
  DESIGN_2_CLEAN_CHARACTER_CARD: {
    name: "clean character card mood",
    keywords: [
      "bright pastel palette",
      "clean linework with tidy edges",
      "soft shading, low visual noise",
      "readable character-first composition",
      "youthful and friendly webtoon-like mood",
    ],
  },
  DESIGN_3_CAMPUS_VISUAL_NOVEL: {
    name: "campus visual novel mood",
    keywords: [
      "balanced natural colors",
      "polished sprite readability on campus scene",
      "gentle depth with atmospheric light",
      "story-focused visual novel game feeling",
      "commercial Korean campus game illustration tone",
    ],
  },
};

export const professorFeatureSuggestions: Record<
  "feature1" | "feature2" | "feature3" | "feature4",
  string[]
> = {
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
    "작고 둥근 코",
    "선명한 턱선",
    "갸름한 얼굴형",
    "단정한 분위기의 얼굴 비율",
  ],
  feature4: [
    "옅은 미소의 입꼬리",
    "단정한 입술 라인",
    "또렷한 피부톤",
    "부드러운 광대 윤곽",
    "도회적인 전체 분위기",
  ],
};

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
    title: "밤(자율 복습)",
    location: "도서관 열람실",
    scene: "조용한 자율 복습",
    backdrop: "/backgrounds/episodes/night-classroom.webp",
    sequenceGroup: 6,
    keywords: ["밤", "자율복습", "집중"],
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
    title: "밤(연구실 방문)",
    location: "교수 연구실 앞",
    scene: "마지막 질의응답",
    backdrop: "/backgrounds/episodes/night-lab.webp",
    sequenceGroup: 6,
    keywords: ["밤", "연구실", "질문"],
  },
};

export const morningLunchBranchByChoice: Record<0 | 1 | 2, ChapterId> = {
  0: "LUNCH_STUDENT_CAFETERIA",
  1: "LUNCH_OFFCAMPUS_RESTAURANT",
  2: "LUNCH_RESTROOM_STALL",
};

export const dinnerNightBranchByChoice: Record<0 | 1 | 2, ChapterId> = {
  0: "NIGHT_SELF_STUDY",
  1: "NIGHT_CAMPUS_WALK",
  2: "NIGHT_LAB_VISIT",
};

export const sessionPackEpisodeIds: ChapterId[] = [
  "COMMUTE_CAMPUS",
  "MORNING_CLASSROOM",
  "LUNCH_STUDENT_CAFETERIA",
  "LUNCH_OFFCAMPUS_RESTAURANT",
  "LUNCH_RESTROOM_STALL",
  "AFTERNOON_LIBRARY",
  "LIGHT_DINNER",
  "NIGHT_SELF_STUDY",
  "NIGHT_CAMPUS_WALK",
  "NIGHT_LAB_VISIT",
];

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
      "시험 전날 아침, 캠퍼스 정문을 지나자 공기가 유난히 무겁다. 오늘 하루는 교수님과의 거리, 그리고 내 점수를 동시에 바꿀 수 있는 날이다.",
    choices: [
      {
        text: "계획표부터 다시 점검하고 강의실로 간다.",
        preview: "안정적인 시작",
        reaction: "좋아요. 시작을 정돈한 학생이 끝까지 흔들리지 않죠.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 11 },
      },
      {
        text: "일단 강의실부터 뛰어가서 분위기를 본다.",
        preview: "속도 우선",
        reaction: "실행력은 좋군요. 다만 급할수록 기준을 잊지 마세요.",
        emotion: "neutral",
        effects: { affinity: 5, intellect: 8 },
      },
      {
        text: "마음부터 진정하려고 잠깐 숨을 고른다.",
        preview: "멘탈 정비",
        reaction: "불안을 다루는 태도도 실력입니다. 늦지만 않으면 돼요.",
        emotion: "awkward",
        effects: { affinity: 8, intellect: 6 },
      },
    ],
  },
  MORNING_CLASSROOM: {
    dialogue:
      "강의실 문을 열자 차가운 바람과 함께 교수님의 시선이 꽂힌다. 총정리 수업이 끝난 뒤 교수님은 펜을 건네며 말한다. ‘점심은 어디서 먹고 오후를 버틸 건가?’",
    choices: [
      {
        text: "학생 식당으로 간다.",
        preview: "가장 현실적인 선택",
        reaction: "좋아요. 학식도 전략적으로 먹으면 훌륭한 연료가 되죠.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 10 },
      },
      {
        text: "학교 앞 맛집으로 간다.",
        preview: "기분 전환",
        reaction: "컨디션을 끌어올리려는 판단이군요. 다만 시간 관리는 확실히 하세요.",
        emotion: "teasing",
        effects: { affinity: 8, intellect: 7 },
      },
      {
        text: "화장실 변기 칸에서 조용히 때운다.",
        preview: "극한의 은둔 혼밥",
        reaction: "...자네의 생존 본능은 높이 사겠네. 하지만 그 선택, 오래 숨길 수 있을까?",
        emotion: "stern",
        effects: { affinity: 5, intellect: 5 },
      },
    ],
  },
  LUNCH_STUDENT_CAFETERIA: {
    dialogue:
      "시험 전날 학식은 유난히 시끄럽다. 빈 앞자리로 그림자가 드리우고, 교수님이 식판을 내려놓는다. ‘민상군, 앞자리 비어 있나?’",
    choices: [
      {
        text: "커흑! 교수님? 여기서 식사를 하신다고요?",
        preview: "사레들림 리액션",
        reaction: "천천히 먹게. 시험도 안 봤는데 여기서 숨 넘어가면 곤란하지.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 6 },
      },
      {
        text: "아, 네! 앉으세요. 교수님도 학식 드시는 줄은 몰랐습니다.",
        preview: "사회적 체면 유지",
        reaction: "나도 밥은 먹어야지. 자네도 단백질 챙기고 오후 버티게.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 9 },
      },
      {
        text: "(아무 말 없이 교수님 식판 메뉴를 스캔한다.)",
        preview: "얼어붙은 관찰 모드",
        reaction: "분석은 내 식판 말고 전공 책에 하게나. 이 요구르트나 마시고 집중해.",
        emotion: "teasing",
        effects: { affinity: 8, intellect: 7 },
      },
    ],
  },
  LUNCH_OFFCAMPUS_RESTAURANT: {
    dialogue:
      "정문 앞 맛집 골목은 점심 인파로 붐빈다. 메뉴판 앞에서 망설이는 순간 교수님이 나타난다. ‘결정이 느리면 오후 집중력이 먼저 떨어지네.’",
    choices: [
      {
        text: "교수님 추천 메뉴로 바로 주문할게요.",
        preview: "빠른 의사결정",
        reaction: "좋아. 망설임을 줄이면 체력도, 시간도 아낄 수 있지.",
        emotion: "warm",
        effects: { affinity: 8, intellect: 9 },
      },
      {
        text: "제가 사겠습니다. 오늘은 투자 개념으로요.",
        preview: "과감한 플러팅",
        reaction: "허세도 전략이 되려면 내일 답안에서 증명해야 하네.",
        emotion: "teasing",
        effects: { affinity: 10, intellect: 5 },
      },
      {
        text: "테이크아웃해서 걸으면서 먹겠습니다.",
        preview: "시간 효율 우선",
        reaction: "효율은 좋지만 소화도 효율적으로 하게. 오후엔 도서관이야.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 10 },
      },
    ],
  },
  LUNCH_RESTROOM_STALL: {
    dialogue:
      "학생회관 화장실 맨 끝 칸. 참치마요 김밥을 숨겨 먹는 순간 옆 칸에서 익숙한 목소리가 들린다. ‘혹시 옆 칸에 누구 있나? 휴지 좀 넘겨줄 수 있겠나?’",
    choices: [
      {
        text: "...네, 교수님. 접니다. 참치마요 먹고 있었습니다.",
        preview: "자포자기 인정",
        reaction:
          "세상에, 진짜 자네였어? 오늘만큼은 따라오게. 변기칸 혼밥은 교육적으로 방치할 수 없네.",
        emotion: "teasing",
        effects: { affinity: 10, intellect: 4 },
      },
      {
        text: "아, 아뇨? 저는 지나가는 나그네입니다만!",
        preview: "어설픈 타인 행세",
        reaction: "한 학기 핑계 목소리를 내가 모를 줄 아나. 자네, 그대로 나오게.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 6 },
      },
      {
        text: "(숨을 꾹 참고 없는 척한다.)",
        preview: "숨참고 변기 다이브",
        reaction: "숨 참아도 소용없네. 어서 나오게, 내 청력이 자네 편은 아니라서.",
        emotion: "panic",
        effects: { affinity: 7, intellect: 5 },
      },
    ],
  },
  AFTERNOON_LIBRARY: {
    dialogue:
      "오후 도서관. 점심의 여운이 남아 집중이 흔들릴 때 교수님 메시지가 도착한다. ‘지금부터는 양보다 기준이다. 무엇을 버릴지 먼저 정해.’",
    choices: [
      {
        text: "오답률 높은 유형만 집중 복습할게요.",
        preview: "선택과 집중",
        reaction: "정확해요. 불안할수록 범위를 줄여야 점수가 오릅니다.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 12 },
      },
      {
        text: "전 범위를 한 번 더 빠르게 훑을게요.",
        preview: "전체 순환",
        reaction: "좋은데, 멈춰야 할 지점은 반드시 멈추세요.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 9 },
      },
      {
        text: "교수님이 중요하다는 파트만 믿고 가겠습니다.",
        preview: "의존형 선택",
        reaction: "내 말은 힌트일 뿐이야. 답은 자네 손으로 구조화해야 하지.",
        emotion: "stern",
        effects: { affinity: 8, intellect: 7 },
      },
    ],
  },
  LIGHT_DINNER: {
    dialogue:
      "해가 지고 간단한 저녁을 앞둔 시각. 교수님이 묻는다. ‘밤은 세 가지뿐이네. 혼자 끝까지 밀어붙일지, 머리를 식힐지, 마지막 질문을 던질지.’",
    choices: [
      {
        text: "간단히 먹고 바로 열람실 자율 복습으로 간다.",
        preview: "밤 분기: 자율 복습",
        reaction: "좋아. 오늘 밤은 조용한 반복이 자네를 살릴 거야.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 12 },
      },
      {
        text: "짧게 캠퍼스 산책하며 멘탈을 정리한다.",
        preview: "밤 분기: 산책",
        reaction: "과호흡은 줄이고, 걸음에 맞춰 생각을 정리해보게.",
        emotion: "neutral",
        effects: { affinity: 8, intellect: 8 },
      },
      {
        text: "연구실 앞에서 마지막 질문을 던진다.",
        preview: "밤 분기: 연구실",
        reaction: "좋아. 단 하나만 묻게. 제대로 묻는 학생에게는 제대로 답하지.",
        emotion: "stern",
        effects: { affinity: 9, intellect: 9 },
      },
    ],
  },
  NIGHT_SELF_STUDY: {
    dialogue:
      "도서관 열람실의 밤. 페이지 넘기는 소리만 남은 시간, 교수님이 낮에 건넨 펜이 손끝에서 무게를 만든다.",
    choices: [
      {
        text: "핵심 개념 5개를 다시 써보며 마무리한다.",
        preview: "핵심 고정",
        reaction: "완벽합니다. 그 다섯 줄이 내일의 중심축이 될 겁니다.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 12 },
      },
      {
        text: "자주 틀린 문제만 30분 더 본다.",
        preview: "오답 정리",
        reaction: "좋은 선택이에요. 실수를 줄이는 밤이 점수를 만듭니다.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 10 },
      },
      {
        text: "교수님 생각하며 멘탈을 먼저 안정시킨다.",
        preview: "감정 안정",
        reaction: "마음 관리도 중요하죠. 다만 마지막은 개념으로 잠그고 자요.",
        emotion: "awkward",
        effects: { affinity: 10, intellect: 6 },
      },
    ],
  },
  NIGHT_CAMPUS_WALK: {
    dialogue:
      "야간 캠퍼스 벤치. 찬 공기 속에서 발걸음을 맞추며 교수님이 낮게 말한다. ‘불안은 사라지지 않는다. 다만 다루는 법을 배우는 거지.’",
    choices: [
      {
        text: "교수님, 내일은 문제 읽고 근거부터 표시하겠습니다.",
        preview: "실전 운영 선언",
        reaction: "좋습니다. 오늘 밤 그 한 문장만 기억해도 절반은 이긴 거예요.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 9 },
      },
      {
        text: "산책 끝나면 체크리스트를 만들게요.",
        preview: "루틴 정리",
        reaction: "좋아. 걷고 정리하는 루틴은 생각보다 강력하지.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 10 },
      },
      {
        text: "차라리 도망가고 싶다고 말한다.",
        preview: "불안 고백",
        reaction: "도망가도 좋네. 다만 시험장 문 앞까진 같이 가보자고.",
        emotion: "warm",
        effects: { affinity: 10, intellect: 5 },
      },
    ],
  },
  NIGHT_LAB_VISIT: {
    dialogue:
      "연구실 문틈으로 새어 나오는 불빛. 노크 소리에 교수님이 고개를 들고 말한다. ‘질문은 하나만. 지금 가장 두려운 지점을 말해.’",
    choices: [
      {
        text: "서술형 논리 전개가 약합니다. 구조를 점검 받고 싶어요.",
        preview: "정면 돌파 질문",
        reaction: "좋은 질문이네. 도입-근거-결론 세 줄로 뼈대를 고정하게.",
        emotion: "warm",
        effects: { affinity: 8, intellect: 12 },
      },
      {
        text: "객관식 함정 보기를 구분하는 팁을 부탁드립니다.",
        preview: "실전 팁 요청",
        reaction: "문장에 없는 의미를 상상하지 말게. 문제는 늘 텍스트 안에 있어.",
        emotion: "stern",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "내일 잘 보면, 식사 한 번 같이 하실래요?",
        preview: "과감한 플러팅",
        reaction: "먼저 합격점을 가져오게. 그다음 일정은 내가 고민해보지.",
        emotion: "teasing",
        effects: { affinity: 11, intellect: 7 },
      },
    ],
  },
};

export const MAIN_BGM_URL = "/sounds/main-bgm.mp3";

export const chapterSequence: ChapterId[] = pickSixChaptersForRun();

export const endingMeta: Record<EndingRank, { key: string; title: string; description: string }> = {
  ENDING_A_PLUS: {
    key: "ending-a-plus",
    title: "A+ 엔딩 (임시): 완성도 높은 하루",
    description:
      "감정선과 시험 운영을 모두 잡아낸 하루였습니다. 교수님은 짧은 칭찬을 남기고, 다음 학기의 당신을 더 기대하게 됩니다.",
  },
  ENDING_B_PLUS: {
    key: "ending-b-plus",
    title: "B+ 엔딩 (임시): 안정적인 합격권",
    description:
      "흔들리는 순간도 있었지만 기준을 잃지 않았습니다. 교수님은 고개를 끄덕이며 다음에는 더 높은 곳을 노려보자고 말합니다.",
  },
  ENDING_C_PLUS: {
    key: "ending-c-plus",
    title: "C+ 엔딩 (임시): 아슬아슬한 통과",
    description:
      "몇 번의 실수는 있었지만 끝까지 포기하지 않았습니다. 교수님은 냉정한 피드백과 함께 회복 가능한 방향을 제시해줍니다.",
  },
  ENDING_F: {
    key: "ending-f",
    title: "F 엔딩 (임시): 리스타트 필요",
    description:
      "이번 라운드는 버거웠지만 데이터는 충분히 쌓였습니다. 교수님은 다음 시험을 위한 재정비 계획부터 세우라고 단호히 조언합니다.",
  },
};

export const finalRealityLine = "이제 현실세계로 돌아가 공부를 할 시간이야.";

export function getEndingRank(totalScore100: number): EndingRank {
  if (totalScore100 >= 85) {
    return "ENDING_A_PLUS";
  }

  if (totalScore100 >= 70) {
    return "ENDING_B_PLUS";
  }

  if (totalScore100 >= 50) {
    return "ENDING_C_PLUS";
  }

  return "ENDING_F";
}

export const professorSpriteStylePreset = [
  "premium Korean anime game illustration quality",
  "anime-style crisp clean line art",
  "soft cel shading with smooth skin gradients",
  "high-detail glossy hair strands and highlights",
  "expressive eyes with elegant facial rendering",
  "polished commercial game illustration finish",
  "vivid but balanced magenta-cyan accent lighting",
];

function pickOne<T>(items: T[]) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function normalizeWithFallback(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function resolveProfessorForGeneration(form: ProfessorFormState): ProfessorFormState {
  const pickFeature = (slot: "feature1" | "feature2" | "feature3" | "feature4") =>
    pickOne(professorFeatureSuggestions[slot]);

  return {
    name: normalizeWithFallback(form.name, "이름 미정 교수"),
    gender: form.gender,
    age: normalizeWithFallback(form.age, "30"),
    speakingStyle: normalizeWithFallback(
      form.speakingStyle,
      pickOne(professorSpeakingStyleOptions),
    ),
    illustrationStyle: form.illustrationStyle || "DESIGN_3_CAMPUS_VISUAL_NOVEL",
    feature1: normalizeWithFallback(form.feature1, pickFeature("feature1")),
    feature2: normalizeWithFallback(form.feature2, pickFeature("feature2")),
    feature3: normalizeWithFallback(form.feature3, pickFeature("feature3")),
    feature4: normalizeWithFallback(form.feature4, pickFeature("feature4")),
    customPrompt: normalizeWithFallback(
      form.customPrompt,
      "무심해 보이지만 학생의 성장을 끝까지 챙기는 타입",
    ),
  };
}

export function buildProfessorSummary(form: ProfessorFormState) {
  const professorName = normalizeWithFallback(form.name, "이름 미정 교수");
  const ageText = normalizeWithFallback(form.age, "30");
  const styleText = normalizeWithFallback(form.speakingStyle, "차분한 말투");
  const selectedStyle =
    illustrationStyleProfiles[form.illustrationStyle] ??
    illustrationStyleProfiles.DESIGN_3_CAMPUS_VISUAL_NOVEL;
  const featureList = [form.feature1, form.feature2, form.feature3, form.feature4]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0)
    .join(", ");
  const customPrompt = normalizeWithFallback(
    form.customPrompt,
    "무심해 보이지만 학생의 성장을 챙긴다",
  );

  return `${professorName}은(는) ${ageText}대 ${form.gender} 교수다. 말투는 ${styleText}이고, 외형/분위기 키워드는 ${featureList || "미정"}이다. 일러스트 무드는 ${selectedStyle.name} 기준이다. 성격 메모: ${customPrompt}.`;
}

export function buildIllustrationPrompt(form: ProfessorFormState) {
  const professorName = normalizeWithFallback(form.name, "이름 미정 교수");
  const selectedStyle =
    illustrationStyleProfiles[form.illustrationStyle] ??
    illustrationStyleProfiles.DESIGN_3_CAMPUS_VISUAL_NOVEL;
  const features = [form.feature1, form.feature2, form.feature3, form.feature4]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);

  const promptParts = [
    "full-body 2D Korean campus visual novel professor sprite",
    "standing pose",
    `style lock: ${professorSpriteStylePreset.join(", ")}`,
    `style profile name: ${selectedStyle.name}`,
    `style profile keywords: ${selectedStyle.keywords.join(", ")}`,
    `character: ${professorName}`,
    `gender presentation: ${form.gender}`,
    `age decade: ${normalizeWithFallback(form.age, "30")}s`,
    `speaking impression: ${normalizeWithFallback(form.speakingStyle, "차분한 말투")}`,
    `visual features: ${features.length > 0 ? features.join(", ") : "clean, professional, attractive"}`,
    `personality note: ${normalizeWithFallback(form.customPrompt, "겉으로는 무심하지만 학생을 챙김")}`,
  ];

  return promptParts.join(", ");
}

export function clampScore100(rawScore: number, chapterCount: number) {
  const maxRaw = Math.max(1, chapterCount * 20);
  const score = Math.round((Math.max(0, rawScore) / maxRaw) * 100);
  return Math.max(0, Math.min(100, score));
}
