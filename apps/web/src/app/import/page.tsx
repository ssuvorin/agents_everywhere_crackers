"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MonoLabel } from "@/components/ui/MonoLabel";
import "./import.css";

type ImportResult = {
  ok: boolean;
  contacts: number;
  messages: number;
  embedded: number;
  skipped: string[];
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runImport() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Import"
      topbarMeta={<Badge tone="accent">LinkedIn export</Badge>}
    >
      <div className="cb-page">
        <header className="page-header">
          <div className="page-heading-block">
            <MonoLabel>Data import · LinkedIn archive</MonoLabel>
            <h1 className="page-title">Feed the brain your network.</h1>
            <p className="page-subtitle">
              Upload the LinkedIn data-export zip. We parse connections and
              messages, rebuild the relationship graph, and embed every message
              for semantic search — all through OpenRouter.
            </p>
          </div>
        </header>

        <section className="cb-import-panel">
          <div className="cb-import-steps">
            <div className="cb-step">
              <span className="cb-step-n">01</span>
              <div>
                <strong>Unzip &amp; parse</strong>
                <p>Connections.csv + messages.csv — contacts, roles, history.</p>
              </div>
            </div>
            <div className="cb-step">
              <span className="cb-step-n">02</span>
              <div>
                <strong>Rebuild the graph</strong>
                <p>Relationship heat from message volume and recency.</p>
              </div>
            </div>
            <div className="cb-step">
              <span className="cb-step-n">03</span>
              <div>
                <strong>Embed messages</strong>
                <p>OpenRouter text-embedding-3-small → semantic search index.</p>
              </div>
            </div>
          </div>

          <label className="cb-drop">
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="cb-drop-title">
              {file ? file.name : "Drop LinkedIn export zip here"}
            </span>
            <span className="cb-drop-sub">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB — ready`
                : "Settings → Data privacy → Get a copy of your data"}
            </span>
          </label>

          <div className="cb-import-actions">
            <Button
              variant="primary"
              onClick={runImport}
              disabled={!file || busy}
            >
              {busy ? "Importing…" : "Run import"}
            </Button>
            {result && (
              <a className="cb-graph-link" href="/graph">
                Open the graph →
              </a>
            )}
          </div>

          {error && (
            <div className="degraded-banner" role="alert">
              <span className="banner-mark">×</span>
              {error}
            </div>
          )}

          {result && (
            <dl className="cb-import-report">
              <div>
                <dt>Contacts</dt>
                <dd>{result.contacts}</dd>
              </div>
              <div>
                <dt>Messages parsed</dt>
                <dd>{result.messages}</dd>
              </div>
              <div>
                <dt>Embedded</dt>
                <dd>{result.embedded}</dd>
              </div>
              {result.skipped.length > 0 && (
                <div>
                  <dt>Skipped</dt>
                  <dd>{result.skipped.join(", ")}</dd>
                </div>
              )}
            </dl>
          )}
        </section>
      </div>
    </AppShell>
  );
}
