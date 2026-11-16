"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the current server page on an interval while the tab is visible, and right away when it becomes
// visible again. The server components re-read the data; nothing is cached in the browser.

export function LiveRefresh({ seconds, label, hint }: { seconds: number; label: string; hint: string }) {
  const router = useRouter();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(refreshIfVisible, seconds * 1000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router, seconds]);

  return (
    <p className="flex items-center gap-2 text-sm text-muted" title={hint} data-testid="live-refresh">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-success" />
      <span aria-live="polite">{label}</span>
    </p>
  );
}
