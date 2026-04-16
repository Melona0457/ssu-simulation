"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { heartParticle } from "@/lib/heart-particle";
import {
  professorRouteStory,
  storyEndingCatalog,
  storyEpisodeBackdropMap,
  type StoryEndingRankKey,
  type StoryEndingVariant,
  type StoryChoice,
  type StoryEpisode,
  type StoryRole,
  type StoryScene,
} from "@/lib/professor-route-story";
import {
  buildIllustrationPrompt,
  buildProfessorSummary,
  chapterFallbackDialogues,
  endingMeta,
  finalRealityLine,
  getEndingRank,
  MAIN_BGM_URL,
  playerGenderOptions,
  professorFeatureSuggestions,
  professorGenderOptions,
  professorSpeakingStyleOptions,
  resolveProfessorForGeneration,
  sessionPackEpisodeIds,
  type ChapterChoice,
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
  rank?: ReturnType<typeof getEndingRank>;
  title: string;
  description: string;
  score100?: number;
  variantId?: string;
  variantSubtype?: string;
  variantLines?: string[];
  expressionKey?: string;
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

type DialogueSpeakerLabel = "나레이션" | "교수" | "나" | "독백" | "남성";

type SessionPackStepPayload = {
  chapterId: ChapterId;
  stepIndex: number;
  dialogue: string;
  choices: Array<{
    text: string;
    preview: string;
    reaction: string;
    emotion: ChapterChoice["emotion"];
    effects: ChapterChoice["effects"];
  }>;
};

const chapterStepScripts: Partial<Record<ChapterId, ChapterStep[]>> = {
  COMMUTE_CAMPUS: [
    {
      dialogue:
        "아침 등굣길, 별 생각 없이 걷고 있는데 저 앞에 익숙한 뒷모습이 보인다. 어느 순간부터 나와 같은 방향으로 걷고 있는 사람. 어? 저분 혹시. 맞다, 이번 학기 담당 교수님이다. 이렇게 마주치니까 묘하게 낯이 익으면서도 낯설다. 어디선가 본 것 같은 느낌이랄까, 내가 막연하게 상상해왔던 그 이미지가 딱 저런 모습이었던 것 같기도 하고. 꿈에서 봤던가? 뭐, 아무튼 강의실로 가야 한다.",
      choices: [],
    },
  ],
  MORNING_CLASSROOM: [
    {
      dialogue:
        "(장소: 강의실, 마지막 총정리 수업. 반쯤 열린 창문으로 바람이 들어오고 교수님이 서류를 정리하며 이쪽을 쳐다본다.) 터벅터벅 강의실 문을 열자마자 차가운 에어컨 바람과 함께 교수님의 시선이 내리꽂힌다. 시험 전날의 공기는 평소보다 두 배는 무겁다. 교수님은 (시계를 보지도 않고) 말한다. \"민상군, 15분 늦었군. 자네의 성실함이 시험 점수와 반비례하지 않길 빌어야겠어. 어서 앉게, 벌써 중요한 대목을 지나치고 있으니까.\"",
      choices: [
        {
          text: "\"교수님 수업은 1분 1초가 꿀잼이라, 앞부분 놓친 게 제 인생의 최대 손실입니다.\"",
          preview: "MZ식 넉살",
          reaction:
            "(입가에 아주 미세한 경련, 비웃음인지 미소인지 모를 표정이 스친다.) \"자네는 그 말재주로 논술 시험을 치면 참 좋을 텐데 말이야. 안타깝게도 내 시험은 객관식이라네. 자, 7페이지 보게.\" 교수님이 굳이 내 자리까지 걸어와 책 페이지를 넘겨준다. 손끝이 살짝 스친 것 같은데... 기분 탓인가?",
          emotion: "teasing",
          effects: { affinity: 10, intellect: 7 },
        },
        {
          text: "\"죄송합니다. 밤새 복습하다가 깜빡 잠이 들었습니다.\"",
          preview: "정중한 사과",
          reaction:
            "\"밤샘이라... 노력은 가상하다만, 효율 없는 노력은 학계에서 인정하지 않네. 그래도 얼굴을 보니 거짓말 같진 않군. 여기, 정신 차리고 이거 마시면서 듣게.\" 교수님이 교단 위에 있던 새 캔커피를 툭 던져준다. 차가운 캔에 닿은 손바닥이 갑자기 뜨거워지는 기분이다.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 9 },
        },
        {
          text: "(아무 말 없이 구석 자리로 가서 책을 편다.)",
          preview: "조용한 회피",
          reaction:
            "\"민상군, 구석으로 숨는다고 내가 못 볼 거라 생각하나? 자네가 거기 앉으면 내 시야의 사각지대가 사라져서 더 잘 보인다네. 자, 그럼 '사각지대'에 앉은 기념으로 질문 하나 하지.\" 교수님의 강렬한 눈빛이 정면으로 향한다. 긴장감 때문에 심장이 필요 이상으로 뛴다.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 8 },
        },
      ],
    },
    {
      dialogue:
        "(중간 연출: 수업 종료 직전, 교수님이 칠판 글씨를 지우며 말한다.) \"오늘 수업은 여기까지. 내일 시험지는 이미 인쇄실로 넘어갔네. 자네들 중 누군가는 웃으며 나가겠지만, 누군가는 내년에 이 자리에서 나를 다시 보게 되겠지. 난 개인적으로... 후자는 별로 달갑지 않군.\"",
      choices: [
        {
          text: "\"교수님, 그럼 저희 내년엔 강의실 말고 밖에서 뵙는 건가요?\"",
          preview: "가벼운 도발",
          reaction:
            "(짐을 챙기다 잠깐 멈춘다.) \"허, 입은 여전히 빠르군. 내일은 답안지도 그 속도로 써 보게.\"",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 6 },
        },
        {
          text: "\"꼭 웃으면서 나가겠습니다. 교수님도 웃으면서 성적 입력해 주세요.\"",
          preview: "안전한 다짐",
          reaction:
            "(고개를 가볍게 끄덕인다.) \"좋아. 웃게 만들고 싶다면 점수로 설득하게.\"",
          emotion: "warm",
          effects: { affinity: 8, intellect: 9 },
        },
      ],
    },
    {
      dialogue:
        "(에피소드 종료 직전) 교수님이 짐을 챙기다 멈칫하며 펜을 내민다. \"아, 민상군. 나가기 전에 이것 좀 받아가게. 아까 보니까 볼펜 잉크가 다 됐더군. 시험 보다가 멈추면 곤란할 테니, 내 걸로 빌려주지. 내일 시험 끝나고 연구실로 직접 반납하러 오게.\" 건네받은 펜엔 아직 온기가 남아 있는 것 같다. 단순한 친절일까, 아니면...? 머릿속이 복잡해진 채 점심 장소를 고른다.",
      choices: [
        {
          text: "학생 식당으로 향한다.",
          preview: "점심 분기",
          reaction: "\"좋아. 빠르게 먹고 오후를 버텨보게.\"",
          emotion: "neutral",
          effects: { affinity: 7, intellect: 10 },
        },
        {
          text: "학교 앞 맛집으로 향한다.",
          preview: "점심 분기",
          reaction: "\"기분 전환도 필요하지. 대신 시간 관리는 철저히.\"",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 7 },
        },
        {
          text: "학생회관 화장실 변기 칸으로 향한다.",
          preview: "점심 분기",
          reaction: "\"극한의 생존 모드군. 오늘은 꽤 파란만장하겠어.\"",
          emotion: "awkward",
          effects: { affinity: 6, intellect: 5 },
        },
      ],
    },
  ],
  LUNCH_STUDENT_CAFETERIA: [
    {
      dialogue:
        "(장소: 학생 식당, 북적거리는 소음. 식판 앞 1인칭 시점.) 역시 시험 전날 점심은 혼밥이지. 대충 한 끼 때우고 도서관 가려는데 내 앞자리에 낯익은 정장 소매가 보인다. 설마. 교수님이 식판을 내려놓으며 자연스럽게 묻는다. \"여긴 늘 붐비는군. 민상군, 앞자리 비어있나? 자네 식사 속도를 보니 시험 공부하러 마음이 급한 모양이야.\"",
      choices: [
        {
          text: "\"커흑! 교, 교수님? 여기서 식사를 하신다고요?\"",
          preview: "사레들림",
          reaction:
            "(무심하게 종이컵에 물을 떠서 건넨다.) \"천천히 먹게. 물 마시고. 시험지도 안 넘겼는데 여기서 숨 넘어가면 곤란하지 않겠나.\" 컵에 닿는 손가락의 미지근한 온도가 묘하게 신경 쓰인다.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 6 },
        },
        {
          text: "\"아, 네! 앉으세요. 교수님도 학식 드시는 줄은 몰랐습니다.\"",
          preview: "체면 유지",
          reaction:
            "\"나도 사람인데 밥은 먹어야지. 자네가 먹는 그 돈가스, 오늘따라 바삭해 보이는군. 공부하려면 단백질이 필요할 테니 많이 먹어두게.\" 식판을 보며 스치는 희미한 미소가 오래 남는다.",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 9 },
        },
        {
          text: "(동작 정지 상태로 교수님 식판 메뉴를 스캔한다.)",
          preview: "얼어붙음",
          reaction:
            "(피식 웃으며 요구르트를 밀어준다.) \"분석은 내 식판 말고 자네 전공 책에나 하게나. 식기 전에 얼른 먹어, 머리 쓰려면 혈당 떨어지면 안 되니까.\"",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
    {
      dialogue:
        "(중간 연출) 긴장한 탓에 젓가락질을 서두르다 툭, 숟가락을 바닥에 떨어뜨린다. 허리를 숙이려는 찰나 교수님이 더 빠르게 움직여 새 수저를 식판 위에 놓는다. \"손이 떨리는 건가, 아니면 내가 그렇게 불편한 건가? 시험 전엔 멘탈 관리가 제일 중요하다네. 수저 정도야 다시 들면 그만이지.\"",
      choices: [
        {
          text: "\"감사합니다... 근데 교수님, 방금 좀 머릿속에 슬로우 모션 걸린 것 같아요.\"",
          preview: "솔직한 당황",
          reaction:
            "(먼저 자리에서 일어나며) \"먼저 일어나지. 아, 민상군. 입가에 소스 묻었네. 칠칠치 못하게... 내일 시험지에 답안도 그렇게 묻히고 나오지 말게나.\" 손수건을 꺼내려다 멈추고 휴지 한 장을 툭 두고 식당을 나간다.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 8 },
        },
        {
          text: "\"떨어진 건 수저인데, 왜 제 심장이 바닥에 있는 것 같죠?\"",
          preview: "넉살",
          reaction:
            "(짧게 웃고 자리에서 일어난다.) \"말은 잘하네. 그 기세를 내일 답안지에도 써먹어 보게. 아, 입가 소스부터 닦고.\" 남겨진 휴지를 보니 왠지 밥맛이 더 좋아진다.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 6 },
        },
      ],
    },
  ],
  LUNCH_OFFCAMPUS_RESTAURANT: [
    {
      dialogue:
        "(장소: 학교 앞 작은 한식당. 창가 2인 테이블 1인칭 시점.) 학식 줄이 길어 조용히 밥 먹으러 왔는데, 문종이 딸랑 울리고 입구에서 교수님과 눈이 정확히 마주친다. 교수님이 별일 아니라는 듯 다가와 맞은편 의자를 당긴다. \"학생이군. 학식 줄이 길었나? 나도 오늘은 그쪽이 내키지 않아서. 1인 테이블이 없는데, 합석해도 되겠나.\"",
      choices: [
        {
          text: "\"아, 네! 그, 그럼요. 앉으세요. 메뉴는... 메뉴 다 괜찮아요!\"",
          preview: "당황",
          reaction:
            "(자리에 앉아 메뉴판을 집어 든다.) \"메뉴가 다 괜찮다는 건 아무거나 먹어도 된다는 말인가, 아직 못 정했다는 말인가.\" (잠깐의 침묵) \"여기 된장찌개가 무난하네. 나는 늘 그걸로 하는 편이야.\"",
          emotion: "warm",
          effects: { affinity: 8, intellect: 8 },
        },
        {
          text: "\"물론이죠. 교수님도 여기 오세요? 저는 처음이라서요.\"",
          preview: "침착한 대화",
          reaction:
            "(메뉴판을 펼친 채) \"가끔 오지. 학식이 번잡스러울 때. 단골이라고 할 만큼은 아니지만... 사장님이 얼굴은 기억하시더군.\" 별 뜻 없는 말인데 이상하게 그 '가끔'이 자꾸 궁금해진다.",
          emotion: "neutral",
          effects: { affinity: 9, intellect: 9 },
        },
        {
          text: "(메뉴판 뒤에서 눈동자만 굴린다.)",
          preview: "표정 관리 실패",
          reaction:
            "(피식 웃으며 메뉴판 하나를 내 앞으로 밀어준다.) \"그 메뉴판, 아까부터 같은 페이지 펴고 있더군. 결정 장애인가, 내가 갑자기 나타나서 그런 건가. 천천히 골라도 되네.\"",
          emotion: "awkward",
          effects: { affinity: 7, intellect: 7 },
        },
      ],
    },
  ],
  LUNCH_RESTROOM_STALL: [
    {
      dialogue:
        "(장소: 학생회관 3층 화장실 맨 끝 변기칸. 화면 양옆 비네팅, 물방울 소리 '똑... 똑...') 고학번의 삶이란 철저한 고독과의 싸움이다. 결국 오늘 나는 괴담 속 '변기칸 혼밥'의 주인공이 되고 말았다. 독백: '에어컨도 나오고 조용하고... 나름 VIP 프라이빗 룸이잖아?' 그때 달칵 소리와 함께 누군가 바로 옆 칸으로 들어온다. (가쁜 숨을 내쉬며) \"후우... 하마터면 교수 품위 유지에 금이 갈 뻔했군.\" 이 목소리, 오전 강의의 그 교수님이다. 숨소리조차 내면 안 된다.",
      choices: [
        {
          text: "...네, 교수님. 접니다. 참치마요 먹고 있었습니다.",
          preview: "자포자기 인정",
          reaction:
            "(옆칸에서 경악한 목소리) \"세상에, 진짜 자네였어?! 휴지 틈새로 넘어오는 이 고소한 냄새가 설마 내 제자의 서글픈 점심 식사였단 말인가!\" 자포자기한 심정으로 이마를 짚는다. 지금 변기 물을 내리고 같이 떠내려가고 싶은 심정이다.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 4 },
        },
        {
          text: "아, 아뇨? 저는 지나가는 나그네입니다만!",
          preview: "어설픈 타인 행세",
          reaction:
            "\"허! 자네가 한 학기 내내 지각할 때마다 내던 그 핑계 대는 목소리를 내가 모를 줄 아나? 나그네는 무슨, 당장 남은 김밥 들고나오게!\" 어설픈 연기력은 역시 F 학점 감이었다.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 6 },
        },
        {
          text: "(아무 대답 없이 숨을 꾹 참고 없는 척한다.)",
          preview: "숨참고 변기 다이브",
          reaction:
            "\"숨 참아도 소용없네! 자네가 숨을 멈출수록 이 좁은 칸 안에 참기름과 참치 김밥 냄새가 더 진하게 퍼지고 있으니까. 어서 나오게. 내가 문 위로 고개를 내밀어 확인하기 전에.\" 압박 수사 앞에서 결국 백기를 들 수밖에 없다.",
          emotion: "panic",
          effects: { affinity: 7, intellect: 4 },
        },
      ],
    },
    {
      dialogue:
        "(중간 연출: 화장실 세면대 앞) 교수님이 손을 씻고 수건으로 닦으며 한숨을 내쉰다. \"인터넷에 떠도는 변기통 혼밥이 괴담인 줄 알았는데... 그걸 내 제자가 몸소 실천하고 있을 줄이야. 당장 그 차갑고 눅눅한 김밥은 버리게. 따라와. 정문 앞 Delicious Lion Steak House로 가지. 교육자의 도리야.\"",
      choices: [
        {
          text: "\"교수님의 참된 가르침(물리)을 기꺼이 받들겠습니다. 사실 스테이크를 먹기 위해 위장을 비워두는 중이었습니다.\"",
          preview: "뻔뻔 회복",
          reaction:
            "(어이없다는 듯 헛웃음을 터뜨린다.) \"허! 방금 전까지 변기통을 붙잡고 있던 녀석 치고는 회복력이 아주 기가 막히군. 좋아, 오늘 자네 위장에 한우로 기름칠을 해주지.\" 내 손의 김밥은 가차 없이 쓰레기통으로 직행한다.",
          emotion: "teasing",
          effects: { affinity: 11, intellect: 5 },
        },
        {
          text: "\"아닙니다, 교수님! 이건 고독을 즐기는 현대인의 트렌드, 미라클 런치입니다. 전 정말 괜찮습니다!\"",
          preview: "현실 부정",
          reaction:
            "\"미라클 런치는 무슨. 장염 걸리는 지름길이겠지. 자네의 얄팍한 자존심은 변기 물과 함께 내려보내게. 선생이 사주는 밥 한 끼 얻어먹는 것도 사회생활 연습이야.\" (어깨를 꽉 쥐고 거의 연행하듯 화장실 밖으로 끌고 나간다.)",
          emotion: "stern",
          effects: { affinity: 8, intellect: 6 },
        },
        {
          text: "\"교수님... 이건 김밥이 아니라 제 서글픈 눈물입니다... 못 본 척해 주십시오...\"",
          preview: "불쌍함 어필",
          reaction:
            "(갑자기 숙연해진 표정으로 어깨를 토닥인다.) \"그래... 눈물 젖은 김밥을 먹어보지 않은 자와는 인생을 논하지 말라고 했지. 자네의 고독은 존중해주겠네. 하지만 오늘만큼은 그 눈물을 한우 육즙으로 씻어내게나.\"",
          emotion: "warm",
          effects: { affinity: 10, intellect: 4 },
        },
      ],
    },
  ],
  AFTERNOON_LIBRARY: [
    {
      dialogue:
        "(장소: 도서관 열람실, 창가 자리) 밥도 먹었겠다 이제 집중할 시간인데, 교재가 눈에 안 들어온다. 아까 받은 펜이 자꾸 시야에 걸린다. 형광펜 줄도 삐뚤고, 마음은 더 삐뚤다. 결국 서가로 걸어가 참고 도서를 찾다가 코너에서 익숙한 뒷모습과 마주친다. 교수님이 고개를 돌린다. \"...학생이군. 여기도 오나?\"",
      choices: [
        {
          text: "아— 네, 참고 도서 좀 찾으러요. (책을 떨어뜨린다.)",
          preview: "당황",
          reaction:
            "(떨어진 책을 먼저 집어 표지를 본다.) \"참고 도서치고는 전공이랑 좀 거리가 있는데. 시험 전날 현실도피인가?\" (책을 내밀며) \"뭐, 기분 전환도 공부의 일부라고 우기면 할 말은 없지만.\"",
          emotion: "warm",
          effects: { affinity: 8, intellect: 9 },
        },
        {
          text: "네. 교수님은 논문 자료 찾으세요?",
          preview: "침착한 척",
          reaction:
            "(서가로 시선을 돌린다.) \"그렇네. 학기 말마다 오는 코스야. 조용하고 자료도 있고.\" (책 하나를 꺼내 건네며) \"자네 전공이면 이거 도움 될 거야. 시험 범위랑 겹치는 부분 있으니까 훑어보게.\"",
          emotion: "neutral",
          effects: { affinity: 7, intellect: 11 },
        },
        {
          text: "(도망치려다 눈이 마주친다.)",
          preview: "도주 실패",
          reaction:
            "(피식 웃는다.) \"도망가려 했나? 나한테서.\" (다시 서가를 보며) \"도서관까지 피해 다닐 건 없어. 나도 볼일 있어서 온 거니까. 자네는 자네 책 찾게.\"",
          emotion: "awkward",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
    {
      dialogue:
        "(중간 연출: 서가 사이 어색한 정적) 교수님이 책 한 권을 빼며 독백하듯 말한다. \"학기 말 도서관은 항상 이 모양이군. 시험 전날만 되면 다들 여기 와서 후회하지.\"",
      choices: [
        {
          text: "저는 후회 안 하려고 지금 여기 있는 겁니다.",
          preview: "의지 선언",
          reaction:
            "(책에서 눈을 떼지 않고) \"후회 안 하려면 지금 여기서 나랑 얘기할 시간에 열람실 가서 한 줄 더 보는 게 맞지 않나.\" (한 박자 뒤) \"뭐, 그래도 왔으니까.\" 핀잔인데 이상하게 기분이 나쁘지 않다.",
          emotion: "stern",
          effects: { affinity: 8, intellect: 10 },
        },
        {
          text: "교수님은 학생 때 시험 전날 뭐 하셨어요?",
          preview: "개인 질문",
          reaction:
            "(잠깐 멈칫) \"나? ...도서관 왔었지. 자네랑 별 다를 것 없어.\" (짧은 침묵) \"그때도 시험 전날 딴생각이 더 잘 됐거든. 사람 다 똑같아.\"",
          emotion: "warm",
          effects: { affinity: 10, intellect: 8 },
        },
      ],
    },
  ],
  LIGHT_DINNER: [
    {
      dialogue:
        "복잡한 마음을 뒤로하고 편의점에서 간단히 저녁을 먹었다. 내일이 시험이라니 여전히 심란하다. 저녁 식사를 마치고 어느 쪽으로 갈지 고민이 된다. 어떻게 할까.",
      choices: [
        {
          text: "집으로 간다.",
          preview: "밤 분기: 교수 연구실",
          reaction: "\"좋아, 집으로 향해보게. 다만 오늘 밤은 예상보다 길어질지도 모르지.\"",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 8 },
        },
        {
          text: "강의실로 간다.",
          preview: "밤 분기: 강의실",
          reaction: "\"끝까지 붙잡겠다는 거군. 좋아, 잠들지만 않게.\"",
          emotion: "stern",
          effects: { affinity: 7, intellect: 11 },
        },
        {
          text: "학교 벤치로 간다.",
          preview: "밤 분기: 벤치",
          reaction: "\"잠깐 숨을 고르는 것도 필요하지. 마음부터 정리해 보게.\"",
          emotion: "warm",
          effects: { affinity: 9, intellect: 7 },
        },
      ],
    },
  ],
  NIGHT_LAB_VISIT: [
    {
      dialogue:
        "(챕터: 저녁시간 - 연구실의 불빛) 어둑해진 캠퍼스, 다른 창문은 꺼졌지만 교수 연구실 창문만 유난히 따뜻한 노란 빛을 낸다. 집으로 향하던 발걸음이 멈춘다. 독백: '교수님... 아직 안 가셨네.' 선택은 두 가지다. 감사 인사를 하러 4층으로 올라갈지(정공법), 아니면 뒤도 돌아보지 않고 정문으로 달릴지(우회로). 하지만 우회로를 택해도 갑작스런 폭우와 함께 결국 교수님을 다시 만나 연구실로 향하게 된다.",
      choices: [
        {
          text: "오늘 신세를 졌으니 감사 인사를 드리고 간다. (정공법)",
          preview: "루트 A",
          reaction:
            "\"자, 앉게. 물기부터 좀 닦고. 커피라도 한잔할 텐가?\" 연구실 문이 열리자 은은한 주황빛 조명, 시더우드 향과 오래된 책 냄새, 에스프레소 향이 겹쳐진다. \"내일 시험공부는 다 했나?\"라는 질문과 농담 섞인 압박이 이어진다.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 9 },
        },
        {
          text: "바로 집으로 간다. (칼퇴 시도)",
          preview: "루트 B",
          reaction:
            "(콰광, 천둥과 폭우) \"아니, 자네는 왜 아직도 학교에... 꼴을 보니 우산도 없는 모양이군. 이 장대비에 가긴 어디 가겠나. 일단 올라가세. 내 연구실에 여분의 우산이 있을 테니.\" 결국 운명의 데스티니에 이끌려 연구실로 향한다.",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 8 },
        },
      ],
    },
    {
      dialogue:
        "(공통 연구실 파트 이후) 커피와 대화를 마친 뒤 교수님은 진지하게 이름을 부른다. \"내일 시험, 자네가 노력한 만큼의 결과가 나오길 바라네. 너무 긴장하지 말고. 자, 우산 받아가게.\" 연구실을 나와 빗속을 걷는데 묵직한 엔진음과 함께 순백의 롤스로이스가 멈춘다. 창문이 내려가고 교수님이 선글라스를 내리며 말한다. \"거 우산 받아 가라는 게, 나 차 타고 가니까 자네는 걸어가라는 뜻이었는데. 이 비를 뚫고 걸어갈 자신은 있나 보군? 너만 괜찮다면, 이 백마에 타는 영광을 주지. 집까지 데려다주겠네.\"",
      choices: [
        {
          text: "마음만 감사히 받을게요. 우산 쓰고 천천히 가겠습니다.",
          preview: "엔딩 A",
          reaction:
            "(조금 의외라는 듯 눈을 둥그렇게 떴다가 빙그레 웃는다.) \"허! 자네, 의외로 고집이 있군. 좋아, 그 독립심은 높이 사지. 대신 감기 걸려서 내일 시험지에 콧물 흘리면 F니까 조심하게. 그럼, 내일 보세.\" 롤스로이스는 매끄럽게 사라지고, 손에 쥔 우산은 더 묵직해진다.",
          emotion: "warm",
          effects: { affinity: 9, intellect: 10 },
        },
        {
          text: "실례하겠습니다. 태워 주세요.",
          preview: "엔딩 B",
          reaction:
            "(헛웃음을 터뜨리며) \"하! 자네의 그 뻔뻔함과 솔직함은 정말 학계에서 연구 대상이야. 그래, 타게.\" 롤스로이스 안은 고급 가죽 향과 고요함으로 가득하고, 교수님은 운전 중 내일 시험 핵심 포인트를 은밀하게 흘려준다.",
          emotion: "teasing",
          effects: { affinity: 12, intellect: 7 },
        },
        {
          text: "오늘은 좀 부담스럽습니다. 거리를 두고 싶어요.",
          preview: "엔딩 C",
          reaction:
            "(잠시 당황한 듯 선글라스를 고쳐 쓴다.) \"허... 자네, 아주 칼 같군. 오해는 말게. 단지 제자가 이 비에 젖어 고생하는 게 안타까워 교육자로서 배푼 호의였네. 거리라... 그래, 그 선을 넘지 않는 것도 중요하지.\" 차 문이 닫히고 롤스로이스는 빗속으로 사라진다.",
          emotion: "stern",
          effects: { affinity: 6, intellect: 9 },
        },
      ],
    },
  ],
  NIGHT_CAMPUS_WALK: [
    {
      dialogue:
        "(장소: 인문대 뒤편 벤치, 노란 가로등 불빛) 도서관에서 나와 머리를 식히려 걷는데 늘 그 자리에 교수님이 앉아 있다. 밤에 보는 교수님은 강의실에서보다 조금 더 사람 냄새가 난다. 교수님이 고개를 들며 묻는다. \"이 시간에 여기서 자네를 다 보군. 민상군, 공부하다 막히는 거라도 있나? 얼굴에 고민이라고 쓰여 있는데.\"",
      choices: [
        {
          text: "\"사실... 제가 이 길(전공)이 맞는지 갑자기 확신이 안 서서요.\"",
          preview: "진지한 상담",
          reaction:
            "\"확신이라... 그건 나도 아직 매일 고민하는 문제라네. 하지만 민상군, 자네가 지난 학기에 낸 레포트의 그 문장들... 난 자네가 이 길에 소질이 있다고 꽤 확신하고 있었어.\" 이름을 부르는 순간 가슴 한구석이 찌릿해진다.",
          emotion: "warm",
          effects: { affinity: 10, intellect: 8 },
        },
        {
          text: "\"교수님, 사실 저... 교수님 때문에 이 학과 선택한 거거든요.\"",
          preview: "깜짝 고백",
          reaction:
            "(잠시 멈칫했다가 낮게 웃는다.) \"나 때문에? 허... 자네 인생을 나 같은 사람한테 배팅하다니, 무모한 건가 아니면 용감한 건가. 그래도 기분은 나쁘지 않군. 책임감이 좀 더 생기는걸.\"",
          emotion: "teasing",
          effects: { affinity: 12, intellect: 6 },
        },
        {
          text: "\"시험도 시험인데, 교수님이 너무 완벽하셔서 자괴감이 좀 드네요.\"",
          preview: "감성 폭발",
          reaction:
            "(안경을 지그시 누르며) \"완벽이라... 자네 눈에는 내가 그렇게 보이나? 사실 나도 자네 학점 채점할 때마다 완벽하게 잠을 설친다네. 자괴감 가질 시간 있으면 그 감성을 답안지 서술형에나 쏟게나.\"",
          emotion: "neutral",
          effects: { affinity: 9, intellect: 9 },
        },
      ],
    },
    {
      dialogue:
        "(중간 연출) 상담을 이어가다 목소리가 떨리고 눈시울이 붉어진다. \"그냥... 잘하고 싶은데 마음처럼 안 돼서 울컥하네요.\" 당황해 고개를 숙이자 교수님이 말없이 자리를 옮겨 옆에 앉는다. 일정한 거리를 유지한 채 곁을 내주며 말한다. \"울어도 되네. 여긴 강의실이 아니니까. 자네가 얼마나 애쓰고 있는지... 내가 다 보고 있었어. 민상군, 자네는 생각보다 훨씬 더 잘하고 있어. 내 이름 걸고 보증하지.\"",
      choices: [
        {
          text: "교수님이 보증하시면... 저 진짜 믿어도 되는 거죠?",
          preview: "신뢰 확인",
          reaction:
            "(천천히 일어나며 어깨를 아주 짧게 툭 친다.) \"밤 공기가 차군. 감기 걸리면 내일 시험에 지장 생기니 얼른 들어가게. 그리고... 아까 말한 거, 진심이야. 내일 시험지에서 자네의 열정을 보여주길 기대하겠네.\"",
          emotion: "warm",
          effects: { affinity: 11, intellect: 8 },
        },
        {
          text: "교수님 옆자리가 생각보다 따뜻하네요. 조금만 더 이러고 있어도 될까요?",
          preview: "여운 유지",
          reaction:
            "\"잠깐은 괜찮지. 다만 밤공기가 차니 너무 늦진 않게.\" 교수님이 멀어지는 뒷모습을 보며 감상은 접고 마지막 결전지인 시험 강의실로 향할 준비를 한다.",
          emotion: "awkward",
          effects: { affinity: 10, intellect: 7 },
        },
      ],
    },
  ],
  NIGHT_SELF_STUDY: [
    {
      dialogue:
        "(장소: 소등된 강의실, 비상등만 켜진 늦은 밤) 희미한 빛 속에서 천천히 시야가 열린다. 책상 위에 엎드린 채 잠들었고 강의 노트가 뺨에 붙어 있다. 여긴 어디지? 천장을 보니 강의실이다. 문이 천천히 열리고 복도 불빛을 등진 실루엣이 멈춘다. 교수님이다. (낮고 선명한 목소리) \"...자고 있었군.\"",
      choices: [
        {
          text: "\"...교수님? 지금 몇 시예요.\"",
          preview: "멍한 확인",
          reaction:
            "(시계를 보며) \"열한 시 넘었네. 자다 깨서 첫 마디가 몇 시냐고. 시험이 내일인 건 알고 자는 건가?\" ... \"뻔뻔하군. 마음에 들어.\" (강의실 불을 켜주며) \"그럼 뻔뻔하게 30분만 더 하고 들어가게. 너무 늦게 들어가지 말고.\"",
          emotion: "teasing",
          effects: { affinity: 9, intellect: 10 },
        },
        {
          text: "아— 죄송합니다! 잠깐 눈 붙이려다가...",
          preview: "황급한 사과",
          reaction:
            "(한 손으로 제지하며) \"앉아. 갑자기 일어나면 어지러워.\" 잠깐 나갔다 돌아온 교수님이 편의점 봉투를 책상에 올려둔다. \"1층에 자판기밖에 없더군. 에너지 음료랑 초콜릿. 시험 전날 밤샘엔 당이 필요하니까. 영수증은 됐고, 내일 시험이나 잘 보게.\"",
          emotion: "warm",
          effects: { affinity: 10, intellect: 9 },
        },
        {
          text: "......교수님이 왜 여기 계세요. (아직 꿈인 줄 안다.)",
          preview: "멍한 질문",
          reaction:
            "(피식) \"꿈 아니야. 서류 두고 온 게 있어서.\" (가방을 집으며) \"자네, 노트 필기가 반은 낙서군. 자는 사람한테 말 걸기 뭐해서 그냥 뒀지. 그나저나 낙서할 여유가 있으면 3단원 다시 보게. 내일 후회하기 싫으면.\"",
          emotion: "neutral",
          effects: { affinity: 8, intellect: 9 },
        },
      ],
    },
  ],
};

function buildSessionPackStepPayload(chapterIds: ChapterId[]): SessionPackStepPayload[] {
  return chapterIds.flatMap((chapterId) => {
    const baseSteps = (
      chapterStepScripts[chapterId] ?? [chapterFallbackDialogues[chapterId]]
    ).map(normalizeStepScriptSpeakers);
    return baseSteps.map((step, stepIndex) => ({
      chapterId,
      stepIndex,
      dialogue: step.dialogue,
      choices: step.choices.map((choice) => ({
        text: choice.text,
        preview: choice.preview,
        reaction: choice.reaction,
        emotion: choice.emotion,
        effects: choice.effects,
      })),
    }));
  });
}

const sessionPackStepPayload = buildSessionPackStepPayload(sessionPackEpisodeIds);

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
const ep03BathroomSinkBackdropImageUrl = "/backgrounds/scenes/ep03-bathroom-sink.webp";
const ep03SteakHouseBackdropImageUrl = "/backgrounds/scenes/ep03-steak-house.webp";
const ep03AfterMealCampusBackdropImageUrl = "/backgrounds/scenes/ep03-after-meal-campus.webp";
const ep04LibraryDeskPenBackdropImageUrl = "/backgrounds/scenes/ep04-library-desk-pen.webp";
const ep04LibraryReadingHallBackdropImageUrl = "/backgrounds/scenes/ep04-library-reading-hall.webp";
const ep04LibraryShelfBackdropImageUrl = "/backgrounds/scenes/ep04-library-shelf.webp";
const ep06oCampusNightBackdropImageUrl = "/backgrounds/scenes/ep06o-campus-night.webp";
const ep06oOfficeDoorCorridorBackdropImageUrl =
  "/backgrounds/scenes/ep06o-office-door-corridor.webp";
const ep06oOfficeInteriorBackdropImageUrl = "/backgrounds/scenes/ep06o-office-interior.webp";
const ep06oRainGateRollsBackdropImageUrl = "/backgrounds/scenes/ep06o-rain-gate-rolls.webp";
const ep06oRollsInteriorBackdropImageUrl = "/backgrounds/scenes/ep06o-rolls-interior.webp";
const ep06oHomeRoomBackdropImageUrl = "/backgrounds/scenes/ep06o-home-room.webp";
const ep06cClassroomNightReturnBackdropImageUrl =
  "/backgrounds/scenes/ep06c-classroom-night-return.webp";
const ep02PenGiftCutinImageUrl = "/cutins/ep02/ep02-scene06-pen-gift.webp";
const ep02CanCoffeeCutinImageUrl = "/cutins/ep02/ep02-scene03-can-coffee.webp";
const ep03cYogurtCutinImageUrl = "/cutins/ep03/ep03c-scene04-yogurt.webp";
const ep03cTissueHandkerchiefCutinImageUrl =
  "/cutins/ep03/ep03c-scene06-tissue-handkerchief.webp";
const ep04PenCloseupCutinImageUrl = "/cutins/ep04/ep04-scene01-pen-closeup.webp";
const ep06oUmbrellaCutinImageUrl = "/cutins/ep06/ep06o-scene05-umbrella.webp";
const ep06oRollsFrontCutinImageUrl = "/cutins/ep06/ep06o-scene06-rolls-front.webp";
const ep06cEnergyBagCutinImageUrl = "/cutins/ep06/ep06c-scene04-energy-bag.webp";
const screen1TitleImageUrl = "/ui/title-logo.webp";
const screen11CreditTitleImageUrl = "/ui/title-logo.webp";
const DEBUG_PASSWORD = "ssulikelion";
const debugEndingScoreMap: Record<EndingRank, number> = {
  ENDING_A_PLUS: 95,
  ENDING_B_PLUS: 78,
  ENDING_C_PLUS: 58,
  ENDING_F: 22,
};

const storySceneBackdropMap: Partial<Record<string, string>> = {
  ep03b_scene05_sink: ep03BathroomSinkBackdropImageUrl,
  ep03b_scene06_steak_1: ep03SteakHouseBackdropImageUrl,
  ep03b_scene07_steak_2: ep03SteakHouseBackdropImageUrl,
  ep03b_scene08_steak_3: ep03SteakHouseBackdropImageUrl,
  ep03b_scene09_outro: ep03AfterMealCampusBackdropImageUrl,
  ep04_scene01_intro: ep04LibraryDeskPenBackdropImageUrl,
  ep04_scene02_stacks: ep04LibraryReadingHallBackdropImageUrl,
  ep04_scene03_meet_professor: ep04LibraryShelfBackdropImageUrl,
  ep04_choice01: ep04LibraryShelfBackdropImageUrl,
  ep04_scene04_opt01: ep04LibraryShelfBackdropImageUrl,
  ep04_scene05_opt02: ep04LibraryShelfBackdropImageUrl,
  ep04_scene06_opt03: ep04LibraryShelfBackdropImageUrl,
  ep04_scene07_shelf_talk: ep04LibraryShelfBackdropImageUrl,
  ep04_choice02: ep04LibraryShelfBackdropImageUrl,
  ep04_scene08_opt01: ep04LibraryShelfBackdropImageUrl,
  ep04_scene09_opt02: ep04LibraryShelfBackdropImageUrl,
  ep04_scene10_outro: ep04LibraryShelfBackdropImageUrl,
  ep06o_scene01_intro: ep06oCampusNightBackdropImageUrl,
  ep06o_scene02_route_a: ep06oOfficeDoorCorridorBackdropImageUrl,
  ep06o_scene03_route_b: ep06oOfficeDoorCorridorBackdropImageUrl,
  ep06o_scene04_common_office: ep06oOfficeInteriorBackdropImageUrl,
  ep06o_scene05_umbrella: ep06oOfficeInteriorBackdropImageUrl,
  ep06o_scene06_rolls_intro: ep06oRainGateRollsBackdropImageUrl,
  ep06o_scene07_umbrella_keep: ep06oRainGateRollsBackdropImageUrl,
  ep06o_scene08_romance_ride: ep06oRollsInteriorBackdropImageUrl,
  ep06o_scene09_distance: ep06oRainGateRollsBackdropImageUrl,
  ep06o_scene10_home_final: ep06oHomeRoomBackdropImageUrl,
  ep06c_scene04_opt02: ep06cClassroomNightReturnBackdropImageUrl,
};

const storySceneCutinMap: Partial<Record<string, string>> = {
  ep02_scene06_pen_gift: ep02PenGiftCutinImageUrl,
  ep02_scene03_after_choice02: ep02CanCoffeeCutinImageUrl,
  ep03c_scene04_opt03: ep03cYogurtCutinImageUrl,
  ep03c_scene06_outro: ep03cTissueHandkerchiefCutinImageUrl,
  ep04_scene01_intro: ep04PenCloseupCutinImageUrl,
  ep06o_scene05_umbrella: ep06oUmbrellaCutinImageUrl,
  ep06o_scene06_rolls_intro: ep06oRollsFrontCutinImageUrl,
  ep06c_scene04_opt02: ep06cEnergyBagCutinImageUrl,
};

const storySceneCutinTriggerPatternMap: Partial<Record<string, RegExp>> = {
  ep02_scene06_pen_gift: /(볼펜|펜|잉크|반납)/,
  ep02_scene03_after_choice02: /캔커피/,
  ep03c_scene04_opt03: /요구르트/,
  ep03c_scene06_outro: /(휴지|손수건)/,
  ep04_scene01_intro: /(볼펜|펜|잉크)/,
  ep06o_scene05_umbrella: /우산/,
  ep06o_scene06_rolls_intro: /롤스로이스/,
  ep06c_scene04_opt02: /(에너지\s*음료|봉투)/,
};

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

function ensureDialogueSpeakerPrefix(text: string, defaultSpeaker: DialogueSpeakerLabel) {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  if (/^\s*(나레이션|narration|교수님?|professor|학생|플레이어|player|나)\s*[:：]\s*/i.test(trimmed)) {
    return trimmed;
  }

  if (defaultSpeaker === "나레이션") {
    return `나레이션: ${trimmed}`;
  }

  if (defaultSpeaker === "교수") {
    return `교수: ${trimmed}`;
  }

  return `나: ${trimmed}`;
}

function normalizeStepScriptSpeakers(step: ChapterStep): ChapterStep {
  return {
    dialogue: ensureDialogueSpeakerPrefix(step.dialogue, "나레이션"),
    choices: step.choices.map((choice) => ({
      ...choice,
      reaction: ensureDialogueSpeakerPrefix(choice.reaction, "교수"),
    })),
  };
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

const storyEpisodes = professorRouteStory.episodes as readonly StoryEpisode[];

const storyEpisodeMap = new Map<string, StoryEpisode>(
  storyEpisodes.map((episode) => [episode.id, episode] as const),
);

const storyEpisodeToChapterIdMap: Record<string, ChapterId> = {
  ep01_commute: "COMMUTE_CAMPUS",
  ep02_morning_classroom: "MORNING_CLASSROOM",
  ep03_lunch_student_cafeteria: "LUNCH_STUDENT_CAFETERIA",
  ep03_lunch_off_campus_restaurant: "LUNCH_OFFCAMPUS_RESTAURANT",
  ep03_lunch_bathroom_stall: "LUNCH_RESTROOM_STALL",
  ep04_library: "AFTERNOON_LIBRARY",
  ep05_simple_dinner: "LIGHT_DINNER",
  ep06_night_professor_office: "NIGHT_LAB_VISIT",
  ep06_night_bench: "NIGHT_CAMPUS_WALK",
  ep06_night_classroom: "NIGHT_SELF_STUDY",
};

function getStoryEpisode(episodeId: string) {
  return storyEpisodeMap.get(episodeId) ?? null;
}

function getStoryScene(episodeId: string, sceneId: string) {
  return getStoryEpisode(episodeId)?.scenes.find((scene) => scene.id === sceneId) ?? null;
}

function getFirstSceneId(episodeId: string) {
  return getStoryEpisode(episodeId)?.scenes[0]?.id ?? null;
}

function replaceStoryPlaceholders(text: string, playerName: string, professorName: string) {
  return text
    .replace(/__(?=님의|님의|님\b| 교수님| 교수|의 연구실)/g, professorName)
    .replace(/__ 학생/g, `${playerName} 학생`)
    .replace(/__/g, playerName);
}

function storyRoleToSpeaker(role: StoryRole): DialogueSpeakerLabel {
  if (role === "professor") {
    return "교수";
  }

  if (role === "student") {
    return "나";
  }

  if (role === "monologue") {
    return "독백";
  }

  if (role === "side_male") {
    return "남성";
  }

  return "나레이션";
}

function buildStoryLineText(
  text: string,
  playerName: string,
  professorName: string,
  extras?: Array<string | undefined>,
) {
  const prefix = (extras ?? [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .map((value) => `(${replaceStoryPlaceholders(value, playerName, professorName)})`)
    .join(" ");
  const resolvedText = replaceStoryPlaceholders(text, playerName, professorName);
  return prefix ? `${prefix} ${resolvedText}` : resolvedText;
}

function applyProfessorSpeakingStyle(text: string, speakingStyle: string) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const applyRules = (base: string, rules: Array<[RegExp, string]>) =>
    rules.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), base);

  if (speakingStyle.includes("차분하고 이성적인")) {
    return applyRules(trimmed, [
      [/허\.\.\./g, "흠..."],
      [/아니, /g, "아니, 우선 "],
      [/좋아,/g, "좋아. 우선"],
      [/기대하겠네/g, "기대하고 있겠네"],
      [/조심하게/g, "조심하는 편이 좋겠네"],
      [/자, /g, "자, 차분히 "],
    ]);
  }

  if (speakingStyle.includes("무심한 츤데레")) {
    return applyRules(trimmed, [
      [/좋아\./g, "흥, 좋아."],
      [/좋아,/g, "흥, 좋아."],
      [/자, /g, "자, 얼른 "],
      [/고맙네/g, "고맙긴 하군"],
      [/걱정 말게/g, "쓸데없는 걱정은 말게"],
      [/기대하겠네/g, "기대는 하겠네, 뭐"],
      [/그럼/g, "그럼, 흥"],
      [/괜찮/g, "나쁘지 않"],
      [/정말/g, "꽤"],
      [/따뜻/g, "의외로 나쁘지 않"],
      [/아쉽게도/g, "안됐지만"],
    ]);
  }

  if (speakingStyle.includes("유머 섞인 직설")) {
    return applyRules(trimmed, [
      [/좋아\./g, "좋아. 아주 솔직해서 좋군."],
      [/자, /g, "자, 어디 한 번 "],
      [/곤란하군/g, "곤란하군. 아주 제대로 곤란해"],
      [/기대하겠네/g, "기대하겠네. 웃기게도 말이야"],
      [/조심하게/g, "조심하게. 안 그러면 바로 티 나니까"],
      [/허\.\.\./g, "하, 이런"],
      [/그렇네\./g, "그렇네. 뻔하지만 사실이지."],
      [/좋군\./g, "좋군. 아주 선명해서 좋네."],
      [/정말/g, "진짜"],
      [/아쉽게도/g, "유감스럽지만"],
    ]);
  }

  if (speakingStyle.includes("다정하지만 단호한")) {
    return applyRules(trimmed, [
      [/좋아\./g, "좋아. 다만 선은 지키게."],
      [/자, /g, "자, 천천히 "],
      [/걱정 말게/g, "걱정하지 말게"],
      [/조심하게/g, "조심하게. 그건 분명히 말해 두지"],
      [/기대하겠네/g, "기대하겠네. 그러니 실망시키진 말게"],
      [/괜찮아?/g, "괜찮나?"],
      [/기억하게/g, "기억해 두게"],
      [/괜찮/g, "괜찮네"],
      [/허\.\.\./g, "음..."],
    ]);
  }

  return trimmed;
}

function resolveSceneLines(
  scene: StoryScene,
  playerName: string,
  professorName: string,
  professorSpeakingStyle: string,
): Array<{ speaker: DialogueSpeakerLabel; text: string }> {
  const stageLines = (scene.stage_direction ?? []).map((direction) => ({
    speaker: "나레이션" as const,
    text: `(${replaceStoryPlaceholders(direction, playerName, professorName)})`,
  }));

  const contentLines = (scene.lines ?? []).map((line) => ({
    speaker: storyRoleToSpeaker(line.role),
    text:
      line.role === "professor"
        ? applyProfessorSpeakingStyle(
            buildStoryLineText(line.text, playerName, professorName, [line.expression, line.action]),
            professorSpeakingStyle,
          )
        : buildStoryLineText(line.text, playerName, professorName, [line.expression, line.action]),
  }));

  return [...stageLines, ...contentLines];
}

function getStoryEpisodeNumber(episodeId: string) {
  if (episodeId.startsWith("ep01")) return 1;
  if (episodeId.startsWith("ep02")) return 2;
  if (episodeId.startsWith("ep03")) return 3;
  if (episodeId.startsWith("ep04")) return 4;
  if (episodeId.startsWith("ep05")) return 5;
  if (episodeId.startsWith("ep06")) return 6;
  return 1;
}

const choiceAffinityMap: Record<string, number> = {
  ep02_c01_opt01: 2,
  ep02_c01_opt02: 2,
  ep02_c01_opt03: 0,
  ep02_c02_opt01: 2,
  ep02_c02_opt02: 1,
  ep02_c03_opt01: 2,
  ep02_c03_opt02: 2,
  ep02_c03_opt03: 0,
  ep03b_c01_opt01: 1,
  ep03b_c01_opt02: 0,
  ep03b_c01_opt03: 0,
  ep03b_c02_opt01: 2,
  ep03b_c02_opt02: 0,
  ep03b_c02_opt03: 1,
  ep03c_c01_opt01: 1,
  ep03c_c01_opt02: 2,
  ep03c_c01_opt03: 1,
  ep03c_c02_opt01: 1,
  ep03c_c02_opt02: 2,
  ep03r_c01_opt01: 1,
  ep03r_c01_opt02: 2,
  ep03r_c01_opt03: 0,
  ep04_c01_opt01: 1,
  ep04_c01_opt02: 2,
  ep04_c01_opt03: 0,
  ep04_c02_opt01: 1,
  ep04_c02_opt02: 2,
  ep05_c01_opt01: 2,
  ep05_c01_opt02: 1,
  ep05_c01_opt03: 2,
  ep06o_c01_opt01: 2,
  ep06o_c01_opt02: 1,
  ep06o_c02_opt01: 2,
  ep06o_c02_opt02: 2,
  ep06o_c02_opt03: 0,
  ep06b_c01_opt01: 2,
  ep06b_c01_opt02: 2,
  ep06b_c01_opt03: 1,
  ep06b_c02_opt01: 1,
  ep06b_c02_opt02: 2,
  ep06c_c01_opt01: 1,
  ep06c_c01_opt02: 2,
  ep06c_c01_opt03: 1,
};

function getChoiceAffinity(choiceId: string) {
  return choiceAffinityMap[choiceId] ?? 1;
}

function storyEndingKeyByRank(rank: EndingRank): StoryEndingRankKey {
  if (rank === "ENDING_A_PLUS") return "a_plus_grad_school";
  if (rank === "ENDING_B_PLUS") return "ending_b";
  if (rank === "ENDING_C_PLUS") return "c_plus_retake";
  return "hidden_ending_f";
}

function buildVariantSummary(
  variant: StoryEndingVariant,
  rank: EndingRank,
) {
  const rankSummary = endingMeta[rank].description;

  const subtypeSummaryMap: Record<string, string> = {
    "집착형": "교수는 학생의 뛰어난 성과를 핑계 삼아 관계를 더 오래 붙들어 두려 한다.",
    "유혹형": "칭찬은 달콤하지만, 그 제안은 학점 이상의 무게로 학생을 끌어당긴다.",
    "현실 공포형": "성공의 기쁨은 곧바로 되돌릴 수 없는 운명처럼 뒤틀린다.",
    "아련한 납치": "끝난 줄 알았던 인연은 오히려 더 길고 진하게 이어질 조짐을 보인다.",
    "노예 계약형": "애매한 성적은 더 미묘한 대가를 부르고, 교수는 그 틈을 놓치지 않는다.",
    "안면 몰수형": "하루의 특별함은 성적표 앞에서 냉정하게 지워지고, 관계는 다시 멀어진다.",
    "불합격 통보형": "아슬아슬한 통과는 실패보다 더 질긴 방식으로 다음 학기를 예고한다.",
    "미련 곰탱이형": "교수는 아직 끝나지 않았다는 듯 재수강을 새로운 인연의 연장선으로 만든다.",
    "쿨한 재수강 환영형": "담담한 말투 아래, 다시 만나게 될 미래가 이미 예정된 것처럼 깔린다.",
    "장르 급발진형": "낙제의 충격은 캠퍼스 로맨스를 통째로 다른 장르로 비틀어 버린다.",
    "갑분 스릴러형": "시험 결과는 관계의 끝이 아니라, 위험한 비밀극의 입구가 되어 버린다.",
    "환생형": "현실은 무너지고, 학생은 말도 안 되는 방식으로 교수 곁에 남겨진다.",
  };

  const subtypeSummary = subtypeSummaryMap[variant.subtype] ?? "";
  return [rankSummary, subtypeSummary].filter(Boolean).join(" ");
}

function buildVariantLines(
  variant: StoryEndingVariant,
  playerName: string,
  professorName: string,
  professorSpeakingStyle: string,
) {
  const stageLines = (variant.stage_direction ?? []).map(
    (line) => `나레이션: (${replaceStoryPlaceholders(line, playerName, professorName)})`,
  );
  const contentLines = variant.lines.map((line) => {
    const speaker = storyRoleToSpeaker(line.role);
    const baseText = buildStoryLineText(line.text, playerName, professorName, [
      line.action,
      line.expression,
    ]);
    const text =
      line.role === "professor"
        ? applyProfessorSpeakingStyle(baseText, professorSpeakingStyle)
        : baseText;
    return `${speaker}: ${text}`;
  });

  return [...stageLines, ...contentLines];
}

function parseVariantDisplayLine(line: string) {
  const match = /^(교수|나레이션|나|독백|남성):\s*(.*)$/.exec(line);
  if (!match) {
    return { speaker: "대사", text: line };
  }

  return {
    speaker: match[1],
    text: match[2],
  };
}

function pickEndingVariant(
  rank: EndingRank,
  choiceHistory: string[],
  finalEpisodeId: string | null,
): StoryEndingVariant {
  const catalogKey = storyEndingKeyByRank(rank);
  const catalog = storyEndingCatalog[catalogKey];

  if (rank === "ENDING_A_PLUS") {
    if (choiceHistory.includes("ep06o_c02_opt02")) {
      return catalog.variants[1];
    }
    if (choiceHistory.includes("ep06o_c02_opt03")) {
      return catalog.variants[2];
    }
    if (finalEpisodeId === "ep06_night_bench") {
      return catalog.variants[3];
    }
    return catalog.variants[0];
  }

  if (rank === "ENDING_B_PLUS") {
    if (choiceHistory.includes("ep06o_c02_opt03") || choiceHistory.includes("ep03r_c01_opt03")) {
      return catalog.variants[1];
    }
    return catalog.variants[0];
  }

  if (rank === "ENDING_C_PLUS") {
    if (finalEpisodeId === "ep06_night_classroom") {
      return catalog.variants[1];
    }
    if (finalEpisodeId === "ep06_night_bench") {
      return catalog.variants[2];
    }
    return catalog.variants[0];
  }

  if (choiceHistory.includes("ep02_c03_opt03")) {
    return catalog.variants[0];
  }
  if (choiceHistory.includes("ep06o_c02_opt03")) {
    return catalog.variants[1];
  }
  return catalog.variants[2];
}

function getEndingExpressionKey(rank: EndingRank, variant: StoryEndingVariant) {
  if (rank === "ENDING_F") {
    return "EXP_3";
  }

  if (variant.subtype.includes("집착") || variant.subtype.includes("유혹")) {
    return "EXP_2";
  }

  if (
    variant.subtype.includes("현실 공포") ||
    variant.subtype.includes("안면 몰수") ||
    variant.subtype.includes("불합격")
  ) {
    return "EXP_3";
  }

  return "EXP_1";
}

function inferExpressionKeyFromText(text: string) {
  const value = text.trim();

  if (!value) {
    return "EXP_1";
  }

  if (
    /(미소|웃|따뜻|다행|고맙|칭찬|기대|보증|좋아|괜찮|따라와|버킷리스트|따뜻하|호의|감사)/.test(
      value,
    )
  ) {
    return "EXP_2";
  }

  if (
    /(늦었|질문|긴장|압박|실망|악랄|후회|조심|F|사각지대|못 볼|단호|거리|부담|도망|숨|들켰)/.test(
      value,
    )
  ) {
    return "EXP_3";
  }

  return "EXP_1";
}

const defaultExpressionSet: SessionExpressionDefinition[] = [
  {
    key: "EXP_1",
    label: "차분한 기본",
    direction: "calm neutral expression, gentle eye contact, composed professor vibe",
    reason: "전체 에피소드의 기본 대사와 안정 구간을 담당",
  },
  {
    key: "EXP_2",
    label: "미소/호감",
    direction: "warm subtle smile, softened eyes, approachable and affectionate tone",
    reason: "호감 상승, 장난기, 친밀한 반응 구간에 사용",
  },
  {
    key: "EXP_3",
    label: "단호/긴장",
    direction: "stern focused expression, tighter brows, disciplined professor authority",
    reason: "긴장, 압박, 당황 반응 구간을 담당",
  },
];

const defaultSpriteCues: Partial<Record<ChapterId, ChapterSpriteCue>> = {
  COMMUTE_CAMPUS: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_1", "EXP_1"],
  },
  MORNING_CLASSROOM: {
    dialogueExpressionKey: "EXP_3",
    choiceReactionExpressionKeys: ["EXP_2", "EXP_2", "EXP_3"],
  },
  LUNCH_STUDENT_CAFETERIA: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_2", "EXP_1", "EXP_2"],
  },
  LUNCH_OFFCAMPUS_RESTAURANT: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_2", "EXP_1"],
  },
  LUNCH_RESTROOM_STALL: {
    dialogueExpressionKey: "EXP_3",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_3", "EXP_3"],
  },
  AFTERNOON_LIBRARY: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_2", "EXP_3"],
  },
  LIGHT_DINNER: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_1", "EXP_1"],
  },
  NIGHT_LAB_VISIT: {
    dialogueExpressionKey: "EXP_2",
    choiceReactionExpressionKeys: ["EXP_2", "EXP_2", "EXP_3"],
  },
  NIGHT_CAMPUS_WALK: {
    dialogueExpressionKey: "EXP_2",
    choiceReactionExpressionKeys: ["EXP_2", "EXP_2", "EXP_1"],
  },
  NIGHT_SELF_STUDY: {
    dialogueExpressionKey: "EXP_1",
    choiceReactionExpressionKeys: ["EXP_1", "EXP_2", "EXP_1"],
  },
};

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
  const [storyCursor, setStoryCursor] = useState<{
    episodeId: string;
    sceneId: string;
    lineIndex: number;
  } | null>(null);
  const [pendingChoice, setPendingChoice] = useState<StoryChoice | null>(null);
  const [choiceHistory, setChoiceHistory] = useState<string[]>([]);
  const [maxScore, setMaxScore] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [storyLog, setStoryLog] = useState<string[]>([]);
  const [affinityDelta, setAffinityDelta] = useState<{ value: number; id: number } | null>(null);
  const affinityDeltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heartPulse, setHeartPulse] = useState<"increase" | "decrease" | null>(null);
  const heartPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleImageRef = useRef<HTMLImageElement | null>(null);
  const particleFrameRef = useRef<number | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveNextChapterRef = useRef<() => void>(() => {});
  const revealCurrentDialogueImmediatelyRef = useRef<() => void>(() => {});
  const isDialogueLineTypingRef = useRef(false);
  const canAdvanceCurrentStepRef = useRef(false);

  const [ending, setEnding] = useState<EndingState | null>(null);
  const [isCreditFinished, setIsCreditFinished] = useState(false);
  const [isScreen1TitleImageErrored, setIsScreen1TitleImageErrored] = useState(false);
  const [isScreen11TitleImageErrored, setIsScreen11TitleImageErrored] = useState(false);
  const [sessionExpressionSet, setSessionExpressionSet] = useState<
    SessionExpressionDefinition[]
  >(defaultExpressionSet);
  const [sessionSpriteCues, setSessionSpriteCues] = useState<
    Partial<Record<ChapterId, ChapterSpriteCue>>
  >(normalizeSpriteCueMap(defaultSpriteCues));
  const [typedProfessorLine, setTypedProfessorLine] = useState("");
  const [isAutoPlayOn, setIsAutoPlayOn] = useState(false);
  const [visibleSceneCutinUrl, setVisibleSceneCutinUrl] = useState<string | null>(null);
  const [isSceneCutinVisible, setIsSceneCutinVisible] = useState(false);
  const [isDebugUnlocked, setIsDebugUnlocked] = useState(false);
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [isDebugPasswordModalOpen, setIsDebugPasswordModalOpen] = useState(false);
  const [debugPasswordInput, setDebugPasswordInput] = useState("");
  const [debugAuthError, setDebugAuthError] = useState("");
  const [debugAffinityInput, setDebugAffinityInput] = useState(0);
  const [debugEpisodeSelect, setDebugEpisodeSelect] = useState("ep01_commute");
  const [debugSceneSelect, setDebugSceneSelect] = useState("ep01_scene01");
  const [debugEndingSelect, setDebugEndingSelect] = useState<EndingRank>("ENDING_A_PLUS");
  const [debugEndingVariantIndex, setDebugEndingVariantIndex] = useState(0);

  const debugPhaseButtons: Array<{ phase: Phase; label: string }> = [
    { phase: "screen1_title", label: "화면1 타이틀" },
    { phase: "screen2_player", label: "화면2 플레이어" },
    { phase: "screen3_professor", label: "화면3 교수 생성" },
    { phase: "screen4_8_chapter", label: "화면4~8 플레이" },
    { phase: "screen10_reality", label: "화면10 현실" },
    { phase: "screen11_credit", label: "화면11 크레딧" },
  ];

  const playerName = useMemo(() => toDisplayPlayerName(player.name), [player.name]);
  const professorName = useMemo(() => toDisplayProfessorName(professor.name), [professor.name]);
  const realityProfessorName = useMemo(
    () => toRealityProfessorLabel(professor.name),
    [professor.name],
  );

  const currentEpisode = storyCursor ? getStoryEpisode(storyCursor.episodeId) : null;
  const currentScene = storyCursor ? getStoryScene(storyCursor.episodeId, storyCursor.sceneId) : null;
  const currentSceneLines = useMemo(() => {
    if (!currentEpisode || !currentScene) {
      return [];
    }

    return resolveSceneLines(currentScene, playerName, professorName, professor.speakingStyle);
  }, [currentEpisode, currentScene, playerName, professor.speakingStyle, professorName]);
  const currentLine =
    !pendingChoice && storyCursor && storyCursor.lineIndex < currentSceneLines.length
      ? currentSceneLines[storyCursor.lineIndex]
      : null;
  const currentChoiceList = useMemo(
    () =>
      currentScene &&
      !pendingChoice &&
      storyCursor &&
      storyCursor.lineIndex >= currentSceneLines.length
        ? [...(currentScene.choices ?? [])]
        : [],
    [currentScene, currentSceneLines.length, pendingChoice, storyCursor],
  );
  const hasCurrentChoices = currentChoiceList.length > 0;
  const currentEpisodeNumber = currentEpisode ? getStoryEpisodeNumber(currentEpisode.id) : 1;
  const currentSceneIndex = currentEpisode && currentScene
    ? currentEpisode.scenes.findIndex((scene) => scene.id === currentScene.id) + 1
    : 1;
  const currentChapterInfo = currentEpisode
    ? {
        title: currentEpisode.title,
        location: currentEpisode.location,
        backdrop: storyEpisodeBackdropMap[currentEpisode.id] ?? preGameBackgroundImageUrl,
      }
    : null;
  const currentLegacyChapterId = currentEpisode
    ? storyEpisodeToChapterIdMap[currentEpisode.id]
    : null;
  const currentSceneBackdropUrl = currentScene ? storySceneBackdropMap[currentScene.id] : undefined;
  const currentSceneCutinUrl = currentScene ? storySceneCutinMap[currentScene.id] : undefined;
  const currentSceneCutinTriggerPattern = currentScene
    ? storySceneCutinTriggerPatternMap[currentScene.id]
    : undefined;
  const currentBackdropLayers = [
    currentSceneBackdropUrl,
    currentChapterInfo?.backdrop ?? preGameBackgroundImageUrl,
  ].filter((value): value is string => Boolean(value));
  const endingBackdrop =
    currentChapterInfo?.backdrop ?? generatedImageUrl ?? preGameBackgroundImageUrl;
  const activeSpeakerLabel = pendingChoice ? "나" : currentLine?.speaker ?? "나레이션";
  const activeDialogueLine = pendingChoice
    ? replaceStoryPlaceholders(pendingChoice.text, playerName, professorName)
    : currentLine?.text ?? "";
  const currentStoryLineText = currentLine?.text ?? "";
  const isDialogueLineTyping =
    phase === "screen4_8_chapter" &&
    activeDialogueLine.length > 0 &&
    typedProfessorLine !== activeDialogueLine;
  const shouldShowChoiceOverlay =
    hasCurrentChoices && !isDialogueLineTyping;
  const canAdvanceCurrentStep =
    (!hasCurrentChoices || Boolean(pendingChoice) || currentLine !== null) && !isDialogueLineTyping;
  const shouldDimProfessorSprite = !pendingChoice && currentLine?.speaker === "교수" ? false : true;
  const shouldShowSceneCutin = useMemo(() => {
    if (!currentSceneCutinUrl || !currentStoryLineText.trim()) {
      return false;
    }

    if (!currentSceneCutinTriggerPattern) {
      return true;
    }

    return currentSceneCutinTriggerPattern.test(currentStoryLineText);
  }, [currentSceneCutinTriggerPattern, currentSceneCutinUrl, currentStoryLineText]);

  function revealCurrentDialogueImmediately() {
    const line = activeDialogueLine.trim();
    if (!line) {
      return;
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setTypedProfessorLine(line);
  }

  isDialogueLineTypingRef.current = isDialogueLineTyping;
  canAdvanceCurrentStepRef.current = canAdvanceCurrentStep;
  revealCurrentDialogueImmediatelyRef.current = revealCurrentDialogueImmediately;
  moveNextChapterRef.current = moveNextChapter;

  useEffect(() => {
    if (phase !== "screen4_8_chapter") {
      setIsSceneCutinVisible(false);
      setVisibleSceneCutinUrl(null);
      return;
    }

    if (shouldShowSceneCutin && currentSceneCutinUrl) {
      setVisibleSceneCutinUrl(currentSceneCutinUrl);
      requestAnimationFrame(() => {
        setIsSceneCutinVisible(true);
      });
      return;
    }

    setIsSceneCutinVisible(false);
  }, [currentSceneCutinUrl, phase, shouldShowSceneCutin]);

  useEffect(() => {
    if (isSceneCutinVisible || !visibleSceneCutinUrl) {
      return;
    }

    const timer = setTimeout(() => {
      setVisibleSceneCutinUrl(null);
    }, 260);

    return () => {
      clearTimeout(timer);
    };
  }, [isSceneCutinVisible, visibleSceneCutinUrl]);

  const activeProfessorImageUrl = useMemo(() => {
    if (!generatedImageUrl) {
      return "";
    }

    const chapterCue = currentLegacyChapterId ? sessionSpriteCues[currentLegacyChapterId] : undefined;
    const choiceIndex = pendingChoice
      ? currentChoiceList.findIndex((choice) => choice.id === pendingChoice.id)
      : -1;
    const cueKey =
      choiceIndex >= 0
        ? chapterCue?.choiceReactionExpressionKeys?.[choiceIndex]
        : chapterCue?.dialogueExpressionKey;
    const inferredKey = inferExpressionKeyFromText(activeDialogueLine);
    const preferredKey = cueKey || inferredKey;
    const mappedImage = generatedExpressionImageUrls[preferredKey];

    if (typeof mappedImage === "string" && mappedImage.length > 0) {
      return mappedImage;
    }

    return generatedImageUrl;
  }, [
    activeDialogueLine,
    currentChoiceList,
    currentLegacyChapterId,
    generatedExpressionImageUrls,
    generatedImageUrl,
    pendingChoice,
    sessionSpriteCues,
  ]);
  const endingProfessorImageUrl = useMemo(() => {
    if (!generatedImageUrl) {
      return "";
    }

    if (ending?.expressionKey) {
      const mapped = generatedExpressionImageUrls[ending.expressionKey];
      if (typeof mapped === "string" && mapped.length > 0) {
        return mapped;
      }
    }

    return generatedImageUrl;
  }, [ending?.expressionKey, generatedExpressionImageUrls, generatedImageUrl]);
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
    maxScore > 0 ? Math.min(100, Math.round((Math.max(0, rawScore) / maxScore) * 100)) : 0;
  const visibleAffinityPercent = affinityPercent > 0 ? Math.max(6, affinityPercent) : 0;
  const affinityKnobPercent = Math.max(3, Math.min(97, visibleAffinityPercent));
  const affinityMood = getAffinityMood(affinityPercent);
  const debugEndingCatalog = storyEndingCatalog[storyEndingKeyByRank(debugEndingSelect)];
  const debugEndingVariants = debugEndingCatalog.variants;

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
      if (heartPulseTimerRef.current) {
        clearTimeout(heartPulseTimerRef.current);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
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
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    if (phase !== "screen4_8_chapter") {
      setTypedProfessorLine("");
      return;
    }

    const line = activeDialogueLine.trim();

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

    const tick = () => {
      frameIndex += 1;

      if (frameIndex >= frames.length) {
        typingTimerRef.current = null;
        return;
      }

      setTypedProfessorLine(frames[frameIndex]);
      typingTimerRef.current = setTimeout(tick, 52);
    };

    typingTimerRef.current = setTimeout(tick, 52);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [activeDialogueLine, phase]);

  useEffect(() => {
    if (phase !== "screen4_8_chapter") {
      return;
    }

    const handleSpaceAdvance = (event: KeyboardEvent) => {
      const isSpace = event.code === "Space" || event.key === " " || event.key === "Spacebar";
      if (!isSpace) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();

      if (isDialogueLineTypingRef.current) {
        revealCurrentDialogueImmediatelyRef.current();
        return;
      }

      if (canAdvanceCurrentStepRef.current) {
        moveNextChapterRef.current();
      }
    };

    window.addEventListener("keydown", handleSpaceAdvance);
    return () => {
      window.removeEventListener("keydown", handleSpaceAdvance);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "screen4_8_chapter" || !isAutoPlayOn || !canAdvanceCurrentStep) {
      return;
    }

    const timer = setTimeout(() => {
      moveNextChapterRef.current();
    }, 420);

    return () => {
      clearTimeout(timer);
    };
  }, [canAdvanceCurrentStep, isAutoPlayOn, phase]);

  useEffect(() => {
    if (phase !== "screen4_8_chapter") {
      setIsAutoPlayOn(false);
    }
  }, [phase]);

  useEffect(() => {
    setDebugAffinityInput(affinityPercent);
  }, [affinityPercent]);

  useEffect(() => {
    setDebugEndingVariantIndex(0);
  }, [debugEndingSelect]);

  useEffect(() => {
    if (debugEndingVariantIndex < debugEndingVariants.length) {
      return;
    }

    setDebugEndingVariantIndex(Math.max(debugEndingVariants.length - 1, 0));
  }, [debugEndingVariantIndex, debugEndingVariants]);

  useEffect(() => {
    const episode = getStoryEpisode(debugEpisodeSelect);
    const firstSceneId = episode?.scenes[0]?.id ?? "";
    const hasCurrentScene = episode?.scenes.some((scene) => scene.id === debugSceneSelect);

    if (!hasCurrentScene && firstSceneId) {
      setDebugSceneSelect(firstSceneId);
    }
  }, [debugEpisodeSelect, debugSceneSelect]);

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

  function openStoryDebugContext(targetEpisodeId: string, targetSceneId?: string) {
    const firstSceneId = targetSceneId || getFirstSceneId(targetEpisodeId);
    if (!firstSceneId) {
      return;
    }

    setStoryCursor({
      episodeId: targetEpisodeId,
      sceneId: firstSceneId,
      lineIndex: 0,
    });
    setPendingChoice(null);
    setPhase("screen4_8_chapter");
  }

  function previewEndingByRank(rank: EndingRank, variantIndex = 0) {
    const variants = storyEndingCatalog[storyEndingKeyByRank(rank)].variants;
    const safeVariantIndex = Math.min(Math.max(variantIndex, 0), variants.length - 1);
    const variant = variants[safeVariantIndex];
    setEnding({
      rank,
      title: `${endingMeta[rank].title} · ${variant.title}`,
      description: buildVariantSummary(variant, rank),
      score100: debugEndingScoreMap[rank],
      variantId: variant.id,
      variantSubtype: variant.subtype,
      variantLines: buildVariantLines(variant, playerName, professorName, professor.speakingStyle),
      expressionKey: getEndingExpressionKey(rank, variant),
    });
    setPhase("screen9_ending");
  }

  function jumpToPhaseByDebug(targetPhase: Phase) {
    if (targetPhase === "screen4_8_chapter") {
      openStoryDebugContext(debugEpisodeSelect, debugSceneSelect);
      return;
    }

    if (targetPhase === "screen9_ending") {
      previewEndingByRank(debugEndingSelect, debugEndingVariantIndex);
      return;
    }

    if (targetPhase === "screen10_reality" && !ending) {
      previewEndingByRank(debugEndingSelect, debugEndingVariantIndex);
    }

    if (targetPhase === "screen11_credit") {
      setIsCreditFinished(false);
    }

    setPhase(targetPhase);
  }

  function applyDebugAffinity() {
    const nextPercent = Math.max(0, Math.min(100, Math.round(debugAffinityInput)));
    const prevPercent = affinityPercent;
    const scoreBase = Math.max(maxScore, 20);
    const nextRawScore = Math.round((nextPercent / 100) * scoreBase);
    
    setDebugAffinityInput(nextPercent);
    setRawScore(nextRawScore);
    setMaxScore(scoreBase);
    setAffinityDelta(null);

    if (nextPercent !== prevPercent) {
      setHeartPulse(nextPercent > prevPercent ? "increase" : "decrease");
      if (heartPulseTimerRef.current) clearTimeout(heartPulseTimerRef.current);
      heartPulseTimerRef.current = setTimeout(() => {
        setHeartPulse(null);
        heartPulseTimerRef.current = null;
      }, 400);
    }
  }

  function handleDebugButtonClick() {
    if (!isDebugUnlocked) {
      setDebugPasswordInput("");
      setDebugAuthError("");
      setIsDebugPasswordModalOpen(true);
      return;
    }
    setIsDebugPanelOpen((current) => !current);
  }

  function submitDebugPassword() {
    if (debugPasswordInput.trim() !== DEBUG_PASSWORD) {
      setDebugAuthError("비밀번호가 틀렸습니다.");
      return;
    }
    setIsDebugUnlocked(true);
    setIsDebugPasswordModalOpen(false);
    setDebugAuthError("");
    setIsDebugPanelOpen(true);
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

  function prepareSessionPack(resolvedProfessor: ProfessorFormState) {
    void sessionPackStepPayload.length;
    setProfessor(resolvedProfessor);
    setRawScore(0);
    setMaxScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setEnding(null);
    setSessionExpressionSet(defaultExpressionSet);
    setSessionSpriteCues(normalizeSpriteCueMap(defaultSpriteCues));
    setStoryLog([
      `${playerName}(${player.gender})의 시험기간 시뮬레이션 시작`,
      `${toDisplayProfessorName(resolvedProfessor.name)} 교수님과의 첫 만남이 시작되었다.`,
    ]);
    return defaultExpressionSet;
  }

  function startStory() {
    const resolvedProfessor = resolveProfessorForGeneration(professor);
    prepareSessionPack(resolvedProfessor);
    const firstEpisodeId = "ep01_commute";
    const firstSceneId = getFirstSceneId(firstEpisodeId);
    if (!firstSceneId) {
      return;
    }
    setStoryCursor({ episodeId: firstEpisodeId, sceneId: firstSceneId, lineIndex: 0 });
    setPendingChoice(null);
    setChoiceHistory([]);
    setRawScore(0);
    setMaxScore(0);
    setPhase("screen4_8_chapter");
  }

  async function makeProfessorAndStartStory() {
    if (isGeneratingImage) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);

    const expressionSetFromSession = prepareSessionPack(resolvedProfessor);
    await generateProfessorImage({
      resolvedProfessor,
      expressionSet: expressionSetFromSession,
    });
    const firstEpisodeId = "ep01_commute";
    const firstSceneId = getFirstSceneId(firstEpisodeId);
    if (!firstSceneId) {
      return;
    }
    setStoryCursor({ episodeId: firstEpisodeId, sceneId: firstSceneId, lineIndex: 0 });
    setPendingChoice(null);
    setChoiceHistory([]);
    setRawScore(0);
    setMaxScore(0);
    setPhase("screen4_8_chapter");
  }

  function moveToEpisode(episodeId: string) {
    const firstSceneId = getFirstSceneId(episodeId);
    if (!firstSceneId) {
      return;
    }

    setStoryCursor({
      episodeId,
      sceneId: firstSceneId,
      lineIndex: 0,
    });
  }

  function moveToScene(episodeId: string, sceneId: string) {
    setStoryCursor({
      episodeId,
      sceneId,
      lineIndex: 0,
    });
  }

  function chooseOption(choiceIndex: number) {
    if (!hasCurrentChoices || pendingChoice) {
      return;
    }

    const choice = currentChoiceList[choiceIndex];
    if (!choice) {
      return;
    }

    setPendingChoice(choice);
    const gainedScore = getChoiceAffinity(choice.id);
    setChoiceHistory((current) => [...current, choice.id]);
    setRawScore((current) => current + gainedScore);
    setMaxScore((current) => current + 2);

    if (gainedScore !== 0) {
      setHeartPulse(gainedScore > 0 ? "increase" : "decrease");
      if (heartPulseTimerRef.current) clearTimeout(heartPulseTimerRef.current);
      heartPulseTimerRef.current = setTimeout(() => {
        setHeartPulse(null);
        heartPulseTimerRef.current = null;
      }, 400);
    }

    if (gainedScore > 0) {
      setAffinityDelta({ value: gainedScore, id: Date.now() });
      if (affinityDeltaTimerRef.current) {
        clearTimeout(affinityDeltaTimerRef.current);
      }
      affinityDeltaTimerRef.current = setTimeout(() => {
        setAffinityDelta(null);
      }, 1200);
    } else {
      setAffinityDelta(null);
    }

    setStoryLog((current) => [
      ...current,
      `[${currentEpisodeNumber}에피소드] ${replaceStoryPlaceholders(choice.text, playerName, professorName)}`,
    ]);
  }

  function moveNextChapter() {
    if (!storyCursor || !currentScene || !canAdvanceCurrentStep) {
      return;
    }

    if (pendingChoice) {
      setPendingChoice(null);

      if (pendingChoice.next_scene) {
        moveToScene(storyCursor.episodeId, pendingChoice.next_scene);
        return;
      }

      if (pendingChoice.next_episode) {
        moveToEpisode(pendingChoice.next_episode);
        return;
      }

      return;
    }

    const nextLineIndex = storyCursor.lineIndex + 1;
    if (nextLineIndex < currentSceneLines.length) {
      setStoryCursor((current) =>
        current
          ? {
              ...current,
              lineIndex: nextLineIndex,
            }
          : current,
      );
      return;
    }

    if (currentScene.choices && currentScene.choices.length > 0) {
      return;
    }

    if (currentScene.next_scene) {
      moveToScene(storyCursor.episodeId, currentScene.next_scene);
      return;
    }

    if (currentScene.next_episode) {
      moveToEpisode(currentScene.next_episode);
      return;
    }

    if (currentScene.terminal) {
      const score100 = maxScore > 0 ? Math.round((Math.max(0, rawScore) / maxScore) * 100) : 0;
      const rank = getEndingRank(score100);
      const variant = pickEndingVariant(rank, choiceHistory, storyCursor.episodeId);
      const rankTitle = endingMeta[rank].title;

      setEnding({
        rank,
        title: `${rankTitle} · ${variant.title}`,
        description: buildVariantSummary(variant, rank),
        score100,
        variantId: variant.id,
        variantSubtype: variant.subtype,
        variantLines: buildVariantLines(
          variant,
          playerName,
          professorName,
          professor.speakingStyle,
        ),
        expressionKey: getEndingExpressionKey(rank, variant),
      });
      setPhase("screen9_ending");
    }
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
    setStoryCursor(null);
    setPendingChoice(null);
    setChoiceHistory([]);
    setRawScore(0);
    setMaxScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setStoryLog([]);
    setEnding(null);
    setIsCreditFinished(false);
    setIsScreen1TitleImageErrored(false);
    setIsScreen11TitleImageErrored(false);
    setIsAutoPlayOn(false);
    setIsSceneCutinVisible(false);
    setVisibleSceneCutinUrl(null);
    setSessionExpressionSet(defaultExpressionSet);
    setSessionSpriteCues(normalizeSpriteCueMap(defaultSpriteCues));
  }

  return (
    <main className="min-h-screen text-black">
      {/* BGM 컨트롤 버튼 (우측 상단 고정) */}
      <div className="top-hud-controls">
        <button
          type="button"
          onClick={handleDebugButtonClick}
          className={`top-hud-button ${isDebugUnlocked ? "is-active" : ""}`}
        >
          <span className="top-hud-button-label">Debug</span>
          <span className="top-hud-button-value">{isDebugUnlocked ? "열림" : "잠금"}</span>
        </button>
        <button
          type="button"
          onClick={toggleBgm}
          className={`top-hud-button ${isBgmOn ? "is-active" : ""}`}
          aria-label={isBgmOn ? "BGM 끄기" : "BGM 켜기"}
        >
          <span className="top-hud-button-label">Sound</span>
          <span className="top-hud-button-icon" aria-hidden>
            {isBgmOn ? <Volume2 size={18} strokeWidth={2.5} /> : <VolumeX size={18} strokeWidth={2.5} />}
          </span>
          <span className="top-hud-button-value">{isBgmOn ? "On" : "Off"}</span>
        </button>
        {/* 실제 오디오 태그 */}
        <audio ref={audioRef} src={MAIN_BGM_URL} loop />
      </div>

      {isDebugPasswordModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#d59ab5] bg-white p-5 shadow-2xl">
            <p className="text-lg font-black text-[#5a2240]">디버그 잠금 해제</p>
            <p className="mt-1 text-sm text-[#6a3951]">
              비밀번호를 입력하면 디버그 패널을 사용할 수 있어요.
            </p>
            <input
              type="password"
              value={debugPasswordInput}
              onChange={(event) => {
                setDebugPasswordInput(event.target.value);
                if (debugAuthError) {
                  setDebugAuthError("");
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submitDebugPassword();
                }
              }}
              className="mt-3 h-11 w-full rounded-lg border border-[#c98aa8] px-3 text-base outline-none focus:ring-2 focus:ring-[#d778a1]/60"
              placeholder="비밀번호 입력"
            />
            {debugAuthError && (
              <p className="mt-2 text-sm font-semibold text-[#b11c5c]">{debugAuthError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDebugPasswordModalOpen(false);
                  setDebugPasswordInput("");
                  setDebugAuthError("");
                }}
                className="rounded-lg border border-[#b88ea2] bg-white px-4 py-2 text-sm font-semibold text-[#5d2b44]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitDebugPassword}
                className="rounded-lg border border-[#b45f84] bg-[#ffd7e9] px-4 py-2 text-sm font-black text-[#5d2140]"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {isDebugPanelOpen && isDebugUnlocked && (
        <aside className="fixed inset-x-3 top-20 z-[120] max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto rounded-2xl border-2 border-[#b97d99] bg-[rgba(255,246,251,0.95)] p-4 text-[#2f2f2f] shadow-[0_18px_38px_rgba(55,20,37,0.3)] backdrop-blur-sm md:inset-x-auto md:right-6 md:top-24 md:max-h-[calc(100dvh-8rem)] md:w-[min(92vw,430px)]">
          <div className="flex items-center justify-between">
            <p className="text-lg font-black text-[#5d2240]">디버그 패널</p>
            <button
              type="button"
              onClick={() => setIsDebugPanelOpen(false)}
              className="rounded-md border border-[#b1889d] bg-white px-2 py-1 text-xs font-semibold"
            >
              닫기
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-[#d9b2c4] bg-white/80 p-3">
            <p className="text-xs font-semibold text-[#70435b]">현재 상태</p>
            <p className="mt-1 text-sm">
              화면: <span className="font-bold">{phase}</span>
            </p>
            <p className="text-sm">
              에피소드: <span className="font-bold">{currentEpisode?.id ?? "-"}</span>
            </p>
            <p className="text-sm">
              씬: <span className="font-bold">{currentScene?.id ?? "-"}</span>
            </p>
            <p className="text-sm">
              호감도: <span className="font-bold">{affinityPercent}%</span> / Raw Score:{" "}
              <span className="font-bold">{rawScore}</span> / Max Score:{" "}
              <span className="font-bold">{maxScore}</span>
            </p>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">화면 이동</p>
            <div className="grid grid-cols-2 gap-2">
              {debugPhaseButtons.map((item) => (
                <button
                  key={item.phase}
                  type="button"
                  onClick={() => jumpToPhaseByDebug(item.phase)}
                  className="rounded-lg border border-[#cfa4b8] bg-white px-2 py-2 text-xs font-semibold hover:bg-[#fff4fa]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">엔딩 미리보기</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(endingMeta) as EndingRank[]).map((rank) => (
                <button
                  key={rank}
                  type="button"
                  onClick={() => {
                    setDebugEndingSelect(rank);
                    setDebugEndingVariantIndex(0);
                    previewEndingByRank(rank, 0);
                  }}
                  className="rounded-lg border border-[#cfa4b8] bg-white px-2 py-2 text-xs font-semibold hover:bg-[#fff4fa]"
                >
                  {endingMeta[rank].title}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-[#d9b2c4] bg-white/85 p-3">
              <p className="mb-2 text-xs font-black text-[#7c3457]">
                {endingMeta[debugEndingSelect].title} Variant
              </p>
              <div className="grid grid-cols-1 gap-2">
                {debugEndingVariants.map((variant, index) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setDebugEndingVariantIndex(index);
                      previewEndingByRank(debugEndingSelect, index);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      debugEndingVariantIndex === index
                        ? "border-[#b45f84] bg-[#ffe2ef] text-[#5d2140]"
                        : "border-[#cfa4b8] bg-white text-[#6b3a54] hover:bg-[#fff4fa]"
                    }`}
                  >
                    <span className="block font-black">{variant.subtype}</span>
                    <span className="mt-1 block text-[11px] opacity-80">{variant.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-[#d9b2c4] bg-white/85 p-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">호감도 임의 설정</p>
            <input
              type="range"
              min={0}
              max={100}
              value={debugAffinityInput}
              onChange={(event) => setDebugAffinityInput(Number(event.target.value))}
              className="w-full accent-[#d86e9a]"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={debugAffinityInput}
                onChange={(event) => setDebugAffinityInput(Number(event.target.value))}
                className="h-9 w-20 rounded-md border border-[#caa3b6] px-2 text-sm"
              />
              <button
                type="button"
                onClick={applyDebugAffinity}
                className="rounded-md border border-[#b45f84] bg-[#ffd9ea] px-3 py-1.5 text-xs font-black text-[#5d2140]"
              >
                호감도 적용
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-[#d9b2c4] bg-white/85 p-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">스토리 점프</p>
            <select
              value={debugEpisodeSelect}
              onChange={(event) => setDebugEpisodeSelect(event.target.value)}
              className="h-9 w-full rounded-md border border-[#caa3b6] px-2 text-sm"
            >
              {storyEpisodes.map((episode) => (
                <option key={episode.id} value={episode.id}>
                  {episode.title}
                </option>
              ))}
            </select>
            <select
              value={debugSceneSelect}
              onChange={(event) => setDebugSceneSelect(event.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-[#caa3b6] px-2 text-sm"
            >
              {(getStoryEpisode(debugEpisodeSelect)?.scenes ?? []).map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openStoryDebugContext(debugEpisodeSelect, debugSceneSelect)}
              className="mt-2 rounded-md border border-[#b45f84] bg-[#ffd9ea] px-3 py-1.5 text-xs font-black text-[#5d2140]"
            >
              이 씬으로 이동
            </button>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingChoice(null)}
                className="rounded-md border border-[#c29aad] bg-white px-2 py-1 text-xs font-semibold"
              >
                선택 전 상태
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentChoiceList.length > 0) {
                    setPendingChoice(currentChoiceList[0] ?? null);
                    setPhase("screen4_8_chapter");
                  }
                }}
                className="rounded-md border border-[#c29aad] bg-white px-2 py-1 text-xs font-semibold"
              >
                1번 반응 보기
              </button>
            </div>
          </div>
        </aside>
      )}

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
            {!isScreen1TitleImageErrored ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screen1TitleImageUrl}
                  alt="♡교수님과 두근두근♡ 시험기간 시뮬레이션"
                  className="mx-auto h-auto w-full max-w-[980px] object-contain drop-shadow-[0_9px_26px_rgba(38,10,24,0.5)]"
                  onError={() => setIsScreen1TitleImageErrored(true)}
                />
              </>
            ) : (
              <h1 className="text-[clamp(42px,6.6vw,110px)] font-black leading-[1.01] tracking-[-0.04em] text-[#ffd6e7] [text-shadow:_0_4px_0_#8c3f64,_0_9px_26px_rgba(38,10,24,0.5)]">
                ♡교수님과 두근두근♡
                <br />
                시험기간 시뮬레이션
              </h1>
            )}
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
            <h2 className="font-sans text-[clamp(56px,8vw,112px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8b3a60,_0_12px_30px_rgba(0,0,0,0.45)]">
              당신의 이름과 성별은?
            </h2>

            <div className="mx-auto mt-8 max-w-[760px] rounded-[26px] border-4 border-[#c6809e] bg-[rgba(255,237,245,0.55)] px-6 py-8 shadow-[0_14px_38px_rgba(72,20,45,0.2)] backdrop-blur-[3px] md:px-8 md:py-10">
              <input
                value={player.name}
                onChange={(event) => updatePlayer("name", event.target.value)}
                className="h-14 w-full rounded-2xl border-[3px] border-[#bb6f91] bg-white/92 px-4 text-center text-xl font-semibold text-[#4d1d37] outline-none placeholder:text-[#b57d94] focus:ring-2 focus:ring-[#d778a1]/65 sm:h-16 sm:text-3xl"
                placeholder="이름은 최대 3자까지 가능합니다."
                maxLength={3}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {playerGenderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePlayer("gender", option.value)}
                    className={`min-w-[110px] rounded-full border-[3px] px-5 py-2 text-xl font-bold transition sm:min-w-[128px] sm:px-6 sm:text-3xl ${
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
            <h2 className="font-sans text-[clamp(56px,8vw,108px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8a3a5f,_0_12px_30px_rgba(0,0,0,0.45)]">
              교수님 생성
            </h2>

            <article className="mx-auto mt-5 rounded-[28px] border-4 border-[#be809d] bg-[rgba(255,239,246,0.55)] px-5 py-5 shadow-[0_14px_40px_rgba(68,18,40,0.2)] backdrop-blur-[4px] md:px-8 md:py-7">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      이름
                    </label>
                    <input
                      value={professor.name}
                      onChange={(event) => updateProfessor("name", event.target.value)}
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
                      placeholder="교수 이름"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <span className="text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      성별
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {professorGenderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateProfessor("gender", option.value)}
                          className={`h-13 min-w-[88px] rounded-full border-[3px] px-4 text-[clamp(24px,7vw,44px)] font-bold leading-none transition sm:h-16 sm:min-w-[120px] ${
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

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      나이
                    </label>
                    <input
                      value={professor.age}
                      onChange={(event) => updateProfessor("age", event.target.value)}
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
                      placeholder="예: 30"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      말투
                    </label>
                    <select
                      value={professor.speakingStyle}
                      onChange={(event) => updateProfessor("speakingStyle", event.target.value)}
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr] sm:items-center sm:gap-3">
                    <label className="whitespace-nowrap text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      요소1
                    </label>
                    <input
                      value={professor.feature1}
                      onChange={(event) => updateProfessor("feature1", event.target.value)}
                      list="feature1-options"
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
                      placeholder="헤어스타일"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr] sm:items-center sm:gap-3">
                    <label className="whitespace-nowrap text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      요소2
                    </label>
                    <input
                      value={professor.feature2}
                      onChange={(event) => updateProfessor("feature2", event.target.value)}
                      list="feature2-options"
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
                      placeholder="눈매"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr] sm:items-center sm:gap-3">
                    <label className="whitespace-nowrap text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      요소3
                    </label>
                    <input
                      value={professor.feature3}
                      onChange={(event) => updateProfessor("feature3", event.target.value)}
                      list="feature3-options"
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
                      placeholder="코/얼굴형"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr] sm:items-center sm:gap-3">
                    <label className="whitespace-nowrap text-[clamp(24px,7vw,44px)] font-bold leading-none text-[#5f213f]">
                      요소4
                    </label>
                    <input
                      value={professor.feature4}
                      onChange={(event) => updateProfessor("feature4", event.target.value)}
                      list="feature4-options"
                      className="h-14 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-lg font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 sm:h-16 sm:text-2xl"
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
                  disabled={isGeneratingImage}
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
                    {isGeneratingImage ? "생성중..." : "만들기"}
                  </span>
                  <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                    ♡
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startStory}
                  disabled={isGeneratingImage}
                  className="rounded-full border-2 border-[#b87995] bg-white/80 px-7 py-2 text-xl font-semibold text-[#5c223e] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isGeneratingImage ? "준비 중..." : "스토리만 바로 시작"}
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
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            </article>
          </div>
        </section>
      )}

      {phase === "screen4_8_chapter" && currentChapterInfo && storyCursor && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: currentBackdropLayers.map((url) => `url(${url})`).join(", "),
              backgroundSize: currentBackdropLayers.map(() => "cover").join(", "),
              backgroundPosition: currentBackdropLayers.map(() => "center").join(", "),
              backgroundRepeat: currentBackdropLayers.map(() => "no-repeat").join(", "),
            }}
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
            <div className="flex flex-col items-start gap-3">
              <div className={`w-full max-w-[1040px] rounded-xl border px-4 py-3 text-white relative shadow-lg heart-gauge-container transition-all duration-700 ${
                affinityPercent >= 100 
                  ? "border-[#ff4f81] bg-black/60 shadow-[0_0_30px_rgba(255,79,129,0.7)]" 
                  : "border-white/40 bg-black/45"
              }`}>
                {affinityPercent >= 100 && (
                  <div className="pointer-events-none absolute inset-0 z-0 animate-pulse rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
                <canvas
                  ref={particleCanvasRef}
                  width={450}
                  height={44}
                  className="pointer-events-none absolute left-12 top-4 z-10"
                  style={{ width: 450, height: 44 }}
                />
                <div className="relative z-10 mb-1 flex items-center justify-between">
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
                    className={`drop-shadow-heart mr-2 h-7 w-7 transition-transform duration-300 ease-out origin-center ${
                      heartPulse === "increase"
                        ? "scale-[7]"
                        : heartPulse === "decrease"
                        ? "scale-[0.65]"
                        : "scale-100"
                    }`}
                    draggable={false}
                  />
                  <div className="relative h-7 flex-1 overflow-visible">
                    <div className="shadow-gauge-glow absolute left-0 top-1/2 h-4 w-full -translate-y-1/2 rounded-full bg-[#2a1a22] opacity-70" />
                    <div
                      className={`heart-gauge-bar absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-full transition-[width] duration-700 ease-out ${
                        affinityPercent >= 100 ? "animate-pulse" : ""
                      }`}
                      style={{
                        width: `${visibleAffinityPercent}%`,
                        background:
                          "linear-gradient(90deg, #ffb6c1 0%, #ff4f81 50%, #c80032 100%)",
                        boxShadow: affinityPercent >= 100 ? "0 0 25px 5px #ff4f81" : "0 0 16px 2px #ff4f81cc, 0 2px 8px #c8003233",
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
              <div className="w-full max-w-[520px] rounded-xl border border-white/40 bg-black/45 px-4 py-3 text-white relative shadow-lg">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-gothic text-xs font-bold tracking-wide text-[#ffb8d5]">
                    EPISODE
                  </span>
                  <span className="font-gothic text-xs font-bold text-white/80">
                    {currentEpisodeNumber}/6
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-black text-white truncate">
                    {currentChapterInfo.title}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[260px] md:pb-[300px]">
              {activeProfessorImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeProfessorImageUrl}
                  alt={`${professorName} 교수 스프라이트`}
                  className={`max-h-[72vh] w-auto object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)] transition-[opacity,filter] duration-300 ${
                    shouldDimProfessorSprite
                      ? "opacity-50 saturate-[0.45] brightness-[0.8]"
                      : "opacity-100 saturate-100 brightness-100"
                  }`}
                />
              ) : (
                <div className="rounded-2xl border border-white/70 bg-white/30 px-6 py-10 text-center text-white">
                  생성된 교수 이미지 없이도 플레이 가능합니다.
                </div>
              )}
            </div>

            {visibleSceneCutinUrl && (
              <div
                key={`${currentScene?.id ?? "scene"}-${storyCursor?.lineIndex ?? 0}`}
                className={`episode-scene-cutin pointer-events-none absolute inset-x-4 top-24 z-40 flex justify-center md:top-28 md:inset-x-10 ${
                  isSceneCutinVisible ? "is-visible" : "is-hidden"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visibleSceneCutinUrl}
                  alt="장면 연출 컷인"
                  className="h-auto w-full max-w-[460px] rounded-[18px] border-2 border-white/80 object-contain shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                />
              </div>
            )}

            {shouldShowChoiceOverlay && (
              <div className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-10">
                <div className="w-full max-w-5xl space-y-4 md:space-y-6">
                  {currentChoiceList.map((choice, index) => (
                    <button
                      key={`${choice.text}-${index}`}
                      type="button"
                      onClick={() => chooseOption(index)}
                      className="font-story block w-full rounded-[12px] border border-[#b7b7b7] bg-[rgba(255,255,255,0.94)] px-6 py-4 text-center text-[clamp(22px,2.4vw,52px)] font-medium leading-[1.2] text-[#2f2f2f] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-150 hover:translate-y-[-1px] hover:brightness-[1.01] active:translate-y-0"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="pointer-events-none fixed inset-x-4 bottom-8 z-[70] flex justify-center">
            <div
              className="pointer-events-auto relative flex h-[280px] w-full max-w-[1400px] flex-col rounded-[32px] border border-white/20 bg-black/10 p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md md:p-10"
              onClick={() => {
                if (isDialogueLineTyping) {
                  revealCurrentDialogueImmediately();
                }
              }}
            >
              {/* 이름표 UI: 좌측 상단에 반쯤 걸친 디자인 */}
              <div className="absolute -top-6 left-10 flex h-12 items-center rounded-2xl border border-white/30 bg-gradient-to-r from-[#ff4f81] to-[#ff7b9e] px-8 shadow-lg">
                <span className="text-xl font-black tracking-tight text-white md:text-2xl">
                  {activeSpeakerLabel}
                </span>
              </div>

              {/* 대사 내용 영역 */}
              <div className="flex-1 overflow-y-auto pt-4 md:pt-6">
                <p className="font-story text-[clamp(22px,2.2vw,44px)] font-medium leading-[1.4] text-white/95">
                  {typedProfessorLine || "\u00A0"}
                </p>
              </div>

              {/* 하단 컨트롤 영역 */}
              {canAdvanceCurrentStep && (
                <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                  <p className="text-sm font-bold tracking-wide text-white/50">
                    {isAutoPlayOn
                      ? "AUTO-PLAYING..."
                      : hasCurrentChoices
                      ? "CHOICE MADE. PROCEED TO NEXT."
                      : "PROCEED TO NEXT STEP."}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoPlayOn((current) => !current);
                      }}
                      className={`rounded-xl border-2 px-5 py-2 text-sm font-black transition-all ${
                        isAutoPlayOn
                          ? "border-[#ff4f81] bg-[#ff4f81] text-white shadow-[0_0_15px_rgba(255,79,129,0.4)]"
                          : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      자동 {isAutoPlayOn ? "ON" : "OFF"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveNextChapter();
                      }}
                      className="flex items-center gap-2 rounded-xl bg-white px-8 py-2 text-lg font-black text-[#1a1a1a] transition-transform hover:scale-105 active:scale-95"
                    >
                      다음
                      <span className="text-sm">▶</span>
                    </button>
                  </div>
                </div>
               )}
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,221,235,0.18),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(255,196,220,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(255,161,196,0.18),transparent_44%)]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-end px-4 pb-6 md:px-8">
            <div className="ending-card rounded-[22px] border border-[rgba(255,255,255,0.28)] bg-[linear-gradient(180deg,rgba(39,24,38,0.78),rgba(18,14,22,0.86))] p-5 text-white md:p-7">
              <p className="text-sm font-bold tracking-[0.24em] text-[#ffd8eb]">ENDING RESULT</p>
              {ending.variantSubtype && (
                <p className="mt-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-[#ffe5f2]">
                  {ending.variantSubtype}
                </p>
              )}
              <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div>
                  <p className="text-[clamp(32px,3.6vw,52px)] font-black leading-[1.08] text-white">
                    {ending.title}
                  </p>
                  <p className="mt-4 max-w-4xl text-[clamp(18px,1.7vw,28px)] leading-[1.72] text-white/88">
                    {ending.description}
                  </p>
                </div>
                {endingProfessorImageUrl && (
                  <div className="ending-portrait-panel mx-auto w-full max-w-[280px] overflow-hidden rounded-[22px] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-3">
                    <div className="rounded-[16px] bg-[radial-gradient(circle_at_50%_18%,rgba(255,234,243,0.32),rgba(255,255,255,0.02)_62%),linear-gradient(180deg,rgba(29,17,27,0.28),rgba(12,10,18,0.36))]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={endingProfessorImageUrl}
                        alt={`${professorName} 엔딩 표정`}
                        className="h-[320px] w-full object-contain drop-shadow-[0_18px_26px_rgba(0,0,0,0.38)]"
                      />
                    </div>
                  </div>
                )}
              </div>
              {ending.variantLines && ending.variantLines.length > 0 && (
                <div className="mt-5 rounded-[18px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-4 md:p-5">
                  <p className="mb-3 text-sm font-bold tracking-[0.22em] text-[#ffd9ea]">
                    VARIANT SCRIPT
                  </p>
                  <div className="space-y-3 text-left">
                    {ending.variantLines.map((line, index) => {
                      const parsedLine = parseVariantDisplayLine(line);

                      return (
                        <div
                          key={`${line}-${index}`}
                          className="rounded-[14px] border border-white/10 bg-black/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 inline-flex min-w-[72px] justify-center rounded-full px-3 py-1 text-xs font-black tracking-[0.16em] ${
                                parsedLine.speaker === "교수"
                                  ? "bg-[#ffd7ea] text-[#59233f]"
                                  : parsedLine.speaker === "나레이션"
                                    ? "bg-white/12 text-[#ffe7f2]"
                                    : "bg-[#f8f3ff] text-[#403050]"
                              }`}
                            >
                              {parsedLine.speaker}
                            </span>
                            <p className="font-story text-[clamp(18px,1.5vw,24px)] leading-[1.75] text-white/94">
                              {parsedLine.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {typeof ending.score100 === "number" && (
                <div className="mt-5 flex flex-col items-start gap-2 rounded-[16px] border border-white/15 bg-black/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <p className="text-sm font-bold tracking-[0.18em] text-[#ffd9ea]">FINAL SCORE</p>
                  <p className="text-xl font-black text-white">{ending.score100}점</p>
                </div>
              )}
              <button
                type="button"
                onClick={goRealityScreen}
                className="mt-6 rounded-full border border-white/70 bg-white px-7 py-3 text-lg font-black text-[#25131c] shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#fff5fa]"
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
              className="font-sans mt-10 border-[3px] border-black bg-white px-7 py-3 text-[clamp(34px,8vw,76px)] font-semibold leading-none text-black hover:bg-[#f8f8f8] sm:mt-16 sm:px-14 sm:py-4"
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
              <p className="text-[clamp(30px,7vw,48px)] font-semibold leading-snug">
                {!isScreen11TitleImageErrored ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screen11CreditTitleImageUrl}
                      alt="두근두근 교수님과 시험기간 시뮬레이션"
                      className="mx-auto h-auto w-full max-w-[700px] object-contain"
                      onError={() => setIsScreen11TitleImageErrored(true)}
                    />
                  </>
                ) : (
                  "두근두근 교수님과 시험기간 시뮬레이션"
                )}
              </p>
              <p className="font-sans mt-10 text-[clamp(28px,6.5vw,48px)] sm:mt-14">Credit</p>
              <p className="font-sans mt-8 text-[clamp(28px,6.5vw,48px)] sm:mt-12">숭멋사 14기</p>
              <p className="mt-10 text-[clamp(28px,6.5vw,48px)] leading-[1.35] sm:mt-14">
                PM 최영환
                <br />
                PM 이영서
                <br />
                FE 최정인
                <br />
                FE 신하빈
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
