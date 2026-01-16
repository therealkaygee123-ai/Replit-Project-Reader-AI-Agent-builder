# Replit Reader

A full-stack Next.js (App Router) application that analyzes a zipped Replit project, detects its stack, and generates a structured report with run instructions. It also includes a phase-2 AI Agent panel that proposes a plan and a patch diff without executing code.

## Features
- Upload a `.zip` Replit project and analyze it server-side.
- Detect stack hints (Node.js, React, Next.js, Vite, Python).
- Infer entry points, package scripts, and likely env vars.
- Generate step-by-step run instructions.
- Optional AI Agent panel that proposes a plan and patch diff.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to use the UI.

## Troubleshooting
- **Upload fails**: Make sure the file ends with `.zip` and is not corrupted.
- **No entry point detected**: Check for `package.json`, `README.md`, or common entry files like `src/index.tsx`.
- **Missing env vars**: The scan is heuristic. Check your `.env.example` or project docs for required values.
