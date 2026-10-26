// Feature pages in the øvemiljø (/sandkasse/<track>/funktion/<id>). The tool's name is inserted as {tool}.
// Registered in ./da.ts as `sandboxGuide`.
export const daSandboxGuide = {
  eyebrow: "Funktion i {tool}",
  back: "Tilbage til øvemiljøet",
  what: "Det gør funktionen",
  inTool: "Sådan finder du den i {tool}",
  tryIt: "Prøv det her",
  tryItReady: "Øvemiljøet herunder er åbnet på funktionen. Det bruger kun Nordlys' øvedata.",
  tryItSoon: "Øvelsen til denne funktion bygges lige nu. Du kan stadig chatte med Øvemodel herunder.",
  checked: "Tjekket mod {tool}s hjælpesider {date}. Funktioner og planer ændrer sig ofte.",
  others: "Andre funktioner",
} as const;
