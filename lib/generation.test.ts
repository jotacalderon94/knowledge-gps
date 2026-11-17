import test from "node:test";
import assert from "node:assert/strict";
import { checkGenerationQuota, GENERATION_RATE_LIMITS, GenerationLimiters, GenerationRequestSchema, generationLimitError, getGenerationLimiters } from "./generation";

function fixedWindow(maximum: number) {
  const counts = new Map<string, number>();
  return {
    limit: async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return { success: next <= maximum };
    },
  };
}

test("generation input accepts trimmed goals up to 200 characters and rejects invalid input", () => {
  assert.equal(GenerationRequestSchema.safeParse({ goal: "  learn calculus  " }).data?.goal, "learn calculus");
  assert.equal(GenerationRequestSchema.safeParse({ goal: "a".repeat(200) }).success, true);
  assert.equal(GenerationRequestSchema.safeParse({ goal: "a".repeat(201) }).success, false);
  assert.equal(GenerationRequestSchema.safeParse({ goal: "    " }).success, false);
  assert.equal(GenerationRequestSchema.safeParse({ goal: 42 }).success, false);
  assert.equal(GenerationRequestSchema.safeParse({ goal: "learn", extra: "unexpected" }).success, false);
});

test("per-IP quota allows five requests and rejects the sixth", async () => {
  const limiters: GenerationLimiters = { perIp: fixedWindow(GENERATION_RATE_LIMITS.perIp.requests), global: fixedWindow(GENERATION_RATE_LIMITS.global.requests) };
  for (let i = 0; i < 5; i++) assert.deepEqual(await checkGenerationQuota("203.0.113.5", limiters), { allowed: true });
  assert.deepEqual(await checkGenerationQuota("203.0.113.5", limiters), { allowed: false, reason: "ip" });
});

test("global quota allows 100 requests across IPs and rejects the next", async () => {
  const limiters: GenerationLimiters = { perIp: fixedWindow(GENERATION_RATE_LIMITS.perIp.requests), global: fixedWindow(GENERATION_RATE_LIMITS.global.requests) };
  for (let i = 0; i < 100; i++) assert.deepEqual(await checkGenerationQuota("ip-" + Math.floor(i / 5), limiters), { allowed: true });
  assert.deepEqual(await checkGenerationQuota("ip-20", limiters), { allowed: false, reason: "global" });
});

test("unavailable persistent storage fails closed", async () => {
  assert.equal(getGenerationLimiters({}), null);
  const error = generationLimitError("storage");
  assert.equal(error.status, 503);
  assert.match(error.error, /shared rate-limit service/i);
  const downLimiters: GenerationLimiters = { perIp: { limit: async () => { throw new Error("Redis offline"); } }, global: fixedWindow(100) };
  assert.deepEqual(await checkGenerationQuota("ip", downLimiters), { allowed: false, reason: "storage" });
});

test("quota failures produce friendly HTTP 429 response details", () => {
  const perIp = generationLimitError("ip");
  const global = generationLimitError("global");
  assert.equal(perIp.status, 429);
  assert.match(perIp.error, /5 learning maps per hour/i);
  assert.equal(global.status, 429);
  assert.match(global.error, /generation limit/i);
});
