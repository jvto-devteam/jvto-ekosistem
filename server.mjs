import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PUBLIC_ROOT = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 4178);
const GITHUB_URL = "https://github.com/jvto-devteam/jvto-ekosistem";
const EXCLUDED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);
const STATIC_CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), {
    "content-type": "application/json; charset=utf-8"
  });
}

function sendStatic(res, status, body, contentType) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeResolve(relativePath = "") {
  const cleaned = relativePath.replace(/^\/+/, "");
  const absolute = path.resolve(ROOT, cleaned);
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error("Path is outside project root.");
  }
  return { absolute, relative: path.relative(ROOT, absolute) };
}

function safeResolvePublic(relativePath = "") {
  const decoded = decodeURIComponent(relativePath);
  const cleaned = decoded.replace(/^\/+/, "");
  const absolute = path.resolve(PUBLIC_ROOT, cleaned);
  if (absolute !== PUBLIC_ROOT && !absolute.startsWith(`${PUBLIC_ROOT}${path.sep}`)) {
    throw new Error("Path is outside public root.");
  }
  return absolute;
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function buildTree(relativeDir = "") {
  const { absolute } = safeResolve(relativeDir);
  const entries = await readdir(absolute, { withFileTypes: true });
  const visible = entries
    .filter((entry) => !EXCLUDED_NAMES.has(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const children = [];
  for (const entry of visible) {
    const childRelative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      children.push({
        type: "directory",
        name: entry.name,
        path: childRelative,
        children: await buildTree(childRelative)
      });
    } else if (entry.isFile()) {
      const info = await stat(path.join(ROOT, childRelative));
      children.push({
        type: "file",
        name: entry.name,
        path: childRelative,
        size: info.size
      });
    }
  }
  return children;
}

async function handleTree(res) {
  const children = await buildTree();
  sendJson(res, 200, {
    root: path.basename(ROOT),
    generatedAt: new Date().toISOString(),
    children
  });
}

async function handleFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.searchParams.get("path") || "";
  const { absolute, relative } = safeResolve(requestedPath);
  const info = await stat(absolute);
  if (!info.isFile()) {
    sendJson(res, 400, { error: "Requested path is not a file." });
    return;
  }
  if (!isTextFile(absolute)) {
    sendJson(res, 415, {
      error: "Preview is available for text files only.",
      path: relative,
      size: info.size
    });
    return;
  }
  const content = await readFile(absolute, "utf8");
  sendJson(res, 200, {
    path: relative,
    name: path.basename(relative),
    extension: path.extname(relative).replace(".", ""),
    size: info.size,
    content
  });
}

function routeToOutputBase(route) {
  return route.split("/").filter(Boolean).join("__") || "home";
}

async function handleWebsitePage(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.searchParams.get("route");
  if (!route || !route.startsWith("/")) {
    sendJson(res, 400, { error: "Missing or invalid route. Use /api/website/page?route=/travel-guide" });
    return;
  }

  const outputPath = path.join(
    "5-experience-engine",
    "public-website",
    "pages",
    `${routeToOutputBase(route)}.website-output.json`
  );
  const { absolute, relative } = safeResolve(outputPath);

  try {
    const content = await readFile(absolute, "utf8");
    sendJson(res, 200, {
      route,
      outputPath: relative,
      payload: JSON.parse(content)
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Website page output not found.", route });
      return;
    }
    throw error;
  }
}

async function handleWebsiteRoutes(res) {
  const indexPath = path.join("5-experience-engine", "manifests", "route-output-index.json");
  const { absolute, relative } = safeResolve(indexPath);
  try {
    const content = await readFile(absolute, "utf8");
    sendJson(res, 200, {
      outputPath: relative,
      payload: JSON.parse(content)
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Route output index not found." });
      return;
    }
    throw error;
  }
}

async function handlePublicAsset(url, res) {
  const isAdminPath = url.pathname === "/admin" || url.pathname.startsWith("/admin/");
  const isUploadPath = url.pathname.startsWith("/uploads/");
  if (!isAdminPath && !isUploadPath) return false;

  let assetPath = url.pathname;
  if (assetPath === "/admin") {
    assetPath = "/admin/index.html";
  } else if (assetPath.endsWith("/")) {
    assetPath = `${assetPath}index.html`;
  }

  try {
    let absolute = safeResolvePublic(assetPath);
    const info = await stat(absolute);
    if (!info.isFile()) {
      sendJson(res, 404, { error: "Static asset not found." });
      return true;
    }
    const body = await readFile(absolute);
    const contentType = STATIC_CONTENT_TYPES.get(path.extname(absolute).toLowerCase()) || "application/octet-stream";
    sendStatic(res, 200, body, contentType);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" && isAdminPath) {
      try {
        const fallback = safeResolvePublic("/admin/index.html");
        const body = await readFile(fallback);
        sendStatic(res, 200, body, "text/html; charset=utf-8");
        return true;
      } catch (fallbackError) {
        if (fallbackError.code === "ENOENT") {
          sendJson(res, 404, {
            error: "Tina admin has not been built yet. Run npm run cms:build first."
          });
          return true;
        }
        throw fallbackError;
      }
    }
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Static asset not found." });
      return true;
    }
    throw error;
  }
}

function renderApp() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JVTO Operating Ecosystem</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f2;
      --panel: #ffffff;
      --ink: #1c2522;
      --muted: #66716d;
      --line: #dde3da;
      --brand: #9fc131;
      --brand-dark: #445719;
      --code: #111827;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--ink);
    }
    header {
      border-bottom: 1px solid var(--line);
      background: #17211d;
      color: white;
      padding: 14px 24px;
    }
    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    .header-title {
      min-width: 0;
    }
    header h1 {
      margin: 0;
      font-size: clamp(18px, 2vw, 24px);
      letter-spacing: 0;
    }
    header p {
      margin: 4px 0 0;
      color: #c8d4ce;
      max-width: 980px;
      font-size: 13px;
      line-height: 1.35;
    }
    .header-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      min-height: 34px;
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 6px;
      padding: 7px 11px;
      color: white;
      text-decoration: none;
      font-size: 13px;
      background: rgba(255,255,255,.08);
    }
    .header-link:hover {
      background: rgba(255,255,255,.15);
    }
    main {
      display: grid;
      grid-template-columns: minmax(300px, 420px) 1fr;
      min-height: calc(100vh - 74px);
    }
    aside {
      border-right: 1px solid var(--line);
      background: var(--panel);
      overflow: auto;
      max-height: calc(100vh - 74px);
      padding: 18px;
    }
    .viewer {
      overflow: auto;
      max-height: calc(100vh - 74px);
      padding: 24px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    input[type="search"] {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 11px 12px;
      font-size: 14px;
    }
    button, .file-link {
      font: inherit;
    }
    .action-button {
      border: 1px solid var(--line);
      border-radius: 6px;
      min-height: 32px;
      padding: 6px 10px;
      color: var(--ink);
      background: #f8faf4;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }
    .action-button:hover {
      background: #eef3e6;
    }
    .tree ul {
      list-style: none;
      margin: 0;
      padding-left: 18px;
    }
    .tree > ul {
      padding-left: 0;
    }
    .tree li {
      margin: 2px 0;
    }
    .node-row {
      display: flex;
      align-items: center;
      gap: 7px;
      min-height: 28px;
      border-radius: 5px;
      padding: 4px 6px;
      color: var(--ink);
      word-break: break-word;
    }
    .node-row:hover {
      background: #eef3e6;
    }
    .folder-toggle {
      border: 0;
      background: transparent;
      cursor: pointer;
      width: 100%;
      text-align: left;
      padding: 0;
    }
    .toggle-icon {
      display: inline-grid;
      place-items: center;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--brand-dark);
      background: #f8faf4;
      font-weight: 700;
      line-height: 1;
    }
    .file-icon {
      display: inline-grid;
      place-items: center;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      color: var(--muted);
      font-size: 13px;
    }
    .folder-name {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .file-link {
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      padding: 0;
      color: var(--brand-dark);
      width: 100%;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      margin-left: auto;
      white-space: nowrap;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .file-head {
      padding: 16px 18px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }
    .file-title {
      min-width: 0;
    }
    .file-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }
    .file-head h2 {
      margin: 0;
      font-size: 18px;
      overflow-wrap: anywhere;
    }
    .file-head p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    pre {
      margin: 0;
      padding: 18px;
      overflow: auto;
      background: var(--code);
      color: #e5e7eb;
      font-size: 13px;
      line-height: 1.55;
      tab-size: 2;
      min-height: 360px;
    }
    .empty {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 26px;
      color: var(--muted);
      background: rgba(255,255,255,.6);
    }
    .hidden { display: none; }
    @media (max-width: 860px) {
      .header-inner { align-items: flex-start; flex-direction: column; gap: 10px; }
      main { grid-template-columns: 1fr; }
      aside, .viewer { max-height: none; }
      aside { border-right: 0; border-bottom: 1px solid var(--line); }
      .file-head { flex-direction: column; }
      .file-actions { width: 100%; flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <div class="header-title">
        <h1>JVTO Operating Ecosystem</h1>
        <p>Browse every ecosystem directory and open Markdown, JSON, and other text files directly from this project.</p>
      </div>
      <a class="header-link" href="${GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
    </div>
  </header>
  <main>
    <aside>
      <div class="toolbar">
        <input id="search" type="search" placeholder="Search files or folders...">
      </div>
      <div id="tree" class="tree">Loading directory tree...</div>
    </aside>
    <section class="viewer">
      <div id="viewer" class="empty">Choose a file from the directory tree to view its contents.</div>
    </section>
  </main>
  <script>
    const treeEl = document.getElementById("tree");
    const viewerEl = document.getElementById("viewer");
    const searchEl = document.getElementById("search");
    let fullTree = null;
    let currentFile = null;
    const collapsedPaths = new Set();

    const formatBytes = (bytes) => {
      if (!bytes) return "0 B";
      const units = ["B", "KB", "MB", "GB"];
      const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index];
    };

    const esc = (value) => String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    const attr = (value) => esc(value).replaceAll('"', "&quot;");

    function nodeMatches(node, term) {
      if (!term) return true;
      if (node.name.toLowerCase().includes(term)) return true;
      if (node.path.toLowerCase().includes(term)) return true;
      return node.children?.some((child) => nodeMatches(child, term));
    }

    function renderNodes(nodes, term = "") {
      return '<ul>' + nodes
        .filter((node) => nodeMatches(node, term))
        .map((node) => {
          if (node.type === "directory") {
            const isCollapsed = !term && collapsedPaths.has(node.path);
            const childTree = renderNodes(node.children || [], term);
            return '<li><button class="folder-toggle" type="button" data-path="' + esc(node.path) + '" aria-expanded="' + String(!isCollapsed) + '">' +
              '<span class="node-row"><span class="toggle-icon">' + (isCollapsed ? '+' : '-') + '</span><strong class="folder-name">' + esc(node.name) + '</strong></span></button>' +
              '<div class="folder-children' + (isCollapsed ? ' hidden' : '') + '">' + childTree + '</div></li>';
          }
          return '<li><button class="file-link" type="button" data-path="' + esc(node.path) + '"><span class="node-row"><span class="file-icon">-</span><span>' + esc(node.name) + '</span><span class="meta">' + formatBytes(node.size) + '</span></span></button></li>';
        }).join('') + '</ul>';
    }

    async function loadTree() {
      const response = await fetch("/api/tree");
      fullTree = await response.json();
      treeEl.innerHTML = renderNodes(fullTree.children || []);
    }

    async function openFile(filePath) {
      viewerEl.className = "empty";
      viewerEl.textContent = "Loading " + filePath + "...";
      const response = await fetch("/api/file?path=" + encodeURIComponent(filePath));
      const data = await response.json();
      if (!response.ok) {
        viewerEl.className = "empty";
        viewerEl.textContent = data.error || "Unable to open file.";
        return;
      }
      let content = data.content;
      if (data.extension === "json") {
        try {
          content = JSON.stringify(JSON.parse(content), null, 2);
        } catch {}
      }
      currentFile = { ...data, content };
      viewerEl.className = "card";
      viewerEl.innerHTML = '<div class="file-head"><div class="file-title"><h2>' + esc(data.name) + '</h2><p>' + esc(data.path) + '</p></div><div class="file-actions"><button class="action-button" type="button" data-action="copy">Copy</button><button class="action-button" type="button" data-action="download">Download</button><span class="meta">' + formatBytes(data.size) + '</span></div></div><pre><code>' + esc(content) + '</code></pre>';
      history.replaceState(null, "", "/?path=" + encodeURIComponent(data.path));
    }

    async function copyCurrentFile() {
      if (!currentFile) return;
      const text = currentFile.content;
      const copyButton = viewerEl.querySelector('[data-action="copy"]');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.left = "-9999px";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        if (copyButton) {
          copyButton.textContent = "Copied";
          setTimeout(() => { copyButton.textContent = "Copy"; }, 1200);
        }
      } catch {
        if (copyButton) {
          copyButton.textContent = "Copy failed";
          setTimeout(() => { copyButton.textContent = "Copy"; }, 1600);
        }
      }
    }

    function downloadCurrentFile() {
      if (!currentFile) return;
      const blob = new Blob([currentFile.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentFile.name || "jvto-file.txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    treeEl.addEventListener("click", (event) => {
      const fileButton = event.target.closest(".file-link");
      if (fileButton) openFile(fileButton.dataset.path);
      const folderButton = event.target.closest(".folder-toggle");
      if (folderButton) {
        const folderPath = folderButton.dataset.path;
        if (collapsedPaths.has(folderPath)) {
          collapsedPaths.delete(folderPath);
        } else {
          collapsedPaths.add(folderPath);
        }
        const term = searchEl.value.trim().toLowerCase();
        treeEl.innerHTML = renderNodes(fullTree?.children || [], term);
      }
    });

    viewerEl.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;
      if (actionButton.dataset.action === "copy") copyCurrentFile();
      if (actionButton.dataset.action === "download") downloadCurrentFile();
    });

    searchEl.addEventListener("input", () => {
      const term = searchEl.value.trim().toLowerCase();
      treeEl.innerHTML = renderNodes(fullTree?.children || [], term);
    });

    loadTree().then(() => {
      const params = new URLSearchParams(location.search);
      const filePath = params.get("path");
      if (filePath) openFile(filePath);
    }).catch((error) => {
      treeEl.textContent = error.message || "Failed to load directory tree.";
    });
  </script>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/api/tree") {
      await handleTree(res);
      return;
    }
    if (url.pathname === "/api/file") {
      await handleFile(req, res);
      return;
    }
    if (url.pathname === "/api/website/page") {
      await handleWebsitePage(req, res);
      return;
    }
    if (url.pathname === "/api/website/routes") {
      await handleWebsiteRoutes(res);
      return;
    }
    if (url.pathname === "/health") {
      sendJson(res, 200, { status: "ok" });
      return;
    }
    if (await handlePublicAsset(url, res)) {
      return;
    }
    send(res, 200, renderApp());
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`JVTO ecosystem explorer running on port ${PORT}`);
});
