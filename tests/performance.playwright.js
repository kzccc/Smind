const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;
const mysqlProject = path.join(rootDir, "data", "mysql.mindmap.json");
const mysqlProjectNodeCount = JSON.parse(fs.readFileSync(mysqlProject, "utf8")).nodes.length;

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
    fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-perf-")),
    {
      executablePath: edge,
      headless: true,
      viewport: { width: 1440, height: 900 },
    },
  );
  const page = await context.newPage();
  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    await page.setInputFiles("#fileInput", mysqlProject);
    await page.waitForFunction(
      (expectedCount) => document.querySelectorAll(".node").length === expectedCount,
      mysqlProjectNodeCount,
    );

    await page.evaluate(() => {
      window.__firstNodeElement = document.querySelector(".node");
      window.__nodeCountBefore = document.querySelectorAll(".node").length;
    });
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(120);
    const wheelStable = await page.evaluate(() => ({
      sameElement: window.__firstNodeElement === document.querySelector(".node"),
      stillConnected: window.__firstNodeElement?.isConnected,
      count: document.querySelectorAll(".node").length,
      before: window.__nodeCountBefore,
    }));
    assert.equal(wheelStable.sameElement, true, "zoom should not recreate node DOM");
    assert.equal(wheelStable.stillConnected, true, "zoom should keep node DOM connected");
    assert.equal(wheelStable.count, wheelStable.before, "zoom should preserve node count");
    console.log("ok zoom keeps node DOM stable");

    const visibleStats = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".node")];
      return {
        total: all.length,
        visible: all.filter((node) => node.style.display !== "none").length,
      };
    });
    assert.equal(visibleStats.total, mysqlProjectNodeCount);
    assert.equal(visibleStats.visible < visibleStats.total, true, "large map should cull offscreen nodes");
    console.log(`ok viewport culling hides offscreen nodes (${visibleStats.visible}/${visibleStats.total} visible)`);

    await page.mouse.move(520, 420);
    for (let index = 0; index < 18; index += 1) {
      await page.mouse.wheel(0, 900);
    }
    await page.waitForTimeout(120);
    const zoomOutFit = await page.evaluate(() => {
      const shell = document.querySelector("#canvasShell").getBoundingClientRect();
      const nodes = [...document.querySelectorAll(".node")];
      const bounds = nodes.reduce(
        (acc, node) => {
          const style = getComputedStyle(node);
          const left = parseFloat(style.left);
          const top = parseFloat(style.top);
          const width = parseFloat(style.width);
          const height = parseFloat(style.height);
          return {
            minX: Math.min(acc.minX, left),
            minY: Math.min(acc.minY, top),
            maxX: Math.max(acc.maxX, left + width),
            maxY: Math.max(acc.maxY, top + height),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );
      const mapWidth = bounds.maxX - bounds.minX;
      const mapHeight = bounds.maxY - bounds.minY;
      const requiredScale = Math.min((shell.width - 120) / mapWidth, (shell.height - 120) / mapHeight);
      const transform = new DOMMatrixReadOnly(getComputedStyle(document.querySelector("#nodeLayer")).transform);
      return {
        scale: transform.a,
        requiredScale,
      };
    });
    assert.equal(
      zoomOutFit.scale <= zoomOutFit.requiredScale + 0.01,
      true,
      `zoom should allow large maps to shrink enough for whole-map view, got ${zoomOutFit.scale}, need ${zoomOutFit.requiredScale}`,
    );
    console.log("ok zoom can shrink a large map enough for whole-map view");

    await page.evaluate(() => {
      window.__firstNodeElement = document.querySelector(".node");
    });
    await page.mouse.move(600, 420);
    await page.mouse.down();
    await page.mouse.move(680, 470);
    await page.mouse.up();
    const panStable = await page.evaluate(() => ({
      sameElement: window.__firstNodeElement === document.querySelector(".node"),
      stillConnected: window.__firstNodeElement?.isConnected,
    }));
    assert.equal(panStable.sameElement, true, "pan should not recreate node DOM");
    assert.equal(panStable.stillConnected, true, "pan should keep node DOM connected");
    console.log("ok pan keeps node DOM stable");

  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
