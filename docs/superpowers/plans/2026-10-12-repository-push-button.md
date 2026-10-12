# Repository Push Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `推送` button beside `导出MD` that pushes the complete Smind repository, including tracked `data`, to its configured GitHub remote.

**Architecture:** The browser button calls a localhost helper because a `file://` page cannot execute Git. The helper is bound to the Smind repository, stages all files with `git add -A`, commits only when there are changes, and pushes the current branch to `origin`; the UI reports the command result.

**Tech Stack:** Vanilla browser JavaScript, Node.js HTTP server, Git CLI, Playwright.

## Global Constraints

- The helper may operate only on `D:\Smind`.
- The push target is the repository's configured `origin` and current branch; no remote or branch is invented.
- `git add -A` includes `data` and deletions.
- No credentials are stored in source files.

### Task 1: Add failing UI test

**Files:**
- Modify: `D:\Smind\tests\storage.playwright.js`

- [ ] Assert the toolbar contains a button with id `pushRepository` and label `推送`.
- [ ] Stub the helper request and assert clicking the button sends a push request and displays its returned status.
- [ ] Run the focused test and verify it fails because the button and handler do not exist.

### Task 2: Implement button and browser client

**Files:**
- Modify: `D:\Smind\src\index.html`
- Modify: `D:\Smind\src\app.js`
- Modify: `D:\Smind\src\styles.css`

- [ ] Add the button beside `导出MD`.
- [ ] Add a `pushRepository()` client that POSTs to `http://127.0.0.1:32123/push` and reports success or failure in the existing save-status area.
- [ ] Disable the button while the request is active and restore it in a `finally` block.
- [ ] Run the focused UI test and verify it passes.

### Task 3: Implement fixed-repository Git helper

**Files:**
- Create: `D:\Smind\tools\git-push-server.js`
- Modify: `D:\Smind\package.json`

- [ ] Expose `POST /push` on `127.0.0.1:32123` with CORS for the local page.
- [ ] Verify the resolved repository path is exactly `D:\Smind`.
- [ ] Run `git add -A`, inspect status, commit with a timestamped message when changes exist, then run `git push origin <current branch>`.
- [ ] Return structured JSON containing branch, remote, commit summary, and push output without exposing credentials.
- [ ] Add `npm run git-helper` to start the helper.

### Task 4: Verify

- [ ] Run syntax checks, the focused UI test, existing storage/richtext/keyboard/performance tests, and a helper dry-run/status test.
- [ ] Confirm `git diff --check` passes and no `data` file was changed by implementation.
