export type ChapterScoreKey = "relationship" | "strategy" | "nerve";

type TraitOption = {
  label: string;
  value: string;
};

export type ProfessorFormState = {
  name: string;
  hair: string;
  eyes: string;
  nose: string;
  face: string;
  vibe: string;
  customPrompt: string;
};

export const professorTraits: Record<
  "hair" | "eyes" | "nose" | "face" | "vibe",
  TraitOption[] & { label?: string }
> = {
  hair: Object.assign(
    [
      { label: "단정한 흑발", value: "단정한 흑발" },
      { label: "자연스러운 반곱슬", value: "자연스러운 반곱슬" },
      { label: "새치 섞인 포마드", value: "새치 섞인 포마드" },
      { label: "묶은 긴 머리", value: "묶은 긴 머리" },
    ],
    { label: "머리" },
  ),
  eyes: Object.assign(
    [
      { label: "날카로운 눈매", value: "날카로운 눈매" },
      { label: "피곤해 보이는 눈빛", value: "피곤해 보이는 눈빛" },
      { label: "웃는 듯한 눈매", value: "웃는 듯한 눈매" },
      { label: "안경 너머 차분한 눈", value: "안경 너머 차분한 눈" },
    ],
    { label: "눈" },
  ),
  nose: Object.assign(
    [
      { label: "높고 반듯한 코", value: "높고 반듯한 코" },
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
      { label: "냉철한 카리스마", value: "냉철한 카리스마" },
      { label: "무심한 츤데레", value: "무심한 츤데레" },
      { label: "예민하지만 공정함", value: "예민하지만 공정함" },
      { label: "포커페이스 장인", value: "포커페이스 장인" },
    ],
    { label: "분위기" },
  ),
};

export const scoreLabels: Record<ChapterScoreKey, string> = {
  relationship: "교수 대응력",
  strategy: "시험 전략",
  nerve: "멘탈 유지력",
};

