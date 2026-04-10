export type GameScoreKey = "affinity" | "intellect";
export type DialogueEmotion =
  | "neutral"
  | "stern"
  | "teasing"
  | "awkward"
  | "warm"
  | "panic";

export type ChapterId =
  | "STONE_STAIRS"
  | "CLASSROOM"
  | "LIBRARY"
  | "INTERSECTION"
  | "EXAM";

export type EndingRank = "S" | "A" | "B" | "F";
export type ProfessorGender =
  | "남성"
  | "여성"
  | "논바이너리"
  | "미정(중성 표현)";

type TraitOption = {
  label: string;
  value: string;
};

export type ProfessorFormState = {
  name: string;
  gender: ProfessorGender;
  voiceName: string;
  hair: string;
  eyes: string;
  nose: string;
  face: string;
  vibe: string;
  customPrompt: string;
  studyNotes: string;
  examDeadline: string;
};

export type ChapterInfo = {
  id: ChapterId;
  title: string;
  location: string;
  scene: string;
  backdrop: string;
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

export const chapterSequence: ChapterId[] = [
  "STONE_STAIRS",
  "CLASSROOM",
  "LIBRARY",
  "INTERSECTION",
  "EXAM",
];

export const chapterInfoMap: Record<ChapterId, ChapterInfo> = {
  STONE_STAIRS: {
    id: "STONE_STAIRS",
    title: "돌계",
    location: "돌계단",
    scene: "배달 음식과 캠퍼스의 낭만",
    backdrop:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80",
    keywords: ["식후아아", "메뉴추천", "길빵", "낮잠"],
  },
  CLASSROOM: {
    id: "CLASSROOM",
    title: "각자 건물 강의실",
    location: "전공 강의실",
    scene: "질문하는 척하며 기분 탐색",
    backdrop:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    keywords: ["학점방어", "교수님성대모사", "종강언제", "PDF오류"],
  },
  LIBRARY: {
    id: "LIBRARY",
    title: "중앙도서관",
    location: "중도 자판기 앞",
    scene: "새벽 2시, 안광 상실한 만남",
    backdrop:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=80",
    keywords: ["핫식스", "안광상실", "과잠", "도서관귀신"],
  },
  INTERSECTION: {
    id: "INTERSECTION",
    title: "고민사거리",
    location: "음식점/술집 거리",
    scene: "우연한 저녁 만남",
    backdrop:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
    keywords: ["우연한만남", "인생조언", "알코올지수", "내돈내산"],
  },
  EXAM: {
    id: "EXAM",
    title: "시험치는 강의실",
    location: "결전의 강의실",
    scene: "시험지 배부 직전",
    backdrop:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1600&q=80",
    keywords: ["OMR카드", "재수강금지", "펜떨어지는소리", "마지막플러팅"],
  },
};

export const chapterFallbackDialogues: Record<ChapterId, ChapterDialogue> = {
  STONE_STAIRS: {
    dialogue:
      "배달 앱 알림이 울리는 순간, 산책 나온 교수님이 돌계단 아래에서 올려다본다. 묘하게 핑크빛 필터가 낀 것 같은데, 분위기는 전혀 달콤하지 않다.",
    choices: [
      {
        text: "교수님, 이 떡볶이 한 입 하시면 시험 범위 1페이지 줄여주시나요?",
        preview: "무례 직전의 농담, 하지만 타이밍은 완벽할지도.",
        reaction: "허허... 자네 협상력이 늘었군. 범위는 그대로지만 센스는 인정하지.",
        emotion: "teasing",
        effects: { affinity: 7, intellect: 2 },
      },
      {
        text: "교수님 학부생 때도 여기서 짜장면 드셨나요? 노하우 전수 부탁드립니다.",
        preview: "안전하고 공감형 접근.",
        reaction: "그땐 지금보다 더 처절했네. 메뉴보다 루틴을 배워가게.",
        emotion: "warm",
        effects: { affinity: 5, intellect: 5 },
      },
      {
        text: "배달 기사님인 줄 알고 손 흔들 뻔했어요. 너무 힙하셔서요.",
        preview: "맑눈광 플러팅의 정석.",
        reaction: "얘 봐라... 기분은 나쁘지 않군. 대신 내일 문제는 더 힙할 수도 있어.",
        emotion: "teasing",
        effects: { affinity: 8, intellect: 1 },
      },
    ],
  },
  CLASSROOM: {
    dialogue:
      "수업 직후 강의실. 교수님은 노트를 정리하며 나가려다 멈췄다. 질문을 할지, 눈치껏 빠질지 선택의 시간이다.",
    choices: [
      {
        text: "방금 설명하신 부분, PDF 4페이지랑 다른데 교수님의 밀당인가요?",
        preview: "팩트 체크 + 도발의 조합.",
        reaction: "자료를 그냥 외우지 않았단 뜻이군. 그런 태도는 점수로 남는다.",
        emotion: "stern",
        effects: { affinity: 4, intellect: 8 },
      },
      {
        text: "시험 문제, 교수님 얼굴처럼 아름답게 내주실 거죠?",
        preview: "위험하지만 분위기를 띄우는 농담.",
        reaction: "아름다움은 상대적인 법이지. 다만 준비한 자에겐 친절할 걸세.",
        emotion: "teasing",
        effects: { affinity: 6, intellect: 3 },
      },
      {
        text: "수업 듣다가 대학원 생각이 스쳤습니다. 이게 정상인가요?",
        preview: "의욕 어필형 고위험 선택.",
        reaction: "정상은 아니지만, 좋은 징후일 수도 있지. 근거를 가지고 다시 오게.",
        emotion: "warm",
        effects: { affinity: 5, intellect: 7 },
      },
    ],
  },
  LIBRARY: {
    dialogue:
      "새벽 2시, 자판기 불빛 아래 교수님과 눈이 마주친다. 도서관 공기는 차갑고, 농담은 이상하게 뜨겁다.",
    choices: [
      {
        text: "교수님 지금 문제 꼬는 중 아니죠? 전 이미 꼬였습니다.",
        preview: "공포를 유머로 전환.",
        reaction: "문제는 꼬지 않고 사고력을 확인할 뿐일세. 자네가 먼저 꼬였군.",
        emotion: "stern",
        effects: { affinity: 5, intellect: 6 },
      },
      {
        text: "제 안광 보이세요? 교수님 전공서적이 가져갔어요.",
        preview: "피곤함을 드립으로 포장.",
        reaction: "안광은 잃어도 맥락은 잃지 말게. 그 한 줄이 답안을 살린다.",
        emotion: "warm",
        effects: { affinity: 4, intellect: 7 },
      },
      {
        text: "교수님이랑 밤샘이라니... 이거 데이트 맞죠? (광기)",
        preview: "위험한 맑눈광 정면돌파.",
        reaction: "데이트는 모르겠고, 공부 파트너로는 봐줄 만하군. 집중하자고.",
        emotion: "awkward",
        effects: { affinity: 9, intellect: 0 },
      },
    ],
  },
  INTERSECTION: {
    dialogue:
      "해장국집 문을 열자 교수님이 혼자 앉아 있다. 강의실 밖의 교수님은 낯설고, 그래서 더 어렵다.",
    choices: [
      {
        text: "교수님 여기선 동네 형 같아요. 계산은... 마음만 낼게요.",
        preview: "예의와 플러팅 사이.",
        reaction: "마음만 받지. 대신 내일 답안엔 마음보다 논리를 담게.",
        emotion: "warm",
        effects: { affinity: 7, intellect: 4 },
      },
      {
        text: "시험 전날엔 소주파인가요 맥주파인가요? 인생 공식 궁금합니다.",
        preview: "조언 유도형 질문.",
        reaction: "시험 전날엔 물과 수면이지. 공식은 간단해도 지키기 어렵다네.",
        emotion: "stern",
        effects: { affinity: 3, intellect: 8 },
      },
      {
        text: "맛집 찾는 센스까지... 교수님 쩝쩝박사 학위도 있으시네요.",
        preview: "가벼운 칭찬으로 라포 형성.",
        reaction: "학위가 많으면 피곤해져. 자네는 우선 이번 과목부터 졸업하게.",
        emotion: "teasing",
        effects: { affinity: 8, intellect: 2 },
      },
    ],
  },
  EXAM: {
    dialogue:
      "시험지 배부 직전. 펜 떨어지는 소리까지 크게 들린다. 교수님이 교단에서 마지막으로 교실을 훑는다.",
    choices: [
      {
        text: "시험지가 두꺼운 건 제 사랑의 무게인가요?",
        preview: "마지막 플러팅, 마지막 도박.",
        reaction: "사랑은 모르겠고, 분량은 공평하지. 끝까지 버텨보게.",
        emotion: "stern",
        effects: { affinity: 6, intellect: 3 },
      },
      {
        text: "답 대신 편지 쓰면 읽어주실 건가요?",
        preview: "감성형 무모함.",
        reaction: "편지는 나중에. 지금은 답안지에 근거를 쓰게.",
        emotion: "awkward",
        effects: { affinity: 4, intellect: 4 },
      },
      {
        text: "현실세계 복귀 멘트 미리 부탁드립니다. 각오하고 싶어요.",
        preview: "메타 유머 + 정신력 회복.",
        reaction:
          "좋군. 자 민상군! 이제 현실세계로 돌아가 공부를 할 시간이야. 시작하세.",
        emotion: "warm",
        effects: { affinity: 5, intellect: 7 },
      },
    ],
  },
};

export const professorTraits: Record<
  "hair" | "eyes" | "nose" | "face" | "vibe",
  TraitOption[] & { label?: string }
> = {
  hair: Object.assign(
    [
      { label: "단정한 포마드", value: "단정한 포마드" },
      { label: "자연스러운 반곱슬", value: "자연스러운 반곱슬" },
      { label: "묶은 장발", value: "묶은 장발" },
      { label: "새치 섞인 클래식 컷", value: "새치 섞인 클래식 컷" },
    ],
    { label: "헤어" },
  ),
  eyes: Object.assign(
    [
      { label: "날카로운 눈매", value: "날카로운 눈매" },
      { label: "부드러운 눈매", value: "부드러운 눈매" },
      { label: "안경 너머 차분한 눈", value: "안경 너머 차분한 눈" },
      { label: "피곤하지만 맑은 눈", value: "피곤하지만 맑은 눈" },
    ],
    { label: "눈매" },
  ),
  nose: Object.assign(
    [
      { label: "오똑한 콧날", value: "오똑한 콧날" },
      { label: "작고 둥근 코", value: "작고 둥근 코" },
      { label: "매부리 느낌 코", value: "매부리 느낌 코" },
    ],
    { label: "코" },
  ),
  face: Object.assign(
    [
      { label: "각진 얼굴형", value: "각진 얼굴형" },
      { label: "갸름한 얼굴형", value: "갸름한 얼굴형" },
      { label: "둥근 얼굴형", value: "둥근 얼굴형" },
    ],
    { label: "얼굴형" },
  ),
  vibe: Object.assign(
    [
      { label: "무심한 츤데레", value: "무심한 츤데레" },
      { label: "냉철한 멘토", value: "냉철한 멘토" },
      { label: "유머 있는 철벽", value: "유머 있는 철벽" },
      { label: "다정한 독설가", value: "다정한 독설가" },
    ],
    { label: "분위기" },
  ),
};

export const professorGenderOptions: Array<{ label: string; value: ProfessorGender }> = [
  { label: "남성", value: "남성" },
  { label: "여성", value: "여성" },
  { label: "논바이너리", value: "논바이너리" },
  { label: "미정(중성 표현)", value: "미정(중성 표현)" },
];

export const professorVoiceOptions: Array<{
  label: string;
  value: string;
  genders: ProfessorGender[];
}> = [
  {
    label: "Neural2 B · 여성 톤",
    value: "ko-KR-Neural2-B",
    genders: ["여성"],
  },
  {
    label: "Neural2 C · 남성 톤",
    value: "ko-KR-Neural2-C",
    genders: ["남성"],
  },
  {
    label: "Standard A · 여성 톤",
    value: "ko-KR-Standard-A",
    genders: ["여성"],
  },
  {
    label: "Standard B · 여성 톤",
    value: "ko-KR-Standard-B",
    genders: ["여성"],
  },
  {
    label: "Standard C · 남성 톤",
    value: "ko-KR-Standard-C",
    genders: ["남성"],
  },
  {
    label: "Standard D · 남성 톤",
    value: "ko-KR-Standard-D",
    genders: ["남성"],
  },
  {
    label: "WaveNet A · 여성 톤",
    value: "ko-KR-Wavenet-A",
    genders: ["여성"],
  },
  {
    label: "WaveNet B · 여성 톤",
    value: "ko-KR-Wavenet-B",
    genders: ["여성"],
  },
  {
    label: "WaveNet C · 남성 톤",
    value: "ko-KR-Wavenet-C",
    genders: ["남성"],
  },
  {
    label: "WaveNet D · 남성 톤",
    value: "ko-KR-Wavenet-D",
    genders: ["남성"],
  },
  {
    label: "중성 추천 · Neural2 B",
    value: "ko-KR-Neural2-B",
    genders: ["논바이너리", "미정(중성 표현)"],
  },
  {
    label: "중성 추천 · Neural2 C",
    value: "ko-KR-Neural2-C",
    genders: ["논바이너리", "미정(중성 표현)"],
  },
];

export const endingMeta: Record<
  EndingRank,
  { key: string; title: string; description: string }
> = {
  S: {
    key: "graduate-school",
    title: "[S랭크] 대학원생 엔딩 (납치형)",
    description:
      "자네, 싹수가 노란데... 나랑 같이 연구해 보지 않겠나? 교수님은 농담처럼 말했지만 연구실 자리 배치는 이미 끝난 듯하다.",
  },
  A: {
    key: "valedictorian",
    title: "[A랭크] 수석 졸업 엔딩 (성공형)",
    description:
      "민상군, 자네는 내 최고의 제자였네. A+ 성적표가 조용히 책상 위에 내려앉는다.",
  },
  B: {
    key: "partner",
    title: "[B랭크] 비즈니스 파트너 엔딩 (평범형)",
    description:
      "수고했네. F는 면했군. 나가서 밥이나 먹게. 어색하지만 따뜻한 악수가 이어진다.",
  },
  F: {
    key: "retake",
    title: "[F랭크] 재수강 엔딩 (공포형)",
    description:
      "민상군... 우리 다음 학기에 또 보겠군? 교수님의 섬뜩한 미소와 함께 시간표 앱이 열린다.",
  },
};

export const finalRealityLine =
  "자 민상군! 이제 꿈에서 깨어나세요. 이제 현실세계로 돌아가 공부를 할 시간이야.";

export function getEndingRank(totalScore: number): EndingRank {
  if (totalScore >= 72) {
    return "S";
  }

  if (totalScore >= 56) {
    return "A";
  }

  if (totalScore >= 38) {
    return "B";
  }

  return "F";
}

export function buildProfessorSummary(form: ProfessorFormState) {
  const name = form.name.trim() || "이름 미정 교수님";
  const selectedTraits = [form.face, form.hair, form.eyes, form.nose]
    .map((trait) => trait.trim())
    .filter((trait) => trait.length > 0);
  const appearanceDescription =
    selectedTraits.length > 0 ? selectedTraits.join(", ") : "외형 정보 일부 미정";
  const vibe = form.vibe.trim() || "분위기 미정";
  const customPrompt =
    form.customPrompt.trim() || "웃으며 압박하는 타입, 하지만 실력은 확실히 챙겨주는 타입";

  return `${name}은(는) ${form.gender} 교수 설정이다. 외형은 ${appearanceDescription}이며 전체 분위기는 ${vibe}다. 학생 입장에서는 ${customPrompt}으로 느껴진다.`;
}

export function buildIllustrationPrompt(form: ProfessorFormState) {
  const selectedTraits = [form.face, form.hair, form.eyes, form.nose, form.vibe]
    .map((trait) => trait.trim())
    .filter((trait) => trait.length > 0);

  const visualTraits =
    selectedTraits.length > 0
      ? selectedTraits
      : ["clean academic outfit", "stylish but professional", "expressive face"];

  return [
    "full-body 2D Korean campus visual novel professor sprite",
    "anime dating sim aesthetic",
    "standing pose",
    "safe for work, professional academic attire",
    `gender presentation: ${form.gender}`,
    ...visualTraits,
    form.customPrompt.trim() || "soft pink highlights, dramatic expression, polished game art",
  ].join(", ");
}

export function getDefaultExamDeadline() {
  const target = new Date();
  target.setDate(target.getDate() + 7);
  target.setHours(9, 0, 0, 0);
  const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
