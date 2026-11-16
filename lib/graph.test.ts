import test from "node:test";
import assert from "node:assert/strict";
import { LearningMapSchema, type LearningMap } from "./schema";
import { getJourneyState, masteryFromAnswers, masteryWithChallengeEvidence, nextRouteConcept, recommendedRoute, scoreDestinationChallenge, topologicalOrder } from "./graph";

const base: LearningMap = {
  goal: "Test graph",
  concepts: [
    { id: "basics", title: "Basics", prerequisites: [], question: { prompt: "What is a datum?", choices: ["A", "B", "C", "D"], correctIndex: 0, explanation: "A." } },
    { id: "vectors", title: "Vectors", prerequisites: ["basics"], question: { prompt: "What is a vector?", choices: ["A", "B", "C", "D"], correctIndex: 1, explanation: "B." } },
    { id: "models", title: "Models", prerequisites: ["vectors"], question: { prompt: "What is a model?", choices: ["A", "B", "C", "D"], correctIndex: 2, explanation: "C." } },
    { id: "metrics", title: "Metrics", prerequisites: ["basics"], question: { prompt: "What is a metric?", choices: ["A", "B", "C", "D"], correctIndex: 3, explanation: "D." } },
  ],
  challenge: { prompt: "Apply the ideas to choose the best way to test a model on future sales.", choices: ["Use a future holdout and a task-fit metric", "Measure training accuracy only", "Include future outcomes in training", "Skip comparison with a baseline"], correctIndex: 0, explanation: "A time-aware holdout and relevant metric estimate future performance.", relevantConceptIds: ["models", "metrics"] },
};
const allCorrect: Record<string, number> = Object.fromEntries(base.concepts.map(c => [c.id, c.question.correctIndex]));

test("schema rejects invalid dependencies and cycles", () => {
  assert.equal(LearningMapSchema.safeParse(base).success, true);
  const unknown = structuredClone(base); unknown.concepts[1].prerequisites = ["missing"];
  assert.equal(LearningMapSchema.safeParse(unknown).success, false);
  const cyclic = structuredClone(base); cyclic.concepts[0].prerequisites = ["models"];
  assert.equal(LearningMapSchema.safeParse(cyclic).success, false);
  const badChallenge = structuredClone(base); badChallenge.challenge.relevantConceptIds = ["outside-map"];
  assert.equal(LearningMapSchema.safeParse(badChallenge).success, false);
});

test("topological order places prerequisites first", () => {
  const order = topologicalOrder(base.concepts);
  for (const c of base.concepts) for (const p of c.prerequisites) assert.ok(order.indexOf(p) < order.indexOf(c.id));
});

test("route recalculates when answers change", () => {
  assert.deepEqual(recommendedRoute(base, masteryFromAnswers(base, {})), ["basics", "vectors", "metrics", "models"]);
  assert.deepEqual(recommendedRoute(base, masteryFromAnswers(base, { basics: 0, vectors: 1 })), ["metrics", "models"]);
});

test("all correct checkpoints unlock the destination challenge", () => {
  const mastery = masteryFromAnswers(base, allCorrect);
  assert.deepEqual(recommendedRoute(base, mastery), []);
  assert.equal(getJourneyState(base, mastery), "destination_challenge");
});

test("passing the destination challenge reaches the destination", () => {
  const mastery = masteryFromAnswers(base, allCorrect);
  const result = scoreDestinationChallenge(base.challenge, base.challenge.correctIndex);
  assert.equal(result.passed, true);
  assert.deepEqual(result.revisitConceptIds, []);
  assert.equal(getJourneyState(base, mastery, result.passed), "destination_reached");
});

test("a failed destination challenge sends relevant concepts back into the route", () => {
  const mastery = masteryWithChallengeEvidence(masteryFromAnswers(base, allCorrect), scoreDestinationChallenge(base.challenge, 1).revisitConceptIds);
  assert.deepEqual(recommendedRoute(base, mastery), ["metrics", "models"]);
  assert.equal(getJourneyState(base, mastery), "learning");
});

test("end of route has no next step and opens the destination challenge", () => {
  const mastery = masteryFromAnswers(base, allCorrect);
  const route = recommendedRoute(base, mastery);
  assert.equal(nextRouteConcept(route, "metrics"), undefined);
  assert.equal(getJourneyState(base, mastery), "destination_challenge");
});
