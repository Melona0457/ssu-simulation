import fs from "node:fs";
import path from "node:path";
import textToSpeech from "@google-cloud/text-to-speech";
import type { DialogueEmotion, ProfessorGender } from "@/lib/game-data";

function resolveCredentialsPath() {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const fallbackFiles = [
    ".ssu-simulation-fc472cd47c45.json",
    "ssu-simulation-fc472cd47c45.json",
  ];

  for (const candidate of fallbackFiles) {
    const absolutePath = path.join(process.cwd(), candidate);

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return null;
}

export function createGoogleTtsClient() {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const keyFilename = resolveCredentialsPath();

  if (!projectId || !keyFilename) {
    return null;
  }

  return new textToSpeech.TextToSpeechClient({
    projectId,
    keyFilename,
  });
}

export function getGoogleVoiceForProfessor(gender: ProfessorGender) {
  if (gender === "남성") {
    return {
      languageCode: "ko-KR",
      name: "ko-KR-Wavenet-C",
    };
  }

  if (gender === "여성") {
    return {
      languageCode: "ko-KR",
      name: "ko-KR-Wavenet-A",
    };
  }

  return {
    languageCode: "ko-KR",
    name: "ko-KR-Neural2-B",
  };
}

export function getSelectedGoogleVoice(voiceName: string | undefined, gender: ProfessorGender) {
  if (voiceName && voiceName.trim().length > 0) {
    return {
      languageCode: "ko-KR",
      name: voiceName,
    };
  }

  return getGoogleVoiceForProfessor(gender);
}

export function getEmotionTtsConfig(emotion: DialogueEmotion) {
  switch (emotion) {
    case "stern":
      return {
        speakingRate: 0.93,
        pitch: -2.5,
      };
    case "teasing":
      return {
        speakingRate: 1.05,
        pitch: 1.5,
      };
    case "awkward":
      return {
        speakingRate: 0.92,
        pitch: 2.4,
      };
    case "warm":
      return {
        speakingRate: 0.97,
        pitch: 1.1,
      };
    case "panic":
      return {
        speakingRate: 1.1,
        pitch: 3,
      };
    case "neutral":
    default:
      return {
        speakingRate: 1,
        pitch: 0,
      };
  }
}
