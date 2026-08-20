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
    return ["已保存", "已自动保存", "已保存恢复副本"].includes(text);
  }, null, { timeout: 6000 });
}

async function selectEditorText(page, start, end) {
  await page.evaluate(({ startOffset, endOffset }) => {
    const editor = document.querySelector("#nodeDetail");
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    let seen = 0;
    let startNode = null;
    let endNode = null;
    let startInNode = 0;
    let endInNode = 0;
    while (current) {
      const nextSeen = seen + current.textContent.length;
      if (!startNode && startOffset >= seen && startOffset <= nextSeen) {
        startNode = current;
        startInNode = startOffset - seen;
      }
      if (!endNode && endOffset >= seen && endOffset <= nextSeen) {
        endNode = current;
        endInNode = endOffset - seen;
        break;
      }
      seen = nextSeen;
      current = walker.nextNode();
    }
    if (!startNode || !endNode) throw new Error("selection text was not found");
    const range = document.createRange();
    range.setStart(startNode, startInNode);
    range.setEnd(endNode, endInNode);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, { startOffset: start, endOffset: end });
}

async function run() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge executable was not found.");

  const context = await chromium.launchPersistentContext(
    fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-richtext-")),
    {
      executablePath: edge,
      headless: true,
      viewport: { width: 1360, height: 860 },
    },
  );
  const page = await context.newPage();

  try {
    await page.goto(pageUrl);
    await page.waitForSelector(".node");
    await page.waitForSelector("#nodeDetail[contenteditable='true']");
    assert.equal(await page.locator("[data-detail-highlight='white']").count(), 1);
    assert.equal(await page.locator("[data-detail-highlight='black']").count(), 1);
    assert.equal(await page.locator("[data-detail-color='white']").count(), 1);
    assert.equal(await page.locator("[data-detail-color='black']").count(), 1);
    assert.equal(await page.locator("#detailFontSize").count(), 1);
    assert.equal(await page.locator("#detailFontValue").textContent(), "15");
    const editorLayout = await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = Array.from({ length: 80 }, (_, index) => `第${index + 1}行内容`).join("<br>");
      return {
        overflowY: getComputedStyle(editor).overflowY,
        minHeight: getComputedStyle(editor).minHeight,
        scrollable: editor.scrollHeight > editor.clientHeight,
      };
    });
    assert.equal(editorLayout.overflowY, "auto");
    assert.equal(editorLayout.minHeight, "0px", "detail editor should be allowed to shrink inside the sidebar");
    assert.equal(editorLayout.scrollable, true, "long detail content should have a vertical scroll area");
    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });

    await page.locator("#nodeDetail").click();
    await page.keyboard.type("节点内部信息");
    await selectEditorText(page, 0, 2);
    await page.locator("[data-detail-highlight='yellow']").click();

    const highlight = await page.evaluate(() => {
      const span = [...document.querySelectorAll("#nodeDetail span")]
        .find((item) => item.textContent === "节点");
      return {
        text: span?.textContent || "",
        background: span?.style.backgroundColor || "",
      };
    });
    assert.equal(highlight.text, "节点");
    assert.notEqual(highlight.background, "", "selected text should receive highlight color");
    assert.equal(
      await page.evaluate(() => window.getSelection().isCollapsed),
      true,
      "highlight should be visible immediately after applying it",
    );

    await selectEditorText(page, 2, 6);
    await page.locator("[data-detail-color='blue']").click();
    const fontColor = await page.evaluate(() => {
      const span = [...document.querySelectorAll("#nodeDetail span")]
        .find((item) => item.textContent === "内部信息");
      return {
        text: span?.textContent || "",
        color: span?.style.color || "",
      };
    });
    assert.equal(fontColor.text, "内部信息");
    assert.notEqual(fontColor.color, "", "selected text should receive font color");
    assert.equal(
      await page.evaluate(() => window.getSelection().isCollapsed),
      true,
      "font color should be visible immediately after applying it",
    );

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });
    await page.locator("#nodeDetail").click();
    await page.keyboard.type("黑白颜色");
    await selectEditorText(page, 0, 2);
    await page.locator("[data-detail-highlight='black']").click();
    await selectEditorText(page, 2, 4);
    await page.locator("[data-detail-color='white']").click();
    const monochrome = await page.evaluate(() => {
      const spans = [...document.querySelectorAll("#nodeDetail span")];
      return {
        blackHighlight: spans.find((item) => item.textContent === "黑白")?.style.backgroundColor || "",
        whiteColor: spans.find((item) => item.textContent === "颜色")?.style.color || "",
      };
    });
    assert.equal(monochrome.blackHighlight, "rgb(0, 0, 0)");
    assert.equal(monochrome.whiteColor, "rgb(255, 255, 255)");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });
    await page.locator("#nodeDetail").click();
    await page.keyboard.type("字号滑轮");
    await selectEditorText(page, 0, 2);
    await page.locator("#detailFontSize").fill("24");
    const detailFont = await page.evaluate(() => {
      const span = [...document.querySelectorAll("#nodeDetail span")]
        .find((item) => item.textContent === "字号");
      return {
        text: span?.textContent || "",
        fontSize: span?.style.fontSize || "",
        selectionCollapsed: window.getSelection().isCollapsed,
        valueText: document.querySelector("#detailFontValue")?.textContent || "",
      };
    });
    assert.equal(detailFont.text, "字号");
    assert.equal(detailFont.fontSize, "24px");
    assert.equal(detailFont.selectionCollapsed, true);
    assert.equal(detailFont.valueText, "24");

    await page.locator("#detailLineGap").selectOption("0.3");
    const lineHeight = await page.locator("#nodeDetail").evaluate((editor) => editor.style.lineHeight);
    assert.equal(lineHeight, "1.3");

    await waitSaved(page);
    const recovery = await getStoredValue(page, "recovery-project");
    const savedNode = recovery.project.nodes[0];
    assert.equal(savedNode.detail, "字号滑轮");
    assert.equal(savedNode.detailLineGap, 0.3);
    assert.equal(savedNode.detailHtml.includes("<span"), true);
    assert.equal(savedNode.detailHtml.includes("font-size: 24px"), true);
    console.log("ok rich text inspector formats selected text and persists node detail");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });
    await page.locator("#nodeDetail").click();
    await page.evaluate(() => {
      const editor = document.querySelector("#nodeDetail");
      const html = '<span style="font-size: 36px; color: rgb(192, 57, 43);">外部富文本</span>';
      const text = "外部富文本";
      const data = new DataTransfer();
      data.setData("text/html", html);
      data.setData("text/plain", text);
      editor.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }));
    });
    const pasted = await page.locator("#nodeDetail").evaluate((editor) => ({
      text: editor.innerText,
      html: editor.innerHTML,
      fontSize: getComputedStyle(editor).fontSize,
      firstChildFontSize: editor.firstElementChild ? getComputedStyle(editor.firstElementChild).fontSize : "",
    }));
    assert.equal(pasted.text, "外部富文本");
    assert.equal(pasted.html.includes("36px"), false, "pasted rich text should not keep external font size");
    assert.equal(pasted.firstChildFontSize === "" || pasted.firstChildFontSize === pasted.fontSize, true);
    console.log("ok pasted rich text uses inspector default font size immediately");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "图片前文字图片后";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      const textNode = editor.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 3);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    const imagePaste = await page.evaluate(() => {
      const pngBytes = Uint8Array.from([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13,
        73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6,
        0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73,
        68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31,
        0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0,
        0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File([pngBytes], "pasted.png", { type: "image/png" }));
      document.querySelector("#nodeDetail").dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      }));
      return true;
    });
    assert.equal(imagePaste, true);
    await page.waitForSelector("#nodeDetail img");
    const pastedImage = await page.locator("#nodeDetail").evaluate((editor) => ({
      text: editor.innerText,
      imageCount: editor.querySelectorAll("img").length,
      imageSrc: editor.querySelector("img")?.getAttribute("src") || "",
    }));
    assert.equal(pastedImage.text, "图片前文字图片后");
    assert.equal(pastedImage.imageCount, 1);
    assert.equal(pastedImage.imageSrc.startsWith("data:image/png;base64,"), true);
    await waitSaved(page);
    const imageRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(imageRecovery.project.nodes[0].detail, "图片前文字图片后");
    assert.equal(imageRecovery.project.nodes[0].detailHtml.includes("<img"), true);
    await page.locator('[data-id="node-2"]').click();
    await page.locator('[data-id="node-1"]').click();
    assert.equal(await page.locator("#nodeDetail img").count(), 1);
    await page.locator("#nodeDetail img").click();
    await page.waitForSelector("#detailImageResizeHandle.visible");
    const originalImageSize = await page.locator("#nodeDetail img").evaluate((image) => ({
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
    }));
    const resizeHandle = await page.locator("#detailImageResizeHandle").boundingBox();
    assert.ok(resizeHandle);
    await page.mouse.move(resizeHandle.x + resizeHandle.width / 2, resizeHandle.y + resizeHandle.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeHandle.x + resizeHandle.width / 2 + 80, resizeHandle.y + resizeHandle.height / 2 + 80);
    await page.mouse.up();
    const resizedImage = await page.locator("#nodeDetail img").evaluate((image) => ({
      width: image.getBoundingClientRect().width,
      height: image.getBoundingClientRect().height,
      widthAttribute: image.getAttribute("width"),
      heightAttribute: image.getAttribute("height"),
    }));
    assert.equal(resizedImage.width > originalImageSize.width, true);
    assert.equal(
      Math.round(resizedImage.width / resizedImage.height * 100),
      Math.round(originalImageSize.width / originalImageSize.height * 100),
    );
    assert.equal(Number(resizedImage.widthAttribute) > 0, true);
    assert.equal(Number(resizedImage.heightAttribute) > 0, true);
    await waitSaved(page);
    const resizedRecovery = await getStoredValue(page, "recovery-project");
    assert.equal(resizedRecovery.project.nodes[0].detailHtml.includes(`width="${resizedImage.widthAttribute}"`), true);
    assert.equal(resizedRecovery.project.nodes[0].detailHtml.includes(`height="${resizedImage.heightAttribute}"`), true);
    await page.locator('[data-id="node-2"]').click();
    await page.locator('[data-id="node-1"]').click();
    const restoredImageSize = await page.locator("#nodeDetail img").evaluate((image) => ({
      width: image.getAttribute("width"),
      height: image.getAttribute("height"),
    }));
    assert.deepEqual(restoredImageSize, {
      width: resizedImage.widthAttribute,
      height: resizedImage.heightAttribute,
    });
    await page.locator("#nodeDetail img").click();
    await page.locator('[data-id="node-2"]').click();
    await page.locator("#nodeDetail").click();
    await page.locator('[data-id="node-1"]').click();
    await page.locator("#nodeDetail img").click();
    await page.keyboard.press("ControlOrMeta+C");
    await page.locator('[data-id="node-2"]').click();
    await page.locator("#nodeDetail").click();
    await page.keyboard.press("ControlOrMeta+V");
    await page.waitForSelector("#nodeDetail img");
    assert.equal(await page.locator("#nodeDetail img").count(), 1);
    console.log("ok selected detail images copy and paste into another node");

    await page.locator('[data-id="node-1"]').click();
    console.log("ok clipboard images render and persist in node detail");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = '<span style="color: rgb(47, 111, 159);">已有蓝色</span>';
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
    await selectEditorText(page, 0, 4);
    await page.locator("[data-detail-color='red']").click();
    const recolored = await page.locator("#nodeDetail").evaluate((editor) => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const colors = [];
      let node = walker.nextNode();
      while (node) {
        if (node.textContent.trim()) colors.push(getComputedStyle(node.parentElement).color);
        node = walker.nextNode();
      }
      return { html: editor.innerHTML, colors };
    });
    assert.equal(recolored.colors.every((color) => color === "rgb(192, 57, 43)"), true);
    assert.equal(recolored.html.includes("47, 111, 159"), false, "conflicting old rich-text color should be removed");
    assert.equal(recolored.html.includes("<span style="), true);
    assert.equal((recolored.html.match(/<span/g) || []).length, 1, "formatted selection should be stored as a flat span");
    console.log("ok selected text color replaces nested old colors");

    assert.equal(await page.locator("#detailFormatBrush").count(), 1);
    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = '<span style="background-color: rgb(255, 248, 204); color: rgb(47, 111, 159); font-size: 24px;">源格式</span> 目标文字';
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
    await selectEditorText(page, 0, 3);
    await page.locator("#detailFormatBrush").click();
    assert.equal(await page.locator("#detailFormatBrush").getAttribute("aria-pressed"), "true");
    await selectEditorText(page, 4, 8);
    await page.locator("#nodeDetail").dispatchEvent("mouseup");
    const brushed = await page.locator("#nodeDetail").evaluate((editor) => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      const result = [];
      let node = walker.nextNode();
      while (node) {
        if (node.textContent.includes("目标文字")) {
          const style = getComputedStyle(node.parentElement);
          result.push({
            text: node.textContent,
            background: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
          });
        }
        node = walker.nextNode();
      }
      return {
        result,
        brushPressed: document.querySelector("#detailFormatBrush")?.getAttribute("aria-pressed"),
        brushClass: editor.classList.contains("format-brush-active"),
      };
    });
    assert.equal(brushed.result.length, 1);
    assert.equal(brushed.result[0].background, "rgb(255, 248, 204)");
    assert.equal(brushed.result[0].color, "rgb(47, 111, 159)");
    assert.equal(brushed.result[0].fontSize, "24px");
    assert.equal(brushed.brushPressed, "false");
    assert.equal(brushed.brushClass, false);
    console.log("ok format brush copies highlight color and font size once");

    assert.equal(await page.locator("#detailLineNumbers").count(), 1);
    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.style.width = "180px";
      editor.innerHTML = "第一行内容很长但逻辑仍是一行<br>第二行<br>第三行";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
    await page.locator("#nodeDetail").evaluate((editor) => {
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.locator("#detailLineNumbers").click();
    const numbered = await page.locator("#nodeDetail").evaluate((editor) => ({
      text: editor.innerText,
      html: editor.innerHTML,
    }));
    assert.equal(
      numbered.text,
      "1️⃣ 第一行内容很长但逻辑仍是一行\n2️⃣ 第二行\n3️⃣ 第三行",
      "numbering should follow logical editor lines, not visual wrapping",
    );
    assert.equal(numbered.html.includes("<br>"), true, "numbering should keep logical line breaks");
    console.log("ok line numbering prefixes selected logical lines");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.style.width = "";
      editor.innerHTML = "第一段  保留  空格<br><br>&nbsp;&nbsp;&nbsp;&nbsp;缩进行";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
    await page.locator('[data-id="node-2"]').click();
    await page.locator('[data-id="node-1"]').click();
    const restoredSpacing = await page.locator("#nodeDetail").evaluate((editor) => ({
      text: editor.innerText,
      html: editor.innerHTML,
    }));
    assert.equal(
      restoredSpacing.text,
      "第一段  保留  空格\n\n    缩进行",
      "switching nodes should preserve intentional spaces and blank lines",
    );
    assert.equal(restoredSpacing.html.includes("<br><br>"), true, "stored rich text should keep blank spacer lines");
    console.log("ok switching nodes preserves detail spacing");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });
    await page.locator("#nodeDetail").click();
    await page.keyboard.type("撤销高亮");
    await selectEditorText(page, 0, 2);
    await page.locator("[data-detail-highlight='yellow']").click();
    assert.equal(
      await page.locator("#nodeDetail").evaluate((editor) => editor.innerHTML.includes("<span")),
      true,
      "highlight should wrap selected text before undo",
    );
    await page.keyboard.press("Control+Z");
    await page.waitForTimeout(80);
    const afterUndoHighlight = await page.locator("#nodeDetail").evaluate((editor) => ({
      text: editor.innerText,
      html: editor.innerHTML,
    }));
    assert.equal(afterUndoHighlight.text, "撤销高亮");
    assert.equal(afterUndoHighlight.html.includes("<span"), false, "Ctrl+Z should undo selected-text highlight");
    console.log("ok Ctrl+Z undoes rich text formatting inside inspector");

    await page.locator("#nodeDetail").evaluate((editor) => {
      editor.innerHTML = "";
      editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    });
    await page.locator("#nodeDetail").click();
    await page.keyboard.type("撤销文字");
    await page.keyboard.press("Control+Z");
    await page.waitForTimeout(80);
    assert.equal(await page.locator("#nodeDetail").evaluate((editor) => editor.innerText), "撤销文");
    console.log("ok Ctrl+Z undoes recent text input inside inspector");
  } finally {
    await context.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
