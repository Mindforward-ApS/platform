// Niveautest in the sign-up flow (Marco 2026-11-11): a short test that challenges how much people actually know about
// AI, based on the tool they chose. Six general questions plus two about the chosen tool; every answer is explained.
export type Tool = "chatgpt" | "copilot" | "claude";
export type Q = { q: string; a: string[]; ok: number; why: string };
type Lang = "da" | "en";

const general: Record<Lang, Q[]> = {
  da: [
    { q: "Hvad sker der, når en AI‑chat skriver et svar til dig?", a: ["Den slår svaret op i en database med rigtige svar", "Den forudsiger de mest sandsynlige næste ord ud fra det, den er trænet på", "Den søger altid på Google og kopierer det bedste resultat"], ok: 1, why: "En sprogmodel gætter ord for ord, hvad der passer bedst. Derfor kan den lyde sikker og stadig tage fejl." },
    { q: "AI'en henviser til en rapport, som du ikke kan finde nogen steder. Hvad gør du?", a: ["Bruger den, for AI'en har adgang til mere end mig", "Tjekker kilden selv og bruger den ikke, før den er fundet", "Beder AI'en om at skrive rapporten færdig"], ok: 1, why: "AI kan finde på kilder, der lyder rigtige. Det kaldes hallucination, og derfor tjekker du altid selv." },
    { q: "Hvilken besked giver det bedste svar til en kundemail?", a: ["\"Skriv en mail\"", "\"Skriv en venlig mail til en kunde, hvis pakke er forsinket 3 dage. Undskyld, giv ny dato, max 80 ord\"", "\"SKRIV EN GOD MAIL TIL KUNDEN NU\""], ok: 1, why: "Jo mere du fortæller om situation, tone og længde, jo mindre skal AI'en gætte." },
    { q: "Hvad må du aldrig sætte ind i et AI-værktøj uden at have lov fra din arbejdsplads?", a: ["En pressemeddelelse, der allerede er offentlig", "CPR-numre og oplysninger om kunder", "En opskrift på boller"], ok: 1, why: "Personoplysninger er omfattet af GDPR. Brug kun de værktøjer og data, din arbejdsplads har godkendt." },
    { q: "Svaret er godt, men alt for langt. Hvad er det bedste næste skridt?", a: ["Starte en helt ny samtale", "Skrive i samme samtale: \"Gør det kortere, 3 punkter\"", "Skifte til et andet AI-værktøj"], ok: 1, why: "AI'en husker samtalen. Små rettelser i samme tråd er hurtigere end at starte forfra." },
    { q: "Du har en stor opgave, fx en hel rapport. Hvad giver de bedste resultater?", a: ["Bede om det hele i én besked", "Dele opgaven op i trin og vise et eksempel på, hvad du vil have", "Stille det samme spørgsmål fem gange"], ok: 1, why: "Trin for trin og et godt eksempel giver AI'en en klar retning og færre fejl." },
  ],
  en: [
    { q: "What happens when an AI chat writes an answer for you?", a: ["It looks the answer up in a database of correct answers", "It predicts the most likely next words based on what it was trained on", "It always searches Google and copies the best result"], ok: 1, why: "A language model guesses word by word what fits best. That is why it can sound sure and still be wrong." },
    { q: "The AI refers to a report you cannot find anywhere. What do you do?", a: ["Use it, the AI has access to more than me", "Check the source yourself and don't use it until you find it", "Ask the AI to finish writing the report"], ok: 1, why: "AI can make up sources that sound real. This is called hallucination, so always check yourself." },
    { q: "Which message gives the best answer for a customer email?", a: ["\"Write an email\"", "\"Write a friendly email to a customer whose parcel is 3 days late. Apologise, give a new date, max 80 words\"", "\"WRITE A GOOD EMAIL TO THE CUSTOMER NOW\""], ok: 1, why: "The more you say about the situation, tone and length, the less the AI has to guess." },
    { q: "What must you never paste into an AI tool without permission from your workplace?", a: ["A press release that is already public", "ID numbers and information about customers", "A recipe for buns"], ok: 1, why: "Personal data is covered by GDPR. Only use the tools and data your workplace has approved." },
    { q: "The answer is good but far too long. What is the best next step?", a: ["Start a completely new chat", "Write in the same chat: \"Make it shorter, 3 bullet points\"", "Switch to a different AI tool"], ok: 1, why: "The AI remembers the conversation. Small corrections in the same thread are faster than starting over." },
    { q: "You have a big task, like a whole report. What gives the best results?", a: ["Ask for everything in one message", "Split the task into steps and show an example of what you want", "Ask the same question five times"], ok: 1, why: "Step by step and a good example give the AI a clear direction and fewer mistakes." },
  ],
};

