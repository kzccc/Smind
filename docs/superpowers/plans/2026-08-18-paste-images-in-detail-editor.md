# Paste Images In Detail Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to paste clipboard images directly into the right-side node detail editor and persist them inside the mindmap project.

**Architecture:** Keep images inline as sanitized `<img>` elements whose `src` is a clipboard-derived data URL. Extend the existing rich-text paste path and HTML sanitizer; `detailHtml` remains the persisted representation while `detail` continues to contain plain text.

**Tech Stack:** Plain browser JavaScript, `contenteditable`, Clipboard API events, Playwright, IndexedDB recovery storage.

---

### Task 1: Add the failing browser regression test

**Files:**
- Modify: `D:\Smind\tests\richtext.playwright.js`

- [ ] **Step 1: Add a clipboard image paste scenario**

Create a 1x1 PNG `Blob`, place it in a `DataTransfer`, dispatch a cancellable `ClipboardEvent("paste")` on `#nodeDetail`, and assert that:

```js
assert.equal(pasted.text, "图片前文字图片后");
assert.equal(pasted.imageCount, 1);
assert.equal(pasted.imageSrc.startsWith("data:image/png;base64,"), true);
assert.equal(pasted.savedHtml.includes("<img"), true);
```

The test should wait for autosave and inspect the `recovery-project` record so it verifies persistence, not only DOM insertion.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
node tests/richtext.playwright.js
```

Expected: the new image assertion fails because the current paste handler converts clipboard content to plain text and the sanitizer does not preserve images.

### Task 2: Implement image paste and persistence

**Files:**
- Modify: `D:\Smind\src\app.js`
- Modify: `D:\Smind\src\styles.css`

- [ ] **Step 1: Preserve safe inline images during sanitization**

Extend `sanitizeDetailHtml()` to accept only `IMG` elements with `src` values beginning with `data:image/`. Copy `alt`, `width`, and `height` only when safe, and render the image inline without allowing arbitrary attributes or event handlers.

- [ ] **Step 2: Insert clipboard images into the editor**

Update `pasteIntoDetailEditor()` to inspect `event.clipboardData.items` before the plain-text fallback. For the first `image/*` item, read the `File` with `FileReader`, insert an `<img>` at the current selection, synchronize the node detail, and preserve the existing rich-text undo behavior. Keep the current plain-text paste behavior unchanged for non-image clipboard content.

- [ ] **Step 3: Add stable image layout styling**

Style pasted images inside `.detail-input` with responsive sizing so they remain visible in the sidebar without expanding its width:

```css
.detail-input img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 6px 0;
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
node tests/richtext.playwright.js
```

Expected: all rich-text tests pass, including clipboard image insertion and recovery persistence.

### Task 3: Run the full verification suite

**Files:**
- No additional files.

- [ ] **Step 1: Run pure logic tests**

```powershell
node src/logic.test.js
```

- [ ] **Step 2: Run all browser tests**

```powershell
npm run test:keyboard
npm run test:storage
npm run test:performance
```

- [ ] **Step 3: Inspect the final diff**

```powershell
git diff --check
git diff --stat
```

Confirm that only the image-paste behavior, its browser regression test, the image styling, and this plan file changed.
