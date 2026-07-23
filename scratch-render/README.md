# scratch-render

One-off harness that renders the app's real React components per feature and
screenshots them, without needing a backend/Postgres/GigBuddy.

`render.mjs` starts against the Vite dev server (`npm run dev` or `npx vite
--port 5174`), stubs every `/api/*` response with representative "Nightjar"
band data via Playwright route-interception, and screenshots each feature into
`shots/`.

## Run

```
npx vite --port 5174 &        # serve the frontend
npm install playwright        # dev-only; not an app dependency
node scratch-render/render.mjs
```

`render.mjs` pins Chromium via `executablePath` — adjust it for your machine.

Covers: public band page (light + dark), release/smart-link page (mobile +
desktop two-pane), editor Build tab, editor Statistics tab, and the privacy
notice.
