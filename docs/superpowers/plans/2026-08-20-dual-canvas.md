# Dual Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent canvases per project file, with main-first load behavior and a fixed upper-left canvas switcher.

**Architecture:** `src/logic.js` owns v2 project/canvas normalization and v1 migration. `src/app.js` keeps the existing renderer pointed at the active canvas while storing both canvas snapshots in project state. `src/index.html` and `src/styles.css` add the segmented canvas switcher.

**Tech Stack:** Plain JavaScript, browser DOM APIs, IndexedDB, File System Access API, Node assert tests, Playwright tests.

---

### Task 1: Logic Data Model

**Files:**
- Modify: `src/logic.test.js`
- Modify: `src/logic.js`

- [ ] **Step 1: Write failing tests for v2 and v1 migration**

Add tests that assert `createProjectDocument()` returns `mindmap.product.v2`, places legacy top-level nodes in `canvases.main`, creates `canvases.summary`, and preserves independent v2 canvases.

- [ ] **Step 2: Run logic tests and verify failure**

Run: `node src/logic.test.js`

Expected: failure mentioning v1 schema or missing `canvases`.

- [ ] **Step 3: Implement canvas normalization**

Add `createCanvasDocument()`, update `createProjectDocument()` to emit v2, update `normalizeProjectDocument()` to accept both v1 and v2, and export `createCanvasDocument`.

- [ ] **Step 4: Run logic tests and verify pass**

Run: `node src/logic.test.js`

Expected: all logic tests pass.

### Task 2: App Canvas Switching

**Files:**
- Modify: `src/index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `tests/storage.playwright.js`

- [ ] **Step 1: Write failing Playwright coverage**

Add a storage test that loads main by default, clicks `副画布`, edits the summary root, switches back to `主画布`, verifies the main text remains unchanged, and verifies recovery stores both canvases.

- [ ] **Step 2: Run storage test and verify failure**

Run: `node tests/storage.playwright.js`

Expected: failure because `#canvasSwitcher` or `canvases` does not exist.

- [ ] **Step 3: Add switcher markup and styling**

Add `#canvasSwitcher` with two buttons using `data-canvas-id="main"` and `data-canvas-id="summary"`. Style it as a 132x36 px rounded segmented control fixed at the canvas upper-left.

- [ ] **Step 4: Add app state helpers**

Add active canvas state, project canvas snapshots, per-canvas histories, `currentCanvasDocument()`, `storeActiveCanvasState()`, `loadCanvasDocument()`, `syncCanvasSwitcher()`, and `switchCanvas(id)`.

- [ ] **Step 5: Wire persistence to v2**

Update `currentProjectDocument()` and `applyProject()` to use v2 documents. Ensure open/recovery/default load starts on `main`, while saving writes both canvas snapshots.

- [ ] **Step 6: Run storage test and verify pass**

Run: `node tests/storage.playwright.js`

Expected: all storage tests pass.

### Task 3: Update Existing Tests And Data

**Files:**
- Modify: `tests/richtext.playwright.js`
- Modify: `tests/keyboard.playwright.js`
- Modify: `tests/performance.playwright.js`
- Modify: `data/*.mindmap.json`

- [ ] **Step 1: Update tests for v2 paths**

Change test assertions from `project.nodes` and `project.viewport` to `project.canvases.main.nodes` and `project.canvases.main.viewport` where they inspect stored projects. Keep legacy-open fixtures as v1 to preserve migration coverage.

- [ ] **Step 2: Convert bundled data to v2**

Run a Node migration script that loads each `data/*.mindmap.json`, calls `MindMapLogic.normalizeProjectDocument()`, and writes formatted v2 JSON.

- [ ] **Step 3: Run complete verification**

Run:

```bash
node src/logic.test.js
node tests/storage.playwright.js
node tests/keyboard.playwright.js
node tests/performance.playwright.js
node tests/richtext.playwright.js
```

Expected: every command exits 0.

### Task 4: Review And Commit

**Files:**
- Review all modified files.

- [ ] **Step 1: Inspect diff**

Run: `git diff --stat && git diff -- src/logic.js src/app.js src/index.html src/styles.css`

Expected: changes are scoped to dual-canvas schema, switch UI, tests, and data migration.

- [ ] **Step 2: Commit feature**

Run:

```bash
git add src tests data docs
git commit -m "Add dual canvas project support"
```

Expected: commit succeeds.
