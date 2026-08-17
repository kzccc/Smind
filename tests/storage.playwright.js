const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;
const artifactDir = path.join(rootDir, "test-artifacts");
fs.mkdirSync(artifactDir, { recursive: true });

function findEdge() {
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

async function getStoredValue(page, key) {
  return page.evaluate((lookupKey) => new Promise((resolve, reject) => {
    const request = indexedDB.open("smind-storage", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("kv");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("kv", "readonly");
      const getRequest = tx.objectStore("kv").get(lookupKey);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => db.close();
    };
  }), key);
}

async function waitSaved(page) {
  await page.waitForFunction(() => {
    const text = document.querySelector("#saveStatus")?.textContent || "";
    return ["已保存", "已自动保存", "已保存恢复副本", "已下载"].includes(text);
  }, null, { timeout: 6000 });
}

async function run() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge executable was not found.");

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-playwright-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: edge,
    headless: true,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    downloadsPath: artifactDir,
  });

  await context.addInitScript(() => {
    window.__testWrites = [];
    window.__testOpenProject = {
      schema: "mindmap.product.v1",
      meta: {
        title: "Playwright 打开项目",
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T00:00:00.000Z",
      },
      viewport: { scale: 1, tx: 320, ty: 240, inspectorWidth: 410 },
      nodes: [{
        id: "node-1",
        parentId: null,
        x: 0,
        y: 0,
        w: 160,
        h: 64,
        text: "打开文件节点",
        detail: "来自打开文件",
        color: "blue",
        fontSize: 16,
        children: [],
      }],
      selection: { activeId: "node-1", selectedIds: ["node-1"] },
      counters: { nextId: 2 },
    };
    window.showSaveFilePicker = async () => ({
      name: "playwright-save.mindmap.json",
      queryPermission: async () => "granted",
      requestPermission: async () => "granted",
      createWritable: async () => ({
        write: async (data) => {
          window.__testWrites.push(String(data));
        },
        close: async () => {},
      }),
    });
    window.showOpenFilePicker = async () => [{
      name: "opened.mindmap.json",
      getFile: async () => new File(
        [JSON.stringify(window.__testOpenProject)],
        "opened.mindmap.json",
        { type: "application/json" },
      ),
    }];
  });

  const page = await context.newPage();
  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    assert.equal(await page.locator("text=思维导图产品").count(), 1, "default project should load");
    console.log("ok default data loads");

    assert.equal(await page.locator('[data-color="white"]').count(), 1, "white node color swatch should exist");
    assert.equal(await page.locator('[data-color="black"]').count(), 1, "black node color swatch should exist");
    await page.locator('[data-color="black"]').click();
    await waitSaved(page);
    assert.equal(await page.locator('[data-id="node-1"]').getAttribute("data-color"), "black");
    const blackRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(blackRecovery.project.nodes[0].color, "black");
    await page.locator('[data-color="white"]').click();
    await waitSaved(page);
    assert.equal(await page.locator('[data-id="node-1"]').getAttribute("data-color"), "white");
    const whiteRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(whiteRecovery.project.nodes[0].color, "white");
    console.log("ok white and black canvas node colors apply and persist");

    await page.locator("#nodeDetail").fill("自动保存测试");
    await waitSaved(page);
    const autoRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(autoRecovery.project.nodes[0].detail, "自动保存测试");
    assert.equal(autoRecovery.project.nodes[0].detailHtml, "自动保存测试");
    assert.equal(autoRecovery.project.schema, "mindmap.product.v1");
    console.log("ok autosave writes full recovery backup");

    await page.keyboard.press("Control+S");
    await waitSaved(page);
    const manualRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(manualRecovery.project.nodes[0].detail, "自动保存测试");
    assert.equal(manualRecovery.project.nodes.length >= 9, true);
    console.log("ok Ctrl+S writes full recovery backup without picker");

    await page.locator("#saveAsFile").click();
    await waitSaved(page);
    const writesAfterSaveAs = await page.evaluate(() => window.__testWrites.slice());
    assert.equal(writesAfterSaveAs.length >= 1, true, "Save As should write to a file handle");
    const savedProject = JSON.parse(writesAfterSaveAs.at(-1));
    assert.equal(savedProject.nodes[0].detail, "自动保存测试");
    assert.equal(savedProject.nodes[0].detailHtml, "自动保存测试");
    assert.equal(savedProject.viewport.inspectorWidth >= 280, true);
    console.log("ok Save As writes full project to file handle");

    await page.locator("#nodeDetail").fill("文件句柄后保存");
    await waitSaved(page);
    await page.keyboard.press("Control+S");
    await waitSaved(page);
    const writesAfterCtrlS = await page.evaluate(() => window.__testWrites.slice());
    const ctrlSavedProject = JSON.parse(writesAfterCtrlS.at(-1));
    assert.equal(ctrlSavedProject.nodes[0].detail, "文件句柄后保存");
    assert.equal(ctrlSavedProject.nodes[0].detailHtml, "文件句柄后保存");
    console.log("ok Ctrl+S writes full project to existing file handle");

    await page.locator("#openFile").click();
    await page.waitForSelector("text=打开文件节点");
    assert.equal(await page.locator("#nodeDetail").evaluate((editor) => editor.innerText), "来自打开文件");
    const openRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(openRecovery.project.meta.title, "Playwright 打开项目");
    assert.equal(openRecovery.project.nodes[0].text, "打开文件节点");
    console.log("ok open file loads project and backs it up");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#exportMarkdown").click(),
    ]);
    const markdownPath = path.join(artifactDir, download.suggestedFilename());
    await download.saveAs(markdownPath);
    const markdown = fs.readFileSync(markdownPath, "utf8");
    assert.equal(markdown.includes("# Playwright 打开项目"), true);
    assert.equal(markdown.includes("- 打开文件节点"), true);
    console.log("ok Markdown export downloads readable outline");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
