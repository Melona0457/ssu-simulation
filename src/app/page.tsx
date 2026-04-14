"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { heartParticle } from "@/lib/heart-particle";
import {
  buildIllustrationPrompt,
  buildProfessorSummary,
  chapterFallbackDialogues,
  chapterInfoMap,
  clampScore100,
  dinnerNightBranchByChoice,
  endingMeta,
  finalRealityLine,
  getEndingRank,
  MAIN_BGM_URL,
  morningLunchBranchByChoice,
  pickSixChaptersForRun,
  playerGenderOptions,
  professorFeatureSuggestions,
  professorGenderOptions,
  professorSpeakingStyleOptions,
  resolveProfessorForGeneration,
  sessionPackEpisodeIds,
  type ChapterChoice,
  type ChapterDialogue,
  type ChapterId,
  type EndingRank,
  type PlayerFormState,
  type ProfessorFormState,
} from "@/lib/game-data";

type Phase =
  | "screen1_title"
  | "screen2_player"
  | "screen3_professor"
  | "screen4_8_chapter"
  | "screen9_ending"
  | "screen10_reality"
  | "screen11_credit";

type EndingState = {
  rank: ReturnType<typeof getEndingRank>;
  title: string;
  description: string;
  score100: number;
};

type SessionExpressionDefinition = {
  key: string;
  label: string;
  direction: string;
  reason: string;
};

type ChapterSpriteCue = {
  dialogueExpressionKey: string;
  choiceReactionExpressionKeys: [string, string, string];
};

type SessionPackResponse = {
  chapters?: Partial<Record<ChapterId, ChapterDialogue>>;
  endingPolish?: Partial<Record<EndingRank, { title?: string; description?: string }>>;
  expressionSet?: SessionExpressionDefinition[];
  spriteCues?: Partial<Record<ChapterId, ChapterSpriteCue>>;
  fallback?: boolean;
  message?: string;
};

type ProfessorExpressionMap = Record<string, string>;

type GenerateProfessorImageResponse = {
  imageDataUrl?: string;
  expressionSet?: SessionExpressionDefinition[];
  expressionImageDataUrls?: ProfessorExpressionMap;
  promptUsed?: string;
  message?: string;
};

type ChapterStep = {
  dialogue: string;
  choices: ChapterChoice[];
};

