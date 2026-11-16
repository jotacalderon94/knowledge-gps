# Knowledge GPS

A personalized learning navigator. Explore the built-in Machine Learning sample, answer short concept checks, and watch your learning route adjust around prerequisite gaps. Enter another goal to generate a map with Gemini.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to enable generated maps. `GEMINI_MODEL` defaults to `gemini-2.5-flash`.
3. Start with `npm run dev`. The Machine Learning sample works without an API key.

`npm test` runs graph and validation tests. `npm run typecheck` checks TypeScript. `npm run build` creates the production build.

The API key is only read by the server route. Generated output is checked with Zod, including concept IDs, prerequisite references, and dependency cycles.
