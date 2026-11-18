# Mindforward Platform

The e-learning platform (the logged-in app). Separate from the website (web-skabelon on :3400–3404).

- Dev: `npm run dev` → http://localhost:3500
- Colours, Inter and buttons are copied from web-skabelon `globals.css` (theme-night: cream, brown, coral).
- Reference screenshots go in `design/references/`.

## Screens (all demo data, see `src/content/platform.ts`)
- `/` Oversigt · `/kurser` (filter, search, sort) · `/kurser/[slug]` lesson list · `/kurser/[slug]/[n]` lesson view
- `/oevemiljoe` practice environment (canned AI reply + score, marked "Eksempeldata")
- `/plan` week/month calendar (from the Skillzone calendar reference)
- `/beviser` · `/hold` (manager view) · `/beskeder` · `/hjaelp` · `/indstillinger`
- Style: `.app` tokens at the end of `globals.css` (white, zinc greys, ink #18181b, coral accent, radii 8/6).
