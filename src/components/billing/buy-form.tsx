"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

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
}) {
  const [immediate, setImmediate] = useState(false);
  const [ack, setAck] = useState(false);
  const ready = immediate && ack;
  return (
    <form action={props.action} className="flex flex-col gap-3">
      <label className="flex items-start gap-2">
        <input type="checkbox" name="immediateAccess" value="on" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} required />
        <span>{props.immediateAccessText}</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="withdrawalLossAck" value="on" checked={ack} onChange={(e) => setAck(e.target.checked)} required />
        <span>{props.withdrawalLossAckText}</span>
      </label>
      {!ready && <p className="text-sm text-muted">{props.requiredHint}</p>}
      <p className="text-sm">{props.renewLine}</p>
      <p data-testid="checkout-price">
        <strong>{props.price}</strong>
      </p>
      <SubmitButton disabled={!ready}>{props.buyLabel}</SubmitButton>
    </form>
  );
}
