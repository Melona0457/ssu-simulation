export type GameScoreKey = "affinity" | "intellect";

export type DialogueEmotion =
  | "neutral"
  | "stern"
  | "teasing"
  | "awkward"
  | "warm"
  | "panic";

export type ChapterId =
  | "ORIENTATION_GATE"
  | "STONE_STAIRS"
  | "CAMPUS_CAFE"
  | "CLASSROOM"
  | "TEAM_PROJECT"
  | "LIBRARY"
  | "LAB_CORRIDOR"
  | "SUNSET_YARD"
  | "CONVENIENCE_STORE"
  | "NIGHT_BENCH"
  | "DAWN_REVIEW"
  | "EXAM_HALL";

export type EndingRank = "ENDING_1" | "ENDING_2" | "ENDING_3" | "ENDING_4" | "ENDING_5";
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

const DEFAULT_BACKDROP =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80";

export const chapterInfoMap: Record<ChapterId, ChapterInfo> = {
  ORIENTATION_GATE: {
    id: "ORIENTATION_GATE",
    title: "캠퍼스 입구",
    location: "정문 앞",
    scene: "시험기간의 시작",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 1,
    keywords: ["입장", "루틴", "시작"],
  },
  STONE_STAIRS: {
    id: "STONE_STAIRS",
    title: "돌계단",
    location: "중앙 돌계단",
    scene: "첫 인상과 기류 파악",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 1,
    keywords: ["첫만남", "길찾기", "긴장"],
  },
  CAMPUS_CAFE: {
    id: "CAMPUS_CAFE",
    title: "교내 카페",
    location: "학생회관 카페",
    scene: "짧은 휴식 속 질문",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 2,
    keywords: ["카페인", "휴식", "집중"],
  },
  CLASSROOM: {
    id: "CLASSROOM",
    title: "강의실",
    location: "전공 강의실",
    scene: "수업 직후 1:1 대화",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 2,
    keywords: ["질문", "피드백", "핵심개념"],
  },
  TEAM_PROJECT: {
    id: "TEAM_PROJECT",
    title: "팀플 존",
    location: "스터디룸 앞",
    scene: "조별과제와 시험 압박",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 3,
    keywords: ["팀플", "우선순위", "분업"],
  },
  LIBRARY: {
    id: "LIBRARY",
    title: "중앙도서관",
    location: "자판기 앞",
    scene: "집중력 한계 구간",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 3,
    keywords: ["새벽", "집중", "복습"],
  },
  LAB_CORRIDOR: {
    id: "LAB_CORRIDOR",
    title: "연구실 복도",
    location: "연구동 3층",
    scene: "예상문제 힌트 탐색",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 4,
    keywords: ["힌트", "연구실", "예상문제"],
  },
  SUNSET_YARD: {
    id: "SUNSET_YARD",
    title: "노을 마당",
    location: "본관 앞 잔디",
    scene: "감정선이 흔들리는 시점",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 4,
    keywords: ["노을", "멘탈", "리듬"],
  },
  CONVENIENCE_STORE: {
    id: "CONVENIENCE_STORE",
    title: "편의점",
    location: "기숙사 편의점",
    scene: "전날 밤 최종 선택",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 5,
    keywords: ["전날밤", "수면", "최종정리"],
  },
  NIGHT_BENCH: {
    id: "NIGHT_BENCH",
    title: "야간 벤치",
    location: "도서관 옆 벤치",
    scene: "마지막 멘탈 점검",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 5,
    keywords: ["불안", "멘탈", "핵심5개"],
  },
  DAWN_REVIEW: {
    id: "DAWN_REVIEW",
    title: "새벽 복습",
    location: "강의동 복도",
    scene: "시험 직전 암기",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 6,
    keywords: ["오답", "새벽", "최종점검"],
  },
  EXAM_HALL: {
    id: "EXAM_HALL",
    title: "시험장",
    location: "결전의 강의실",
    scene: "시험지 배부 직전",
    backdrop: DEFAULT_BACKDROP,
    sequenceGroup: 6,
    keywords: ["시험지", "근거", "실전운영"],
  },
};