const chapterStepScripts: Partial<Record<ChapterId, ChapterStep[]>> = {
  COMMUTE_CAMPUS: [
    {
      dialogue:
        "아침 등굣길, 익숙한 뒷모습이 눈에 들어온다. 같은 방향으로 걷는 건 이번 학기 담당 교수님. 낯익으면서도 낯선 기분을 뒤로하고 강의실로 향한다.",
      choices: [],
    },
  ],
  MORNING_CLASSROOM: [
    {
      dialogue:
        "강의실 문을 열자 교수님의 시선이 꽂힌다. \"민상군, 15분 늦었군. 어서 앉게.\" 차가운 공기 속 첫 반응을 고른다.",
      choices: [
        {
          text: "교수님 수업은 1분 1초가 꿀잼이라 앞부분 놓친 게 손실입니다.",
          preview: "MZ식 넉살",
          reaction:
            "그 말재주로 논술을 치면 좋겠군. 안타깝게도 내 시험은 객관식이라네. 자, 7페이지 보게.",
          emotion: "teasing",
          effects: { affinity: 10, intellect: 7 },
        },
        {
          text: "죄송합니다. 밤새 복습하다가 깜빡 잠이 들었습니다.",
          preview: "정중한 사과",
          reaction:
            "노력은 가상하지만 효율 없는 노력은 인정받지 못하네. 그래도 얼굴을 보니 거짓말 같진 않군.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 9 },
        },
        {
          text: "(아무 말 없이 구석 자리로 가서 책을 편다.)",
          preview: "조용한 회피",
          reaction:
            "구석으로 숨는다고 못 볼 것 같나? 사각지대 기념으로 질문 하나 하지.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 8 },
        },
      ],
    },
    {
      dialogue:
        "수업 종료 직전 교수님이 칠판을 지우며 말한다. \"누군가는 웃고 나가고, 누군가는 내년에 다시 보겠지.\" 마지막 농담 한 마디를 던져본다.",
      choices: [
        {
          text: "교수님, 그럼 내년엔 강의실 말고 밖에서 뵙는 건가요?",
          preview: "가벼운 도발",
          reaction: "허, 입은 여전히 빠르군. 내일은 답안지도 그 속도로 써 보게.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 6 },
        },
        {
          text: "꼭 웃으면서 나가겠습니다. 교수님도 웃으며 성적 입력해 주세요.",
          preview: "안전한 다짐",
          reaction: "좋아. 웃게 만들고 싶다면 점수로 설득하게.",
          emotion: "warm",
          effects: { affinity: 8, intellect: 9 },
        },
      ],
    },
    {
      dialogue:
        "교수님이 펜을 건네며 말한다. \"내일 시험 끝나고 연구실로 직접 반납하러 오게.\" 머리가 복잡해진 채 점심 장소를 고른다.",
      choices: [
        {
          text: "학생 식당으로 간다.",
          preview: "점심 분기",
          reaction: "좋아. 빠르게 먹고 오후를 버텨보게.",
          emotion: "neutral",
          effects: { affinity: 7, intellect: 10 },
        },
        {
          text: "학교 앞 맛집으로 간다.",
          preview: "점심 분기",
          reaction: "기분 전환도 필요하지. 대신 시간 관리는 철저히.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 7 },
        },
        {
          text: "화장실 변기 칸으로 간다.",
          preview: "점심 분기",
          reaction: "극한의 생존 모드군. 오늘은 꽤 파란만장하겠어.",
          emotion: "awkward",
          effects: { affinity: 6, intellect: 5 },
        },
      ],
    },
  ],
  LUNCH_STUDENT_CAFETERIA: [
    {
      dialogue:
        "북적이는 학생 식당. 교수님이 식판을 내려놓고 맞은편에 앉는다. 갑작스러운 합석에 첫 반응을 선택한다.",
      choices: [
        {
          text: "커흑! 교수님? 여기서 식사를 하신다고요?",
          preview: "사레들림",
          reaction: "천천히 먹게. 여기서 숨 넘어가면 곤란하지 않겠나.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 6 },
        },
        {
          text: "아, 네! 앉으세요. 교수님도 학식 드시는 줄은 몰랐습니다.",
          preview: "체면 유지",
          reaction: "나도 사람인데 밥은 먹어야지. 많이 먹고 오후 버티게.",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 9 },
        },
        {
          text: "(동작 정지 상태로 교수님 식판 메뉴를 스캔한다.)",
          preview: "얼어붙음",
          reaction: "분석은 내 식판 말고 전공 책에 하게. 요구르트나 챙기고.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
    {
      dialogue:
        "긴장한 탓에 숟가락을 떨어뜨린다. 교수님이 먼저 새 수저를 올려두며 묻는다. \"내가 그렇게 불편한가?\"",
      choices: [
        {
          text: "감사합니다... 방금 머릿속에 슬로우 모션이 걸린 것 같아요.",
          preview: "솔직한 당황",
          reaction: "긴장은 줄이고 리듬을 되찾게. 시험 전엔 멘탈 관리가 우선이야.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 8 },
        },
        {
          text: "떨어진 건 수저인데, 왜 제 심장이 바닥에 있는 것 같죠?",
          preview: "넉살",
          reaction: "말은 잘하네. 그 기세를 내일 답안지에도 써먹어 보게.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 6 },
        },
      ],
    },
  ],
  LUNCH_OFFCAMPUS_RESTAURANT: [
    {
      dialogue:
        "학교 앞 작은 한식당. 교수님이 맞은편 의자를 당겨 앉는다. 메뉴판을 든 채 어색한 첫 반응을 고른다.",
      choices: [
        {
          text: "아, 네! 앉으세요. 메뉴는... 다 괜찮아요!",
          preview: "당황",
          reaction: "아직 못 정했군. 여기 된장찌개가 무난하네.",
          emotion: "warm",
          effects: { affinity: 8, intellect: 8 },
        },
        {
          text: "물론이죠. 교수님도 여기 오세요? 저는 처음이라서요.",
          preview: "침착한 대화",
          reaction: "가끔 오지. 번잡한 날엔 이런 곳이 생각보다 낫거든.",
          emotion: "neutral",
          effects: { affinity: 9, intellect: 9 },
        },
        {
          text: "(메뉴판 뒤에서 눈동자만 굴린다.)",
          preview: "표정 관리 실패",
          reaction: "같은 페이지만 보고 있더군. 천천히 골라도 되네.",
          emotion: "awkward",
          effects: { affinity: 7, intellect: 7 },
        },
      ],
    },
  ],
  LUNCH_RESTROOM_STALL: [
    {
      dialogue:
        "학생회관 화장실 맨 끝 칸. 변기칸 혼밥 중 옆 칸의 교수님에게 휴지를 넘겨준 뒤, 참기름 냄새와 기침 소리로 정체가 들킨다.",
      choices: [
        {
          text: "...네, 교수님. 접니다. 참치마요 먹고 있었습니다.",
          preview: "자포자기 인정",
          reaction:
            "세상에, 진짜 자네였어?! 오늘만큼은 따라오게. 이건 교육적으로 방치할 수 없네.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 4 },
        },
        {
          text: "아, 아뇨? 저는 지나가는 나그네입니다만!",
          preview: "어설픈 타인 행세",
          reaction: "그 목소리를 내가 모를 줄 아나. 남은 김밥 들고 나오게.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 6 },
        },
        {
          text: "(아무 대답 없이 숨을 꾹 참고 없는 척한다.)",
          preview: "숨참고 변기 다이브",
          reaction: "숨 참아도 소용없네. 확인하기 전에 스스로 나오게.",
          emotion: "panic",
          effects: { affinity: 7, intellect: 4 },
        },
      ],
    },
    {
      dialogue:
        "세면대 앞. 교수님은 변기칸 혼밥 괴담의 실체를 본 듯 한숨 쉬며 스테이크를 제안한다. 마지막 대응을 고른다.",
      choices: [
        {
          text: "기꺼이 받들겠습니다. 사실 스테이크 먹기 위해 위장을 비워뒀습니다.",
          preview: "뻔뻔 회복",
          reaction: "회복력이 기가 막히군. 좋아, 오늘은 한우로 기름칠해주지.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 5 },
        },
        {
          text: "아닙니다, 교수님! 이건 현대인의 트렌드 '미라클 런치'입니다.",
          preview: "현실 부정",
          reaction:
            "장염 지름길이겠지. 자존심은 내려두고 따라오게. 밥 한 끼도 사회생활 연습이야.",
          emotion: "stern",
          effects: { affinity: 8, intellect: 6 },
        },
        {
          text: "교수님... 이건 김밥이 아니라 제 서글픈 눈물입니다...",
          preview: "불쌍함 어필",
          reaction: "그 눈물, 오늘만은 한우 육즙으로 씻어내게나.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 4 },
        },
      ],
    },
  ],
  AFTERNOON_LIBRARY: [
    {
      dialogue:
        "오후 도서관. 교재는 눈에 안 들어오고 교수님이 건넨 펜만 자꾸 시야에 걸린다. 서가에서 마주친 교수님 앞에서 첫 반응을 고른다.",
      choices: [
        {
          text: "아— 네, 참고 도서 좀 찾으러요. (책을 떨어뜨린다.)",
          preview: "당황",
          reaction: "참고 도서치곤 전공과 거리가 있군. 그래도 기분 전환도 공부의 일부지.",
          emotion: "warm",
          effects: { affinity: 8, intellect: 9 },
        },
        {
          text: "네. 교수님은 논문 자료 찾으세요?",
          preview: "침착한 척",
          reaction: "그렇네. 이 책, 자네 시험 범위와 겹치니 훑어보게.",
          emotion: "neutral",
          effects: { affinity: 7, intellect: 11 },
        },
        {
          text: "(도망치려다 눈이 마주친다.)",
          preview: "도주 실패",
          reaction: "도서관까지 피해 다닐 건 없네. 자네는 자네 책을 찾게.",
          emotion: "awkward",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
    {
      dialogue:
        "서가 사이 어색한 정적. 교수님이 \"시험 전날만 되면 다들 후회하지\"라고 말한다. 마지막으로 한마디를 고른다.",
      choices: [
        {
          text: "저는 후회 안 하려고 지금 여기 있는 겁니다.",
          preview: "의지 선언",
          reaction: "그 의지, 좋네. 그럼 지금부터 한 줄이라도 더 보게.",
          emotion: "stern",
          effects: { affinity: 8, intellect: 10 },
        },
        {
          text: "교수님은 학생 때 시험 전날 뭐 하셨어요?",
          preview: "개인 질문",
          reaction: "나도 도서관에 왔지. 시험 전날 딴생각이 잘 되는 건 사람 다 똑같아.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 8 },
        },
      ],
    },
  ],
  LIGHT_DINNER: [
    {
      dialogue:
        "복잡한 마음으로 편의점 저녁을 마친다. 내일 시험 전 마지막 밤, 어디로 갈지 고른다.",
      choices: [
        {
          text: "집으로 간다.",
          preview: "밤 분기: 교수 연구실",
          reaction: "귀가길이군. 하지만 오늘 밤은 예상처럼 끝나지 않을 수도 있지.",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 8 },
        },
        {
          text: "강의실로 간다.",
          preview: "밤 분기: 강의실",
          reaction: "끝까지 붙잡겠다는 거군. 좋아, 잠들지만 않게.",
          emotion: "stern",
          effects: { affinity: 7, intellect: 11 },
        },
        {
          text: "학교 벤치로 간다.",
          preview: "밤 분기: 벤치",
          reaction: "잠깐 숨을 고르는 것도 필요하지. 마음부터 정리해 보게.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
  ],
  NIGHT_LAB_VISIT: [
    {
      dialogue:
        "연구실 불빛 앞에서 선택한다. 감사 인사를 하러 갈지, 그냥 칼퇴를 시도할지. 하지만 어느 쪽이든 결국 연구실의 커피 향과 진심 어린 이름 부름으로 수렴한다.",
      choices: [
        {
          text: "오늘 신세를 졌으니 감사 인사를 드리고 간다. (정공법)",
          preview: "루트 A",
          reaction: "들어오게. 물기부터 닦고, 커피 한 잔 하면서 정리하지.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 9 },
        },
        {
          text: "바로 집으로 간다. (칼퇴 시도)",
          preview: "루트 B",
          reaction:
            "하늘이 칼퇴를 허락하지 않는군. 비가 이렇게 오니 우선 연구실로 올라가세.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 8 },
        },
      ],
    },
    {
      dialogue:
        "빗속 정문 앞, 순백의 롤스로이스가 멈춘다. 교수님이 말한다. \"백마에 타는 영광을 주지.\" 마지막 선택을 고른다.",
      choices: [
        {
          text: "마음만 감사히 받을게요. 우산 쓰고 천천히 가겠습니다.",
          preview: "엔딩 A",
          reaction: "고집이 있군. 좋아, 그 독립심은 높이 사지. 내일 보세.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 10 },
        },
        {
          text: "실례하겠습니다. 태워 주세요.",
          preview: "엔딩 B",
          reaction: "하, 솔직하군. 타게. 오늘 자네 버킷리스트 하나는 이뤄주지.",
          emotion: "teasing",
          effects: { affinity: 12, intellect: 7 },
        },
        {
          text: "오늘은 좀 부담스럽습니다. 거리를 두고 싶어요.",
          preview: "엔딩 C",
          reaction: "그래, 선은 중요하지. 다만 시험에선 그 선과 별개로 최선을 다하게.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 9 },
        },
      ],
    },
  ],
  NIGHT_CAMPUS_WALK: [
    {
      dialogue:
        "노란 가로등 벤치 아래, 교수님이 묻는다. \"민상군, 얼굴에 고민이라고 쓰여 있는데.\" 먼저 어떤 고민을 꺼낼지 고른다.",
      choices: [
        {
          text: "제가 이 길이 맞는지 확신이 안 서요.",
          preview: "진지한 상담",
          reaction:
            "확신은 나도 매일 고민하네. 그래도 자네 소질은 내가 꽤 확신하고 있어.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 8 },
        },
        {
          text: "사실 저... 교수님 때문에 이 학과를 선택했어요.",
          preview: "깜짝 고백",
          reaction: "무모한가 용감한가... 그래도 책임감은 더 생기는군.",
          emotion: "teasing",
          effects: { affinity: 12, intellect: 6 },
        },
        {
          text: "교수님이 너무 완벽해 보여서 자괴감이 들어요.",
          preview: "감성 폭발",
          reaction: "완벽은 착시야. 그 감성은 자괴감 말고 답안지로 쓰게.",
          emotion: "neutral",
          effects: { affinity: 9, intellect: 9 },
        },
      ],
    },
    {
      dialogue:
        "말을 잇다 울컥한 순간, 교수님은 말없이 옆자리를 내어준다. 따뜻해진 공기 속 마지막 말을 고른다.",
      choices: [
        {
          text: "교수님이 보증하시면... 저 진짜 믿어도 되는 거죠?",
          preview: "신뢰 확인",
          reaction: "내 이름 걸고 보증하지. 내일, 자네 열정을 보여주게.",
          emotion: "warm",
          effects: { affinity: 11, intellect: 8 },
        },
        {
          text: "교수님 옆자리가 생각보다 따뜻하네요. 조금만 더 이러고 있어도 될까요?",
          preview: "여운 유지",
          reaction: "잠깐은 괜찮지. 다만 밤공기 차니 너무 늦진 않게.",
          emotion: "awkward",
          effects: { affinity: 10, intellect: 7 },
        },
      ],
    },
  ],
  NIGHT_SELF_STUDY: [
    {
      dialogue:
        "소등된 강의실, 비상등 아래에서 잠들었다 깬다. 문이 열리고 교수님 실루엣이 다가온다. \"...자고 있었군.\"",
      choices: [
        {
          text: "......교수님? 지금 몇 시예요.",
          preview: "멍한 확인",
          reaction:
            "열한 시가 넘었네. 뻔뻔하군. 마음에 들어. 30분만 더 하고 들어가게.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 10 },
        },
        {
          text: "아— 죄송합니다! 잠깐 눈 붙이려다가...",
          preview: "황급한 사과",
          reaction:
            "앉아. 갑자기 일어나면 어지럽네. 여기, 당 떨어졌을 테니 이거 챙기게.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 9 },
        },
        {
          text: "......교수님이 왜 여기 계세요. (아직 꿈인 줄 안다.)",
          preview: "멍한 질문",
          reaction:
            "꿈 아니야. 서류 두고 온 거지. 낙서할 여유 있으면 3단원은 다시 보게.",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 9 },
        },
      ],
    },
  ],
};

const initialPlayerState: PlayerFormState = {
  name: "",
  gender: "남자",
};

const initialProfessorState: ProfessorFormState = {
  name: "",
  gender: "여자",
  age: "30",
  speakingStyle: "",
  illustrationStyle: "DESIGN_3_CAMPUS_VISUAL_NOVEL",
  feature1: "",
  feature2: "",
  feature3: "",
  feature4: "",
  customPrompt: "",
};

const preGameBackgroundImageUrl = "/backgrounds/pre-game-bg.webp";
const mainCoverImageUrl = "/backgrounds/screen1-cover.webp";

function toDisplayPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "김멋사";
  }

  return trimmed.slice(0, 3);
}

function toDisplayProfessorName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "이름 미정 교수";
}

function toRealityProfessorLabel(name: string) {
  const base = toDisplayProfessorName(name);

  if (base.endsWith("교수님")) {
    return base;
  }

  if (base.endsWith("교수")) {
    return `${base}님`;
  }

  return `${base} 교수님`;
}

function choiceScore(choice: ChapterChoice) {
  const sum = choice.effects.affinity + choice.effects.intellect;
  return Math.max(0, Math.min(20, sum));
}

function stripProfessorPrefix(text: string) {
  return text
    .replace(/^\s*(교수님?|professor)\s*[:：]\s*/i, "")
    .replace(/^\s*(교수님?|professor)\s*[:：]\s*/i, "")
    .trim();
}

function getAffinityMood(percent: number) {
  if (percent >= 80) {
    return "두근두근";
  }

  if (percent >= 60) {
    return "호감 상승";
  }

  if (percent >= 35) {
    return "분위기 탐색";
  }

  return "어색한 시작";
}

function normalizeExpressionSet(
  raw: SessionExpressionDefinition[] | undefined,
): SessionExpressionDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: SessionExpressionDefinition[] = [];

  raw.forEach((item) => {
    const key = typeof item?.key === "string" ? item.key.trim() : "";
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push({
      key,
      label: typeof item?.label === "string" && item.label.trim().length > 0 ? item.label.trim() : key,
      direction: typeof item?.direction === "string" ? item.direction.trim() : "",
      reason: typeof item?.reason === "string" ? item.reason.trim() : "",
    });
  });

  return normalized;
}

function normalizeSpriteCueMap(
  raw: Partial<Record<ChapterId, ChapterSpriteCue>> | undefined,
): Partial<Record<ChapterId, ChapterSpriteCue>> {
  if (!raw) {
    return {};
  }

  return (Object.keys(raw) as ChapterId[]).reduce(
    (acc, chapterId) => {
      const source = raw[chapterId];
      const dialogueExpressionKey =
        typeof source?.dialogueExpressionKey === "string"
          ? source.dialogueExpressionKey.trim()
          : "";
      const sourceChoices = Array.isArray(source?.choiceReactionExpressionKeys)
        ? source.choiceReactionExpressionKeys
        : [];

      const choiceReactionExpressionKeys = [0, 1, 2].map((index) => {
        const candidate = sourceChoices[index];
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate.trim();
        }

        return dialogueExpressionKey;
      }) as [string, string, string];

      if (!dialogueExpressionKey || choiceReactionExpressionKeys.some((key) => !key)) {
        return acc;
      }

      acc[chapterId] = {
        dialogueExpressionKey,
        choiceReactionExpressionKeys,
      };
      return acc;
    },
    {} as Partial<Record<ChapterId, ChapterSpriteCue>>,
  );
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const HANGUL_MEDIAL_COUNT = 21;
const HANGUL_FINAL_COUNT = 28;
const HANGUL_INITIAL_BLOCK = HANGUL_MEDIAL_COUNT * HANGUL_FINAL_COUNT;
const HANGUL_INITIAL_COMPAT = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

function isHangulSyllable(char: string) {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_LAST;
}

function buildHangulTypingFrames(text: string) {
  const frames: string[] = [];
  let committed = "";

  const pushFrame = (value: string) => {
    if (frames[frames.length - 1] !== value) {
      frames.push(value);
    }
  };

  for (const char of text) {
    if (!isHangulSyllable(char)) {
      committed += char;
      pushFrame(committed);
      continue;
    }

    const syllableIndex = char.charCodeAt(0) - HANGUL_BASE;
    const initialIndex = Math.floor(syllableIndex / HANGUL_INITIAL_BLOCK);
    const medialIndex = Math.floor((syllableIndex % HANGUL_INITIAL_BLOCK) / HANGUL_FINAL_COUNT);
    const finalIndex = syllableIndex % HANGUL_FINAL_COUNT;
    const withoutFinalCharCode =
      HANGUL_BASE + (initialIndex * HANGUL_MEDIAL_COUNT + medialIndex) * HANGUL_FINAL_COUNT;
    const withoutFinal = String.fromCharCode(withoutFinalCharCode);

    pushFrame(`${committed}${HANGUL_INITIAL_COMPAT[initialIndex]}`);
    pushFrame(`${committed}${withoutFinal}`);

    if (finalIndex > 0) {
      pushFrame(`${committed}${char}`);
    }

    committed += char;
  }

  return frames.length > 0 ? frames : [text];
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("screen1_title");

  const [player, setPlayer] = useState<PlayerFormState>(initialPlayerState);
  const [professor, setProfessor] = useState<ProfessorFormState>(initialProfessorState);

  const [isBgmOn, setIsBgmOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isBgmOn) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error("BGM 재생 실패:", err));
    }
    setIsBgmOn(!isBgmOn);
  };

  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [generatedExpressionImageUrls, setGeneratedExpressionImageUrls] =
    useState<ProfessorExpressionMap>({});
  const [imageMessage, setImageMessage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [selectedChapterIds, setSelectedChapterIds] = useState<ChapterId[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterStepIndex, setChapterStepIndex] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [rawScore, setRawScore] = useState(0);
  const [storyLog, setStoryLog] = useState<string[]>([]);
  const [affinityDelta, setAffinityDelta] = useState<{ value: number; id: number } | null>(null);
  const affinityDeltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleImageRef = useRef<HTMLImageElement | null>(null);
  const particleFrameRef = useRef<number | null>(null);

  const [ending, setEnding] = useState<EndingState | null>(null);
  const [isCreditFinished, setIsCreditFinished] = useState(false);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [sessionPackMessage, setSessionPackMessage] = useState("");
  const [sessionDialogues, setSessionDialogues] = useState<
    Partial<Record<ChapterId, ChapterDialogue>>
  >({});
  const [sessionExpressionSet, setSessionExpressionSet] = useState<
    SessionExpressionDefinition[]
  >([]);
  const [sessionSpriteCues, setSessionSpriteCues] = useState<
    Partial<Record<ChapterId, ChapterSpriteCue>>
  >({});
  const [sessionEndingPolish, setSessionEndingPolish] = useState<
    Partial<Record<EndingRank, { title: string; description: string }>>
  >({});
  const [typedProfessorLine, setTypedProfessorLine] = useState("");

  const playerName = useMemo(() => toDisplayPlayerName(player.name), [player.name]);
  const professorName = useMemo(() => toDisplayProfessorName(professor.name), [professor.name]);
  const realityProfessorName = useMemo(
    () => toRealityProfessorLabel(professor.name),
    [professor.name],
  );

  const currentChapterId = selectedChapterIds[chapterIndex];
  const currentChapterInfo = currentChapterId ? chapterInfoMap[currentChapterId] : null;
  const fallbackChapterDialogue = currentChapterId
    ? sessionDialogues[currentChapterId] ?? chapterFallbackDialogues[currentChapterId]
    : null;
  const fallbackChapterSteps = fallbackChapterDialogue ? [fallbackChapterDialogue] : [];
  const currentChapterSteps = currentChapterId
    ? chapterStepScripts[currentChapterId] ?? fallbackChapterSteps
    : [];
  const currentDialogue = currentChapterSteps[chapterStepIndex] ?? null;
  const currentChoiceList = currentDialogue?.choices ?? [];
  const hasCurrentChoices = currentChoiceList.length > 0;
  const currentSelectedChoice =
    selectedChoiceIndex !== null && currentDialogue
      ? currentChoiceList[selectedChoiceIndex]
      : null;
  const endingBackdrop = useMemo(() => {
    const finalEpisodeId = selectedChapterIds[selectedChapterIds.length - 1] ?? "NIGHT_SELF_STUDY";
    return chapterInfoMap[finalEpisodeId]?.backdrop ?? preGameBackgroundImageUrl;
  }, [selectedChapterIds]);
  const activeProfessorLine = stripProfessorPrefix(
    selectedChoiceIndex === null ? currentDialogue?.dialogue ?? "" : currentSelectedChoice?.reaction ?? "",
  );
  const isProfessorLineTyping =
    phase === "screen4_8_chapter" &&
    selectedChoiceIndex === null &&
    activeProfessorLine.length > 0 &&
    typedProfessorLine !== activeProfessorLine;
  const shouldShowChoiceOverlay =
    hasCurrentChoices && selectedChoiceIndex === null && !isProfessorLineTyping;
  const canAdvanceCurrentStep =
    (!hasCurrentChoices || selectedChoiceIndex !== null) && !isProfessorLineTyping;
  const activeProfessorImageUrl = useMemo(() => {
    if (!generatedImageUrl) {
      return "";
    }

    const chapterCue = currentChapterId ? sessionSpriteCues[currentChapterId] : undefined;
    const selectedExpressionKey =
      selectedChoiceIndex === null
        ? chapterCue?.dialogueExpressionKey
        : chapterCue?.choiceReactionExpressionKeys?.[selectedChoiceIndex];

    if (
      selectedExpressionKey &&
      typeof generatedExpressionImageUrls[selectedExpressionKey] === "string"
    ) {
      return generatedExpressionImageUrls[selectedExpressionKey];
    }

    return generatedImageUrl;
  }, [
    currentChapterId,
    generatedExpressionImageUrls,
    generatedImageUrl,
    selectedChoiceIndex,
    sessionSpriteCues,
  ]);
  const expressionPreviewEntries = useMemo(() => {
    const ordered = sessionExpressionSet
      .map((expression) => ({
        key: expression.key,
        label: expression.label,
        src: generatedExpressionImageUrls[expression.key],
      }))
      .filter(
        (
          entry,
        ): entry is {
          key: string;
          label: string;
          src: string;
        } => typeof entry.src === "string" && entry.src.length > 0,
      );

    if (ordered.length > 0) {
      return ordered;
    }

    return Object.entries(generatedExpressionImageUrls)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0,
      )
      .map(([key, src]) => ({
        key,
        label: key,
        src,
      }));
  }, [generatedExpressionImageUrls, sessionExpressionSet]);

  const affinityPercent =
    selectedChapterIds.length > 0
      ? Math.min(
          100,
          Math.round(
            (Math.max(0, rawScore) / Math.max(1, selectedChapterIds.length * 20)) * 100,
          ),
        )
      : 0;
  const visibleAffinityPercent = affinityPercent > 0 ? Math.max(6, affinityPercent) : 0;
  const affinityKnobPercent = Math.max(3, Math.min(97, visibleAffinityPercent));
  const affinityMood = getAffinityMood(affinityPercent);

  useEffect(() => {
    const image = new Image();
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(heartParticle)}`;
    particleImageRef.current = image;
  }, []);

  useEffect(() => {
    return () => {
      if (affinityDeltaTimerRef.current) {
        clearTimeout(affinityDeltaTimerRef.current);
      }
      if (particleFrameRef.current) {
        cancelAnimationFrame(particleFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    if (phase !== "screen4_8_chapter" || !affinityDelta) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const particleCount = Math.max(8, Math.min(20, affinityDelta.value + 6));
    const startX = Math.max(
      12,
      Math.min(canvas.width - 12, 8 + (affinityPercent / 100) * (canvas.width - 16)),
    );
    const startY = canvas.height * 0.52;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: startX + (Math.random() - 0.5) * 14,
      y: startY + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 1.9,
      vy: -1.3 - Math.random() * 1.6,
      alpha: 1,
      size: 9 + Math.random() * 10,
      rotate: (Math.random() - 0.5) * 0.8,
      rotateSpeed: (Math.random() - 0.5) * 0.15,
    }));

    const image = particleImageRef.current;
    const gravity = 0.065;
    const friction = 0.985;
    const durationMs = 920;
    let startTime = 0;

    if (particleFrameRef.current) {
      cancelAnimationFrame(particleFrameRef.current);
      particleFrameRef.current = null;
    }

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.vx *= friction;
        particle.vy += gravity;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotate += particle.rotateSpeed;
        particle.alpha = Math.max(0, 1 - progress * 1.2);

        if (particle.alpha <= 0) {
          return;
        }

        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotate);

        if (image && image.complete && image.naturalWidth > 0) {
          ctx.drawImage(
            image,
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size,
          );
        } else {
          ctx.fillStyle = "rgba(255, 96, 150, 0.95)";
          ctx.beginPath();
          ctx.arc(0, 0, particle.size * 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (progress < 1) {
        particleFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      particleFrameRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    particleFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (particleFrameRef.current) {
        cancelAnimationFrame(particleFrameRef.current);
        particleFrameRef.current = null;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [affinityDelta, affinityPercent, phase]);

  useEffect(() => {
    if (phase !== "screen4_8_chapter") {
      setTypedProfessorLine("");
      return;
    }

    const line = activeProfessorLine.trim();

    if (!line) {
      setTypedProfessorLine("");
      return;
    }

    const frames = buildHangulTypingFrames(line);
    setTypedProfessorLine(frames[0] ?? "");

    if (frames.length <= 1) {
      return;
    }

    let frameIndex = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      frameIndex += 1;

      if (frameIndex >= frames.length) {
        return;
      }

      setTypedProfessorLine(frames[frameIndex]);
      timer = setTimeout(tick, 52);
    };

    timer = setTimeout(tick, 52);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeProfessorLine, phase]);

  function updatePlayer<K extends keyof PlayerFormState>(
    key: K,
    value: PlayerFormState[K],
  ) {
    setPlayer((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateProfessor<K extends keyof ProfessorFormState>(
    key: K,
    value: ProfessorFormState[K],
  ) {
    setProfessor((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goScreen2() {
    setPhase("screen2_player");
  }

  function confirmPlayerInfo() {
    const normalizedName = toDisplayPlayerName(player.name);
    setPlayer((current) => ({ ...current, name: normalizedName }));
    setPhase("screen3_professor");
  }

  async function generateProfessorImage(options?: {
    resolvedProfessor?: ProfessorFormState;
    expressionSet?: SessionExpressionDefinition[];
  }) {
    const resolvedProfessor = options?.resolvedProfessor ?? resolveProfessorForGeneration(professor);
    const resolvedProfessorName = toDisplayProfessorName(resolvedProfessor.name);
    const normalizedExpressionSet = normalizeExpressionSet(options?.expressionSet);

    setProfessor(resolvedProfessor);
    setImageMessage("");
    setGeneratedExpressionImageUrls({});
    setIsGeneratingImage(true);

    try {
      const response = await fetch("/api/generate-professor-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professorName: resolvedProfessorName,
          professorSummary: buildProfessorSummary(resolvedProfessor),
          illustrationPrompt: buildIllustrationPrompt(resolvedProfessor),
          expressionSet: normalizedExpressionSet.length > 0 ? normalizedExpressionSet : undefined,
        }),
      });

      const data = (await response.json()) as GenerateProfessorImageResponse;

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.message || "교수 이미지 생성 실패");
      }

      setGeneratedImageUrl(data.imageDataUrl);
      setGeneratedExpressionImageUrls(data.expressionImageDataUrls ?? {});
      const returnedExpressionSet = normalizeExpressionSet(data.expressionSet);
      if (returnedExpressionSet.length > 0) {
        setSessionExpressionSet(returnedExpressionSet);
      } else if (normalizedExpressionSet.length > 0) {
        setSessionExpressionSet(normalizedExpressionSet);
      }
      const expressionCount = Object.values(data.expressionImageDataUrls ?? {}).filter(
        (value) => typeof value === "string" && value.length > 0,
      ).length;
      setImageMessage(
        data.message ||
          `교수님 생성이 완료되었습니다. (${expressionCount > 0 ? `표정 ${expressionCount}종 포함` : "기본 이미지"})`,
      );
    } catch (error) {
      setGeneratedImageUrl("");
      setGeneratedExpressionImageUrls({});
      setImageMessage(
        error instanceof Error
          ? `이미지 생성 실패: ${error.message}`
          : "이미지 생성 실패",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function prepareSessionPack(
    resolvedProfessor: ProfessorFormState,
    runChapters: ChapterId[],
  ) {
    const professorNameForPrompt = toDisplayProfessorName(resolvedProfessor.name);
    const professorSummaryForPrompt = buildProfessorSummary(resolvedProfessor);
    let normalizedExpressionSet: SessionExpressionDefinition[] = [];

    setIsPreparingSession(true);
    setSessionPackMessage("세션 스토리를 준비 중입니다...");
    setProfessor(resolvedProfessor);
    setSelectedChapterIds(runChapters);
    setChapterIndex(0);
    setChapterStepIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setEnding(null);
    setSessionDialogues({});
    setSessionExpressionSet([]);
    setSessionSpriteCues({});
    setSessionEndingPolish({});
    setStoryLog([
      `${playerName}(${player.gender})의 시험기간 시뮬레이션 시작`,
      `${toDisplayProfessorName(resolvedProfessor.name)} 교수님과의 첫 만남이 시작되었다.`,
    ]);

    try {
      const response = await fetch("/api/generate-session-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterIds: sessionPackEpisodeIds,
          playerName,
          professorName: professorNameForPrompt,
          professorSummary: professorSummaryForPrompt,
        }),
      });

      const data = (await response.json()) as SessionPackResponse;

      if (!response.ok) {
        throw new Error(data.message || "세션 스토리 생성 실패");
      }

      if (data.chapters) {
        setSessionDialogues(data.chapters);
      }

      normalizedExpressionSet = normalizeExpressionSet(data.expressionSet);
      setSessionExpressionSet(normalizedExpressionSet);
      setSessionSpriteCues(normalizeSpriteCueMap(data.spriteCues));

      if (data.endingPolish) {
        const normalizedEndingPolish: Partial<
          Record<EndingRank, { title: string; description: string }>
        > = {};

        (Object.keys(endingMeta) as EndingRank[]).forEach((rank) => {
          const polished = data.endingPolish?.[rank];
          const title =
            typeof polished?.title === "string" && polished.title.trim().length > 0
              ? polished.title.trim()
              : endingMeta[rank].title;
          const description =
            typeof polished?.description === "string" &&
            polished.description.trim().length > 0
              ? polished.description.trim()
              : endingMeta[rank].description;

          normalizedEndingPolish[rank] = { title, description };
        });

        setSessionEndingPolish(normalizedEndingPolish);
      }

      if (data.fallback) {
        setSessionPackMessage(data.message || "기본 챕터 대사/엔딩으로 시작합니다.");
      } else {
        setSessionPackMessage("세션 스토리 준비 완료");
      }
    } catch (error) {
      setSessionPackMessage(
        error instanceof Error
          ? `세션 생성 실패: ${error.message}. 기본 데이터로 시작합니다.`
          : "세션 생성 실패로 기본 데이터로 시작합니다.",
      );
      setSessionExpressionSet([]);
      setSessionSpriteCues({});
    } finally {
      setIsPreparingSession(false);
    }

    return normalizedExpressionSet;
  }

  async function startStory() {
    if (isPreparingSession) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const runChapters = pickSixChaptersForRun();

    await prepareSessionPack(resolvedProfessor, runChapters);
    setChapterStepIndex(0);
    setPhase("screen4_8_chapter");
  }

  async function makeProfessorAndStartStory() {
    if (isGeneratingImage || isPreparingSession) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const runChapters = pickSixChaptersForRun();

    const expressionSetFromSession = await prepareSessionPack(resolvedProfessor, runChapters);
    await generateProfessorImage({
      resolvedProfessor,
      expressionSet: expressionSetFromSession,
    });
    setChapterStepIndex(0);
    setPhase("screen4_8_chapter");
  }

  function chooseOption(choiceIndex: number) {
    if (!currentDialogue || !hasCurrentChoices || selectedChoiceIndex !== null) {
      return;
    }

    const choice = currentChoiceList[choiceIndex];
    if (!choice) {
      return;
    }

    const gainedScore = choiceScore(choice);
    setSelectedChoiceIndex(choiceIndex);
    setRawScore((current) => current + gainedScore);

    if (gainedScore > 0) {
      setAffinityDelta({ value: gainedScore, id: Date.now() });
      if (affinityDeltaTimerRef.current) {
        clearTimeout(affinityDeltaTimerRef.current);
      }
      affinityDeltaTimerRef.current = setTimeout(() => {
        setAffinityDelta(null);
      }, 1200);
    }

    if (currentChapterId === "MORNING_CLASSROOM" && chapterStepIndex === 2) {
      const lunchEpisode = morningLunchBranchByChoice[choiceIndex as 0 | 1 | 2];
      setSelectedChapterIds((current) => {
        if (current.length < 3) {
          return current;
        }

        const next = [...current];
        next[2] = lunchEpisode;
        return next;
      });
    }

    if (currentChapterId === "LIGHT_DINNER" && chapterStepIndex === 0) {
      const nightEpisode = dinnerNightBranchByChoice[choiceIndex as 0 | 1 | 2];
      setSelectedChapterIds((current) => {
        if (current.length < 6) {
          return current;
        }

        const next = [...current];
        next[5] = nightEpisode;
        return next;
      });
    }

    setStoryLog((current) => [
      ...current,
      `[${chapterIndex + 1}에피소드-${chapterStepIndex + 1}단계] ${choice.text}`,
      choice.reaction,
    ]);
  }

  function moveNextChapter() {
    if (!currentDialogue || !canAdvanceCurrentStep) {
      return;
    }

    const nextStepIndex = chapterStepIndex + 1;
    if (nextStepIndex < currentChapterSteps.length) {
      setChapterStepIndex(nextStepIndex);
      setSelectedChoiceIndex(null);
      return;
    }

    const nextIndex = chapterIndex + 1;

    if (nextIndex < selectedChapterIds.length) {
      setChapterIndex(nextIndex);
      setChapterStepIndex(0);
      setSelectedChoiceIndex(null);
      return;
    }

    const score100 = clampScore100(rawScore, selectedChapterIds.length);
    const rank = getEndingRank(score100);
    const endingTemplate = endingMeta[rank];
    const polishedEnding = sessionEndingPolish[rank];

    setEnding({
      rank,
      title: polishedEnding?.title || endingTemplate.title,
      description: polishedEnding?.description || endingTemplate.description,
      score100,
    });
    setPhase("screen9_ending");
  }

  function goRealityScreen() {
    setPhase("screen10_reality");
  }

  function goCreditScreen() {
    setIsCreditFinished(false);
    setPhase("screen11_credit");
  }

  function resetToMain() {
    setPhase("screen1_title");
    setPlayer(initialPlayerState);
    setProfessor(initialProfessorState);
    setGeneratedImageUrl("");
    setGeneratedExpressionImageUrls({});
    setImageMessage("");
    setSelectedChapterIds([]);
    setChapterIndex(0);
    setChapterStepIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setStoryLog([]);
    setEnding(null);
    setIsCreditFinished(false);
    setIsPreparingSession(false);
    setSessionPackMessage("");
    setSessionDialogues({});
    setSessionExpressionSet([]);
    setSessionSpriteCues({});
    setSessionEndingPolish({});
  }

  return (
    <main className="min-h-screen text-black">
      {/* BGM 컨트롤 버튼 (우측 상단 고정) */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2">
        <button
          onClick={toggleBgm}
          className={`w-14 h-14 flex items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 border-[3px] ${
            isBgmOn 
              ? "bg-[#ffb8d5] border-white text-white" 
              : "bg-white border-[#ffb8d5] text-[#ffb8d5]"
          }`}
          aria-label={isBgmOn ? "BGM 끄기" : "BGM 켜기"}
        >
          {isBgmOn ? <Volume2 size={32} strokeWidth={2.5} /> : <VolumeX size={32} strokeWidth={2.5} />}
        </button>
        {/* 실제 오디오 태그 */}
        <audio ref={audioRef} src={MAIN_BGM_URL} loop />
      </div>

      {phase === "screen1_title" && (
        <section
          className="relative flex min-h-screen cursor-pointer items-end justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10"
          onClick={goScreen2}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              goScreen2();
            }
          }}
        >
          <div className="absolute inset-0 bg-[#f1c8da]" />
          <div
            className="absolute inset-0 scale-[1.06] bg-cover bg-center opacity-55 blur-[8px]"
            style={{ backgroundImage: `url(${mainCoverImageUrl})` }}
          />
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url(${mainCoverImageUrl})`,
              backgroundPosition: "center center",
              backgroundSize: "contain",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(255,199,226,0.58),rgba(255,199,226,0)_52%),radial-gradient(circle_at_14%_84%,rgba(255,193,221,0.56),rgba(255,193,221,0)_56%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,208,227,0.08),rgba(64,20,42,0.52))]" />

          <div className="relative z-10 mx-auto w-full max-w-[1120px] px-2 text-center md:px-4">
            <h1 className="text-[clamp(42px,6.6vw,110px)] font-black leading-[1.01] tracking-[-0.04em] text-[#ffd6e7] [text-shadow:_0_4px_0_#8c3f64,_0_9px_26px_rgba(38,10,24,0.5)]">
              ♡교수님과 두근두근♡
              <br />
              시험기간 시뮬레이션
            </h1>
            <p className="screen1-touch-guide mt-4 text-[clamp(18px,2.2vw,34px)] font-bold leading-none text-white [text-shadow:_0_2px_10px_rgba(0,0,0,0.82)]">
              화면을 클릭하여 게임을 시작해 주세요
            </p>
          </div>
        </section>
      )}

      {phase === "screen2_player" && (
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, rgba(69,20,44,0.28), rgba(61,18,40,0.44))",
              `url(${preGameBackgroundImageUrl})`,
              "radial-gradient(circle at 82% 16%, rgba(255,176,212,0.58), rgba(255,176,212,0) 52%)",
              "radial-gradient(circle at 16% 82%, rgba(255,188,217,0.55), rgba(255,188,217,0) 55%)",
              "linear-gradient(135deg, #d98baa 0%, #e9a9c2 28%, #f6c6d8 54%, #e1a1bf 100%)",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="w-full max-w-[980px] text-center">
            <h2 className="text-[clamp(56px,8vw,112px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8b3a60,_0_12px_30px_rgba(0,0,0,0.45)]">
              당신의 이름과 성별은?
            </h2>

            <div className="mx-auto mt-8 max-w-[760px] rounded-[26px] border-4 border-[#c6809e] bg-[rgba(255,237,245,0.55)] px-6 py-8 shadow-[0_14px_38px_rgba(72,20,45,0.2)] backdrop-blur-[3px] md:px-8 md:py-10">
              <input
                value={player.name}
                onChange={(event) => updatePlayer("name", event.target.value)}
                className="h-16 w-full rounded-2xl border-[3px] border-[#bb6f91] bg-white/92 px-4 text-center text-3xl font-semibold text-[#4d1d37] outline-none placeholder:text-[#b57d94] focus:ring-2 focus:ring-[#d778a1]/65"
                placeholder="이름은 최대 3자까지 가능합니다."
                maxLength={3}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {playerGenderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePlayer("gender", option.value)}
                    className={`min-w-[128px] rounded-full border-[3px] px-6 py-2 text-3xl font-bold transition ${
                      player.gender === option.value
                        ? "border-[#b15f84] bg-[linear-gradient(180deg,#ffd8ea,#f7a9c8)] text-[#5d1e3c] shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_6px_12px_rgba(0,0,0,0.18)]"
                        : "border-[#c798ad] bg-white/78 text-[#6a2a49] hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-[clamp(28px,3vw,46px)] font-semibold leading-[1.3] text-[#6a2a49]">
                이름을 입력하지 않을 시
                <br />
                [김멋사]로 자동 설정 됩니다.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmPlayerInfo}
              className="screen2-confirm-btn mt-8"
            >
              <span className="screen2-confirm-gloss" aria-hidden />
              <span className="screen2-confirm-line screen2-confirm-line-vertical" aria-hidden />
              <span className="screen2-confirm-line screen2-confirm-line-horizontal" aria-hidden />
              <span className="screen2-confirm-heart screen2-confirm-heart-left" aria-hidden>
                ♡
              </span>
              <span className="screen2-confirm-label">확인</span>
              <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                ♡
              </span>
            </button>
          </div>
        </section>
      )}

      {phase === "screen3_professor" && (
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 md:px-8 md:py-8"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, rgba(67,20,42,0.3), rgba(69,16,41,0.48))",
              `url(${preGameBackgroundImageUrl})`,
              "radial-gradient(circle at 80% 18%, rgba(255,188,219,0.56), rgba(255,188,219,0) 54%)",
              "radial-gradient(circle at 14% 82%, rgba(255,194,219,0.53), rgba(255,194,219,0) 56%)",
              "linear-gradient(145deg, #d892b0 0%, #e5aac3 34%, #f8d4e4 58%, #d895b5 100%)",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="w-full max-w-[1240px] text-center">
            <h2 className="text-[clamp(56px,8vw,108px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8a3a5f,_0_12px_30px_rgba(0,0,0,0.45)]">
              교수님 생성
            </h2>

            <article className="mx-auto mt-5 rounded-[28px] border-4 border-[#be809d] bg-[rgba(255,239,246,0.55)] px-5 py-5 shadow-[0_14px_40px_rgba(68,18,40,0.2)] backdrop-blur-[4px] md:px-8 md:py-7">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">이름</label>
                    <input
                      value={professor.name}
                      onChange={(event) => updateProfessor("name", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="교수 이름"
                    />
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <span className="text-[44px] font-bold leading-none text-[#5f213f]">성별</span>
                    <div className="flex gap-2">
                      {professorGenderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateProfessor("gender", option.value)}
                          className={`h-16 min-w-[120px] rounded-full border-[3px] text-[44px] font-bold leading-none transition ${
                            professor.gender === option.value
                              ? "border-[#b05f84] bg-[linear-gradient(180deg,#ffd8ea,#f7a9c8)] text-[#5e1f3e] shadow-[inset_0_2px_0_rgba(255,255,255,0.82),0_6px_12px_rgba(0,0,0,0.18)]"
                              : "border-[#c99aae] bg-white/80 text-[#6b2b4a] hover:bg-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">나이</label>
                    <input
                      value={professor.age}
                      onChange={(event) => updateProfessor("age", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="예: 30"
                    />
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">말투</label>
                    <select
                      value={professor.speakingStyle}
                      onChange={(event) => updateProfessor("speakingStyle", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none focus:ring-2 focus:ring-[#d977a1]/60"
                    >
                      <option value="">선택</option>
                      {professorSpeakingStyleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소1
                    </label>
                    <input
                      value={professor.feature1}
                      onChange={(event) => updateProfessor("feature1", event.target.value)}
                      list="feature1-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="헤어스타일"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소2
                    </label>
                    <input
                      value={professor.feature2}
                      onChange={(event) => updateProfessor("feature2", event.target.value)}
                      list="feature2-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="눈매"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소3
                    </label>
                    <input
                      value={professor.feature3}
                      onChange={(event) => updateProfessor("feature3", event.target.value)}
                      list="feature3-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="코/얼굴형"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소4
                    </label>
                    <input
                      value={professor.feature4}
                      onChange={(event) => updateProfessor("feature4", event.target.value)}
                      list="feature4-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="입꼬리/피부톤"
                    />
                  </div>
                </div>
              </div>

              <datalist id="feature1-options">
                {professorFeatureSuggestions.feature1.map((option) => (
                  <option key={`feature1-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature2-options">
                {professorFeatureSuggestions.feature2.map((option) => (
                  <option key={`feature2-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature3-options">
                {professorFeatureSuggestions.feature3.map((option) => (
                  <option key={`feature3-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature4-options">
                {professorFeatureSuggestions.feature4.map((option) => (
                  <option key={`feature4-${option}`} value={option} />
                ))}
              </datalist>

              <div className="mt-5 rounded-3xl border-[3px] border-[#c186a3] bg-[rgba(255,241,247,0.6)] px-4 py-4 md:px-6">
                <p className="text-[clamp(30px,3.2vw,46px)] font-bold leading-[1.22] text-[#5f223f]">
                  그 외 원하는 교수님에 대한 요구사항을 작성해주세요!
                  <br />
                  (AI를 통해 반영해드립니다.)
                </p>
                <textarea
                  value={professor.customPrompt}
                  onChange={(event) => updateProfessor("customPrompt", event.target.value)}
                  className="mt-3 h-28 w-full rounded-2xl border-[3px] border-[#be7898] bg-white/92 px-4 py-3 text-xl font-medium text-[#5a1f3a] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 md:h-32 md:text-2xl"
                  placeholder="ex) 항상 무뚝뚝하고 차갑지만 나와 둘이 있을 때는 다정함, 강아지상의 초미남"
                />
              </div>

              <p className="mt-3 text-[clamp(22px,2.3vw,34px)] font-semibold leading-[1.2] text-[#5a1f39]">
                전부 입력, 및 선택하셨으면 &apos;만들기&apos;를 눌러주세요
                <br />
                (최대 3번까지 생성 가능합니다.)
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={makeProfessorAndStartStory}
                  disabled={isGeneratingImage || isPreparingSession}
                  className="screen2-confirm-btn screen3-create-btn disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="screen2-confirm-gloss" aria-hidden />
                  <span
                    className="screen2-confirm-line screen2-confirm-line-vertical"
                    aria-hidden
                  />
                  <span
                    className="screen2-confirm-line screen2-confirm-line-horizontal"
                    aria-hidden
                  />
                  <span className="screen2-confirm-heart screen2-confirm-heart-left" aria-hidden>
                    ♡
                  </span>
                  <span className="screen2-confirm-label">
                    {isGeneratingImage || isPreparingSession ? "생성중..." : "만들기"}
                  </span>
                  <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                    ♡
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startStory}
                  disabled={isPreparingSession || isGeneratingImage}
                  className="rounded-full border-2 border-[#b87995] bg-white/80 px-7 py-2 text-xl font-semibold text-[#5c223e] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPreparingSession || isGeneratingImage ? "준비 중..." : "스토리만 바로 시작"}
                </button>
              </div>

              {generatedImageUrl && (
                <div className="mx-auto mt-4 max-w-[420px] rounded-2xl border-[3px] border-[#bf7e9f] bg-[rgba(255,242,248,0.72)] p-3">
                  <p className="text-[22px] font-semibold text-[#5e2240]">생성 예시 이미지</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedImageUrl}
                    alt="생성된 교수 이미지 예시"
                    className="mt-2 h-auto w-full rounded-xl border-2 border-[#c78ea8] object-cover shadow-[0_8px_18px_rgba(71,22,43,0.2)]"
                  />
                  {expressionPreviewEntries.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {expressionPreviewEntries.map((entry) => (
                        <div
                          key={entry.key}
                          className="rounded-lg border border-[#c78ea8] bg-white/70 p-1"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.src}
                            alt={`${entry.label} 표정`}
                            className="h-24 w-full rounded-md object-cover"
                          />
                          <p className="mt-1 text-center text-sm font-semibold text-[#5e2240]">
                            {entry.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {imageMessage && <p className="mt-2 text-lg text-[#612842]">{imageMessage}</p>}
              {sessionPackMessage && (
                <p className="mt-1 text-base text-[#67314a]">{sessionPackMessage}</p>
              )}
            </article>
          </div>
        </section>
      )}

      {phase === "screen4_8_chapter" && currentChapterInfo && currentDialogue && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentChapterInfo.backdrop})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,14,33,0.22),rgba(34,10,27,0.58))]" />
          <div className="episode-soft-pink-tint absolute inset-0" />
          {shouldShowChoiceOverlay && (
            <div
              className="absolute inset-0 z-10 bg-[rgba(32,8,21,0.36)] backdrop-blur-[2.4px]"
              aria-hidden
            />
          )}

          <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-8 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full max-w-[340px] rounded-xl border border-white/40 bg-black/45 px-4 py-3 text-white relative shadow-lg heart-gauge-container">
                <canvas
                  ref={particleCanvasRef}
                  width={180}
                  height={44}
                  className="pointer-events-none absolute left-8 top-4 z-10"
                  style={{ width: 180, height: 44 }}
                />
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-gothic text-xs font-bold tracking-wide text-[#ff4f81]">
                    {affinityMood}
                  </span>
                  <span className="font-gothic text-xs font-bold text-white/80">
                    {Math.round(affinityPercent)}/100
                  </span>
                </div>
                <div className="relative flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/ui/heart-gauge.svg"
                    alt="호감도"
                    className="drop-shadow-heart mr-2 h-7 w-7"
                    draggable={false}
                  />
                  <div className="relative h-7 flex-1 overflow-visible">
                    <div className="shadow-gauge-glow absolute left-0 top-1/2 h-4 w-full -translate-y-1/2 rounded-full bg-[#2a1a22] opacity-70" />
                    <div
                      className="heart-gauge-bar absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${visibleAffinityPercent}%`,
                        background:
                          "linear-gradient(90deg, #ffb6c1 0%, #ff4f81 50%, #c80032 100%)",
                        boxShadow: "0 0 16px 2px #ff4f81cc, 0 2px 8px #c8003233",
                      }}
                    />
                    <div
                      key={affinityPercent}
                      className="heart-gauge-knob absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
                      style={{ left: `calc(${affinityKnobPercent}% - 12px)` }}
                    />
                  </div>
                  {affinityDelta && (
                    <span
                      key={affinityDelta.id}
                      className="affinity-delta-anim font-gothic absolute left-[60px] top-[-28px] select-none text-[22px] font-extrabold text-[#ff4f81] drop-shadow"
                      aria-live="polite"
                    >
                      {`+${affinityDelta.value}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded bg-black/45 px-4 py-2 text-sm text-white">
              EPISODE {chapterIndex + 1} / 6 · STEP {chapterStepIndex + 1} / {Math.max(1, currentChapterSteps.length)} · {currentChapterInfo.title} · {currentChapterInfo.location}
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[260px] md:pb-[300px]">
              {activeProfessorImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeProfessorImageUrl}
                  alt={`${professorName} 교수 스프라이트`}
                  className="max-h-[72vh] w-auto object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="rounded-2xl border border-white/70 bg-white/30 px-6 py-10 text-center text-white">
                  생성된 교수 이미지 없이도 플레이 가능합니다.
                </div>
              )}
            </div>

            {shouldShowChoiceOverlay && (
              <div className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-10">
                <div className="w-full max-w-5xl space-y-4 md:space-y-6">
                  {currentChoiceList.map((choice, index) => (
                    <button
                      key={`${choice.text}-${index}`}
                      type="button"
                      onClick={() => chooseOption(index)}
                      className="block w-full rounded-[12px] border border-[#b7b7b7] bg-[rgba(255,255,255,0.94)] px-6 py-4 text-center text-[clamp(22px,2.4vw,52px)] font-medium leading-[1.2] text-[#2f2f2f] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-150 hover:translate-y-[-1px] hover:brightness-[1.01] active:translate-y-0"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] md:inset-x-6 md:bottom-6">
            <div className="mx-auto w-full max-w-6xl pointer-events-auto">
              <div className="overflow-hidden rounded-[8px] shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
                <div
                  className="h-7 rounded-t-[8px] border-2 border-b-[#323232] border-[#a8a8a8]"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,#ffffff 0 14px,#ffffff 14px 21px,#2f2f2f 21px 25px,#ffffff 25px 35px)",
                  }}
                  aria-hidden
                />
                <div className="border-x-2 border-b-2 border-[#a8a8a8] bg-[#f4f4f4] px-[clamp(16px,1.8vw,28px)] py-[clamp(16px,1.8vw,28px)]">
                  <p className="m-0 flex items-start gap-[clamp(18px,2vw,36px)] text-[clamp(24px,2.5vw,50px)] font-medium leading-[1.24] text-[#242424]">
                    <span className="min-w-[clamp(60px,5vw,120px)] font-black">교수</span>
                    <span>{typedProfessorLine || "\u00A0"}</span>
                  </p>
                </div>
                {canAdvanceCurrentStep && (
                  <div className="mt-[-1px] flex items-center justify-between gap-4 border-x-2 border-b-2 border-[#a8a8a8] bg-[#f4f4f4] px-[clamp(16px,1.8vw,28px)] pb-[clamp(14px,1.5vw,22px)]">
                    <p className="text-base text-[#2d2d2d]">
                      {hasCurrentChoices
                        ? "선택 완료. 다음 단계로 이동하세요."
                        : "다음 단계로 이동하세요."}
                    </p>
                    <button
                      type="button"
                      onClick={moveNextChapter}
                      className="rounded-md border border-[#484848] bg-white px-5 py-2 text-lg font-semibold text-black transition hover:bg-[#f6f6f6]"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "screen9_ending" && ending && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${endingBackdrop})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0.35),rgba(8,12,20,0.75))]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-end px-4 pb-6 md:px-8">
            <div className="rounded border border-[#8b8b8b] bg-[rgba(30,30,30,0.62)] p-4 text-white">
              <p className="text-xl">엔딩 내용</p>
              <p className="mt-2 text-3xl font-semibold">{ending.title}</p>
              <p className="mt-3 text-2xl leading-relaxed">{ending.description}</p>
              <p className="mt-3 text-lg">최종 점수: {ending.score100}점</p>
              <button
                type="button"
                onClick={goRealityScreen}
                className="mt-5 border border-white bg-white px-6 py-2 text-lg font-semibold text-black hover:bg-neutral-100"
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === "screen10_reality" && (
        <section className="flex min-h-screen items-center justify-center bg-[#e6e6e6] px-4 py-8">
          <div className="w-full max-w-[1240px] text-center text-[clamp(54px,5.8vw,96px)] leading-[1.36] text-black">
            <p>
              {playerName}!<br />
              {finalRealityLine}
              <br />
              오늘 {realityProfessorName}과 함께 한 하루를 잊지 말고
              <br />
              시험 잘 보길 바랄게.
            </p>
            <button
              type="button"
              onClick={goCreditScreen}
              className="mt-16 border-[3px] border-black bg-white px-14 py-4 text-[clamp(48px,4.7vw,76px)] font-semibold leading-none text-black hover:bg-[#f8f8f8]"
            >
              크레딧 보기
            </button>
          </div>
        </section>
      )}

      {phase === "screen11_credit" && (
        <section
          className="relative min-h-screen overflow-hidden bg-[#1f1f21] text-white"
          onClick={() => {
            if (isCreditFinished) {
              resetToMain();
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (isCreditFinished && (event.key === "Enter" || event.key === " ")) {
              resetToMain();
            }
          }}
        >
          <div className="credit-roll-track">
            <div
              className="credit-roll-content"
              onAnimationEnd={() => setIsCreditFinished(true)}
            >
              <p className="text-5xl font-semibold leading-snug">
                두근두근 교수님과 시험기간 시뮬레이션
              </p>
              <p className="mt-14 text-5xl">Credit</p>
              <p className="mt-12 text-5xl">숭멋사 14기</p>
              <p className="mt-14 text-5xl leading-[1.35]">
                PM 최영환
                <br />
                PM 이영서
                <br />
                FE 최정인
                <br />
                FE 김하빈
                <br />
                FE 차민상
              </p>
            </div>
          </div>

          {isCreditFinished && (
            <div className="credit-touch-guide">
              화면 터치시 메인 화면으로 돌아갑니다
            </div>
          )}
        </section>
      )}

      {phase === "screen9_ending" && ending && storyLog.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-8">
          <div className="rounded border border-black bg-white p-4">
            <p className="text-lg font-semibold">플레이 로그 (내부 데모용)</p>
            <div className="mt-3 grid gap-2 text-sm text-neutral-800">
              {storyLog.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
