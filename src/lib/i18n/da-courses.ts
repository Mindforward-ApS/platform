// Danish UI strings for forløb (/forloeb). Registered in ./da.ts as `courses`.
// Du-form, capital letter only on the first word and proper nouns, no exclamation marks, no emoji.
// The course content itself (titles, lesson text, badges) is data from content/forloeb/forloeb.json.
export const daCourses = {
  navLabel: "Forløb",
  pageTitle: "Forløb",
  toolPicker: "Vælg værktøj",
  stats: {
    label: "Forløbet i tal",
    modules: "{count} moduler",
    lessons: "{count} lektioner",
    certificates: "{count} certifikater",
  },
  level: {
    eyebrow: "Niveau {nr} · {name}",
    meta: "{modules} moduler · {lessons} lektioner · {time}",
  },
  module: {
    label: "Modul {nr}",
    meta: "{lessons} lektioner · {time}",
    progress: "{done} af {total} lektioner",
    showLessons: "Vis lektioner",
    completedLesson: "Gennemført",
  },
  comingSoon: "Kommer snart",
  test: {
    label: "Test efter niveau {nr}",
    meta: "{time} · bestået ved {pct} %",
  },
  lesson: {
    position: "Modul {module} · Lektion {position} af {total}",
    backToCourse: "Tilbage til forløbet",
    know: "Det skal du vide",
    tryIt: "Prøv selv",
    openSandbox: "Åbn øvemiljø",
    openTool: "Åbn {tool}",
    newTab: "(åbner i en ny fane)",
    check: "Tjek dig selv",
    correct: "Rigtigt",
    wrong: "Ikke helt. Prøv igen.",
    completedNote: "Du har gennemført lektionen.",
    answerError: "Dit svar blev ikke gemt. Prøv igen om lidt.",
    prev: "Forrige",
    next: "Næste",
    minutes: "ca. {minutes} min",
  },
  locked: {
    title: "Lektionen er ikke klar endnu",
    body: "Den kommer snart. Indtil da kan du tage de lektioner, der er åbne.",
  },
  done: {
    title: "Modul {nr} er gennemført",
    body: "Du har gennemført alle {total} lektioner i {title}.",
    notYetTitle: "Modul {nr} er ikke gennemført endnu",
    notYetBody: "Du mangler {count} lektioner. Besvar kontrolspørgsmålet i hver af dem.",
    back: "Tilbage til forløbet",
  },
  admin: {
    title: "Forløb",
    description: "Lektioner gennemført i de moduler, der er åbne. Svar og tekster vises ikke.",
    module: "Modul {nr}: {title}",
    progress: "{done} af {total} lektioner",
    none: "Ingen forløb endnu.",
  },
} as const;
