import type { Metadata } from "next";
import Link from "next/link";
import { CaretDownIcon, ChatCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Card, PageHeader } from "@/components/app/ui";
import { faq } from "@/content/platform";

export const metadata: Metadata = { title: "Hjælp" };

export default function HjaelpPage() {
  return (
    <>
      <PageHeader title="Hjælp" sub="Svar på det, vi oftest bliver spurgt om. Finder du ikke svaret, så skriv til os." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          {faq.map((f, i) => (
            <details key={f.q} className={`group ${i ? "border-t border-[var(--border)]" : ""}`} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.875rem] font-semibold text-heading [&::-webkit-details-marker]:hidden">
                {f.q}
                <CaretDownIcon size={14} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="-mt-1 max-w-2xl px-5 pb-4 text-[0.8125rem] leading-relaxed text-text">{f.a}</p>
            </details>
          ))}
        </Card>
        <Card dark className="self-start p-5">
          <h2 className="text-[0.9375rem] font-semibold text-white">Har du et andet spørgsmål?</h2>
          <p className="mt-1 text-[0.75rem] text-[#b8a8a1]">Vi svarer på hverdage, som regel samme dag.</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link href="/beskeder" className="app-btn w-full bg-white text-[var(--ink)] hover:bg-[#f3eeeb]"><ChatCircleIcon size={15} /> Skriv til os</Link>
          </div>
        </Card>
      </div>
    </>
  );
}
