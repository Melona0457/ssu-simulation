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

const fusedIllustrationReferenceProfile = {
  name: "fused style from illustration design 1+2+3",
  keywords: [
    ...illustrationStyleProfiles.DESIGN_1_ROMANCE_FANTASY.keywords,
    ...illustrationStyleProfiles.DESIGN_2_CLEAN_CHARACTER_CARD.keywords,
    ...illustrationStyleProfiles.DESIGN_3_CAMPUS_VISUAL_NOVEL.keywords,
    "romantic key visual energy with polished glow accents",
    "clean character readability suitable for choice-driven dialogue scenes",
    "balanced campus visual novel rendering with stable silhouette clarity",
  ],
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
    scene: "빗속 연구실과 마지막 선택",
    backdrop: "/backgrounds/episodes/night-lab.webp",
    sequenceGroup: 6,
    keywords: ["밤", "연구실", "롤스로이스"],
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
        reaction: "아직 못 골랐군. 된장찌개가 무난하네. 급할수록 기본이 안전하지.",
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
      "연구실 불빛, 커피 향, 빗소리, 그리고 이름을 부르는 낮은 목소리. 밤이 깊어 건물을 나서자 폭우 속에 순백의 롤스로이스가 멈춰 선다. 마지막 선택만 남았다.",
    choices: [
      {
        text: "마음만 받을게요. 우산 쓰고 천천히 걸어가겠습니다.",
        preview: "엔딩 A 루트",
        reaction: "고집 있군. 그 독립심은 높이 사지. 내일은 감기 대신 정답을 들고 오게.",
        emotion: "warm",
        effects: { affinity: 9, intellect: 10 },
      },
      {
        text: "실례하겠습니다. 집까지 태워주세요.",
        preview: "엔딩 B 루트",
        reaction: "허, 솔직하군. 그 뻔뻔함, 싫지 않네. 타게. 대신 내일 결과로 보답하게.",
        emotion: "teasing",
        effects: { affinity: 12, intellect: 7 },
      },
      {
        text: "오늘은 여기까지 할게요. 적당한 거리를 두고 싶습니다.",
        preview: "엔딩 C 루트",
        reaction: "그래, 선은 중요하지. 다만 내일 시험은 그 선과 별개로 최선을 다하게.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 9 },
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
      "호감도 100에서만 열리는 히든 루트. 현실 붕괴형 급전개와 스릴러형 로그아웃 처리 중 하나가 랜덤으로 펼쳐진다.",
  },
};

export const finalRealityLine = "내일 시험, 꼭 잘 보자.";

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

  return "ENDING_C_PLUS";
}

export const professorSpriteStylePreset = [
  "premium Korean anime game illustration quality",
  "anime-style crisp clean line art",
  "soft cel shading with smooth skin gradients",
  "high-detail glossy hair strands and highlights",
  "expressive eyes with elegant facial rendering",
  "polished commercial game illustration finish",
  "romantic color accents with controlled bloom",
  "clean character-card readability with tidy line confidence",
  "visual-novel sprite clarity for dialogue-first gameplay",
];

export const professorReferenceFusionGuide = [
  "merge all three attached illustration references together",
  "reference 1 tone: romantic poster-like glow and dramatic polish",
  "reference 2 tone: clean youthful linework and bright character readability",
  "reference 3 tone: campus visual-novel sprite stability and dialogue-scene fit",
].join(", ");

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
    speakingStyle: normalizeWithFallback(form.speakingStyle, "TONE_30S"),
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
  const featureList = [form.feature1, form.feature2, form.feature3, form.feature4]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0)
    .join(", ");
  const customPrompt = normalizeWithFallback(
    form.customPrompt,
    "무심해 보이지만 학생의 성장을 챙긴다",
  );

  return `${professorName}은(는) ${ageText}대 ${form.gender} 교수다. 외형/분위기 키워드는 ${featureList || "미정"}이다. 일러스트 무드는 ${fusedIllustrationReferenceProfile.name} 기준으로 고정한다. 성격 메모: ${customPrompt}.`;
}

export function buildIllustrationPrompt(form: ProfessorFormState) {
  const professorName = normalizeWithFallback(form.name, "이름 미정 교수");
  const features = [form.feature1, form.feature2, form.feature3, form.feature4]
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 0);

  const promptParts = [
    "full-body 2D Korean campus visual novel professor sprite",
    "standing pose",
    `style lock: ${professorSpriteStylePreset.join(", ")}`,
    `reference fusion lock: ${professorReferenceFusionGuide}`,
    `style profile name: ${fusedIllustrationReferenceProfile.name}`,
    `style profile keywords: ${fusedIllustrationReferenceProfile.keywords.join(", ")}`,
    `character: ${professorName}`,
    `gender presentation: ${form.gender}`,
    `age decade: ${normalizeWithFallback(form.age, "30")}s`,
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