export const chapterPool: ChapterId[] = [
  "ORIENTATION_GATE",
  "STONE_STAIRS",
  "CAMPUS_CAFE",
  "CLASSROOM",
  "TEAM_PROJECT",
  "LIBRARY",
  "LAB_CORRIDOR",
  "SUNSET_YARD",
  "CONVENIENCE_STORE",
  "NIGHT_BENCH",
  "DAWN_REVIEW",
  "EXAM_HALL",
];

export const chapterFallbackDialogues: Record<ChapterId, ChapterDialogue> = {
  ORIENTATION_GATE: {
    dialogue: "교수: 시험기간엔 첫 루틴이 성적을 좌우해요. 당신은 오늘 어떤 시작을 할 건가요?",
    choices: [
      {
        text: "오늘 계획표부터 짜고 시작할게요.",
        preview: "안정적인 출발",
        reaction: "교수: 좋아요. 시작이 단단하면 끝도 덜 흔들리죠.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "일단 감으로 부딪쳐보고 정리할래요.",
        preview: "즉흥형 접근",
        reaction: "교수: 실행력은 좋지만, 근거 없는 자신감은 위험해요.",
        emotion: "stern",
        effects: { affinity: 5, intellect: 7 },
      },
      {
        text: "교수님만 믿고 따라가면 안 될까요?",
        preview: "감정선 우선",
        reaction: "교수: 믿음은 고맙지만 답안지는 당신이 써야 해요.",
        emotion: "awkward",
        effects: { affinity: 9, intellect: 5 },
      },
    ],
  },
  STONE_STAIRS: {
    dialogue: "교수: 강의실을 헤매는 학생이 있다니요? 이거 정말인가요?",
    choices: [
      {
        text: "죄송합니다. 경상관 어떻게 가요?",
        preview: "정중한 질문",
        reaction: "교수: 길은 알려드릴게요. 대신 수업도 제대로 찾아와야죠.",
        emotion: "neutral",
        effects: { affinity: 8, intellect: 10 },
      },
      {
        text: "그냥 수업째고 데이트나 하죠.",
        preview: "장난기 있는 선택",
        reaction: "교수: 농담은 재밌네요. 출석은 전혀 안 재밌지만요.",
        emotion: "teasing",
        effects: { affinity: 10, intellect: 4 },
      },
      {
        text: "대기까페핑 중이요. 우물쭈물댄다.",
        preview: "소극적 반응",
        reaction: "교수: 우물쭈물할 시간에 한 줄이라도 더 보는 게 낫겠어요.",
        emotion: "stern",
        effects: { affinity: 5, intellect: 6 },
      },
    ],
  },
  CAMPUS_CAFE: {
    dialogue: "교수: 카페인은 집중을 돕지만, 계획 없는 밤샘을 합리화하진 않아요.",
    choices: [
      {
        text: "딱 두 시간만 정해서 집중할게요.",
        preview: "시간 제한 전략",
        reaction: "교수: 훌륭하네요. 시간 통제가 곧 시험 통제예요.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 12 },
      },
      {
        text: "오늘은 그냥 버티는 게 목표예요.",
        preview: "생존 모드",
        reaction: "교수: 생존도 전략이지만, 내일을 위한 여지는 남겨두세요.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 8 },
      },
      {
        text: "교수님이 사주면 더 집중될 것 같아요.",
        preview: "플러팅형 선택",
        reaction: "교수: 집중이 커피값에 달려 있다면 큰일이네요.",
        emotion: "teasing",
        effects: { affinity: 9, intellect: 6 },
      },
    ],
  },
  CLASSROOM: {
    dialogue: "교수: 질문은 환영입니다. 단, 질문의 질은 점수의 질과 비슷해요.",
    choices: [
      {
        text: "핵심 개념 두 개만 다시 짚어주세요.",
        preview: "핵심 타격",
        reaction: "교수: 좋아요. 질문이 정확하면 답도 정확해집니다.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 12 },
      },
      {
        text: "시험 범위 줄여주시면 안 돼요?",
        preview: "무리수 제안",
        reaction: "교수: 범위는 공평해야 하니까요. 대신 힌트는 줄 수 있어요.",
        emotion: "stern",
        effects: { affinity: 7, intellect: 7 },
      },
      {
        text: "교수님 스타일로 서술형 써보면 될까요?",
        preview: "말투 분석형",
        reaction: "교수: 제 말투보다 논리 구조를 가져가세요. 그게 정답에 가깝습니다.",
        emotion: "neutral",
        effects: { affinity: 8, intellect: 10 },
      },
    ],
  },
  TEAM_PROJECT: {
    dialogue: "교수: 팀플과 시험이 겹치면 우선순위를 냉정하게 정해야 해요.",
    choices: [
      {
        text: "팀플은 역할 나누고 시험에 집중할게요.",
        preview: "분업형 전략",
        reaction: "교수: 분리와 집중, 시험기간에 가장 강한 방식이죠.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 11 },
      },
      {
        text: "다 제가 하고 마음 편히 시험 볼래요.",
        preview: "과몰입형 선택",
        reaction: "교수: 책임감은 좋지만, 과하면 둘 다 무너집니다.",
        emotion: "stern",
        effects: { affinity: 8, intellect: 6 },
      },
      {
        text: "팀원들에게 기도하고 공부만 할게요.",
        preview: "운에 맡기기",
        reaction: "교수: 기도보다 체크리스트가 더 높은 확률입니다.",
        emotion: "teasing",
        effects: { affinity: 5, intellect: 7 },
      },
    ],
  },
  LIBRARY: {
    dialogue: "교수: 새벽엔 집중력이 떨어진 만큼 선택이 더 중요해집니다.",
    choices: [
      {
        text: "중요도 높은 문제만 골라 복습할게요.",
        preview: "선택과 집중",
        reaction: "교수: 잘 골랐어요. 버릴 줄 아는 것도 실력이에요.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 12 },
      },
      {
        text: "전 범위 끝까지 버티겠습니다.",
        preview: "체력전",
        reaction: "교수: 의지는 좋지만, 시험은 체력보다 판단력이 필요해요.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 8 },
      },
      {
        text: "교수님 옆자리에서 공부하면 더 잘될까요?",
        preview: "몰입도 높은 장난",
        reaction: "교수: 집중은 거리보다 태도에서 나옵니다.",
        emotion: "awkward",
        effects: { affinity: 10, intellect: 5 },
      },
    ],
  },
  LAB_CORRIDOR: {
    dialogue: "교수: 복도에서 우연히 마주친 김에, 마지막 힌트를 주죠.",
    choices: [
      {
        text: "힌트를 키워드로 바꿔서 정리할게요.",
        preview: "구조화 선택",
        reaction: "교수: 네, 그 방식이면 시험장에서 떠올리기 쉬워요.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "힌트 그대로 문장째 외울래요.",
        preview: "암기형 선택",
        reaction: "교수: 문장을 외우면 응용 문제에서 흔들릴 수 있어요.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 7 },
      },
      {
        text: "교수님 표정만 봐도 답이 보이는 것 같아요.",
        preview: "감정선 강화",
        reaction: "교수: 표정 해석보다 개념 해석이 더 안전합니다.",
        emotion: "teasing",
        effects: { affinity: 9, intellect: 6 },
      },
    ],
  },
  SUNSET_YARD: {
    dialogue: "교수: 해 질 무렵엔 멘탈이 흔들리기 쉽죠. 지금 리듬을 정합시다.",
    choices: [
      {
        text: "30분 공부, 10분 휴식으로 리듬 맞출게요.",
        preview: "리듬 최적화",
        reaction: "교수: 좋아요. 리듬을 지키면 불안이 줄어듭니다.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "휴식 없이 끝까지 달려볼게요.",
        preview: "극한 집중",
        reaction: "교수: 단기적으로는 가능하지만, 후반 흔들림을 감수해야 해요.",
        emotion: "stern",
        effects: { affinity: 5, intellect: 8 },
      },
      {
        text: "응원 한마디만 해주시면 버틸 수 있어요.",
        preview: "정서 의존",
        reaction: "교수: 잘하고 있어요. 다만 내일은 스스로 버티는 연습도 필요하죠.",
        emotion: "warm",
        effects: { affinity: 10, intellect: 6 },
      },
    ],
  },
  CONVENIENCE_STORE: {
    dialogue: "교수: 시험 전날 밤, 마지막 선택은 언제나 단순해야 합니다.",
    choices: [
      {
        text: "필기 하나만 보고 바로 잘게요.",
        preview: "수면 우선",
        reaction: "교수: 가장 실전적인 선택이네요. 내일의 집중력이 달라집니다.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 12 },
      },
      {
        text: "한 챕터만 더 보고 잘게요.",
        preview: "적당한 욕심",
        reaction: "교수: 욕심을 조절하면 좋은 결과로 이어질 수 있어요.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 9 },
      },
      {
        text: "밤새서 완벽하게 끝내겠습니다.",
        preview: "하이리스크",
        reaction: "교수: 완벽보다 안정이 시험엔 더 강합니다.",
        emotion: "stern",
        effects: { affinity: 5, intellect: 6 },
      },
    ],
  },
  NIGHT_BENCH: {
    dialogue: "교수: 불안할수록 기준을 좁히세요. 지금 필요한 건 확신 한 줄입니다.",
    choices: [
      {
        text: "핵심 개념 5개만 확실히 잡을래요.",
        preview: "축약형 전략",
        reaction: "교수: 네, 그 다섯 개가 내일의 중심축이 될 겁니다.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 11 },
      },
      {
        text: "모든 개념을 얕게라도 훑을래요.",
        preview: "광범위 확인",
        reaction: "교수: 넓게 보는 건 좋지만, 깊이가 빠지지 않게 조심하세요.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 8 },
      },
      {
        text: "교수님 생각하면서 멘탈부터 챙길래요.",
        preview: "감정 안정형",
        reaction: "교수: 멘탈 관리도 중요하죠. 다만 마지막은 반드시 개념으로 마무리해요.",
        emotion: "awkward",
        effects: { affinity: 10, intellect: 6 },
      },
    ],
  },
  DAWN_REVIEW: {
    dialogue: "교수: 새벽 복습은 답을 늘리기보다 실수를 줄이는 시간입니다.",
    choices: [
      {
        text: "자주 틀린 유형만 다시 확인할게요.",
        preview: "오답 집중",
        reaction: "교수: 네, 그게 가장 높은 효율이에요.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 12 },
      },
      {
        text: "처음부터 끝까지 다시 빠르게 볼게요.",
        preview: "전체 순환",
        reaction: "교수: 빠르게 훑되, 중요한 포인트에서 멈출 줄 알아야 해요.",
        emotion: "neutral",
        effects: { affinity: 6, intellect: 9 },
      },
      {
        text: "이제 운에 맡기고 산책할래요.",
        preview: "기분 전환",
        reaction: "교수: 산책은 좋아요. 다만 최소한의 확인은 하고 가요.",
        emotion: "teasing",
        effects: { affinity: 8, intellect: 6 },
      },
    ],
  },
  EXAM_HALL: {
    dialogue: "교수: 시험지 배부 직전입니다. 마지막으로 스스로에게 어떤 말을 건넬 건가요?",
    choices: [
      {
        text: "근거부터 쓰자, 천천히 가자.",
        preview: "정석형 마인드셋",
        reaction: "교수: 좋아요. 그 한 문장이 오늘 답안 전체를 지켜줄 겁니다.",
        emotion: "warm",
        effects: { affinity: 6, intellect: 12 },
      },
      {
        text: "어려우면 과감히 넘기고 쉬운 것부터.",
        preview: "실전 운영형",
        reaction: "교수: 운영 감각이 있네요. 페이스만 잃지 마세요.",
        emotion: "neutral",
        effects: { affinity: 7, intellect: 10 },
      },
      {
        text: "교수님을 믿고 감으로 찍겠습니다.",
        preview: "위험한 농담",
        reaction: "교수: 믿음은 고맙지만, 점수는 근거에서 나옵니다.",
        emotion: "stern",
        effects: { affinity: 9, intellect: 5 },
      },
    ],
  },
};

