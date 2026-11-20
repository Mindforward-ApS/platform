import type { IllustrationName } from "@/lib/config/illustrations";
import { cx } from "./primitives";

/** A 3D clay object (decorative). Soft drop shadow gives it depth on any tinted ground. */
export function Illustration({ name, className = "", priority = false }: { name: IllustrationName; className?: string; priority?: boolean }) {
  return (
    // Static, tiny (2–6 KB) transparent WebPs from /public; next/image adds nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.webp`}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cx("pointer-events-none object-contain drop-shadow-object select-none", className)}
    />
  );
}
