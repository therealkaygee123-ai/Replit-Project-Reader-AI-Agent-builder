import { NextResponse } from "next/server";

const SAFE_DISCLAIMER =
  "Generated patch is a proposal only. No code was executed or modified by the agent.";

export async function POST(request: Request) {
  const body = (await request.json()) as { request?: string; context?: unknown };
  const userRequest = body.request?.trim();

  if (!userRequest) {
    return NextResponse.text("Missing change request.", { status: 400 });
  }

  const plan = [
    "Review the requested change and identify affected UI or API areas.",
    "Update the report schema or UI component to include the new data.",
    "Adjust server-side analysis to collect the requested information.",
    "Verify the UI renders the new section and update instructions if needed."
  ];

  const diff = [
    "diff --git a/app/page.tsx b/app/page.tsx",
    "--- a/app/page.tsx",
    "+++ b/app/page.tsx",
    "@@ -1,3 +1,7 @@",
    "+// Proposed change: add a new section in the report for the request:",
    `+// \"${userRequest}\"`,
    "+// Update component markup to include the new details.",
    " ",
    "diff --git a/lib/analyzeZip.ts b/lib/analyzeZip.ts",
    "--- a/lib/analyzeZip.ts",
    "+++ b/lib/analyzeZip.ts",
    "@@ -1,3 +1,7 @@",
    "+// Proposed change: extend analysis output to capture new details.",
    `+// Request: \"${userRequest}\"`,
    "+// Update analysis logic accordingly.",
    " ",
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -1,3 +1,7 @@",
    "+// Proposed change: document new behavior and usage." 
  ].join("\n");

  return NextResponse.json({
    plan,
    diff,
    disclaimer: SAFE_DISCLAIMER,
    contextEcho: body.context ? "Context received." : "No context provided."
  });
}
