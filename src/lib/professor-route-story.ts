export type StoryRole = "narration" | "professor" | "student" | "monologue" | "side_male";

export type StoryLine = {
  role: StoryRole;
  text: string;
  action?: string;
  expression?: string;
};

export type StoryChoice = {
  id: string;
  label: string;
  text: string;
  tone?: string;
  note?: string;
  route_name?: string;
  ending_meaning?: string;
  next_scene?: string;
  next_episode?: string;
};

export type StoryScene = {
  id: string;
  type: "linear" | "choice" | "branch" | "ending_branch";
  prompt?: string;
  note?: string;
  subtitle?: string;
  chapter?: string;
  section_title?: string;
  ending_name?: string;
  stage_direction?: readonly string[];
  lines?: readonly StoryLine[];
  choices?: readonly StoryChoice[];
  next_scene?: string;
  next_episode?: string;
  terminal?: boolean;
};

export type StoryEpisode = {
  id: string;
  title: string;
  location: string;
  subtitle?: string;
  scenes: readonly StoryScene[];
};

export type StoryEndingRankKey =
  | "a_plus_grad_school"
  | "ending_b"
  | "c_plus_retake"
  | "hidden_ending_f";

export type StoryEndingVariant = {
  id: string;
  subtype: string;
  title: string;
  stage_direction?: readonly string[];
  lines: readonly StoryLine[];
};

export type StoryEndingCatalogEntry = {
  title: string;
  variants: readonly StoryEndingVariant[];
};

