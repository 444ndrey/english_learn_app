# English Learning App

A local-first English learning app. Lessons are generated from your
vocabulary, mistakes, and progress, using AI for content and evaluation.
Everything runs on your machine; progress is stored in a local SQLite file.

## Requirements

- [Node.js](https://nodejs.org/) 18.18 or newer (tested on 24)
- Windows (the launcher produces a `.bat`; the app itself is cross-platform)

## Setup

```bash
npm install
```

Create a `.env` file in the project root (copy `.env.example`):

```env
DEEPSEEK_API_KEY=your_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

## Run (fast, production)

Build once, then launch the compiled app:

```bash
npm run build
```

The build produces a self-contained bundle in `.next/standalone` and, as part
of the build (`postbuild`), generates **`start.bat`** in the project root.

Double-click `start.bat` (or run it) to start the app and open
<http://localhost:3000> in your browser. No rebuild is needed on later
launches — just run `start.bat` again.

### Optional: desktop shortcut

Create a Desktop shortcut with the Aiko mascot icon (run once):

```bash
powershell -ExecutionPolicy Bypass -File scripts\make-shortcut.ps1
```

This writes `aiko.ico` and creates `English Learning App.lnk` on your Desktop.
Re-run it if you move the project folder (the shortcut stores an absolute path).

## Run (development)

```bash
npm run dev
```

Open <http://localhost:3000>. Uses hot reload; not a production build.

## How it works

- `npm run build` runs `next build` then `scripts/postbuild.mjs`, which:
  - copies `public/` and `.next/static/` into the standalone bundle,
  - copies `.env` so the API key is available at runtime,
  - verifies the `better-sqlite3` native binding,
  - writes `start.bat`.
- `start.bat` runs `.next/standalone/server.js` with `NODE_ENV=production`
  and `DATA_DIR=<project>\data`, so your database lives at
  `data/english.db` and survives rebuilds.
- The database file is local and can be backed up independently. Do not
  delete `data/english.db` if you want to keep your progress.

## Data

| Path                | Purpose                          |
| ------------------- | -------------------------------- |
| `data/english.db`   | Vocabulary, lessons, progress    |
| `data/characters.json` | Mascots (Aiko, Ren)           |
| `.env`              | AI API credentials (not committed) |

## Scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Development server with hot reload             |
| `npm run build`     | Production build + standalone + `start.bat`    |
| `npm run start`     | Start the compiled app (non-standalone)        |
| `npm run lint`      | Lint the project                               |
