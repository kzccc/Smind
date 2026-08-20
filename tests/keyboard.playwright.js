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

async function run() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge executable was not found.");

  const context = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-keyboard-")),
    {
      executablePath: edge,
      headless: true,
      viewport: { width: 1280, height: 820 },
    },
  );
  const page = await context.newPage();

  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");

    const firstNode = page.locator(".node").first();
    await firstNode.dblclick();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("编辑后的节点");

    const beforeEnter = await page.locator(".node").count();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);

    const afterFinishEdit = await page.evaluate(() => ({
      count: document.querySelectorAll(".node").length,
      editing: document.querySelector(".node-title[contenteditable='true']") !== null,
      firstText: document.querySelector(".node .node-title")?.textContent,
    }));

    assert.equal(afterFinishEdit.count, beforeEnter, "first Enter should only finish title editing");
    assert.equal(afterFinishEdit.editing, false, "first Enter should leave title edit mode");
    assert.equal(afterFinishEdit.firstText, "编辑后的节点");

    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    const afterCreateSibling = await page.locator(".node").count();
    assert.equal(afterCreateSibling, beforeEnter + 1, "second Enter should create a sibling node");
    console.log("ok Enter finishes title edit before creating sibling");

    await page.reload();
    await page.waitForSelector(".node");
    await page.locator('[data-id="node-1"]').click();
    await page.keyboard.press("Space");
    await page.keyboard.type("空格启动编辑");
    const afterSpaceEdit = await page.evaluate(() => ({
      editing: document.querySelector('[data-id="node-1"] .node-title')?.getAttribute("contenteditable"),
      text: document.querySelector('[data-id="node-1"] .node-title')?.textContent,
    }));
    assert.equal(afterSpaceEdit.editing, "true", "Space should enter node title edit mode");
    assert.equal(afterSpaceEdit.text, "空格启动编辑", "Space edit mode should select the existing node title");
    await page.keyboard.press("Enter");

    await page.locator("#nodeDetail").click();
    await page.keyboard.type("A");
    await page.keyboard.press("Space");
    await page.keyboard.type("B");
    assert.equal(
      await page.locator("#nodeDetail").evaluate((editor) => editor.innerText),
      "A B",
      "Space inside the detail editor should still insert a normal space",
    );
    console.log("ok Space starts title editing only outside text editors");

    await page.reload();
    await page.waitForSelector(".node");
    await page.locator('[data-id="node-1"]').click();
    await page.keyboard.down("Control");
    await page.locator('[data-id="node-2"]').click();
    await page.keyboard.up("Control");
    const edgeCountBeforeConnect = await page.locator(".edge").count();
    await page.keyboard.down("Control");
    await page.keyboard.down("Shift");
    const connectingState = await page.locator('[data-id="node-2"]').evaluate((node) => {
      const ring = getComputedStyle(node, "::after");
      return {
        connecting: node.classList.contains("connecting"),
        borderColor: ring.borderTopColor,
        boxShadow: ring.boxShadow,
      };
    });
    assert.equal(connectingState.connecting, true, "Ctrl+Shift should use the active node when selected nodes cannot form a multi-source connection");
    assert.equal(
      connectingState.borderColor === "rgb(47, 111, 159)" || connectingState.boxShadow.includes("47, 111, 159"),
      true,
      "connection source should show a blue outer ring",
    );
    await page.locator('[data-id="node-3"]').click();
    await page.waitForTimeout(80);
    const edgeCountAfterConnect = await page.locator(".edge").count();
    assert.equal(edgeCountAfterConnect, edgeCountBeforeConnect + 1, "connecting should append a new child edge");
    await page.keyboard.up("Shift");
    await page.keyboard.up("Control");
    console.log("ok Ctrl+Shift connects the active node and shows a blue connection ring");

    await page.reload();
    await page.waitForSelector(".node");
    await page.evaluate(() => {
      const app = document.querySelector("#app");
      app.style.setProperty("--inspector-width", "390px");
    });
    await page.locator('[data-id="node-1"]').click();
    await page.evaluate(() => {
      window.__targetBeforeKeyboardNav = document.querySelector('[data-id="node-2"]').getBoundingClientRect();
      window.__shellBeforeKeyboardNav = document.querySelector("#canvasShell").getBoundingClientRect();
    });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
    const keyboardFocus = await page.evaluate(() => {
      const node = document.querySelector('[data-id="node-2"]').getBoundingClientRect();
      const shell = document.querySelector("#canvasShell").getBoundingClientRect();
      const nodeCenter = {
        x: node.left + node.width / 2,
        y: node.top + node.height / 2,
      };
      const shellCenter = {
        x: shell.left + shell.width / 2,
        y: shell.top + shell.height / 2,
      };
      const before = window.__targetBeforeKeyboardNav;
      return {
        active: document.querySelector('[data-id="node-2"]').classList.contains("selected"),
        moved: Math.abs(node.left - before.left) > 40 || Math.abs(node.top - before.top) > 40,
        distanceToCenter: Math.hypot(nodeCenter.x - shellCenter.x, nodeCenter.y - shellCenter.y),
      };
    });
    assert.equal(keyboardFocus.active, true, "ArrowRight should select the first child node");
    assert.equal(keyboardFocus.moved, true, "keyboard navigation should move the viewport");
    assert.equal(keyboardFocus.distanceToCenter < 90, true, "keyboard-selected node should be near viewport center");
    console.log("ok arrow-key navigation recenters the selected node");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