const byTool: Record<Lang, Record<Tool, Q[]>> = {
  da: {
    chatgpt: [
      { q: "Hvad bruger du \"tilpassede instruktioner\" i ChatGPT til?", a: ["At fortælle ChatGPT én gang, hvem du er, og hvordan du vil have svar", "At ændre farverne i programmet", "At dele dine samtaler med kolleger"], ok: 0, why: "Så slipper du for at skrive det samme i starten af hver samtale." },
      { q: "Du uploader et regneark til ChatGPT. Hvad kan den gøre med det?", a: ["Kun læse filnavnet", "Analysere tallene og lave grafer og opsummeringer", "Intet, den kan kun læse tekst"], ok: 1, why: "ChatGPT kan regne på filer og lave grafer. Tjek stadig tallene, før du bruger dem." },
    ],
    copilot: [
      { q: "Hvor arbejder Microsoft 365 Copilot direkte sammen med dig?", a: ["Kun i et separat chatvindue i browseren", "Inde i Word, Outlook, Excel og Teams", "Kun på din telefon"], ok: 1, why: "Copilot sidder i de programmer, du allerede bruger, og kan bruge dine filer og mails, hvis I har givet adgang." },
      { q: "Hvad kan Copilot i Teams hjælpe med efter et møde?", a: ["Opsummere mødet og lave en liste over opgaver", "Booke mødelokaler automatisk", "Ingenting, den virker kun i Word"], ok: 0, why: "Med transskribering slået til kan Copilot lave referat og opgaveliste fra mødet." },
    ],
    claude: [
      { q: "Hvad bruger du \"Projekter\" i Claude til?", a: ["At samle filer og instruktioner om én opgave, så du ikke skal gentage dem", "At planlægge møder i din kalender", "At betale for flere brugere"], ok: 0, why: "Et projekt husker dine dokumenter og instruktioner på tværs af samtaler." },
      { q: "Du har et 60 sider langt dokument. Hvordan bruger du Claude bedst?", a: ["Kopierer én side ad gangen ind over flere dage", "Uploader hele dokumentet og stiller spørgsmål til det", "Beder Claude gætte indholdet ud fra titlen"], ok: 1, why: "Claude kan læse lange dokumenter på én gang og svare på spørgsmål om dem." },
    ],
  },
  en: {
    chatgpt: [
      { q: "What do you use \"custom instructions\" in ChatGPT for?", a: ["Telling ChatGPT once who you are and how you want answers", "Changing the app's colours", "Sharing your chats with colleagues"], ok: 0, why: "Then you don't have to write the same thing at the start of every chat." },
      { q: "You upload a spreadsheet to ChatGPT. What can it do with it?", a: ["Only read the file name", "Analyse the numbers and make charts and summaries", "Nothing, it can only read text"], ok: 1, why: "ChatGPT can work with files and make charts. Still check the numbers before you use them." },
    ],
    copilot: [
      { q: "Where does Microsoft 365 Copilot work directly with you?", a: ["Only in a separate chat window in the browser", "Inside Word, Outlook, Excel and Teams", "Only on your phone"], ok: 1, why: "Copilot sits in the apps you already use and can use your files and mail if access has been granted." },
      { q: "What can Copilot in Teams help with after a meeting?", a: ["Summarise the meeting and list the tasks", "Book meeting rooms automatically", "Nothing, it only works in Word"], ok: 0, why: "With transcription turned on, Copilot can write a summary and task list from the meeting." },
    ],
    claude: [
      { q: "What do you use \"Projects\" in Claude for?", a: ["Collecting files and instructions for one task so you don't repeat them", "Planning meetings in your calendar", "Paying for more users"], ok: 0, why: "A project remembers your documents and instructions across chats." },
      { q: "You have a 60-page document. How do you best use Claude?", a: ["Paste one page at a time over several days", "Upload the whole document and ask questions about it", "Ask Claude to guess the content from the title"], ok: 1, why: "Claude can read long documents in one go and answer questions about them." },
    ],
  },
};

export function questions(lang: Lang, tool: string): Q[] {
  const t = (["chatgpt", "copilot", "claude"] as const).includes(tool as Tool) ? (tool as Tool) : "chatgpt";
  return [...general[lang], ...byTool[lang][t]];
}

export function level(score: number, lang: Lang) {
  const da = lang === "da";
  if (score >= 7) return { name: da ? "Erfaren" : "Advanced", text: da ? "Du kender det grundlæggende. Vi starter dig på de svære opgaver." : "You know the basics. We'll start you on the harder tasks." };
  if (score >= 4) return { name: da ? "Øvet" : "Intermediate", text: da ? "Du har prøvet det før. Vi springer det helt basale over." : "You have tried it before. We'll skip the very basics." };
  return { name: da ? "Begynder" : "Beginner", text: da ? "Helt fint. Vi starter fra bunden og tager det i små skridt." : "That's fine. We'll start from the beginning in small steps." };
}