export const chapters = [
  {
    title: "시험 전날 밤, 기숙사",
    scene: "단톡방에는 정체불명의 족보 PDF가 떠돌고, 머릿속에는 교수님의 한마디가 맴돌아요.",
    location: "기숙사 방",
    backdrop:
      "linear-gradient(180deg, rgba(8,15,35,0.18), rgba(8,15,35,0.62)), linear-gradient(135deg, #1e293b 0%, #312e81 42%, #0f172a 100%)",
    description:
      "{professorName}이(가) 수업 마지막에 '핵심은 이미 다 말했다'고 했던 순간이 자꾸 떠오른다. 지금 필요한 건 무작정 밤새우는 용기일까, 아니면 선택과 집중일까.",
    choices: [
      {
        label: "족보 PDF를 훑고 핵심 키워드만 정리한다",
        preview: "MVP 이후 PDF 주입 기능과 자연스럽게 연결될 선택지예요.",
        outcome: "모든 페이지를 읽진 못했지만, 반복되는 개념 몇 개가 눈에 들어왔다.",
        effects: {
          strategy: 4,
          nerve: 1,
        },
      },
      {
        label: "교수님 말투를 복기하며 예상 서술형을 적어본다",
        preview: "교수 페르소나를 파악하면 의외로 문제 의도가 보일 수도 있어요.",
        outcome: "평소 교수님이 자주 강조하던 표현이 답안 문장처럼 머리에 남기 시작했다.",
        effects: {
          relationship: 3,
          strategy: 2,
        },
      },
      {
        label: "일단 카페인에 맡기고 새벽 올인 모드로 간다",
        preview: "단기 폭발력은 있지만 흔들릴 가능성도 커요.",
        outcome: "초반엔 집중이 잘됐지만 새벽이 깊어질수록 눈꺼풀이 무거워졌다.",
        effects: {
          strategy: 2,
          nerve: -1,
        },
      },
    ],
  },
  {
    title: "중앙도서관, 마지막 정리",
    scene: "친구들이 각자 다른 정보로 흔들고, 불안은 점점 정교해집니다.",
    location: "중앙도서관",
    backdrop:
      "linear-gradient(180deg, rgba(31,41,55,0.18), rgba(31,41,55,0.62)), linear-gradient(135deg, #0f766e 0%, #155e75 45%, #164e63 100%)",
    description:
      "중도에 도착하자 누군가는 '이번엔 암기형'이라고 하고, 누군가는 '{professorName}은 절대 그렇게 안 낸다'고 말한다. 이 혼란 속에서 어떤 태도를 고를지가 중요하다.",
    choices: [
      {
        label: "친구 두 명과 15분 모의 구술을 한다",
        preview: "말로 설명해보면 빈 구멍이 빨리 드러나요.",
        outcome: "설명이 막히는 부분이 분명히 드러났고, 오히려 마지막 보완 포인트가 선명해졌다.",
        effects: {
          relationship: 2,
          strategy: 3,
          nerve: 1,
        },
      },
      {
        label: "소문은 차단하고 내가 정리한 1페이지 노트만 본다",
        preview: "흔들리지 않는 선택. 대신 예측 밖 문제가 나오면 타격이 있어요.",
        outcome: "마음은 차분해졌고, 적어도 내가 뭘 알고 모르는지는 분명해졌다.",
        effects: {
          strategy: 2,
          nerve: 3,
        },
      },
      {
        label: "교수님 연구실 앞을 지나며 분위기를 슬쩍 본다",
        preview: "조금은 비현실적이지만 이 게임다운 선택지예요.",
        outcome: "연구실 문틈 사이로 들리는 통화에서 이번 시험의 결이 아주 살짝 읽혔다.",
        effects: {
          relationship: 4,
          nerve: 1,
        },
      },
    ],
  },
  {
    title: "시험장 입실 5분 전",
    scene: "마지막 순간, 가장 사소한 선택이 전체 분위기를 바꿉니다.",
    location: "시험장 앞 복도",
    backdrop:
      "linear-gradient(180deg, rgba(88,28,13,0.16), rgba(88,28,13,0.58)), linear-gradient(135deg, #7c2d12 0%, #b45309 38%, #f59e0b 100%)",
    description:
      "{professorName}이(가) 강의실 앞에 서 있다. 학생들 얼굴을 하나씩 훑어보는 그 짧은 순간, 괜히 시선이 마주친 것 같다. 이제 정말 마지막 선택이다.",
    choices: [
      {
        label: "눈을 피하지 않고 차분히 인사한다",
        preview: "관계 점수를 올리기 좋은 선택지예요.",
        outcome: "교수님은 아주 미세하게 고개를 끄덕였고, 이상하게 심장이 덜 떨렸다.",
        effects: {
          relationship: 4,
          nerve: 2,
        },
      },
      {
        label: "복도에서 마지막 암기 포인트만 속으로 읊는다",
        preview: "정석적이지만 효과가 분명한 마무리입니다.",
        outcome: "문장을 외운 것이 아니라 구조를 기억한 덕분에 머리가 정리되었다.",
        effects: {
          strategy: 3,
          nerve: 2,
        },
      },
      {
        label: "친구에게 농담을 던지며 긴장을 날려본다",
        preview: "멘탈 회복형 선택지예요.",
        outcome: "웃음이 터지자 손의 떨림은 줄었지만, 마지막 집중 한 조각은 조금 흩어졌다.",
        effects: {
          nerve: 4,
          relationship: 1,
        },
      },
    ],
  },
] as const;

export const endings = {
  legend: {
    key: "legend",
    title: "A+ 직감 엔딩",
    description:
      "{professorName}의 결을 읽어낸 당신은 문제를 푸는 동안 이상하리만치 침착했다. 시험이 끝난 뒤, '자, 이제 현실세계로 돌아가 공부를 할 시간이야'라는 말이 농담처럼 들릴 정도였다.",
  },
  survivor: {
    key: "survivor",
    title: "무사 생환 엔딩",
    description:
      "완벽하진 않았지만, {professorName}의 시험장에서 끝까지 버텨냈다. 시험 종료 종이 울리는 순간 '망했다'보다는 '어떻게든 해냈다'가 먼저 떠오른다.",
  },
  crash: {
    key: "crash",
    title: "벼락치기 후유증 엔딩",
    description:
      "{professorName}의 한 문제 한 문제가 유난히 길게 느껴졌다. 그래도 이 엔딩은 실패라기보다 다음 플레이에서 어떤 선택을 줄여야 하는지 알려주는 첫 데이터에 가깝다.",
  },
} as const;
