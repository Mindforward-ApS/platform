"use client";

import { useMemo, useState } from "react";
import { Badge, Button, cx } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { ConnectorId, Scope } from "@/server/sandbox/events";
import type { SandboxState } from "@/server/sandbox/reducer";
import { SbIcon } from "./sandbox-icons";
import type { CatalogItem, Intent } from "./types";

// Forbindelser as a catalog in the assistant apps' structure: "Dine forbindelser" / "Find flere", search, categories,
// connect → (simulated) sign-in → a mode per tool (Tillad altid / Spørg først / Blokeret). Connector names come from
// the catalog data as plain text. Nothing reaches a real service: a connector only opens Nordlys practice data.

const t = getMessages().sandbox;
type Emit = (intent: Intent) => void;
type Mode = "always" | "approval" | "blocked";

export const BACKEND_SCOPES: Record<ConnectorId, Scope[]> = {
  mail: ["mail.read", "mail.draft", "mail.send"],
  calendar: ["calendar.read", "calendar.write"],
  files: ["files.read", "files.write"],
  crm: ["crm.read", "crm.write"],
  sheet: ["sheet.read", "sheet.write"],
};

const PAGE = 30;

export function isLinked(state: SandboxState, id: string) {
  return (state.catalog?.linked ?? []).includes(id);
}

function currentModes(state: SandboxState, item: CatalogItem): Record<string, Mode> {
  const modes: Record<string, Mode> = {};
  for (const b of item.data) {
    const c = state.connectors[b];
    for (const s of BACKEND_SCOPES[b]) {
      const granted = c.connected && (c.via ?? []).includes(item.id) && c.scopes.includes(s);
      modes[s] = granted ? ((c.approval ?? []).includes(s) ? "approval" : "always") : isLinked(state, item.id) ? "blocked" : s.endsWith(".read") ? "always" : "approval";
    }
  }
  return modes;
}

