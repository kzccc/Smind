const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const HOST = "127.0.0.1";
const PORT = Number(process.env.SMIND_HELPER_PORT || 32123);
const REPOSITORY = path.resolve(__dirname, "..");
const DATA_DIRECTORY = path.join(REPOSITORY, "data");
const MAX_BODY_BYTES = 192 * 1024 * 1024;
const HEAVY_BODY_PARSE_LIMIT = 8 * 1024 * 1024;
const DATA_FILE_PATTERN = /\.json$/i;
// Only the app bundle, the data directory and docs are served; everything else
// in the repository (for example recovery/ browser profiles) stays private.
const STATIC_PREFIXES = ["/src/", "/data/", "/docs/"];
const STATIC_FILES = new Set(["/index.html", "/preview.png", "/README.md"]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "600",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control": "no-store",
};

function git(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: REPOSITORY,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error((result.stderr || result.stdout || "Git 命令失败").trim());
    error.code = "GIT_COMMAND_FAILED";
    throw error;
  }
  return (result.stdout || "").trim();
}

function pushRepository() {
  const root = git(["rev-parse", "--show-toplevel"]);
  if (path.resolve(root) !== REPOSITORY) throw new Error("Git helper 仓库路径校验失败");
  const branch = git(["branch", "--show-current"]);
  if (!branch) throw new Error("当前仓库没有分支");
  const remote = git(["remote", "get-url", "origin"]);
  if (!remote) throw new Error("没有配置 origin 远端");
  git(["add", "-A"]);
  const staged = git(["diff", "--cached", "--name-only"]);
  let commit = "没有新的文件变更";
  if (staged) {
    commit = git(["commit", "-m", `Push Smind repository ${new Date().toISOString()}`]);
  }
  const pushOutput = git(["push", "origin", branch]);
  return { branch, remote, commit, pushOutput, message: "已推送" };
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function safeDataFileName(value) {
  const name = String(value || "").trim();
  if (!name) throw new Error("缺少文件名称");
  if (name !== path.basename(name) || name.includes("..")) throw new Error("文件名称不合法");
  if (!/^[^\\/:*?"<>|\x00-\x1f]+\.json$/i.test(name)) {
    throw new Error("只允许操作 data/ 目录下的 .json 文件");
  }
  return name;
}

function dataFilePath(name) {
  const fileName = safeDataFileName(name);
  const resolved = path.resolve(DATA_DIRECTORY, fileName);
  if (!resolved.startsWith(`${path.resolve(DATA_DIRECTORY)}${path.sep}`)) throw new Error("文件路径越界");
  return resolved;
}

function listDataFiles() {
  let entries = [];
  try {
    entries = fs.readdirSync(DATA_DIRECTORY, { withFileTypes: true });
  } catch (error) {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !DATA_FILE_PATTERN.test(entry.name)) continue;
    try {
      const stat = fs.statSync(path.join(DATA_DIRECTORY, entry.name));
      files.push({ name: entry.name, size: stat.size, mtime: stat.mtimeMs });
    } catch (error) {
      // A file that vanished mid-listing is skipped instead of failing the list.
    }
  }
  return files.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

function statDataFile(name) {
  const stat = fs.statSync(dataFilePath(name));
  return { name: safeDataFileName(name), size: stat.size, mtime: stat.mtimeMs };
}

function saveDataFile(name, body) {
  const target = dataFilePath(name);
  if (!body || !body.trim()) throw new Error("文件内容为空");
  const trimmed = body.trim();
  // Large projects arrive as 40-60 MB of already serialized JSON produced by the
  // page. Re-parsing that on every keystroke cost a second of server CPU, so the
  // big case only gets a structural check.
  if (trimmed.length < HEAVY_BODY_PARSE_LIMIT) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      throw new Error("文件内容不是合法 JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("项目数据格式不正确");
    }
  } else if (trimmed[0] !== "{" || trimmed[trimmed.length - 1] !== "}") {
    throw new Error("文件内容不是合法 JSON");
  }
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true });
  const temporary = path.join(DATA_DIRECTORY, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temporary, body, "utf8");
  fs.renameSync(temporary, target);
  const stat = fs.statSync(target);
  return { name: path.basename(target), size: stat.size, mtime: stat.mtimeMs };
}

function readBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    request.on("data", (chunk) => {
      length += chunk.length;
      if (length > limit) {
        reject(new Error("请求体过大"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function serveStatic(request, response, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  if (!STATIC_PREFIXES.some((prefix) => decoded.startsWith(prefix)) && !STATIC_FILES.has(decoded)) {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }
  const resolved = path.resolve(REPOSITORY, `.${decoded}`);
  if (!resolved.startsWith(`${REPOSITORY}${path.sep}`)) {
    sendJson(response, 403, { ok: false, error: "路径不合法" });
    return;
  }
  fs.stat(resolved, (error, stat) => {
    if (error || !stat.isFile()) {
      sendJson(response, 404, { ok: false, error: "Not found" });
      return;
    }
    response.writeHead(200, {
      ...CORS_HEADERS,
      "Content-Type": MIME_TYPES[path.extname(resolved).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Last-Modified": stat.mtime.toUTCString(),
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = fs.createReadStream(resolved);
    stream.on("error", () => response.destroy());
    stream.pipe(response);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, CORS_HEADERS);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url, `http://${HOST}:${PORT}`);
  const pathname = requestUrl.pathname;

  if (request.method === "POST" && pathname === "/push") {
    readBody(request, 4096)
      .then(() => {
        const result = pushRepository();
        sendJson(response, 200, { ok: true, ...result });
      })
      .catch((error) => sendJson(response, 500, { ok: false, error: error.message || "推送失败" }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/save") {
    const name = requestUrl.searchParams.get("name");
    readBody(request)
      .then((body) => {
        const saved = saveDataFile(name, body);
        sendJson(response, 200, { ok: true, ...saved });
      })
      .catch((error) => sendJson(response, 400, { ok: false, error: error.message || "保存失败" }));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  if (pathname === "/api/health") {
    sendJson(response, 200, { ok: true, app: "smind-data", repository: REPOSITORY, dataDirectory: DATA_DIRECTORY });
    return;
  }

  if (pathname === "/api/data") {
    const files = listDataFiles();
    sendJson(response, 200, { ok: true, directory: DATA_DIRECTORY, files, total: files.length });
    return;
  }

  if (pathname === "/api/stat") {
    try {
      sendJson(response, 200, { ok: true, ...statDataFile(requestUrl.searchParams.get("name")) });
    } catch (error) {
      sendJson(response, error.code === "ENOENT" ? 404 : 400, { ok: false, error: "文件不存在或不可读" });
    }
    return;
  }

  if (pathname === "/api/exists") {
    try {
      const stat = fs.statSync(dataFilePath(requestUrl.searchParams.get("name")));
      sendJson(response, 200, { ok: true, exists: stat.isFile(), size: stat.size, mtime: stat.mtimeMs });
    } catch (error) {
      sendJson(response, 200, { ok: true, exists: false });
    }
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    response.writeHead(302, { Location: "/src/index.html", ...CORS_HEADERS });
    response.end();
    return;
  }

  serveStatic(request, response, pathname);
});

server.on("error", (error) => {
  console.error(`Smind helper failed: ${error.message}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Smind helper listening on http://${HOST}:${PORT}`);
  console.log(`Repository: ${REPOSITORY}`);
  console.log(`Data directory: ${DATA_DIRECTORY}`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
