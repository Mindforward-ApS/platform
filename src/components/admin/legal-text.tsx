import { Markdown } from "@/components/player/markdown";

// Legal Markdown (DPA): "#"/"##" headings as real headings, everything else through the safe module Markdown.
// Text nodes only — never HTML.

export function LegalText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-3 text-body text-ink [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1 [&_strong]:font-semibold [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
      {blocks.map((block, i) => {
        const [first = "", ...rest] = block.split("\n");
        const heading = /^(#{1,3})\s+(.*)$/.exec(first.trim());
        if (!heading) return <Markdown key={i} text={block} />;
        const level = heading[1]!.length;
        const title = heading[2]!;
        return (
          <div key={i} className="flex flex-col gap-2">
            {level === 1 ? (
              <h3 className="text-title-2 text-ink">{title}</h3>
            ) : (
              <h4 className={level === 2 ? "pt-3 text-title-3 text-ink" : "pt-2 text-label text-ink"}>{title}</h4>
            )}
            {rest.length > 0 && <Markdown text={rest.join("\n")} />}
          </div>
        );
      })}
    </div>
  );
}
