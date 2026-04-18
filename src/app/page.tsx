"use client";

import { useEffect, useId, useMemo, useState, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { heartParticle } from "@/lib/heart-particle";
import {
  professorRouteStory,
  storyEndingCatalog,
  type StoryEndingRankKey,
  type StoryEndingVariant,
  type StoryChoice,
  type StoryEpisode,
  type StoryRole,
  type StoryScene,
} from "@/lib/professor-route-story";
import {
  buildIllustrationPrompt,
  endingMeta,
  getEndingRank,
  playerGenderOptions,
  professorGenderOptions,
  professorSpeakingStyleOptions,
  resolveProfessorForGeneration,
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
  | "screen10_temp"
  | "screen11_credit";

type EndingState = {
  rank?: ReturnType<typeof getEndingRank>;
  title: string;
  description: string;
  score100?: number;
  variantId?: string;
  variantSubtype?: string;
  variantLines?: string[];
};

type CreditMessageEntry = {
  id: string;
  created_at: string;
  player_name: string;
  message_text: string;
  professor_image_url: string | null;
  ending_key: string | null;
  ending_title: string | null;
};

type CreditMessagePromptContext = "professor_generation" | "ending";

type CreditMessageDraft = {
  playerName: string;
  messageText: string;
};

type AudioLevels = {
  master: number;
  bgm: number;
  voice: number;
  sfx: number;
};

type ChapterStep = {
  dialogue: string;
  choices: ChapterChoice[];
};

type DialogueSpeakerLabel = "나레이션" | "교수" | "나" | "독백" | "남성";

type DialogueLine = {
  speaker: DialogueSpeakerLabel;
  text: string;
  professorLineIndex: number | null;
};

type StoryVisualCue = {
  key: string;
  title: string;
  subtitle: string;
  variant: "professor" | "prop" | "mood";
};

function resolvePersistedProfessorImageUrl(imageUrl: string) {
  const normalized = imageUrl.trim();
  if (!normalized) {
    return null;
  }

  return /^https?:\/\//.test(normalized) || /^data:image\//.test(normalized) ? normalized : null;
}

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
void chapterStepScripts;

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
  feature5: "",
  feature6: "",
  feature7: "",
  feature8: "",
  customPrompt: "",
};

const DUMMY_SOLID_LAYER = "linear-gradient(145deg, #d892b0 0%, #f6d2e3 56%, #cb7fa4 100%)";
const DUMMY_DARK_LAYER = "linear-gradient(140deg, rgba(80,24,48,0.76), rgba(35,12,28,0.72))";
const DEBUG_PASSWORD = "ssulikelion";
const BGM_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_BGM_BASE_URL?.replace(/\/+$/, "") || "/bgm";
const VOICE_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_VOICE_BASE_URL?.replace(/\/+$/, "") || "/voice";
const AUDIO_LEVEL_STORAGE_KEY = "ssu-simulation-audio-levels-v1";
const DEFAULT_AUDIO_LEVELS: AudioLevels = {
  master: 50,
  bgm: 25,
  voice: 80,
  sfx: 90,
};
const MIN_TOTAL_AFFINITY_SCORE = -25;
const MAX_TOTAL_AFFINITY_SCORE = 50;
const TOTAL_AFFINITY_SCORE_SPAN = MAX_TOTAL_AFFINITY_SCORE - MIN_TOTAL_AFFINITY_SCORE;
const debugEndingScoreMap: Record<EndingRank, number> = {
  ENDING_A_PLUS: 76,
  ENDING_B_PLUS: 56,
  ENDING_C_PLUS: 40,
  ENDING_F: 87,
};

const STORY_BGM_URLS = {
  introSetup: `${BGM_BASE_URL}/intro_professor_setup.ogg`,
  morningClassroom: `${BGM_BASE_URL}/morning_classroom.ogg`,
  commuteEpisode: `${BGM_BASE_URL}/commute_episode.ogg`,
  cafeteriaRestaurantEpisode: `${BGM_BASE_URL}/cafeteria_restaurant_episode.ogg`,
  restroomEpisode: `${BGM_BASE_URL}/restroom_episode.ogg`,
  afternoonLibraryEpisode: `${BGM_BASE_URL}/afternoon_library_episode.ogg`,
  dinnerEpisode: `${BGM_BASE_URL}/dinner_episode.ogg`,
  nightEpisode: `${BGM_BASE_URL}/night_episode.ogg`,
  endingCredit: `${BGM_BASE_URL}/ending_credit.ogg`,
} as const;

const ENDING_BACKGROUND_URL = "/ui/ending-screen/background.webp";
const SCREEN10_BACKGROUND_URL = "/ui/debug-screen10/background.png";
const SCREEN10_DESK_URL = "/ui/debug-screen10/overlay.png";

const STORY_SFX_URLS = {
  heartbeat: "/sfx/story/heartbeat.ogg",
  footsteps: "/sfx/story/footsteps.ogg",
  doorOpen: "/sfx/story/door_open.ogg",
  pageTurn: "/sfx/story/page_turn.ogg",
  restaurantBell: "/sfx/story/restaurant_bell.ogg",
  doorKnock: "/sfx/story/door_knock.ogg",
  thunder: "/sfx/story/thunder.ogg",
  rain: "/sfx/story/rain.ogg",
  coffeeMachine: "/sfx/story/coffee_machine.ogg",
  clockTick: "/sfx/story/clock_tick.ogg",
} as const;

type StorySfxKey = keyof typeof STORY_SFX_URLS;
type EndingProfessorGender = "남자" | "여자";

const STORY_SFX_BEHAVIOR: Record<StorySfxKey, { loop?: boolean }> = {
  heartbeat: {},
  footsteps: {},
  doorOpen: {},
  pageTurn: {},
  restaurantBell: {},
  doorKnock: {},
  thunder: {},
  rain: { loop: true },
  coffeeMachine: {},
  clockTick: {},
};

const GENDERED_ENDING_PROFESSOR_LINES: Record<
  string,
  Record<EndingProfessorGender, string>
> = {
  ending_aplus_main: {
    남자:
      "자네의 사고방식은... 딱 내 연구실에 필요한 수준이야. 졸업장? 그게 무슨 의미가 있나. 내 옆에서 나와 함께 세계를 구해보지 않겠나? 자, 도망갈 생각은 말고.",
    여자:
      "당신의 사고방식… 정말 마음에 드네요. 딱 제 연구실에 필요한 수준이에요. 졸업장요? 그게 그렇게 중요한가요. 제 옆에서, 저와 함께 세계를 구해보지 않겠어요? 그러니까… 어서 와요.",
  },
  ending_b_main: {
    남자:
      "아아… 자네였군. B+라, 나쁘진 않지만 결정적이진 않았어. 유감이지만… 자네는 내 기억에 남지 않는 수준이네. 결국 자네는, 내게 그저 스쳐간 학생일 뿐이지.",
    여자:
      "아아… 당신이었군요. B+라, 나쁘진 않지만 결정적이진 않았어요. 유감이지만… 당신은 제 기억에 남지 않는 수준이에요. 결국 당신은, 제게 그저 스쳐간 학생일 뿐이겠네요.",
  },
  ending_cplus_main: {
    남자:
      "C+… C+이라. 자네, 이 점수가 뭘 의미하는지 아나? 합격도 탈락도 아닌… 내가 아직 자네에게 할 말이 남았다는 뜻일세. 이번 학기 인연은 여기까지지만… 걱정 말게. 우린 곧, 재수강이라는 이름으로 다시 만나게 될 테니까.",
    여자:
      "C+… C+이라. 당신, 이 점수가 뭘 의미하는지 아나요? 합격도 탈락도 아닌… 제가 아직 당신에게 할 말이 남았다는 뜻이에요. 이번 학기 인연은 여기까지지만… 걱정 마세요. 우린 곧, 재수강이라는 이름으로 다시 만나게 될 테니까요.",
  },
  hidden_splus_01: {
    남자:
      "답안지… 아주 인상 깊었네. 정답은 하나도 맞지 않았지만, 이 빽빽한 글씨… 자네의 열정과 집요함은 충분히 전해졌어. 그래서 말인데— 자네 같은 인재라면… 멋쟁이사자가 될 수 있을 것 같네. 선택은 하나야, 지금 나와 함께 가겠나?",
    여자:
      "답안지… 아주 인상 깊었어요. 정답은 하나도 맞지 않았지만, 이 빽빽한 글씨… 당신의 열정과 집요함은 충분히 전해졌어요. 그래서 말인데— 당신 같은 인재라면… 멋쟁이사자가 되기에 충분해요. 자, 선택은 하나예요. 지금 저랑 같이 갈래요?",
  },
  hidden_splus_02: {
    남자:
      "그… 자네 답안지의 마지막 서술형 답안 말이야. 이걸 도대체 어디서 본 거지? 그건 내가 아무에게도 공개하지 않은… 미발표 논문의 1급 기밀인데. 자네는… 너무 많은 걸 알아버렸어. …어쩔 수 없군. 여기서 정리해야겠네. 잠깐이면 끝나네. 너무 걱정하진 말게. 자, 눈을 감아보게나.",
    여자:
      "그… 당신 답안지의 마지막 서술형 답안 말이에요. 이걸 도대체 어디서 본 거죠? 그건 제가 아무에게도 공개하지 않은… 미발표 논문의 1급 기밀인데요. 당신은… 너무 많은 걸 알아버렸어요. …어쩔 수 없겠네요. 여기서 정리해야겠어요. 잠깐이면 끝나요. 너무 걱정하진 마세요. 눈을 감아볼까요?",
  },
};

const ENDING_VOICE_SLOT_BY_VARIANT: Record<string, string> = {
  ending_aplus_main: "087",
  ending_b_main: "088",
  ending_cplus_main: "089",
  hidden_splus_01: "090",
  hidden_splus_02: "091",
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
void normalizeStepScriptSpeakers;

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

function totalScoreToPercent(score: number) {
  const normalized = ((score - MIN_TOTAL_AFFINITY_SCORE) / TOTAL_AFFINITY_SCORE_SPAN) * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function percentToTotalScore(percent: number) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const rawScore =
    MIN_TOTAL_AFFINITY_SCORE + (TOTAL_AFFINITY_SCORE_SPAN * clampedPercent) / 100;
  return Math.round(rawScore);
}

const storyEpisodes = professorRouteStory.episodes as readonly StoryEpisode[];

const storyEpisodeMap = new Map<string, StoryEpisode>(
  storyEpisodes.map((episode) => [episode.id, episode] as const),
);

const storyDisplayLineSerialMap = (() => {
  const map = new Map<string, number>();
  let serial = 0;

  for (const episode of storyEpisodes) {
    for (const scene of episode.scenes) {
      const displayLineCount = (scene.stage_direction?.length ?? 0) + (scene.lines?.length ?? 0);
      for (let lineIndex = 0; lineIndex < displayLineCount; lineIndex += 1) {
        map.set(`${episode.id}::${scene.id}::${lineIndex}`, serial);
        serial += 1;
      }
    }
  }

  return map;
})();

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
const professorLineKeyToIndexMap = (() => {
  const map = new Map<string, number>();
  let currentIndex = 0;

  for (const episode of storyEpisodes) {
    for (const scene of episode.scenes) {
      (scene.lines ?? []).forEach((line, lineIndex) => {
        if (line.role !== "professor") {
          return;
        }
        map.set(`${episode.id}::${scene.id}::${lineIndex}`, currentIndex);
        currentIndex += 1;
      });
    }
  }

  return map;
})();

function resolveProfessorScriptProfileKey(gender: string, speakingStyle: string) {
  const genderPrefix = gender === "여자" ? "female" : "male";
  const ageSuffix =
    speakingStyle === "TONE_20S"
      ? "20s"
      : speakingStyle === "TONE_40S"
        ? "40s"
        : "30s";
  return `${genderPrefix}_${ageSuffix}`;
}

function buildProfessorVoiceSlotPath(profileKey: string, professorLineIndex: number) {
  return `${VOICE_BASE_URL}/${profileKey}/${String(professorLineIndex + 1).padStart(3, "0")}.ogg`;
}

function buildEndingVoiceSlotPath(profileKey: string, variantId?: string) {
  const slotNumber = variantId ? ENDING_VOICE_SLOT_BY_VARIANT[variantId] : undefined;
  return slotNumber ? `${VOICE_BASE_URL}/${profileKey}/${slotNumber}.ogg` : "";
}

function resolveSceneLines(
  episodeId: string,
  scene: StoryScene,
  playerName: string,
  professorName: string,
  professorScriptLines: string[],
): DialogueLine[] {
  const stageLines: DialogueLine[] = (scene.stage_direction ?? []).map((direction) => ({
    speaker: "나레이션",
    text: `(${replaceStoryPlaceholders(direction, playerName, professorName)})`,
    professorLineIndex: null,
  }));

  const contentLines: DialogueLine[] = (scene.lines ?? []).map((line, lineIndex) => {
    const speaker = storyRoleToSpeaker(line.role);
    const fallbackText = buildStoryLineText(line.text, playerName, professorName, [
      line.expression,
      line.action,
    ]);

    if (line.role !== "professor") {
      return {
        speaker,
        text: fallbackText,
        professorLineIndex: null,
      };
    }

    const key = `${episodeId}::${scene.id}::${lineIndex}`;
    const professorLineIndex = professorLineKeyToIndexMap.get(key) ?? null;
    const overriddenProfessorLine =
      professorLineIndex !== null ? professorScriptLines[professorLineIndex] : undefined;

    return {
      speaker,
      text: overriddenProfessorLine?.trim() ? overriddenProfessorLine.trim() : fallbackText,
      professorLineIndex,
    };
  });

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

function resolveBgmUrlByContext(phase: Phase, episodeId: string | null) {
  if (phase === "screen1_title" || phase === "screen2_player" || phase === "screen3_professor") {
    return STORY_BGM_URLS.introSetup;
  }

  if (phase === "screen9_ending" || phase === "screen10_temp" || phase === "screen11_credit") {
    return STORY_BGM_URLS.endingCredit;
  }

  if (phase !== "screen4_8_chapter" || !episodeId) {
    return STORY_BGM_URLS.introSetup;
  }

  if (episodeId === "ep01_commute") {
    return STORY_BGM_URLS.commuteEpisode;
  }

  if (episodeId === "ep02_morning_classroom") {
    return STORY_BGM_URLS.morningClassroom;
  }

  if (
    episodeId === "ep03_lunch_student_cafeteria" ||
    episodeId === "ep03_lunch_off_campus_restaurant"
  ) {
    return STORY_BGM_URLS.cafeteriaRestaurantEpisode;
  }

  if (episodeId === "ep03_lunch_bathroom_stall") {
    return STORY_BGM_URLS.restroomEpisode;
  }

  if (episodeId === "ep04_library") {
    return STORY_BGM_URLS.afternoonLibraryEpisode;
  }

  if (episodeId === "ep05_simple_dinner") {
    return STORY_BGM_URLS.dinnerEpisode;
  }

  if (episodeId.startsWith("ep06_")) {
    return STORY_BGM_URLS.nightEpisode;
  }

  return STORY_BGM_URLS.introSetup;
}

/**
 * 에피소드 ID에 따라 배경 이미지를 결정합니다.
 * 파일이 준비되지 않았을 경우를 대비해 기존의 DUMMY_SOLID_LAYER를 fallback으로 사용합니다.
 */
function resolveBackdropByEpisode(episodeId: string | null) {
  if (!episodeId) return DUMMY_SOLID_LAYER;

  const bgMapping: Record<string, string> = {
    ep01_commute: "/ui/backgrounds/ep01_commute.webp",
    ep02_morning_classroom: "/ui/backgrounds/ep02_classroom.webp",
    ep03_lunch_student_cafeteria: "/ui/backgrounds/ep03_cafeteria.webp",
    ep03_lunch_off_campus_restaurant: "/ui/backgrounds/ep03_restaurant.webp",
    ep03_lunch_bathroom_stall: "/ui/backgrounds/ep03_restroom.webp",
    ep04_library: "/ui/backgrounds/ep04_library.webp",
    ep05_simple_dinner: "/ui/backgrounds/ep05_dinner.webp",
    ep06_night_professor_office: "/ui/backgrounds/ep06_office_night.webp",
    ep06_night_bench: "/ui/backgrounds/ep06_bench_night.webp",
    ep06_night_self_study: "/ui/backgrounds/ep06_classroom_night.webp",
  };

  const imagePath = bgMapping[episodeId];
  return imagePath ? `url('${imagePath}')` : DUMMY_SOLID_LAYER;
}

function resolveSfxKeysByContext(
  episodeId: string,
  sceneId: string,
  lineText: string,
): StorySfxKey[] {
  const normalizedLineText = lineText.replace(/\s+/g, " ").trim();

  if (sceneId === "ep02_scene01_intro" && lineText.includes("터벅터벅... 강의실 문을 열자마자")) {
    return ["footsteps", "doorOpen"];
  }

  if (
    sceneId === "ep02_scene02_after_choice01" &&
    (normalizedLineText.includes("책 페이지를 넘겨 준다") ||
      normalizedLineText.includes("책 페이지를 넘겨준다") ||
      normalizedLineText.includes("손끝이 살짝 스친"))
  ) {
    return ["pageTurn"];
  }

  if (sceneId === "ep02_scene04_after_choice03" && lineText.includes("긴장감 때문에 심장이")) {
    return ["heartbeat"];
  }

  if (sceneId === "ep03b_scene01_intro" && lineText.includes("그때, 달칵")) {
    return ["doorOpen"];
  }

  if (
    sceneId === "ep03r_scene01_intro" &&
    (normalizedLineText.includes("문에 달린 작은 종이 딸랑") ||
      normalizedLineText.includes("딸랑 하고 울린다") ||
      normalizedLineText.includes("딸랑— 하고 울린다"))
  ) {
    return ["restaurantBell"];
  }

  if (sceneId === "ep03r_scene06_outro" && lineText.includes("딸랑— 문이 닫힌다")) {
    return ["restaurantBell"];
  }

  if (sceneId === "ep04_scene02_stacks" && lineText.includes("교재 3단원. 펼쳤다.")) {
    return ["pageTurn"];
  }

  if (sceneId === "ep06o_scene02_route_a" && lineText.includes("문앞에 서자")) {
    return ["doorKnock"];
  }

  if (sceneId === "ep06o_scene03_route_b" && lineText.includes("콰광")) {
    return ["thunder"];
  }

  if (
    sceneId === "ep06o_scene03_route_b" &&
    lineText.includes("우산도 없는데 이 비를 맞고 가는 건 자살 행위다")
  ) {
    return ["rain"];
  }

  if (sceneId === "ep06o_scene04_common_office" && lineText.includes("에스프레소 머신을 작동")) {
    return ["coffeeMachine"];
  }

  if (sceneId === "ep06o_scene05_umbrella" && lineText.includes("시계는 9시")) {
    return ["clockTick"];
  }

  if (sceneId === "ep06o_scene05_umbrella" && lineText.includes("처음으로 내 이름을 불렀다")) {
    return ["heartbeat"];
  }

  if (
    episodeId === "ep06_night_bench" &&
    (lineText.includes("가슴 한구석이 찌릿하다") ||
      lineText.includes("심박수가 위험 수치다") ||
      lineText.includes("더 아프게 설레기 시작한다"))
  ) {
    return ["heartbeat"];
  }

  if (sceneId === "ep06c_scene02_professor_enters" && lineText.includes("문이 천천히 열리고")) {
    return ["doorOpen"];
  }

  if (sceneId === "ep06c_scene03_opt01" && lineText.includes("'마음에 든다'")) {
    return ["heartbeat"];
  }

  if (sceneId === "ep06c_scene04_opt02" && lineText.includes("복도 발소리가 멀어진다")) {
    return ["footsteps"];
  }

  if (sceneId === "ep06c_scene04_opt02" && lineText.includes("문이 다시 열리며")) {
    return ["heartbeat"];
  }

  if (sceneId === "ep06c_scene04_opt02" && lineText.includes("봉투 안 에너지 음료 캔이 차갑다")) {
    return ["heartbeat"];
  }

  if (sceneId === "ep06c_scene05_opt03" && lineText.includes("언제부터 여기 계셨던 걸까")) {
    return ["heartbeat"];
  }

  if (sceneId === "ep06c_scene06_outro" && lineText.includes("교수님이 먼저 자리에서 일어난다")) {
    return ["footsteps"];
  }

  return [];
}

const choiceAffinityMap: Record<string, number> = {
  ep02_c01_opt01: 10,
  ep02_c01_opt02: 5,
  ep02_c01_opt03: -5,
  ep02_c02_opt01: -5,
  ep02_c02_opt02: 5,
  ep03b_c01_opt01: 5,
  ep03b_c01_opt02: -5,
  ep03b_c01_opt03: -5,
  ep03b_c02_opt01: 5,
  ep03b_c02_opt02: -5,
  ep03b_c02_opt03: -5,
  ep03c_c01_opt01: -5,
  ep03c_c01_opt02: 5,
  ep03c_c01_opt03: -5,
  ep03c_c02_opt01: 5,
  ep03c_c02_opt02: 5,
  ep03r_c01_opt01: 5,
  ep03r_c01_opt02: 10,
  ep03r_c01_opt03: -5,
  ep04_c01_opt01: 5,
  ep04_c01_opt02: 5,
  ep04_c01_opt03: -5,
  ep04_c02_opt01: 5,
  ep04_c02_opt02: 5,
  ep06o_c01_opt01: 10,
  ep06o_c01_opt02: -5,
  ep06b_c01_opt01: 5,
  ep06b_c01_opt02: 10,
  ep06b_c01_opt03: 5,
  ep06b_c02_opt01: 5,
  ep06b_c02_opt02: 5,
  ep06c_c01_opt01: 5,
  ep06c_c01_opt02: 5,
  ep06c_c01_opt03: 5,
};

const meaningfulChoiceIds = new Set(Object.keys(choiceAffinityMap));

function getChoiceAffinity(choiceId: string) {
  return choiceAffinityMap[choiceId] ?? 0;
}

function getChoiceSceneMaxScore(choices: readonly StoryChoice[]) {
  return Math.max(0, ...choices.map((choice) => choiceAffinityMap[choice.id] ?? 0));
}

const futurePotentialScoreMemo = new Map<string, number>();

function getFuturePotentialScoreFromDestination(
  episodeId: string | undefined,
  sceneId: string | undefined,
): number {
  if (!episodeId || !sceneId) {
    return 0;
  }

  const memoKey = `${episodeId}::${sceneId}`;
  const memoized = futurePotentialScoreMemo.get(memoKey);
  if (typeof memoized === "number") {
    return memoized;
  }

  const scene = getStoryScene(episodeId, sceneId);
  if (!scene) {
    return 0;
  }

  let total = 0;

  if (scene.type === "choice" && scene.choices && scene.choices.length > 0) {
    const scenePotential = getChoiceSceneMaxScore(scene.choices);
    const branchPotential = Math.max(
      0,
      ...scene.choices.map((choice) => {
        if (choice.next_scene) {
          return getFuturePotentialScoreFromDestination(episodeId, choice.next_scene);
        }

        if (choice.next_episode) {
          return getFuturePotentialScoreFromDestination(choice.next_episode, getFirstSceneId(choice.next_episode) ?? undefined);
        }

        return 0;
      }),
    );

    total = scenePotential + branchPotential;
  } else if (scene.next_scene) {
    total = getFuturePotentialScoreFromDestination(episodeId, scene.next_scene);
  } else if (scene.next_episode) {
    total = getFuturePotentialScoreFromDestination(
      scene.next_episode,
      getFirstSceneId(scene.next_episode) ?? undefined,
    );
  }

  futurePotentialScoreMemo.set(memoKey, total);
  return total;
}

function isBgmSuppressedForStoryMoment(
  phase: Phase,
  episodeId: string | null,
  sceneId: string | null,
  lineIndex: number | null,
) {
  if (phase !== "screen4_8_chapter" || !episodeId || !sceneId || lineIndex === null) {
    return false;
  }

  return episodeId === "ep06_night_professor_office" && sceneId === "ep06o_scene05_umbrella" && lineIndex >= 5 && lineIndex <= 6;
}

function resolveStoryVisualCue(
  episodeId: string | null,
  sceneId: string | null,
  lineIndex: number | null,
): StoryVisualCue | null {
  if (!episodeId || !sceneId || lineIndex === null) {
    return null;
  }

  const cueKey = `${sceneId}:${lineIndex}`;

  const cueMap: Record<string, StoryVisualCue> = {
    "ep01_scene01:1": {
      key: cueKey,
      title: "교수님 실루엣",
      subtitle: "등굣길에서 익숙한 뒷모습이 시야에 들어오는 순간",
      variant: "professor",
    },
    "ep02_scene01_intro:0": {
      key: cueKey,
      title: "강의실 시선",
      subtitle: "문을 열자마자 교수님의 시선이 정면으로 꽂히는 타이밍",
      variant: "professor",
    },
    "ep02_scene02_after_choice01:1": {
      key: cueKey,
      title: "책장 넘김 컷인",
      subtitle: "가까이 다가와 직접 페이지를 넘겨주는 손동작",
      variant: "prop",
    },
    "ep02_scene03_after_choice02:1": {
      key: cueKey,
      title: "캔커피 컷인",
      subtitle: "교단 위 캔커피가 손으로 툭 건네지는 순간",
      variant: "prop",
    },
    "ep02_scene04_after_choice03:1": {
      key: cueKey,
      title: "압박 시선",
      subtitle: "정면으로 시선을 고정하는 긴장감 컷",
      variant: "mood",
    },
    "ep02_scene06_pen_gift:1": {
      key: cueKey,
      title: "볼펜 선물",
      subtitle: "손안에 남은 온기를 보여주는 중앙 오브젝트 컷",
      variant: "prop",
    },
    "ep03c_scene01_intro:0": {
      key: cueKey,
      title: "학식 합석",
      subtitle: "빈 앞자리에 그림자가 드리워지는 순간",
      variant: "professor",
    },
    "ep03c_scene02_opt01:1": {
      key: cueKey,
      title: "종이컵 물",
      subtitle: "직접 떠다 준 물컵이 손에 닿는 순간",
      variant: "prop",
    },
    "ep03c_scene04_opt03:1": {
      key: cueKey,
      title: "요구르트 컷인",
      subtitle: "식판에서 미끄러지듯 건네지는 작은 호의",
      variant: "prop",
    },
    "ep03c_scene05_spoon_drop:0": {
      key: cueKey,
      title: "숟가락 낙하",
      subtitle: "바닥에 툭 떨어진 수저를 강조하는 타이밍",
      variant: "prop",
    },
    "ep03c_scene06_outro:1": {
      key: cueKey,
      title: "휴지 한 장",
      subtitle: "말 대신 남겨진 자잘한 다정함",
      variant: "prop",
    },
    "ep03r_scene01_intro:1": {
      key: cueKey,
      title: "식당 재회",
      subtitle: "입구에서 눈이 마주친 뒤 곧장 다가오는 순간",
      variant: "professor",
    },
    "ep04_scene01_intro:2": {
      key: cueKey,
      title: "받아온 볼펜",
      subtitle: "공부 대신 자꾸 시야에 걸리는 펜",
      variant: "prop",
    },
    "ep04_scene03_meet_professor:2": {
      key: cueKey,
      title: "서가 조우",
      subtitle: "코너를 돌자마자 교수님이 눈앞에 서는 타이밍",
      variant: "professor",
    },
    "ep04_scene04_opt01:2": {
      key: cueKey,
      title: "책 건네기",
      subtitle: "손에서 손으로 참고 도서가 넘어오는 순간",
      variant: "prop",
    },
    "ep04_scene05_opt02:2": {
      key: cueKey,
      title: "추천 도서",
      subtitle: "시험 범위를 짚어 주는 참고 도서 컷인",
      variant: "prop",
    },
    "ep06o_scene01_intro:1": {
      key: cueKey,
      title: "연구실 불빛",
      subtitle: "캄캄한 건물 속 한 칸만 따뜻하게 빛나는 창문",
      variant: "mood",
    },
    "ep06o_scene03_route_b:0": {
      key: cueKey,
      title: "폭우 전환",
      subtitle: "천둥과 함께 화면 중앙을 가르는 폭우 연출",
      variant: "mood",
    },
    "ep06o_scene04_common_office:0": {
      key: cueKey,
      title: "연구실 내부",
      subtitle: "주황빛 조명과 시더우드 향의 공간이 처음 열리는 순간",
      variant: "mood",
    },
    "ep06o_scene05_umbrella:5": {
      key: cueKey,
      title: "이름을 부르는 순간",
      subtitle: "정적 속에서 교수님 얼굴이 중앙으로 클로즈업되는 타이밍",
      variant: "professor",
    },
    "ep06o_scene05_umbrella:7": {
      key: cueKey,
      title: "장우산 컷인",
      subtitle: "연구실 향기와 온기가 남은 우산을 건네는 순간",
      variant: "prop",
    },
    "ep06o_scene06_rolls_intro:4": {
      key: cueKey,
      title: "롤스로이스 등장",
      subtitle: "빗속에서 차창이 내려가며 시선이 마주치는 장면",
      variant: "mood",
    },
    "ep06b_scene05_emotion:2": {
      key: cueKey,
      title: "곁을 내주는 거리",
      subtitle: "옆자리에 앉아 위로를 건네는 밤 벤치 장면",
      variant: "professor",
    },
    "ep06c_scene02_professor_enters:0": {
      key: cueKey,
      title: "복도 실루엣",
      subtitle: "문틈 빛 속으로 교수님 그림자가 길게 들어오는 순간",
      variant: "professor",
    },
    "ep06c_scene04_opt02:3": {
      key: cueKey,
      title: "편의점 봉투",
      subtitle: "에너지 음료와 초콜릿이 든 흰 봉투가 책상 위에 놓이는 타이밍",
      variant: "prop",
    },
  };

  return cueMap[cueKey] ?? null;
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
    "A+ 엔딩": "최고 성적의 여운이 관계를 더 깊고 위험한 제안으로 이어진다.",
    "B+ 엔딩": "애매한 성과는 냉정한 거리감과 함께 관계를 스쳐 지나가게 만든다.",
    "C+ 엔딩": "끝난 듯한 인연은 재수강이라는 이름으로 다시 이어질 조짐을 남긴다.",
    "히든 S+ - 진정한 멋사인으로 변신": "현실 규칙이 무너지며 장르가 급발진하는 히든 루트다.",
    "히든 S+ - 로그아웃 처리": "알아선 안 될 진실이 밝혀지며 스릴러로 전환되는 히든 루트다.",
  };

  const subtypeSummary = subtypeSummaryMap[variant.subtype] ?? "";
  return [rankSummary, subtypeSummary].filter(Boolean).join(" ");
}

function buildVariantLines(
  variant: StoryEndingVariant,
  playerName: string,
  professorName: string,
  professorGender: string,
) {
  const resolvedGender: EndingProfessorGender = professorGender === "여자" ? "여자" : "남자";
  const stageLines = (variant.stage_direction ?? []).map(
    (line) => `나레이션: (${replaceStoryPlaceholders(line, playerName, professorName)})`,
  );
  const contentLines = variant.lines.map((line) => {
    const speaker = storyRoleToSpeaker(line.role);
    const genderedProfessorText =
      line.role === "professor"
        ? GENDERED_ENDING_PROFESSOR_LINES[variant.id]?.[resolvedGender]
        : undefined;
    const baseText = buildStoryLineText(genderedProfessorText ?? line.text, playerName, professorName, [
      line.action,
      line.expression,
    ]);
    const text = baseText;
    return `${speaker}: ${text}`;
  });

  return [...stageLines, ...contentLines];
}

function pickEndingVariant(
  rank: EndingRank,
): StoryEndingVariant {
  const catalogKey = storyEndingKeyByRank(rank);
  const catalog = storyEndingCatalog[catalogKey];
  if (rank !== "ENDING_F") {
    return catalog.variants[0];
  }

  const hiddenVariants = catalog.variants.slice(0, 2);
  const randomIndex = Math.floor(Math.random() * hiddenVariants.length);
  return hiddenVariants[randomIndex];
}

function getEndingOverlayAssetPath(
  rank: EndingRank | undefined,
  professorGender: string,
  variantId?: string,
) {
  if (rank === "ENDING_A_PLUS") {
    return professorGender === "여자" ? "/ui/ending-screen/femaleA.webp" : "/ui/ending-screen/maleA+.webp";
  }

  if (rank === "ENDING_B_PLUS") {
    return professorGender === "여자" ? "/ui/ending-screen/femaleB.webp" : "/ui/ending-screen/maleB.webp";
  }

  if (rank === "ENDING_C_PLUS") {
    return professorGender === "여자" ? "/ui/ending-screen/femaleC.webp" : "/ui/ending-screen/maleC.webp";
  }

  if (rank === "ENDING_F") {
    const hiddenVariantSuffix = variantId === "hidden_splus_02" ? "2" : "1";
    return professorGender === "여자"
      ? `/ui/ending-screen/femaleS${hiddenVariantSuffix}.webp`
      : `/ui/ending-screen/maleS${hiddenVariantSuffix}.webp`;
  }

  return null;
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
  const [generatedProfessorImageUrl, setGeneratedProfessorImageUrl] = useState("");
  const [generatedProfessorCutoutUrl, setGeneratedProfessorCutoutUrl] = useState("");
  const [generatedProfessorStorySpriteUrl, setGeneratedProfessorStorySpriteUrl] = useState("");
  const [generatedProfessorDialoguePortraitUrl, setGeneratedProfessorDialoguePortraitUrl] = useState("");
  const [isGeneratingProfessorImage, setIsGeneratingProfessorImage] = useState(false);
  const [professorImageError, setProfessorImageError] = useState("");
  const [professorImagePromptSummary, setProfessorImagePromptSummary] = useState("");
  const [professorSpeakingStyleError, setProfessorSpeakingStyleError] = useState("");

  const [audioLevels, setAudioLevels] = useState<AudioLevels>(DEFAULT_AUDIO_LEVELS);
  const [isSoundPanelOpen, setIsSoundPanelOpen] = useState(false);
  const soundPanelRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSfxRef = useRef<Array<{ audio: HTMLAudioElement; expiresAfterSerial: number }>>([]);
  const professorVoiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const tryPlayBgmRef = useRef<() => void>(() => {});
  const lastSfxTriggerRef = useRef<string>("");
  const lastProfessorVoiceTriggerRef = useRef<string>("");
  const [needsBgmUnlock, setNeedsBgmUnlock] = useState(false);
  const [isProfessorVoicePlaying, setIsProfessorVoicePlaying] = useState(false);

  const effectiveMasterVolume = audioLevels.master / 100;
  const effectiveBgmVolume = effectiveMasterVolume * (audioLevels.bgm / 100);
  const effectiveVoiceVolume = effectiveMasterVolume * (audioLevels.voice / 100);
  const effectiveSfxVolume = effectiveMasterVolume * (audioLevels.sfx / 100);
  const isBgmEnabled = effectiveBgmVolume > 0;
  const isProfessorVoiceEnabled = effectiveVoiceVolume > 0;
  const isSfxEnabled = effectiveSfxVolume > 0;

  const stopActiveSfx = () => {
    activeSfxRef.current.forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeSfxRef.current = [];
  };

  const stopProfessorVoice = () => {
    if (!professorVoiceAudioRef.current) {
      setIsProfessorVoicePlaying(false);
      return;
    }

    professorVoiceAudioRef.current.pause();
    professorVoiceAudioRef.current.currentTime = 0;
    professorVoiceAudioRef.current = null;
    setIsProfessorVoicePlaying(false);
  };

  const updateAudioLevel = (key: keyof AudioLevels, nextValue: number) => {
    const safeValue = Math.max(0, Math.min(100, nextValue));
    setAudioLevels((current) => ({
      ...current,
      [key]: safeValue,
    }));
  };

  tryPlayBgmRef.current = () => {
    if (!audioRef.current || !isBgmEnabled) {
      return;
    }

    audioRef.current
      .play()
      .then(() => setNeedsBgmUnlock(false))
      .catch((err) => {
        console.error("BGM 재생 실패:", err);
        setNeedsBgmUnlock(true);
      });
  };

  const [activeProfessorScriptProfileKey, setActiveProfessorScriptProfileKey] = useState("male_30s");
  const [activeProfessorScriptLines, setActiveProfessorScriptLines] = useState<string[]>([]);
  const [storyCursor, setStoryCursor] = useState<{
    episodeId: string;
    sceneId: string;
    lineIndex: number;
  } | null>(null);
  const [pendingChoice, setPendingChoice] = useState<StoryChoice | null>(null);
  const [maxScore, setMaxScore] = useState(0);
  const [rawScore, setRawScore] = useState(0);
  const [affinityDelta, setAffinityDelta] = useState<{ value: number; id: number } | null>(null);
  const affinityDeltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heartPulse, setHeartPulse] = useState<"increase" | "decrease" | null>(null);
  const heartPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleImageRef = useRef<HTMLImageElement | null>(null);
  const particleFrameRef = useRef<number | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endingTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveNextChapterRef = useRef<() => void>(() => {});
  const revealCurrentDialogueImmediatelyRef = useRef<() => void>(() => {});
  const isDialogueLineTypingRef = useRef(false);
  const canAdvanceCurrentStepRef = useRef(false);

  const [ending, setEnding] = useState<EndingState | null>(null);
  const [isEndingTransition, setIsEndingTransition] = useState(false);
  const [isCreditFinished, setIsCreditFinished] = useState(false);
  const [isCreditMessageModalOpen, setIsCreditMessageModalOpen] = useState(false);
  const [creditMessagePromptContext, setCreditMessagePromptContext] =
    useState<CreditMessagePromptContext>("ending");
  const [hasPromptedCreditMessageOnProfessorGeneration, setHasPromptedCreditMessageOnProfessorGeneration] =
    useState(false);
  const [hasUsedProfessorGeneration, setHasUsedProfessorGeneration] = useState(false);
  const [pendingCreditMessageDraft, setPendingCreditMessageDraft] = useState<CreditMessageDraft | null>(null);
  const [creditMessageAuthorInput, setCreditMessageAuthorInput] = useState("");
  const [creditMessageInput, setCreditMessageInput] = useState("");
  const [creditMessageError, setCreditMessageError] = useState("");
  const [isSubmittingCreditMessage, setIsSubmittingCreditMessage] = useState(false);
  const [creditMessageEntries, setCreditMessageEntries] = useState<CreditMessageEntry[]>([]);
  const [typedProfessorLine, setTypedProfessorLine] = useState("");
  const [isAutoPlayOn, setIsAutoPlayOn] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMobileNoticeDismissed, setIsMobileNoticeDismissed] = useState(false);
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
  const [debugPlayerGender, setDebugPlayerGender] = useState<PlayerFormState["gender"]>(initialPlayerState.gender);
  const [debugProfessorGender, setDebugProfessorGender] = useState<ProfessorFormState["gender"]>(initialProfessorState.gender);
  const [debugProfessorSpeakingStyle, setDebugProfessorSpeakingStyle] = useState<ProfessorFormState["speakingStyle"]>("TONE_30S");
  const eyeBlinkMaskId = useId();

  const debugPhaseButtons: Array<{ phase: Phase; label: string }> = [
    { phase: "screen1_title", label: "화면1 타이틀" },
    { phase: "screen2_player", label: "화면2 플레이어" },
    { phase: "screen3_professor", label: "화면3 교수 설정" },
    { phase: "screen4_8_chapter", label: "화면4~8 스토리" },
    { phase: "screen9_ending", label: "화면9 엔딩" },
    { phase: "screen10_temp", label: "화면10 임시" },
    { phase: "screen11_credit", label: "화면11 크레딧" },
  ];

  const playerName = useMemo(() => toDisplayPlayerName(player.name), [player.name]);
  const professorName = useMemo(() => toDisplayProfessorName(professor.name), [professor.name]);

  const currentEpisode = storyCursor ? getStoryEpisode(storyCursor.episodeId) : null;
  const currentBgmUrl = useMemo(
    () => resolveBgmUrlByContext(phase, currentEpisode?.id ?? null),
    [currentEpisode?.id, phase],
  );
  const currentScene = storyCursor ? getStoryScene(storyCursor.episodeId, storyCursor.sceneId) : null;
  const currentSceneLines = useMemo(() => {
    if (!currentEpisode || !currentScene || !storyCursor) {
      return [];
    }

    return resolveSceneLines(
      storyCursor.episodeId,
      currentScene,
      playerName,
      professorName,
      activeProfessorScriptLines,
    );
  }, [activeProfessorScriptLines, currentEpisode, currentScene, playerName, professorName, storyCursor]);
  const currentLine =
    !pendingChoice && storyCursor && storyCursor.lineIndex < currentSceneLines.length
      ? currentSceneLines[storyCursor.lineIndex]
      : null;
  const currentLineSerial =
    storyCursor && !pendingChoice && currentLine
      ? storyDisplayLineSerialMap.get(
          `${storyCursor.episodeId}::${storyCursor.sceneId}::${storyCursor.lineIndex}`,
        ) ?? null
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
        backdrop: resolveBackdropByEpisode(currentEpisode.id),
      }
    : null;
  const currentBackdropLayers = [currentChapterInfo?.backdrop ?? DUMMY_SOLID_LAYER];
  const activeSpeakerLabel = pendingChoice ? "나" : currentLine?.speaker ?? "나레이션";
  const activeDialogueLine = pendingChoice
    ? replaceStoryPlaceholders(pendingChoice.text, playerName, professorName)
    : currentLine?.text ?? "";
  const currentProfessorVoiceSlotPath =
    !pendingChoice &&
    currentLine?.speaker === "교수" &&
    typeof currentLine?.professorLineIndex === "number"
      ? buildProfessorVoiceSlotPath(activeProfessorScriptProfileKey, currentLine.professorLineIndex)
      : "";
  const currentEndingVoiceSlotPath =
    phase === "screen9_ending" && ending?.variantId
      ? buildEndingVoiceSlotPath(activeProfessorScriptProfileKey, ending.variantId)
      : "";
  const professorVisualSrc =
    generatedProfessorStorySpriteUrl || generatedProfessorCutoutUrl || generatedProfessorImageUrl;
  const professorDialoguePortraitSrc =
    generatedProfessorDialoguePortraitUrl ||
    generatedProfessorStorySpriteUrl ||
    generatedProfessorCutoutUrl ||
    generatedProfessorImageUrl;
  const isNightEpisodeEndingTransition =
    phase === "screen4_8_chapter" &&
    isEndingTransition &&
    Boolean(storyCursor?.episodeId?.startsWith("ep06_"));
  const isDialogueLineTyping =
    phase === "screen4_8_chapter" &&
    activeDialogueLine.length > 0 &&
    typedProfessorLine !== activeDialogueLine;
  const shouldShowChoiceOverlay =
    hasCurrentChoices && !isDialogueLineTyping && !isNightEpisodeEndingTransition;
  const canAdvanceCurrentStep =
    (!hasCurrentChoices || Boolean(pendingChoice) || currentLine !== null) &&
    !isDialogueLineTyping &&
    !isNightEpisodeEndingTransition;
  const futurePotentialScore = useMemo(() => {
    if (!storyCursor || !currentScene) {
      return 0;
    }

    if (pendingChoice) {
      if (pendingChoice.next_scene) {
        return getFuturePotentialScoreFromDestination(storyCursor.episodeId, pendingChoice.next_scene);
      }

      if (pendingChoice.next_episode) {
        return getFuturePotentialScoreFromDestination(
          pendingChoice.next_episode,
          getFirstSceneId(pendingChoice.next_episode) ?? undefined,
        );
      }

      return 0;
    }

    if (currentChoiceList.length > 0) {
      return getFuturePotentialScoreFromDestination(storyCursor.episodeId, currentScene.id);
    }

    if (currentScene.next_scene) {
      return getFuturePotentialScoreFromDestination(storyCursor.episodeId, currentScene.next_scene);
    }

    if (currentScene.next_episode) {
      return getFuturePotentialScoreFromDestination(
        currentScene.next_episode,
        getFirstSceneId(currentScene.next_episode) ?? undefined,
      );
    }

    return 0;
  }, [currentChoiceList.length, currentScene, pendingChoice, storyCursor]);
  const routeMaxScore = maxScore + futurePotentialScore;
  const isBgmSuppressed = isBgmSuppressedForStoryMoment(
    phase,
    storyCursor?.episodeId ?? null,
    currentScene?.id ?? null,
    pendingChoice ? null : storyCursor?.lineIndex ?? null,
  );
  const currentVisualCue = useMemo(
    () =>
      resolveStoryVisualCue(
        storyCursor?.episodeId ?? null,
        currentScene?.id ?? null,
        pendingChoice ? null : storyCursor?.lineIndex ?? null,
      ),
    [currentScene?.id, pendingChoice, storyCursor],
  );
  const shouldShowProfessorBaseVisual =
    phase === "screen4_8_chapter" &&
    !shouldShowChoiceOverlay &&
    !currentVisualCue &&
    Boolean(professorVisualSrc) &&
    currentLine?.speaker === "교수";

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

  const affinityPercent = totalScoreToPercent(rawScore);
  const visibleAffinityPercent = affinityPercent > 0 ? Math.max(6, affinityPercent) : 0;
  const affinityKnobPercent = Math.max(3, Math.min(97, visibleAffinityPercent));
  const affinityMood = getAffinityMood(affinityPercent);
  const debugEndingCatalog = storyEndingCatalog[storyEndingKeyByRank(debugEndingSelect)];
  const endingOverlayAssetPath = useMemo(
    () => getEndingOverlayAssetPath(ending?.rank, professor.gender, ending?.variantId),
    [ending?.rank, professor.gender, ending?.variantId],
  );
  const creditRollDuration = useMemo(
    () => Math.max(18, 18 + creditMessageEntries.length * 3.1),
    [creditMessageEntries.length],
  );
  const debugEndingVariants = useMemo(
    () =>
      debugEndingSelect === "ENDING_F"
        ? debugEndingCatalog.variants.slice(0, 2)
        : debugEndingCatalog.variants,
    [debugEndingCatalog.variants, debugEndingSelect],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(AUDIO_LEVEL_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<AudioLevels>;
      setAudioLevels({
        master: typeof parsed.master === "number" ? Math.max(0, Math.min(100, parsed.master)) : DEFAULT_AUDIO_LEVELS.master,
        bgm: typeof parsed.bgm === "number" ? Math.max(0, Math.min(100, parsed.bgm)) : DEFAULT_AUDIO_LEVELS.bgm,
        voice: typeof parsed.voice === "number" ? Math.max(0, Math.min(100, parsed.voice)) : DEFAULT_AUDIO_LEVELS.voice,
        sfx: typeof parsed.sfx === "number" ? Math.max(0, Math.min(100, parsed.sfx)) : DEFAULT_AUDIO_LEVELS.sfx,
      });
    } catch {
      window.localStorage.removeItem(AUDIO_LEVEL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(AUDIO_LEVEL_STORAGE_KEY, JSON.stringify(audioLevels));
  }, [audioLevels]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1024px), (pointer: coarse)");
    const updateCompactViewport = () => {
      setIsCompactViewport(mediaQuery.matches || window.innerWidth < 1025);
    };

    updateCompactViewport();
    mediaQuery.addEventListener("change", updateCompactViewport);
    window.addEventListener("resize", updateCompactViewport);

    return () => {
      mediaQuery.removeEventListener("change", updateCompactViewport);
      window.removeEventListener("resize", updateCompactViewport);
    };
  }, []);

  useEffect(() => {
    if (!isSoundPanelOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !soundPanelRef.current?.contains(target)) {
        setIsSoundPanelOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isSoundPanelOpen]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = effectiveBgmVolume;
    if (!isBgmEnabled) {
      audioRef.current.pause();
      setNeedsBgmUnlock(false);
      return;
    }
  }, [effectiveBgmVolume, isBgmEnabled]);

  useEffect(() => {
    if (!audioRef.current || !isBgmEnabled || isBgmSuppressed) {
      return;
    }

    tryPlayBgmRef.current();
  }, [currentBgmUrl, isBgmEnabled, isBgmSuppressed]);

  useEffect(() => {
    if (professorVoiceAudioRef.current) {
      professorVoiceAudioRef.current.volume = effectiveVoiceVolume;
      if (!isProfessorVoiceEnabled) {
        stopProfessorVoice();
      }
    }
  }, [effectiveVoiceVolume, isProfessorVoiceEnabled]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (isBgmSuppressed) {
      audioRef.current.pause();
      return;
    }

    if (!isBgmEnabled || !audioRef.current.paused) {
      return;
    }

    audioRef.current
      .play()
      .then(() => setNeedsBgmUnlock(false))
      .catch((err) => {
        console.error("BGM 재생 실패:", err);
        setNeedsBgmUnlock(true);
      });
  }, [isBgmEnabled, isBgmSuppressed]);

  useEffect(() => {
    if (!needsBgmUnlock || !isBgmEnabled) {
      return;
    }

    const retryBgmPlayback = () => {
      if (!isBgmEnabled) {
        return;
      }

      tryPlayBgmRef.current();
    };

    window.addEventListener("pointerdown", retryBgmPlayback, { passive: true });
    window.addEventListener("keydown", retryBgmPlayback);
    return () => {
      window.removeEventListener("pointerdown", retryBgmPlayback);
      window.removeEventListener("keydown", retryBgmPlayback);
    };
  }, [isBgmEnabled, needsBgmUnlock]);

  useEffect(() => {
    if (phase !== "screen4_8_chapter" || !storyCursor || !currentLine || pendingChoice) {
      return;
    }

    const triggerKey = `${storyCursor.episodeId}:${storyCursor.sceneId}:${storyCursor.lineIndex}`;
    if (lastSfxTriggerRef.current === triggerKey) {
      return;
    }

    const sfxKeys = resolveSfxKeysByContext(
      storyCursor.episodeId,
      storyCursor.sceneId,
      currentLine.text,
    );
    if (sfxKeys.length === 0) {
      return;
    }

    lastSfxTriggerRef.current = triggerKey;
    if (!isSfxEnabled) {
      return;
    }

    const currentSerial =
      storyDisplayLineSerialMap.get(
        `${storyCursor.episodeId}::${storyCursor.sceneId}::${storyCursor.lineIndex}`,
      ) ?? null;
    if (currentSerial === null) {
      return;
    }

    sfxKeys.forEach((key) => {
      const sfx = new Audio(STORY_SFX_URLS[key]);
      sfx.preload = "auto";
      sfx.loop = Boolean(STORY_SFX_BEHAVIOR[key].loop);
      sfx.volume = effectiveSfxVolume;
      activeSfxRef.current.push({
        audio: sfx,
        expiresAfterSerial: currentSerial + 1,
      });
      void sfx.play().catch(() => undefined);
    });
  }, [currentLine, effectiveSfxVolume, isSfxEnabled, pendingChoice, phase, storyCursor]);

  useEffect(() => {
    activeSfxRef.current.forEach(({ audio }) => {
      audio.volume = effectiveSfxVolume;
    });

    if (!isSfxEnabled) {
      stopActiveSfx();
      return;
    }

    if (currentLineSerial === null) {
      if (phase !== "screen4_8_chapter") {
        stopActiveSfx();
      }
      return;
    }

    activeSfxRef.current = activeSfxRef.current.filter(({ audio, expiresAfterSerial }) => {
      if (currentLineSerial <= expiresAfterSerial) {
        return true;
      }

      audio.pause();
      audio.currentTime = 0;
      return false;
    });
  }, [currentLineSerial, effectiveSfxVolume, isSfxEnabled, phase]);

  useEffect(() => {
    if (!isProfessorVoiceEnabled) {
      lastProfessorVoiceTriggerRef.current = "";
      stopProfessorVoice();
      return;
    }

    let triggerKey = "";
    let voicePath = "";

    if (
      phase === "screen4_8_chapter" &&
      storyCursor &&
      !pendingChoice &&
      currentLine?.speaker === "교수" &&
      currentProfessorVoiceSlotPath
    ) {
      triggerKey = `${storyCursor.episodeId}:${storyCursor.sceneId}:${storyCursor.lineIndex}:${currentProfessorVoiceSlotPath}`;
      voicePath = currentProfessorVoiceSlotPath;
    } else if (phase === "screen9_ending" && ending?.variantId && currentEndingVoiceSlotPath) {
      triggerKey = `ending:${ending.variantId}:${currentEndingVoiceSlotPath}`;
      voicePath = currentEndingVoiceSlotPath;
    } else {
      lastProfessorVoiceTriggerRef.current = "";
      stopProfessorVoice();
      return;
    }

    if (lastProfessorVoiceTriggerRef.current === triggerKey) {
      return;
    }

    lastProfessorVoiceTriggerRef.current = triggerKey;
    stopProfessorVoice();

    const voice = new Audio(voicePath);
    voice.preload = "auto";
    voice.volume = effectiveVoiceVolume;
    setIsProfessorVoicePlaying(true);
    voice.onended = () => {
      setIsProfessorVoicePlaying(false);
      professorVoiceAudioRef.current = null;
    };
    voice.onpause = () => {
      if (voice.ended || voice.currentTime === 0) {
        setIsProfessorVoicePlaying(false);
      }
    };
    professorVoiceAudioRef.current = voice;
    void voice.play().catch(() => {
      setIsProfessorVoicePlaying(false);
      professorVoiceAudioRef.current = null;
    });
  }, [
    currentLine?.speaker,
    currentEndingVoiceSlotPath,
    currentProfessorVoiceSlotPath,
    effectiveVoiceVolume,
    ending?.variantId,
    isProfessorVoiceEnabled,
    pendingChoice,
    phase,
    storyCursor,
  ]);

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
      if (endingTransitionTimerRef.current) {
        clearTimeout(endingTransitionTimerRef.current);
        endingTransitionTimerRef.current = null;
      }
      stopActiveSfx();
      stopProfessorVoice();
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
    if (phase !== "screen4_8_chapter" || !isAutoPlayOn || !canAdvanceCurrentStep || isDialogueLineTyping) {
      return;
    }

    const shouldWaitForProfessorVoice =
      currentLine?.speaker === "교수" && Boolean(currentProfessorVoiceSlotPath) && isProfessorVoicePlaying;
    if (shouldWaitForProfessorVoice) {
      return;
    }

    const timer = setTimeout(() => {
      moveNextChapterRef.current();
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    canAdvanceCurrentStep,
    currentLine?.speaker,
    currentProfessorVoiceSlotPath,
    isAutoPlayOn,
    isDialogueLineTyping,
    isProfessorVoicePlaying,
    phase,
  ]);

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

  useEffect(() => {
    setDebugPlayerGender(player.gender);
  }, [player.gender]);

  useEffect(() => {
    setDebugProfessorGender(professor.gender);
    setDebugProfessorSpeakingStyle(professor.speakingStyle || "TONE_30S");
  }, [professor.gender, professor.speakingStyle]);

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
    if (key === "speakingStyle") {
      setProfessorSpeakingStyleError("");
    }
  }

  function ensureProfessorSpeakingStyleSelected() {
    if (professor.speakingStyle) {
      return true;
    }

    setProfessorSpeakingStyleError("교수님 말투를 선택해주세요.");
    return false;
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
    lastSfxTriggerRef.current = "";
    stopActiveSfx();
    setPhase("screen4_8_chapter");
  }

  function previewEndingByRank(rank: EndingRank, variantIndex = 0) {
    const catalogVariants = storyEndingCatalog[storyEndingKeyByRank(rank)].variants;
    const variants = rank === "ENDING_F" ? catalogVariants.slice(0, 2) : catalogVariants;
    if (variants.length === 0) {
      return;
    }
    const safeVariantIndex = Math.min(Math.max(variantIndex, 0), variants.length - 1);
    const variant = variants[safeVariantIndex];
    setEnding({
      rank,
      title: `${endingMeta[rank].title} · ${variant.title}`,
      description: buildVariantSummary(variant, rank),
      score100: debugEndingScoreMap[rank],
      variantId: variant.id,
      variantSubtype: variant.subtype,
      variantLines: buildVariantLines(variant, playerName, professorName, professor.gender),
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

    if (targetPhase === "screen11_credit") {
      void goCreditScreen();
      return;
    }

    setPhase(targetPhase);
  }

  function applyDebugAffinity() {
    const nextPercent = Math.max(0, Math.min(100, Math.round(debugAffinityInput)));
    const prevPercent = affinityPercent;
    const nextRawScore = percentToTotalScore(nextPercent);
    
    setDebugAffinityInput(nextPercent);
    setRawScore(nextRawScore);
    setMaxScore(Math.max(maxScore, MAX_TOTAL_AFFINITY_SCORE));
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
    if (isBgmEnabled && needsBgmUnlock) {
      tryPlayBgmRef.current();
    }
    setPhase("screen2_player");
  }

  async function applyDebugCharacterSettings() {
    const nextPlayerGender = debugPlayerGender;
    const nextProfessor = resolveProfessorForGeneration({
      ...professor,
      gender: debugProfessorGender,
      speakingStyle: debugProfessorSpeakingStyle || "TONE_30S",
    });

    setPlayer((current) => ({
      ...current,
      gender: nextPlayerGender,
    }));
    setProfessor(nextProfessor);
    await loadProfessorScriptLines(nextProfessor);
  }

  function confirmPlayerInfo() {
    const normalizedName = toDisplayPlayerName(player.name);
    setPlayer((current) => ({ ...current, name: normalizedName }));
    setPhase("screen3_professor");
  }

  async function loadProfessorScriptLines(resolvedProfessor: ProfessorFormState) {
    const profileKey = resolveProfessorScriptProfileKey(
      resolvedProfessor.gender,
      resolvedProfessor.speakingStyle,
    );
    setActiveProfessorScriptProfileKey(profileKey);

    try {
      const response = await fetch(
        `/api/professor-script-profile?gender=${encodeURIComponent(resolvedProfessor.gender)}&ageTone=${encodeURIComponent(resolvedProfessor.speakingStyle)}`,
      );
      if (!response.ok) {
        throw new Error("스크립트 프로필 응답 실패");
      }
      const data = (await response.json()) as { professorLines?: string[] };
      setActiveProfessorScriptLines(Array.isArray(data.professorLines) ? data.professorLines : []);
    } catch {
      setActiveProfessorScriptLines([]);
    }
  }

  async function generateProfessorImage() {
    if (!ensureProfessorSpeakingStyleSelected()) {
      return;
    }
    if (hasUsedProfessorGeneration) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    setProfessor(resolvedProfessor);
    setHasUsedProfessorGeneration(true);
    setIsGeneratingProfessorImage(true);
    setProfessorImageError("");
    if (!hasPromptedCreditMessageOnProfessorGeneration) {
      setHasPromptedCreditMessageOnProfessorGeneration(true);
      openCreditMessageModal("professor_generation");
    }

    try {
      const response = await fetch("/api/generate-professor-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professor: resolvedProfessor,
        }),
      });

      const data = (await response.json()) as {
        imageDataUrl?: string;
        transparentDataUrl?: string | null;
        storySpriteDataUrl?: string | null;
        dialoguePortraitDataUrl?: string | null;
        storedFullImageUrl?: string | null;
        prompt?: string;
        message?: string;
        storageUploadWarning?: string | null;
      };

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.message || "교수 이미지 생성에 실패했습니다.");
      }

      setGeneratedProfessorImageUrl(data.storedFullImageUrl || data.imageDataUrl);
      setGeneratedProfessorCutoutUrl(data.transparentDataUrl || data.storedFullImageUrl || "");
      setGeneratedProfessorStorySpriteUrl(
        data.storySpriteDataUrl || data.transparentDataUrl || data.imageDataUrl,
      );
      setGeneratedProfessorDialoguePortraitUrl(
        data.dialoguePortraitDataUrl ||
          data.storySpriteDataUrl ||
          data.transparentDataUrl ||
          data.imageDataUrl,
      );
      setProfessorImagePromptSummary(data.prompt || buildIllustrationPrompt(resolvedProfessor));
      if (data.storageUploadWarning) {
        setProfessorImageError(data.storageUploadWarning);
      }
    } catch (error) {
      setProfessorImageError(
        error instanceof Error ? error.message : "교수 이미지 생성에 실패했습니다.",
      );
    } finally {
      setIsGeneratingProfessorImage(false);
    }
  }

  function prepareSessionPack(resolvedProfessor: ProfessorFormState) {
    setProfessor(resolvedProfessor);
    setRawScore(0);
    setMaxScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setEnding(null);
  }

  async function startStory() {
    if (!ensureProfessorSpeakingStyleSelected()) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    prepareSessionPack(resolvedProfessor);
    await loadProfessorScriptLines(resolvedProfessor);
    const firstEpisodeId = "ep01_commute";
    const firstSceneId = getFirstSceneId(firstEpisodeId);
    if (!firstSceneId) {
      return;
    }
    setStoryCursor({ episodeId: firstEpisodeId, sceneId: firstSceneId, lineIndex: 0 });
    setPendingChoice(null);
    stopActiveSfx();
    lastSfxTriggerRef.current = "";
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

  function queueEndingTransition(nextEnding: EndingState) {
    if (endingTransitionTimerRef.current) {
      clearTimeout(endingTransitionTimerRef.current);
    }

    setIsEndingTransition(true);
    endingTransitionTimerRef.current = setTimeout(() => {
      setEnding(nextEnding);
      setPhase("screen9_ending");
      setIsEndingTransition(false);
      endingTransitionTimerRef.current = null;
    }, 1800);
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
    if (meaningfulChoiceIds.has(choice.id)) {
      const gainedScore = getChoiceAffinity(choice.id);
      const currentChoiceMaxScore = getChoiceSceneMaxScore(currentChoiceList);
      setRawScore((current) => current + gainedScore);
      setMaxScore((current) => current + currentChoiceMaxScore);

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
    } else {
      setAffinityDelta(null);
    }

  }

  function moveNextChapter() {
    if (!storyCursor || !currentScene || !canAdvanceCurrentStep || isEndingTransition) {
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
      stopActiveSfx();
      const score100 = totalScoreToPercent(rawScore);
      const rank = rawScore >= 40 ? "ENDING_F" : getEndingRank(rawScore);
      const variant = pickEndingVariant(rank);
      const rankTitle = endingMeta[rank].title;

      const nextEndingState: EndingState = {
        rank,
        title: `${rankTitle} · ${variant.title}`,
        description: buildVariantSummary(variant, rank),
        score100,
        variantId: variant.id,
        variantSubtype: variant.subtype,
        variantLines: buildVariantLines(variant, playerName, professorName, professor.gender),
      };

      if (storyCursor.episodeId.startsWith("ep06_")) {
        queueEndingTransition(nextEndingState);
        return;
      }

      setEnding(nextEndingState);
      setPhase("screen9_ending");
    }
  }

  async function loadCreditMessages() {
    try {
      const response = await fetch("/api/credit-messages", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("응원 문구 조회 실패");
      }

      const data = (await response.json()) as {
        messages?: CreditMessageEntry[];
      };
      setCreditMessageEntries(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setCreditMessageEntries([]);
    }
  }

  async function persistCreditMessage(
    draft: CreditMessageDraft,
    endingInfo: EndingState | null,
  ) {
    const response = await fetch("/api/credit-messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerName: draft.playerName || "익명의 학생",
        messageText: draft.messageText,
        professorImageUrl: resolvePersistedProfessorImageUrl(
          generatedProfessorStorySpriteUrl || generatedProfessorImageUrl,
        ),
        ending: endingInfo?.rank
          ? {
              key: endingMeta[endingInfo.rank].key,
              title: endingInfo.title,
            }
          : null,
      }),
    });

    const data = (await response.json()) as {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message || "응원 문구 저장에 실패했습니다.");
    }
  }

  async function goCreditScreen() {
    if (pendingCreditMessageDraft) {
      try {
        await persistCreditMessage(pendingCreditMessageDraft, ending);
        setPendingCreditMessageDraft(null);
      } catch (error) {
        openCreditMessageModal(
          "ending",
          pendingCreditMessageDraft,
          error instanceof Error
            ? `${error.message} 다시 시도하거나 건너뛸 수 있어요.`
            : "응원 문구 저장에 실패했습니다. 다시 시도하거나 건너뛸 수 있어요.",
        );
        return;
      }
    }
    setIsCreditFinished(false);
    await loadCreditMessages();
    setPhase("screen11_credit");
  }

  function openCreditMessageModal(
    context: CreditMessagePromptContext = "ending",
    draft?: CreditMessageDraft | null,
    errorMessage = "",
  ) {
    setCreditMessagePromptContext(context);
    setCreditMessageError(errorMessage);
    setCreditMessageAuthorInput(draft?.playerName ?? "");
    setCreditMessageInput(draft?.messageText ?? "");
    setIsCreditMessageModalOpen(true);
  }

  async function skipCreditMessage() {
    setCreditMessageError("");
    setIsCreditMessageModalOpen(false);
    if (creditMessagePromptContext === "ending") {
      setPendingCreditMessageDraft(null);
      await goCreditScreen();
    }
  }

  async function submitCreditMessage() {
    const normalizedMessage = creditMessageInput.replace(/\s+/g, " ").trim();
    const normalizedAuthor = creditMessageAuthorInput.trim().slice(0, 30);

    if (!normalizedMessage) {
      setCreditMessageError("응원 문구를 입력해주세요.");
      return;
    }

    if (normalizedMessage.length > 80) {
      setCreditMessageError("응원 문구는 80자 이하로 입력해주세요.");
      return;
    }

    setIsSubmittingCreditMessage(true);
    setCreditMessageError("");

    try {
      const submittedDraft = {
        playerName: normalizedAuthor || "익명의 학생",
        messageText: normalizedMessage,
      };

      if (creditMessagePromptContext === "professor_generation") {
        setPendingCreditMessageDraft(submittedDraft);
        setIsCreditMessageModalOpen(false);
        setCreditMessageInput("");
        setCreditMessageAuthorInput("");
        return;
      }

      await persistCreditMessage(submittedDraft, ending);
      setPendingCreditMessageDraft(null);
      setIsCreditMessageModalOpen(false);
      setCreditMessageInput("");
      setCreditMessageAuthorInput("");
      if (creditMessagePromptContext === "ending") {
        await goCreditScreen();
      }
    } catch (error) {
      setCreditMessageError(
        error instanceof Error ? error.message : "응원 문구 저장에 실패했습니다.",
      );
    } finally {
      setIsSubmittingCreditMessage(false);
    }
  }

  function resetToMain() {
    stopActiveSfx();
    stopProfessorVoice();
    setPhase("screen1_title");
    setPlayer(initialPlayerState);
    setProfessor(initialProfessorState);
    setGeneratedProfessorImageUrl("");
    setGeneratedProfessorCutoutUrl("");
    setGeneratedProfessorStorySpriteUrl("");
    setGeneratedProfessorDialoguePortraitUrl("");
    setProfessorImageError("");
    setProfessorImagePromptSummary("");
    setActiveProfessorScriptProfileKey("male_30s");
    setActiveProfessorScriptLines([]);
    setStoryCursor(null);
    setPendingChoice(null);
    setRawScore(0);
    setMaxScore(0);
    setAffinityDelta(null);
    if (affinityDeltaTimerRef.current) {
      clearTimeout(affinityDeltaTimerRef.current);
      affinityDeltaTimerRef.current = null;
    }
    setEnding(null);
    setIsEndingTransition(false);
    setIsCreditFinished(false);
    setIsCreditMessageModalOpen(false);
    setCreditMessageAuthorInput("");
    setCreditMessageInput("");
    setCreditMessageError("");
    setIsSubmittingCreditMessage(false);
    setCreditMessageEntries([]);
    setIsAutoPlayOn(false);
    if (endingTransitionTimerRef.current) {
      clearTimeout(endingTransitionTimerRef.current);
      endingTransitionTimerRef.current = null;
    }
    setIsSoundPanelOpen(false);
    lastSfxTriggerRef.current = "";
  }

  const soundLevelControls: Array<{ key: keyof AudioLevels; label: string; hint: string }> = [
    { key: "master", label: "전체", hint: "전체 볼륨" },
    { key: "bgm", label: "배경", hint: "배경음" },
    { key: "voice", label: "대사", hint: "교수 대사" },
    { key: "sfx", label: "효과", hint: "효과음" },
  ];

  return (
    <main className="min-h-screen text-black">
      {isCompactViewport && !isMobileNoticeDismissed && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[rgba(28,12,20,0.66)] px-5 backdrop-blur-md">
          <div className="font-pretendard w-full max-w-[min(92vw,540px)] rounded-[30px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,248,252,0.96),rgba(255,236,244,0.94))] px-6 py-7 text-center text-[#4f2038] shadow-[0_30px_90px_rgba(52,15,32,0.34)]">
            <p className="text-[clamp(28px,7vw,40px)] font-black leading-[1.15]">
              모바일과 웹 분할화면에서는
              <br />
              제대로 보이지 않아요
            </p>
            <p className="mt-4 text-[clamp(15px,3.8vw,18px)] font-medium leading-[1.7] text-[#74495e]">
              이 게임은 웹 전체화면만 지원합니다.
              <br />
              가능하면 PC에서 브라우저를 전체화면으로 열어 접속해주세요.
              <br />
              죄송합니다.
            </p>
            <button
              type="button"
              onClick={() => setIsMobileNoticeDismissed(true)}
              className="mt-6 rounded-full border border-[#eaa4c0] bg-[linear-gradient(180deg,#ffddec,#ffc5db)] px-6 py-3 text-sm font-black text-[#5f1f3c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(166,64,108,0.18)] transition hover:brightness-[1.02]"
            >
              일단 계속 보기
            </button>
          </div>
        </div>
      )}

      {/* 상단 HUD 컨트롤 */}
      <div className="top-hud-controls">
        <button
          type="button"
          onClick={handleDebugButtonClick}
          className={`top-hud-button top-hud-secret-button ${isDebugUnlocked ? "is-active" : ""}`}
        >
          <span className="top-hud-button-label">♡교수님의 비밀 에피소드를 발견해!♡</span>
        </button>
        <div ref={soundPanelRef} className="top-hud-sound-stack">
          <button
            type="button"
            onClick={() => setIsSoundPanelOpen((current) => !current)}
            className={`top-hud-button top-hud-sound-button ${isSoundPanelOpen ? "is-active" : ""}`}
            aria-expanded={isSoundPanelOpen}
            aria-label="사운드 설정 열기"
          >
            <span className="top-hud-button-icon" aria-hidden>
              <SlidersHorizontal size={18} strokeWidth={2.5} />
            </span>
            <span className="top-hud-sound-copy">
              <span className="top-hud-button-label">Sound</span>
              <span className="top-hud-button-value">설정</span>
            </span>
            <span className="top-hud-sound-percent">{audioLevels.master}%</span>
          </button>

          {isSoundPanelOpen && (
            <div className="top-hud-sound-panel">
              <div className="top-hud-sound-panel-head">
                <p>상세 사운드 설정</p>
              </div>
              <div className="top-hud-sound-grid">
                {soundLevelControls.map((control) => (
                  <div key={control.key} className="top-hud-sound-card">
                    <span className="top-hud-sound-value">{audioLevels[control.key]}%</span>
                    <div className="top-hud-sound-slider-wrap">
                      <div className="top-hud-sound-rail" aria-hidden />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={audioLevels[control.key]}
                        onChange={(event) => updateAudioLevel(control.key, Number(event.target.value))}
                        className="top-hud-sound-slider"
                        aria-label={control.hint}
                      />
                    </div>
                    <div className="top-hud-sound-text">
                      <p>{control.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* 실제 오디오 태그 */}
        <audio ref={audioRef} src={currentBgmUrl} loop />
      </div>

      {isDebugPasswordModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border-2 border-[#d59ab5] bg-white p-5 shadow-2xl">
            <p className="text-lg font-black text-[#5a2240]">비밀 에피소드 잠금 해제</p>
            <p className="mt-1 text-sm text-[#6a3951]">
              비밀번호를 입력하면 운영진 패널을 열 수 있어요.
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
        <aside className="glass-debug-panel fixed inset-x-3 top-20 z-[120] max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto p-4 text-[#2f2f2f] md:inset-x-auto md:right-6 md:top-24 md:max-h-[calc(100dvh-8rem)] md:w-[min(92vw,430px)]">
          <div className="flex items-center justify-between">
            <p className="text-lg font-black text-[#5d2240]">디버그 패널</p>
            <button
              type="button"
              onClick={() => setIsDebugPanelOpen(false)}
              className="glass-debug-button px-2 py-1 text-xs font-semibold"
            >
              닫기
            </button>
          </div>

          <div className="glass-debug-card mt-3 p-3">
            <p className="text-xs font-semibold text-[#70435b]">현재 상태</p>
            <p className="mt-1 text-sm">
              화면: <span className="font-bold">{phase}</span>
            </p>
            <p className="text-sm">
              내 성별: <span className="font-bold">{player.gender}</span>
            </p>
            <p className="text-sm">
              교수 설정: <span className="font-bold">{professor.gender}</span> /{" "}
              <span className="font-bold">
                {professorSpeakingStyleOptions.find((option) => option.value === professor.speakingStyle)?.label ?? "미선택"}
              </span>
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
              <span className="font-bold">{maxScore}</span> / Route Max:{" "}
              <span className="font-bold">{routeMaxScore}</span>
            </p>
            <p className="text-sm">
              교수 스크립트: <span className="font-bold">{activeProfessorScriptProfileKey}</span> /{" "}
              <span className="font-bold">{activeProfessorScriptLines.length}</span>줄 로드
            </p>
            <p className="text-sm break-all">
              현재 BGM: <span className="font-bold">{currentBgmUrl}</span>
            </p>
          </div>

          <div className="glass-debug-card mt-3 p-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">캐릭터 디버그 설정</p>
            <label className="block text-[11px] font-bold tracking-[0.08em] text-[#7c3457]">
              내 성별
            </label>
            <select
              value={debugPlayerGender}
              onChange={(event) => setDebugPlayerGender(event.target.value as PlayerFormState["gender"])}
              className="glass-debug-input mt-1 h-9 w-full px-2 text-sm"
            >
              {playerGenderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-[11px] font-bold tracking-[0.08em] text-[#7c3457]">
              교수 성별
            </label>
            <select
              value={debugProfessorGender}
              onChange={(event) => setDebugProfessorGender(event.target.value as ProfessorFormState["gender"])}
              className="glass-debug-input mt-1 h-9 w-full px-2 text-sm"
            >
              {professorGenderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-[11px] font-bold tracking-[0.08em] text-[#7c3457]">
              교수 말투
            </label>
            <select
              value={debugProfessorSpeakingStyle}
              onChange={(event) => setDebugProfessorSpeakingStyle(event.target.value as ProfessorFormState["speakingStyle"])}
              className="glass-debug-input mt-1 h-9 w-full px-2 text-sm"
            >
              {professorSpeakingStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                void applyDebugCharacterSettings();
              }}
              className="glass-debug-button-primary mt-3 px-3 py-1.5 text-xs font-black text-[#5d2140]"
            >
              캐릭터 설정 적용
            </button>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">화면 이동</p>
            <div className="grid grid-cols-2 gap-2">
              {debugPhaseButtons.map((item) => (
                <button
                  key={item.phase}
                  type="button"
                  onClick={() => jumpToPhaseByDebug(item.phase)}
                  className="glass-debug-button px-2 py-2 text-xs font-semibold"
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
                  className="glass-debug-button px-2 py-2 text-xs font-semibold"
                >
                  {endingMeta[rank].title}
                </button>
              ))}
            </div>
            <div className="glass-debug-card mt-3 p-3">
              <p className="mb-2 text-xs font-black text-[#7c3457]">
                {endingMeta[debugEndingSelect].title} Variant
              </p>
              {debugEndingSelect === "ENDING_F" && (
                <p className="mb-2 text-[11px] font-semibold text-[#7b3f5b]">
                  히든 엔딩은 실제 게임과 동일하게 2개 변형만 표시됩니다. (호감도 100 트리거)
                </p>
              )}
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
                        ? "border-[#f4aac7] bg-[rgba(255,240,247,0.34)] text-[#5d2140]"
                        : "border-[rgba(255,255,255,0.24)] bg-[rgba(255,255,255,0.18)] text-[#6b3a54] hover:bg-[rgba(255,255,255,0.24)]"
                    }`}
                  >
                    <span className="block font-black">{variant.subtype}</span>
                    <span className="mt-1 block text-[11px] opacity-80">{variant.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-debug-card mt-3 p-3">
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
              className="glass-debug-input h-9 w-20 px-2 text-sm"
              />
              <button
                type="button"
                onClick={applyDebugAffinity}
                className="glass-debug-button-primary px-3 py-1.5 text-xs font-black text-[#5d2140]"
              >
                호감도 적용
              </button>
            </div>
          </div>

          <div className="glass-debug-card mt-3 p-3">
            <p className="mb-2 text-sm font-black text-[#5e2341]">스토리 점프</p>
            <select
              value={debugEpisodeSelect}
              onChange={(event) => setDebugEpisodeSelect(event.target.value)}
              className="glass-debug-input h-9 w-full px-2 text-sm"
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
              className="glass-debug-input mt-2 h-9 w-full px-2 text-sm"
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
              className="glass-debug-button-primary mt-2 px-3 py-1.5 text-xs font-black text-[#5d2140]"
            >
              이 씬으로 이동
            </button>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingChoice(null)}
                className="glass-debug-button px-2 py-1 text-xs font-semibold"
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
                className="glass-debug-button px-2 py-1 text-xs font-semibold"
              >
                현재 선택지 1번 반응 보기
              </button>
            </div>
          </div>
        </aside>
      )}

      {phase === "screen1_title" && (
        <section
          className="relative flex min-h-screen cursor-pointer items-center justify-center overflow-hidden px-4 py-0 md:px-8 md:py-0"
          onClick={goScreen2}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              goScreen2();
            }
          }}
        >
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: "url('/ui/title-screen/intro-background.webp')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,235,242,0.05),rgba(88,34,55,0.22))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,244,247,0.16),rgba(255,244,247,0)_26%),radial-gradient(circle_at_16%_82%,rgba(255,213,226,0.1),rgba(255,213,226,0)_30%),radial-gradient(circle_at_84%_18%,rgba(255,213,226,0.1),rgba(255,213,226,0)_28%)]" />
          <div
            className="screen1-title-full absolute inset-0 z-[1]"
            style={{ backgroundImage: "url('/ui/title-screen/title-logo.webp')" }}
            aria-hidden
          />

          <div className="screen1-stage relative z-10 mx-auto flex w-full max-w-[1360px] flex-col items-center justify-center">
            <div className="screen1-hero-frame">
              <div className="screen1-title-wrap">
                <h1 className="sr-only">오 나의 교수님! 비밀 에피소드</h1>
              </div>

              <div className="screen1-start-wrap">
                <div
                  className="screen1-start-art"
                  style={{ backgroundImage: "url('/ui/title-screen/start-button.webp')" }}
                  aria-hidden
                />
                <div className="screen1-start-audio-guide" aria-hidden>
                  <p>배경음악이 있습니다.</p>
                  <p>만약 안들리시면 음소거 버튼을 두 번 눌러주세요!</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "screen2_player" && (
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
          style={{
            backgroundImage: [
              "url('/ui/title-screen/player-customize-background.webp')",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[rgba(255,214,231,0.08)] backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.28),rgba(255,255,255,0)_18%),radial-gradient(circle_at_76%_18%,rgba(255,255,255,0.2),rgba(255,255,255,0)_14%),radial-gradient(circle_at_84%_72%,rgba(255,255,255,0.16),rgba(255,255,255,0)_12%),radial-gradient(circle_at_30%_78%,rgba(255,255,255,0.14),rgba(255,255,255,0)_10%)] opacity-80" />
          <div className="font-pretendard relative z-10 w-full max-w-[980px] text-center">
            <h2
              className="bg-[linear-gradient(180deg,#fffdfd_0%,#fff7fb_14%,#ffeef6_30%,#ffcbe1_48%,#ff86bb_66%,#ea4ca1_84%,#bf0d71_100%)] bg-clip-text text-[clamp(56px,8vw,108px)] font-black leading-none tracking-[-0.03em] text-transparent [text-shadow:_0_1px_0_rgba(255,240,247,0.52),_0_2px_0_rgba(208,96,149,0.42),_0_4px_0_rgba(176,58,119,0.42),_0_10px_18px_rgba(154,42,103,0.22)]"
              style={{ WebkitTextStroke: "0.9px rgba(0,0,0,0.55)" }}
            >
              당신의 이름과 성별은?
            </h2>

            <div className="mx-auto mt-8 max-w-[760px] rounded-[30px] border-2 border-white/70 bg-[rgba(255,255,255,0.42)] px-6 py-8 shadow-[0_18px_45px_rgba(72,20,45,0.14)] backdrop-blur-[10px] md:px-8 md:py-10">
              <input
                value={player.name}
                onChange={(event) => updatePlayer("name", event.target.value)}
                className="h-14 w-full rounded-[22px] border border-[#e7c2d0] bg-[rgba(255,255,255,0.92)] px-4 text-center text-xl font-medium text-[#4d1d37] outline-none placeholder:text-[#b57d94] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:ring-2 focus:ring-[#d778a1]/45 sm:h-16 sm:text-3xl"
                placeholder="이름은 최대 3자까지 가능합니다."
                maxLength={3}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {playerGenderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePlayer("gender", option.value)}
                    className={`min-w-[110px] rounded-full border px-5 py-2 text-xl font-semibold transition sm:min-w-[128px] sm:px-6 sm:text-3xl ${
                      player.gender === option.value
                        ? "border-[#cf8cad] bg-[linear-gradient(180deg,rgba(255,215,232,0.98),rgba(247,169,200,0.95))] text-[#5d1e3c] shadow-[inset_0_2px_0_rgba(255,255,255,0.82),0_8px_18px_rgba(133,62,94,0.18)]"
                        : "border-white/70 bg-[rgba(255,255,255,0.78)] text-[#6a2a49] hover:bg-white/90"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-[clamp(28px,3vw,46px)] font-bold leading-[1.3] text-[#6a2a49]">
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
              "url('/ui/title-screen/professor-customize-background.webp')",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-[rgba(255,214,231,0.08)] backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.28),rgba(255,255,255,0)_18%),radial-gradient(circle_at_72%_14%,rgba(255,255,255,0.22),rgba(255,255,255,0)_14%),radial-gradient(circle_at_86%_76%,rgba(255,255,255,0.14),rgba(255,255,255,0)_12%),radial-gradient(circle_at_24%_70%,rgba(255,255,255,0.12),rgba(255,255,255,0)_10%)] opacity-80" />
          <div className="font-pretendard relative z-10 w-full max-w-[1240px] text-center">
            <h2
              className="bg-[linear-gradient(180deg,#fffdfd_0%,#fff7fb_14%,#ffeef6_30%,#ffcbe1_48%,#ff86bb_66%,#ea4ca1_84%,#bf0d71_100%)] bg-clip-text text-[clamp(56px,8vw,108px)] font-black leading-none tracking-[-0.03em] text-transparent [text-shadow:_0_1px_0_rgba(255,240,247,0.52),_0_2px_0_rgba(208,96,149,0.42),_0_4px_0_rgba(176,58,119,0.42),_0_10px_18px_rgba(154,42,103,0.22)]"
              style={{ WebkitTextStroke: "0.9px rgba(0,0,0,0.55)" }}
            >
              교수님 생성
            </h2>

            <article className="mx-auto mt-5 rounded-[30px] border-2 border-white/70 bg-[rgba(255,255,255,0.42)] px-5 py-5 shadow-[0_18px_45px_rgba(68,18,40,0.16)] backdrop-blur-[10px] md:px-8 md:py-7">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-extrabold leading-none text-[#5f213f]">
                      이름
                    </label>
                    <input
                      value={professor.name}
                      onChange={(event) => updateProfessor("name", event.target.value)}
                      className="h-14 rounded-3xl border border-[#e7c2d0] bg-[rgba(255,255,255,0.92)] px-4 text-lg font-medium text-[#58203b] outline-none placeholder:text-[#b68198] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:ring-2 focus:ring-[#d977a1]/45 sm:h-16 sm:text-2xl"
                      placeholder="교수 이름"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <span className="text-[clamp(24px,7vw,44px)] font-extrabold leading-none text-[#5f213f]">
                      성별
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {professorGenderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateProfessor("gender", option.value)}
                          className={`h-13 min-w-[88px] rounded-full border px-4 text-[clamp(24px,7vw,44px)] font-semibold leading-none transition sm:h-16 sm:min-w-[120px] ${
                            professor.gender === option.value
                              ? "border-[#cf8cad] bg-[linear-gradient(180deg,rgba(255,215,232,0.98),rgba(247,169,200,0.95))] text-[#5e1f3e] shadow-[inset_0_2px_0_rgba(255,255,255,0.82),0_8px_18px_rgba(133,62,94,0.18)]"
                              : "border-white/70 bg-[rgba(255,255,255,0.78)] text-[#6b2b4a] hover:bg-white/90"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-extrabold leading-none text-[#5f213f]">
                      나이
                    </label>
                    <input
                      value={professor.age}
                      onChange={(event) => updateProfessor("age", event.target.value)}
                      className="h-14 rounded-3xl border border-[#e7c2d0] bg-[rgba(255,255,255,0.92)] px-4 text-lg font-medium text-[#58203b] outline-none placeholder:text-[#b68198] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:ring-2 focus:ring-[#d977a1]/45 sm:h-16 sm:text-2xl"
                      placeholder="예: 30"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-center sm:gap-3">
                    <label className="text-[clamp(24px,7vw,44px)] font-extrabold leading-none text-[#5f213f]">
                      말투
                    </label>
                    <select
                      value={professor.speakingStyle}
                      onChange={(event) => updateProfessor("speakingStyle", event.target.value)}
                      className={`h-14 rounded-3xl border bg-[rgba(255,255,255,0.92)] px-4 text-lg font-medium text-[#58203b] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:ring-2 focus:ring-[#d977a1]/45 sm:h-16 sm:text-2xl ${
                        professorSpeakingStyleError ? "border-[#cf3f73]" : "border-[#e7c2d0]"
                      }`}
                    >
                      <option value="">선택</option>
                      {professorSpeakingStyleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {professorSpeakingStyleError && (
                      <p className="text-sm font-semibold text-[#b12456] sm:col-start-2">
                        {professorSpeakingStyleError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[92px_1fr] sm:items-start sm:gap-3">
                    <label className="pt-2 text-[clamp(24px,7vw,44px)] font-extrabold leading-none text-[#5f213f]">
                      설정
                    </label>
                    <div>
                      <textarea
                        value={professor.customPrompt}
                        onChange={(event) => updateProfessor("customPrompt", event.target.value)}
                        rows={4}
                        maxLength={300}
                        placeholder="LLM에 반영할 교수님의 헤어, 눈매, 코, 턱선, 얼굴형, 표정, 피부톤, 전체 분위기 등을 적어주세요."
                        className="w-full rounded-[24px] border border-[#e7c2d0] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-base font-medium leading-[1.5] text-[#58203b] outline-none placeholder:text-[#b68198] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] focus:ring-2 focus:ring-[#d977a1]/45 sm:text-xl"
                      />
                      <div className="mt-2 flex items-center justify-end text-xs text-[#8e5b74]">
                        <span>{professor.customPrompt.trim().length}/300</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-full rounded-[28px] border border-white/70 bg-[rgba(255,255,255,0.72)] p-4 text-left text-[#5f223f] shadow-[0_16px_38px_rgba(92,28,57,0.12)] backdrop-blur-[6px]">
                    <p className="text-[clamp(22px,2.1vw,32px)] font-bold leading-[1.35]">
                      생성된 교수님 이미지
                    </p>
                    <div className="mt-3 flex min-h-[360px] items-center justify-center overflow-hidden rounded-[24px] border border-[#d7a1b9] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.95),rgba(255,236,244,0.76)_42%,rgba(229,177,201,0.58)_100%)]">
                      {generatedProfessorImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={generatedProfessorCutoutUrl || generatedProfessorImageUrl}
                          alt="생성된 교수 이미지"
                          className="h-full max-h-[420px] w-auto object-contain drop-shadow-[0_18px_24px_rgba(71,24,43,0.28)]"
                          draggable={false}
                        />
                      ) : (
                        <div aria-hidden="true" />
                      )}
                    </div>
                    {professorImageError && (
                      <p className="mt-2 text-sm font-semibold text-[#b12456]">{professorImageError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col items-center text-center text-[clamp(22px,2.3vw,34px)] font-bold leading-[1.25] text-[#5a1f39]">
                <p className="whitespace-nowrap">교수님 생성은 1회만 가능합니다. 신중하게 작성해주세요.</p>
                <p className="whitespace-nowrap">AI로 생성하는데 최대 1분이 소요될 수 있습니다.</p>
                <p className="whitespace-nowrap">
                  음악 즐기시면서 기다려주시면 금방 작성하신 교수님 보여드릴게요!
                </p>
              </div>

              <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-[60px]">
                <button
                  type="button"
                  onClick={generateProfessorImage}
                  disabled={isGeneratingProfessorImage || hasUsedProfessorGeneration}
                  className="screen2-confirm-btn screen3-create-btn min-w-[240px] disabled:cursor-wait disabled:opacity-70"
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
                    {isGeneratingProfessorImage ? "교수님 생성 중..." : "교수님 생성"}
                  </span>
                  <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                    ♡
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startStory}
                  className="screen2-confirm-btn screen3-create-btn min-w-[240px]"
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
                  <span className="screen2-confirm-label">스토리 시작</span>
                  <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                    ♡
                  </span>
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      {phase === "screen4_8_chapter" && currentChapterInfo && storyCursor && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-center bg-no-repeat transition-[background-image] duration-2000 ease-in-out"
            style={{
              backgroundImage: currentBackdropLayers.join(", "),
              backgroundSize: "cover",
              minWidth: "100%",
              minHeight: "100%",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,14,33,0.22),rgba(34,10,27,0.58))]" />
          <div className="episode-soft-pink-tint absolute inset-0" />
          {isNightEpisodeEndingTransition && (
            <div className="episode-eye-blink-overlay absolute inset-0 z-40" aria-hidden>
              <svg
                className="episode-eye-blink-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id={eyeBlinkMaskId} maskUnits="userSpaceOnUse">
                    <rect width="100" height="100" fill="white" />
                    <ellipse
                      className="episode-eye-blink-ellipse"
                      cx="50"
                      cy="50"
                      rx="47"
                      ry="27"
                      fill="black"
                    />
                  </mask>
                  <radialGradient id={`${eyeBlinkMaskId}-iris-glow`} cx="50%" cy="50%" r="62%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                    <stop offset="58%" stopColor="rgba(255,255,255,0.04)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>
                <rect
                  width="100"
                  height="100"
                  fill="rgba(0,0,0,0.992)"
                  mask={`url(#${eyeBlinkMaskId})`}
                />
                <ellipse
                  className="episode-eye-blink-ellipse episode-eye-blink-ellipse-texture"
                  cx="50"
                  cy="50"
                  rx="47"
                  ry="27"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="0.45"
                />
                <ellipse
                  className="episode-eye-blink-ellipse episode-eye-blink-ellipse-soft"
                  cx="50"
                  cy="50"
                  rx="45.5"
                  ry="24"
                  fill={`url(#${eyeBlinkMaskId}-iris-glow)`}
                />
              </svg>
            </div>
          )}
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
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-black text-white truncate">
                    {currentChapterInfo.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
                    <span>
                      Scene {currentSceneIndex}/{Math.max(1, currentEpisode?.scenes.length ?? 1)}
                    </span>
                    <span>{currentChapterInfo.location}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[260px] md:pb-[300px]">
              {currentVisualCue && !shouldShowChoiceOverlay && (
                <div className="pointer-events-none absolute inset-x-0 top-[8%] z-20 flex justify-center px-4">
                  <div
                    key={currentVisualCue.key}
                    className="w-full max-w-[min(70vw,560px)] rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,248,251,0.94),rgba(255,231,241,0.88))] p-4 shadow-[0_28px_60px_rgba(37,10,24,0.3)] backdrop-blur-sm"
                  >
                    <div className="overflow-hidden rounded-[24px] border border-[#d7a1b9] bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.98),rgba(255,240,245,0.86)_40%,rgba(225,171,195,0.66)_100%)]">
                      {currentVisualCue.variant === "professor" && professorVisualSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={professorVisualSrc}
                          alt={currentVisualCue.title}
                          className="mx-auto h-auto max-h-[42vh] w-auto object-contain drop-shadow-[0_16px_24px_rgba(58,18,37,0.24)]"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex min-h-[260px] flex-col items-center justify-center px-8 py-10 text-center">
                          <span className="font-gothic text-xs font-black tracking-[0.24em] text-[#b35d86]">
                            {currentVisualCue.variant === "prop" ? "OBJECT CUE" : currentVisualCue.variant === "mood" ? "MOOD CUE" : "PROFESSOR CUE"}
                          </span>
                          <div className="mt-4 rounded-full border border-[#e2aec5] bg-white/72 px-5 py-2 text-sm font-semibold text-[#9d4e73]">
                            {currentVisualCue.title}
                          </div>
                          <div className="mt-6 h-24 w-24 rounded-[28px] border border-dashed border-[#c782a2] bg-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]" />
                        </div>
                      )}
                    </div>
                    <div className="px-2 pb-1 pt-3 text-center text-[#6b2848]">
                      <p className="text-[clamp(22px,1.8vw,30px)] font-black leading-none">
                        {currentVisualCue.title}
                      </p>
                      <p className="mt-2 text-sm leading-[1.5] text-[#8c5570]">
                        {currentVisualCue.subtitle}
                      </p>
                    </div>
                  </div>
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
                      className="font-story block w-full rounded-[12px] border border-[#b7b7b7] bg-[rgba(255,255,255,0.94)] px-6 py-4 text-center text-[clamp(22px,2.4vw,52px)] font-medium leading-[1.2] text-[#2f2f2f] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-150 hover:translate-y-[-1px] hover:brightness-[1.01] active:translate-y-0"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {shouldShowProfessorBaseVisual && (
            <div className="pointer-events-none fixed inset-x-4 top-[182px] bottom-[14px] z-[68] md:top-[196px] md:bottom-[18px]">
              <div className="mx-auto relative h-full max-w-6xl">
                <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-center">
                  <div className="relative flex h-full w-full items-end justify-center">
                    <div className="absolute inset-x-6 bottom-5 h-12 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.18),rgba(0,0,0,0))]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={professorVisualSrc}
                      alt="교수 비주얼"
                      className="h-[82%] w-[82%] object-contain object-bottom drop-shadow-[0_30px_48px_rgba(39,11,26,0.42)] md:h-[94%] md:w-[94%]"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {shouldShowProfessorBaseVisual && professorDialoguePortraitSrc && (
            <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[88] hidden md:block md:bottom-8">
              <div className="mx-auto relative h-[290px] max-w-6xl">
                <div className="absolute left-[-193px] top-1/2 flex h-[188px] w-[150px] -translate-y-1/2 items-center justify-center overflow-visible">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={professorDialoguePortraitSrc}
                    alt="교수 대사 포트레이트"
                    className="h-full w-full object-contain object-center drop-shadow-[0_20px_34px_rgba(27,8,18,0.34)]"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] md:bottom-8">
            <div className="mx-auto flex w-full max-w-6xl justify-center pointer-events-auto">
              <div
                className="relative flex h-[250px] w-full flex-col rounded-[30px] border border-white/20 bg-[linear-gradient(180deg,rgba(22,20,28,0.74),rgba(12,10,18,0.88))] p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md md:h-[290px] md:p-8"
                onClick={() => {
                  if (isDialogueLineTyping) {
                    revealCurrentDialogueImmediately();
                  }
                }}
              >
                <div className="absolute -top-5 left-4 inline-flex min-h-11 items-center rounded-2xl border border-white/25 bg-[linear-gradient(90deg,#ff4f81,#ff7b9e)] px-5 shadow-lg md:left-8 md:px-8">
                  <span className="font-gothic text-base font-black tracking-tight text-white md:text-xl">
                    {activeSpeakerLabel}
                  </span>
                </div>

                <div className="flex-1 overflow-hidden pt-7 md:pt-8">
                  <p className="font-story text-[clamp(18px,1.65vw,30px)] font-medium leading-[1.24] text-white/95">
                    {typedProfessorLine || "\u00A0"}
                  </p>
                </div>

                {canAdvanceCurrentStep && (
                  <div className="mt-3 flex flex-col items-stretch justify-between gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center">
                    <p className="text-xs font-bold tracking-wide text-white/55 sm:text-sm">
                      {isAutoPlayOn
                        ? "자동 진행 중입니다."
                        : hasCurrentChoices
                        ? "선택 완료. 다음 단계로 이동하세요."
                        : "다음 단계로 이동하세요."}
                    </p>
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsAutoPlayOn((current) => !current);
                        }}
                        className={`flex h-10 items-center justify-center rounded-xl border-2 px-4 text-xs font-black transition-all sm:w-[112px] ${
                          isAutoPlayOn
                            ? "border-[#ff4f81] bg-[#ff4f81] text-white shadow-[0_0_15px_rgba(255,79,129,0.4)]"
                            : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        자동 {isAutoPlayOn ? "ON" : "OFF"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveNextChapter();
                        }}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-xs font-black text-[#1a1a1a] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-[112px]"
                      >
                        다음
                        <span className="text-[10px]">▶</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "screen9_ending" && ending && (
        <section className="relative min-h-screen overflow-hidden bg-[#1b1312]">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url('${ENDING_BACKGROUND_URL}')` }}
          />

          {professorVisualSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={professorVisualSrc}
              alt="엔딩 교수님 이미지2"
              className="absolute bottom-[11vh] left-[43.4%] z-10 h-auto w-[clamp(280px,24vw,460px)] max-w-none -translate-x-1/2 object-contain opacity-[0.96] drop-shadow-[0_20px_28px_rgba(0,0,0,0.28)]"
              draggable={false}
            />
          ) : null}

          {endingOverlayAssetPath ? (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={endingOverlayAssetPath}
                alt="엔딩 전경 오버레이"
                className="absolute bottom-0 right-0 h-auto w-[min(82vw,1380px)] max-w-none object-contain object-right-bottom"
                draggable={false}
              />
            </div>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ backgroundImage: `${DUMMY_DARK_LAYER}, ${DUMMY_SOLID_LAYER}` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0.35),rgba(8,12,20,0.75))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,221,235,0.18),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(255,196,220,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(255,161,196,0.18),transparent_44%)]" />
              <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-8">
                <div className="rounded-[22px] border border-[rgba(255,255,255,0.28)] bg-[linear-gradient(180deg,rgba(39,24,38,0.78),rgba(18,14,22,0.86))] p-6 text-white md:p-8">
                  <p className="text-[clamp(32px,3.6vw,52px)] font-black leading-[1.08] text-white">
                    {ending.title}
                  </p>
                  <p className="mt-4 text-[clamp(18px,1.7vw,28px)] leading-[1.72] text-white/88">
                    {ending.description}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 z-20 h-[24vh] bg-[linear-gradient(180deg,rgba(25,15,11,0),rgba(20,12,10,0.18)_42%,rgba(16,9,8,0.36))]" />

          <div className="pointer-events-none absolute inset-0 z-30">
            <div className="flex min-h-screen items-end justify-end px-4 pb-6 md:px-8 md:pb-8">
              <button
                type="button"
                onClick={() => {
                  void goCreditScreen();
                }}
                className="pointer-events-auto rounded-full border border-white/70 bg-white/92 px-7 py-3 text-lg font-black text-[#25131c] shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:bg-[#fff5fa]"
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}

      {isCreditMessageModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(63,35,50,0.38)] px-4 backdrop-blur-[4px]">
          <div className="w-full max-w-[min(96vw,880px)] rounded-[30px] border border-[#f1bfd3] bg-[linear-gradient(180deg,rgba(255,249,252,0.98),rgba(255,241,246,0.98))] p-6 text-[#4a2033] shadow-[0_30px_80px_rgba(91,40,64,0.22)] md:p-8">
            {creditMessagePromptContext === "professor_generation" ? (
              <>
                <p className="text-[clamp(20px,2.1vw,32px)] font-black leading-[1.2] text-[#5d2340] md:whitespace-nowrap">
                  교수님 이미지가 생성되는 동안
                </p>
                <p className="mt-1 text-[clamp(20px,2.1vw,32px)] font-black leading-[1.2] text-[#5d2340] md:whitespace-nowrap">
                  엔딩 크레딧에 추가되는 응원 문구 작성하실래요?
                </p>
                <p className="mt-3 text-sm leading-[1.7] text-[#7b5364] md:text-base">
                  작성하신 문구와 교수님 상반신 이미지는 엔딩까지 클리어해야 등록돼요! 부족하지만 재밌게 즐겨주세요 ❤️
                </p>
              </>
            ) : (
              <>
                <p className="text-[clamp(20px,2.1vw,32px)] font-black leading-[1.2] text-[#5d2340] md:whitespace-nowrap">
                  응원 문구 등록을 다시 시도할까요?
                </p>
                <p className="mt-1 text-[clamp(20px,2.1vw,32px)] font-black leading-[1.2] text-[#5d2340] md:whitespace-nowrap">
                  저장이 안 되면 크레딧에 표시되지 않아요.
                </p>
                <p className="mt-3 text-sm leading-[1.7] text-[#7b5364] md:text-base">
                  같은 문구를 유지해뒀어요. 다시 등록하거나 건너뛰고 크레딧으로 이동할 수 있어요.
                </p>
              </>
            )}

            <div className="mt-5 rounded-[24px] border border-[#efc8d8] bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <label
                htmlFor="credit-author"
                className="block text-xs font-black tracking-[0.14em] text-[#c65384]"
              >
                크레딧에 표시될 이름
              </label>
              <input
                id="credit-author"
                type="text"
                value={creditMessageAuthorInput}
                onChange={(event) => {
                  setCreditMessageAuthorInput(event.target.value);
                  if (creditMessageError) {
                    setCreditMessageError("");
                  }
                }}
                maxLength={30}
                placeholder="비워두면 익명의 학생으로 등록돼요."
                className="mt-3 h-12 w-full rounded-[16px] border border-[#e9bfd0] bg-white px-4 text-base text-[#4a2033] outline-none transition placeholder:text-[#bc9aaa] focus:border-[#ea7ba6] focus:ring-2 focus:ring-[#f6b9d1]/70"
              />
              <div className="mt-2 flex items-center justify-end text-xs text-[#aa7f90]">
                <span>{creditMessageAuthorInput.trim().length}/30</span>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[#efc8d8] bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <label
                htmlFor="credit-message"
                className="block text-xs font-black tracking-[0.14em] text-[#c65384]"
              >
                응원 문구
              </label>
              <textarea
                id="credit-message"
                value={creditMessageInput}
                onChange={(event) => {
                  setCreditMessageInput(event.target.value);
                  if (creditMessageError) {
                    setCreditMessageError("");
                  }
                }}
                maxLength={80}
                rows={3}
                placeholder="예: 숭멋사 14기 파이팅! 교수님과의 비밀 에피소드도 끝까지 완주해보세요."
                className="mt-3 min-h-[128px] w-full rounded-[18px] border border-[#e9bfd0] bg-white px-4 py-3 text-base leading-[1.6] text-[#4a2033] outline-none transition placeholder:text-[#bc9aaa] focus:border-[#ea7ba6] focus:ring-2 focus:ring-[#f6b9d1]/70"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#aa7f90]">
                <span>{creditMessageAuthorInput.trim() ? `${creditMessageAuthorInput.trim()} 이름으로 등록됩니다.` : ""}</span>
                <span>{creditMessageInput.trim().length}/80</span>
              </div>
            </div>

            {creditMessageError && (
              <p className="mt-3 text-sm font-semibold text-[#c43d74]">{creditMessageError}</p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  void skipCreditMessage();
                }}
                disabled={isSubmittingCreditMessage}
                className="rounded-full border border-[#d7b4c3] bg-white px-6 py-3 text-sm font-black text-[#6a3850] transition hover:bg-[#fff7fa] disabled:cursor-wait disabled:opacity-70"
              >
                다음에 할래요
              </button>
              <button
                type="button"
                onClick={() => {
                  void submitCreditMessage();
                }}
                disabled={isSubmittingCreditMessage}
                className="rounded-full border border-[#e88ab0] bg-[linear-gradient(180deg,#ffd8e8,#ffc4dc)] px-6 py-3 text-sm font-black text-[#5a1937] transition hover:brightness-[1.03] disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmittingCreditMessage ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "screen10_temp" && (
        <section className="relative min-h-screen overflow-hidden bg-[#1b1312]">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: `url('${SCREEN10_BACKGROUND_URL}')` }}
          />

          <div className="absolute inset-x-0 bottom-0 z-20 h-[24vh] bg-[linear-gradient(180deg,rgba(25,15,11,0),rgba(20,12,10,0.18)_42%,rgba(16,9,8,0.36))]" />

          {professorVisualSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={professorVisualSrc}
              alt="교수님 이미지2"
              className="absolute bottom-[11vh] left-[43.4%] z-10 h-auto w-[clamp(280px,24vw,460px)] max-w-none -translate-x-1/2 object-contain opacity-[0.96] drop-shadow-[0_20px_28px_rgba(0,0,0,0.28)]"
              draggable={false}
            />
          ) : (
            <div className="absolute left-4 top-4 z-30 max-w-[min(92vw,420px)] rounded-[22px] border border-white/30 bg-[rgba(29,18,17,0.68)] px-4 py-3 text-sm leading-[1.6] text-white/90 shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-md">
              화면10 임시 배치입니다. 교수님 생성 전이라 현재는 `이미지2` 자리에 들어갈 비주얼이 없어서,
              화면3에서 교수 이미지를 먼저 생성하면 이 자리에 자동으로 들어옵니다.
            </div>
          )}

          <div className="absolute inset-0 z-20 flex items-end justify-center overflow-hidden" aria-hidden="true">
            {/* 화면 전체를 쓰되 오버레이 원본은 잘리지 않도록 contain으로 유지한다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SCREEN10_DESK_URL}
              alt=""
              className="h-full w-full object-contain object-bottom"
              draggable={false}
            />
          </div>

          <div className="absolute left-4 top-4 z-30 rounded-full border border-white/45 bg-[rgba(255,247,242,0.88)] px-4 py-2 text-xs font-black tracking-[0.14em] text-[#6b3a2a] shadow-[0_10px_20px_rgba(0,0,0,0.12)]">
            SCREEN 10 TEMP
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
              style={{ animationDuration: `${creditRollDuration}s` }}
            >
              <div
                className="credit-title-logo mx-auto h-[clamp(280px,42vw,760px)] w-full max-w-[min(98vw,1800px)] bg-center bg-contain bg-no-repeat"
                style={{ backgroundImage: "url('/ui/title-screen/end-logo.webp')" }}
                aria-label="오 나의 교수님! 비밀 에피소드"
                role="img"
              />
              <div className="font-credit">
                <p className="mt-10 text-[clamp(28px,6.5vw,48px)] sm:mt-14">Credit</p>
                <p className="mt-8 text-[clamp(28px,6.5vw,48px)] sm:mt-12">숭멋사 14기</p>
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

              <div className="mt-18 font-credit text-[#ffd8e7]">
                <p className="text-[clamp(24px,5vw,40px)] leading-[1.45]">
                  😭 API비용을 저희 사비로 충당중입니다 😭
                </p>
                <p className="mt-4 text-[clamp(24px,5vw,40px)] leading-[1.45]">
                  재밌게 즐기셨다면 소중한 한 표 부탁드립니다 🙏❤️
                </p>
              </div>

              {creditMessageEntries.length > 0 && (
                <div className="mt-24">
                  <p className="font-credit text-[clamp(26px,5.2vw,44px)] text-[#ffd8e7]">
                    🎊 응원 문구 🎊
                  </p>
                  <div className="mt-10 space-y-8">
                    {creditMessageEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="font-story flex items-center gap-4 rounded-[24px] border border-white/14 bg-white/6 px-5 py-5 shadow-[0_18px_38px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                      >
                        {entry.professor_image_url ? (
                          <div className="h-[128px] w-[88px] shrink-0 overflow-hidden rounded-[18px] border border-white/16 bg-[rgba(255,255,255,0.08)] shadow-[0_12px_24px_rgba(0,0,0,0.18)] sm:h-[156px] sm:w-[108px]">
                            <img
                              src={entry.professor_image_url}
                              alt={`${entry.player_name} 교수 이미지`}
                              className="h-full w-full object-cover object-top"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch text-center">
                          <p className="text-[clamp(20px,3.8vw,34px)] font-medium leading-[1.5] text-white">
                            {entry.message_text}
                          </p>
                          <p className="mt-3 text-sm font-semibold tracking-[0.08em] text-[#ffbfd7]">
                            FROM. {entry.player_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-24">
                <p className="font-credit whitespace-nowrap text-[clamp(22px,4vw,52px)] leading-[1.4] text-[#ffe0ec]">
                  모두 중간고사 잘 보세요 !!
                </p>
                <p className="mt-8 font-credit text-[clamp(34px,7vw,72px)] leading-none tracking-[0.04em] text-[#ffe0ec]">
                  THE END
                </p>
              </div>
            </div>
          </div>

          {isCreditFinished && (
            <div className="credit-touch-guide">
              화면 터치시 메인 화면으로 돌아갑니다
            </div>
          )}
        </section>
      )}

    </main>
  );
}
