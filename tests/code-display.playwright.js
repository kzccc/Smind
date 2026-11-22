const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const pageUrl = `file:///${path.join(rootDir, "src", "index.html").replace(/\\/g, "/")}`;
const edge = [
  path.join(process.env["ProgramFiles(x86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles || "", "Microsoft", "Edge", "Application", "msedge.exe"),
].find((candidate) => candidate && fs.existsSync(candidate));

async function run() {
  if (!edge) throw new Error("Microsoft Edge executable was not found.");
  const context = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-code-display-")),
    { executablePath: edge, headless: true, viewport: { width: 1000, height: 700 } },
  );
  try {
    const page = await context.newPage();
    await page.addInitScript(() => { window.__smindDisableDataServer = true; });
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    await page.waitForSelector("#nodeDetail[contenteditable='true']");
    const line = `func main() { fmt.Println("${"long-code-value-".repeat(25)}") }`;
    await page.locator("#nodeDetail").evaluate((editor, text) => {
      editor.textContent = text;
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, line);
    await page.locator("#detailCode").click();
    const display = await page.locator("#nodeDetail pre.detail-code-block").evaluate((block) => {
      const code = block.querySelector("code");
      const originalScroll = block.scrollLeft;
      block.scrollLeft = block.scrollWidth;
      return {
        text: code.textContent,
        whiteSpace: getComputedStyle(code).whiteSpace,
        overflowX: getComputedStyle(block).overflowX,
        scrollWidth: block.scrollWidth,
        clientWidth: block.clientWidth,
        scrollLeft: block.scrollLeft,
        originalScroll,
      };
    });
    assert.equal(display.text, line);
    assert.equal(display.whiteSpace, "pre", "a long code line must not wrap");
    assert.equal(display.overflowX, "auto", "wide code must remain horizontally accessible");
    assert.ok(display.scrollWidth > display.clientWidth, "long code should exceed the viewport");
    assert.ok(display.scrollLeft > display.originalScroll, "code block should scroll to its hidden end");
    console.log("ok long code lines stay intact and can scroll horizontally");

    async function selectCode() {
      await page.locator("#nodeDetail pre.detail-code-block code").evaluate((code) => {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    }

    await selectCode();
    await page.locator('[data-detail-color="red"]').click();
    const colored = await page.locator("#nodeDetail pre.detail-code-block .tok-keyword").first().evaluate((keyword) => ({
      color: getComputedStyle(keyword).color,
      background: getComputedStyle(keyword.closest(".tok-format")).backgroundColor,
    }));
    assert.equal(colored.color, "rgb(192, 57, 43)", "chosen code text color must override syntax highlighting");
    assert.equal(colored.background, "rgba(0, 0, 0, 0)", "changing code text color must not add a background wash");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.textContent = 'fmt.Println("highlight")';
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator("#detailCode").click();
    await page.locator("#nodeDetail pre.detail-code-block .tok-string").first().evaluate((token) => {
      const range = document.createRange();
      range.selectNodeContents(token);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator('[data-detail-highlight="white"]').click();
    const highlighted = await page.locator("#nodeDetail pre.detail-code-block .tok-highlight-light").first().evaluate((token) => ({
      color: getComputedStyle(token).color,
      background: getComputedStyle(token).backgroundColor,
    }));
    assert.equal(highlighted.background, "rgb(255, 255, 255)");
    assert.equal(highlighted.color, "rgb(16, 24, 40)", "white code highlight needs dark readable text");
    await page.locator("#nodeDetail pre.detail-code-block .tok-string").first().evaluate((token) => {
      const range = document.createRange();
      range.selectNodeContents(token);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator('[data-detail-highlight="black"]').click();
    const darkHighlight = await page.locator("#nodeDetail pre.detail-code-block .tok-highlight-dark").first().evaluate((token) => ({
      color: getComputedStyle(token).color,
      background: getComputedStyle(token).backgroundColor,
    }));
    assert.equal(darkHighlight.background, "rgb(0, 0, 0)");
    assert.equal(darkHighlight.color, "rgb(255, 255, 255)", "dark code highlight needs light readable text");
    console.log("ok code text colors and light highlights remain legible");

    const legacyCode = "func main() {\n  return 1\n}";
    await page.locator("#nodeDetail").evaluate((editor, text) => {
      editor.innerHTML = `<pre class="detail-code-block"><code><span class="tok-format" style="background-color: rgb(247, 249, 252); color: rgb(16, 24, 40); font-size: 15px;">${text}</span></code></pre>`;
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, legacyCode);
    await page.locator('[data-id="node-2"]').click();
    await page.locator('[data-id="node-1"]').click();
    const restored = await page.locator("#nodeDetail pre.detail-code-block").evaluate((block) => ({
      text: block.querySelector("code").textContent,
      washed: [...block.querySelectorAll("span")].some((span) => getComputedStyle(span).backgroundColor === "rgb(247, 249, 252)"),
      keywords: block.querySelectorAll(".tok-keyword").length,
    }));
    assert.equal(restored.text, legacyCode);
    assert.equal(restored.washed, false, "legacy editor background must not wash out the whole code block");
    assert.ok(restored.keywords >= 2, "legacy code should regain syntax highlighting");
    console.log("ok legacy whole-block editor formatting no longer washes out code");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
