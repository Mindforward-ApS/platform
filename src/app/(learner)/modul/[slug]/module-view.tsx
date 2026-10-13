"use client";

import { useState, useTransition } from "react";
import { ModulePlayer, type PlayerServerActions } from "@/components/player/module-player";
import { Button, Notice } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import type { PlayerState } from "@/server/modules/player-types";
import { checkClickTaskAction, finishAttemptAction, skipClickTaskAction, startAttemptAction, submitAnswerAction, takeHintAction } from "./actions";

const t = getMessages().player;

const actions: PlayerServerActions = {
  start: startAttemptAction,
  answer: submitAnswerAction,
  hint: takeHintAction,
  checkClick: checkClickTaskAction,
  skipClick: skipClickTaskAction,
  finish: finishAttemptAction,
};

export function ModuleView({ slug, initial }: { slug: string; initial: PlayerState | null }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state) return <ModulePlayer key={state.attemptId} initial={state} actions={actions} />;
  return (
    <div className="flex flex-col gap-2">
      {error && <Notice tone="error">{error}</Notice>}
      <div>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await startAttemptAction(slug);
              if (r.ok) setState(r.state);
              else setError((t.errors as Record<string, string>)[r.error] ?? t.errors.generic);
            })
          }
        >
          {t.intro.start}
        </Button>
      </div>
    </div>
  );
}
