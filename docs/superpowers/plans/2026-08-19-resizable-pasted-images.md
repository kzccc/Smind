# Resizable Pasted Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow pasted images in the detail editor to be selected, resized proportionally, undone, and persisted.

**Architecture:** Keep image data in sanitized inline `<img>` elements. Add editor-local image selection and pointer-resize state to `app.js`; persist dimensions through the existing `detailHtml` synchronization path.

**Tech Stack:** Plain browser JavaScript, `contenteditable`, CSS, Playwright, IndexedDB recovery storage.

---

### Task 1: Add the failing resize regression test

**Files:**
- Modify: `D:\Smind\tests\richtext.playwright.js`

- [ ] **Step 1: Paste and select the test image**

Reuse the existing PNG clipboard fixture and assert that a pasted image receives an editor selection marker.

- [ ] **Step 2: Simulate dragging the resize handle**

Dispatch pointer events against the selected image resize handle and assert:

```js
assert.equal(resized.width > original.width, true);
assert.equal(Math.round(resized.width / resized.height * 100), Math.round(original.width / original.height * 100));
```

- [ ] **Step 3: Verify persistence and node switching**

Wait for autosave, assert the recovery project's `detailHtml` contains the resized `width` and `height`, switch to another node and back, and assert the same dimensions remain.

- [ ] **Step 4: Run the focused test and confirm RED**

Run:

```powershell
node tests/richtext.playwright.js
```

Expected: the test fails because pasted images currently have no selection marker or resize handle.

### Task 2: Implement image selection and proportional resizing

**Files:**
- Modify: `D:\Smind\src\app.js`
- Modify: `D:\Smind\src\styles.css`

- [ ] **Step 1: Extend detail state**

Track the selected detail image and active resize gesture separately from canvas pointer state.

- [ ] **Step 2: Preserve bounded image dimensions**

Extend the sanitizer to keep only safe positive `width` and `height` values, clamped to the documented range.

- [ ] **Step 3: Add image selection UI**

On editor click, select an image when the target is an `IMG`; add a lightweight resize handle element adjacent to the selected image. Clear it when clicking elsewhere or changing nodes.

- [ ] **Step 4: Add proportional pointer resizing**

On handle pointerdown, capture the image's rendered dimensions and natural aspect ratio. On pointermove, calculate width from horizontal movement, clamp it, derive height from the ratio, update the image attributes/styles, and synchronize the active node. On pointerup, end the gesture.

- [ ] **Step 5: Integrate detail undo**

Push a detail undo snapshot before resizing starts, and ensure undo removes the latest dimensions while preserving the image itself.

- [ ] **Step 6: Add focused CSS**

Style selected images and the handle without changing normal text editing.

### Task 3: Verify the complete feature

**Files:**
- No additional files.

- [ ] **Step 1: Run the rich-text test**

```powershell
node tests/richtext.playwright.js
```

- [ ] **Step 2: Run the remaining regression tests**

```powershell
node src/logic.test.js
npm run test:keyboard
npm run test:storage
npm run test:performance
```

- [ ] **Step 3: Check the diff**

```powershell
git diff --check
git status --short
```
