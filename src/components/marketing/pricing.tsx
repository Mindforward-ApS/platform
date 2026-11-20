import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Badge, ButtonLink, cx } from "@/components/ui/primitives";
import { billingRules, plans, type PlanConfig } from "@/lib/config/plans";
import { format, getMessages } from "@/lib/i18n";
import { planPrice } from "@/server/billing/vat";

// Landing-page price cards. Every amount comes from src/lib/config/plans.ts (CLAUDE.md: never hardcode prices).
// B2C is shown incl. VAT; B2B per seat excl. VAT with the VAT-inclusive figure next to it (docs/07 § 2).

const kr = (ore: number) =>
  `${new Intl.NumberFormat("da-DK", { minimumFractionDigits: ore % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(ore / 100)} kr.`;

function plan(key: PlanConfig["key"]): PlanConfig {
  const found = plans.find((p) => p.key === key);
  if (!found) throw new Error(`Missing plan ${key}`);
  return found;
}

function Feature({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-body-sm text-ink">
      <Icon name="check" className="mt-0.5 text-accent" />
      <span>{children}</span>
    </li>
  );
}

function PriceCard({
  name,
  badge,
  price,
  unit,
  sub,
  description,
  features,
  note,
  cta,
  featured = false,
}: {
  name: string;
  badge?: string;
  price: string;
  unit: string;
  sub?: ReactNode;
  description: string;
  features: string[];
  note?: string;
  cta: ReactNode;
  featured?: boolean;
}) {
  return (
    <article className={cx("flex flex-col rounded-lg border bg-surface", featured ? "border-accent shadow-ring" : "border-line")}>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex min-h-[22px] items-center justify-between gap-3">
          <h3 className="text-title-3 text-ink">{name}</h3>
          {badge && <Badge tone="accent">{badge}</Badge>}
        </div>
        <p className="text-body-sm text-ink-muted">{description}</p>
        <div className="flex flex-col gap-1">
          <p className="text-display text-ink">{price}</p>
          <p className="text-body-sm text-ink-muted">{unit}</p>
          <div className="text-caption text-ink-subtle lg:min-h-8">{sub}</div>
        </div>
        {cta}
      </div>
      <div className="flex flex-1 flex-col gap-4 border-t border-line p-6">
        <ul className="flex flex-col gap-3">
          {features.map((f) => (
            <Feature key={f}>{f}</Feature>
          ))}
        </ul>
        {note && <p className="mt-auto rounded-md bg-sunken px-4 py-3 text-body-sm text-ink-muted">{note}</p>}
      </div>
    </article>
  );
}

export function Pricing() {
  const t = getMessages().marketing.pricing;
  const personal = plan("B2C_MONTHLY");
  const monthly = plan("B2B_MONTHLY");
  const annual = plan("B2B_ANNUAL");
  const seat = planPrice(monthly, 1);
  const vars = {
    count: billingRules.b2cFreeModules,
    days: billingRules.withdrawalDays,
    min: monthly.minSeats,
    users: monthly.trialMaxSeats ?? billingRules.b2bTrialMaxUsers,
  };
  const trialDays = monthly.trialDays;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <PriceCard
          name={t.free.name}
          price={kr(plan("FREE").unitAmountOre)}
          unit={t.free.unit}
          description={t.free.description}
          features={t.free.features.map((f) => format(f, vars))}
          cta={
            <ButtonLink href="/niveautest" variant="secondary" className="w-full">
              {t.free.cta}
            </ButtonLink>
          }
        />
        <PriceCard
          name={t.personal.name}
          price={kr(planPrice(personal, 1).grossOre)}
          unit={t.personal.unit}
          description={t.personal.description}
          features={t.personal.features.map((f) => format(f, vars))}
          note={t.personal.cancel}
          cta={
            <ButtonLink href="/koeb" variant="secondary" className="w-full">
              {t.personal.cta}
            </ButtonLink>
          }
        />
        <PriceCard
          featured
          name={t.business.name}
          badge={format(t.business.badge, { days: trialDays })}
          price={kr(seat.netOre)}
          unit={t.business.unit}
          sub={
            <>
              <span className="block">{format(t.business.inclVat, { amount: kr(seat.grossOre) })}</span>
              <span className="block">{format(t.business.annual, { amount: kr(planPrice(annual, 1).netOre) })}</span>
            </>
          }
          description={format(t.business.description, vars)}
          features={t.business.features.map((f) => format(f, { ...vars, days: trialDays }))}
          cta={
            <ButtonLink href="/virksomhed/opret" className="w-full" trailingIcon="arrowRight">
              {t.business.cta}
            </ButtonLink>
          }
        />
      </div>
      <p className="text-caption text-ink-subtle">{t.note}</p>
    </div>
  );
}
