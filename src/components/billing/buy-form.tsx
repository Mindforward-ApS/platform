"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/ui/icons";
import { Button, Check } from "@/components/ui/primitives";

// B2C checkout form (docs/07-betaling.md § 8.1): two UNTICKED declarations, the price in bold directly
// above the button, button text exactly "Køb". Price text arrives formatted from config/DB (never written here).
export function BuyForm(props: {
  action: (formData: FormData) => void | Promise<void>;
  immediateAccessText: string;
  withdrawalLossAckText: string;
  renewLine: string;
  price: string;
  buyLabel: string;
  requiredHint: string;
  legend: string;
}) {
  const [immediate, setImmediate] = useState(false);
  const [ack, setAck] = useState(false);
  const ready = immediate && ack;
  return (
    <form action={props.action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-4 text-label text-ink">{props.legend}</legend>
        <Check name="immediateAccess" value="on" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} required label={props.immediateAccessText} />
        <Check name="withdrawalLossAck" value="on" checked={ack} onChange={(e) => setAck(e.target.checked)} required label={props.withdrawalLossAckText} />
      </fieldset>
      <p aria-live="polite" className="flex items-start gap-2 text-body-sm text-ink-muted empty:hidden">
        {!ready && (
          <>
            <Icon name="info" className="mt-0.5" />
            {props.requiredHint}
          </>
        )}
      </p>
      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <p className="text-body-sm text-ink-muted">{props.renewLine}</p>
        <p data-testid="checkout-price" className="text-title-3 text-ink">
          <strong className="font-semibold">{props.price}</strong>
        </p>
        <BuyButton disabled={!ready}>{props.buyLabel}</BuyButton>
      </div>
    </form>
  );
}

function BuyButton({ disabled, children }: { disabled: boolean; children: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={disabled || pending} aria-disabled={disabled || pending}>
      {children}
    </Button>
  );
}
