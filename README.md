# Rekenhulp

Offline PWA for practising mental arithmetic on a phone, without a calculator. No accounts,
no tracking, no network traffic after the first load.

Practice sets: **Tafels**, **Meten**, **Verhoudingen**, **Getallen & delers** and
**Bewerkingen**. The roadmap is in `CLAUDE.md`, the design in `docs/superpowers/specs/`.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm test        # unit + component tests
npm run check   # type check
npm run dev     # local dev server
npm run build   # static build in dist/
npm run preview # serve dist/ locally
```

## Hosting

`npm run build` produces a fully static `dist/` folder. Upload its contents to any static host.

- **HTTPS is required.** Service workers (offline mode, install) only work over HTTPS or on
  `localhost`.
- **Subfolders are supported** thanks to the relative base (`./`), but the folder URL must end
  with a slash: `https://example.org/rekenhulp/`, not `https://example.org/rekenhulp`. Without
  the slash, relative assets resolve against the parent folder. Configure a redirect if needed.
- Serve `sw.js` without long-lived caching (e.g. `Cache-Control: no-cache`) so updates are
  picked up. The other assets are content-hashed and can be cached long.

## Installing on a phone

- **iOS (Safari):** Share → "Zet op beginscherm".
- **Android (Chrome):** menu → "App installeren".

After the first visit the app works in airplane mode. New versions are installed silently and
become active on the next launch.

## Docs

- Design spec: `docs/superpowers/specs/2026-10-05-rekenhulp-design.md`
- Beta plan: `docs/superpowers/plans/2026-10-05-beta-tafels.md`
