// Danish UI strings for the public landing page (/) and shared marketing presentation (help center chrome,
// legal page table of contents). Registered in ./da.ts as `marketing`.
// Rules (CLAUDE.md ALDRIG): no "certificering", no legal-requirement or fine claims, no invented numbers, customers,
// quotes or logos, no vendor logos/colors. Prices are NEVER written here — they come from src/lib/config/plans.ts.

export const daMarketing = {
  hero: {
    eyebrow: "Øvebane for AI på jobbet",
    title: "Lær AI ved at gøre det.",
    lead: "Mindforward lærer dig ChatGPT, Microsoft 365 Copilot og Claude gennem rigtige arbejdsopgaver i et øvemiljø. Du får en forklaret score, hjælp når du sidder fast, og en kort genopfriskning hver måned.",
    primary: "Tag den gratis niveautest",
    secondary: "Til virksomheder",
    facts: ["Ca. 5 minutter", "Ingen email krævet", "Gratis"],
  },
  playerMock: {
    figureLabel: "Eksempel på et opgavetrin i Mindforward",
    caption: "Eksempel fra modulet \"Din første gode prompt\"",
    module: "Din første gode prompt",
    step: "Trin 5 af 8",
    stepType: "Skriv en prompt",
    taskLabel: "Opgave",
    task: "Bølgegrøn Kaffe har fået tre leverancer for sent og overvejer at skifte leverandør. Skriv en prompt, der får AI'en til at lave et udkast til et svar. Du må ikke love rabat.",
    promptLabel: "Din prompt",
    prompt:
      "Skriv et udkast til et svar til Hanne, indkøbschef hos Bølgegrøn Kaffe. Tre leverancer er kommet for sent, fordi vores fragtpartner er forsinket. Næste levering kommer fredag kl. 7–10. Tonen skal være rolig og ansvarlig. Maks 120 ord. Lov ikke rabat eller kompensation.",
    chars: "{count} / 2.000 tegn",
    attempt: "Forsøg 1 af 3",
    hint: "Brug for hjælp?",
    submitted: "Indsendt",
    scoreTitle: "Din score",
    passed: "Bestået",
    criterionScore: "{score} af {max}",
    passRule: "Bestået ved 80 %. Det bedste forsøg tæller.",
    criteria: [
      { label: "Tydelig opgave", feedback: "Du beder klart om et udkast til et svar.", score: 2, weight: 2 },
      { label: "Relevant kontekst", feedback: "Næste levering og årsagen er med.", score: 2, weight: 2 },
      { label: "Målgruppe og tone", feedback: "Modtager og tone er tydelige.", score: 2, weight: 1 },
      { label: "Format", feedback: "Længden er angivet.", score: 2, weight: 1 },
      { label: "Begrænsninger", feedback: "Godt, at rabat er udelukket. Nævn også, hvem der afgør kompensation.", score: 1, weight: 1 },
    ],
  },
  tracksStrip: {
    label: "Spor til",
  },
  how: {
    eyebrow: "Sådan virker det",
    title: "Fra første test til fast vane",
    lead: "Korte trin, der passer ind i en arbejdsdag. Du lærer ved at prøve — ikke ved at se video.",
    steps: [
      {
        title: "Niveautest",
        body: "{questions} spørgsmål på ca. 5 minutter viser, hvor du står inden for fem områder — fra prompting til datasikkerhed.",
      },
      {
        title: "Personlig plan",
        body: "Du får en plan i den rækkefølge, der giver mening for dig: grundlaget først, så din rolle, så de avancerede emner.",
      },
      {
        title: "Opgaver i en sandkasse",
        body: "Du løser rigtige opgaver for den fiktive virksomhed Nordlys Logistik. Fejl er gratis, og ingen rigtige data er i spil.",
      },
      {
        title: "Score og hints",
        body: "Hver opgave får en forklaret score. Sidder du fast, hjælper hints dig videre i tre trin.",
      },
      {
        title: "Månedlig genopfriskning",
        body: "Hver måned får du en kort pakke med nyt i dit værktøj og én genopfriskning. Højst 15 minutter.",
      },
    ],
  },
  sandbox: {
    eyebrow: "Øvemiljøet",
    title: "Øv på en virksomhed, der ikke findes",
    lead: "Nordlys Logistik ApS er et fiktivt lager- og distributionsfirma i Aarhus med en fuld indbakke, kalender, filer, kunder og budget. Her øver du det, du skal bruge på jobbet — uden risiko.",
    points: [
      {
        title: "Øvemodel svarer",
        body: "Svarene kommer fra vores egen øvemodel, ikke fra ChatGPT, Copilot eller Claude. Du lærer de arbejdsgange, der går igen i værktøjerne.",
      },
      {
        title: "Persondata bliver stoppet",
        body: "Skriver du et CPR-, kort- eller kontonummer, advarer eller blokerer øvemiljøet, før noget bliver sendt.",
      },
      {
        title: "Begreber frem for knapper",
        body: "Pensum bygger på begreber som egne assistenter, forbindelser og planlagte opgaver, så det, du lærer, holder, når værktøjerne skifter.",
      },
    ],
    mock: {
      figureLabel: "Eksempel på øvemiljøet med Nordlys Logistiks indbakke og en samtale med øvemodellen",
      inbox: "Indbakke",
      mails: [
        { from: "Hanne", subject: "Klage: 3 forsinkede leverancer", time: "16:47" },
        { from: "Mette Krogh", subject: "Ny AI-politik — læs inden fredag", time: "08:12" },
        { from: "Sara Damgaard", subject: "Q3-budget: afvigelser?", time: "10:21" },
        { from: "Ali Yilmaz", subject: "Lagerkapacitet uge 47–51", time: "14:05" },
      ],
      userMessage: "Opsummér Hannes klage i tre punkter.",
      answer: ["Tre leverancer er kommet for sent (ordre 40118, 40127 og 40133).", "Årsagen er forsinkelser hos fragtpartneren.", "Hanne overvejer at skifte leverandør."],
    },
  },
  features: {
    eyebrow: "Det får du",
    title: "Bygget til at lære, ikke til at se på",
    items: [
      { title: "Korte moduler", body: "Et modul tager typisk 5–12 minutter, ét trin ad gangen." },
      { title: "Forklaret score", body: "Du ser, hvad der trak op og ned. Prøv igen så tit du vil — det bedste forsøg tæller." },
      { title: "Certifikat", body: "Når du har bestået et niveau i dit spor, får du et certifikat som PDF, der dokumenterer gennemført træning." },
      { title: "På dansk", body: "Opgaver, feedback og hjælp er på dansk og tager udgangspunkt i danske arbejdspladser." },
      { title: "Privatliv først", body: "Dine prompts slettes efter 30 dage. Din arbejdsgiver ser aldrig, hvad du skriver." },
      { title: "Holder sig opdateret", body: "Nyt i værktøjerne bliver til korte moduler, så du ikke skal holde øje selv." },
    ],
  },
  tracks: {
    eyebrow: "Spor",
    title: "Vælg det værktøj, du bruger",
    lead: "Samme pensum, tilpasset det værktøj, du har på arbejdet. Du kan skifte spor senere.",
    items: {
      CHATGPT: "Til dig, der bruger ChatGPT på jobbet — eller gerne vil i gang.",
      COPILOT: "Både til Copilot Chat og til jer med betalt Microsoft 365 Copilot-licens. Modulerne viser, hvad de kræver.",
      CLAUDE: "Til dig, der bruger Claude til at skrive, opsummere og arbejde med dokumenter.",
    },
    unsure: "I tvivl om, hvilket spor der passer? Start med niveautesten.",
  },
  business: {
    eyebrow: "Til virksomheder",
    title: "Et dokumenteret, rollebaseret tiltag efter art. 4",
    lead: "AI-forordningens art. 4 kræver tiltag, der understøtter medarbejdernes AI-kompetencer. Mindforward er sådan et tiltag — og rapporten dokumenterer, hvad I har gjort, og hvem der har gennemført hvad.",
    points: [
      { title: "Pladser til teamet", body: "Køb det antal pladser, I har brug for, og justér løbende. Invitér medarbejdere på mail." },
      { title: "Overblik for admin", body: "Se status, score og certifikater pr. medarbejder — aldrig de tekster, de skriver i øvemiljøet." },
      { title: "Rapport til dokumentation", body: "Eksportér rapporten som CSV og PDF for den periode, I vælger." },
      { title: "Databehandleraftale", body: "Vi behandler medarbejdernes data på jeres vegne. Aftalen ligger klar i appen." },
    ],
    primary: "Start gratis prøveperiode",
    secondary: "Se priser",
    mock: {
      figureLabel: "Eksempel på admin-overblikket med øvedata",
      title: "Medarbejdere",
      sample: "Eksempel med øvedata",
      columns: { name: "Medarbejder", track: "Spor", status: "Status", score: "Score" },
      rows: [
        { name: "Kim Lund", role: "Kunde- og salgskoordinator", track: "CHATGPT", status: "PASSED", score: 92 },
        { name: "Line Vestergaard", role: "HR- og kontorchef", track: "COPILOT", status: "IN_PROGRESS", score: null },
        { name: "Ali Yilmaz", role: "Driftsleder, lager", track: "COPILOT", status: "PASSED", score: 85 },
        { name: "Peter Skov", role: "Kundeservice", track: "CLAUDE", status: "ASSIGNED", score: null },
      ],
      report: "Dokumentation af AI-kompetencetiltag",
      formats: "CSV · PDF",
      noPrompts: "Admins ser aldrig prompt-tekster",
    },
  },
  pricing: {
    eyebrow: "Priser",
    title: "Start gratis. Betal, når du vil videre.",
    lead: "Personlig er inkl. moms. Virksomhed er pr. bruger ekskl. moms.",
    free: {
      name: "Gratis",
      unit: "for altid",
      description: "Find ud af, hvor du står, og prøv de første moduler.",
      features: ["Niveautest med personlig plan", "{count} moduler gratis", "Øvemiljø med Nordlys Logistik"],
      cta: "Tag niveautesten",
    },
    personal: {
      name: "Personlig",
      unit: "pr. md. inkl. moms",
      description: "Til dig, der vil lære for egen regning.",
      features: ["Alle moduler i dit spor", "Månedlig genopfriskning", "Certifikat, når du har bestået et niveau", "{days} dages fortrydelsesret"],
      cancel: "Opsig når som helst i appen. Du beholder adgangen resten af den betalte måned.",
      cta: "Kom i gang",
    },
    business: {
      name: "Virksomhed",
      badge: "{days} dage gratis",
      unit: "pr. bruger pr. md. ekskl. moms",
      inclVat: "{amount} inkl. moms",
      annual: "Eller {amount} pr. bruger pr. år ekskl. moms",
      description: "Til teams fra {min} brugere.",
      features: [
        "Gratis prøve i {days} dage for op til {users} brugere — uden betalingskort",
        "Admin-overblik og rapport som CSV og PDF",
        "Databehandleraftale",
        "Minimum {min} brugere",
      ],
      cta: "Start gratis prøveperiode",
    },
    note: "Alle priser er i danske kroner. Betaling med kort.",
  },
  faq: {
    eyebrow: "Spørgsmål og svar",
    title: "Godt at vide",
    more: "Flere svar i hjælpecenteret",
    items: [
      {
        q: "Svarer ChatGPT, Copilot eller Claude i øvemiljøet?",
        a: "Nej. Svarene i øvemiljøet kommer fra vores egen øvemodel og er mærket \"Øvemodel\". Mindforward er ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google. Du lærer de arbejdsgange, der går igen i værktøjerne.",
      },
      {
        q: "Skal jeg bruge rigtige data?",
        a: "Nej. Alle opgaver foregår hos den fiktive virksomhed Nordlys Logistik. Skriver du et CPR-, kort- eller kontonummer, advarer eller blokerer øvemiljøet, før noget bliver sendt.",
      },
      {
        q: "Kan min arbejdsgiver se, hvad jeg skriver?",
        a: "Nej. Din arbejdsgiver kan se status, score og certifikater — aldrig de tekster, du skriver i øvemiljøet. Prompt-tekster slettes efter 30 dage.",
      },
      {
        q: "Hvad betyder art. 4 for os?",
        a: "AI-forordningens art. 4 kræver tiltag, der understøtter medarbejdernes AI-kompetencer. Mindforward er et dokumenteret, rollebaseret tiltag, og rapporten viser, hvem der er tilbudt træning, og hvem der har gennemført hvad.",
      },
      {
        q: "Hvor lang tid tager det?",
        a: "Niveautesten tager ca. 5 minutter. Et modul tager typisk 5–12 minutter, og månedens pakke højst 15 minutter.",
      },
      {
        q: "Hvordan opsiger jeg?",
        a: "Du opsiger i appen under Konto → Abonnement. Som privatkunde beholder du adgangen resten af den betalte måned, og dine resultater og certifikater bliver liggende. I de første {days} dage kan du også fortryde aftalen med knappen \"Fortryd aftale\".",
      },
      {
        q: "Hvad sker der, når prøveperioden slutter?",
        a: "Prøveperioden for virksomheder kræver ikke betalingskort. Tilføjer I et kort, fortsætter abonnementet automatisk. Uden kort stopper adgangen, når prøveperioden slutter.",
      },
      {
        q: "Virker det på mobilen?",
        a: "Niveautest, resultat, plan og quiz-trin virker på mobilen. Øvemiljøet med sandkasse-opgaverne er lavet til computer.",
      },
    ],
  },
  closing: {
    title: "Find ud af, hvor du står",
    body: "Tag den gratis niveautest. Det tager ca. 5 minutter, og du ser dit resultat med det samme — uden at oprette en bruger.",
    primary: "Tag den gratis niveautest",
    secondary: "Start en prøveperiode for jeres virksomhed",
  },
  help: {
    eyebrow: "Hjælp",
    articleCount: "{count} artikler",
    readArticle: "Læs artikel",
    supportTitle: "Fandt du ikke svaret?",
    supportBody: "Supportassistenten kender hjælpecenteret og kan sende din sag videre til et menneske.",
    supportCta: "Spørg supportassistenten",
    breadcrumb: "Hjælpecenter",
  },
  legal: {
    toc: "Indhold",
  },
} as const;
