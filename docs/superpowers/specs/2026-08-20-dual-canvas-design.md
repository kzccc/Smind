# Dual Canvas Design

## Goal

One `.mindmap.json` project stores two independent mind-map canvases: a main canvas for detailed information and a summary canvas for overview information. Opening a project always shows the main canvas first. A fixed segmented control in the upper-left of the canvas switches between `主画布` and `副画布`.

## Data Model

Projects move from `mindmap.product.v1` to `mindmap.product.v2`.

```json
{
  "schema": "mindmap.product.v2",
  "meta": {
    "title": "未命名思维导图",
    "createdAt": "2026-08-20T00:00:00.000Z",
    "updatedAt": "2026-08-20T00:00:00.000Z"
  },
  "activeCanvasId": "main",
  "canvases": {
    "main": {
      "id": "main",
      "title": "主画布",
      "viewport": { "scale": 1, "tx": 420, "ty": 300, "inspectorWidth": 390 },
      "nodes": [],
      "selection": { "activeId": "", "selectedIds": [] },
      "counters": { "nextId": 1 }
    },
    "summary": {
      "id": "summary",
      "title": "副画布",
      "viewport": { "scale": 1, "tx": 420, "ty": 300, "inspectorWidth": 390 },
      "nodes": [],
      "selection": { "activeId": "", "selectedIds": [] },
      "counters": { "nextId": 1 }
    }
  }
}
```

Each canvas owns its own nodes, viewport, selection, and next-id counter. Node ids may repeat across canvases because canvases do not reference each other.

## Compatibility

Legacy v1 files with top-level `nodes`, `viewport`, `selection`, and `counters` normalize into `canvases.main`. A default summary canvas is created when missing. Existing `data/*.mindmap.json` files should be converted to v2 so bundled examples exercise the new structure directly, while runtime normalization still accepts old files and old recovery backups.

## App Behavior

The renderer continues to operate on the current canvas' `nodes` array. Before switching canvases or saving, the app snapshots the current canvas state into `state.projectCanvases[state.activeCanvasId]`. Switching loads the target canvas snapshot into the existing state fields and refreshes the viewport, selection, inspector, and rendered nodes.

Opening a project always selects `main`, even if a file contains `activeCanvasId: "summary"`. Saving can record the current active canvas id for transparency, but load behavior remains main-first.

Undo history, node clipboard, pending connection state, detail-editor image selection, and detail undo stacks must not bleed across canvases. Node content is independent; editing, creating, deleting, or styling nodes on one canvas must not mutate the other canvas.

## UI

Add a fixed-size segmented control inside the canvas shell at the upper-left. It is a rounded rectangle split down the middle:

- Left segment: `主画布`
- Right segment: `副画布`

The active segment has stronger contrast. The control uses the app's existing restrained workbench styling and sits above nodes and edges without affecting pan, zoom, or selection gestures.

## Export And Persistence

Autosave, Ctrl+S, Save As, download fallback, open-file recovery, and IndexedDB recovery all write/read the full v2 project. Markdown export exports only the currently active canvas.

## Testing

Logic tests cover v1 migration, v2 normalization, independent canvases, and default summary creation. Playwright tests cover default main canvas load, switching to summary, editing summary without changing main, saving both canvases, and reopening a legacy v1 project into v2 recovery.
