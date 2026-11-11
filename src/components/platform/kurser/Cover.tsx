// Course cover photo (approved placeholders, see covers.ts).
import Image from "next/image";
import { coverFor } from "./covers";

export function Cover({ slug, sizes, className = "", zoom = true }: { slug: string; sizes: string; className?: string; zoom?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={coverFor(slug)} alt="" fill sizes={sizes} className={`object-cover ${zoom ? "transition-transform duration-500 group-hover:scale-[1.04]" : ""}`} />
    </div>
  );
}
