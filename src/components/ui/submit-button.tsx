"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./primitives";

/** Submit button that disables itself while its form is pending, so a double click cannot submit twice. */
export function SubmitButton(props: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" aria-disabled={pending} disabled={pending || props.disabled} {...props} />;
}