export const professorRouteStory = {
  id: "professor_route_story",
  format_version: "1.0",
  language: "ko",
  placeholder_rules: {
    student_name: "__",
    professor_name: "__",
  },
  notes: [
    "에피소드마다 선택지는 1회만 존재하지 않을 수 있음.",
    "각 episode 내부에 여러 choice_point가 존재할 수 있음.",
    "실제 이름이 들어갈 부분은 모두 '__'로 비워 둠.",
    "밤 에피소드의 마지막 분기는 엔딩 A/B/C가 아니라 선택지 1/2/3에 직접 대응되도록 수정함.",
  ],
  episodes: [
    {
      id: "ep01_commute",
      title: "등교 에피소드",
      location: "등굣길",
      scenes: [
        {
          id: "ep01_scene01",
          type: "linear",
          lines: [
            {
              role: "narration",
              text: "아침 등굣길, 별생각 없이 걷고 있는데— 저 앞에 익숙한 뒷모습이 보인다. 어느 순간부터 나와 같은 방향으로 걷고 있는 사람. 어? 저분 혹시.",
            },
            {
              role: "narration",
              text: "맞다. 이번 학기 담당 교수님이다. 이렇게 마주치니까 묘하게 낯이 익으면서도 낯설다. 어디선가 본 것 같은 느낌이랄까 — 내가 막연하게 상상해 왔던 그 이미지가 딱 저런 모습이었던 것 같기도 하고. 꿈에서 봤던가?",
            },
            {
              role: "narration",
              text: "뭐, 아무튼. 강의실로 가야 한다.",
            },
          ],
          next_episode: "ep02_morning_classroom",
        },
      ],
    },
    {
      id: "ep02_morning_classroom",
      title: "아침 강의실 에피소드",
      location: "강의실",
      subtitle: "마지막 총정리 수업",
      scenes: [
        {
          id: "ep02_scene01_intro",
          type: "linear",
          stage_direction: [
            "반쯤 열린 창문으로 바람이 들어오고, 교수님이 서류를 정리하며 플레이어를 쳐다봄.",
          ],
          lines: [
            {
              role: "narration",
              text: "터벅터벅... 강의실 문을 열자마자 차가운 에어컨 바람과 함께 교수님의 시선이 내리꽂힌다. 시험 전날의 공기는 평소보다 두 배는 무겁다.",
            },
            {
              role: "professor",
              text: "__, 15분 늦었군. 자네의 성실함이 시험 점수와 반비례하지 않길 빌어야겠어. 어서 앉게, 벌써 중요한 대목을 지나치고 있으니까.",
            },
          ],
          next_scene: "ep02_choice01_late_arrival",
        },
        {
          id: "ep02_choice01_late_arrival",
          type: "choice",
          prompt: "지각 후 반응",
          choices: [
            {
              id: "ep02_c01_opt01",
              label: "선택지 1",
              tone: "MZ식 넉살",
              text: "교수님 수업은 1분 1초가 꿀잼이라, 앞부분 놓친 게 제 인생의 최대 손실입니다.",
              next_scene: "ep02_scene02_after_choice01",
            },
            {
              id: "ep02_c01_opt02",
              label: "선택지 2",
              tone: "정중한 사과",
              text: "죄송합니다. 밤새 복습하다가 깜빡 잠이 들었습니다.",
              next_scene: "ep02_scene03_after_choice02",
            },
            {
              id: "ep02_c01_opt03",
              label: "선택지 3",
              tone: "조용한 회피",
              text: "아무 말 없이 구석 자리로 가서 책을 편다.",
              next_scene: "ep02_scene04_after_choice03",
            },
          ],
        },
        {
          id: "ep02_scene02_after_choice01",
          type: "branch",
          lines: [
            {
              role: "professor",
              text: "자네는 그 말재주로 논술 시험을 치르면 참 좋을 텐데 말이야. 안타깝게도 내 시험은 객관식이라네. 자, 7페이지 보게.",
              expression: "입가에 아주 미세한 경련— 비웃음인지 미소인지 모를 — 이 스친다.",
            },
            {
              role: "narration",
              text: "교수님이 굳이 내 자리까지 걸어와 책 페이지를 넘겨 준다. 손끝이 살짝 스친 것 같은데... 기분 탓인가?",
            },
          ],
          next_scene: "ep02_scene05_end_of_class",
        },
        {
          id: "ep02_scene03_after_choice02",
          type: "branch",
          lines: [
            {
              role: "professor",
              text: "밤샘이라... 노력은 가상하다만, 효율 없는 노력은 학계에서 인정하지 않네. 그래도 얼굴을 보니 거짓말 같진 않군. 여기, 정신 차리고 이거 마시면서 듣게.",
            },
            {
              role: "narration",
              text: "교수님이 교단 위에 있던 새 캔커피를 툭 던져 준다. 차가운 캔에 닿은 손바닥이 갑자기 뜨거워지는 기분이다.",
            },
          ],
          next_scene: "ep02_scene05_end_of_class",
        },
        {
          id: "ep02_scene04_after_choice03",
          type: "branch",
          lines: [
            {
              role: "professor",
              text: "__, 구석으로 숨는다고 내가 못 볼 거라 생각하나? 자네가 거기 앉으면 내 시야의 사각지대가 사라져서 더 잘 보인다네. 자, 그럼 '사각지대'에 앉은 기념으로 질문 하나 하지.",
            },
            {
              role: "narration",
              text: "교수님의 강렬한 눈빛이 나를 향한다. 긴장감 때문에 심장이 필요 이상으로 뛴다.",
            },
          ],
          next_scene: "ep02_scene05_end_of_class",
        },
        {
          id: "ep02_scene05_end_of_class",
          type: "linear",
          stage_direction: ["수업 종료 직전, 교수님이 칠판에 적힌 글씨를 지우며 말함."],
          lines: [
            {
              role: "professor",
              text: "오늘 수업은 여기까지. 내일 시험지는 이미 인쇄실로 넘어갔네. 자네들 중 누군가는 웃으며 나가겠지만, 누군가는 내년에 이 자리에서 나를 다시 보게 되겠지. 난 개인적으로... 후자는 별로 달갑지 않군.",
            },
          ],
          next_scene: "ep02_choice02_wrapup",
        },
        {
          id: "ep02_choice02_wrapup",
          type: "choice",
          prompt: "수업 종료 직전 반응",
          choices: [
            {
              id: "ep02_c02_opt01",
              label: "선택지 1",
              text: "교수님, 그럼 저희 내년엔 강의실 말고 밖에서 뵙는 건가요?",
              next_scene: "ep02_scene06_pen_gift",
            },
            {
              id: "ep02_c02_opt02",
              label: "선택지 2",
              text: "꼭 웃으면서 나가겠습니다. 교수님도 웃으면서 성적 입력해 주세요.",
              next_scene: "ep02_scene06_pen_gift",
            },
          ],
        },
        {
          id: "ep02_scene06_pen_gift",
          type: "linear",
          lines: [
            {
              role: "professor",
              text: "아, __. 나가기 전에 이것 좀 받아 가게. 아까 보니까 볼펜 잉크가 다 됐더군. 시험 보다가 멈추면 곤란할 테니, 내 걸로 빌려주지. 내일 시험 끝나고 연구실로 직접 반납하러 오게.",
              action: "짐을 챙기다 멈칫하며",
            },
            {
              role: "narration",
              text: "교수님이 건네준 펜에는 아직 그의 온기가 남아 있는 것 같다. 단순한 친절일까, 아니면...? 머릿속이 복잡해진 채로 점심을 먹으러 향한다.",
            },
          ],
          next_scene: "ep02_choice03_lunch_destination",
        },
        {
          id: "ep02_choice03_lunch_destination",
          type: "choice",
          prompt: "점심 장소 선택",
          choices: [
            {
              id: "ep02_c03_opt01",
              label: "선택지 1",
              text: "학생 식당",
              next_episode: "ep03_lunch_student_cafeteria",
            },
            {
              id: "ep02_c03_opt02",
              label: "선택지 2",
              text: "학교 앞 식당",
              next_episode: "ep03_lunch_off_campus_restaurant",
            },
            {
              id: "ep02_c03_opt03",
              label: "선택지 3",
              text: "화장실 변기 칸",
              next_episode: "ep03_lunch_bathroom_stall",
            },
          ],
        },
      ],
    },
    {
      id: "ep03_lunch_bathroom_stall",
      title: "점심식사 에피소드 - 화장실 변기 칸",
      location: "학생회관 3층 화장실, 맨 끝 변기 칸",
      scenes: [
        {
          id: "ep03b_scene01_intro",
          type: "linear",
          stage_direction: [
            "어딘가에서 물방울이 '똑... 똑...' 떨어지는 소리가 들리고, 나의 손에는 비닐봉지가 반쯤 벗겨진 참치마요 김밥이 들려 있다.",
          ],
          lines: [
            { role: "narration", text: "고학번의 삶이란 철저한 고독과의 싸움이다. 동기들은 졸업하거나 휴학했고, 후배들의 빛나는 무리에 끼기엔 내 학번이 너무 무겁다." },
            { role: "monologue", text: "그래... 에어컨도 나오고, 조용하고. 나름 VIP 프라이빗 룸이잖아? 비닐 바스락거리는 소리만 조심하면 완벽해." },
            { role: "narration", text: "그때, 달칵— 하는 소리와 함께 누군가 급한 발걸음으로 바로 옆 칸에 들어온다." },
            { role: "side_male", text: "후우... 하마터면 교수 품위 유지에 금이 갈 뻔했군.", expression: "가쁜 숨을 내쉬며" },
            { role: "narration", text: "이 잊을 수 없는 목소리... 분명 오전에 강의를 들었던 __ 교수님이다! 숨소리조차 내면 안 된다. 나는 먹다 만 김밥을 입에 문 채 돌하르방처럼 굳었다." },
            { role: "professor", text: "이런... 맙소사. 휴지가... 똑떨어졌잖아? 저기, 혹시 옆 칸에 누구 있나?", expression: "옷자락 스치는 소리와 함께 정적이 흐른 뒤, 당황한 목소리로" },
            { role: "student", text: "...네.", expression: "최대한 목소리를 깔고 속삭이며" },
            { role: "professor", text: "오, 다행이군! 내가 지금 아주 난처한 상황에 처해서 말인데. 미안하지만 그쪽 휴지 좀 칸막이 밑으로 넘겨줄 수 있겠나?" },
            { role: "narration", text: "나는 소리가 나지 않게 조심조심 휴지를 뜯어 칸막이 아래로 쑥 밀어 넣었다." },
            { role: "professor", text: "정말 고맙네! 자네는 생명의 은인이야. 나중에 내 연구실로 오면 커피라도 한잔... 흠, 킁킁." },
            { role: "professor", text: "그런데 이상하군. 왜 화장실에서 고소한 참기름 냄새가 나는 거지? 자네... 설마 화장실에서 뭘 먹고 있는 건가?!", expression: "코를 킁킁거리며" },
            { role: "student", text: "커헉!!!!!!!!!!!!!!!!!!!!!!!!!!!!" },
            { role: "narration", text: "놀라서 입에 있던 김밥을 삼키다 컥컥거린다." },
            { role: "professor", text: "잠깐, 이 익숙한 기침 소리... 자네 혹시, __ 학생인가? 지금 화장실에서 김밥을 먹고 있는 건가?!" },
          ],
          next_scene: "ep03b_choice01_identity",
        },
        {
          id: "ep03b_choice01_identity",
          type: "choice",
          prompt: "정체를 들켰을 때의 반응",
          choices: [
            { id: "ep03b_c01_opt01", label: "선택지 1", tone: "자포자기 인정", text: "...네, 교수님. 접니다. 참치마요 먹고 있었습니다.", next_scene: "ep03b_scene02_identity_1" },
            { id: "ep03b_c01_opt02", label: "선택지 2", tone: "어설픈 타인 행세", text: "아, 아뇨? 저는 __이 아니라 지나가는 나그네입니다만!", next_scene: "ep03b_scene03_identity_2" },
            { id: "ep03b_c01_opt03", label: "선택지 3", tone: "숨 참고 변기 다이브", text: "아무 대답 없이 숨을 꾹 참고 없는 척한다. 제발 가라, 제발 가라...", next_scene: "ep03b_scene04_identity_3" },
          ],
        },
        {
          id: "ep03b_scene02_identity_1",
          type: "branch",
          lines: [
            { role: "professor", text: "세상에, 진짜 자네였어?! 휴지 틈새로 넘어오는 이 고소한 냄새가 설마 내 제자의 서글픈 점심 식사였단 말인가!" },
            { role: "narration", text: "자포자기하는 심정으로 이마를 짚었다. 차라리 지금 변기 물을 내리고 나도 숨 참고 변기 다이브해서 같이 휩쓸려 떠내려가고 싶다." },
          ],
          next_scene: "ep03b_scene05_sink",
        },
        {
          id: "ep03b_scene03_identity_2",
          type: "branch",
          lines: [
            { role: "professor", text: "허! 자네가 한 학기 내내 지각할 때마다 내던 그 핑계 대는 목소리를 내가 모를 줄 아나? 나그네는 무슨, 당장 남은 김밥 들고 나오게!" },
            { role: "narration", text: "어설픈 연기력은 역시 F학점 감이었다. 문 너머의 변조된 목소리마저 꿰뚫어 보는 교수님의 청력에 경악할 수밖에 없었다." },
          ],
          next_scene: "ep03b_scene05_sink",
        },
        {
          id: "ep03b_scene04_identity_3",
          type: "branch",
          lines: [
            { role: "professor", text: "숨 참아도 소용없네! 자네가 숨을 멈출수록 이 좁은 칸 안에 참기름과 참치 김밥 냄새가 더 진하게 퍼지고 있으니까. 어서 나오게. 내가 문 위로 고개를 내밀어 확인하기 전에." },
            { role: "narration", text: "교수님의 압박 수사에 결국 나는 백기를 들 수밖에 없었다. 숨을 참다가 남은 김밥마저 목에 걸릴 뻔했다. 화장실에서 김밥을 먹다 질식사라... 지금 상황보다 더 나빠질 수 있을까." },
          ],
          next_scene: "ep03b_scene05_sink",
        },
        {
          id: "ep03b_scene05_sink",
          type: "linear",
          stage_direction: ["교수님이 손을 씻고 수건으로 닦으며, 방금 칸에서 기어 나온 나를 애잔하고 처연한 눈빛으로 바라본다."],
          lines: [
            { role: "professor", text: "인터넷에 떠도는 '변기통 혼밥'이라는 게 단순한 도시 괴담인 줄 알았는데... 그걸 내 제자가 몸소 실천하고 있을 줄이야. 고학번이라 같이 밥 먹을 친구가 없는 거라면, 차라리 내 연구실로 오지 그랬나.", action: "한숨을 깊게 내쉬며" },
            { role: "narration", text: "교수님의 눈빛에는 평소의 엄격함 대신 100%의 순수한 '동정'이 서려 있다. 차라리 혼나는 게 나을 정도로 수치스럽다." },
            { role: "professor", text: "당장 그 차갑고 눅눅한 김밥은 쓰레기통에 버리게. 따라와. 정문 앞 '멋쟁이 사지의 스테이크 하우스'로 가지. 내 제자가 변기 옆에서 참치마요를 씹고 있는 걸 본 이상, 그냥 지나치는 건 교육자의 도리가 아니야." },
          ],
          next_scene: "ep03b_choice02_steak",
        },
        {
          id: "ep03b_choice02_steak",
          type: "choice",
          prompt: "스테이크 제안에 대한 반응",
          choices: [
            { id: "ep03b_c02_opt01", label: "선택지 1", tone: "자존심 버리기 + 뻔뻔함", text: "교수님의 참된 가르침(물리)을 기꺼이 받들겠습니다. 사실 스테이크를 먹기 위해 위장을 비워 두는 중이었습니다.", next_scene: "ep03b_scene06_steak_1" },
            { id: "ep03b_c02_opt02", label: "선택지 2", tone: "현실 부정 + 철벽 방어", text: "아닙니다, 교수님! 이건 고독을 즐기는 현대인의 트렌드, '미라클 런치'입니다. 전 정말 괜찮습니다!", next_scene: "ep03b_scene07_steak_2" },
            { id: "ep03b_c02_opt03", label: "선택지 3", tone: "극한의 불쌍함 어필", text: "교수님... 이건 김밥이 아니라 제 서글픈 눈물입니다... 못 본 척해 주십시오...", next_scene: "ep03b_scene08_steak_3" },
          ],
        },
        {
          id: "ep03b_scene06_steak_1",
          type: "branch",
          lines: [
            { role: "professor", text: "허! 방금 전까지 변기통을 붙잡고 있던 녀석 치고는 회복력이 아주 기가 막히군. 그 뻔뻔함이 자네의 가장 큰 무기야. 좋아, 오늘 자네 위장에 한우로 기름칠을 해 주지.", expression: "어이없다는 듯 헛웃음을 터뜨리며" },
            { role: "narration", text: "교수님은 내 손에 들린 김밥을 가차 없이 빼앗아 쓰레기통에 던져 버렸다. 한우라니, 화장실 혼밥이 이렇게 엄청난 나비 효과를 불러올 줄이야. 뜻밖의 개이득이다." },
          ],
          next_scene: "ep03b_scene09_outro",
        },
        {
          id: "ep03b_scene07_steak_2",
          type: "branch",
          lines: [
            { role: "professor", text: "미라클 런치는 무슨. 장염 걸리는 지름길이겠지. 자네의 그 얄팍한 자존심은 변기 물과 함께 내려보내게. 선생이 사 주는 밥 한 끼 얻어먹는 것도 사회생활 연습이야." },
            { role: "narration", text: "교수님이 내 어깨를 꽉 쥐고는 거의 연행하듯 화장실 밖으로 끌고 나간다. 완강한 거절조차 교수님의 폭주하는 동정심을 막을 순 없었다." },
          ],
          next_scene: "ep03b_scene09_outro",
        },
        {
          id: "ep03b_scene08_steak_3",
          type: "branch",
          lines: [
            { role: "professor", text: "그래... 눈물 젖은 김밥을 먹어 보지 않은 자와는 인생을 논하지 말라고 했지. 자네의 고독은 내가 존중해 주겠네. 하지만 오늘만큼은 그 눈물을 한우 육즙으로 씻어내게나.", expression: "갑자기 숙연해진 표정으로 내 어깨를 토닥인다" },
            { role: "narration", text: "교수님의 눈가도 왠지 촉촉해진 것 같다. 어쩌다 보니 우리는 화장실 세면대 앞에서 뜨거운 사제지간의 정을 나누고 있었다." },
          ],
          next_scene: "ep03b_scene09_outro",
        },
        {
          id: "ep03b_scene09_outro",
          type: "linear",
          lines: [
            { role: "narration", text: "식사를 마치고 돌아오는 길, 교수님은 내내 '복학생이 학교에서 살아남는 법'에 대해 열변을 토하셨다. 비록 나의 화장실 VIP 룸은 빼앗겼지만, 뱃속을 든든하게 채워 준 고급 한우와 교수님의 오지랖 덕분에... 당분간 점심시간이 외롭지는 않을 것 같다. 휴지를 빌려준 건, 내 대학 생활 최고의 베팅이었다." },
          ],
          next_episode: "ep04_library",
        },
      ],
    },
    {
      id: "ep03_lunch_student_cafeteria",
      title: "점심식사 에피소드 - 학생 식당",
      location: "학생 식당",
      scenes: [
        {
          id: "ep03c_scene01_intro",
          type: "linear",
          lines: [
            { role: "narration", text: "역시 시험 전날 점심은 혼밥이지. 대충 한 끼 때우고 도서관 가려는데... 내 앞자리에 낯익은 정장 소매가 보인다. 설마." },
            { role: "professor", text: "여긴 늘 붐비는군. __, 앞자리 비어 있나? 자네 식사 속도를 보니 시험 공부하러 마음이 급한 모양이야.", action: "식판을 내려놓으며 자연스럽게" },
          ],
          next_scene: "ep03c_choice01",
        },
        {
          id: "ep03c_choice01",
          type: "choice",
          prompt: "교수와의 합석 반응",
          choices: [
            { id: "ep03c_c01_opt01", label: "선택지 1", tone: "사레들림", text: "커흑! 교, 교수님? 여기서 식사를 하신다고요?", next_scene: "ep03c_scene02_opt01" },
            { id: "ep03c_c01_opt02", label: "선택지 2", tone: "사회적 체면 유지", text: "아, 네! 앉으세요. 교수님도 학식 드시는 줄은 몰랐습니다.", next_scene: "ep03c_scene03_opt02" },
            { id: "ep03c_c01_opt03", label: "선택지 3", tone: "얼어붙음", text: "동작 정지 상태로 교수님의 식판 메뉴를 스캔한다.", next_scene: "ep03c_scene04_opt03" },
          ],
        },
        {
          id: "ep03c_scene02_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "천천히 먹게. 물 마시고. 시험지도 안 넘겼는데 여기서 숨 넘어가면 곤란하지 않겠나.", action: "무심하게 종이컵에 물을 떠서 건네며" },
            { role: "narration", text: "교수님이 직접 떠다 준 물이다. 손가락이 컵에 닿을 때 느껴지는 미지근한 온도가 묘하게 신경 쓰인다." },
          ],
          next_scene: "ep03c_scene05_spoon_drop",
        },
        {
          id: "ep03c_scene03_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "나도 사람인데 밥은 먹어야지. 자네가 먹는 그 돈가스, 오늘따라 바삭해 보이는군. 공부하려면 단백질이 필요할 테니 많이 먹어 두게." },
            { role: "narration", text: "교수님이 내 식판을 보며 희미하게 웃는다. 방금 그 미소, 나만 본 건가?" },
          ],
          next_scene: "ep03c_scene05_spoon_drop",
        },
        {
          id: "ep03c_scene04_opt03",
          type: "branch",
          lines: [
            { role: "professor", text: "분석은 내 식판 말고 자네 전공 책에나 하게나. 식기 전에 얼른 먹어, 머리 쓰려면 혈당 떨어지면 안 되니까.", action: "피식 웃으며 자신의 식판에 있던 요구르트를 내 쪽으로 슥 밀어준다" },
            { role: "narration", text: "교수님이 직접 건넨 요구르트의 매끈한 감촉이 손바닥에 닿자, 방금까지 스캔하던 식판 메뉴보다 내 심장 박동 소리가 더 선명하게 들리기 시작한다." },
          ],
          next_scene: "ep03c_scene05_spoon_drop",
        },
        {
          id: "ep03c_scene05_spoon_drop",
          type: "linear",
          stage_direction: ["긴장한 탓에 젓가락질을 서두르다 툭— 숟가락을 바닥에 떨어뜨림."],
          lines: [
            { role: "student", text: "아... 망했다." },
            { role: "narration", text: "허리를 숙여 숟가락을 잡으려는 찰나, 교수님이 더 빠르게 움직인다." },
            { role: "professor", text: "손이 떨리는 건가, 아니면 내가 그렇게 불편한 건가? 시험 전엔 멘탈 관리가 제일 중요하다네. 수저 정도야 다시 들면 그만이지.", action: "바닥에서 새 수저를 가져와 내 식판 위에 놓아주며" },
          ],
          next_scene: "ep03c_choice02",
        },
        {
          id: "ep03c_choice02",
          type: "choice",
          prompt: "수저를 받은 뒤 반응",
          choices: [
            { id: "ep03c_c02_opt01", label: "선택지 1", text: "감사합니다... 근데 교수님, 방금 좀 머릿속에 '슬로우 모션' 걸린 것 같아요.", next_scene: "ep03c_scene06_outro" },
            { id: "ep03c_c02_opt02", label: "선택지 2", text: "떨어진 건 수저인데, 왜 제 심장이 바닥에 있는 것 같죠?", note: "넉살", next_scene: "ep03c_scene06_outro" },
          ],
        },
        {
          id: "ep03c_scene06_outro",
          type: "linear",
          lines: [
            { role: "professor", text: "먼저 일어나지. 아, __. 입가에 소스 묻었네. 칠칠치 못하게... 내일 시험지에 답안도 그렇게 묻히고 나오지 말게나.", action: "먼저 일어나며" },
            { role: "narration", text: "교수님이 자기 손수건을 꺼내려다 멈칫하더니, 대신 휴지 한 장을 툭 뽑아 내 식판 옆에 둔다. 그리곤 뒤도 안 돌아보고 식당을 나간다." },
            { role: "narration", text: "남겨진 휴지를 보니 왠지 모르게 밥맛이 더 좋아진 것 같다. 이제 정신 차리고 중앙도서관으로 가야 한다." },
          ],
          next_episode: "ep04_library",
        },
      ],
    },
    {
      id: "ep03_lunch_off_campus_restaurant",
      title: "점심식사 에피소드 - 학교 앞 식당",
      location: "학교 앞 식당",
      scenes: [
        {
          id: "ep03r_scene01_intro",
          type: "linear",
          stage_direction: ["문에 달린 작은 종이 딸랑— 하고 울린다."],
          lines: [
            { role: "narration", text: "학식은 오늘따라 줄이 너무 길어서, 조용히 밥이나 먹으러 학교 앞 한식당으로 왔다. 시험 전날이니 빠르게 먹고 공부를 할 계획." },
            { role: "narration", text: "문 쪽에서 시선을 느껴 고개를 든다. 입구에 서서 실내를 훑어보던 눈과, 내 눈이 정확하게 마주친다." },
            { role: "professor", text: "__. 학식 줄이 길었나? 나도 오늘은 그쪽이 내키지 않아서.", action: "잠깐 멈칫하더니, 별일 아니라는 듯 자연스럽게 걸어오며" },
            { role: "narration", text: "자리가 여러 개 비어 있는데도, 교수님의 손이 내 맞은편 의자를 가볍게 당긴다." },
            { role: "professor", text: "1인 테이블이 없는데. 합석해도 되겠나." },
          ],
          next_scene: "ep03r_choice01",
        },
        {
          id: "ep03r_choice01",
          type: "choice",
          prompt: "합석 제안에 대한 반응",
          choices: [
            { id: "ep03r_c01_opt01", label: "선택지 1", tone: "당황", text: "아, 네! 그, 그럼요. 앉으세요. 메뉴는... 메뉴 다 괜찮아요!", next_scene: "ep03r_scene02_opt01" },
            { id: "ep03r_c01_opt02", label: "선택지 2", tone: "침착", text: "물론이죠. 교수님도 여기 오세요? 저는 처음이라서요.", next_scene: "ep03r_scene03_opt02" },
            { id: "ep03r_c01_opt03", label: "선택지 3", tone: "굳음", text: "메뉴판 뒤에서, 아직 결정 못 한 척 눈동자만 굴린다.", next_scene: "ep03r_scene04_opt03" },
          ],
        },
        {
          id: "ep03r_scene02_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "메뉴가 다 괜찮다는 건 아무거나 먹어도 된다는 말인가, 아직 못 정했다는 말인가.", action: "자리에 앉으며 메뉴판을 집어 들고" },
            { role: "professor", text: "여기 김치찌개가 무난하네. 나는 늘 그걸로 하는 편이야." },
            { role: "narration", text: "메뉴 추천인지 그냥 하는 말인지 모르겠는데, 나는 어느새 김치찌개 쪽으로 손가락이 향하고 있다." },
          ],
          next_scene: "ep03r_scene05_meal",
        },
        {
          id: "ep03r_scene03_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "가끔 오지. 학식이 번잡스러울 때." },
            { role: "professor", text: "단골이라고 할 만큼은 아니지만... 사장님이 얼굴은 기억하시더군." },
            { role: "narration", text: "별 뜻 없는 말인데, 교수님의 '가끔'이 얼마나 자주인지 왠지 궁금해진다." },
          ],
          next_scene: "ep03r_scene05_meal",
        },
        {
          id: "ep03r_scene04_opt03",
          type: "branch",
          lines: [
            { role: "professor", text: "그 메뉴판, 아까부터 같은 페이지 펴고 있더군. 결정 장애인가, 내가 갑자기 나타나서 그런 건가.", action: "피식 웃으며 조용히 메뉴판 하나를 내 앞으로 밀어주며" },
            { role: "professor", text: "천천히 골라도 되네." },
            { role: "narration", text: "교수님이 아무렇지 않게 말을 잇는데, 나는 메뉴판 뒤에서 표정 관리에 실패하고 있는 것 같다." },
          ],
          next_scene: "ep03r_scene05_meal",
        },
        {
          id: "ep03r_scene05_meal",
          type: "linear",
          stage_direction: ["음식이 나오고, 두 사람 사이에 조용한 시간이 흐른다.", "창밖으로 캠퍼스 쪽 학생들이 오가는 게 보인다."],
          lines: [
            { role: "narration", text: "교수님과 마주 앉아 밥을 먹는다는 게 이런 느낌인지 몰랐다. 숟가락 소리도 조심하게 되고, 씹는 속도도 괜히 신경 쓰이고. 그냥 밥인데, 밥이 아닌 것 같다." },
            { role: "narration", text: "별다른 대화 없이 식사가 끝나간다. 교수님은 그게 전혀 어색하지 않은 사람처럼, 창밖을 조용히 바라보고 있다." },
          ],
          next_scene: "ep03r_scene06_outro",
        },
        {
          id: "ep03r_scene06_outro",
          type: "linear",
          lines: [
            { role: "narration", text: "교수님이 먼저 자리에서 일어나며 자연스럽게 계산대 쪽으로 걷는다." },
            { role: "narration", text: "정신없이 짐을 챙긴다. 나도 얼른 지갑을 꺼내려는데—" },
            { role: "narration", text: "교수님이 이미 두 사람 몫의 금액을 내고 있다." },
            { role: "student", text: "교수님, 제 것은 제가—" },
            { role: "professor", text: "됐어. 오늘 내가 불쑥 합석한 거니까." },
            { role: "narration", text: "그 한마디로 끝이었다. 이유도, 설명도 그게 전부였다." },
            { role: "professor", text: "내일 시험, 잘 보게.", action: "문을 열며, 뒤도 안 돌아보고" },
            { role: "narration", text: "딸랑— 문이 닫힌다. 계산대 앞 사장님이 나를 보며 빙긋 웃으신다." },
            { role: "narration", text: "밥값을 내려고 꺼낸 지갑을 멍하니 쥔 채, 한동안 자리에서 일어나지 못했다." },
            { role: "narration", text: "\"합석한 거니까\"— 그 말이, 이상하게 자꾸 머릿속에서 재생된다." },
            { role: "narration", text: "이제 도서관 가야 하는데. 머릿속에 아무 생각도 들지 않는다." },
          ],
          next_episode: "ep04_library",
        },
      ],
    },
    {
      id: "ep04_library",
      title: "오후 도서관 에피소드",
      location: "도서관",
      subtitle: "조용한 열람실, 창가 자리",
      scenes: [
        {
          id: "ep04_scene01_intro",
          type: "linear",
          lines: [
            { role: "narration", text: "밥도 먹었겠다, 이제 진짜 집중할 시간이다. 시험은 내일. 오늘 오후만 제대로 잡으면 돼." },
            { role: "narration", text: "……근데 왜 교재가 눈에 안 들어오지." },
            { role: "narration", text: "아까 강의실에서 받은 펜이 자꾸 눈에 밟힌다. 별거 아니잖아. 그냥 볼펜이잖아. 잉크 다 됐길래 빌려준 거잖아. 연구실로 반납하러 오라고 했는데 그게 무슨—" },
            { role: "narration", text: "아, 집중하자. 집중." },
            { role: "narration", text: "……. 교수님 오후 수업 있으신가?" },
            { role: "narration", text: "아니, 이게 지금 왜 나와. 나 괜찮은 거 맞지?" },
          ],
          next_scene: "ep04_scene02_stacks",
        },
        {
          id: "ep04_scene02_stacks",
          type: "linear",
          stage_direction: ["열람실을 가득 채운 학생들. 페이지를 넘기는 소리, 키보드 소리. 나만 멍하니 교재를 바라보고 있다."],
          lines: [
            { role: "narration", text: "……아 진짜 왜 이래, 나." },
            { role: "narration", text: "교재 3단원. 펼쳤다. 읽는다. 읽고 있다. 읽고는 있는데 무슨 내용인지 하나도 모르겠다." },
            { role: "narration", text: "가만히 앉아 있으면 안 되겠다. 몸이라도 움직이자. 참고 도서 하나 찾아보고 오면 머리가 좀 리셋되겠지." },
          ],
          next_scene: "ep04_scene03_meet_professor",
        },
        {
          id: "ep04_scene03_meet_professor",
          type: "linear",
          stage_direction: ["서가 사이를 걷다가, 코너를 도는 순간— 익숙한 뒷모습."],
          lines: [
            { role: "narration", text: "아니." },
            { role: "narration", text: "설마." },
            { role: "professor", text: "... __. 여기도 오나?", action: "서가에서 책을 훑어보다가, 인기척을 느끼고 고개를 돌리며" },
          ],
          next_scene: "ep04_choice01",
        },
        {
          id: "ep04_choice01",
          type: "choice",
          prompt: "서가에서 교수와 마주쳤을 때 반응",
          choices: [
            { id: "ep04_c01_opt01", label: "선택지 1", tone: "당황", text: "아— 네, 저도... 참고 도서 좀 찾으러요.", note: "허둥지둥 책을 줍는다.", next_scene: "ep04_scene04_opt01" },
            { id: "ep04_c01_opt02", label: "선택지 2", tone: "침착한 척", text: "네. 교수님은 논문 자료 찾으세요?", next_scene: "ep04_scene05_opt02" },
            { id: "ep04_c01_opt03", label: "선택지 3", tone: "도망치려다 눈 마주침", text: "반사적으로 뒤돌려는 순간, 교수님과 눈이 마주쳐 버렸다.", next_scene: "ep04_scene06_opt03" },
          ],
        },
        {
          id: "ep04_scene04_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "참고 도서치고는 전공이랑 좀 거리가 있는데. 시험 전날 현실 도피인가?", action: "떨어진 책을 먼저 집어 표지를 보며" },
            { role: "professor", text: "뭐, 기분 전환도 공부의 일부라고 우기면 할 말은 없지만.", action: "책을 내밀며" },
            { role: "narration", text: "교수님 손에서 책을 받아 드는데, 아까 펜 받을 때랑 똑같은 각도다. 왜 자꾸 이런 걸 계산하고 있지, 나는." },
          ],
          next_scene: "ep04_scene07_shelf_talk",
        },
        {
          id: "ep04_scene05_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "그렇네. 학기 말마다 오는 코스야. 조용하고 자료도 있고." },
            { role: "professor", text: "자네 전공이면 이거 도움 될 거야. 시험 범위랑 겹치는 부분 있으니까 훑어보게.", action: "책 하나를 꺼내 훑어보다가 내 쪽으로 건네며" },
            { role: "narration", text: "교수님이 아무렇지 않게 책을 건네는데, 이게 그냥 지나가는 말인지 진심인지 도통 구분이 안 된다." },
          ],
          next_scene: "ep04_scene07_shelf_talk",
        },
        {
          id: "ep04_scene06_opt03",
          type: "branch",
          lines: [
            { role: "professor", text: "도망가려 했나? 나한테서.", action: "피식 웃으며" },
            { role: "professor", text: "도서관까지 피해 다닐 건 없어. 나도 볼일 있어서 온 거니까. 자네는 자네 책 찾게." },
            { role: "narration", text: "도망치려 했다는 걸 들켰다. 근데 교수님은 왜 저렇게 태연하지. 나만 이상한 건가." },
          ],
          next_scene: "ep04_scene07_shelf_talk",
        },
        {
          id: "ep04_scene07_shelf_talk",
          type: "linear",
          stage_direction: ["서가 사이, 두 사람이 나란히 책을 보는 어색한 정적."],
          lines: [
            { role: "professor", text: "학기 말 도서관은 항상 이 모양이군. 시험 전날만 되면 다들 여기 와서 후회하지.", action: "책 한 권을 빼며 독백하듯" },
          ],
          next_scene: "ep04_choice02",
        },
        {
          id: "ep04_choice02",
          type: "choice",
          prompt: "교수의 독백에 대한 반응",
          choices: [
            { id: "ep04_c02_opt01", label: "선택지 1", text: "저는 후회 안 하려고 지금 여기 있는 겁니다.", next_scene: "ep04_scene08_opt01" },
            { id: "ep04_c02_opt02", label: "선택지 2", text: "교수님은 시험 전날 뭐 하셨어요, 학생 때.", next_scene: "ep04_scene09_opt02" },
          ],
        },
        {
          id: "ep04_scene08_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "후회 안 하려면 지금 여기서 나랑 얘기할 시간에 열람실 가서 한 줄 더 보는 게 맞지 않나." },
            { role: "professor", text: "뭐, 그래도 왔으니까." },
            { role: "narration", text: "핀잔인데 왜 기분이 나쁘지 않지." },
          ],
          next_scene: "ep04_scene10_outro",
        },
        {
          id: "ep04_scene09_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "나? ……도서관 왔었지. 자네랑 별 다를 것 없어." },
            { role: "professor", text: "그때도 시험 전날 딴생각이 더 잘 됐거든. 사람 다 똑같아." },
            { role: "narration", text: "교수님도 딴생각을 했다고 했다. 그 딴생각이 뭔지 물어보고 싶었지만, 꾹 참았다." },
          ],
          next_scene: "ep04_scene10_outro",
        },
        {
          id: "ep04_scene10_outro",
          type: "linear",
          lines: [
            { role: "professor", text: "학생, 오늘 오후 남았다. 아직 늦지 않았으니까 열람실 가서 제대로 보게.", action: "필요한 책을 챙기며 서가를 벗어나려다 멈추고" },
            { role: "professor", text: "내일 시험지에서 자네 이름 보면, 나는 기대를 하고 펼치거든. 그 기대 저버리지 말고." },
            { role: "narration", text: "교수님이 서가 코너를 돌아 사라진다. 손에는 아까 교수님이 건네준 참고 도서가 들려 있다." },
            { role: "narration", text: "도서관에 온 게 기분 전환이라고 했는데, 오히려 더 심란해진 것 같다. 이게 기대인지 압박인지— 근데 묘하게, 둘 다인 것 같아서 더 문제다." },
            { role: "narration", text: "자리로 돌아가 가방을 챙긴다. 공부는 충분히 했다. 아마도. 이제 밥이라도 먹어야 머리가 돌아갈 것 같다. 오늘 하루 너무 많은 걸 담은 것 같은 복잡한 마음으로, 저녁을 먹으러 향한다." },
          ],
          next_episode: "ep05_simple_dinner",
        },
      ],
    },
    {
      id: "ep05_simple_dinner",
      title: "간단한 저녁식사 에피소드",
      location: "편의점",
      scenes: [
        {
          id: "ep05_scene01",
          type: "linear",
          lines: [
            { role: "narration", text: "복잡한 마음을 뒤로하고 편의점에서 간단히 저녁을 먹었다. 내일이 시험이라니, 심란하다. 저녁 식사를 마치고 어느 쪽으로 갈까 고민이 된다." },
            { role: "narration", text: "어떻게 할까." },
          ],
          next_scene: "ep05_choice01",
        },
        {
          id: "ep05_choice01",
          type: "choice",
          prompt: "저녁 식사 후 이동",
          choices: [
            { id: "ep05_c01_opt01", label: "선택지 1", text: "집으로 가서 공부를 한다.", next_episode: "ep06_night_professor_office" },
            { id: "ep05_c01_opt02", label: "선택지 2", text: "빈 강의실에 가서 공부를 한다.", next_episode: "ep06_night_classroom" },
            { id: "ep05_c01_opt03", label: "선택지 3", text: "학교 벤치에 앉아 생각을 정리한다.", next_episode: "ep06_night_bench" },
          ],
        },
      ],
    },
    {
      id: "ep06_night_professor_office",
      title: "밤 에피소드 - 교수 연구실",
      location: "교수 연구실",
      scenes: [
        {
          id: "ep06o_scene01_intro",
          type: "linear",
          chapter: "저녁 시간 - 연구실의 불빛",
          stage_direction: [],
          lines: [
            { role: "narration", text: "저녁을 먹고 나오니 이미 사방은 어둑해졌다. 시험 전날의 캠퍼스는 평소보다 훨씬 고요했고, 그 고요함은 내 어깨를 더 무겁게 눌렀다. 집으로 향하려던 발걸음이 문득, 익숙한 창문 앞에서 멈췄다." },
            { role: "monologue", text: "교수님... 아직 안 가셨네. 불이 켜져 있어." },
          ],
          next_scene: "ep06o_choice01",
        },
        {
          id: "ep06o_choice01",
          type: "choice",
          prompt: "연구실 불빛을 보고 난 뒤 선택",
          choices: [
            { id: "ep06o_c01_opt01", label: "선택지 1", tone: "보은의 사막", text: "오늘 하루 교수님께 신세만 졌잖아. 가볍게 감사 인사라도 드리고 가자.", route_name: "정공법", next_scene: "ep06o_scene02_route_a" },
            { id: "ep06o_c01_opt02", label: "선택지 2", tone: "칼퇴의 유혹", text: "교수님은 교수님이고, 나는 나다. 시험 전날엔 1분 1초가 아깝지. 얼른 집에 가서 족보나 한 번 더 보자.", route_name: "우회로", next_scene: "ep06o_scene03_route_b" },
          ],
        },
        {
          id: "ep06o_scene02_route_a",
          type: "branch",
          lines: [
            { role: "narration", text: "나는 결연한 의지로 교수 연구실이 있는 4층으로 향했다. 복도 끝, 그분의 문앞에 서자 긴장감에 마른침이 넘어갔다." },
          ],
          stage_direction: [],
          next_scene: "ep06o_scene04_common_office",
        },
        {
          id: "ep06o_scene03_route_b",
          type: "branch",
          lines: [
            { role: "narration", text: "자고로 스승과 제자의 거리는 멀수록 좋은 법. 나는 뒤도 돌아보지 않고 정문을 향해 전속력으로 달렸다. 하지만, 하늘은 내 칼퇴를 허락하지 않았다." },
            { role: "student", text: "으악! 뭐야, 갑자기! 일기예보엔 비 없었잖아!" },
            { role: "narration", text: "우산도 없는데 이 비를 맞고 가는 건 자살 행위다. 나는 어쩔 수 없이 다시 건물 안으로 피신했다. 물에 빠진 생쥐 꼴로 옷을 털고 있는데, 엘리베이터 문이 열리며 교수님이 걸어 나오셨다." },
            { role: "professor", text: "아니, 자네는 왜 아직도 학교에... 꼴을 보니 우산도 없는 모양이군. 이 장대비에 가긴 어디 가겠나. 일단 올라가세. 내 연구실에 여분의 우산이 있을 테니." },
            { role: "narration", text: "결국, 나는 운명의 데스티니에 이끌려 교수님의 뒤를 따라 연구실로 향하게 되었다." },
          ],
          stage_direction: [],
          next_scene: "ep06o_scene04_common_office",
        },
        {
          id: "ep06o_scene04_common_office",
          type: "linear",
          section_title: "공통: 교수 연구실 안",
          stage_direction: ["육중한 나무 문이 열리고, 교수 연구실 내부가 드러난다.", "화면 전반에 은은한 주황빛 조명이 감돌고, 고급스러운 시더우드 향과 오래된 책 냄새가 섞인 매혹적인 향기가 코를 찌른다.", "벽면은 온통 책으로 가득 차 있고, 한쪽에는 작은 에스프레소 머신이 혀를 내밀고 있다."],
          lines: [
            { role: "narration", text: "교수님의 연구실에 들어선 것은 처음이었다. 화장실에서의 그 처량했던 모습과는 딴판으로, 이곳은 마치 고급 세단 내부처럼 깔끔하고 지적인 품격이 넘쳐흐르는 공간이었다. 그리고... 정말 좋은 향기가 났다." },
            { role: "monologue", text: "와... 교수님 냄새... 아니, 연구실 냄새 정말 좋다. 이 냄새만 맡아도 IQ가 올라갈 것 같아." },
            { role: "professor", text: "자, 앉게. 물기부터 좀 닦고. 커피라도 한잔할 텐가? 아, 시험 전날이라 밤새야 하니 카페인은 필수겠군." },
            { role: "narration", text: "교수님은 익숙한 솜씨로 에스프레소 머신을 작동시켰다. 연구실 가득 고소한 커피 향이 시더우드 향과 섞이며 더욱 로맨틱한(?) 분위기를 만들어냈다." },
            { role: "professor", text: "그런데, 자네... 내일 시험공부는 다 했나? 화장실에서 김밥 씹을 시간이 있었으면, 책을 한 줄이라도 더 봤어야지." },
            { role: "student", text: "으윽... 그 이야기는 제발...! 나름대로 열심히는 했는데, 교수님 과목은 워낙 난이도가 악랄해서... 아니, 극악해서... 아니, 고차원적이라서 겁이 납니다." },
            { role: "professor", text: "악랄하다니, 칭찬으로 듣지. 하긴, 내 시험이 좀 변별력이 높긴 하지. 자, 고생하는 제자를 위해 이 교수님이 특별히 '내일 시험에 절대 안 나오는 단원'을 집어주지." },
            { role: "student", text: "정말요?! 어디인가요?!" },
            { role: "professor", text: "1단원부터 7단원까지." },
            { role: "student", text: "...예?" },
            { role: "professor", text: "전부 다 나오니까, 안 나오는 곳은 없네. 헛된 희망을 품지 말고 골고루 공부하라는 이 스승의 깊은 뜻을 알겠나?" },
            { role: "narration", text: "순간, 쥐고 있던 에스프레소 잔을 떨어뜨릴 뻔했다. 이 교수님, 은근히 사람을 들었다 놨다 하는 재주가 있다. 웃어야 할지 울어야 할지 모르는 상황에서 우리는 커피를 마시며 이런저런 대학 생활 이야기를 나누었다." },
          ],
          next_scene: "ep06o_scene05_umbrella",
        },
        {
          id: "ep06o_scene05_umbrella",
          type: "linear",
          stage_direction: ["창밖의 빗소리가 조금 가늘어지고, 시계는 9시를 가리킨다."],
          lines: [
            { role: "professor", text: "벌써 시간이 이렇게 됐군. 자네도 이제 집에 가서 마무리 공부를 해야겠어." },
            { role: "narration", text: "나는 자리에서 일어나 예의 바르게 인사를 드렸다. 오늘 하루, 화장실에서 한우, 그리고 연구실 커피까지. 교수님의 새로운 면모를 너무 많이 본 것 같다." },
            { role: "student", text: "오늘 정말 감사합니다, 교수님. 도서관에서, 커피에... 그리고 시험에 대한 악랄한... 아니, 깊은 조언까지요." },
            { role: "professor", text: "__ 학생.", action: "짐을 챙기다 멈칫하며, 나를 가만히 바라본다. 평소의 장난기 어린 눈빛이 아닌, 조금은 낮고 진지한 목소리로" },
            { role: "narration", text: "그가 처음으로 내 이름을 불렀다. 단순히 학생이 아닌, 한 명의 존재로 인정받는 듯한 기분. 그 찰나의 순간, 연구실의 공기가 갑자기 뜨거워진 것 같았다." },
            { role: "professor", text: "내일 시험, 자네가 노력한 만큼의 결과가 나오길 바라네. 너무 긴장하지 말고. 자, 우산 받아가게." },
            { role: "narration", text: "교수님이 건네준 고급 장우산을 받아 들고 연구실을 나섰다. 손잡이에 남은 그의 온기와 연구실의 향기가 가슴 속에 오래도록 맴돌았다. 내일은 또 어떤 일이 기다리고 있을까? 이제 모든 것은 결전의 시험 강의실에서 달렸다." },
          ],
          terminal: true,
        },
      ],
    },
    {
      id: "ep06_night_bench",
      title: "밤 에피소드 - 학교 벤치",
      location: "인문대 뒤편 벤치",
      scenes: [
        {
          id: "ep06b_scene01_intro",
          type: "linear",
          stage_direction: [],
          lines: [
            { role: "narration", text: "도서관에서 나오니 벌써 해가 졌다. 머리도 식힐 겸 걷는데, 늘 그 자리에 있는 벤치에 교수님이 앉아 계신다. 밤에 보는 교수님은 강의실에서보다 조금 더... 사람 냄새가 난다." },
            { role: "professor", text: "이 시간에 여기서 자네를 다 보군. __, 공부하다 막히는 거라도 있나? 얼굴에 '고민'이라고 쓰여 있는데.", action: "고개를 들며" },
          ],
          next_scene: "ep06b_choice01",
        },
        {
          id: "ep06b_choice01",
          type: "choice",
          prompt: "벤치에서 고민을 털어놓기",
          choices: [
            { id: "ep06b_c01_opt01", label: "선택지 1", tone: "진지한 상담", text: "사실... 제가 이 길(전공)이 맞는지 갑자기 확신이 안 서서요.", next_scene: "ep06b_scene02_opt01" },
            { id: "ep06b_c01_opt02", label: "선택지 2", tone: "깜짝 고백", text: "교수님, 사실 저... 교수님 때문에 이 학과 선택한 거거든요.", next_scene: "ep06b_scene03_opt02" },
            { id: "ep06b_c01_opt03", label: "선택지 3", tone: "감성 폭발", text: "시험도 시험인데, 교수님이 너무 완벽하셔서 자괴감이 좀 드네요.", next_scene: "ep06b_scene04_opt03" },
          ],
        },
        {
          id: "ep06b_scene02_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "확신이라... 그건 나도 아직 매일 고민하는 문제라네. 하지만 __, 자네가 지난 학기에 낸 레포트의 그 문장들... 난 자네가 이 길에 소질이 있다고 꽤 확신하고 있었어." },
            { role: "narration", text: "교수님이 내 이름을 부른 것도 모자라, 내 레포트 내용까지 기억하고 있다. 가슴 한구석이 찌릿하다." },
          ],
          next_scene: "ep06b_scene05_emotion",
        },
        {
          id: "ep06b_scene03_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "나 때문에? 허... 자네 인생을 나 같은 사람한테 배팅하다니, 무모한 건가 아니면 용감한 건가. 그래도 기분은 나쁘지 않군. 책임감이 좀 더 생기는걸.", action: "잠시 멈칫하다가 낮게 웃으며" },
            { role: "narration", text: "가로등 불빛 때문인지, 교수님의 미소가 평소보다 훨씬 부드러워 보인다. 심박수가 위험 수치다." },
          ],
          next_scene: "ep06b_scene05_emotion",
        },
        {
          id: "ep06b_scene04_opt03",
          type: "branch",
          lines: [
            { role: "professor", text: "완벽이라... 자네 눈에는 내가 그렇게 보이나? 사실 나도 자네 학점 채점할 때마다 '완벽하게' 잠을 설친다네. 자괴감 가질 시간 있으면 그 감성을 답안지 서술형에나 쏟게나.", action: "가로등 불빛 아래서 잠시 침묵하다가 안경을 지그시 누르며" },
            { role: "narration", text: "무심한 듯 툭 내뱉은 농담 섞인 위로가 밤공기를 타고 가슴에 박히자, 교수님의 완벽함보다 나를 지켜보고 있었다는 그 다정함이 더 아프게 설레기 시작한다." },
          ],
          next_scene: "ep06b_scene05_emotion",
        },
        {
          id: "ep06b_scene05_emotion",
          type: "linear",
          stage_direction: ["상담을 이어가다 미래에 대한 불안감에 플레이어의 목소리가 떨리고 눈시울이 붉어짐."],
          lines: [
            { role: "student", text: "그냥... 잘하고 싶은데 마음처럼 안 돼서 울컥하네요. 죄송합니다, 교수님 앞에서..." },
            { role: "narration", text: "당황해서 고개를 숙이는데, 옆자리에 묵직한 무게감이 느껴진다. 교수님이 말없이 자리를 옮겨 내 옆에 앉는다." },
            { role: "professor", text: "울어도 되네. 여긴 강의실이 아니니까. 자네가 얼마나 애쓰고 있는지... 내가 다 보고 있었어. __, 자네는 생각보다 훨씬 더 잘하고 있어. 내 이름 걸고 보증하지.", action: "일정한 거리를 유지한 채, 하지만 곁을 내주며" },
          ],
          next_scene: "ep06b_choice02",
        },
        {
          id: "ep06b_choice02",
          type: "choice",
          prompt: "위로를 들은 뒤의 반응",
          choices: [
            { id: "ep06b_c02_opt01", label: "선택지 1", text: "교수님이 보증하시면... 저 진짜 믿어도 되는 거죠?", next_scene: "ep06b_scene06_outro" },
            { id: "ep06b_c02_opt02", label: "선택지 2", text: "교수님 옆자리가 생각보다 따뜻하네요. 조금만 더 이러고 있어도 될까요?", next_scene: "ep06b_scene06_outro" },
          ],
        },
        {
          id: "ep06b_scene06_outro",
          type: "linear",
          lines: [
            { role: "professor", text: "밤 공기가 차군. 감기 걸리면 내일 시험에 지장 생기니 얼른 들어가게. 그리고... 아까 말한 거, 진심이야. 내일 시험지에서 자네의 그 '열정'을 보여 주길 기대하겠네.", action: "천천히 일어나며 내 어깨를 아주 짧게 툭, 치고 지나간다" },
            { role: "narration", text: "교수님이 멀어지는 뒷모습을 보며 깨달았다. 나, 생각보다 훨씬 더 이 사람을..." },
            { role: "narration", text: "자, 이제 감상은 끝이다. 내일 시험을 망치면 이 모든 아련함이 수치심으로 바뀔 테니까! 마지막 결전지인 시험 강의실로 갈 준비를 하자." },
          ],
          terminal: true,
        },
      ],
    },
    {
      id: "ep06_night_classroom",
      title: "밤 에피소드 - 강의실",
      location: "강의실",
      scenes: [
        {
          id: "ep06c_scene01_intro",
          type: "linear",
          stage_direction: [],
          lines: [
            { role: "monologue", text: "……어둡다. 여기가 어디지." },
            { role: "narration", text: "천장을 보니 강의실이다. 창밖은 완전히 깜깜하고, 복도 불빛만 문틈으로 가늘게 새어 들어온다. 얼마나 잔 거지. 시험이 내일인데—" },
            { role: "narration", text: "그때. 인기척." },
          ],
          next_scene: "ep06c_scene02_professor_enters",
        },
        {
          id: "ep06c_scene02_professor_enters",
          type: "linear",
          stage_direction: ["문이 천천히 열리고, 복도 불빛을 등진 실루엣.", "코트를 입은 익숙한 윤곽."],
          lines: [
            { role: "professor", text: "……자고 있었군.", action: "강의실 안을 확인하다가, 엎드려 있는 나를 발견하고 걸음을 멈추며" },
            { role: "narration", text: "잠결에 들리는 목소리치고는, 너무 낮고 선명하다." },
          ],
          next_scene: "ep06c_choice01",
        },
        {
          id: "ep06c_choice01",
          type: "choice",
          prompt: "늦은 밤 강의실에서 깬 뒤 반응",
          choices: [
            { id: "ep06c_c01_opt01", label: "선택지 1", tone: "멍한 상태", text: "……교수님? 지금 몇 시예요.", next_scene: "ep06c_scene03_opt01" },
            { id: "ep06c_c01_opt02", label: "선택지 2", tone: "번쩍 일어남", text: "아— 죄송합니다! 잠깐만 눈 붙이려고 했는데 그만—", next_scene: "ep06c_scene04_opt02" },
            { id: "ep06c_c01_opt03", label: "선택지 3", tone: "아직 꿈인 줄 앎", text: "……교수님이 왜 여기 계세요.", next_scene: "ep06c_scene05_opt03" },
          ],
        },
        {
          id: "ep06c_scene03_opt01",
          type: "branch",
          lines: [
            { role: "professor", text: "열한 시 넘었네.", action: "시계를 보며" },
            { role: "professor", text: "자다 깨서 첫 마디가 몇 시냐고. 시험이 내일인 건 알고 자는 건가?", action: "피식 웃으며 내 책상 위에 놓인 노트를 힐끗 보더니" },
            { role: "student", text: "……알고 잤습니다." },
            { role: "professor", text: "뻔뻔하군. 마음에 들어.", action: "헛웃음을 치며 가방을 내려놓고" },
            { role: "professor", text: "그럼 뻔뻔하게 30분만 더 하고 들어가게. 너무 늦게 들어가지 말고.", action: "강의실 불을 밝게 켜 주며" },
            { role: "narration", text: "교수님이 '마음에 든다'고 했다. 분명 뻔뻔하단 얘기인데, 괜히 드는 이 좋은 기분은 뭐지." },
          ],
          next_scene: "ep06c_scene06_outro",
        },
        {
          id: "ep06c_scene04_opt02",
          type: "branch",
          lines: [
            { role: "professor", text: "앉아. 갑자기 일어나면 어지러워.", action: "황급히 일어나는 나를 보며 한 손을 들어 제지하듯" },
            { role: "professor", text: "잠깐만 있어요." },
            { role: "narration", text: "(교수님이 가방만 내려놓고 강의실을 나간다. 복도 발소리가 멀어진다. 2~3분의 정적.)" },
            { role: "narration", text: "뭐지. 나 혼자 강의실에 남겨졌다. 어리둥절한 채로 노트를 정리하고 있는데—" },
            { role: "professor", text: "1층에 자판기밖에 없더군. 에너지 음료랑 초콜릿. 시험 전날 밤샘엔 당이 필요하니까.", action: "봉투를 내 책상에 올려놓으며 무심하게" },
            { role: "professor", text: "영수증은 됐고, 내일 시험이나 잘 보게.", action: "코트를 털며 자리를 잡으며" },
            { role: "student", text: "교수님이 왜 이런 걸..." },
            { role: "professor", text: "강의실에 학생 혼자 두고 그냥 가면 내가 찜찜하지. 동기들과 나눠 먹어도 되고.", action: "서류를 꺼내며 시선을 내리깔고" },
            { role: "narration", text: "봉투 안 에너지 음료 캔이 차갑다. 근데 왜 나는 지금 이게 그렇게 뭉클하지." },
          ],
          stage_direction: [],
          next_scene: "ep06c_scene06_outro",
        },
        {
          id: "ep06c_scene05_opt03",
          type: "branch",
          lines: [
            { role: "professor", text: "꿈 아니야. 서류 두고 온 게 있어서.", action: "잠깐 나를 보더니, 피식" },
            { role: "professor", text: "자네, 노트 필기가 반은 낙서군. 아까 지나오다 봤는데.", action: "가방을 찾아 집으며" },
            { role: "student", text: "……보셨어요?" },
            { role: "professor", text: "자는 사람한테 말 걸기 뭐해서 그냥 뒀지. 그나저나 낙서할 여유가 있으면 3단원 다시 보게. 내일 후회하기 싫으면.", action: "무심하게" },
            { role: "narration", text: "교수님이 아까부터 여기 계셨다는 거잖아. 언제부터 여기 계셨던 걸까. 그 말이 자꾸 머릿속에서 맴돈다." },
          ],
          next_scene: "ep06c_scene06_outro",
        },
        {
          id: "ep06c_scene06_outro",
          type: "linear",
          stage_direction: ["강의실 시계가 자정을 가리킨다. 교수님이 먼저 자리에서 일어난다."],
          lines: [
            { role: "professor", text: "__ 학생.", action: "가방을 챙기며 문 쪽으로 걷다가, 문손잡이를 잡고 잠깐 멈추며" },
            { role: "student", text: "네." },
            { role: "professor", text: "내일 실망시키지 말게. 나는 자네가 어떤 학생인지 꽤 잘 알고 있거든." },
            { role: "narration", text: "강의실이 다시 조용해진다. '꽤 잘 알고 있다'— 그게 칭찬인지 압박인지 모르겠는데, 이상하게 두 가지 다인 것 같다." },
            { role: "narration", text: "가방을 챙기는 손이 아까보다 빠르다. 내일 시험 강의실에서, 잘하고 싶어졌다." },
          ],
          terminal: true,
        },
      ],
    },
  ],
} as const;

