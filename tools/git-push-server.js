const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const HOST = "127.0.0.1";
const PORT = 32123;
const REPOSITORY = path.resolve(__dirname, "..");

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
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }
  if (request.method !== "POST" || request.url !== "/push") {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    try {
      if (body.length > 1024) throw new Error("请求过大");
      const result = pushRepository();
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message || "推送失败" });
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Smind Git helper listening on http://${HOST}:${PORT}`);
  console.log(`Repository: ${REPOSITORY}`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
