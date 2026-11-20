# Hændelsesplan: brud på persondatasikkerheden

> **UDKAST, ikke juridisk gennemgået.** Skrevet ud fra docs/10 § 125 og GDPR art. 33–34. Frister, roller og
> skabeloner skal godkendes af advokat før lancering (launch gate D6). Punkter mærket `[JURA]` skal verificeres.

## 1. Hvad tæller som et brud
Et brud er enhver hændelse, der fører til, at persondata ved et uheld eller ulovligt bliver **ødelagt, mistet,
ændret, videregivet eller tilgået** uden tilladelse. Også hvis det kun er en mistanke, og også hvis det sker hos
en underdatabehandler (se `/underdatabehandlere`).

Eksempler hos os:
- En bruger kan se en anden virksomheds medarbejdere, svar eller certifikater (fejl i adgangskontrol).
- Prompt-tekster eller rapporter er sendt til den forkerte modtager.
- En hemmelig nøgle (database, Stripe, Resend, Anthropic) er lækket i kode, logs eller chat.
- En underdatabehandler melder et brud (Vercel, Neon, Anthropic, Stripe, Resend, Inngest, PostHog, Sentry).
- Databasen er slettet eller ændret uden backup-mulighed.

## 2. Roller
| Rolle | Hvem | Ansvar |
|---|---|---|
| Hændelsesansvarlig | Marco (Esther Gruppen ApS) | Leder forløbet, beslutter anmeldelse |
| Teknisk | Udvikler på vagt | Stopper bruddet, sikrer logs, finder omfang |
| Juridisk | Advokat `[JURA: navn/aftale]` | Vurderer risiko og anmeldelsespligt |

Vi er **dataansvarlig** for privatkunder og for vores egne kunderegistre, og **databehandler** for
virksomhedskunders medarbejderdata (databehandleraftalen, `content/legal/dpa.v1.md`).

## 3. Forløb (start uret ved første viden om bruddet)
**0–1 time: stop og sikr**
1. Opret en hændelsesnote (tidspunkt, hvem opdagede det, hvad vi ved). Alt tidsstemples.
2. Stop bruddet: slå relevant kill switch fra (`FeatureFlag`, fx `AI_ENABLED`), rul deploy tilbage i Vercel,
   eller luk endpointet.
3. Rotér lækkede nøgler med det samme (Vercel env, Neon, Stripe, Resend, Anthropic, Better Auth secret).
   Rotation af auth-secret logger alle ud.
4. Gem beviser: Vercel logs, Sentry events, `AuditLog`-rækker, Neon branch/snapshot før oprydning.

**1–24 timer: omfang**
5. Hvilke data, hvilke personer (antal), hvilke virksomheder, hvilken periode. Brug `AuditLog` og DB-forespørgsler
   på en Neon-branch, aldrig direkte i produktion.
6. Vurdér risikoen for de berørte: lav / risiko / høj risiko (fx ID-tyveri, tab af fortrolighed, diskrimination).
   Prompt-tekster kan indeholde arbejdsoplysninger, selvom PII-filteret blokerer CPR/kort/konto.

**Senest 72 timer: anmeld** `[JURA: verificér frist og undtagelser]`
7. **Som dataansvarlig:** anmeld til Datatilsynet inden 72 timer, medmindre bruddet sandsynligvis ikke medfører
   risiko. Anmeldelse sker via Datatilsynets digitale formular. Mangler oplysninger, anmeldes det, vi ved, og
   resten eftersendes.
8. **Som databehandler:** underret de berørte virksomhedskunder **uden unødig forsinkelse** efter databehandleraftalen,
   så de kan anmelde selv. Send til virksomhedens ejer/admin-mail.
9. **Høj risiko for personer:** underret de berørte personer direkte i klart sprog (art. 34).

**Efter**
10. Registrér bruddet i brudloggen (også brud, der ikke anmeldes): hvad skete, virkninger, hvad vi gjorde.
11. Opfølgning: årsag, test der fanger fejlen, opdatér denne plan.

## 4. Skabelon: besked til virksomhedskunde (udkast)
> Emne: Sikkerhedshændelse hos Mindforward
>
> Vi skriver, fordi vi den [dato kl.] opdagede en sikkerhedshændelse, der berører data fra [virksomhed].
> Hvad skete: [kort]. Hvilke data: [kategorier]. Hvem: [antal medarbejdere]. Hvad vi har gjort: [tiltag].
> Hvad I skal gøre: [evt. intet / anmeldelse som dataansvarlig]. Kontakt: [navn, mail, telefon].

## 5. Brudlog
Føres i et separat, adgangsbegrænset dokument `[JURA: placering]`. Én række pr. hændelse: dato, opdaget af,
beskrivelse, data og antal, risikovurdering, anmeldt (ja/nej, dato, journalnummer), underrettet (hvem, dato).

## 6. Øvelse
Gennemgå planen én gang før lancering med en fiktiv hændelse (fx lækket Resend-nøgle), og derefter én gang om året.