export const storyEndingCatalog: Record<StoryEndingRankKey, StoryEndingCatalogEntry> = {
  a_plus_grad_school: {
    title: "엔딩 A+ - 자네를 놓치고 싶지 않군",
    variants: [
      {
        id: "ending_aplus_main",
        subtype: "A+ 엔딩",
        title: "자네를 놓치고 싶지 않군",
        lines: [
          {
            role: "professor",
            text: "자네의 사고방식은... 딱 내 연구실에 필요한 수준이야. 졸업장? 그게 무슨 의미가 있나. 내 옆에서 나와 함께 세계를 구해보지 않겠나? 자, 도망갈 생각은 말고.",
          },
        ],
      },
    ],
  },
  ending_b: {
    title: "엔딩 B+ - 그저 스쳐갈 인연으로 두지",
    variants: [
      {
        id: "ending_b_main",
        subtype: "B+ 엔딩",
        title: "그저 스쳐갈 인연으로 두지",
        lines: [
          {
            role: "professor",
            text: "아아… 자네였군. B+라, 나쁘진 않지만 결정적이진 않았어. 유감이지만… 자네는 내 기억에 남지 않는 수준이네. 결국 자네는, 내게 그저 스쳐간 학생일 뿐이지.",
          },
        ],
      },
    ],
  },
  c_plus_retake: {
    title: "엔딩 C+ - 이건 끝이 아니라 시작이겠지? 다시 보자고",
    variants: [
      {
        id: "ending_cplus_main",
        subtype: "C+ 엔딩",
        title: "이건 끝이 아니라 시작이겠지? 다시 보자고",
        lines: [
          {
            role: "professor",
            text: "C+… C+이라. 자네, 이 점수가 뭘 의미하는지 아나? 합격도 탈락도 아닌… 내가 아직 자네에게 할 말이 남았다는 뜻일세. 이번 학기 인연은 여기까지지만… 걱정 말게. 우린 곧, 재수강이라는 이름으로 다시 만나게 될 테니까.",
          },
        ],
      },
    ],
  },
  hidden_ending_f: {
    title: "히든 엔딩 S+",
    variants: [
      {
        id: "hidden_splus_01",
        subtype: "히든 S+ - 진정한 멋사인으로 변신",
        title: "진정한 멋사인으로 변신",
        lines: [
          {
            role: "professor",
            text: "답안지… 아주 인상 깊었네. 정답은 하나도 맞지 않았지만, 이 빽빽한 글씨… 자네의 열정과 집요함은 충분히 전해졌어. 그래서 말인데— 자네 같은 인재라면… 멋쟁이사자가 될 수 있을 것 같네. 선택은 하나야, 지금 나와 함께 가겠나?",
          },
        ],
      },
      {
        id: "hidden_splus_02",
        subtype: "히든 S+ - 로그아웃 처리",
        title: "로그아웃 처리",
        lines: [
          {
            role: "professor",
            text: "그… 자네 답안지의 마지막 서술형 답안 말이야. 이걸 도대체 어디서 본 거지? 그건 내가 아무에게도 공개하지 않은… 미발표 논문의 1급 기밀인데.",
          },
          {
            role: "professor",
            text: "자네는… 너무 많은 걸 알아버렸어. …어쩔 수 없군. 여기서 정리해야겠네.",
          },
          {
            role: "professor",
            text: "잠깐이면 끝나네. 너무 걱정하진 말게. 자, 눈을 감아보게나.",
          },
        ],
      },
    ],
  },
};

export const storyEpisodeBackdropMap: Record<string, string> = {
  ep01_commute: "/backgrounds/episodes/commute-campus.webp",
  ep02_morning_classroom: "/backgrounds/episodes/morning-classroom.webp",
  ep03_lunch_student_cafeteria: "/backgrounds/episodes/lunch-student-cafeteria.webp",
  ep03_lunch_off_campus_restaurant: "/backgrounds/episodes/lunch-offcampus-restaurant.webp",
  ep03_lunch_bathroom_stall: "/backgrounds/episodes/lunch-restroom-stall.webp",
  ep04_library: "/backgrounds/episodes/afternoon-library.webp",
  ep05_simple_dinner: "/backgrounds/episodes/light-dinner.webp",
  ep06_night_professor_office: "/backgrounds/episodes/night-lab-visit.webp",
  ep06_night_bench: "/backgrounds/episodes/night-bench.webp",
  ep06_night_classroom: "/backgrounds/episodes/night-self-study.webp",
};
