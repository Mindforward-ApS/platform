"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icons";

/** SubmitButton with the danger look (the shared SubmitButton only offers primary/secondary). */
export function DangerSubmitButton({ icon, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="danger" icon={icon} aria-disabled={pending} disabled={pending || props.disabled} {...props} />;
}
