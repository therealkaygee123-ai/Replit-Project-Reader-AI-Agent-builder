"use client";

import { useMemo, useState } from "react";

type ScriptEntry = {
  name: string;
  command: string;
};

type AnalysisReport = {
  projectName: string;
  stacks: string[];
  entryPoints: string[];
  scripts: ScriptEntry[];
  envVars: string[];
  runInstructions: string[];
  notes: string[];
};

type AgentResponse = {
  plan: string[];
  diff: string;
  disclaimer: string;
};

const emptyReport: AnalysisReport = {
  projectName: "",
  stacks: [],
  entryPoints: [],
  scripts: [],
  envVars: [],
  runInstructions: [],
  notes: []
};

export default function HomePage() {
  const [report, setReport] = useState<AnalysisReport>(emptyReport);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase2Enabled, setPhase2Enabled] = useState(false);
  const [agentRequest, setAgentRequest] = useState("");
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const hasReport = useMemo(() => report.projectName.length > 0, [report.projectName]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsLoading(true);
    setReport(emptyReport);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to analyze the project.");
      }

      const payload = (await response.json()) as AnalysisReport;
      setReport(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unknown error.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAgentSubmit() {
    if (!agentRequest.trim()) {
      return;
    }

    setAgentLoading(true);
    setAgentResponse(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: agentRequest, context: report })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to generate agent output.");
      }

      const payload = (await response.json()) as AgentResponse;
      setAgentResponse(payload);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Unknown error.";
      setAgentResponse({
        plan: [],
        diff: "",
        disclaimer: `Agent error: ${message}`
      });
    } finally {
      setAgentLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Upload your Replit zip</h2>
        <p>Upload the exported .zip file from Replit to analyze its stack.</p>
        <div className="upload">
          <input type="file" accept=".zip" onChange={handleUpload} />
          {isLoading && <span className="status">Analyzing...</span>}
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      {hasReport ? (
        <section className="card report">
          <h2>Project Report</h2>
          <div className="report-grid">
            <div>
              <h3>Project</h3>
              <p>{report.projectName}</p>
            </div>
            <div>
              <h3>Detected Stack</h3>
              <ul>
                {report.stacks.map((stack) => (
                  <li key={stack}>{stack}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Entry Points</h3>
              <ul>
                {report.entryPoints.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Scripts</h3>
              <ul>
                {report.scripts.map((script) => (
                  <li key={script.name}>
                    <strong>{script.name}</strong>: {script.command}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Environment Variables</h3>
              {report.envVars.length === 0 ? (
                <p>None detected.</p>
              ) : (
                <ul>
                  {report.envVars.map((envVar) => (
                    <li key={envVar}>{envVar}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>How to run</h3>
              <ol>
                {report.runInstructions.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
          {report.notes.length > 0 && (
            <div className="notes">
              <h3>Notes</h3>
              <ul>
                {report.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="card placeholder">
          <h2>Waiting for analysis</h2>
          <p>Upload a zip file to see the report.</p>
        </section>
      )}

      <section className="card">
        <div className="toggle-row">
          <h2>AI Agent (Phase 2)</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={phase2Enabled}
              onChange={(event) => setPhase2Enabled(event.target.checked)}
            />
            <span>Enable</span>
          </label>
        </div>
        <p>
          The AI Agent proposes a plan and patch for a requested change. It never runs code or
          executes shell commands.
        </p>
        {phase2Enabled ? (
          <div className="agent-panel">
            <textarea
              value={agentRequest}
              onChange={(event) => setAgentRequest(event.target.value)}
              placeholder="Ask for a change (example: add a new section to the report UI)."
              rows={4}
            />
            <button type="button" onClick={handleAgentSubmit} disabled={agentLoading}>
              {agentLoading ? "Generating..." : "Generate plan & patch"}
            </button>
            {agentResponse && (
              <div className="agent-output">
                <h3>Plan</h3>
                <ol>
                  {agentResponse.plan.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <h3>Patch (diff)</h3>
                <pre>{agentResponse.diff}</pre>
                <p className="disclaimer">{agentResponse.disclaimer}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">Enable the toggle to see the AI Agent panel.</p>
        )}
      </section>
    </div>
  );
}