const chapterGroups: Record<1 | 2 | 3 | 4 | 5 | 6, ChapterId[]> = {
  1: ["ORIENTATION_GATE", "STONE_STAIRS"],
  2: ["CAMPUS_CAFE", "CLASSROOM"],
  3: ["TEAM_PROJECT", "LIBRARY"],
  4: ["LAB_CORRIDOR", "SUNSET_YARD"],
  5: ["CONVENIENCE_STORE", "NIGHT_BENCH"],
  6: ["DAWN_REVIEW", "EXAM_HALL"],
};

function pickOne<T>(items: T[]) {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

export function pickSixChaptersForRun() {
  const picked: ChapterId[] = [];
  const groupOrder = [1, 2, 3, 4, 5, 6] as const;

  groupOrder.forEach((groupKey) => {
    picked.push(pickOne(chapterGroups[groupKey]));
  });

  return picked;
}

export const chapterSequence: ChapterId[] = pickSixChaptersForRun();

export const endingMeta: Record<
  EndingRank,
  { key: string; title: string; description: string }
> = {
  ENDING_1: {
    key: "ending-1",
    title: "엔딩 1 (임시): 캠퍼스의 전설",
    description:
      "시험도, 감정도, 페이스도 모두 완성도 높게 마무리했습니다. 교수님은 마지막까지 냉정했지만, 그 눈빛엔 분명한 신뢰가 남았습니다.",
  },
  ENDING_2: {
    key: "ending-2",
    title: "엔딩 2 (임시): 안정적인 합격선",
    description:
      "완벽하진 않았지만 전략적으로 잘 버텨냈습니다. 교수님은 짧게 고개를 끄덕이며 다음 성장을 기대한다고 말합니다.",
  },
  ENDING_3: {
    key: "ending-3",
    title: "엔딩 3 (임시): 간신히 생환",
    description:
      "아슬아슬한 선택들이 이어졌지만 끝내 시험장을 걸어나왔습니다. 결과보다도 끝까지 포기하지 않은 태도가 인상적으로 남았습니다.",
  },
  ENDING_4: {
    key: "ending-4",
    title: "엔딩 4 (임시): 재정비 필요",
    description:
      "흔들림이 많았고 준비가 다소 부족했습니다. 교수님은 냉정한 피드백과 함께 다음 시험을 위한 구체적인 보완 포인트를 남깁니다.",
  },
  ENDING_5: {
    key: "ending-5",
    title: "엔딩 5 (임시): 리스타트",
    description:
      "이번 시험은 분명 쉽지 않았고 결과도 아쉬웠습니다. 하지만 이 플레이는 실패가 아니라 다음 라운드를 위한 데이터가 됩니다.",
  },
};

export const finalRealityLine =
  "이제 현실세계로 돌아가 공부를 할 시간이야.";

export function getEndingRank(totalScore100: number): EndingRank {
  if (totalScore100 >= 81) {
    return "ENDING_1";
  }

  if (totalScore100 >= 61) {
    return "ENDING_2";
  }

  if (totalScore100 >= 41) {
    return "ENDING_3";
  }

  if (totalScore100 >= 21) {
    return "ENDING_4";
  }

  return "ENDING_5";
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
