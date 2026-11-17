import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const GenerationRequestSchema = z.object({
  goal: z.string().trim().min(2).max(200),
}).strict();

export const GENERATION_RATE_LIMITS = {
  perIp: { requests: 5, window: "1 h" },
  global: { requests: 100, window: "1 d" },
} as const;

export type LimitReason = "ip" | "global" | "storage";
export type LimitResult = { success: boolean };
export type GenerationLimiters = {
  perIp: { limit: (key: string) => Promise<LimitResult> };
  global: { limit: (key: string) => Promise<LimitResult> };
};

let cachedLimiters: GenerationLimiters | null | undefined;

export function getGenerationLimiters(env: Record<string, string | undefined> = process.env): GenerationLimiters | null {
  if (cachedLimiters !== undefined) return cachedLimiters;
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedLimiters = null;
    return cachedLimiters;
  }
  const redis = new Redis({ url, token });
  cachedLimiters = {
    perIp: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(GENERATION_RATE_LIMITS.perIp.requests, GENERATION_RATE_LIMITS.perIp.window), prefix: "knowledge-gps:generate:ip" }),
    global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(GENERATION_RATE_LIMITS.global.requests, GENERATION_RATE_LIMITS.global.window), prefix: "knowledge-gps:generate:global" }),
  };
  return cachedLimiters;
}

export async function checkGenerationQuota(ip: string, limiters: GenerationLimiters): Promise<{ allowed: true } | { allowed: false; reason: LimitReason }> {
  try {
    const ipResult = await limiters.perIp.limit(ip);
    if (!ipResult.success) return { allowed: false, reason: "ip" };
    const globalResult = await limiters.global.limit("all-generations");
    if (!globalResult.success) return { allowed: false, reason: "global" };
    return { allowed: true };
  } catch {
    return { allowed: false, reason: "storage" };
  }
}

export function generationLimitError(reason: LimitReason) {
  if (reason === "ip") return { status: 429, error: "You’ve reached the limit of 5 learning maps per hour. Please try again later." } as const;
  if (reason === "global") return { status: 429, error: "Knowledge GPS has reached today’s generation limit. Please try again tomorrow." } as const;
  return { status: 503, error: "Generation is temporarily unavailable because the shared rate-limit service could not be reached. Please try again shortly." } as const;
}
