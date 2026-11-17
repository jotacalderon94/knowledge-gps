# Knowledge GPS 🧭

**Learn anything. Find your way there.**

🌐 **Live Demo:** https://knowledge-gps.vercel.app/

💻 **GitHub:** https://github.com/jotacalderon94/knowledge-gps

## The Problem

Have you ever tried learning something new, only to discover that you need to understand several other concepts first?

Traditional learning platforms often follow fixed curricula, regardless of what students already know or what they actually want to achieve.

**Knowledge GPS helps learners navigate those knowledge gaps without losing sight of their original goal.**

## Our Solution

Knowledge GPS is an AI-assisted, goal-driven learning navigator.

Users enter a learning objective, such as "I want to understand summations," and the application generates a visual map of the concepts and prerequisites needed to reach that goal.

Instead of following a fixed course, learners answer diagnostic questions that help identify what they already understand and where they need additional practice.

The application dynamically recalculates their learning route as they progress.

## Key Features

- **Goal-based learning:** Start with a specific objective, not a predefined course.
- **AI-generated knowledge maps:** Gemini 2.5 Flash generates structured concepts, dependencies, and diagnostic questions.
- **Interactive knowledge graph:** Explore how concepts connect and build upon each other.
- **Adaptive diagnostics:** Identify potential knowledge gaps through concept-level questions.
- **Dynamic rerouting:** Recalculate the learning path based on student performance.
- **Destination Challenge:** Verify the learner can apply their knowledge toward the original goal.
- **Offline sample:** Explore a prebuilt Machine Learning learning map without an API key.

## How It Works

1. **Choose your destination:** Enter something you want to learn.
2. **Explore the map:** See the concepts and prerequisite relationships.
3. **Check your knowledge:** Answer diagnostic questions.
4. **Follow your route:** Focus on concepts that need practice.
5. **Recalculate:** Your learning route adapts as you progress.
6. **Reach your destination:** Complete an application-level challenge.

## What Makes It Different?

Knowledge GPS is not just another AI chatbot.

While Gemini generates educational content, our own deterministic learning engine handles dependency traversal, knowledge tracking, prerequisite checks, and personalized route calculation.

**AI generates the map. Our algorithms navigate it.**

## Technology

- Next.js and TypeScript
- React Flow
- Tailwind CSS
- Gemini 2.5 Flash
- Zod
- Graph algorithms for prerequisite navigation and route recalculation

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The Machine Learning sample works without an API key.

For AI-generated maps, create `.env.local`:

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash
```

## Validation

The project passed its automated tests, TypeScript checks, and production build during development.

Deployed to production using Vercel.

## Future Vision

We envision Knowledge GPS as a universal learning navigation system that helps people discover the shortest meaningful path between what they know today and what they want to learn tomorrow.

**Stop getting lost in learning. Start navigating.**