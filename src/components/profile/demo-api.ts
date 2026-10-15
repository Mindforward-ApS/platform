// Client helper for "Prøv den" on /profil/anbefalinger (the øvemiljø uses its own /api/sandbox endpoint instead).

/** Streams the demo answer; returns an error message, "" for a generic error, or null on success. */
export async function streamProfileDemo(demoId: string, body: { prompt: string; platform: string }, onDelta: (t: string) => void): Promise<string | null> {
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
