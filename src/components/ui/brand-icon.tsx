// Vendor marks next to the track names (Marco's decision 14 Oct 2026, against the spec's default rule — see
// docs/00-beslutninger.md § 10d and OPEN-QUESTIONS). Only beside the track names in our own navigation;
// never inside the sandbox chrome, never as if the vendor endorsed Mindforward.

export type BrandKey = "chatgpt" | "copilot" | "claude";

const ROUNDED: Record<BrandKey, string> = {
  chatgpt: "rounded-lg",
  claude: "",
  copilot: "",
};

export function BrandIcon({ brand, size = 28, className = "" }: { brand: BrandKey; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static WebP from /public
    <img
      src={`/brands/${brand}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 object-contain select-none ${ROUNDED[brand]} ${className}`}
    />
  );
}
