import { orgAdminMessages } from "./da-admin";
import { daBilling } from "./da-billing";
import { daContent } from "./da-content";
import { daMonthly } from "./da-monthly";
import { daPlacement } from "./da-placement";
import { daPlayer } from "./da-player";
import { daSandbox } from "./da-sandbox";
import { daSupport } from "./da-support";

// Danish UI strings. Components never hardcode UI text (CLAUDE.md) — add keys here.
// Product name (decided by Marco 13 Oct 2026). Internal code name stays `greb`.
export const BRAND = "Mindforward";

export const da = {
  brand: BRAND,
  sandbox: daSandbox,
  player: daPlayer,
  placement: daPlacement,
  billing: daBilling,
  contentEngine: daContent,
  orgAdmin: orgAdminMessages,
  monthly: daMonthly,
  support: daSupport,
  shell: {
    skipToContent: "Spring til indhold",
    mainNav: "Hovedmenu",
    openMenu: "Åbn menu",
    closeMenu: "Luk menu",
    learner: {
      modules: "Moduler",
      plan: "Min plan",
      sandbox: "Øvemiljø",
      certificates: "Certifikater",
      account: "Konto",
      company: "Virksomhed",
      help: "Hjælp",
    },
    marketing: {
      howItWorks: "Sådan virker det",
      placement: "Niveautest",
      business: "Til virksomheder",
      help: "Hjælp",
      login: "Log ind",
      signup: "Prøv gratis",
    },
    owner: {
      label: "Ejer-konsol",
      overview: "Overblik",
      content: "Indhold",
      usage: "Forbrug",
    },
  },
  meta: {
    title: "Mindforward",
    description: "Lær AI ved at gøre det.",
  },
  home: {
    heading: "Mindforward",
    tagline: "Lær AI ved at gøre det. Kommer snart.",
    login: "Log ind",
    signup: "Opret bruger",
  },
  auth: {
    loginTitle: "Log ind på Mindforward",
    signupTitle: "Opret bruger på Mindforward",
    emailLabel: "Email",
    sendLink: "Send login-link",
    or: "eller",
    microsoft: "Fortsæt med Microsoft",
    google: "Fortsæt med Google",
    toSignup: "Ny her? Opret bruger",
    toLogin: "Har du allerede en bruger? Log ind",
    checkMailTitle: "Tjek din mail",
    checkMailBody: "Vi har sendt et login-link til {email}. Linket virker i {minutes} minutter.",
    resend: "Send linket igen",
    otherEmail: "Brug en anden email",
    errors: {
      invalidEmail: "Skriv en gyldig email.",
      rateLimited: "Du har bedt om mange links. Prøv igen om lidt.",
      generic: "Noget gik galt. Prøv igen.",
      linkExpired: "Linket er udløbet eller allerede brugt. Bed om et nyt.",
      providerUnavailable: "Den loginmetode er ikke sat op endnu.",
    },
    logout: "Log ud",
  },
  invitation: {
    title: "Invitation til {organization}",
    invitedBy: "{inviter} har inviteret dig til at lære AI på Mindforward.",
    loginToAccept: "Log ind for at acceptere",
    accept: "Accepter invitation",
    reject: "Afvis",
    expired: "Invitationen er udløbet eller ikke længere gyldig. Bed om en ny.",
    wrongEmail: "Invitationen er sendt til en anden email. Log ind med den email, invitationen er sendt til.",
  },
  account: {
    title: "Din konto",
    activeOrg: "Aktiv organisation",
    role: "Rolle",
    orgType: { PERSONAL: "Personlig", BUSINESS: "Virksomhed" },
    roles: { OWNER: "Ejer", ADMIN: "Administrator", LEARNER: "Medarbejder" },
    switchOrg: "Skift til",
    createBusiness: "Opret virksomhed",
    members: "Medarbejdere",
  },
  business: {
    createTitle: "Opret virksomhed",
    nameLabel: "Virksomhedens navn",
    create: "Opret",
    membersTitle: "Medarbejdere",
    inviteTitle: "Invitér medarbejder",
    inviteEmail: "Email",
    inviteRole: "Rolle",
    invite: "Send invitation",
    invited: "Invitationen er sendt.",
    pending: "Ventende invitationer",
    changeRole: "Skift rolle",
    save: "Gem",
    errors: {
      notAllowed: "Du har ikke adgang til at gøre det.",
      lastOwner: "Virksomheden skal have mindst én ejer.",
      alreadyMember: "Personen er allerede medlem.",
    },
  },
  admin: {
    title: "Mindforward drift",
    setupTitle: "Slå to-trinsbekræftelse til",
    setupBody: "Scan koden i din authenticator-app, eller indtast nøglen manuelt. Skriv derefter den 6-cifrede kode.",
    secretLabel: "Nøgle",
    codeLabel: "6-cifret kode",
    verify: "Bekræft",
    verifyTitle: "Bekræft med din authenticator-app",
    invalidCode: "Koden er forkert. Prøv igen.",
  },
  email: {
    footer: "Mindforward · Esther Gruppen ApS",
    ignoreNote: "Har du ikke bedt om denne mail, kan du se bort fra den.",
    magicLink: {
      subject: "Dit login-link til Mindforward",
      preview: "Log ind på Mindforward",
      heading: "Log ind på Mindforward",
      body: "Klik på knappen for at logge ind. Linket virker i {minutes} minutter og kan kun bruges én gang.",
      button: "Log ind",
      fallback: "Virker knappen ikke, så kopiér dette link ind i din browser:",
    },
    invitation: {
      subject: "{inviter} har inviteret dig til {organization} på Mindforward",
      preview: "Invitation til Mindforward",
      heading: "Du er inviteret til Mindforward",
      body: "{inviter} har inviteret dig til {organization} på Mindforward, hvor I lærer AI-værktøjer ved at prøve dem i et øvemiljø.",
      button: "Se invitationen",
      fallback: "Virker knappen ikke, så kopiér dette link ind i din browser:",
    },
  },
} as const;

export type Messages = typeof da;
