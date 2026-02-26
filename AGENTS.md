# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is **Tilda IA Agent** — a Chrome Extension (Manifest V3) that automates blog post creation in Tilda's "Feeds" section using AI (Gemini 3 Pro for text, Nano Banana Pro / Gemini Image / GPT Image for covers, Yandex Wordstat for SEO keywords).

### Tech stack

- **Pure vanilla JavaScript** (ES2020+), HTML5, CSS3
- **No build step**, no bundler, no npm dependencies, no `package.json`
- Chrome Extension Manifest V3 with service worker (`background.js`)
- All data stored in `chrome.storage.local`

### Development workflow

1. Load the extension as "unpacked" in Chrome at `chrome://extensions/` with Developer Mode enabled, pointing to `/workspace`.
2. After code changes, click the reload button on the extension card in `chrome://extensions/`.
3. The extension popup is at `popup/popup.html`; the content script panel injects into Tilda editor pages.

### Linting and testing

- No ESLint or linter is configured. Use `node --check <file>.js` for syntax validation on all JS files.
- No automated test framework is configured (Playwright files are gitignored).
- Manual testing requires loading the extension in Chrome, navigating to a Tilda Feeds editor page, and interacting with the injected panel.

### Key files

| File | Role |
|---|---|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | Service worker: AI orchestration, Wordstat, API routing |
| `lib/api-text.js` | Gemini text generation (streaming chat + structured JSON posts) |
| `lib/api-image.js` | Image generation (Nano Banana Pro / Gemini Image / GPT Image) |
| `lib/api-wordstat.js` | Yandex Wordstat SEO keyword collection |
| `content/content.js` | Content script: floating UI panel + DOM auto-fill logic (~3k lines) |
| `content/content.css` | Styles for the injected panel |
| `content/injected.js` | Page-context script to intercept Tilda save requests |
| `popup/popup.html` | Extension popup: settings UI |
| `popup/popup.js` | Popup logic (API keys, author, tone, RAG) |

### External APIs (require user-provided keys)

- **kie.ai** (default): proxy hub for Gemini 3 Pro text + Nano Banana Pro images
- **Google AI Studio** (optional alternative): direct Gemini 3.1 Pro text + Gemini 3 Pro Image
- **Yandex Wordstat** (optional): SEO keyword research

### Gotchas

- The extension icon `tilda-kovcheg.png` must exist in the project root for Chrome to display the icon correctly.
- `content/content.js` is very large (~150K chars). Changes to it require careful attention to the IIFE scope.
- API provider selection (`kie` vs `official`) changes URL endpoints and request body format significantly in `api-text.js` and `api-image.js`.
