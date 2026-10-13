import type { ReactNode } from "react";

// Minimal, safe Markdown for module text (paragraphs, "1." / "-" lists, **bold**). Renders React text nodes
// only — never HTML — so module content cannot inject markup.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i} className="list-decimal pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }
        if (lines.length > 0 && lines.every((l) => /^[-*]\s/.test(l))) {
          return (
            <ul key={i} className="list-disc pl-6">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
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
