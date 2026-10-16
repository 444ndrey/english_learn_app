import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const standaloneDir = path.join(nextDir, "standalone");

function log(msg) {
  console.log(`[postbuild] ${msg}`);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

if (!fs.existsSync(standaloneDir)) {
  log("no .next/standalone output found — is `output: \"standalone\"` set? Skipping.");
  process.exit(0);
}

if (copyDir(path.join(root, "public"), path.join(standaloneDir, "public"))) {
  log("copied public/ -> .next/standalone/public/");
}

if (copyDir(path.join(nextDir, "static"), path.join(standaloneDir, ".next", "static"))) {
  log("copied .next/static/ -> .next/standalone/.next/static/");
}

const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, path.join(standaloneDir, ".env"));
  log("copied .env -> .next/standalone/.env");
}

const nativeRel = path.join(
  "node_modules",
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node",
);
const nativeSrc = path.join(root, nativeRel);
const nativeDest = path.join(standaloneDir, nativeRel);
if (fs.existsSync(nativeDest)) {
  log("better-sqlite3 native binding present in standalone.");
} else if (fs.existsSync(nativeSrc)) {
  fs.mkdirSync(path.dirname(nativeDest), { recursive: true });
  fs.copyFileSync(nativeSrc, nativeDest);
  log("copied better-sqlite3 native binding into standalone.");
} else {
  log("WARNING: better-sqlite3 native binding not found. Run `npm install` first.");
}

const startBat = [
  "@echo off",
  "title English Learning App",
  "cd /d \"%~dp0\"",
  "set \"NODE_ENV=production\"",
  "set \"PORT=3000\"",
  "set \"DATA_DIR=%~dp0data\"",
  "if not exist \"%~dp0data\" mkdir \"%~dp0data\"",
  "if not exist \"%~dp0.next\\standalone\\server.js\" (",
  "  echo Build not found. Run: npm run build",
  "  pause",
  "  exit /b 1",
  ")",
  "echo Starting English Learning App at http://localhost:3000 ...",
  "start \"\" /min powershell -NoProfile -Command \"Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000'\"",
  "node \"%~dp0.next\\standalone\\server.js\"",
  "echo.",
  "echo Server stopped.",
  "pause",
  "",
].join("\r\n");

fs.writeFileSync(path.join(root, "start.bat"), startBat);
log("generated start.bat");

log("done.");
