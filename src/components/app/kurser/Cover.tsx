// Course cover: real photo where we have one, otherwise the CourseThumb tile. Photos are placeholders.
import Image from "next/image";
import { CourseThumb } from "@/components/app/CourseThumb";
import { covers } from "@/content/kurser-view";

export function Cover({ slug, sizes, className = "", icon = 40, zoom = true }: { slug: string; sizes: string; className?: string; icon?: number; zoom?: boolean }) {
  const src = covers[slug];
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className={`object-cover ${zoom ? "transition-transform duration-500 group-hover:scale-[1.04]" : ""}`} />
      ) : (
        <CourseThumb slug={slug} size={icon} className="!absolute inset-0" />
      )}
    </div>
  );
}