function ModePicker({ scope, value, onChange }: { scope: Scope; value: Mode; onChange: (m: Mode) => void }) {
  const c = t.connectors.catalog;
  return (
    <div className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between" data-testid="tool-mode" data-scope={scope}>
      <span className="text-body-sm text-ink">{t.connectors.scopes[scope]}</span>
      <div role="radiogroup" aria-label={t.connectors.scopes[scope]} className="inline-flex shrink-0 rounded-full border border-line bg-sunken p-0.5">
        {(["always", "approval", "blocked"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={cx("h-8 rounded-full px-3 text-caption font-medium transition-colors", value === m ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-ink-muted hover:text-ink")}
          >
            {c.modes[m]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConnectDialog({ item, state, emit, editing, onClose }: { item: CatalogItem; state: SandboxState; emit: Emit; editing: boolean; onClose: () => void }) {
  const c = t.connectors.catalog;
  const [step, setStep] = useState<"signin" | "perms">(editing ? "perms" : "signin");
  const [modes, setModes] = useState<Record<string, Mode>>(() => currentModes(state, item));

  const save = () => {
    if (editing) for (const b of item.data) emit({ event: { type: "CONNECTOR_DISCONNECTED", payload: { connectorId: b, via: item.id } } });
    for (const b of item.data) {
      const scopes = BACKEND_SCOPES[b];
      const allowed = scopes.filter((s) => modes[s] !== "blocked");
      const approval = scopes.filter((s) => modes[s] === "approval");
      if (allowed.length > 0) emit({ event: { type: "CONNECTOR_PERMISSION_GRANTED", payload: { connectorId: b, scopes: allowed, via: item.id, approval } } });
      else emit({ event: { type: "CONNECTOR_PERMISSION_DENIED", payload: { connectorId: b, deniedScopes: scopes, via: item.id } } });
    }
    // Every catalog connector is recorded as linked (also those without Nordlys data, and with every tool blocked).
    emit({ event: { type: "SETTING_CHANGED", payload: { key: "connector-linked", value: item.id } } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="connect-title" data-testid="connect-dialog">
      <button type="button" aria-label={c.close} className="absolute inset-0 bg-night/40" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
        <div className="flex items-start gap-3 border-b border-line px-6 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sunken text-label text-ink ring-1 ring-line ring-inset" aria-hidden="true">
            {item.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <h3 id="connect-title" className="text-title-3 text-ink">
              {step === "signin" ? format(c.signInTitle, { name: item.name }) : format(c.permTitle, { name: item.name })}
            </h3>
            {item.madeBy && <span className="text-caption text-ink-subtle">{format(c.madeBy, { name: item.madeBy })}</span>}
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
          {step === "signin" ? (
            <>
              <p className="text-body-sm text-ink-muted">{format(c.signInBody, { name: item.name })}</p>
              <button type="button" onClick={() => setStep("perms")} className="flex items-center gap-3 rounded-lg border border-line-strong bg-surface px-4 py-3 text-left text-label text-ink hover:bg-sunken" data-testid="connect-signin">
                <span className="grid size-8 place-items-center rounded-full bg-sunken text-caption font-semibold text-ink" aria-hidden="true">
                  KL
                </span>
                {c.signInAs}
              </button>
            </>
          ) : item.data.length === 0 ? (
            <p className="text-body-sm text-ink-muted">{format(c.noDataBody, { name: item.name })}</p>
          ) : (
            <>
              <p className="text-body-sm text-ink-muted">{c.permLead}</p>
              <div className="flex flex-col">
                {item.data.flatMap((b) => BACKEND_SCOPES[b]).map((s) => (
                  <ModePicker key={s} scope={s} value={modes[s] ?? "always"} onChange={(m) => setModes((x) => ({ ...x, [s]: m }))} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line bg-sunken px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            {c.cancel}
          </Button>
          {step === "perms" && (
            <Button type="button" onClick={save} data-testid="connect-save">
              {editing ? c.saveChanges : c.save}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ item, state, onConnect, onEdit, onDisconnect }: { item: CatalogItem; state: SandboxState; onConnect: () => void; onEdit: () => void; onDisconnect: () => void }) {
  const c = t.connectors.catalog;
  const linked = isLinked(state, item.id);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5" data-testid="catalog-connector" data-id={item.id}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sunken text-label text-ink ring-1 ring-line ring-inset" aria-hidden="true">
        {item.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-label text-ink">{item.name}</span>
          {linked && (
            <Badge tone="success" icon="check">
              {c.connectedBadge}
            </Badge>
          )}
        </span>
        <span className="text-caption text-ink-subtle">
          {format(c.madeBy, { name: item.madeBy })} · {item.categories[0]}
          {item.data.length > 0 ? ` · ${c.practiceData}` : ""}
        </span>
      </div>
      {linked ? (
        <span className="flex gap-2">
          {item.data.length > 0 && (
            <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
              {c.settings}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onDisconnect}>
            {c.disconnect}
          </Button>
        </span>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={onConnect} aria-label={`${c.connect} ${item.name}`}>
          {c.connect}
        </Button>
      )}
    </li>
  );
}

/** Records the start of a connect (the dialog then grants or cancels). */
export function startConnect(item: CatalogItem, emit: Emit) {
  if (item.data[0]) emit({ event: { type: "CONNECTOR_CONNECT_STARTED", payload: { connectorId: item.data[0], via: item.id } } });
  else emit({ event: { type: "UI_CLICKED", target: `connectors.${item.id}.connect`, payload: { region: "connectors", control: `${item.id}.connect` } } });
}

export function disconnectItem(item: CatalogItem, emit: Emit) {
  for (const b of item.data) emit({ event: { type: "CONNECTOR_DISCONNECTED", payload: { connectorId: b, via: item.id } } });
  emit({ event: { type: "SETTING_CHANGED", payload: { key: "connector-unlinked", value: item.id } } });
}

export function ConnectorCatalog({ catalog, state, emit }: { catalog: CatalogItem[]; state: SandboxState; emit: Emit }) {
  const c = t.connectors.catalog;
  const linkedCount = (state.catalog?.linked ?? []).length;
  const [tab, setTab] = useState<"connected" | "discover">(linkedCount > 0 ? "connected" : "discover");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [dialog, setDialog] = useState<{ item: CatalogItem; editing: boolean } | null>(null);

  const categories = useMemo(() => {
    const n = new Map<string, number>();
    for (const i of catalog) for (const k of i.categories) n.set(k, (n.get(k) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  }, [catalog]);

  const needle = q.trim().toLocaleLowerCase("da");
  const filtered = catalog.filter((i) => (!cat || i.categories.includes(cat)) && (!needle || `${i.name} ${i.madeBy}`.toLocaleLowerCase("da").includes(needle)));
  const featured = !needle && !cat ? filtered.filter((i) => i.featured > 0) : [];
  const rest = !needle && !cat ? filtered.filter((i) => i.featured === 0) : filtered;
  const connected = catalog.filter((i) => isLinked(state, i.id));

  const connect = (item: CatalogItem) => {
    startConnect(item, emit);
    setDialog({ item, editing: false });
  };
  const disconnect = (item: CatalogItem) => disconnectItem(item, emit);
  const row = (i: CatalogItem) => <Row key={i.id} item={i} state={state} onConnect={() => connect(i)} onEdit={() => setDialog({ item: i, editing: true })} onDisconnect={() => disconnect(i)} />;
  const list = "divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface";

  return (
    <section className="flex flex-col gap-4" data-testid="connector-catalog">
      <p className="text-body-sm text-ink-muted">{c.lead}</p>
      <div role="tablist" className="flex gap-5 border-b border-line text-label">
        {(["connected", "discover"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("-mb-px border-b-2 pb-2.5", tab === k ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
            {k === "connected" ? `${c.tabConnected}${linkedCount ? ` (${linkedCount})` : ""}` : c.tabDiscover}
          </button>
        ))}
      </div>

      {tab === "connected" ? (
        connected.length ? <ul className={list}>{connected.map(row)}</ul> : <p className="text-body-sm text-ink-muted">{c.noneConnected}</p>
      ) : (
        <>
          <label className="relative block">
            <span className="sr-only">{c.search}</span>
            <SbIcon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={c.search}
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-body-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
              data-testid="catalog-search"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[null, ...categories].map((k) => (
              <button
                key={k ?? "all"}
                type="button"
                aria-pressed={cat === k}
                onClick={() => {
                  setCat(k);
                  setLimit(PAGE);
                }}
                className={cx("h-8 rounded-full px-3 text-caption font-medium ring-1 ring-inset", cat === k ? "bg-ink text-on-accent ring-ink" : "bg-surface text-ink-muted ring-line hover:text-ink")}
              >
                {k ?? c.all}
              </button>
            ))}
          </div>
          {featured.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-overline text-ink-subtle uppercase">{c.featured}</p>
              <ul className={list}>{featured.map(row)}</ul>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-caption text-ink-subtle">{format(c.results, { count: rest.length })}</p>
            {rest.length ? <ul className={list}>{rest.slice(0, limit).map(row)}</ul> : <p className="text-body-sm text-ink-muted">{c.noResults}</p>}
            {rest.length > limit && (
              <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setLimit((l) => l + PAGE)}>
                {c.showMore}
              </Button>
            )}
          </div>
        </>
      )}
      {dialog && <ConnectDialog key={dialog.item.id} item={dialog.item} state={state} emit={emit} editing={dialog.editing} onClose={() => setDialog(null)} />}
    </section>
  );
}
