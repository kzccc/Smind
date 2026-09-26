# Update LeetCode Training Mindmap Implementation Plan

> **For agentic workers:** This generated-data task uses the existing project schema and validation scripts.

**Goal:** Replace the six completed LeetCode nodes' code blocks with the user's training `main.go` files, prepend the requested explanation/point formatting, and append complexity notes.

**Architecture:** Discover completed题目 folders under the training directory, match them to the existing non-TOP100 mindmap by problem number/name, and update only matched node `detail`/`detailHtml` fields. Preserve all other project data and write a new data file.

**Tech Stack:** PowerShell, JSON, existing `mindmap.product.v2` schema.

## Global Constraints

- Ignore any training entries without a matching existing node.
- Do not include TOP100 nodes.
- Preserve image references and existing unrelated nodes.
- Use a code block for the full Go file and a point block for explanation/complexity text.

## Task 1: Inspect and match completed exercises

- [ ] Enumerate training files and identify completed题目, images, and `main.go` files.
- [ ] Match each completed题目 to a mindmap node by LeetCode number and title.

## Task 2: Update the mindmap data

- [ ] Read each matched `main.go` in full.
- [ ] Build detail HTML with existing code-block and point-block classes.
- [ ] Preserve or add the题目图片 reference where present.
- [ ] Write a new `.mindmap.json` under `D:\Smind\data`.

## Task 3: Validate

- [ ] Verify exactly six nodes changed and each contains the full training code.
- [ ] Verify JSON parses and remains `mindmap.product.v2`.
- [ ] Run existing logic tests.
