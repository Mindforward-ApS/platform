import type { ReactNode } from "react";

// Minimal, safe Markdown for module text (paragraphs, "1." / "-" lists, **bold**). Renders React text nodes
// only — never HTML — so module content cannot inject markup. A block may mix a lead line with a list below it.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

type Kind = "ol" | "ul" | "p";
const kindOf = (line: string): Kind => (/^\d+\.\s/.test(line) ? "ol" : /^[-*]\s/.test(line) ? "ul" : "p");

/** Consecutive lines of the same kind form one run (a paragraph or one list). */
function runs(lines: string[]): { kind: Kind; lines: string[] }[] {
  const out: { kind: Kind; lines: string[] }[] = [];
  for (const line of lines) {
    const kind = kindOf(line);
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else out.push({ kind, lines: [line] });
  }
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).flatMap((block) => runs(block.split("\n").filter((l) => l.trim() !== "")));
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((run, i) => {
        if (run.kind === "ol") {
          return (
            <ol key={i} className="flex list-decimal flex-col gap-2 pl-6 marker:font-mono marker:text-mono marker:text-ink-subtle">
              {run.lines.map((l, j) => (
                <li key={j} className="pl-1">
                  {inline(l.replace(/^\d+\.\s/, ""))}
                </li>
              ))}
            </ol>
          );
        }
        if (run.kind === "ul") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-2 pl-6 marker:text-ink-subtle">
              {run.lines.map((l, j) => (
                <li key={j} className="pl-1">
                  {inline(l.replace(/^[-*]\s/, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {run.lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
