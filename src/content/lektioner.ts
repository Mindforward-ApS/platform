// Real lesson content for module 1 of each tool (copied 2026-11-03 from mindforward-brain/platform/content/forloeb/forloeb.json).
export type Lektion = { nr: string; title: string; minutes: number; know: string[]; tryIt: { where: string; text: string; prefill: string | null }; quiz: { question: string; options: string[]; correctIndex: number } };
export const lektioner: Record<string, { tool: string; module: { nr: number; title: string }; lessons: Lektion[] }> = {
 "chatgpt": {
  "tool": "ChatGPT",
  "module": {
   "nr": 1,
   "title": "Velkommen til ChatGPT"
  },
  "lessons": [
   {
    "nr": "1.1",
    "title": "Hvad er ChatGPT?",
    "minutes": 5,
    "know": [
     "ChatGPT er et AI-program fra firmaet OpenAI. Du skriver eller taler med det, som du ville gøre med et menneske.",
     "Du giver det en opgave, og det svarer med det samme. Det kan fx skrive en mail, forklare noget svært, opsummere en lang tekst eller komme med idéer.",
     "Som udgangspunkt slår ChatGPT ikke svaret op, som Google gør. Det formulerer svaret ud fra det, det har lært. Derfor kan det lyde sikkert, også når det tager fejl. Det lærer du at håndtere i modul 4.",
     "ChatGPT kan også søge på nettet. Det lærer du i modul 6."
    ],
    "tryIt": {
     "where": "oevemiljoe",
     "text": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
     "prefill": "Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job]."
    },
    "quiz": {
     "question": "Hvad er den største forskel på ChatGPT og Google?",
     "options": [
      "ChatGPT er hurtigere",
      "ChatGPT formulerer et svar, mens Google finder sider",
      "ChatGPT er altid gratis"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.2",
    "title": "Hvordan kommer man i gang?",
    "minutes": 5,
    "know": [
     "Gå ind på chatgpt.com, eller hent appen ”ChatGPT” i App Store eller Google Play.",
     "Opret en konto med din mail, Google, Microsoft eller Apple. Du kan prøve uden konto, men med en konto bliver dine samtaler gemt.",
     "Bruger din arbejdsplads ChatGPT, skal du logge ind med din arbejdsmail. Det handler lektion 1.4 om.",
     "Skriv i skrivefeltet, og tryk Enter. Du kan ikke ødelægge noget.",
     "Rammer svaret ikke helt, så skriv, hvad der skal ændres, fx ”gør det kortere” eller ”skriv det mere uformelt”."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Log ind i ChatGPT, og skriv: ”Skriv et forslag til en kort tale til en kollega med 10-årsjubilæum, fem linjer.” Skriv derefter: ”Gør den lidt sjovere.”",
     "prefill": null
    },
    "quiz": {
     "question": "Svaret er ikke helt, som du ville have det. Hvad gør du?",
     "options": [
      "Starter en ny chat og skriver det samme igen",
      "Skriver tilbage, hvad der skal ændres",
      "Giver op og skriver selv"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.3",
    "title": "Gratis eller betalt?",
    "minutes": 5,
    "know": [
     "Gratisversionen er nok til at komme i gang. Du kan skrive, tale, sende filer og billeder og få svar.",
     "Betalte planer giver højere grænser for filer, billeder og værktøjer og flere funktioner. Fra Plus og opefter får du også en stærkere model.",
     "Et eksempel er Work, som laver større opgaver for dig. På Free og Go kan du kun bruge Work i begrænset omfang i desktopappen.",
     "Til privatpersoner hedder planerne Free, Go, Plus og Pro. Til virksomheder hedder de Business og Enterprise.",
     "Priser og funktioner skifter ofte. Tjek altid chatgpt.com/pricing, før du vælger."
    ],
    "tryIt": {
     "where": "offline",
     "text": "Skriv tre opgaver ned, som du gerne vil bruge ChatGPT til i de næste to uger. Kan gratisversionen klare dem? I starten kan den næsten altid.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvilke planer er lavet til virksomheder?",
     "options": [
      "Plus og Pro",
      "Business og Enterprise",
      "Free og Go"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.4",
    "title": "Privat konto eller arbejdets?",
    "minutes": 5,
    "know": [
     "Har din arbejdsplads ChatGPT Business eller Enterprise, skal du bruge den til arbejde, ikke din private konto.",
     "På Business og Enterprise bruger OpenAI som standard ikke jeres samtaler til at træne sine modeller.",
     "På en privat konto kan dine samtaler bruges til at forbedre modellerne, medmindre du slår det fra i indstillingerne.",
     "Arbejdsdokumenter, kundedata og interne tal hører kun hjemme på arbejdskontoen, og kun hvis jeres interne regler tillader det."
    ],
    "tryIt": {
     "where": "offline",
     "text": "Spørg din leder eller IT: Har vi en fælles ChatGPT-løsning, og hvilken mail skal jeg logge ind med?",
     "prefill": null
    },
    "quiz": {
     "question": "Din arbejdsplads har en fælles ChatGPT-løsning. Du skal opsummere et internt notat. Hvilken konto bruger du?",
     "options": [
      "Min private konto",
      "Arbejdets konto",
      "Det er lige meget"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.5",
    "title": "Hvor finder man tingene?",
    "minutes": 5,
    "know": [
     "Skrivefeltet er der, hvor du skriver. Med plusknappen (+) ved siden af tilføjer du filer, billeder og værktøjer.",
     "Mikrofonen i skrivefeltet bruger du til at diktere. Med stemmeknappen ved siden af taler du med ChatGPT.",
     "Sidemenuen til venstre har ny chat, søgning, dine tidligere samtaler, projekter og dit bibliotek af filer. På nogle betalte planer hedder biblioteket Space.",
     "Indstillingerne under dit navn styrer bl.a. hukommelse, personalisering og datakontrol.",
     "Placeringen kan flytte sig lidt, når OpenAI opdaterer appen. Navnene på tingene ændrer sig sjældnere."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Åbn ChatGPT på chatgpt.com eller i appen, og find tre ting: knappen til ny chat, plusknappen og indstillingerne.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvor tilføjer du en fil til din besked?",
     "options": [
      "Med plusknappen ved skrivefeltet",
      "I indstillingerne",
      "Med knappen til ny chat"
     ],
     "correctIndex": 0
    }
   },
   {
    "nr": "1.6",
    "title": "Hvordan finder man en gammel samtale?",
    "minutes": 5,
    "know": [
     "Dine samtaler gemmes i sidemenuen med den nyeste øverst.",
     "Søgningen i sidemenuen leder i dine chats, projekter, billeder og dokumenter på én gang.",
     "Samtaler, du bruger tit, kan du fastgøre, så de altid ligger øverst.",
     "Giv samtaler et navn, der siger, hvad de handler om. Så er de nemmere at finde igen.",
     "Midlertidige chats bliver som standard ikke gemt i listen. Dem lærer du om i modul 4."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Start to chats i ChatGPT om to forskellige emner. Find derefter den første igen med søgningen.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvor leder søgningen i sidemenuen?",
     "options": [
      "Kun i titlerne på dine chats",
      "I chats, projekter, billeder og dokumenter",
      "På internettet"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.7",
    "title": "Hvor kan man ellers bruge ChatGPT?",
    "minutes": 5,
    "know": [
     "På telefonen (iOS og Android) kan du også bruge kameraet og stemmen.",
     "Desktopappen findes til Mac og Windows og som prøveversion til Linux.",
     "I Word, Excel og PowerPoint kan du bruge ChatGPTs tilføjelsesprogram. ChatGPT findes også i Google Sheets.",
     "I browseren kan du bruge ChatGPTs udvidelse.",
     "På WhatsApp kan du skrive med ChatGPT uden konto, også i EU.",
     "I bilen kan du tale med ChatGPT via Apple CarPlay.",
     "Logger du ind med den samme konto, følger dine samtaler med på alle enheder."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Hent appen på din telefon, og log ind med den samme konto. Tjek, at samtalen fra lektion 1.2 også ligger der.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvad sker der, når du logger ind på telefonen med den samme konto?",
     "options": [
      "Du starter forfra uden samtaler",
      "Dine samtaler er der også",
      "Du skal betale for en ekstra konto"
     ],
     "correctIndex": 1
    }
   }
  ]
 },
 "claude": {
  "tool": "Claude",
  "module": {
   "nr": 1,
   "title": "Velkommen til Claude"
  },
  "lessons": [
   {
    "nr": "1.1",
    "title": "Hvad er Claude?",
    "minutes": 5,
    "know": [
     "Claude er et AI-program fra firmaet Anthropic. Du skriver eller taler med det, som du ville gøre med et menneske.",
     "Du giver Claude en opgave, og det svarer med det samme. Det kan fx skrive en mail, forklare noget svært, opsummere et langt dokument eller komme med idéer.",
     "Claude kan også lave færdigt arbejde som dokumenter, præsentationer og regneark, som du kan rette i bagefter.",
     "Som udgangspunkt formulerer Claude svaret ud fra det, det har lært. Derfor kan det lyde sikkert, også når det tager fejl. Det lærer du at håndtere i modul 4.",
     "Claude kan også søge på nettet. Det lærer du i modul 6."
    ],
    "tryIt": {
     "where": "oevemiljoe",
     "text": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
     "prefill": "Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job]."
    },
    "quiz": {
     "question": "Hvilket firma står bag Claude?",
     "options": [
      "OpenAI",
      "Anthropic",
      "Microsoft"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.2",
    "title": "Hvordan kommer man i gang?",
    "minutes": 5,
    "know": [
     "Gå ind på claude.ai, eller hent appen ”Claude” i App Store eller Google Play. Der findes også en desktopapp til Mac og Windows.",
     "Opret en konto med din mail eller din Google-konto. Du skal have en konto for at bruge Claude.",
     "Bruger din arbejdsplads Claude, skal du logge ind med din arbejdsmail. Det handler lektion 1.4 om.",
     "Skriv i skrivefeltet, og tryk Enter. Du kan ikke ødelægge noget.",
     "Rammer svaret ikke helt, så skriv, hvad der skal ændres, fx ”gør det kortere” eller ”skriv det mere uformelt”."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Log ind i Claude, og skriv: ”Skriv et forslag til en kort tale til en kollega med 10-årsjubilæum, fem linjer.” Skriv derefter: ”Gør den lidt sjovere.”",
     "prefill": null
    },
    "quiz": {
     "question": "Svaret er ikke helt, som du ville have det. Hvad gør du?",
     "options": [
      "Starter en ny chat og skriver det samme igen",
      "Skriver tilbage, hvad der skal ændres",
      "Giver op og skriver selv"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.3",
    "title": "Gratis eller betalt?",
    "minutes": 5,
    "know": [
     "Gratisversionen er nok til at komme i gang. Du kan skrive, sende filer og billeder, søge på nettet og lave dokumenter.",
     "Betalte planer giver mere forbrug, adgang til de stærkeste modeller og flere funktioner, fx Research, Claude i Excel og PowerPoint og Claude in Chrome.",
     "Til privatpersoner hedder planerne Free, Pro og Max. Til virksomheder hedder de Team og Enterprise.",
     "Priser og funktioner skifter ofte. Tjek altid claude.com/pricing, før du vælger."
    ],
    "tryIt": {
     "where": "offline",
     "text": "Skriv tre opgaver ned, som du gerne vil bruge Claude til i de næste to uger. Kan gratisversionen klare dem? I starten kan den næsten altid.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvilke planer er lavet til virksomheder?",
     "options": [
      "Pro og Max",
      "Team og Enterprise",
      "Free og Pro"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.4",
    "title": "Privat konto eller arbejdets?",
    "minutes": 5,
    "know": [
     "Har din arbejdsplads Claude Team eller Enterprise, skal du bruge den til arbejde, ikke din private konto.",
     "På Team og Enterprise bruger Anthropic som standard ikke jeres samtaler til at træne sine modeller.",
     "På en privat konto (Free, Pro og Max) vælger du selv i indstillingerne for privatliv, om dine samtaler må bruges til at forbedre Claude.",
     "På Team og Enterprise er hukommelse som standard slået fra. Jeres administrator bestemmer, om den må bruges, og derefter slår du den selv til i indstillingerne.",
     "Arbejdsdokumenter, kundedata og interne tal hører kun hjemme på arbejdskontoen, og kun hvis jeres interne regler tillader det."
    ],
    "tryIt": {
     "where": "offline",
     "text": "Spørg din leder eller IT: Har vi en fælles Claude-løsning, og hvilken mail skal jeg logge ind med?",
     "prefill": null
    },
    "quiz": {
     "question": "Din arbejdsplads har en fælles Claude-løsning. Du skal opsummere et internt notat. Hvilken konto bruger du?",
     "options": [
      "Min private konto",
      "Arbejdets konto",
      "Det er lige meget"
     ],
     "correctIndex": 1
    }
   },
   {
    "nr": "1.5",
    "title": "Hvor finder man tingene?",
    "minutes": 5,
    "know": [
     "Skrivefeltet er der, hvor du skriver. Med plusknappen (+) tilføjer du filer og billeder og slår dine apps til. Har du ingen knap til websøgning, søger Claude selv på nettet, når det giver mening.",
     "Mikrofonen i skrivefeltet bruger du til at diktere.",
     "Modelvælgeren ved skrivefeltet bestemmer, hvilken Claude-model der svarer, og hvor meget den tænker.",
     "Sidemenuen til venstre har ny chat, dine tidligere samtaler, projekter og artifacts.",
     "Indstillingerne under dit navn styrer bl.a. instruktioner til Claude, hukommelse, privatliv og dit forbrug.",
     "Placeringen kan flytte sig lidt, når Anthropic opdaterer appen. Navnene på tingene ændrer sig sjældnere."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Åbn Claude på claude.ai eller i appen, og find tre ting: knappen til ny chat, plusknappen og indstillingerne.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvor tilføjer du en fil til din besked?",
     "options": [
      "Med plusknappen ved skrivefeltet",
      "I sidemenuen",
      "Med knappen til ny chat"
     ],
     "correctIndex": 0
    }
   },
   {
    "nr": "1.6",
    "title": "Hvordan finder man en gammel samtale?",
    "minutes": 5,
    "know": [
     "Dine samtaler ligger i sidemenuen med den nyeste øverst.",
     "Du kan søge i dine samtaler fra sidemenuen.",
     "På en betalt plan kan du også bede Claude om at finde en tidligere samtale, fx ”find vores chat om budgettet”. Det virker, når søgning i tidligere chats er slået til i indstillingerne. Det er den som standard.",
     "Samtaler, du bruger tit, kan du stjernemarkere, så du hurtigt finder dem igen.",
     "Inkognito-chats bliver ikke gemt i din historik. Dem lærer du om i modul 4."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Start to chats i Claude om to forskellige emner. Find derefter den første igen med søgningen i sidemenuen. Har du en betalt plan, så bed også Claude i en ny chat om at finde den.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvordan kan du finde en gammel samtale i Claude?",
     "options": [
      "Kun ved at scrolle ned gennem listen",
      "Ved at søge eller bede Claude om at finde den",
      "Det kan man ikke"
     ],
     "correctIndex": 1
    }
   }
  ]
 },
 "copilot": {
  "tool": "Copilot",
  "module": {
   "nr": 1,
   "title": "Velkommen til Copilot"
  },
  "lessons": [
   {
    "nr": "1.1",
    "title": "Hvad er Copilot?",
    "minutes": 5,
    "know": [
     "Copilot er Microsofts AI-assistent. Du skriver eller taler med den, som du ville gøre med et menneske.",
     "Copilot findes der, hvor du allerede arbejder: i Word, Excel, PowerPoint, Outlook, Teams, Edge og Windows og i sin egen app.",
     "Copilot bruger AI-modeller fra blandt andre OpenAI og Anthropic, og ofte kan du selv vælge model. I EU skal din virksomhed selv slå modellerne fra Anthropic til.",
     "Copilot formulerer svaret ud fra det, den har lært, og ud fra det, den finder på nettet. Den kan lyde sikker, også når den tager fejl. Det lærer du at håndtere i modul 4.",
     "Med en Microsoft 365 Copilot-licens kan Copilot også bruge dine mails, filer, møder og chats. Det lærer du om i lektion 1.2."
    ],
    "tryIt": {
     "where": "oevemiljoe",
     "text": "Skriv i øvemiljøet: ”Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job].”",
     "prefill": "Forklar i fem punkter, hvad du kan hjælpe mig med i mit job som [dit job]."
    },
    "quiz": {
     "question": "Hvilket firma står bag Copilot?",
     "options": [
      "Microsoft",
      "Google",
      "Apple"
     ],
     "correctIndex": 0
    }
   },
   {
    "nr": "1.2",
    "title": "Hvilken Copilot har du?",
    "minutes": 5,
    "know": [
     "Der findes tre slags Copilot, og de kan forskellige ting.",
     "Gratis Copilot er til privatpersoner og bruges med en personlig Microsoft-konto. Har du Microsoft 365 Personal eller Family, får du også Copilot i Word, Excel og PowerPoint.",
     "Copilot Chat følger gratis med virksomhedens Microsoft 365-abonnement. Den henter viden fra nettet og fra de filer, du selv giver den. I Outlook kan den også bruge din indbakke og kalender, men den kan ikke søge bredt i alle dine mails, filer, møder og chats.",
     "Microsoft 365 Copilot kræver en ekstra licens. Så får du Copilot fuldt ud i Word, Excel, PowerPoint, Outlook og Teams, og den kan bruge dine mails, filer, møder og chats.",
     "De nyeste agenter, fx Cowork, betales efter forbrug oven i licensen.",
     "Er du i tvivl, så spørg din IT-afdeling, hvilken Copilot du har."
    ],
    "tryIt": {
     "where": "offline",
     "text": "Spørg din leder eller IT: Har jeg Copilot Chat, eller har jeg en Microsoft 365 Copilot-licens?",
     "prefill": null
    },
    "quiz": {
     "question": "Hvilken Copilot kan søge bredt i alle dine mails, filer, møder og chats?",
     "options": [
      "Gratis Copilot",
      "Copilot Chat",
      "Microsoft 365 Copilot med licens"
     ],
     "correctIndex": 2
    }
   },
   {
    "nr": "1.3",
    "title": "Privat konto eller arbejdets?",
    "minutes": 5,
    "know": [
     "Copilot-appen kan rumme både din private Microsoft-konto og din arbejdskonto. Du skifter mellem dem med kontoskifteren i sidemenuen.",
     "Arbejdskontoen er mærket ”Arbejde” eller ”Work” og har et grønt skjold. Skjoldet betyder, at virksomhedens databeskyttelse er slået til.",
     "Med arbejdskontoen bliver dine spørgsmål og svar ikke brugt til at træne de AI-modeller, Copilot bygger på.",
     "Data flyder ikke mellem din private konto og din arbejdskonto.",
     "Arbejdsdokumenter, kundedata og interne tal hører kun hjemme på arbejdskontoen, og kun hvis jeres interne regler tillader det."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Åbn Copilot, og tjek, at du er logget ind med din arbejdskonto. Kig efter det grønne skjold og mærket ”Arbejde” eller ”Work” under dit navn.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvordan kan du se, at du bruger arbejdskontoen?",
     "options": [
      "Der er et grønt skjold",
      "Skærmen bliver mørk",
      "Der står ”Gratis” øverst"
     ],
     "correctIndex": 0
    }
   },
   {
    "nr": "1.4",
    "title": "Hvor finder man Copilot?",
    "minutes": 5,
    "know": [
     "I appen Microsoft Copilot til Windows, Mac, iPhone og Android.",
     "På nettet på copilot.cloud.microsoft. Med en privat konto kan du også bruge copilot.microsoft.com.",
     "Inde i Outlook og Teams. I Word, Excel og PowerPoint afhænger det af jeres licens. Med en licens kan Copilot arbejde direkte i dine dokumenter og mails.",
     "I browseren Edge og i Windows."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Åbn Copilot to steder: først i appen eller på nettet, derefter inde i Teams eller Outlook. Læg mærke til, hvor knappen til Copilot sidder.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvor kan du bruge Copilot?",
     "options": [
      "Kun i Word",
      "Kun på nettet",
      "I appen, på nettet og inde i Microsoft 365-programmerne"
     ],
     "correctIndex": 2
    }
   },
   {
    "nr": "1.5",
    "title": "Hvor finder man tingene?",
    "minutes": 5,
    "know": [
     "Skrivefeltet er der, hvor du skriver. Med knappen ved skrivefeltet tilføjer du filer og billeder.",
     "Med mikrofonen kan du tale i stedet for at skrive.",
     "Modelvælgeren bestemmer, hvilken AI-model der svarer.",
     "Har du en licens, og har din virksomhed slået Cowork til, kan du skifte mellem Chat og Cowork øverst. Chat er til spørgsmål og svar, mens Cowork løser større opgaver for dig.",
     "Sidemenuen har dine chats, dine notesbøger og dine agenter. I nyere udgaver finder du agenterne under Plugins.",
     "Knapperne kan flytte sig lidt, når Microsoft opdaterer appen, og nogle gange skifter de navn."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Åbn Copilot, og find tre ting: skrivefeltet, modelvælgeren og listen med dine chats.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvad bruger du modelvælgeren til?",
     "options": [
      "At vælge, hvilken AI-model der svarer",
      "At skifte sprog",
      "At slette dine chats"
     ],
     "correctIndex": 0
    }
   },
   {
    "nr": "1.6",
    "title": "Hvordan finder man en gammel samtale?",
    "minutes": 5,
    "know": [
     "Dine samtaler ligger i listen med chats i sidemenuen.",
     "Du kan give en chat et nyt navn, så den er nem at finde igen. Vælg de tre prikker ved chatten.",
     "Fra samme menu kan du flytte en chat til en notesbog eller slette den.",
     "Chats fra din private konto og din arbejdskonto holdes adskilt. Skift konto for at se den anden liste."
    ],
    "tryIt": {
     "where": "tool",
     "text": "Start to chats i Copilot om to forskellige emner. Giv den første et nyt navn, og find den igen i listen med chats.",
     "prefill": null
    },
    "quiz": {
     "question": "Hvor finder du dine tidligere samtaler i Copilot?",
     "options": [
      "I listen med chats i sidemenuen",
      "I Outlook",
      "Du kan ikke finde dem igen"
     ],
     "correctIndex": 0
    }
   }
  ]
 }
};
