"use client";

import { Button } from "@/components/ui/primitives";

/** Opens the browser's print dialog (the certificate page has print styles). */
export function PrintButton({ children }: { children: string }) {
  return (
    <Button type="button" variant="secondary" size="sm" icon="file" onClick={() => window.print()}>
      {children}
    </Button>
  );
}
