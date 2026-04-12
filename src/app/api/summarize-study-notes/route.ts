import { NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai/server";

type SummarizeRequestPayload = {
  rawText: string;
};

type ParsedSummary = {
  summary?: unknown;
  keyPoints?: unknown;
};

function normalizeKeyPoints(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SummarizeRequestPayload;
  const rawText = payload.rawText?.trim();

  if (!rawText) {
    return NextResponse.json(
      {
        message: "요약할 학습 노트 텍스트가 비어 있습니다.",
      },
      { status: 400 },
    );
  }

  const openai = createOpenAIClient();

  if (!openai) {
    return NextResponse.json(
      {
        message: "OPENAI_API_KEY가 없어 학습 노트 요약을 생성할 수 없습니다.",
      },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_SUMMARY_MODEL?.trim() || "gpt-4.1-mini";
  const prompt = [
    "다음 학습 노트(또는 PDF 추출 텍스트)를 시험 대비용으로 요약하라.",
    "JSON만 출력한다.",
    "JSON 스키마:",
    "{",
    '  "summary": "5~10문장 한국어 요약",',
    '  "keyPoints": ["시험 직전 암기할 핵심 포인트 문자열 배열"]',
    "}",
    "제약:",
    "- 용어는 원문 의미를 보존한다.",
    "- 불필요한 수사는 줄이고, 실제 시험 대비 관점으로 정리한다.",
    `원문:\n${rawText.slice(0, 20000)}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "당신은 대학 시험 대비 튜터다. 사실과 맥락을 유지하면서 핵심 위주로 요약하고 JSON 외 텍스트를 출력하지 마라.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      throw new Error("OpenAI 요약 응답이 비어 있습니다.");
    }

    const parsed = JSON.parse(raw) as ParsedSummary;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : rawText.slice(0, 1200);
    const keyPoints = normalizeKeyPoints(parsed.keyPoints);

    return NextResponse.json({
      summary,
      keyPoints,
      model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `학습 노트 요약 실패: ${error.message}`
            : "학습 노트 요약 실패",
      },
      { status: 500 },
    );
  }
}
