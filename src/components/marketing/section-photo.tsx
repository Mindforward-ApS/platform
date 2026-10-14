import { cx } from "@/components/ui/primitives";

// Photo beside a front-page section (Marco 14 Oct 2026): replaces the product mocks in "Øvemiljø" and "For virksomheder".
// The mocks (sandbox-mock.tsx, admin-mock.tsx) are kept so they can be put back.
export function SectionPhoto({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cx("relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
      <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover object-[70%_50%]" />
    </div>
  );
}
