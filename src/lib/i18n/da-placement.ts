// Danish UI strings for the placement area (niveautest, resultat, plan, samtykke, afmelding, juridiske sider,
// cookiebanner). Owned by the placement milestone (M5); registered in ./da.ts.
// Legal texts are DRAFTS awaiting lawyer review (docs/10 § 9) and must say so on the page.

const DRAFT = "Udkast — afventer advokatgennemgang";

export const daPlacement = {
  tracks: {
    CHATGPT: "ChatGPT",
    COPILOT: "Microsoft 365 Copilot",
    CLAUDE: "Claude",
  },
  pick: {
    title: "Gratis AI-niveautest",
    intro: "Tag testen på ca. 5 minutter. Du får dit niveau, tre konkrete anbefalinger og et forslag til din personlige plan. Du behøver ikke oprette en bruger eller give din email.",
    chooseTrack: "Hvilket AI-værktøj bruger du på arbejdet?",
    unsure: "Ved ikke / flere værktøjer",
    unsureHelp: "Vi starter dig på ChatGPT-sporet. Du kan altid skifte senere.",
    disclaimer: "Mindforward er ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google. Produktnavne bruges kun til at beskrive, hvad du lærer.",
  },
  test: {
    profileTitle: "Om dig",
    questionsTitle: "Spørgsmål",
    progress: "{answered} af {total} besvaret",
    questionLabel: "Spørgsmål {n} af {total}",
    aiAnswerLabel: "AI-svar",
    submit: "Se mit resultat",
    noTimeLimit: "Der er ingen tidsgrænse.",
    honeypotLabel: "Lad dette felt være tomt",
    loggedInNote: "Du er logget ind — resultatet gemmes på din konto, og din plan opdateres.",
    errors: {
      incomplete: "Besvar alle spørgsmål, før du ser dit resultat.",
      tooFast: "Det gik lidt for hurtigt. Læs spørgsmålene igennem og prøv igen.",
      expired: "Siden har været åben for længe. Start testen igen.",
      rateLimited: "Der er taget mange tests fra din forbindelse den seneste time. Prøv igen senere.",
      generic: "Noget gik galt. Prøv igen.",
    },
  },
  result: {
    title: "Dit resultat",
    overall: "Dit niveau: {level} — {label}",
    levelLabels: { 1: "Grundlag", 2: "Øvet", 3: "Avanceret" },
    score: "{correct} af {total} rigtige",
    areasTitle: "Niveau pr. område",
    areaStates: { SECURE: "Sikker", PARTIAL: "Delvist", UNCERTAIN: "Usikker" },
    areaScore: "{correct} af {total}",
    recommendationsTitle: "Tre anbefalinger til dig",
    planTitle: "Forslag til din plan",
    planIntro: "Rækkefølgen bygger på dine svar: først grundlaget, så din rolle, så de mere avancerede emner.",
    planMore: "+ {count} moduler mere i den fulde plan",
    minutes: "{minutes} min",
    skippable: "Kan springes over",
    prioritized: "Start her",
    excludedTitle: "Til jer med Microsoft 365 Copilot-licens",
    excludedIntro: "Disse moduler kræver en betalt licens og er ikke med i din plan lige nu.",
    saveTitle: "Gem dit resultat",
    saveBody: "Opret en gratis bruger, så gemmer vi resultatet og laver din plan. Du får de første moduler gratis.",
    saveButton: "Gem resultat og fortsæt gratis",
    toPlan: "Se din plan",
    retake: "Tag testen igen",
    notFound: "Vi kunne ikke finde et resultat. Tag testen for at se dit niveau.",
  },
  consent: {
    title: "Vil du have tips om AI på arbejdet?",
    intro: "Helt frivilligt — dit resultat og din plan er dine, uanset hvad du vælger.",
    emailLabel: "Email",
    submit: "Tilmeld",
    sent: "Tak! Vi har sendt en mail. Klik på linket i mailen for at bekræfte. Først derefter er du tilmeldt.",
    privacyLink: "Læs hvordan vi behandler dine oplysninger",
    errors: {
      notTicked: "Sæt kryds i feltet, hvis du vil tilmelde dig.",
      invalidEmail: "Skriv en gyldig email.",
      rateLimited: "Du har prøvet mange gange. Prøv igen om en time.",
      generic: "Noget gik galt. Prøv igen.",
    },
  },
  confirm: {
    title: "Bekræft din tilmelding",
    body: "Klik på knappen for at bekræfte, at du vil modtage mails fra Mindforward. Du kan altid afmelde dig med ét klik.",
    button: "Bekræft tilmelding",
    confirmed: "Tak — din tilmelding er bekræftet.",
    expired: "Linket er udløbet. Tilmeld dig igen fra resultatsiden, hvis du stadig ønsker mails.",
    invalid: "Linket er ugyldigt eller allerede brugt.",
    withdrawn: "Du har afmeldt dig efter tilmeldingen, så linket virker ikke længere. Tilmeld dig igen, hvis du ønsker mails.",
  },
  unsubscribe: {
    title: "Afmeld mails fra Mindforward",
    body: "Klik på knappen for at afmelde {email}. Det virker med det samme.",
    button: "Afmeld",
    done: "Du er afmeldt og får ikke flere markedsføringsmails fra os.",
    invalid: "Linket er ugyldigt. Skriv til os, hvis du vil afmeldes.",
    unavailable: "Afmelding er midlertidigt utilgængelig. Prøv igen senere, eller skriv til os.",
  },
  plan: {
    title: "Din plan",
    empty: "Du har ikke taget niveautesten endnu.",
    takeTest: "Tag niveautesten",
    track: "Spor: {track}",
    level: "Niveau: {level} — {label}",
    status: { ASSIGNED: "Ikke startet", IN_PROGRESS: "I gang", PASSED: "Bestået", REMOVED: "Fjernet" },
    comingSoon: "Kommer snart",
    open: "Åbn modul",
    groups: { LEVEL_1: "Niveau 1 — Grundlag", ROLE: "Din rolle", LEVEL_2: "Niveau 2 — Øvet", LEVEL_3: "Niveau 3 — Avanceret" },
  },
  footer: {
    navLabel: "Juridisk og info",
    placement: "Gratis niveautest",
    privacy: "Privatlivspolitik",
    cookies: "Cookies",
    terms: "Handelsbetingelser",
    accessibility: "Tilgængelighed",
    cookieSettings: "Cookieindstillinger",
    disclaimer: "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google.",
  },
  cookieBanner: {
    label: "Cookies",
    title: "Vi bruger kun nødvendige cookies",
    body: "Nødvendige cookies holder dig logget ind og husker dine valg. Statistik-cookies er slået fra, medmindre du siger ja — og vi bruger dem ikke endnu.",
    necessaryOnly: "Kun nødvendige",
    acceptStatistics: "Accepter statistik",
    readMore: "Læs om cookies",
  },
  email: {
    marketingConfirm: {
      subject: "Bekræft din tilmelding til mails fra Mindforward",
      preview: "Bekræft din tilmelding",
      heading: "Bekræft din tilmelding",
      body: "Du har bedt om at få mails fra Mindforward om AI på arbejdet. Klik på knappen for at bekræfte. Linket virker i {days} dage.",
      button: "Bekræft tilmelding",
      fallback: "Virker knappen ikke, så kopiér dette link ind i din browser:",
      notYou: "Har du ikke bedt om det, skal du ikke gøre noget. Så bliver du ikke tilmeldt.",
    },
  },
  legal: {
    draftBanner: DRAFT,
    versionLine: "Version {version} · Senest opdateret {date}",
    placeholderNote: "Felter i [klammer] udfyldes, når virksomhedsoplysningerne er på plads.",
    pages: {
      privacy: {
        title: "Privatlivspolitik",
        version: "0.1",
        updated: "13. oktober 2026",
        sections: [
          {
            heading: "Hvem er dataansvarlig",
            body: [
              "Mindforward drives af Esther Gruppen ApS, CVR [indsættes], [adresse indsættes]. Kontakt: [email indsættes].",
              "For virksomhedskunder behandler vi medarbejdernes data på vegne af virksomheden (vi er databehandler efter en databehandleraftale). For privatkunder, kontaktpersoner, niveautest og markedsføring er vi selv dataansvarlige.",
            ],
          },
          {
            heading: "Hvilke oplysninger vi behandler",
            list: [
              "Konto: navn, email, login-metode, organisation og rolle.",
              "Læring: niveautest-svar (kun valgte svarmuligheder), moduler, scorer og certifikater.",
              "Øveopgaver: dine prompts i øvemiljøet slettes efter 30 dage. Scorer bevares.",
              "Niveautest uden konto: gemmes anonymt og slettes, hvis du ikke opretter en bruger [frist: JURA verificeres].",
              "Markedsføring: kun hvis du selv har givet samtykke — email, tidspunkt, kilde, samtykketekst, IP-adresse og browser.",
              "Sikkerhed og drift: logs uden indhold af dine prompts.",
            ],
          },
          {
            heading: "Formål og retsgrundlag",
            list: [
              "At levere tjenesten og din konto (aftale).",
              "At sende servicemails som login-links og kvitteringer (aftale).",
              "At sende markedsføring på email (dit samtykke — du kan altid trække det tilbage).",
              "At opfylde bogføringsregler (retlig forpligtelse).",
              "[Øvrige retsgrundlag: JURA verificeres]",
            ],
          },
          {
            heading: "Hvis du bruger Mindforward gennem din arbejdsgiver",
            body: [
              "Din arbejdsgiver kan se status, score og certifikater — aldrig de tekster, du skriver i øvemiljøet. Din arbejdsgivers egen privatlivspolitik gælder også.",
            ],
          },
          {
            heading: "Modtagere og underdatabehandlere",
            body: ["Vi bruger leverandører til hosting, database, email, baggrundsjob, fejlovervågning og AI-modeller. Listen med lokation og overførselsgrundlag offentliggøres på en separat side [JURA: verificeres pr. leverandør]."],
          },
          {
            heading: "Hvor længe vi gemmer data",
            list: [
              "Prompt-tekster i øvemiljøet: 30 dage.",
              "Konto, scorer og certifikater: så længe kontoen findes.",
              "Samtykke til markedsføring: så længe det gælder + 5 år som dokumentation [JURA: verificeres].",
              "Ubekræftede tilmeldinger: slettes efter 30 dage.",
            ],
          },
          {
            heading: "Dine rettigheder",
            body: [
              "Du har ret til indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og indsigelse. Du kan til enhver tid trække et samtykke tilbage.",
              "Du kan klage til Datatilsynet (datatilsynet.dk).",
            ],
          },
        ],
      },
      cookies: {
        title: "Cookiepolitik",
        version: "0.1",
        updated: "13. oktober 2026",
        sections: [
          {
            heading: "Nødvendige cookies",
            body: ["Disse cookies er nødvendige for, at siden virker, og kræver ikke samtykke [JURA: verificeres — cookiebekendtgørelsen]:"],
            list: [
              "Login-session (holder dig logget ind).",
              "Dit cookievalg (husker, hvad du har valgt).",
              "Niveautest-resultat (en tilfældig nøgle, så du kan se og gemme dit resultat, op til 30 dage).",
              "Sikkerhed (beskyttelse mod misbrug af formularer).",
            ],
          },
          {
            heading: "Statistik-cookies",
            body: [
              "Vi bruger ikke statistik-cookies i dag. Hvis vi tager dem i brug, sker det kun, hvis du har valgt \"Accepter statistik\". Valget er slået fra som standard.",
            ],
          },
          {
            heading: "Markedsførings-cookies",
            body: ["Vi bruger ingen annonce- eller sporings-cookies."],
          },
          {
            heading: "Sådan ændrer du dit valg",
            body: ["Brug linket \"Cookieindstillinger\" nederst på siden. Du kan også slette cookies i din browser."],
          },
        ],
      },
      terms: {
        title: "Handelsbetingelser",
        version: "0.1",
        updated: "13. oktober 2026",
        sections: [
          {
            heading: "Gælder for",
            body: ["Betingelserne gælder for køb af Mindforward hos Esther Gruppen ApS, CVR [indsættes]. Der er særskilte afsnit for privatkunder og virksomheder."],
          },
          {
            heading: "Privatkunder: pris og fornyelse",
            list: [
              "Prisen vises inkl. moms, før du køber.",
              "Abonnementet fornyes automatisk hver måned, indtil du opsiger det.",
              "Du kan opsige i appen fra dag til dag og beholder adgangen resten af den betalte måned.",
            ],
          },
          {
            heading: "Privatkunder: fortrydelsesret",
            body: [
              "Du har 14 dages fortrydelsesret. Du kan fortryde via knappen \"Fortryd aftale\" i appen eller på siden for fortrydelse. Du får en kvittering på mail.",
              "[Betingelser ved straks-adgang og refusion: JURA verificeres]",
            ],
          },
          {
            heading: "Virksomheder",
            list: [
              "Pris pr. bruger vises ekskl. moms; minimumsantal brugere vises ved køb.",
              "Prøveperioden er gratis og kræver ikke betalingskort.",
              "Databehandleraftalen er bilag til aftalen.",
              "[Betaling, ansvarsbegrænsning og opsigelse: JURA verificeres]",
            ],
          },
          {
            heading: "Om øvemiljøet",
            body: ["Mindforward er et øvemiljø. Vi er ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google. Certifikater dokumenterer gennemført træning."],
          },
          {
            heading: "Klage",
            body: ["[Klageadgang og tvistløsning: JURA verificeres]"],
          },
        ],
      },
      accessibility: {
        title: "Tilgængelighedserklæring",
        version: "0.1",
        updated: "13. oktober 2026",
        sections: [
          {
            heading: "Vores mål",
            body: ["Vi arbejder efter WCAG 2.2 niveau AA på alle sider. [JURA: verificeres — om reglerne om tilgængelighed gælder for Mindforward som mikrovirksomhed]"],
          },
          {
            heading: "Kendte begrænsninger",
            list: [
              "Øvemiljøet (sandkassen) er lavet til computer. Niveautest, resultat, plan og quiz-trin virker på mobil.",
              "Designet er midlertidigt og bliver gennemgået for kontrast og læsbarhed.",
            ],
          },
          {
            heading: "Kontakt os",
            body: ["Oplever du problemer med tilgængeligheden, så skriv til [email indsættes]. Vi svarer inden for [frist]."],
          },
        ],
      },
    },
  },
} as const;
