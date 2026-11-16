// Danish strings for Mindforward's internal customer overview (/admin/kunder, GREB_ADMIN only).
// Registered in da.ts as `ownerCustomers`.

export const daOwner = {
  navLink: "Kunder",
  title: "Kunder",
  live: "Live · opdateret {time}",
  liveHint: "Siden henter nye tal hvert {seconds}. sekund, mens den er åben.",
  kpi: {
    arr: "ARR mod målet",
    arrGoal: "{pct} % af {goal}",
    mrr: "MRR ekskl. moms",
    seats: "{count} betalende pladser",
    companies: "Virksomheder",
    privateCustomers: "+ {count} privatkunder",
    completion: "Gennemført i gennemsnit",
    completionHint: "Aktive brugere med mindst ét bestået modul",
  },
  table: {
    caption: "Alle kunder",
    company: "Virksomhed",
    seats: "Pladser",
    seatsValue: "{active} af {limit}",
    completion: "Medarbejdere gennemført",
    mrr: "MRR",
    status: "Status",
    privateRow: "Privatkunder ({count})",
    privatePaymentIssues: "{count} med betalingsproblem",
    privateOk: "Ingen problemer",
  },
  status: {
    ACTIVE: "Aktiv",
    ONBOARDING: "Onboarding",
    INACTIVE: "Inaktiv {days} dage",
    INACTIVE_NEVER: "Ingen aktivitet endnu",
    TRIAL: "Prøveperiode",
    PAYMENT_ISSUE: "Betaling mangler",
    CANCELING: "Opsagt, udløber",
    CANCELED: "Ophørt",
    NO_SUBSCRIPTION: "Ikke startet",
  },
  empty: "Ingen virksomhedskunder endnu. De første står her, så snart de opretter sig.",
  none: "—",
} as const;
