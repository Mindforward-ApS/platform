"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icons";

/** Submit button for destructive or quiet admin actions (danger / ghost look) that disables itself while pending.
 *  The shared SubmitButton only offers primary/secondary. */
export function AdminSubmit({
  variant = "danger",
  size = "md",
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "danger" | "ghost" | "secondary" | "primary"; size?: "sm" | "md"; icon?: IconName }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} size={size} icon={icon} aria-disabled={pending} disabled={pending || props.disabled} {...props} />;
}
