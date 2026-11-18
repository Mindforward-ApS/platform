import Link from "next/link";
import { BellIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { MobileNav } from "./MobileNav";
import { learner } from "@/content/platform";
import { RoleLabel } from "./RoleBits";

export function TopBar() {
  return (
    <div className="app-card flex items-center justify-between gap-3 !rounded-[14px] px-3 py-2.5">
      <MobileNav />
      <label className="flex h-9 w-full max-w-md items-center gap-2 rounded-[10px] bg-[var(--bg)] px-3 text-[0.8125rem]">
        <MagnifyingGlassIcon size={16} className="text-muted" />
        <input placeholder="Søg efter kurser, emner eller opgaver …" className="w-full bg-transparent text-heading outline-none placeholder:text-muted" />
      </label>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/beskeder" aria-label="Notifikationer" className="relative grid h-9 w-9 place-items-center text-heading">
          <BellIcon size={20} />
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--coral)] px-1 text-[0.5625rem] font-bold text-white">3</span>
        </Link>
        {/* Initials, not a face: no invented people. */}
        <Link href="/indstillinger" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--ink)] text-[0.75rem] font-semibold text-white">{learner.initials}</span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-[0.8125rem] font-semibold text-heading">{learner.name}</span>
            <span className="block text-[0.6875rem] text-muted"><RoleLabel /></span>
          </span>
        </Link>
      </div>
    </div>
  );
}
