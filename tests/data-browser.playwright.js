const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;

function findEdge() {
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function projectDocument(text, title) {
  return {
    schema: "mindmap.product.v1",
    meta: {
      title,
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    },
    viewport: { scale: 1, tx: 320, ty: 240, inspectorWidth: 400 },
    nodes: [{
      id: "node-1",
      parentId: null,
      x: 0,
      y: 0,
      w: 160,
      h: 64,
      text,
      detail: "",
      color: "blue",
      fontSize: 16,
      children: [],
    }],
    selection: { activeId: "node-1", selectedIds: ["node-1"] },
    counters: { nextId: 2 },
  };
}

async function run() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge executable was not found.");

  const context = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-data-browser-")),
    {
      executablePath: edge,
      headless: true,
      viewport: { width: 1440, height: 900 },
    },
  );

  await context.addInitScript(() => {
    const now = Date.now();
    window.__smindOpenProject = {
      schema: "mindmap.product.v1",
      meta: { title: "网络协议", createdAt: "2026-08-15T00:00:00.000Z", updatedAt: "2026-08-15T00:00:00.000Z" },
      viewport: { scale: 1, tx: 300, ty: 220, inspectorWidth: 400 },
      nodes: [{
        id: "node-1",
        parentId: null,
        x: 0,
        y: 0,
        w: 160,
        h: 64,
        text: "TCP 三次握手",
        detail: "来自 data 目录",
        color: "blue",
        fontSize: 16,
        children: [],
      }],
      selection: { activeId: "node-1", selectedIds: ["node-1"] },
      counters: { nextId: 2 },
    };
    window.__smindServerCalls = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, options = {}) => {
      const url = String(input && input.url ? input.url : input);
      const method = options.method || "GET";
      if (!/^https?:\/\/127\.0\.0\.1:32123\//.test(url)) return originalFetch(input, options);
      window.__smindServerCalls.push({ url, method });
      const reply = (payload, status = 200) => new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });
      if (url.endsWith("/api/data")) {
        return reply({
          ok: true,
          files: [
            { name: "A-网络协议.json", size: 2048, mtime: now - 60 * 1000 },
            { name: "A-操作系统.json", size: 3 * 1024 * 1024, mtime: now - 90 * 60 * 1000 },
            { name: "A-旧文件.mindmap.json", size: 4096, mtime: now - 5 * 24 * 60 * 60 * 1000 },
            { name: "B-mysql索引.json", size: 1024 * 1024, mtime: now - 30 * 1000 },
            { name: "未分类笔记.json", size: 512, mtime: now - 5 * 1000 },
          ],
        });
      }
      if (url.includes("/api/exists")) return reply({ ok: true, exists: false });
      if (url.includes("/api/stat")) return reply({ ok: true, name: "A-网络协议.json", size: 2048, mtime: now });
      if (url.includes("/api/save")) {
        const body = String(options.body || "");
        return reply({ ok: true, name: "saved.json", size: body.length, mtime: now });
      }
      if (url.includes("/data/")) return reply(window.__smindOpenProject);
      return reply({ ok: false, error: "unexpected" }, 404);
    };
  });

  const page = await context.newPage();
  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");

    await page.locator("#openFile").click();
    await page.waitForSelector("#openFileDialog[open]");
    await page.waitForFunction(() => document.querySelectorAll(".file-card").length === 5);

    const groups = await page.locator(".file-group").evaluateAll((sections) => sections.map((section) => ({
      category: section.dataset.category,
      count: section.querySelectorAll(".file-card").length,
      badge: section.querySelector(".file-group-badge")?.textContent,
    })));
    assert.equal(groups.length, 3, "files must be grouped by the prefix before the dash");
    assert.deepEqual(groups.map((group) => group.category).sort(), ["A", "B", "未分类"].sort());
    assert.equal(groups.find((group) => group.category === "A").count, 3);
    assert.equal(groups.find((group) => group.category === "B").count, 1);
    assert.equal(groups.find((group) => group.category === "未分类").count, 1);
    console.log("ok open panel groups data/ files by the dash prefix");

    const titles = await page.locator(".file-card-title").evaluateAll((nodes) => nodes.map((node) => node.textContent));
    assert.equal(titles.includes("网络协议"), true);
    assert.equal(titles.includes("旧文件"), true, "legacy .mindmap.json names must show the clean title");
    assert.equal(titles.some((title) => title.includes(".json")), false, "titles must hide the extension");
    const legacyRibbon = await page.locator('.file-card:has-text("旧文件") .file-card-legacy').count();
    assert.equal(legacyRibbon, 1, "legacy naming gets a hint ribbon");
    console.log("ok file cards show clean titles, sizes and legacy hints");

    const sourceLabel = await page.locator("#openFileSource").getAttribute("data-kind");
    assert.equal(sourceLabel, "server", "listing should come from the local data service");
    const sizeText = await page.locator('.file-card:has-text("操作系统") .file-card-meta').innerText();
    assert.equal(sizeText.includes("3.0 MB"), true, `unexpected size label: ${sizeText}`);
    console.log("ok file cards show size and modification time");

    await page.locator("#openFileSearch").fill("mysql");
    await page.waitForFunction(() => document.querySelectorAll(".file-card").length === 1);
    assert.equal(await page.locator(".file-group").count(), 1);
    assert.equal((await page.locator(".file-card-title").innerText()).includes("mysql"), true);
    await page.locator("#openFileSearch").fill("B");
    await page.waitForFunction(() => document.querySelectorAll(".file-card").length === 1);
    await page.locator("#openFileSearch").fill("");
    await page.waitForFunction(() => document.querySelectorAll(".file-card").length === 5);
    console.log("ok search filters by category and file name");

    await page.locator('.file-card:has-text("网络协议")').click();
    await page.waitForFunction(() => document.querySelector('[data-id="node-1"] .node-title')?.textContent === "TCP 三次握手");
    assert.equal(await page.locator("#openFileDialog").evaluate((dialog) => dialog.open), false);
    assert.equal(await page.locator("#currentFile .file-chip-category").innerText(), "A");
    assert.equal(await page.locator("#currentFile .file-chip-title").innerText(), "网络协议");
    assert.equal(await page.locator("#saveStatus").innerText(), "已打开");
    const readCalls = await page.evaluate(() => window.__smindServerCalls.filter((call) => call.url.includes("/data/")));
    assert.equal(readCalls.length >= 1, true, "opening reads the JSON straight from the data service");
    console.log("ok clicking a card opens the file and updates the current-file chip");

    await page.locator("#openFile").click();
    await page.waitForFunction(() => document.querySelectorAll(".file-card").length === 5);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#openFileDialog")?.open === false);
    console.log("ok keyboard navigation opens the highlighted file");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
