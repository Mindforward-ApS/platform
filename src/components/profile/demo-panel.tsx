"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Button, buttonClass, Notice } from "@/components/ui/primitives";

// "Prøv den": 1) the fictional data the connector "sees", 2) the prompt (editable), 3) the answer, streamed live.
// Always labelled as a demo; never claims to run in the learner's ChatGPT or Copilot.

export interface DemoPanelData {
  demoId: string;
  title: string;
  prompt: string;
  data: Record<string, Record<string, string | number | boolean>[]>;
}

export interface DemoPanelText {
  label: string;
  dataTitle: string;
  promptTitle: string;
  run: string;
  rerun: string;
  resultTitle: string;
  running: string;
  setup: string;
  close: string;
  note: string;
  generic: string;
}

async function streamDemo(demoId: string, body: { prompt: string; platform: string }, onDelta: (t: string) => void): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`/api/connectors/demo/${encodeURIComponent(demoId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return null;
  }
  if (!res.ok || !res.body) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    return err?.message ?? "";
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let failure: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine) as { text?: string; message?: string };
      if (event === "delta") onDelta(data.text ?? "");
      else if (event === "error") failure = data.message ?? "";
    }
  }
  return failure;
}

function DataPreview({ data }: { data: DemoPanelData["data"] }) {
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(data).map(([group, rows]) => (
        <div key={group} className="flex flex-col gap-2">
          <p className="text-caption font-medium tracking-[0.04em] text-ink-subtle uppercase">{group}</p>
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2.5 text-body-sm text-ink">
                {Object.entries(r).map(([k, v]) => (
                  <span key={k} className="block">
                    <span className="text-ink-subtle">{k}: </span>
                    {String(v)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function DemoPanel({ demo, platform, sourceUrl, t, onClose }: { demo: DemoPanelData; platform: string; sourceUrl: string | null; t: DemoPanelText; onClose: () => void }) {
  const [prompt, setPrompt] = useState(demo.prompt);
  const [answer, setAnswer] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ran, setRan] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setAnswer("");
    const failure = await streamDemo(demo.demoId, { prompt, platform }, (d) => setAnswer((a) => a + d));
    setRunning(false);
    setRan(true);
    if (failure !== null) setError(failure || t.generic);
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-accent/30 bg-surface p-5 shadow-lg sm:p-6" data-testid="demo-panel" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-title-3 text-ink">{demo.title}</p>
          <p className="flex items-start gap-1.5 text-body-sm text-accent-ink">
            <Icon name="info" className="mt-0.5 shrink-0" />
            {t.label}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={t.close} icon="x">
          <span className="sr-only">{t.close}</span>
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex max-h-96 flex-col gap-2 overflow-y-auto rounded-xl bg-sunken p-4">
          <p className="text-label text-ink">{t.dataTitle}</p>
          <DataPreview data={demo.data} />
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-label text-ink">{t.promptTitle}</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              className="min-h-28 rounded-md border border-line-strong/50 bg-surface px-3 py-2.5 text-body-sm leading-relaxed text-ink outline-none focus:border-accent focus:shadow-ring"
            />
          </label>
          <div>
            <Button type="button" onClick={run} disabled={running || !prompt.trim()} icon="sparkle">
              {running ? t.running : ran ? t.rerun : t.run}
            </Button>
          </div>
          {(answer || running) && (
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-4">
              <p className="text-label text-ink">{t.resultTitle}</p>
              <p className="text-body-sm leading-relaxed whitespace-pre-wrap text-ink">{answer || t.running}</p>
            </div>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          {ran && !error && sourceUrl && (
            <a className={buttonClass("secondary", "md", "self-start")} href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {t.setup}
              <Icon name="external" />
            </a>
          )}
        </div>
      </div>
      <p className="text-caption text-ink-subtle">{t.note}</p>
    </section>
  );
}
