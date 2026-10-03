const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;

async function readRecovery(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("smind-storage", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const sessionId = sessionStorage.getItem("smind-window-session");
    const key = `recovery-project-${sessionId}`;
    return new Promise((resolve, reject) => {
      const request = db.transaction("kv", "readonly").objectStore("kv").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

async function run() {
  const context = await chromium.launchPersistentContext("", {
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__writes = [];
    window.__disk = "";
    window.__mtime = 1;
    window.showDirectoryPicker = async () => ({
      queryPermission: async () => "granted",
      getFileHandle: async () => {
        const error = new Error("not found");
        error.name = "NotFoundError";
        throw error;
      },
    });
    window.showSaveFilePicker = async () => ({
      name: "conflict-test.mindmap.json",
      queryPermission: async () => "granted",
      requestPermission: async () => "granted",
      getFile: async () => new File([window.__disk], "conflict-test.mindmap.json", { lastModified: window.__mtime }),
      createWritable: async () => ({
        write: async (value) => {
          window.__disk = String(value);
          window.__mtime += 1;
          window.__writes.push(window.__disk);
        },
        close: async () => {},
      }),
    });
  });
  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    await page.locator("#saveAsFile").click();
    await page.waitForFunction(() => document.querySelector("#saveStatus")?.textContent === "已保存");
    const writesBefore = await page.evaluate(() => window.__writes.length);
    await page.evaluate(() => {
      window.__disk = JSON.stringify({ externalWriter: true });
      window.__mtime += 1;
    });
    await page.locator("#nodeDetail").fill("当前窗口编辑");
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => window.__writes.length), writesBefore);
    const recovery = await readRecovery(page);
    assert.equal(recovery.project.canvases.main.nodes.some((node) => node.detail === "当前窗口编辑"), true);
    console.log("ok stale window refuses overwrite and keeps recovery");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
