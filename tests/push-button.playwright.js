const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;

async function run() {
  const context = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__pushRequests = 0;
    window.__originalFetch = window.fetch.bind(window);
    window.fetch = async (url, options) => {
      if (url === "http://127.0.0.1:32123/push") {
        window.__pushRequests += 1;
        return { ok: true, json: async () => ({ ok: true, message: "已推送" }) };
      }
      return window.__originalFetch(url, options);
    };
  });
  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    assert.equal(await page.locator("#pushRepository").count(), 1);
    assert.equal(await page.locator("#pushRepository").innerText(), "推送");
    await page.locator("#pushRepository").click();
    await page.waitForFunction(() => window.__pushRequests === 1);
    await page.waitForFunction(() => document.querySelector("#saveStatus")?.textContent === "已推送");
    console.log("ok push button calls local repository helper");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
