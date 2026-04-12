import type { DialogueEmotion, ProfessorGender } from "@/lib/game-data";

export function getGeminiVoiceForProfessor(gender: ProfessorGender) {
  if (gender === "남성") {
    return "Enceladus";
  }

  if (gender === "여성") {
    return "Kore";
  }

  return "Puck";
}

export function getSelectedGeminiVoice(voiceName: string | undefined, gender: ProfessorGender) {
  if (voiceName && voiceName.trim().length > 0) {
    return voiceName.trim();
  }

  return getGeminiVoiceForProfessor(gender);
}

export function getEmotionDirection(emotion: DialogueEmotion) {
  switch (emotion) {
    case "stern":
      return "calm, strict, slightly lower tone, measured pace";
    case "teasing":
      return "playful, lightly mischievous, bright tone";
    case "awkward":
      return "hesitant, slightly shy, uneven rhythm";
    case "warm":
      return "warm, reassuring, soft tone";
    case "panic":
      return "urgent, tense, faster pace but still clear";
    case "neutral":
    default:
      return "neutral, clear, natural conversational tone";
  }
}

export function buildGeminiTtsPrompt(text: string, emotion: DialogueEmotion) {
  return [
    "Read the following Korean dialogue exactly as written.",
    "Do not add, remove, or paraphrase words.",
    `Style direction: ${getEmotionDirection(emotion)}`,
    `Dialogue: ${text}`,
  ].join("\n");
}
