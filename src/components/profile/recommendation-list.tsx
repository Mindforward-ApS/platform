"use client";

import { useState } from "react";
import { AppIcon, Icon } from "@/components/ui/icons";
import { Badge, Button, ButtonLink } from "@/components/ui/primitives";
import { streamProfileDemo } from "./demo-api";
import { DemoPanel, type DemoPanelData, type DemoPanelText } from "./demo-panel";

export interface RecommendationCard {
  id: string;
  name: string;
  status: "OFFICIAL" | "THIRD_PARTY";
  sourceUrl: string | null;
  useCase: string | null;
  coveredTasks: string[];
  matchedSystems: string[];
  demo: DemoPanelData | null;
}

export interface RecommendationText {
  official: string;
  thirdParty: string;
  covers: string;
  usesYourSystem: string;
  source: string;
  tryIt: string;
  tryLocked: string;
  demo: DemoPanelText;
}

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

export function RecommendationList({ items, platform, platformName, canDemo, t }: { items: RecommendationCard[]; platform: string; platformName: string; canDemo: boolean; t: RecommendationText }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="flex flex-col gap-4" data-testid="recommendations">
      {items.map((c, i) => (
        <li key={c.id} className="flex flex-col gap-4">
          <article data-spot className="flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-start sm:p-6">
            <div className="flex items-center gap-3 sm:flex-col sm:items-center">
              <span className="font-mono text-mono text-ink-subtle">{String(i + 1).padStart(2, "0")}</span>
              <AppIcon name="link" tone={i === 0 ? "blue" : i === 1 ? "mint" : "sky"} size="md" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-title-3 text-ink">{c.name}</h3>
                <Badge tone={c.status === "OFFICIAL" ? "success" : "neutral"} icon={c.status === "OFFICIAL" ? "check" : undefined}>
                  {fill(c.status === "OFFICIAL" ? t.official : t.thirdParty, { platform: platformName })}
                </Badge>
              </div>
              {c.useCase && <p className="text-body text-ink-muted">{c.useCase}</p>}
              <div className="flex flex-wrap items-center gap-2 text-body-sm">
                <span className="text-ink-subtle">{t.covers}:</span>
                {c.coveredTasks.map((task) => (
                  <Badge key={task}>{task}</Badge>
                ))}
                {c.matchedSystems.map((s) => (
                  <Badge key={s} tone="accent">
                    {fill(t.usesYourSystem, { system: s })}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {c.demo &&
                  (canDemo ? (
                    <Button type="button" size="sm" icon="sparkle" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                      {t.tryIt}
                    </Button>
                  ) : (
                    <ButtonLink href="/priser" size="sm" variant="secondary" icon="lock">
                      {t.tryLocked}
                    </ButtonLink>
                  ))}
                {c.sourceUrl && (
                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-body-sm font-medium text-accent underline decoration-accent/30 underline-offset-[3px] hover:text-accent-hover">
                    {fill(t.source, { platform: platformName })}
                    <Icon name="external" size={14} />
                  </a>
                )}
              </div>
            </div>
          </article>
          {open === c.id && c.demo && <DemoPanel demo={c.demo} stream={(prompt, onDelta) => streamProfileDemo(c.demo!.demoId, { prompt, platform }, onDelta)} sourceUrl={c.sourceUrl} t={{ ...t.demo, label: fill(t.demo.label, { platform: platformName }), setup: fill(t.demo.setup, { platform: platformName }), note: fill(t.demo.note, { platform: platformName }) }} onClose={() => setOpen(null)} />}
        </li>
      ))}
    </ol>
  );
}
