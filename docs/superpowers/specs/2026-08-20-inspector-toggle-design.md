# Inspector Toggle Design

## Goal

Add a small button centered on the inspector's left resize boundary. Clicking it expands the right sidebar to the maximum available width; clicking it again restores the width that was active before expansion.

## Behavior

- The button lives on `#inspectorResizer`, so it remains attached to the sidebar boundary.
- `aria-expanded="false"` means the sidebar is at its normal width and the button expands it.
- `aria-expanded="true"` means the sidebar is maximized and the button restores the saved width.
- The pre-expansion width is held in runtime state and is clamped to the current viewport.
- Resizing the browser while expanded keeps the sidebar maximized.
- Existing drag resizing remains available and persists `viewport.inspectorWidth` through the current canvas document.

## Testing

Playwright coverage verifies the control exists, expands close to the viewport width, and restores the exact prior width. Existing keyboard, storage, rich-text, and performance tests must remain green.
