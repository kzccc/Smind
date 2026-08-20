# Inspector Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a boundary button that maximizes and restores the inspector sidebar.

**Architecture:** Keep the current inspector width in `state.inspectorWidth`, add a transient `inspectorExpanded` flag and `inspectorRestoreWidth`, and reuse `setInspectorWidth()` for both drag and button actions. The button is a child of the existing resize handle, with pointer propagation stopped so it does not start a drag.

**Tech Stack:** Plain JavaScript, HTML/CSS, Playwright.

---

### Task 1: Test And Implement

**Files:**
- Modify: `src/index.html`
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `tests/storage.playwright.js`

- [ ] Add a failing storage assertion for expand and restore.
- [ ] Run `node tests/storage.playwright.js` and confirm the missing control fails.
- [ ] Add the button markup and CSS chevron.
- [ ] Add transient expansion state, toggle logic, resize behavior, and event wiring.
- [ ] Run the storage test and confirm it passes.

### Task 2: Regression Verification

- [ ] Run all logic and Playwright tests.
- [ ] Check `git diff --check`.
- [ ] Commit the feature while leaving any unrelated user edits untouched.
