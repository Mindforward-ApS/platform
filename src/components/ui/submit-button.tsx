"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./primitives";

/** Submit button that disables itself while its form is pending, so a double click cannot submit twice. */
export function SubmitButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" aria-disabled={pending} disabled={pending || props.disabled} {...props} />;
}
