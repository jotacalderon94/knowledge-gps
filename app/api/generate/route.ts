import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { LearningMapSchema } from "@/lib/schema";
import { checkGenerationQuota, generationLimitError, GenerationRequestSchema, getGenerationLimiters } from "@/lib/generation";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request with a learning goal." }, { status: 400 });
  }

  const input = GenerationRequestSchema.safeParse(body);
  if (!input.success) {
    const tooLong = input.error.issues.some(issue => issue.code === "too_big");
    return NextResponse.json({ error: tooLong ? "Learning goals must be 200 characters or fewer." : "Enter a learning goal with at least 2 non-space characters." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini generation is not configured. Add GEMINI_API_KEY on the server, or use the Machine Learning sample." }, { status: 503 });

  let limiters;
  try {
    limiters = getGenerationLimiters();
  } catch {
    const error = generationLimitError("storage");
    return NextResponse.json({ error: error.error }, { status: error.status });
  }
  if (!limiters) return NextResponse.json({ error: "Public generation is disabled until persistent rate-limit storage is configured with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN." }, { status: 503 });

  const quota = await checkGenerationQuota(clientIp(request), limiters);
  if (!quota.allowed) {
    const error = generationLimitError(quota.reason);
    return NextResponse.json({ error: error.error }, { status: error.status });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = "Create a practical prerequisite learning map for this goal: " + JSON.stringify(input.data.goal) + ". Return JSON only with keys goal, concepts, and challenge. Include 6 to 10 concepts in sensible progression. Each concept has a unique short lowercase kebab-case id, concise title, prerequisites array referencing only concept IDs, and a question object with prompt, exactly four plausible answer choices, correctIndex from 0 to 3, and a short explanation. Keep quiz text concise. Questions diagnose understanding, not trivial recall. Avoid cycles. The final challenge must be an application-level scenario tied directly to the original goal, not a basic prerequisite question. It has a prompt, exactly four plausible choices, correctIndex, explanation, and relevantConceptIds listing 2 to 5 concept IDs needed to solve it. Make the challenge require applying and combining ideas. Return no markdown.";
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });
    const finishReason = String(response.candidates?.[0]?.finishReason || "");
    if (finishReason.includes("MAX_TOKENS")) throw new Error("Gemini reached its output limit before completing this map. Please try again.");
    const raw = response.text;
    if (!raw) throw new Error("Gemini returned an empty response.");
    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch { throw new Error("Gemini returned incomplete or invalid JSON. Please try again."); }
    const parsed = LearningMapSchema.safeParse(decoded);
    if (!parsed.success) throw new Error("Gemini's learning map failed validation: " + parsed.error.issues.slice(0, 5).map(issue => issue.message).join("; "));
    return NextResponse.json({ map: parsed.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected generation failure.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
