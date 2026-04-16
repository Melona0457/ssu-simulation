import { readFile } from "node:fs/promises";
import path from "node:path";

export type ProfessorAgeToneKey = "TONE_20S" | "TONE_30S" | "TONE_40S";
export type ProfessorGenderKey = "남자" | "여자";

export type ProfessorScriptProfileKey =
  | "male_20s"
  | "male_30s"
  | "male_40s"
  | "female_20s"
  | "female_30s"
  | "female_40s";

const PROFILE_FILE_MAP: Record<ProfessorScriptProfileKey, string> = {
  male_20s: "남자20대젊은교수님.md",
  male_30s: "남자30대중년교수님.md",
  male_40s: "남자40대중노년교수님.md",
  female_20s: "여자20대젊은교수님.md",
  female_30s: "여자30대중년교수님.md",
  female_40s: "여자40대중노년교수님.md",
};

export function resolveProfessorScriptProfileKey(params: {
  gender: ProfessorGenderKey;
  ageTone: ProfessorAgeToneKey;
}): ProfessorScriptProfileKey {
  const genderPrefix = params.gender === "여자" ? "female" : "male";
  const ageSuffix =
    params.ageTone === "TONE_20S"
      ? "20s"
      : params.ageTone === "TONE_30S"
        ? "30s"
        : "40s";
  return `${genderPrefix}_${ageSuffix}` as ProfessorScriptProfileKey;
}

function sanitizeMarkdownLine(line: string) {
  return line
    .replace(/\r/g, "")
    .replace(/^>\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProfessorLines(markdownText: string) {
  const normalized = markdownText
    .replace(/\r/g, "")
    .replace(/^\s*>\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\t/g, " ");
  const indexedLineMatches = Array.from(
    normalized.matchAll(/^\s*(\d{1,3})\s*=\s*(.+)\s*$/gm),
  );
  if (indexedLineMatches.length > 0) {
    return indexedLineMatches
      .map((match) => ({
        index: Number(match[1]),
        text: sanitizeMarkdownLine(match[2]),
      }))
      .filter((item) => item.text.length > 0)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.text);
  }

  const professorLines: string[] = [];
  const pattern =
    /교수(?:\(옆칸\))?\s*:\s*([\s\S]*?)(?=(?:\n\s*(?:교수(?:\(옆칸\))?|나레이션|학생|독백)\s*:)|(?:\n\s*\[[^\]]+\])|$)/g;

  let match: RegExpExecArray | null = pattern.exec(normalized);
  while (match) {
    const content = sanitizeMarkdownLine(match[1]);
    if (content.length > 0) {
      professorLines.push(content);
    }
    match = pattern.exec(normalized);
  }

  return professorLines;
}

export async function loadProfessorScriptProfile(profileKey: ProfessorScriptProfileKey) {
  const filename = PROFILE_FILE_MAP[profileKey];
  const absolutePath = path.join(process.cwd(), filename);
  const markdownText = await readFile(absolutePath, "utf8");
  const professorLines = extractProfessorLines(markdownText);

  return {
    profileKey,
    filename,
    professorLines,
  };
}
