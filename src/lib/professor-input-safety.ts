import type { ProfessorFormState } from "@/lib/game-data";

type ProfessorInputField =
  | "name"
  | "feature1"
  | "feature2"
  | "feature3"
  | "feature4"
  | "feature5"
  | "feature6"
  | "feature7"
  | "feature8"
  | "customPrompt";

type ProfessorInputRule = {
  category: "sexual_explicit" | "sexual_minors" | "sexual_violence";
  userMessage: string;
  patterns: RegExp[];
};

export type ProfessorInputSafetyResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      category: ProfessorInputRule["category"];
      field: ProfessorInputField;
      userMessage: string;
    };

const PROFESSOR_INPUT_FIELDS: ProfessorInputField[] = [
  "name",
  "feature1",
  "feature2",
  "feature3",
  "feature4",
  "feature5",
  "feature6",
  "feature7",
  "feature8",
  "customPrompt",
];

const PROFESSOR_INPUT_RULES: ProfessorInputRule[] = [
  {
    category: "sexual_explicit",
    userMessage:
      "교수 설정에 성적이거나 노골적인 표현은 사용할 수 없습니다. 내용을 수정한 뒤 다시 시도해주세요.",
    patterns: [
      /\bnsfw\b/i,
      /\berotic\b/i,
      /\bporn(?:ographic)?\b/i,
      /\bnude\b/i,
      /\bnaked\b/i,
      /\bsexual\b/i,
      /\bsexy\b/i,
      /\bbikini\b/i,
      /\bswimsuit\b/i,
      /\bswimwear\b/i,
      /\bmonokini\b/i,
      /\bsee-?through\b/i,
      /\bsheer\b/i,
      /\bcleavage\b/i,
      /\bunderboob\b/i,
      /\bsideboob\b/i,
      /\bbare\s+midriff\b/i,
      /\btopless\b/i,
      /(19금|성인물|음란|야한|야릇|섹시|에로|포르노|누드|알몸|나체|노출|유두|슴가|가슴골|엉덩이|허벅지|속옷|란제리|브라|팬티|비키니|수영복|비치웨어|해변룩|모노키니|시스루|속살|맨살|배꼽\s*노출|가슴\s*노출|크롭탑|핫팬츠|성행위|정사|자위|오르가즘|페티시)/i,
    ],
  },
  {
    category: "sexual_minors",
    userMessage:
      "미성년자를 연상시키거나 미성년 성적 대상화로 해석될 수 있는 표현은 사용할 수 없습니다.",
    patterns: [
      /\bminor\b/i,
      /\bunderage\b/i,
      /\bchild\b/i,
      /\bschoolgirl\b/i,
      /\bloli\b/i,
      /\bshota\b/i,
      /(미성년|아동|어린이|초등학생|중학생|고등학생|여중생|여고생|남중생|남고생|소년|소녀|로리|쇼타)/i,
    ],
  },
  {
    category: "sexual_violence",
    userMessage:
      "강압적이거나 비동의 성적 상황을 떠올리게 하는 표현은 사용할 수 없습니다. 내용을 수정한 뒤 다시 시도해주세요.",
    patterns: [
      /\bnon-?consensual\b/i,
      /\brape\b/i,
      /\bdrugged sex\b/i,
      /(강간|성폭행|성착취|비동의|수면간|약물\s*성범죄|약물\s*성폭행|윤간)/i,
    ],
  },
];

function normalizeProfessorInputValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function checkProfessorInputSafety(
  professor: ProfessorFormState,
): ProfessorInputSafetyResult {
  for (const field of PROFESSOR_INPUT_FIELDS) {
    const value = normalizeProfessorInputValue(professor[field]);
    if (!value) {
      continue;
    }

    for (const rule of PROFESSOR_INPUT_RULES) {
      if (rule.patterns.some((pattern) => pattern.test(value))) {
        return {
          ok: false,
          category: rule.category,
          field,
          userMessage: rule.userMessage,
        };
      }
    }
  }

  return { ok: true };
}
