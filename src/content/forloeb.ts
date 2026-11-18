// Real Mindforward forløb (copied 2026-11-03 from mindforward-brain/platform/content/forloeb/forloeb.json, trimmed).
// Used by the module-page proposals. Progress is demo data.
export type FLesson = { nr: string; title: string; minutes: number; know?: string; tryIt?: string; quiz?: string };
export type FModule = { nr: number; title: string; description: string; ready: boolean; lessons: FLesson[] };
export type FLevel = { nr: number; name: string; title: string; outcome: string; test: { title: string; minutes: number; pass: number }; modules: FModule[] };
export type FTrack = { id: string; tool: string; headline: string; levels: FLevel[] };
export const tracks: FTrack[] = [
 {
  "id": "chatgpt",
  "tool": "ChatGPT",
  "headline": "Fra helt grøn til ekspert i ChatGPT",
  "levels": [
   {
    "nr": 1,
    "name": "Grøn",
    "title": "Kom trygt i gang",
    "outcome": "Bagefter kan du bruge ChatGPT til hverdagsopgaver og ved, hvad du ikke må dele.",
    "test": {
     "title": "Grøn-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 1,
      "title": "Velkommen til ChatGPT",
      "description": "Opret en konto, find rundt, og lær, hvilken plan og hvilken konto du skal bruge.",
      "ready": true,
      "lessons": [
       {
        "nr": "1.1",
        "title": "Hvad er ChatGPT?",
        "minutes": 5,
        "know": "ChatGPT er et AI-program fra firmaet OpenAI. Du skriver eller taler med det, som du ville gøre med et menneske.",
        "tryIt": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
        "quiz": "Hvad er den største forskel på ChatGPT og Google?"
       },
       {
        "nr": "1.2",
        "title": "Hvordan kommer man i gang?",
        "minutes": 5,
        "know": "Gå ind på chatgpt.com, eller hent appen ”ChatGPT” i App Store eller Google Play.",
        "tryIt": "Log ind i ChatGPT, og skriv: ”Skriv et forslag til en kort tale til en kollega med 10-årsjubilæum, fem linjer.” Skriv derefter: ”Gør den lidt sjovere.”",
        "quiz": "Svaret er ikke helt, som du ville have det. Hvad gør du?"
       },
       {
        "nr": "1.3",
        "title": "Gratis eller betalt?",
        "minutes": 5,
        "know": "Gratisversionen er nok til at komme i gang. Du kan skrive, tale, sende filer og billeder og få svar.",
        "tryIt": "Skriv tre opgaver ned, som du gerne vil bruge ChatGPT til i de næste to uger. Kan gratisversionen klare dem? I starten kan den næsten altid.",
        "quiz": "Hvilke planer er lavet til virksomheder?"
       },
       {
        "nr": "1.4",
        "title": "Privat konto eller arbejdets?",
        "minutes": 5,
        "know": "Har din arbejdsplads ChatGPT Business eller Enterprise, skal du bruge den til arbejde, ikke din private konto.",
        "tryIt": "Spørg din leder eller IT: Har vi en fælles ChatGPT-løsning, og hvilken mail skal jeg logge ind med?",
        "quiz": "Din arbejdsplads har en fælles ChatGPT-løsning. Du skal opsummere et internt notat. Hvilken konto bruger du?"
       },
       {
        "nr": "1.5",
        "title": "Hvor finder man tingene?",
        "minutes": 5,
        "know": "Skrivefeltet er der, hvor du skriver. Med plusknappen (+) ved siden af tilføjer du filer, billeder og værktøjer.",
        "tryIt": "Åbn ChatGPT på chatgpt.com eller i appen, og find tre ting: knappen til ny chat, plusknappen og indstillingerne.",
        "quiz": "Hvor tilføjer du en fil til din besked?"
       },
       {
        "nr": "1.6",
        "title": "Hvordan finder man en gammel samtale?",
        "minutes": 5,
        "know": "Dine samtaler gemmes i sidemenuen med den nyeste øverst.",
        "tryIt": "Start to chats i ChatGPT om to forskellige emner. Find derefter den første igen med søgningen.",
        "quiz": "Hvor leder søgningen i sidemenuen?"
       },
       {
        "nr": "1.7",
        "title": "Hvor kan man ellers bruge ChatGPT?",
        "minutes": 5,
        "know": "På telefonen (iOS og Android) kan du også bruge kameraet og stemmen.",
        "tryIt": "Hent appen på din telefon, og log ind med den samme konto. Tjek, at samtalen fra lektion 1.2 også ligger der.",
        "quiz": "Hvad sker der, når du logger ind på telefonen med den samme konto?"
       }
      ]
     },
     {
      "nr": 2,
      "title": "Din første samtale",
      "description": "Skriv din første prompt, ret svaret, og forstå, hvorfor ChatGPT nogle gange siger nej.",
      "ready": false,
      "lessons": [
       {
        "nr": "2.1",
        "title": "Prompting – hvad er det?",
        "minutes": 5
       },
       {
        "nr": "2.2",
        "title": "Hvordan retter man et svar, man ikke er tilfreds med?",
        "minutes": 5
       },
       {
        "nr": "2.3",
        "title": "Hvorfor vil ChatGPT nogle gange ikke svare?",
        "minutes": 5
       },
       {
        "nr": "2.4",
        "title": "Hvorfor siger ChatGPT, at man har nået sin grænse?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 3,
      "title": "Mere end tekst",
      "description": "Tal og diktér, send filer og billeder, og scan papirer med kameraet.",
      "ready": false,
      "lessons": [
       {
        "nr": "3.1",
        "title": "Hvordan taler man med ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "3.2",
        "title": "Hvordan dikterer man i stedet for at skrive?",
        "minutes": 5
       },
       {
        "nr": "3.3",
        "title": "Hvordan giver man ChatGPT en fil eller et billede?",
        "minutes": 5
       },
       {
        "nr": "3.4",
        "title": "Hvordan scanner man et dokument med kameraet?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 4,
      "title": "Brug det sikkert",
      "description": "Tjek svaret, beskyt data, og brug midlertidig chat, når det gælder.",
      "ready": false,
      "lessons": [
       {
        "nr": "4.1",
        "title": "Kan man stole på svaret?",
        "minutes": 5
       },
       {
        "nr": "4.2",
        "title": "Hvad må man ikke dele?",
        "minutes": 5
       },
       {
        "nr": "4.3",
        "title": "Hvordan undgår man, at ens samtaler bruges til at træne ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "4.4",
        "title": "Hvad er en midlertidig chat?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 2,
    "name": "Øvet",
    "title": "Brug det i hverdagen",
    "outcome": "Bagefter sparer du tid på mails, tekster, tal og research hver uge.",
    "test": {
     "title": "Øvet-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 5,
      "title": "Bedre prompts",
      "description": "Prompts, der rammer første gang, og hvornår ChatGPT skal tænke længere.",
      "ready": false,
      "lessons": [
       {
        "nr": "5.1",
        "title": "Hvordan bliver man bedre til at prompte?",
        "minutes": 5
       },
       {
        "nr": "5.2",
        "title": "Hvad er forskellen på Instant, Medium og High?",
        "minutes": 5
       },
       {
        "nr": "5.3",
        "title": "Hvorfor svarer ChatGPT nogle gange med grafer, knapper og små værktøjer?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 6,
      "title": "Find information",
      "description": "Søg på nettet, og lav grundig research med kilder.",
      "ready": false,
      "lessons": [
       {
        "nr": "6.1",
        "title": "Hvordan får man ChatGPT til at søge på nettet?",
        "minutes": 5
       },
       {
        "nr": "6.2",
        "title": "Hvad er deep research?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 7,
      "title": "Billeder og syn",
      "description": "Lav og redigér billeder, og vis ChatGPT, hvad du ser.",
      "ready": false,
      "lessons": [
       {
        "nr": "7.1",
        "title": "Hvordan viser man ChatGPT, hvad man ser med kameraet eller på skærmen?",
        "minutes": 5
       },
       {
        "nr": "7.2",
        "title": "Hvordan laver man billeder med ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "7.3",
        "title": "Hvordan redigerer man et billede med ChatGPT?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 8,
      "title": "Tekst, tal og lyd",
      "description": "Lange tekster, Excel, mødeoptagelser og oversættelse.",
      "ready": false,
      "lessons": [
       {
        "nr": "8.1",
        "title": "Hvordan skriver man lange tekster sammen med ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "8.2",
        "title": "Hvordan får man en lydoptagelse lavet om til noter?",
        "minutes": 5
       },
       {
        "nr": "8.3",
        "title": "Hvordan arbejder man med Excel og tal i ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "8.4",
        "title": "Hvordan oversætter man og får hjælp til udtale?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 9,
      "title": "ChatGPT i dit job",
      "description": "Find dine egne opgaver, lær noget nyt, og del med kolleger.",
      "ready": false,
      "lessons": [
       {
        "nr": "9.1",
        "title": "Hvad kan du bruge ChatGPT til i dit job?",
        "minutes": 5
       },
       {
        "nr": "9.2",
        "title": "Hvordan bruger man ChatGPT til at lære noget nyt?",
        "minutes": 5
       },
       {
        "nr": "9.3",
        "title": "Hvordan bruger man ChatGPT til at finde produkter og booke?",
        "minutes": 5
       },
       {
        "nr": "9.4",
        "title": "Hvordan deler man en samtale med en kollega?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 3,
    "name": "Avanceret",
    "title": "Tilpas ChatGPT til dit arbejde",
    "outcome": "Bagefter kender ChatGPT dit arbejde og hjælper dig i de programmer, du allerede bruger.",
    "test": {
     "title": "Avanceret-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 10,
      "title": "Gør ChatGPT til din",
      "description": "Hukommelse, instruktioner og styr på, hvad det husker.",
      "ready": false,
      "lessons": [
       {
        "nr": "10.1",
        "title": "Hvordan får du ChatGPT til at huske dig?",
        "minutes": 5
       },
       {
        "nr": "10.2",
        "title": "Hvad er brugerdefinerede instruktioner?",
        "minutes": 5
       },
       {
        "nr": "10.3",
        "title": "Hvordan styrer man, hvad ChatGPT husker?",
        "minutes": 5
       },
       {
        "nr": "10.4",
        "title": "Hvordan låser eller skjuler man en samtale?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 11,
      "title": "Hold styr på dit arbejde",
      "description": "Projekter og bibliotek til det, du vender tilbage til.",
      "ready": false,
      "lessons": [
       {
        "nr": "11.1",
        "title": "Hvad er projekter, og hvordan bruger man dem?",
        "minutes": 5
       },
       {
        "nr": "11.2",
        "title": "Hvad er biblioteket, og hvordan genbruger og deler man sine filer?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 12,
      "title": "Forbind dine apps",
      "description": "Mail, kalender og filer, og hvad ChatGPT må gøre i dem.",
      "ready": false,
      "lessons": [
       {
        "nr": "12.1",
        "title": "Hvad kan du give ChatGPT adgang til?",
        "minutes": 5
       },
       {
        "nr": "12.2",
        "title": "Hvordan forbinder man ChatGPT til mail, kalender og filer?",
        "minutes": 5
       },
       {
        "nr": "12.3",
        "title": "Hvordan bestemmer man, hvad ChatGPT må gøre i ens apps?",
        "minutes": 5
       },
       {
        "nr": "12.4",
        "title": "Hvordan sender man en mail direkte fra ChatGPT?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 13,
      "title": "I dine programmer",
      "description": "Word, Excel, PowerPoint, Google Sheets, browseren og desktopappen.",
      "ready": false,
      "lessons": [
       {
        "nr": "13.1",
        "title": "Hvordan bruger man ChatGPT i Word, Excel, PowerPoint og Google Sheets?",
        "minutes": 5
       },
       {
        "nr": "13.2",
        "title": "Hvordan bruger man ChatGPT i browseren?",
        "minutes": 5
       },
       {
        "nr": "13.3",
        "title": "Hvad er ChatGPT-desktopappen, og hvorfor skal man have den?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 14,
      "title": "Sikkerhed og regler",
      "description": "En sikker konto og loven om AI på arbejdet.",
      "ready": false,
      "lessons": [
       {
        "nr": "14.1",
        "title": "Hvordan holder man sin ChatGPT-konto sikker?",
        "minutes": 5
       },
       {
        "nr": "14.2",
        "title": "Hvad siger loven om AI på arbejdet?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 4,
    "name": "Ekspert",
    "title": "Lad ChatGPT arbejde for dig",
    "outcome": "Bagefter bygger du en arbejdsgang, der kører uden dig, og lærer dine kolleger op.",
    "test": {
     "title": "Ekspert-certifikat",
     "minutes": 30,
     "pass": 80
    },
    "modules": [
     {
      "nr": 15,
      "title": "Agenter",
      "description": "Lad ChatGPT løse opgaver på nettet og på din computer.",
      "ready": false,
      "lessons": [
       {
        "nr": "15.1",
        "title": "Hvad er en AI-agent?",
        "minutes": 5
       },
       {
        "nr": "15.2",
        "title": "Hvad er forskellen på Chat og Work?",
        "minutes": 5
       },
       {
        "nr": "15.3",
        "title": "Hvordan lader du ChatGPT udføre opgaver på nettet for dig?",
        "minutes": 5
       },
       {
        "nr": "15.4",
        "title": "Hvordan lader du ChatGPT arbejde med filer og programmer på din computer?",
        "minutes": 5
       },
       {
        "nr": "15.5",
        "title": "Hvad er Computer History, og skal man slå det til?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 16,
      "title": "Skab færdigt arbejde",
      "description": "Præsentationer, dokumenter, hjemmesider og dataanalyse.",
      "ready": false,
      "lessons": [
       {
        "nr": "16.1",
        "title": "Hvordan laver man en præsentation med ChatGPT Slides?",
        "minutes": 5
       },
       {
        "nr": "16.2",
        "title": "Hvad er Space og Pages, og hvordan samarbejder man i dem?",
        "minutes": 5
       },
       {
        "nr": "16.3",
        "title": "Hvordan laver man en hjemmeside eller et lille værktøj med ChatGPT Sites?",
        "minutes": 5
       },
       {
        "nr": "16.4",
        "title": "Hvordan analyserer man virksomhedens data med ChatGPT?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 17,
      "title": "Automatisering",
      "description": "Opgaver, der kører af sig selv, mødereferater og agenter, der altid er tændt.",
      "ready": false,
      "lessons": [
       {
        "nr": "17.1",
        "title": "Hvordan får man ChatGPT til at lave opgaver automatisk?",
        "minutes": 5
       },
       {
        "nr": "17.2",
        "title": "Hvordan får man ChatGPT til at reagere, når der sker noget i ens apps?",
        "minutes": 5
       },
       {
        "nr": "17.3",
        "title": "Hvordan tager ChatGPT referat af ens møder?",
        "minutes": 5
       },
       {
        "nr": "17.4",
        "title": "Hvad er en dot, og hvad kan den gøre for dig?",
        "minutes": 5
       },
       {
        "nr": "17.5",
        "title": "Hvordan lader man flere agenter arbejde på samme opgave?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 18,
      "title": "Byg dine egne værktøjer",
      "description": "Plugins, skills og Codex.",
      "ready": false,
      "lessons": [
       {
        "nr": "18.1",
        "title": "Hvad er plugins og skills, og hvordan laver man sine egne?",
        "minutes": 5
       },
       {
        "nr": "18.2",
        "title": "Hvordan flytter man sine GPT'er over til plugins?",
        "minutes": 5
       },
       {
        "nr": "18.3",
        "title": "Hvad er workspace agents, og hvordan bygger man en til teamet?",
        "minutes": 5
       },
       {
        "nr": "18.4",
        "title": "Hvad er Codex, og skal man bruge det, hvis man ikke er udvikler?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 19,
      "title": "Rul det ud",
      "description": "Hele arbejdsgange, deling, administration og oplæring af kolleger.",
      "ready": false,
      "lessons": [
       {
        "nr": "19.1",
        "title": "Hvordan bygger man en hel arbejdsgang med ChatGPT?",
        "minutes": 5
       },
       {
        "nr": "19.2",
        "title": "Hvordan deler man plugins, projekter og opgaver med sine kolleger?",
        "minutes": 5
       },
       {
        "nr": "19.3",
        "title": "Hvordan styrer en administrator ChatGPT i virksomheden?",
        "minutes": 5
       },
       {
        "nr": "19.4",
        "title": "Hvordan lærer man sine kolleger at bruge ChatGPT?",
        "minutes": 5
       }
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "claude",
  "tool": "Claude",
  "headline": "Fra helt grøn til ekspert i Claude",
  "levels": [
   {
    "nr": 1,
    "name": "Grøn",
    "title": "Kom trygt i gang",
    "outcome": "Bagefter kan du bruge Claude til hverdagsopgaver og ved, hvad du ikke må dele.",
    "test": {
     "title": "Grøn-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 1,
      "title": "Velkommen til Claude",
      "description": "Opret en konto, find rundt, og lær, hvilken plan og hvilken konto du skal bruge.",
      "ready": true,
      "lessons": [
       {
        "nr": "1.1",
        "title": "Hvad er Claude?",
        "minutes": 5,
        "know": "Claude er et AI-program fra firmaet Anthropic. Du skriver eller taler med det, som du ville gøre med et menneske.",
        "tryIt": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
        "quiz": "Hvilket firma står bag Claude?"
       },
       {
        "nr": "1.2",
        "title": "Hvordan kommer man i gang?",
        "minutes": 5,
        "know": "Gå ind på claude.ai, eller hent appen ”Claude” i App Store eller Google Play. Der findes også en desktopapp til Mac og Windows.",
        "tryIt": "Log ind i Claude, og skriv: ”Skriv et forslag til en kort tale til en kollega med 10-årsjubilæum, fem linjer.” Skriv derefter: ”Gør den lidt sjovere.”",
        "quiz": "Svaret er ikke helt, som du ville have det. Hvad gør du?"
       },
       {
        "nr": "1.3",
        "title": "Gratis eller betalt?",
        "minutes": 5,
        "know": "Gratisversionen er nok til at komme i gang. Du kan skrive, sende filer og billeder, søge på nettet og lave dokumenter.",
        "tryIt": "Skriv tre opgaver ned, som du gerne vil bruge Claude til i de næste to uger. Kan gratisversionen klare dem? I starten kan den næsten altid.",
        "quiz": "Hvilke planer er lavet til virksomheder?"
       },
       {
        "nr": "1.4",
        "title": "Privat konto eller arbejdets?",
        "minutes": 5,
        "know": "Har din arbejdsplads Claude Team eller Enterprise, skal du bruge den til arbejde, ikke din private konto.",
        "tryIt": "Spørg din leder eller IT: Har vi en fælles Claude-løsning, og hvilken mail skal jeg logge ind med?",
        "quiz": "Din arbejdsplads har en fælles Claude-løsning. Du skal opsummere et internt notat. Hvilken konto bruger du?"
       },
       {
        "nr": "1.5",
        "title": "Hvor finder man tingene?",
        "minutes": 5,
        "know": "Skrivefeltet er der, hvor du skriver. Med plusknappen (+) tilføjer du filer og billeder og slår dine apps til. Har du ingen knap til websøgning, søger Claude selv på nettet, når det giver mening.",
        "tryIt": "Åbn Claude på claude.ai eller i appen, og find tre ting: knappen til ny chat, plusknappen og indstillingerne.",
        "quiz": "Hvor tilføjer du en fil til din besked?"
       },
       {
        "nr": "1.6",
        "title": "Hvordan finder man en gammel samtale?",
        "minutes": 5,
        "know": "Dine samtaler ligger i sidemenuen med den nyeste øverst.",
        "tryIt": "Start to chats i Claude om to forskellige emner. Find derefter den første igen med søgningen i sidemenuen. Har du en betalt plan, så bed også Claude i en ny chat om at finde den.",
        "quiz": "Hvordan kan du finde en gammel samtale i Claude?"
       }
      ]
     },
     {
      "nr": 2,
      "title": "Din første samtale",
      "description": "Skriv din første prompt, ret svaret, og forstå, hvorfor Claude nogle gange siger nej.",
      "ready": false,
      "lessons": [
       {
        "nr": "2.1",
        "title": "Prompting – hvad er det?",
        "minutes": 5
       },
       {
        "nr": "2.2",
        "title": "Hvordan retter man et svar, man ikke er tilfreds med?",
        "minutes": 5
       },
       {
        "nr": "2.3",
        "title": "Hvordan forgrener man en samtale?",
        "minutes": 5
       },
       {
        "nr": "2.4",
        "title": "Hvorfor vil Claude nogle gange ikke svare?",
        "minutes": 5
       },
       {
        "nr": "2.5",
        "title": "Hvorfor siger Claude, at man har nået sin grænse?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 3,
      "title": "Mere end tekst",
      "description": "Tal og diktér, send filer og billeder, og brug Claude på telefonen.",
      "ready": false,
      "lessons": [
       {
        "nr": "3.1",
        "title": "Hvordan taler man med Claude?",
        "minutes": 5
       },
       {
        "nr": "3.2",
        "title": "Hvordan dikterer man i stedet for at skrive?",
        "minutes": 5
       },
       {
        "nr": "3.3",
        "title": "Hvordan giver man Claude en fil eller et billede?",
        "minutes": 5
       },
       {
        "nr": "3.4",
        "title": "Hvad kan Claude på telefonen?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 4,
      "title": "Brug det sikkert",
      "description": "Tjek svaret, beskyt data, og brug inkognito-chat, når det gælder.",
      "ready": false,
      "lessons": [
       {
        "nr": "4.1",
        "title": "Kan man stole på svaret?",
        "minutes": 5
       },
       {
        "nr": "4.2",
        "title": "Hvad må man ikke dele?",
        "minutes": 5
       },
       {
        "nr": "4.3",
        "title": "Hvordan styrer man, om ens samtaler bruges til træning?",
        "minutes": 5
       },
       {
        "nr": "4.4",
        "title": "Hvad er en inkognito-chat?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 2,
    "name": "Øvet",
    "title": "Brug det i hverdagen",
    "outcome": "Bagefter laver du færdige dokumenter, præsentationer og analyser med Claude.",
    "test": {
     "title": "Øvet-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 5,
      "title": "Bedre prompts og modeller",
      "description": "Prompts, der rammer første gang, og hvilken model du skal vælge.",
      "ready": false,
      "lessons": [
       {
        "nr": "5.1",
        "title": "Hvordan bliver man bedre til at prompte?",
        "minutes": 5
       },
       {
        "nr": "5.2",
        "title": "Hvad er forskellen på Opus, Sonnet og Haiku?",
        "minutes": 5
       },
       {
        "nr": "5.3",
        "title": "Hvad gør tænkning og effort?",
        "minutes": 5
       },
       {
        "nr": "5.4",
        "title": "Hvad er skrivestile, og hvordan bruger man dem?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 6,
      "title": "Find information",
      "description": "Søg på nettet, og lav grundig research med kilder.",
      "ready": false,
      "lessons": [
       {
        "nr": "6.1",
        "title": "Hvordan får man Claude til at søge på nettet?",
        "minutes": 5
       },
       {
        "nr": "6.2",
        "title": "Hvad er Research?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 7,
      "title": "Få det visuelt",
      "description": "Grafer, diagrammer, artifacts og design direkte i samtalen.",
      "ready": false,
      "lessons": [
       {
        "nr": "7.1",
        "title": "Hvordan får man grafer og diagrammer direkte i chatten?",
        "minutes": 5
       },
       {
        "nr": "7.2",
        "title": "Hvad er artifacts?",
        "minutes": 5
       },
       {
        "nr": "7.3",
        "title": "Hvordan laver man design med Claude Design?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 8,
      "title": "Lav færdigt arbejde",
      "description": "Dokumenter, præsentationer, filer og dataanalyse.",
      "ready": false,
      "lessons": [
       {
        "nr": "8.1",
        "title": "Hvordan skriver man dokumenter med Claude Docs?",
        "minutes": 5
       },
       {
        "nr": "8.2",
        "title": "Hvordan laver man præsentationer med Claude Slides?",
        "minutes": 5
       },
       {
        "nr": "8.3",
        "title": "Hvordan laver Claude Word-, Excel-, PowerPoint- og PDF-filer?",
        "minutes": 5
       },
       {
        "nr": "8.4",
        "title": "Hvordan retter man direkte i et udkast?",
        "minutes": 5
       },
       {
        "nr": "8.5",
        "title": "Hvordan analyserer man data med Claude?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 9,
      "title": "Claude i hverdagen",
      "description": "Find dine egne opgaver, lær noget nyt, og del med kolleger.",
      "ready": false,
      "lessons": [
       {
        "nr": "9.1",
        "title": "Hvad kan du bruge Claude til i dit job?",
        "minutes": 5
       },
       {
        "nr": "9.2",
        "title": "Hvordan bruger man Claude til at lære noget nyt?",
        "minutes": 5
       },
       {
        "nr": "9.3",
        "title": "Hvordan deler man samtaler og artifacts med kolleger?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 3,
    "name": "Avanceret",
    "title": "Tilpas Claude til dit arbejde",
    "outcome": "Bagefter kender Claude dit arbejde, dine programmer og dine faste arbejdsgange.",
    "test": {
     "title": "Avanceret-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 10,
      "title": "Gør Claude til din",
      "description": "Instruktioner, hukommelse og styr på, hvad Claude husker.",
      "ready": false,
      "lessons": [
       {
        "nr": "10.1",
        "title": "Hvad er instruktioner til Claude?",
        "minutes": 5
       },
       {
        "nr": "10.2",
        "title": "Hvordan virker Claudes hukommelse?",
        "minutes": 5
       },
       {
        "nr": "10.3",
        "title": "Hvad er følsomme emner i hukommelsen?",
        "minutes": 5
       },
       {
        "nr": "10.4",
        "title": "Hvordan flytter man fra ChatGPT til Claude?",
        "minutes": 5
       },
       {
        "nr": "10.5",
        "title": "Hvad er den månedlige opsummering og pausepåmindelser?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 11,
      "title": "Projekter",
      "description": "Faste arbejdsrum med viden, instruktioner og hukommelse.",
      "ready": false,
      "lessons": [
       {
        "nr": "11.1",
        "title": "Hvad er projekter, og hvordan opretter man dem?",
        "minutes": 5
       },
       {
        "nr": "11.2",
        "title": "Hvordan giver man et projekt viden og instruktioner?",
        "minutes": 5
       },
       {
        "nr": "11.3",
        "title": "Hvordan virker hukommelse i projekter?",
        "minutes": 5
       },
       {
        "nr": "11.4",
        "title": "Hvordan deler man et projekt med kolleger?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 12,
      "title": "Forbind dine apps",
      "description": "Mail, kalender og filer, og hvilke apps Claude må bruge.",
      "ready": false,
      "lessons": [
       {
        "nr": "12.1",
        "title": "Hvad er connectors, og hvordan forbinder de Claude med dine apps?",
        "minutes": 5
       },
       {
        "nr": "12.2",
        "title": "Hvordan forbinder man Claude til mail, kalender og filer?",
        "minutes": 5
       },
       {
        "nr": "12.3",
        "title": "Hvad er interaktive apps i chatten?",
        "minutes": 5
       },
       {
        "nr": "12.4",
        "title": "Hvordan vælger man, hvilke apps Claude må bruge i en samtale?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 13,
      "title": "Claude i dine programmer",
      "description": "Excel, PowerPoint, Word, Google Workspace, Chrome og desktopappen.",
      "ready": false,
      "lessons": [
       {
        "nr": "13.1",
        "title": "Hvordan bruger man Claude i Excel og PowerPoint?",
        "minutes": 5
       },
       {
        "nr": "13.2",
        "title": "Hvordan bruger man Claude i Word?",
        "minutes": 5
       },
       {
        "nr": "13.3",
        "title": "Hvordan bruger man Claude i Google Workspace?",
        "minutes": 5
       },
       {
        "nr": "13.4",
        "title": "Hvad er Claude in Chrome?",
        "minutes": 5
       },
       {
        "nr": "13.5",
        "title": "Hvad er desktopappen, og hvorfor skal man have den?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 14,
      "title": "Skills",
      "description": "Lær Claude dine faste arbejdsgange, så du ikke skal forklare dem hver gang.",
      "ready": false,
      "lessons": [
       {
        "nr": "14.1",
        "title": "Hvad er skills?",
        "minutes": 5
       },
       {
        "nr": "14.2",
        "title": "Hvordan bruger man færdige skills?",
        "minutes": 5
       },
       {
        "nr": "14.3",
        "title": "Hvordan laver man sine egne skills?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 15,
      "title": "Sikkerhed og regler",
      "description": "En sikker konto og loven om AI på arbejdet.",
      "ready": false,
      "lessons": [
       {
        "nr": "15.1",
        "title": "Hvordan holder man sin Claude-konto sikker?",
        "minutes": 5
       },
       {
        "nr": "15.2",
        "title": "Hvad siger loven om AI på arbejdet?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 4,
    "name": "Ekspert",
    "title": "Lad Claude arbejde for dig",
    "outcome": "Bagefter bygger du en arbejdsgang, der kører uden dig, og lærer dine kolleger op.",
    "test": {
     "title": "Ekspert-certifikat",
     "minutes": 30,
     "pass": 80
    },
    "modules": [
     {
      "nr": 16,
      "title": "Lad Claude arbejde selv",
      "description": "Større opgaver, der kører videre, også når du ikke er der.",
      "ready": false,
      "lessons": [
       {
        "nr": "16.1",
        "title": "Hvad er en AI-agent?",
        "minutes": 5
       },
       {
        "nr": "16.2",
        "title": "Hvordan giver man Claude en større opgave?",
        "minutes": 5
       },
       {
        "nr": "16.3",
        "title": "Hvordan arbejder Claude videre, når computeren er lukket?",
        "minutes": 5
       },
       {
        "nr": "16.4",
        "title": "Hvordan giver man Claude opgaver fra telefonen?",
        "minutes": 5
       },
       {
        "nr": "16.5",
        "title": "Hvordan laver man planlagte opgaver?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 17,
      "title": "Claude på din computer og i browseren",
      "description": "Lad Claude klikke, skrive og navigere for dig.",
      "ready": false,
      "lessons": [
       {
        "nr": "17.1",
        "title": "Hvordan lader du Claude styre din computer?",
        "minutes": 5
       },
       {
        "nr": "17.2",
        "title": "Hvordan løser Claude opgaver i Chrome?",
        "minutes": 5
       },
       {
        "nr": "17.3",
        "title": "Hvordan lærer man Claude en arbejdsgang ved at optage den?",
        "minutes": 5
       },
       {
        "nr": "17.4",
        "title": "Hvordan logger Claude sikkert ind for dig med 1Password?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 18,
      "title": "Data og levende overblik",
      "description": "Dashboards, animationer og virksomhedens eget design.",
      "ready": false,
      "lessons": [
       {
        "nr": "18.1",
        "title": "Hvad er Claude Dashboards?",
        "minutes": 5
       },
       {
        "nr": "18.2",
        "title": "Hvordan laver du live artifacts med data fra dine apps?",
        "minutes": 5
       },
       {
        "nr": "18.3",
        "title": "Hvad er Claude Motion?",
        "minutes": 5
       },
       {
        "nr": "18.4",
        "title": "Hvordan bruger man virksomhedens designsystem i Claude?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 19,
      "title": "Byg dine egne værktøjer",
      "description": "Plugins, Claude Code og Claude Platform.",
      "ready": false,
      "lessons": [
       {
        "nr": "19.1",
        "title": "Hvad er plugins, og hvordan installerer man dem?",
        "minutes": 5
       },
       {
        "nr": "19.2",
        "title": "Hvordan bygger og deler man sit eget plugin?",
        "minutes": 5
       },
       {
        "nr": "19.3",
        "title": "Hvad er Claude Code, og kan man bruge det uden at være udvikler?",
        "minutes": 5
       },
       {
        "nr": "19.4",
        "title": "Hvad er API'et og Claude Platform?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 20,
      "title": "Claude i teamet",
      "description": "Claude i Slack, deling, administration og oplæring af kolleger.",
      "ready": false,
      "lessons": [
       {
        "nr": "20.1",
        "title": "Hvad er Claude Tag i Slack?",
        "minutes": 5
       },
       {
        "nr": "20.2",
        "title": "Hvordan deler man skills, plugins og projekter med kolleger?",
        "minutes": 5
       },
       {
        "nr": "20.3",
        "title": "Hvordan styrer en administrator Claude i virksomheden?",
        "minutes": 5
       },
       {
        "nr": "20.4",
        "title": "Hvordan bygger man en hel arbejdsgang med Claude?",
        "minutes": 5
       },
       {
        "nr": "20.5",
        "title": "Hvordan lærer man sine kolleger at bruge Claude?",
        "minutes": 5
       }
      ]
     }
    ]
   }
  ]
 },
 {
  "id": "copilot",
  "tool": "Copilot",
  "headline": "Fra helt grøn til ekspert i Copilot",
  "levels": [
   {
    "nr": 1,
    "name": "Grøn",
    "title": "Kom trygt i gang",
    "outcome": "Bagefter ved du, hvilken Copilot du har, og kan bruge den trygt i hverdagen.",
    "test": {
     "title": "Grøn-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 1,
      "title": "Velkommen til Copilot",
      "description": "Find ud af, hvilken Copilot du har, og hvor du finder den.",
      "ready": true,
      "lessons": [
       {
        "nr": "1.1",
        "title": "Hvad er Copilot?",
        "minutes": 5,
        "know": "Copilot er Microsofts AI-assistent. Du skriver eller taler med den, som du ville gøre med et menneske.",
        "tryIt": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
        "quiz": "Hvilket firma står bag Copilot?"
       },
       {
        "nr": "1.2",
        "title": "Hvilken Copilot har du?",
        "minutes": 5,
        "know": "Der findes tre slags Copilot, og de kan forskellige ting.",
        "tryIt": "Spørg din leder eller IT: Har jeg Copilot Chat, eller har jeg en Microsoft 365 Copilot-licens?",
        "quiz": "Hvilken Copilot kan søge bredt i alle dine mails, filer, møder og chats?"
       },
       {
        "nr": "1.3",
        "title": "Privat konto eller arbejdets?",
        "minutes": 5,
        "know": "Copilot-appen kan rumme både din private Microsoft-konto og din arbejdskonto. Du skifter mellem dem med kontoskifteren i sidemenuen.",
        "tryIt": "Åbn Copilot, og tjek, at du er logget ind med din arbejdskonto. Kig efter det grønne skjold og mærket ”Arbejde” eller ”Work” under dit navn.",
        "quiz": "Hvordan kan du se, at du bruger arbejdskontoen?"
       },
       {
        "nr": "1.4",
        "title": "Hvor finder man Copilot?",
        "minutes": 5,
        "know": "I appen Microsoft Copilot til Windows, Mac, iPhone og Android.",
        "tryIt": "Åbn Copilot to steder: først i appen eller på nettet, derefter inde i Teams eller Outlook. Læg mærke til, hvor knappen til Copilot sidder.",
        "quiz": "Hvor kan du bruge Copilot?"
       },
       {
        "nr": "1.5",
        "title": "Hvor finder man tingene?",
        "minutes": 5,
        "know": "Skrivefeltet er der, hvor du skriver. Med knappen ved skrivefeltet tilføjer du filer og billeder.",
        "tryIt": "Åbn Copilot, og find tre ting: skrivefeltet, modelvælgeren og listen med dine chats.",
        "quiz": "Hvad bruger du modelvælgeren til?"
       },
       {
        "nr": "1.6",
        "title": "Hvordan finder man en gammel samtale?",
        "minutes": 5,
        "know": "Dine samtaler ligger i listen med chats i sidemenuen.",
        "tryIt": "Start to chats i Copilot om to forskellige emner. Giv den første et nyt navn, og find den igen i listen med chats.",
        "quiz": "Hvor finder du dine tidligere samtaler i Copilot?"
       }
      ]
     },
     {
      "nr": 2,
      "title": "Din første samtale",
      "description": "Skriv din første prompt, ret svaret, og forstå, hvorfor Copilot nogle gange siger nej.",
      "ready": false,
      "lessons": [
       {
        "nr": "2.1",
        "title": "Prompting – hvad er det?",
        "minutes": 5
       },
       {
        "nr": "2.2",
        "title": "Hvad er Prompt Gallery?",
        "minutes": 5
       },
       {
        "nr": "2.3",
        "title": "Hvordan retter man et svar, man ikke er tilfreds med?",
        "minutes": 5
       },
       {
        "nr": "2.4",
        "title": "Hvorfor vil Copilot nogle gange ikke svare?",
        "minutes": 5
       },
       {
        "nr": "2.5",
        "title": "Hvorfor siger Copilot, at man har nået sin grænse?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 3,
      "title": "Mere end tekst",
      "description": "Tal og diktér, send filer og billeder, og lav billeder.",
      "ready": false,
      "lessons": [
       {
        "nr": "3.1",
        "title": "Hvordan taler man med Copilot?",
        "minutes": 5
       },
       {
        "nr": "3.2",
        "title": "Hvordan giver man Copilot en fil eller et billede?",
        "minutes": 5
       },
       {
        "nr": "3.3",
        "title": "Hvordan laver man billeder med Copilot?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 4,
      "title": "Brug Copilot sikkert",
      "description": "Tjek svaret og kilderne, og beskyt virksomhedens data.",
      "ready": false,
      "lessons": [
       {
        "nr": "4.1",
        "title": "Kan man stole på svaret?",
        "minutes": 5
       },
       {
        "nr": "4.2",
        "title": "Hvordan bruger man kildehenvisningerne?",
        "minutes": 5
       },
       {
        "nr": "4.3",
        "title": "Hvad må man ikke dele?",
        "minutes": 5
       },
       {
        "nr": "4.4",
        "title": "Hvordan beskytter Copilot virksomhedens data?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 2,
    "name": "Øvet",
    "title": "Brug Copilot i dine programmer",
    "outcome": "Bagefter sparer du tid i Word, Excel, PowerPoint, Outlook og Teams hver uge.",
    "test": {
     "title": "Øvet-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 5,
      "title": "Bedre prompts og modeller",
      "description": "Prompts, der rammer første gang, og hvilken model du skal vælge.",
      "ready": false,
      "lessons": [
       {
        "nr": "5.1",
        "title": "Hvordan bliver man bedre til at prompte?",
        "minutes": 5
       },
       {
        "nr": "5.2",
        "title": "Hvad er Prompt Coach?",
        "minutes": 5
       },
       {
        "nr": "5.3",
        "title": "Hvordan vælger man model?",
        "minutes": 5
       },
       {
        "nr": "5.4",
        "title": "Hvordan skifter man model undervejs?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 6,
      "title": "Find information",
      "description": "Søg på nettet og i dine filer, og lav grundig research.",
      "ready": false,
      "lessons": [
       {
        "nr": "6.1",
        "title": "Hvordan søger Copilot på nettet?",
        "minutes": 5
       },
       {
        "nr": "6.2",
        "title": "Hvad er Copilot Search?",
        "minutes": 5
       },
       {
        "nr": "6.3",
        "title": "Hvad er Researcher?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 7,
      "title": "Copilot i Word og PowerPoint",
      "description": "Skriv, omskriv, og lav præsentationer ud fra dine egne filer.",
      "ready": false,
      "lessons": [
       {
        "nr": "7.1",
        "title": "Hvordan skriver og omskriver man med Copilot i Word?",
        "minutes": 5
       },
       {
        "nr": "7.2",
        "title": "Hvordan får man kildehenvisninger i Word?",
        "minutes": 5
       },
       {
        "nr": "7.3",
        "title": "Hvordan laver man en præsentation ud fra sine egne filer?",
        "minutes": 5
       },
       {
        "nr": "7.4",
        "title": "Hvordan laver man egne skills i PowerPoint?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 8,
      "title": "Copilot i Excel og Outlook",
      "description": "Formler, analyse og en indbakke, der er til at overskue.",
      "ready": false,
      "lessons": [
       {
        "nr": "8.1",
        "title": "Hvordan bruger man Copilot til formler og analyse i Excel?",
        "minutes": 5
       },
       {
        "nr": "8.2",
        "title": "Hvad er Analyst?",
        "minutes": 5
       },
       {
        "nr": "8.3",
        "title": "Hvordan opsummerer og skriver man mails i Outlook?",
        "minutes": 5
       },
       {
        "nr": "8.4",
        "title": "Hvordan rydder man op i indbakken med Copilot?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 9,
      "title": "Copilot i Teams",
      "description": "Mødereferater, opsummeringer og hjælp i chats og kanaler.",
      "ready": false,
      "lessons": [
       {
        "nr": "9.1",
        "title": "Hvordan får man et referat af et møde i Teams?",
        "minutes": 5
       },
       {
        "nr": "9.2",
        "title": "Hvad er video-recap?",
        "minutes": 5
       },
       {
        "nr": "9.3",
        "title": "Hvad er Facilitator?",
        "minutes": 5
       },
       {
        "nr": "9.4",
        "title": "Hvordan bruger man Copilot i chats og kanaler?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 3,
    "name": "Avanceret",
    "title": "Tilpas Copilot til dit arbejde",
    "outcome": "Bagefter samler du dit arbejde i notesbøger, og Copilot kender dine mails, filer og møder.",
    "test": {
     "title": "Avanceret-certifikat",
     "minutes": 10,
     "pass": 80
    },
    "modules": [
     {
      "nr": 10,
      "title": "Gør Copilot til din",
      "description": "Hukommelse og personlige indstillinger.",
      "ready": false,
      "lessons": [
       {
        "nr": "10.1",
        "title": "Hvordan får du Copilot til at huske dig?",
        "minutes": 5
       },
       {
        "nr": "10.2",
        "title": "Hvordan tilpasser man Copilots svar?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 11,
      "title": "Notesbøger og Pages",
      "description": "Saml filer, møder og noter ét sted, og lav færdigt arbejde ud fra dem.",
      "ready": false,
      "lessons": [
       {
        "nr": "11.1",
        "title": "Hvad er Copilot Notebooks?",
        "minutes": 5
       },
       {
        "nr": "11.2",
        "title": "Hvordan tilføjer man filer, møder og mails til en notesbog?",
        "minutes": 5
       },
       {
        "nr": "11.3",
        "title": "Hvordan laver man dokumenter, regneark og præsentationer ud fra en notesbog?",
        "minutes": 5
       },
       {
        "nr": "11.4",
        "title": "Hvordan laver man infografikker, mindmaps og studieguides?",
        "minutes": 5
       },
       {
        "nr": "11.5",
        "title": "Hvad er Copilot Pages, og hvordan samarbejder man i dem?",
        "minutes": 5
       },
       {
        "nr": "11.6",
        "title": "Hvordan optager man lyd og billeder til en notesbog på iPhone?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 12,
      "title": "Copilot kender dit arbejde",
      "description": "Mails, filer, møder, SharePoint og dine andre systemer.",
      "ready": false,
      "lessons": [
       {
        "nr": "12.1",
        "title": "Hvad er Work IQ?",
        "minutes": 5
       },
       {
        "nr": "12.2",
        "title": "Hvordan bruger man Copilot i SharePoint og OneDrive?",
        "minutes": 5
       },
       {
        "nr": "12.3",
        "title": "Hvordan bygger man sites og lister ved at beskrive dem?",
        "minutes": 5
       },
       {
        "nr": "12.4",
        "title": "Hvordan forbinder man Copilot til andre systemer?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 13,
      "title": "Copilot i dine programmer",
      "description": "Edge, Windows, mobilappen og OneNote.",
      "ready": false,
      "lessons": [
       {
        "nr": "13.1",
        "title": "Hvordan bruger man Copilot i Edge?",
        "minutes": 5
       },
       {
        "nr": "13.2",
        "title": "Hvordan bruger man Copilot i Windows?",
        "minutes": 5
       },
       {
        "nr": "13.3",
        "title": "Hvordan bruger man Copilot på telefonen og i bilen?",
        "minutes": 5
       },
       {
        "nr": "13.4",
        "title": "Hvordan bruger man Copilot i OneNote?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 14,
      "title": "Sikkerhed og regler",
      "description": "Følsomhedsmærkater og loven om AI på arbejdet.",
      "ready": false,
      "lessons": [
       {
        "nr": "14.1",
        "title": "Hvad er følsomhedsmærkater, og hvorfor betyder de noget?",
        "minutes": 5
       },
       {
        "nr": "14.2",
        "title": "Hvad siger loven om AI på arbejdet?",
        "minutes": 5
       }
      ]
     }
    ]
   },
   {
    "nr": 4,
    "name": "Ekspert",
    "title": "Lad Copilot arbejde for dig",
    "outcome": "Bagefter bygger du en arbejdsgang, der kører uden dig, og lærer dine kolleger op.",
    "test": {
     "title": "Ekspert-certifikat",
     "minutes": 30,
     "pass": 80
    },
    "modules": [
     {
      "nr": 15,
      "title": "Copilot Cowork",
      "description": "Lad Copilot løse større opgaver, også mens du laver noget andet.",
      "ready": false,
      "lessons": [
       {
        "nr": "15.1",
        "title": "Hvad er en AI-agent?",
        "minutes": 5
       },
       {
        "nr": "15.2",
        "title": "Hvad er forskellen på Chat og Cowork?",
        "minutes": 5
       },
       {
        "nr": "15.3",
        "title": "Hvordan giver man Cowork en opgave?",
        "minutes": 5
       },
       {
        "nr": "15.4",
        "title": "Hvordan laver man planlagte opgaver?",
        "minutes": 5
       },
       {
        "nr": "15.5",
        "title": "Hvordan starter en opgave af sig selv, når der kommer en mail eller en besked?",
        "minutes": 5
       },
       {
        "nr": "15.6",
        "title": "Hvordan holder man overblik over sine opgaver?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 16,
      "title": "Tilpas Copilot",
      "description": "Færdige agenter, plugins og dine egne skills.",
      "ready": false,
      "lessons": [
       {
        "nr": "16.1",
        "title": "Hvordan bruger man de færdige agenter som Researcher og Analyst?",
        "minutes": 5
       },
       {
        "nr": "16.2",
        "title": "Hvordan installerer man plugins?",
        "minutes": 5
       },
       {
        "nr": "16.3",
        "title": "Hvordan laver man sine egne skills?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 17,
      "title": "Byg dine egne agenter",
      "description": "Agent Builder, Copilot Studio og agenter til SharePoint.",
      "ready": false,
      "lessons": [
       {
        "nr": "17.1",
        "title": "Hvad er Agent Builder?",
        "minutes": 5
       },
       {
        "nr": "17.2",
        "title": "Hvad er Copilot Studio?",
        "minutes": 5
       },
       {
        "nr": "17.3",
        "title": "Hvad er SharePoint-agenter?",
        "minutes": 5
       },
       {
        "nr": "17.4",
        "title": "Hvad er Copilot Tuning?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 18,
      "title": "Code og Autopilot",
      "description": "Byg små apps, og lad agenter arbejde i baggrunden.",
      "ready": false,
      "lessons": [
       {
        "nr": "18.1",
        "title": "Hvordan bygger man apps og dashboards med Code?",
        "minutes": 5
       },
       {
        "nr": "18.2",
        "title": "Hvad er Autopilot?",
        "minutes": 5
       }
      ]
     },
     {
      "nr": 19,
      "title": "Copilot i virksomheden",
      "description": "Licenser, administration, måling og oplæring af kolleger.",
      "ready": false,
      "lessons": [
       {
        "nr": "19.1",
        "title": "Hvordan fungerer licenser og forbrugsbetaling?",
        "minutes": 5
       },
       {
        "nr": "19.2",
        "title": "Hvordan styrer en administrator Copilot?",
        "minutes": 5
       },
       {
        "nr": "19.3",
        "title": "Hvordan måler man brugen af Copilot?",
        "minutes": 5
       },
       {
        "nr": "19.4",
        "title": "Hvordan styrer man adgangen til modeller?",
        "minutes": 5
       },
       {
        "nr": "19.5",
        "title": "Hvordan bygger man en hel arbejdsgang med Copilot?",
        "minutes": 5
       },
       {
        "nr": "19.6",
        "title": "Hvordan lærer man sine kolleger at bruge Copilot?",
        "minutes": 5
       }
      ]
     }
    ]
   }
  ]
 }
];
