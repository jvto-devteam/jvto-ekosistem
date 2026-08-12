import chokidar from "chokidar";
import { spawn } from "node:child_process";

const SOURCE_PATTERNS = [
  "1-knowledge-and-evidence-core/travel-guide/**/*.source.json",
  "1-knowledge-and-evidence-core/why-jvto/**/*.source.json",
  "1-knowledge-and-evidence-core/policies/**/*.source.json"
];

const DEBOUNCE_MS = Number(process.env.RENDER_WATCH_DEBOUNCE_MS || 800);
const SKIP_INITIAL_RENDER = process.argv.includes("--no-initial");

let debounceTimer = null;
let running = false;
let queuedReason = null;
let readyHandled = false;

function runRender(reason) {
  if (running) {
    queuedReason = reason;
    return;
  }

  running = true;
  queuedReason = null;
  console.log(`[render-watch] running npm run render:web-content (${reason})`);

  const child = spawn("npm", ["run", "render:web-content"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    running = false;
    if (code === 0) {
      console.log("[render-watch] render complete");
    } else {
      console.error(`[render-watch] render failed with exit code ${code}`);
    }

    if (queuedReason) {
      const reasonToRun = queuedReason;
      queuedReason = null;
      runRender(reasonToRun);
    }
  });
}

function scheduleRender(eventName, filePath) {
  const reason = `${eventName}: ${filePath}`;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runRender(reason), DEBOUNCE_MS);
}

const watcher = chokidar.watch(SOURCE_PATTERNS, {
  awaitWriteFinish: {
    stabilityThreshold: 400,
    pollInterval: 100
  },
  ignoreInitial: true
});

watcher
  .on("ready", () => {
    if (readyHandled) return;
    readyHandled = true;
    console.log(`[render-watch] watching ${SOURCE_PATTERNS.length} source patterns`);
    if (!SKIP_INITIAL_RENDER) {
      runRender("initial");
    }
  })
  .on("add", (filePath) => scheduleRender("add", filePath))
  .on("change", (filePath) => scheduleRender("change", filePath))
  .on("unlink", (filePath) => scheduleRender("unlink", filePath))
  .on("error", (error) => {
    console.error("[render-watch] watcher error", error);
    process.exitCode = 1;
  });

process.on("SIGINT", async () => {
  await watcher.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await watcher.close();
  process.exit(0);
});
