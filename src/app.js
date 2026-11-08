const palette = {
  default: { fill: "#ffffff", stroke: "#aeb7c2", text: "#1f2933" },
  red: { fill: "#fdecec", stroke: "#c0392b", text: "#7a1f18" },
  orange: { fill: "#fff0df", stroke: "#d35400", text: "#6d2b00" },
  yellow: { fill: "#fff8cc", stroke: "#b7950b", text: "#5f5100" },
  green: { fill: "#e9f7ef", stroke: "#2e7d32", text: "#1b4d20" },
  cyan: { fill: "#e7f6f8", stroke: "#15859a", text: "#0c4d59" },
  blue: { fill: "#eaf2fb", stroke: "#2f6f9f", text: "#173d59" },
  purple: { fill: "#f2ecfb", stroke: "#7d3c98", text: "#422052" },
  white: { fill: "#ffffff", stroke: "#7d8794", text: "#1f2933" },
  black: { fill: "#111827", stroke: "#111827", text: "#ffffff" },
};

const detailHighlightColors = {
  red: "#fdecec",
  orange: "#fff0df",
  yellow: "#fff8cc",
  green: "#e9f7ef",
  cyan: "#e7f6f8",
  blue: "#eaf2fb",
  purple: "#f2ecfb",
  white: "#ffffff",
  black: "#000000",
};

const detailFontColors = {
  red: "#c0392b",
  orange: "#d35400",
  yellow: "#b7950b",
  green: "#2e7d32",
  cyan: "#15859a",
  blue: "#2f6f9f",
  purple: "#7d3c98",
  white: "#ffffff",
  black: "#000000",
};

const ZOOM_DEFAULT_MIN_SCALE = 0.08;
const ZOOM_ABSOLUTE_MIN_SCALE = 0.01;
const ZOOM_MAX_SCALE = 2.4;
const FIT_VIEW_PADDING = 120;
const NODE_TOOLTIP_LIMIT = 240;
const CANVAS_MAIN_ID = "main";
const CANVAS_SUMMARY_ID = "summary";
const CANVAS_TITLES = {
  [CANVAS_MAIN_ID]: "主画布",
  [CANVAS_SUMMARY_ID]: "副画布",
};

const state = {
  mode: "pan",
  scale: 1,
  tx: 420,
  ty: 300,
  selected: new Set(["node-1"]),
  activeId: "node-1",
  nextId: 10,
  pointer: null,
  editingId: null,
  clipboard: null,
  history: [],
  lastMouseWorld: { x: 0, y: 0 },
  connectingFromIds: [],
  modifierCreateActive: false,
  inspectorWidth: 390,
  inspectorHeight: 320,
  inspectorExpanded: false,
  inspectorRestoreWidth: null,
  inspectorRestoreHeight: null,
  projectMeta: null,
  projectCanvases: null,
  activeCanvasId: CANVAS_MAIN_ID,
  canvasHistories: new Map(),
  currentFileName: "A-default.json",
  fileHandle: null,
  fileFingerprint: null,
  saveConflict: false,
  dataDirectoryHandle: null,
  dataServerReady: false,
  dataServerFiles: null,
  windowSessionId: "",
  autosaveTimer: null,
  dirty: false,
  saving: false,
  savePromise: null,
  saveAgainAfterCurrent: false,
  saveRevision: 0,
  committedRevision: 0,
  lastSaveMs: 0,
  lastWriteBytes: 0,
  suppressAutosave: true,
  detailUndoStacks: new Map(),
  restoringDetail: false,
  detailFormatBrush: null,
  detailImage: null,
  detailImageResize: null,
  detailImageClipboard: null,
  detailCodeClipboard: null,
  detailCodePlainClipboard: "",
  detailPointClipboard: null,
  detailPointPlainClipboard: "",
  detailTitleClipboard: null,
  detailTitlePlainClipboard: "",
  detailSelectionRange: null,
};

const nodes = [
  {
    id: "node-1",
    parentId: null,
    x: 0,
    y: 0,
    w: 190,
    h: 92,
    text: "思维导图产品",
    detail: "",
    color: "default",
    fontSize: 18,
    children: ["node-2", "node-3", "node-4", "node-5"],
  },
  {
    id: "node-2",
    parentId: "node-1",
    x: 310,
    y: -190,
    w: 170,
    h: 86,
    text: "鼠标模式",
    detail: "",
    color: "red",
    fontSize: 16,
    children: ["node-6", "node-7"],
  },
  {
    id: "node-3",
    parentId: "node-1",
    x: 310,
    y: -55,
    w: 170,
    h: 86,
    text: "编辑模式",
    detail: "",
    color: "blue",
    fontSize: 16,
    children: [],
  },
  {
    id: "node-4",
    parentId: "node-1",
    x: 310,
    y: 80,
    w: 170,
    h: 86,
    text: "节点编辑",
    detail: "",
    color: "green",
    fontSize: 16,
    children: ["node-8", "node-9"],
  },
  {
    id: "node-5",
    parentId: "node-1",
    x: 310,
    y: 215,
    w: 170,
    h: 86,
    text: "HTML 风格",
    detail: "",
    color: "cyan",
    fontSize: 16,
    children: [],
  },
  {
    id: "node-6",
    parentId: "node-2",
    x: 590,
    y: -240,
    w: 166,
    h: 78,
    text: "框选",
    detail: "",
    color: "default",
    fontSize: 15,
    children: [],
  },
  {
    id: "node-7",
    parentId: "node-2",
    x: 590,
    y: -145,
    w: 166,
    h: 78,
    text: "批量格式",
    detail: "",
    color: "default",
    fontSize: 15,
    children: [],
  },
  {
    id: "node-8",
    parentId: "node-4",
    x: 590,
    y: 42,
    w: 166,
    h: 78,
    text: "Tab 子节点",
    detail: "",
    color: "default",
    fontSize: 15,
    children: [],
  },
  {
    id: "node-9",
    parentId: "node-4",
    x: 590,
    y: 137,
    w: 166,
    h: 78,
    text: "Enter 并列",
    detail: "",
    color: "default",
    fontSize: 15,
    children: [],
  },
];

const els = {
  app: document.querySelector("#app"),
  openFile: document.querySelector("#openFile"),
  newFile: document.querySelector("#newFile"),
  saveAsFile: document.querySelector("#saveAsFile"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  pushRepository: document.querySelector("#pushRepository"),
  saveStatus: document.querySelector("#saveStatus"),
  fileInput: document.querySelector("#fileInput"),
  newFileDialog: document.querySelector("#newFileDialog"),
  newFileForm: document.querySelector("#newFileForm"),
  newFileName: document.querySelector("#newFileName"),
  newFileError: document.querySelector("#newFileError"),
  cancelNewFile: document.querySelector("#cancelNewFile"),
  openFileDialog: document.querySelector("#openFileDialog"),
  openFileList: document.querySelector("#openFileList"),
  openFileError: document.querySelector("#openFileError"),
  openFileSearch: document.querySelector("#openFileSearch"),
  openFileSource: document.querySelector("#openFileSource"),
  openFileDir: document.querySelector("#openFileDir"),
  closeOpenFile: document.querySelector("#closeOpenFile"),
  cancelOpenFile: document.querySelector("#cancelOpenFile"),
  currentFile: document.querySelector("#currentFile"),
  newFileDialogTitle: document.querySelector("#newFileDialogTitle"),
  confirmNewFile: document.querySelector("#confirmNewFile"),
  shell: document.querySelector("#canvasShell"),
  canvasSwitcher: document.querySelector("#canvasSwitcher"),
  edgeSvg: document.querySelector("#edgeSvg"),
  edgeLayer: document.querySelector("#edgeLayer"),
  nodeLayer: document.querySelector("#nodeLayer"),
  selectionBox: document.querySelector("#selectionBox"),
  fontSize: document.querySelector("#fontSize"),
  fontValue: document.querySelector("#fontValue"),
  nodeDetail: document.querySelector("#nodeDetail"),
  detailLineGap: document.querySelector("#detailLineGap"),
  detailFontSize: document.querySelector("#detailFontSize"),
  detailFontValue: document.querySelector("#detailFontValue"),
  detailFormatBrush: document.querySelector("#detailFormatBrush"),
  detailLineNumbers: document.querySelector("#detailLineNumbers"),
  detailCode: document.querySelector("#detailCode"),
  detailPoint: document.querySelector("#detailPoint"),
  detailTitle: document.querySelector("#detailTitle"),
  inspectorResizer: document.querySelector("#inspectorResizer"),
  detailImageResizeHandle: document.querySelector("#detailImageResizeHandle"),
  inspectorToggle: document.querySelector("#inspectorToggle"),
};

const DETAIL_BLOCK_SPACER_LINES = 3;

const renderCache = {
  nodes: new Map(),
  edges: new Map(),
  visibleNodeIds: new Set(),
  visibilityFrame: 0,
};

function byId(id) {
  return nodes.find((node) => node.id === id);
}

function makeId() {
  const id = `node-${state.nextId}`;
  state.nextId += 1;
  return id;
}

function snapshot() {
  return JSON.stringify({
    nodes,
    nextId: state.nextId,
    selected: [...state.selected],
    activeId: state.activeId,
  });
}

function saveHistory() {
  state.history.push(snapshot());
  if (state.history.length > 80) state.history.shift();
  markDirty();
}

function undo() {
  const raw = state.history.pop();
  if (!raw) return;
  const data = JSON.parse(raw);
  nodes.splice(0, nodes.length, ...data.nodes);
  state.nextId = data.nextId;
  state.selected = new Set(data.selected);
  state.activeId = data.activeId;
  render();
  markDirty();
}

function resizeNode(node) {
  const textLength = Math.max(4, node.text.length);
  const lineCount = Math.max(1, Math.ceil(textLength / 12));
  node.w = Math.max(136, Math.min(260, node.fontSize * Math.min(textLength, 16) * 0.72 + 54));
  node.h = Math.max(54, 24 + lineCount * (node.fontSize + 8));
}

function selectedNodes() {
  return [...state.selected].map(byId).filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailToHtml(detail) {
  return String(detail || "")
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join("<br>");
}

function normalizeDetailLineGap(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.max(0.1, Math.min(0.9, Math.round(number * 10) / 10));
}

function normalizeDetailImageDimension(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.max(48, Math.min(1600, Math.round(number)));
}

function detailLineHeight(gap) {
  return (1 + normalizeDetailLineGap(gap)).toFixed(1);
}

function plainTextFromDetailEditor() {
  const content = els.nodeDetail.cloneNode(true);
  content.querySelectorAll("br[data-detail-trailing-space]").forEach((lineBreak) => lineBreak.remove());
  return content.innerText.replace(/\n$/, "");
}

const GO_KEYWORDS = new Set("break default func interface select case defer go map struct chan else goto package switch const fallthrough if range type continue for import return var".split(" "));
const GO_TYPES = new Set("bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any".split(" "));

function appendGoSyntax(code, text) {
  const tokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`[^`]*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  let cursor = 0;
  const append = (value, className = "") => {
    if (!value) return;
    if (!className) code.append(document.createTextNode(value));
    else {
      const span = document.createElement("span");
      span.className = className;
      span.append(document.createTextNode(value));
      code.append(span);
    }
  };
  for (const match of String(text || "").matchAll(tokenPattern)) {
    append(text.slice(cursor, match.index));
    const token = match[0];
    let className = "";
    if (token.startsWith("//") || token.startsWith("/*")) className = "tok-comment";
    else if (/^[`"']/.test(token)) className = "tok-string";
    else if (/^\d/.test(token)) className = "tok-number";
    else if (GO_KEYWORDS.has(token)) className = "tok-keyword";
    else if (GO_TYPES.has(token)) className = "tok-type";
    else if (/^[A-Z][A-Za-z0-9_]*$/.test(token)) className = "tok-constant";
    append(token, className);
    cursor = match.index + token.length;
  }
  append(String(text || "").slice(cursor));
}

function ensureDetailTrailingSpace() {
  els.nodeDetail.querySelectorAll("br[data-detail-trailing-space]").forEach((lineBreak) => lineBreak.remove());
  for (let index = 0; index < DETAIL_BLOCK_SPACER_LINES; index += 1) {
    const lineBreak = document.createElement("br");
    lineBreak.setAttribute("data-detail-trailing-space", "true");
    els.nodeDetail.append(lineBreak);
  }
}

function detailTextOffsetFromRange(range) {
  const before = document.createRange();
  before.selectNodeContents(els.nodeDetail);
  before.setEnd(range.endContainer, range.endOffset);
  return before.toString().length;
}

function isSafeDetailImageSource(source) {
  return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(String(source || ""));
}

function restoreDetailCaretAtTextOffset(offset) {
  const walker = document.createTreeWalker(els.nodeDetail, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent.length;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(els.nodeDetail);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function sanitizeDetailHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const output = document.createElement("div");
  const defaultFormat = { backgroundColor: "", color: "", fontSize: "" };

  function appendText(text, format, target = output) {
    if (!text) return;
    const hasStyle = Boolean(format.backgroundColor || format.color || format.fontSize);
    if (!hasStyle) {
      target.append(document.createTextNode(text));
      return;
    }
    const previous = target.lastChild;
    if (
      previous
      && previous.nodeType === Node.ELEMENT_NODE
      && previous.tagName.toLowerCase() === "span"
      && previous.style.backgroundColor === format.backgroundColor
      && previous.style.color === format.color
      && previous.style.fontSize === format.fontSize
    ) {
      previous.append(document.createTextNode(text));
      return;
    }
    const span = document.createElement("span");
    if (format.backgroundColor) span.style.backgroundColor = format.backgroundColor;
    if (format.color) span.style.color = format.color;
    if (format.fontSize) span.style.fontSize = format.fontSize;
    span.append(document.createTextNode(text));
      target.append(span);
  }

  function appendBreak() {
    output.append(document.createElement("br"));
  }

  function appendClean(source, format = defaultFormat) {
    if (source.nodeType === Node.TEXT_NODE) {
      appendText(source.textContent || "", format);
      return;
    }
    if (source.nodeType !== Node.ELEMENT_NODE) return;

    const tag = source.tagName.toLowerCase();
    if (tag === "br") {
      const lineBreak = document.createElement("br");
      if (source.hasAttribute("data-detail-trailing-space")) {
        lineBreak.setAttribute("data-detail-trailing-space", "true");
      }
      output.append(lineBreak);
      return;
    }
    if (tag === "pre") {
      const codeBlock = document.createElement("pre");
      codeBlock.className = source.classList.contains("detail-point-block")
        ? "detail-point-block"
        : "detail-code-block";
      const code = document.createElement("code");
      function appendCodeContent(node, format = defaultFormat) {
        if (node.nodeType === Node.TEXT_NODE) {
          appendText((node.textContent || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"), format, code);
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.tagName.toLowerCase() === "br") {
          appendText("\n", format, code);
          return;
        }
        if (/^tok-/.test(node.className || "")) {
          const tokenSpan = document.createElement("span");
          tokenSpan.className = node.className;
          if (format.backgroundColor || node.style.backgroundColor) tokenSpan.style.backgroundColor = node.style.backgroundColor || format.backgroundColor;
          if (format.color || node.style.color) tokenSpan.style.color = node.style.color || format.color;
          if (format.fontSize || node.style.fontSize) tokenSpan.style.fontSize = node.style.fontSize || format.fontSize;
          tokenSpan.textContent = node.textContent || "";
          code.append(tokenSpan);
          return;
        }
        const nextFormat = { ...format };
        if (node.style.backgroundColor) nextFormat.backgroundColor = node.style.backgroundColor;
        if (node.style.color) nextFormat.color = node.style.color;
        if (node.style.fontSize) nextFormat.fontSize = node.style.fontSize;
        [...node.childNodes].forEach((child) => appendCodeContent(child, nextFormat));
      }
      const hasTokenSpans = [...source.querySelectorAll("span")].some((span) => /^tok-/.test(span.className));
      const hasStyledSpans = [...source.querySelectorAll("span")].some((span) => span.hasAttribute("style"));
      if (!hasTokenSpans && !hasStyledSpans) {
        appendGoSyntax(code, source.textContent || "");
      } else {
        [...source.childNodes].forEach((child) => appendCodeContent(child));
      }
      codeBlock.append(code);
      output.append(codeBlock);
      return;
    }
    if (tag === "div" && source.classList.contains("detail-title-block")) {
      const titleBlock = document.createElement("div");
      titleBlock.className = "detail-title-block";
      const title = document.createElement("strong");
      [...source.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) title.append(document.createTextNode(child.textContent || ""));
        else if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "br") title.append(document.createElement("br"));
        else if (child.nodeType === Node.ELEMENT_NODE) title.append(document.createTextNode(child.textContent || ""));
      });
      titleBlock.append(title);
      output.append(titleBlock);
      return;
    }
    if (tag === "img") {
      const src = source.getAttribute("src") || "";
      if (!isSafeDetailImageSource(src)) return;
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      const width = normalizeDetailImageDimension(source.getAttribute("width"));
      const height = normalizeDetailImageDimension(source.getAttribute("height"));
      if (width !== null) image.setAttribute("width", String(width));
      if (height !== null) image.setAttribute("height", String(height));
      output.append(image);
      return;
    }

    const nextFormat = { ...format };
    if (source.style.backgroundColor) nextFormat.backgroundColor = source.style.backgroundColor;
    if (source.style.color) nextFormat.color = source.style.color;
    if (source.style.fontSize) nextFormat.fontSize = source.style.fontSize;

    if (tag === "div" || tag === "p") {
      if (output.childNodes.length > 0) appendBreak();
      [...source.childNodes].forEach((child) => appendClean(child, nextFormat));
      return;
    }

    [...source.childNodes].forEach((child) => appendClean(child, nextFormat));
  }

  [...template.content.childNodes].forEach((child) => appendClean(child));
  [...output.querySelectorAll("pre.detail-code-block, pre.detail-point-block")].forEach((block) => {
    let next = block.nextSibling;
    let removed = 0;
    while (
      removed < DETAIL_BLOCK_SPACER_LINES
      && next
      && next.nodeType === Node.ELEMENT_NODE
      && next.tagName.toLowerCase() === "br"
    ) {
      const remove = next;
      next = next.nextSibling;
      remove.remove();
      removed += 1;
    }
  });
  while (
    output.lastChild
    && output.lastChild.nodeType === Node.ELEMENT_NODE
    && output.lastChild.tagName.toLowerCase() === "br"
  ) output.lastChild.remove();
  return output.innerHTML;
}

function detailSnapshot(node) {
  return {
    detail: String(node.detail || ""),
    detailHtml: sanitizeDetailHtml(typeof node.detailHtml === "string" ? node.detailHtml : detailToHtml(node.detail)),
    detailLineGap: normalizeDetailLineGap(node.detailLineGap),
  };
}

function sameDetailSnapshot(a, b) {
  return a.detail === b.detail
    && a.detailHtml === b.detailHtml
    && a.detailLineGap === b.detailLineGap;
}

function pushDetailUndo() {
  const node = byId(state.activeId);
  if (!node || state.restoringDetail) return;
  const stack = state.detailUndoStacks.get(node.id) || [];
  const snapshotValue = detailSnapshot(node);
  if (stack.length === 0 || !sameDetailSnapshot(stack[stack.length - 1], snapshotValue)) {
    stack.push(snapshotValue);
    if (stack.length > 80) stack.shift();
    state.detailUndoStacks.set(node.id, stack);
  }
}

function restoreDetailSnapshot(snapshotValue) {
  const node = byId(state.activeId);
  if (!node) return;
  state.restoringDetail = true;
  node.detail = snapshotValue.detail;
  node.detailHtml = sanitizeDetailHtml(snapshotValue.detailHtml);
  node.detailLineGap = normalizeDetailLineGap(snapshotValue.detailLineGap);
  els.nodeDetail.innerHTML = node.detailHtml;
  els.nodeDetail.style.lineHeight = detailLineHeight(node.detailLineGap);
  els.detailLineGap.value = String(node.detailLineGap);
  clearDetailImageSelection();
  updateNodeDom(node.id);
  state.restoringDetail = false;
  markDirty();
}

function undoDetailEditor() {
  const node = byId(state.activeId);
  if (!node) return false;
  const stack = state.detailUndoStacks.get(node.id) || [];
  const snapshotValue = stack.pop();
  if (!snapshotValue) return false;
  restoreDetailSnapshot(snapshotValue);
  return true;
}

function worldToScreen(point) {
  return {
    x: point.x * state.scale + state.tx,
    y: point.y * state.scale + state.ty,
  };
}

function clientToLocal(x, y) {
  const rect = els.shell.getBoundingClientRect();
  return {
    x: x - rect.left,
    y: y - rect.top,
  };
}

function screenToWorld(x, y) {
  const local = clientToLocal(x, y);
  return {
    x: (local.x - state.tx) / state.scale,
    y: (local.y - state.ty) / state.scale,
  };
}

function setInspectorWidth(width) {
  const minWidth = 280;
  const maxWidth = Math.max(minWidth, window.innerWidth);
  state.inspectorWidth = Math.max(minWidth, Math.min(maxWidth, width));
  els.app.style.setProperty("--inspector-width", `${state.inspectorWidth}px`);
  syncInspectorToggle();
}

function setInspectorHeight(height, { allowFullHeight = false } = {}) {
  const minHeight = 180;
  const maxHeight = Math.max(
    minHeight,
    Math.floor(window.innerHeight * (allowFullHeight ? 1 : 0.8)),
  );
  state.inspectorHeight = Math.max(minHeight, Math.min(maxHeight, height));
  els.app.style.setProperty("--inspector-height", `${state.inspectorHeight}px`);
}

function isBottomInspector() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function syncInspectorToggle() {
  if (!els.inspectorToggle) return;
  els.inspectorToggle.setAttribute("aria-expanded", String(state.inspectorExpanded));
  const label = state.inspectorExpanded
    ? (isBottomInspector() ? "恢复侧边栏高度" : "恢复侧边栏宽度")
    : "展开侧边栏";
  els.inspectorToggle.setAttribute("aria-label", label);
  els.inspectorToggle.title = label;
  document.body.classList.toggle("inspector-expanded", state.inspectorExpanded);
}

function toggleInspectorExpanded() {
  if (state.inspectorExpanded) {
    state.inspectorExpanded = false;
    if (isBottomInspector()) {
      const restoreHeight = state.inspectorRestoreHeight ?? 320;
      state.inspectorRestoreHeight = null;
      setInspectorHeight(restoreHeight);
    } else {
      const restoreWidth = state.inspectorRestoreWidth ?? 390;
      state.inspectorRestoreWidth = null;
      setInspectorWidth(restoreWidth);
    }
  } else {
    if (isBottomInspector()) {
      state.inspectorRestoreHeight = state.inspectorHeight;
      state.inspectorExpanded = true;
      setInspectorHeight(window.innerHeight, { allowFullHeight: true });
    } else {
      state.inspectorRestoreWidth = state.inspectorWidth;
      state.inspectorExpanded = true;
      setInspectorWidth(window.innerWidth);
    }
  }
  syncInspectorToggle();
  markDirty();
}

function setSaveStatus(text, status = "saved") {
  els.saveStatus.textContent = text;
  els.saveStatus.dataset.state = status;
  refreshFileChip();
}

function canvasTitle(id) {
  return state.projectCanvases?.[id]?.title || CANVAS_TITLES[id] || "画布";
}

function currentCanvasDocument() {
  return MindMapLogic.createCanvasDocument({
    id: state.activeCanvasId,
    title: canvasTitle(state.activeCanvasId),
    nodes,
    viewport: {
      scale: state.scale,
      tx: state.tx,
      ty: state.ty,
      inspectorWidth: state.inspectorExpanded
        ? state.inspectorRestoreWidth ?? 390
        : state.inspectorWidth,
      inspectorHeight: state.inspectorHeight,
    },
    selection: {
      activeId: state.activeId,
      selectedIds: [...state.selected],
    },
    counters: {
      nextId: state.nextId,
    },
  });
}

function ensureProjectCanvases() {
  if (state.projectCanvases) return;
  const project = MindMapLogic.createProjectDocument({
    canvases: {
      [CANVAS_MAIN_ID]: currentCanvasDocument(),
    },
    activeCanvasId: state.activeCanvasId,
  });
  state.projectCanvases = project.canvases;
}

function storeActiveCanvasState() {
  ensureProjectCanvases();
  state.projectCanvases[state.activeCanvasId] = currentCanvasDocument();
}

function currentProjectDocument() {
  storeActiveCanvasState();
  const project = MindMapLogic.createProjectDocument({
    activeCanvasId: state.activeCanvasId,
    canvases: state.projectCanvases,
    meta: state.projectMeta || {
      title: MindMapLogic.parseDataFileName(state.currentFileName).title || "未命名思维导图",
    },
  });
  state.projectMeta = project.meta;
  state.projectCanvases = project.canvases;
  return project;
}

function loadCanvasDocument(canvas) {
  nodes.splice(0, nodes.length, ...canvas.nodes);
  state.scale = canvas.viewport.scale;
  state.tx = canvas.viewport.tx;
  state.ty = canvas.viewport.ty;
  state.nextId = canvas.counters.nextId;
  state.selected = new Set(canvas.selection.selectedIds);
  state.activeId = canvas.selection.activeId;
  state.inspectorHeight = canvas.viewport.inspectorHeight ?? 320;
  setInspectorWidth(canvas.viewport.inspectorWidth);
  setInspectorHeight(state.inspectorHeight);
}

function resetCanvasTransientState() {
  state.clipboard = null;
  state.connectingFromIds = [];
  state.detailUndoStacks = new Map();
  state.detailFormatBrush = null;
  state.detailImageClipboard = null;
  state.detailCodeClipboard = null;
  state.detailCodePlainClipboard = "";
  state.detailPointClipboard = null;
  state.detailPointPlainClipboard = "";
  state.detailTitleClipboard = null;
  state.detailTitlePlainClipboard = "";
  clearDetailImageSelection();
}

function syncCanvasSwitcher() {
  els.canvasSwitcher?.querySelectorAll("[data-canvas-id]").forEach((button) => {
    const active = button.dataset.canvasId === state.activeCanvasId;
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyProject(project, options = {}) {
  const normalized = MindMapLogic.normalizeProjectDocument(project);
  state.suppressAutosave = true;
  state.projectMeta = normalized.meta;
  state.projectCanvases = normalized.canvases;
  state.activeCanvasId = CANVAS_MAIN_ID;
  state.inspectorExpanded = false;
  state.inspectorRestoreWidth = null;
  loadCanvasDocument(state.projectCanvases[state.activeCanvasId]);
  state.history = [];
  state.canvasHistories = new Map();
  resetCanvasTransientState();
  render();
  syncCanvasSwitcher();
  if (options.fitView) fitView();
  state.dirty = false;
  state.suppressAutosave = false;
}

function switchCanvas(id) {
  if (![CANVAS_MAIN_ID, CANVAS_SUMMARY_ID].includes(id) || id === state.activeCanvasId) return;
  storeActiveCanvasState();
  state.canvasHistories.set(state.activeCanvasId, state.history);
  state.activeCanvasId = id;
  state.inspectorExpanded = false;
  state.inspectorRestoreWidth = null;
  loadCanvasDocument(state.projectCanvases[id]);
  state.history = state.canvasHistories.get(id) || [];
  resetCanvasTransientState();
  render();
  syncCanvasSwitcher();
}

function markDirty() {
  if (state.suppressAutosave) return;
  state.dirty = true;
  state.saveRevision += 1;
  setSaveStatus("未保存", "dirty");
  window.clearTimeout(state.autosaveTimer);
  // 40-60 MB projects need ~2.5 s per write, so autosave waits for a real pause in
  // the work instead of firing between two clicks. Ctrl+S still saves immediately.
  const heavy = (state.lastWriteBytes || 0) >= HEAVY_PROJECT_BYTES;
  const delay = heavy
    ? 12000
    : Math.min(8000, Math.max(800, Math.round((state.lastSaveMs || 0) * 1.5)));
  state.autosaveTimer = window.setTimeout(() => {
    saveNow();
  }, delay);
}

const PROJECT_DB_NAME = "smind-storage";
const LEGACY_PROJECT_DB_NAME = "mindmap-product-storage";
const MAX_RECOVERY_HISTORY = 20;
// Projects above this size already live in a real file; duplicating them into
// IndexedDB on every keystroke is what made 40-60 MB maps feel frozen.
const HEAVY_PROJECT_BYTES = 4 * 1024 * 1024;

function sessionStorageKey(prefix) {
  return `${prefix}-${state.windowSessionId}`;
}

function openProjectDb(dbName = PROJECT_DB_NAME) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putStoredValue(key, value) {
  const db = await openProjectDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function deleteStoredValue(key) {
  const db = await openProjectDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function readStoredValue(dbName, key) {
  const db = await openProjectDb(dbName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readonly");
    const request = tx.objectStore("kv").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function getStoredValue(key) {
  const value = await readStoredValue(PROJECT_DB_NAME, key);
  if (value !== undefined) return value;

  const legacyValue = await readStoredValue(LEGACY_PROJECT_DB_NAME, key);
  if (legacyValue !== undefined) await putStoredValue(key, legacyValue);
  return legacyValue;
}

async function saveRecovery(project, fileName = state.currentFileName, options = {}) {
  const heavy = Boolean(options.heavy);
  const snapshot = JSON.parse(JSON.stringify(project));
  const recovery = {
    savedAt: new Date().toISOString(),
    fileName: String(fileName || "未命名.json"),
    project: snapshot,
  };
  const perFileKey = `recovery-project-file-${encodeURIComponent(recovery.fileName)}`;
  const writes = [
    putStoredValue(sessionStorageKey("recovery-project"), recovery),
    putStoredValue(perFileKey, recovery),
  ];
  if (!heavy) {
    // Keep the legacy key for existing recovery data and older tooling. It is
    // never read while a window session is active, so windows remain isolated.
    writes.push(putStoredValue("recovery-project", recovery));
  }
  await Promise.all(writes);
  if (heavy) return;
  const verified = await readStoredValue(PROJECT_DB_NAME, perFileKey);
  if (!verified || verified.fileName !== recovery.fileName || JSON.stringify(verified.project) !== JSON.stringify(snapshot)) {
    throw new Error("恢复副本校验失败");
  }
  const indexKey = sessionStorageKey("recovery-history-index");
  let history = await getStoredValue(indexKey);
  if (!Array.isArray(history)) history = [];
  const historyKey = `${sessionStorageKey("recovery-history")}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await putStoredValue(historyKey, recovery);
  history.push(historyKey);
  while (history.length > MAX_RECOVERY_HISTORY) {
    const expiredKey = history.shift();
    try { await deleteStoredValue(expiredKey); } catch (error) { /* best effort */ }
  }
  await putStoredValue(indexKey, history);
}

function fileFingerprint(file) {
  if (!file) return null;
  return { name: file.name || "", size: Number(file.size) || 0, lastModified: Number(file.lastModified) || 0 };
}

function sameFileFingerprint(left, right) {
  return Boolean(left && right)
    && left.name === right.name
    && left.size === right.size
    && left.lastModified === right.lastModified;
}

async function refreshFileFingerprint() {
  if (state.fileHandle?.stat) {
    try {
      state.fileFingerprint = await state.fileHandle.stat();
      return state.fileFingerprint;
    } catch (error) {
      state.fileFingerprint = null;
      return null;
    }
  }
  if (!state.fileHandle?.getFile) return null;
  state.fileFingerprint = fileFingerprint(await state.fileHandle.getFile());
  return state.fileFingerprint;
}

async function getFileRecovery(fileName) {
  const normalizedName = String(fileName || "未命名.json");
  return getStoredValue(`recovery-project-file-${encodeURIComponent(normalizedName)}`);
}

async function rememberFileHandle(fileHandle = state.fileHandle, fileName = state.currentFileName) {
  if (!fileHandle) return;
  try {
    await putStoredValue(sessionStorageKey("file-handle"), {
      fileName: String(fileName || "未命名.json"),
      handle: fileHandle,
    });
  } catch (error) {
    // Some browsers reject FileSystemHandle persistence; recovery still works.
  }
}

async function rememberDataDirectoryHandle() {
  if (!state.dataDirectoryHandle) return;
  try {
    await putStoredValue(sessionStorageKey("data-directory-handle"), state.dataDirectoryHandle);
    await putStoredValue("data-directory-handle", state.dataDirectoryHandle);
  } catch (error) {
    // The directory can still be chosen again if this browser cannot persist handles.
  }
}

function normalizeNewProjectFileName(value) {
  const baseName = String(value || "").trim();
  if (!baseName) throw new Error("请输入文件名称");
  if (/[\\/:*?"<>|]/.test(baseName)) throw new Error("文件名称不能包含路径或特殊字符");
  if (/\.json$/i.test(baseName)) return baseName;
  return `${baseName}.json`;
}

async function ensureDataDirectoryHandle() {
  if (state.dataDirectoryHandle) {
    if (!state.dataDirectoryHandle.queryPermission) return state.dataDirectoryHandle;
    let permission = await state.dataDirectoryHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") permission = await state.dataDirectoryHandle.requestPermission({ mode: "readwrite" });
    if (permission === "granted") {
      if (state.dataDirectoryHandle.entries) {
        let hasProjectFile = false;
        for await (const [name, handle] of state.dataDirectoryHandle.entries()) {
          if (handle.kind === "file" && /\.json$/i.test(name)) {
            hasProjectFile = true;
            break;
          }
        }
        if (hasProjectFile) return state.dataDirectoryHandle;
        state.dataDirectoryHandle = null;
      } else {
        return state.dataDirectoryHandle;
      }
    }
    state.dataDirectoryHandle = null;
  }
  if (!window.showDirectoryPicker) throw new Error("当前浏览器不支持直接新建文件");
  const directory = await window.showDirectoryPicker({
    id: "smind-data-directory",
    mode: "readwrite",
  });
  state.dataDirectoryHandle = directory;
  await rememberDataDirectoryHandle();
  return directory;
}

/* --------------------------------------------------------------------------
 * data/ 目录浏览器
 * 打开面板优先读取本地数据服务（tools/git-push-server.js）给出的 data/ 清单，
 * 其次使用已授权的 data 目录句柄，两者都不可用时提示手动选择目录或文件。
 * ------------------------------------------------------------------------ */

const DATA_SERVER_ORIGIN = "http://127.0.0.1:32123";
const DATA_SERVER_PROBE_TIMEOUT = 1800;
const DATA_DEFAULT_CANDIDATES = ["A-default.json", "default.json", "default.mindmap.json"];
const DATA_FILE_PATTERN = /\.json$/i;
const CATEGORY_HUES = [214, 158, 262, 22, 330, 190, 96, 288, 42, 172];

const openFileView = {
  source: { kind: "idle", files: [] },
  groups: [],
  flat: [],
  activeIndex: 0,
  query: "",
  loading: false,
};

function dataServerOrigin() {
  if (/^https?:$/i.test(window.location.protocol) && window.location.port === "32123") {
    return window.location.origin;
  }
  return DATA_SERVER_ORIGIN;
}

async function dataServerRequest(pathname, options = {}) {
  if (window.__smindDisableDataServer) throw new Error("本地数据服务已关闭");
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${dataServerOrigin()}${pathname}`, {
      cache: "no-store",
      signal: controller.signal,
      ...fetchOptions,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.trim() || `HTTP ${response.status}`);
    }
    return response;
  } finally {
    window.clearTimeout(timer);
  }
}

async function probeDataServer() {
  try {
    const response = await dataServerRequest("/api/data", { timeout: DATA_SERVER_PROBE_TIMEOUT });
    const payload = await response.json();
    if (!payload || payload.ok !== true || !Array.isArray(payload.files)) throw new Error("数据目录响应异常");
    state.dataServerReady = true;
    state.dataServerFiles = payload.files;
    return payload.files;
  } catch (error) {
    state.dataServerReady = false;
    state.dataServerFiles = null;
    return null;
  }
}

function createServerFileHandle(fileName) {
  const name = String(fileName || "");
  return {
    kind: "file",
    name,
    serverBacked: true,
    verifyAfterWrite: false,
    queryPermission: async () => "granted",
    requestPermission: async () => "granted",
    async stat() {
      const response = await dataServerRequest(`/api/stat?name=${encodeURIComponent(name)}`, { timeout: 8000 });
      const payload = await response.json();
      if (!payload || payload.ok !== true) throw new Error(payload?.error || "读取文件信息失败");
      return { name, size: Number(payload.size) || 0, lastModified: Number(payload.mtime) || 0 };
    },
    async getFile() {
      const response = await dataServerRequest(`/data/${encodeURIComponent(name)}`, { timeout: 120000 });
      const text = await response.text();
      return new File([text], name, { type: "application/json", lastModified: Date.now() });
    },
    async createWritable() {
      const chunks = [];
      return {
        async write(chunk) {
          chunks.push(chunk);
        },
        async close() {
          const body = chunks.every((chunk) => typeof chunk === "string")
            ? chunks.join("")
            : new Blob(chunks);
          const response = await dataServerRequest(`/api/save?name=${encodeURIComponent(name)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            timeout: 180000,
          });
          const payload = await response.json().catch(() => ({}));
          if (!payload || payload.ok !== true) throw new Error(payload?.error || "写入文件失败");
        },
      };
    },
  };
}

async function listDirectoryDataFiles(directory) {
  const files = [];
  if (!directory || !directory.entries) return files;
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind !== "file" || !DATA_FILE_PATTERN.test(name)) continue;
    let size = 0;
    let mtime = 0;
    try {
      const file = await handle.getFile();
      size = file.size;
      mtime = file.lastModified;
    } catch (error) {
      // A single unreadable file must not break the whole listing.
    }
    files.push({ name, size, mtime, handle });
  }
  return files;
}

async function restoreDataDirectoryHandle() {
  const candidates = [state.dataDirectoryHandle];
  try {
    candidates.push(await getStoredValue(sessionStorageKey("data-directory-handle")));
    candidates.push(await getStoredValue("data-directory-handle"));
  } catch (error) {
    // Ignore storage failures; the caller falls back to a manual picker.
  }
  for (const handle of candidates) {
    if (!handle || !handle.queryPermission) continue;
    try {
      const permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission === "granted") {
        state.dataDirectoryHandle = handle;
        return handle;
      }
    } catch (error) {
      // Try the next remembered handle.
    }
  }
  return null;
}

async function collectOpenFileSource() {
  const serverFiles = await probeDataServer();
  if (serverFiles) return { kind: "server", files: serverFiles };
  try {
    const directory = await restoreDataDirectoryHandle();
    if (directory) return { kind: "directory", files: await listDirectoryDataFiles(directory) };
  } catch (error) {
    // Fall through to the manual source panel.
  }
  return { kind: "none", files: [] };
}

function categoryHue(index) {
  const position = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return CATEGORY_HUES[position % CATEGORY_HUES.length];
}

function categoryBadgeText(category) {
  const text = String(category || "").trim();
  if (!text || text === MindMapLogic.DATA_CATEGORY_FALLBACK) return "?";
  if (/^[\x20-\x7e]+$/.test(text)) return text.slice(0, 2).toUpperCase();
  return text.slice(0, 1);
}

function refreshFileChip() {
  if (!els.currentFile) return;
  const hasFile = Boolean(state.currentFileName);
  els.currentFile.hidden = !hasFile;
  if (!hasFile) return;
  const parsed = MindMapLogic.parseDataFileName(state.currentFileName);
  const category = els.currentFile.querySelector(".file-chip-category");
  const title = els.currentFile.querySelector(".file-chip-title");
  if (category) category.textContent = parsed.category;
  if (title) title.textContent = parsed.title;
  els.currentFile.dataset.category = parsed.category;
  els.currentFile.dataset.dirty = String(Boolean(state.dirty));
  els.currentFile.title = state.currentFileName;
}

function setOpenFileGroups() {
  const files = openFileView.source?.files || [];
  const filtered = MindMapLogic.filterDataGroups(MindMapLogic.groupDataFiles(files), openFileView.query);
  openFileView.groups = filtered;
  openFileView.flat = filtered.flatMap((group) => group.files.map((file) => ({ ...file, category: group.category })));
  if (openFileView.activeIndex >= openFileView.flat.length) openFileView.activeIndex = 0;
}

function openFileSourceLabel() {
  const kind = openFileView.source?.kind || "none";
  if (kind === "server") return `data/ · 本地服务 ${dataServerOrigin().replace(/^https?:\/\//, "")}`;
  if (kind === "directory") return "data/ · 已授权的本地目录";
  if (kind === "loading") return "data/ · 读取中";
  return "data/ · 未连接";
}

function createOpenFileSkeleton() {
  const wrapper = document.createElement("div");
  wrapper.className = "open-skeleton-grid";
  for (let index = 0; index < 8; index += 1) {
    const cell = document.createElement("div");
    cell.className = "open-skeleton";
    wrapper.append(cell);
  }
  return wrapper;
}

function createOpenFileEmpty() {
  const source = openFileView.source || { kind: "none", files: [] };
  const hasFiles = (source.files || []).length > 0;
  const wrapper = document.createElement("div");
  wrapper.className = "open-empty";

  const icon = document.createElement("div");
  icon.className = "open-empty-icon";
  icon.textContent = hasFiles ? "⌕" : "⌘";

  const title = document.createElement("p");
  title.className = "open-empty-title";
  const text = document.createElement("p");
  text.className = "open-empty-text";

  if (hasFiles) {
    title.textContent = "没有匹配的文件";
    text.textContent = `没有文件名或分类包含「${openFileView.query}」的思维导图，换个关键词试试。`;
    wrapper.append(icon, title, text);
    return wrapper;
  }

  if (source.kind === "server" || source.kind === "directory") {
    title.textContent = "data/ 目录里还没有 JSON 文件";
    text.textContent = "把思维导图保存到 data/ 目录，并按「分类-名称.json」命名，例如 A-网络协议.json，它就会自动出现在对应分类里。";
  } else {
    title.textContent = "还没连上 data/ 目录";
    text.textContent = "本地数据服务没有运行，也没有已授权的目录。启动本地服务后可以直接列出 data/ 下的全部文件；也可以手动授权一次 data 目录，或直接选择单个文件。";
  }
  wrapper.append(icon, title, text);

  const actions = document.createElement("div");
  actions.className = "open-empty-actions";

  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn btn-primary";
  retry.textContent = "重试连接";
  retry.addEventListener("click", () => reloadOpenFileSource());
  actions.append(retry);

  if (window.showDirectoryPicker) {
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "btn";
    pick.textContent = "选择 data 目录";
    pick.addEventListener("click", chooseDataDirectoryFromDialog);
    actions.append(pick);
  }

  if (window.showOpenFilePicker || els.fileInput) {
    const manual = document.createElement("button");
    manual.type = "button";
    manual.className = "btn btn-quiet";
    manual.textContent = "手动选择文件";
    manual.addEventListener("click", () => {
      els.openFileDialog.close();
      openProjectFileFallback();
    });
    actions.append(manual);
  }

  wrapper.append(actions);
  return wrapper;
}

function createOpenFileCard(file, group) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "file-card";
  card.dataset.name = file.name;
  card.setAttribute("role", "option");
  const index = openFileView.flat.findIndex((entry) => entry.name === file.name);
  card.dataset.index = String(index);
  const isCurrent = file.name === state.currentFileName;
  card.classList.toggle("is-current", isCurrent);
  card.setAttribute("aria-selected", String(isCurrent));
  card.title = file.name;

  const top = document.createElement("span");
  top.className = "file-card-top";
  const title = document.createElement("span");
  title.className = "file-card-title";
  title.textContent = file.title;
  top.append(title);
  if (isCurrent) {
    const pill = document.createElement("span");
    pill.className = "file-card-pill";
    pill.textContent = "当前";
    top.append(pill);
  }

  const meta = document.createElement("span");
  meta.className = "file-card-meta";
  const size = document.createElement("span");
  size.textContent = MindMapLogic.formatFileSize(file.size);
  const dot = document.createElement("span");
  dot.className = "file-card-dot";
  const time = document.createElement("span");
  time.textContent = MindMapLogic.formatFileTime(file.mtime);
  meta.append(size, dot, time);

  card.append(top, meta);

  if (file.legacy) {
    const legacy = document.createElement("span");
    legacy.className = "file-card-legacy";
    legacy.textContent = "旧命名";
    card.append(legacy);
  }

  card.addEventListener("click", () => openDataFile(file));
  card.addEventListener("mouseenter", () => highlightOpenFile(index));
  card.addEventListener("focus", () => highlightOpenFile(index));
  return card;
}

function renderOpenFileList() {
  if (!els.openFileList) return;
  els.openFileList.replaceChildren();
  els.openFileList.scrollTop = 0;
  if (els.openFileError) els.openFileError.textContent = "";
  if (els.openFileSource) {
    els.openFileSource.textContent = openFileSourceLabel();
    els.openFileSource.dataset.kind = openFileView.source?.kind || "none";
  }
  if (openFileView.loading) {
    els.openFileList.append(createOpenFileSkeleton());
    return;
  }
  if (!openFileView.groups.length) {
    els.openFileList.append(createOpenFileEmpty());
    return;
  }
  openFileView.groups.forEach((group, groupIndex) => {
    const section = document.createElement("section");
    section.className = "file-group";
    section.dataset.category = group.category;
    section.style.setProperty("--cat-hue", String(categoryHue(groupIndex)));

    const head = document.createElement("header");
    head.className = "file-group-head";
    const badge = document.createElement("span");
    badge.className = "file-group-badge";
    badge.textContent = categoryBadgeText(group.category);
    const name = document.createElement("h3");
    name.className = "file-group-name";
    name.textContent = group.category;
    const count = document.createElement("span");
    count.className = "file-group-count";
    count.textContent = `${group.files.length} 个`;
    const line = document.createElement("span");
    line.className = "file-group-line";
    head.append(badge, name, count, line);

    const grid = document.createElement("div");
    grid.className = "file-grid";
    group.files.forEach((file) => grid.append(createOpenFileCard(file, group)));

    section.append(head, grid);
    els.openFileList.append(section);
  });
  const firstActive = openFileView.flat[openFileView.activeIndex];
  if (firstActive) highlightOpenFile(openFileView.activeIndex);
}

function highlightOpenFile(index, options = {}) {
  openFileView.activeIndex = index;
  if (!els.openFileList) return;
  els.openFileList.querySelectorAll(".file-card").forEach((card) => {
    card.classList.toggle("is-active", Number(card.dataset.index) === index);
  });
  if (options.scroll) {
    const active = els.openFileList.querySelector(`.file-card[data-index="${index}"]`);
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }
}

function moveOpenFileActive(delta) {
  const total = openFileView.flat.length;
  if (!total) return;
  const next = ((openFileView.activeIndex + delta) % total + total) % total;
  highlightOpenFile(next, { scroll: true });
}

async function reloadOpenFileSource() {
  openFileView.loading = true;
  renderOpenFileList();
  openFileView.source = await collectOpenFileSource();
  openFileView.loading = false;
  setOpenFileGroups();
  renderOpenFileList();
}

async function openDataFile(entry) {
  if (!entry) return;
  if (els.openFileError) els.openFileError.textContent = "";
  try {
    let handle = null;
    let file = null;
    if (openFileView.source?.kind === "server") {
      handle = createServerFileHandle(entry.name);
      file = await handle.getFile();
    } else if (entry.handle) {
      handle = entry.handle;
      file = await handle.getFile();
    } else {
      throw new Error("无法读取这个文件");
    }
    // Big maps take a moment to parse; close the panel first and show progress so
    // the wait does not look like a frozen window.
    const heavy = Number(file.size) >= HEAVY_PROJECT_BYTES;
    setSaveStatus("打开中…", "saving");
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    if (heavy) {
      els.openFileDialog.close();
      await loadProjectFromFile(file, handle);
      return;
    }
    await loadProjectFromFile(file, handle);
    els.openFileDialog.close();
  } catch (error) {
    if (els.openFileDialog.open && els.openFileError) {
      els.openFileError.textContent = error.message || "打开失败";
    } else {
      setSaveStatus(error.message ? `打开失败：${error.message}` : "打开失败", "error");
    }
  }
}

async function chooseDataDirectoryFromDialog() {
  try {
    if (!window.showDirectoryPicker) throw new Error("当前浏览器不支持选择目录");
    const directory = await window.showDirectoryPicker({
      id: "smind-data-directory",
      mode: "readwrite",
      startIn: state.dataDirectoryHandle || undefined,
    });
    state.dataDirectoryHandle = directory;
    await rememberDataDirectoryHandle();
    state.dataServerReady = false;
    openFileView.loading = true;
    renderOpenFileList();
    openFileView.source = { kind: "directory", files: await listDirectoryDataFiles(directory) };
    openFileView.loading = false;
    setOpenFileGroups();
    renderOpenFileList();
  } catch (error) {
    if (error.name === "AbortError") return;
    if (els.openFileError) els.openFileError.textContent = error.message || "选择目录失败";
  }
}

async function openProjectFileFallback() {
  try {
    let dataDirectory = null;
    try {
      dataDirectory = await ensureDataDirectoryHandle();
    } catch (error) {
      dataDirectory = state.dataDirectoryHandle;
    }
    if (window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        startIn: dataDirectory || undefined,
      });
      await loadProjectFromFile(await handle.getFile(), handle);
      return;
    }
    els.fileInput.value = "";
    els.fileInput.click();
  } catch (error) {
    if (error.name !== "AbortError") setSaveStatus("打开失败", "error");
  }
}

async function acquireProjectFileHandle(fileName, options = {}) {
  if (state.dataServerReady) {
    let exists = false;
    try {
      const response = await dataServerRequest(`/api/exists?name=${encodeURIComponent(fileName)}`, { timeout: 6000 });
      const payload = await response.json();
      exists = Boolean(payload?.exists);
    } catch (error) {
      throw new Error(error.message || "本地数据服务不可用");
    }
    if (exists && !options.overwrite) throw new Error("同名文件已存在，请更换名称");
    return createServerFileHandle(fileName);
  }
  const directory = await ensureDataDirectoryHandle();
  if (!options.overwrite) {
    let exists = false;
    try {
      await directory.getFileHandle(fileName);
      exists = true;
    } catch (error) {
      if (error.name !== "NotFoundError") throw error;
    }
    if (exists) throw new Error("同名文件已存在，请更换名称");
  }
  return directory.getFileHandle(fileName, { create: true });
}

function suggestedSaveAsFileName() {
  const parsed = MindMapLogic.parseDataFileName(state.currentFileName || "");
  const hasCategory = parsed.category && parsed.category !== MindMapLogic.DATA_CATEGORY_FALLBACK;
  const prefix = hasCategory ? `${parsed.category}-` : "";
  return `${prefix}${parsed.title || "未命名"}-副本.json`;
}

function showNewFileError(message = "") {
  els.newFileError.textContent = message;
}

function openNewProjectDialog(options = {}) {
  if (!els.newFileDialog?.showModal) {
    setSaveStatus("当前浏览器不支持新建窗口", "error");
    return;
  }
  const mode = options && options.mode === "saveAs" ? "saveAs" : "new";
  els.newFileDialog.dataset.mode = mode;
  if (els.newFileDialogTitle) {
    els.newFileDialogTitle.textContent = mode === "saveAs" ? "另存为新的文件" : "新建思维导图";
  }
  if (els.confirmNewFile) els.confirmNewFile.textContent = mode === "saveAs" ? "保存副本" : "确定";
  showNewFileError();
  els.newFileName.value = mode === "saveAs" ? suggestedSaveAsFileName() : "";
  els.newFileDialog.showModal();
  els.newFileName.focus();
  els.newFileName.select?.();
}
async function flushPendingSave() {
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
  if (state.savePromise) await state.savePromise;
  if (state.dirty) await saveNow();
}

async function createNewProjectFile() {
  const mode = els.newFileDialog?.dataset.mode === "saveAs" ? "saveAs" : "new";
  try {
    const fileName = normalizeNewProjectFileName(els.newFileName.value);
    await flushPendingSave();
    const handle = await acquireProjectFileHandle(fileName);
    const title = MindMapLogic.parseDataFileName(fileName).title;
    state.fileHandle = handle;
    state.currentFileName = fileName;
    state.fileFingerprint = null;
    state.saveConflict = false;
    if (mode === "saveAs") {
      state.projectMeta = { ...(state.projectMeta || {}), title };
    } else {
      applyProject(MindMapLogic.createProjectDocument({ meta: { title } }), { fitView: true });
      state.fileFingerprint = null;
    }
    await writeProjectToHandle(currentProjectDocument(), handle);
    await saveRecovery(currentProjectDocument(), state.currentFileName, {
      heavy: (state.lastWriteBytes || 0) >= HEAVY_PROJECT_BYTES,
    });
    await rememberFileHandle();
    state.dirty = false;
    setSaveStatus(mode === "saveAs" ? "已另存" : "已新建", "saved");
    els.newFileDialog.close();
  } catch (error) {
    if (error.name === "AbortError") return;
    showNewFileError(error.message || (mode === "saveAs" ? "另存失败" : "新建失败"));
  }
}
async function writeProjectToHandle(project, fileHandle = state.fileHandle, preSerialized = null) {
  if (!fileHandle) return false;
  if (fileHandle.queryPermission) {
    const permission = await fileHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const requested = await fileHandle.requestPermission({ mode: "readwrite" });
      if (requested !== "granted") return false;
    }
  }
  if (fileHandle === state.fileHandle && state.fileFingerprint && (fileHandle.getFile || fileHandle.stat)) {
    const currentFingerprint = fileHandle.stat
      ? await fileHandle.stat()
      : fileFingerprint(await fileHandle.getFile());
    if (!sameFileFingerprint(state.fileFingerprint, currentFingerprint)) {
      const error = new Error("文件已被其他窗口或程序修改");
      error.code = "FILE_CONFLICT";
      throw error;
    }
  }
  const serialized = typeof preSerialized === "string" ? preSerialized : JSON.stringify(project, null, 2);
  state.lastWriteBytes = serialized.length;
  const writable = await fileHandle.createWritable();
  await writable.write(serialized);
  await writable.close();
  // A successful close is not enough protection on every filesystem provider.
  // Read back when possible and reject a truncated or stale write.
  if (fileHandle.getFile && fileHandle.verifyAfterWrite !== false) {
    const written = await fileHandle.getFile();
    const actual = await written.text();
    if (actual !== serialized) throw new Error("文件写入校验失败，已保留恢复副本");
  }
  if (fileHandle === state.fileHandle) await refreshFileFingerprint();
  return true;
}

async function saveNow(options = {}) {
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
  if (state.saving) {
    state.saveAgainAfterCurrent = true;
    return state.savePromise;
  }
  const project = currentProjectDocument();
  const fileHandle = state.fileHandle;
  const fileName = state.currentFileName;
  const revision = state.saveRevision;
  const startedAt = performance.now();
  let heavy = false;
  state.saving = true;
  setSaveStatus("保存中", "saving");
  state.savePromise = (async () => {
    try {
      // Serialize once and share the text with the file write.
      const serialized = JSON.stringify(project, null, 2);
      heavy = serialized.length >= HEAVY_PROJECT_BYTES;
      const wroteFile = await writeProjectToHandle(project, fileHandle, serialized);
      // Rebuild the recovery snapshot from the exact text that was written, so it
      // can never drift from the file while the write was in flight.
      if (!heavy || !wroteFile) await saveRecovery(JSON.parse(serialized), fileName, { heavy });
      const fileWriteRequired = Boolean(fileHandle) || Boolean(options.requireFile);
      if (!wroteFile && fileWriteRequired) {
        setSaveStatus("文件写入失败，已保留恢复副本", "error");
      } else {
        if (state.saveRevision === revision) {
          state.dirty = false;
          state.committedRevision = revision;
        }
        setSaveStatus(wroteFile ? "已保存" : "已自动保存", "saved");
      }
      await rememberFileHandle(fileHandle, fileName);
    } catch (error) {
      if (error.code === "FILE_CONFLICT") {
        state.fileHandle = null;
        state.fileFingerprint = null;
        state.saveConflict = true;
        state.dirty = true;
        try {
          await saveRecovery(project, fileName, { heavy });
          setSaveStatus("文件已被其他窗口修改，已保留恢复副本", "error");
        } catch (recoveryError) {
          setSaveStatus("文件冲突，恢复副本保存失败", "error");
        }
        return;
      }
      try {
        await saveRecovery(project, fileName, { heavy });
        setSaveStatus("已保存恢复副本", "dirty");
      } catch (recoveryError) {
        setSaveStatus("保存失败", "error");
      }
    } finally {
      state.saving = false;
      state.savePromise = null;
      state.lastSaveMs = Math.round(performance.now() - startedAt);
      if (state.saveAgainAfterCurrent) {
        state.saveAgainAfterCurrent = false;
        markDirty();
      }
      if (state.saveRevision !== revision && !state.saveAgainAfterCurrent) {
        state.saveAgainAfterCurrent = false;
        markDirty();
      }
    }
  })();
  return state.savePromise;
}

async function loadProjectFromFile(file, handle = null) {
  await flushPendingSave();
  const text = await file.text();
  let project = MindMapLogic.normalizeProjectDocument(JSON.parse(text));
  try {
    const recovery = await getFileRecovery(file.name);
    const diskTime = Number(file.lastModified || 0);
    const recoveryTime = Date.parse(recovery?.savedAt || "") || 0;
    if (recovery?.project && recoveryTime > diskTime) {
      project = MindMapLogic.normalizeProjectDocument(recovery.project);
      setSaveStatus("已恢复本地最新副本", "saved");
    }
  } catch (error) {
    // A recovery read failure must not prevent opening a valid file.
  }
  state.fileHandle = handle;
  state.currentFileName = file.name || "未命名.json";
  if (handle && typeof handle.stat === "function") {
    try {
      state.fileFingerprint = await handle.stat();
    } catch (error) {
      state.fileFingerprint = fileFingerprint(file);
    }
  } else {
    state.fileFingerprint = fileFingerprint(file);
  }
  state.saveConflict = false;
  // Remember how big this project is so autosave throttles from the first edit on.
  state.lastWriteBytes = Number(file.size) || 0;
  applyProject(project);
  setSaveStatus("已打开", "saved");
  // A file that is already on disk does not need a second multi-megabyte copy in
  // IndexedDB; only keep recovery for files without a writable handle.
  const heavy = Number(file.size) >= HEAVY_PROJECT_BYTES;
  if (!heavy || !handle) await saveRecovery(currentProjectDocument(), state.currentFileName, { heavy });
  await rememberFileHandle();
}

async function openProjectFile() {
  if (!els.openFileDialog?.showModal) {
    await openProjectFileFallback();
    return;
  }
  openFileView.loading = true;
  openFileView.query = "";
  openFileView.activeIndex = 0;
  openFileView.groups = [];
  openFileView.flat = [];
  openFileView.source = { kind: "loading", files: [] };
  if (els.openFileSearch) els.openFileSearch.value = "";
  renderOpenFileList();
  if (!els.openFileDialog.open) els.openFileDialog.showModal();
  window.setTimeout(() => els.openFileSearch?.focus(), 40);
  // Nothing may block the panel here: pending edits are flushed right before the
  // chosen file actually replaces the canvas (see loadProjectFromFile).
  openFileView.source = await collectOpenFileSource();
  openFileView.loading = false;
  setOpenFileGroups();
  renderOpenFileList();
}
function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.currentFileName.endsWith(".json") ? state.currentFileName : "未命名.json";
  link.click();
  URL.revokeObjectURL(url);
}

function exportMarkdownFile() {
  const title = state.projectMeta?.title || MindMapLogic.parseDataFileName(state.currentFileName).title;
  const markdown = MindMapLogic.projectToMarkdown(nodes, title || "未命名思维导图");
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title || "mindmap"}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

async function pushRepository() {
  if (!els.pushRepository) return;
  els.pushRepository.disabled = true;
  setSaveStatus("推送中", "saving");
  try {
    await flushPendingSave();
    const response = await fetch("http://127.0.0.1:32123/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "推送失败");
    setSaveStatus(result.message || "已推送", "saved");
    window.alert("推送已完成");
  } catch (error) {
    const message = error instanceof TypeError && /fetch/i.test(error.message)
      ? "本地 Git helper 未启动，请运行 npm run git-helper"
      : (error.message || "推送失败");
    setSaveStatus(message, "error");
  } finally {
    els.pushRepository.disabled = false;
  }
}

async function saveAsProjectFile() {
  const project = currentProjectDocument();
  if ((state.dataServerReady || await probeDataServer()) && els.newFileDialog?.showModal) {
    openNewProjectDialog({ mode: "saveAs" });
    return;
  }
  try {
    if (window.showSaveFilePicker) {
      let dataDirectory = state.dataDirectoryHandle;
      try {
        dataDirectory = await ensureDataDirectoryHandle();
      } catch (error) {
        dataDirectory = state.dataDirectoryHandle;
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedSaveAsFileName(),
        types: [{
          description: "Mind Map Project",
          accept: {
            "application/json": [".json"],
          },
        }],
        excludeAcceptAllOption: false,
        startIn: dataDirectory || undefined,
      });
      state.fileHandle = handle;
      state.fileFingerprint = null;
      state.currentFileName = handle.name || suggestedSaveAsFileName();
      await saveNow({ requireFile: true });
      refreshFileChip();
      return;
    }
    downloadProject(project);
    await saveRecovery(project);
    setSaveStatus("已下载", "saved");
  } catch (error) {
    if (error.name !== "AbortError") setSaveStatus("另存失败", "error");
  }
}
async function loadDefaultProject() {
  try {
    const recovery = await getStoredValue(sessionStorageKey("recovery-project"))
      || await getStoredValue("recovery-project");
    if (recovery?.project) {
      state.currentFileName = recovery.fileName || "A-default.json";
      applyProject(recovery.project);
      setSaveStatus("已恢复自动保存", "saved");
      return;
    }
  } catch (error) {
    // Fall through to the bundled data file.
  }
  if (!state.dataServerReady) await probeDataServer();
  if (state.dataServerReady) {
    const names = (state.dataServerFiles || []).map((file) => String(file.name));
    const preferred = DATA_DEFAULT_CANDIDATES.find((candidate) => (
      names.some((name) => name.toLowerCase() === candidate.toLowerCase())
    )) || names.find((name) => /(^|[-－–—])default(\.json)?$/i.test(name));
    if (preferred) {
      try {
        const handle = createServerFileHandle(preferred);
        await loadProjectFromFile(await handle.getFile(), handle);
        return;
      } catch (error) {
        // A broken default project must not block startup.
      }
    }
  }
  for (const candidate of DATA_DEFAULT_CANDIDATES) {
    try {
      const response = await fetch(`../data/${candidate}`, { cache: "no-store" });
      if (!response.ok) continue;
      const project = await response.json();
      state.currentFileName = candidate;
      applyProject(project, { fitView: true });
      setSaveStatus("自动保存", "saved");
      await saveRecovery(currentProjectDocument());
      return;
    } catch (error) {
      // Try the next candidate name.
    }
  }
  applyProject(currentProjectDocument(), { fitView: true });
  setSaveStatus("自动保存", "saved");
}
function setMode(mode) {
  state.mode = mode;
  els.shell.classList.toggle("select-mode", mode === "select");
}

function selectOnly(id) {
  flushActiveDetailEditor();
  state.selected = new Set([id]);
  state.activeId = id;
  state.connectingFromIds = [];
  syncInspector();
  render();
  markDirty();
}

function syncInspector() {
  clearDetailImageSelection();
  const node = byId(state.activeId);
  if (!node) {
    if (els.nodeDetail.innerHTML !== "") els.nodeDetail.innerHTML = "";
    els.fontValue.textContent = "";
    return;
  }
  const detailHtml = sanitizeDetailHtml(
    typeof node.detailHtml === "string" ? node.detailHtml : detailToHtml(node.detail),
  );
  if (els.nodeDetail.innerHTML !== detailHtml) {
    els.nodeDetail.innerHTML = detailHtml;
  }
  ensureDetailTrailingSpace();
  node.detailHtml = detailHtml;
  node.detailLineGap = normalizeDetailLineGap(node.detailLineGap);
  els.nodeDetail.style.lineHeight = detailLineHeight(node.detailLineGap);
  els.detailLineGap.value = String(node.detailLineGap);
  els.fontSize.value = node.fontSize;
  els.fontValue.textContent = String(node.fontSize);
}

function parentOf(node) {
  return node.parentId ? byId(node.parentId) : null;
}

function addChild() {
  const parent = byId(state.activeId) || nodes[0];
  if (!parent) {
    createIndependentNode(state.lastMouseWorld);
    return;
  }
  saveHistory();
  const id = makeId();
  const child = {
    id,
    parentId: parent.id,
    x: parent.x + 285,
    y: parent.y + parent.children.length * 104 - Math.max(0, parent.children.length - 1) * 38,
    w: 166,
    h: 78,
    text: "新子节点",
    detail: "",
    color: "default",
    fontSize: 15,
    children: [],
  };
  nodes.push(child);
  parent.children.push(id);
  resizeNode(child);
  selectOnly(id);
}

function addSibling() {
  const current = byId(state.activeId) || nodes[0];
  if (!current) {
    createIndependentNode(state.lastMouseWorld);
    return;
  }
  saveHistory();
  const parent = parentOf(current) || nodes[0];
  const id = makeId();
  const sibling = {
    id,
    parentId: parent.id,
    x: current.x,
    y: current.y + current.h + 34,
    w: 166,
    h: 78,
    text: "新并列节点",
    detail: "",
    color: "default",
    fontSize: current.fontSize,
    children: [],
  };
  nodes.push(sibling);
  parent.children.push(id);
  resizeNode(sibling);
  selectOnly(id);
}

function applyColor(color) {
  if (state.selected.size === 0) return;
  flushActiveDetailEditor();
  saveHistory();
  selectedNodes().forEach((node) => {
    node.color = color;
  });
  render();
}

function applyFontSize(size) {
  if (state.selected.size === 0) return;
  saveHistory();
  selectedNodes().forEach((node) => {
    node.fontSize = size;
    resizeNode(node);
  });
  syncInspector();
  render();
}

function getDetailRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer;
  const container = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentElement;
  if (!container || !els.nodeDetail.contains(container)) return null;
  return range;
}

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  if (els.nodeDetail.contains(range.commonAncestorContainer)) state.detailSelectionRange = range.cloneRange();
});

function getDetailSelectionRange() {
  const range = getDetailRange();
  if (range && !range.collapsed) {
    state.detailSelectionRange = range.cloneRange();
    return range;
  }
  if (state.detailSelectionRange && els.nodeDetail.contains(state.detailSelectionRange.commonAncestorContainer)) {
    return state.detailSelectionRange.cloneRange();
  }
  return null;
}

function syncNodeDetailFromEditor() {
  const node = byId(state.activeId);
  if (!node) return;
  ensureDetailTrailingSpace();
  node.detailHtml = sanitizeDetailHtml(els.nodeDetail.innerHTML);
  node.detail = plainTextFromDetailEditor();
  node.detailLineGap = normalizeDetailLineGap(els.detailLineGap.value);
  updateNodeDom(node.id);
  markDirty();
}

function flushActiveDetailEditor() {
  const node = byId(state.activeId);
  if (!node) return;
  const editorHtml = sanitizeDetailHtml(els.nodeDetail.innerHTML);
  const editorDetail = plainTextFromDetailEditor();
  const editorLineGap = normalizeDetailLineGap(els.detailLineGap.value);
  if (node.detailHtml === editorHtml && node.detail === editorDetail && node.detailLineGap === editorLineGap) return;
  syncNodeDetailFromEditor();
}

function removeDetailStyles(root, properties) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let element = root.nodeType === Node.ELEMENT_NODE ? root : walker.nextNode();
  while (element) {
    properties.forEach((property) => {
      element.style[property] = "";
    });
    if (element.getAttribute("style") === "") element.removeAttribute("style");
    element = walker.nextNode();
  }
}

function collapseDetailSelectionAfter(node) {
  const selection = window.getSelection();
  state.detailSelectionRange = null;
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.setStartAfter(node);
  nextRange.collapse(true);
  selection.addRange(nextRange);
}

function applyDetailFormat(format, properties) {
  const range = getDetailSelectionRange();
  if (!range) return false;
  saveHistory();
  pushDetailUndo();
  const fragment = range.extractContents();
  removeDetailStyles(fragment, properties);
  const span = document.createElement("span");
  if (range.commonAncestorContainer.parentElement?.closest?.("pre.detail-code-block")) span.className = "tok-format";
  if (properties.includes("backgroundColor") && format.backgroundColor) span.style.backgroundColor = format.backgroundColor;
  if (properties.includes("color") && format.color) span.style.color = format.color;
  if (properties.includes("fontSize") && format.fontSize) span.style.fontSize = format.fontSize;
  span.append(fragment);
  range.insertNode(span);
  collapseDetailSelectionAfter(span);
  const caretOffset = detailTextOffsetFromRange(window.getSelection().getRangeAt(0));
  syncNodeDetailFromEditor();
  const node = byId(state.activeId);
  if (node && els.nodeDetail.innerHTML !== node.detailHtml) {
    els.nodeDetail.innerHTML = node.detailHtml;
    restoreDetailCaretAtTextOffset(caretOffset);
  }
  return true;
}

function applyDetailStyle(kind, colorName) {
  const color = kind === "highlight" ? detailHighlightColors[colorName] : detailFontColors[colorName];
  if (!color) return;
  if (kind === "highlight") applyDetailFormat({ backgroundColor: color }, ["backgroundColor"]);
  if (kind === "color") applyDetailFormat({ color }, ["color"]);
}

function applyDetailFontSize(size) {
  const fontSize = Math.max(12, Math.min(32, Number(size) || 15));
  els.detailFontSize.value = String(fontSize);
  els.detailFontValue.textContent = String(fontSize);
  applyDetailFormat({ fontSize: `${fontSize}px` }, ["fontSize"]);
}

function firstTextNodeInDetailRange(range) {
  const walker = document.createTreeWalker(els.nodeDetail, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  return walker.nextNode();
}

function captureDetailFormat(range) {
  const textNode = firstTextNodeInDetailRange(range);
  const element = textNode?.parentElement || els.nodeDetail;
  const computed = getComputedStyle(element);
  const backgroundColor = computed.backgroundColor === "rgba(0, 0, 0, 0)" ? "" : computed.backgroundColor;
  return {
    backgroundColor,
    color: computed.color || "rgb(0, 0, 0)",
    fontSize: computed.fontSize || "15px",
  };
}

function setFormatBrushActive(active) {
  els.detailFormatBrush.setAttribute("aria-pressed", active ? "true" : "false");
  els.nodeDetail.classList.toggle("format-brush-active", active);
}

function startDetailFormatBrush() {
  const range = getDetailSelectionRange();
  if (!range) return;
  state.detailFormatBrush = captureDetailFormat(range);
  setFormatBrushActive(true);
}

function stopDetailFormatBrush() {
  state.detailFormatBrush = null;
  setFormatBrushActive(false);
}

function paintDetailFormatBrush() {
  if (!state.detailFormatBrush) return;
  const painted = applyDetailFormat(state.detailFormatBrush, ["backgroundColor", "color", "fontSize"]);
  if (painted) stopDetailFormatBrush();
}

const detailLineNumberEmoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function numberedDetailSelectionText(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const endsWithBreak = normalized.endsWith("\n");
  let numberedCount = 0;
  return normalized
    .split("\n")
    .map((line, index, lines) => {
      const isTrailingEmptyLine = endsWithBreak && index === lines.length - 1 && line === "";
      if (isTrailingEmptyLine || numberedCount >= detailLineNumberEmoji.length) return line;
      const prefix = detailLineNumberEmoji[numberedCount];
      numberedCount += 1;
      return `${prefix} ${line}`;
    })
    .join("\n");
}

function normalizedDetailSelectionText(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const endsWithBreak = normalized.endsWith("\n");
  return normalized
    .split("\n")
    .map((line, index, lines) => {
      const isTrailingEmptyLine = endsWithBreak && index === lines.length - 1 && line === "";
      if (isTrailingEmptyLine) return line;
      return line.replace(/^[\s\u00a0\u3000]+/, "");
    })
    .join("\n");
}

function logicalTextFromDetailRange(range) {
  const fragment = range.cloneContents();
  let text = "";

  function appendBreak() {
    if (!text.endsWith("\n")) text += "\n";
  }

  function appendNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    if (tag === "br") {
      appendBreak();
      return;
    }
    if (tag === "pre") {
      if (text && !text.endsWith("\n")) appendBreak();
      text += (node.textContent || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      return;
    }
    if (tag === "div" || tag === "p") {
      if (text && !text.endsWith("\n")) appendBreak();
      [...node.childNodes].forEach(appendNode);
      appendBreak();
      return;
    }
    [...node.childNodes].forEach(appendNode);
  }

  [...fragment.childNodes].forEach(appendNode);
  return text;
}

function applyDetailLineNumbers() {
  const range = getDetailSelectionRange();
  if (!range) return false;
  const numberedText = numberedDetailSelectionText(logicalTextFromDetailRange(range));
  if (!numberedText) return false;
  pushDetailUndo();
  insertPlainTextAtDetailSelection(numberedText);
  syncNodeDetailFromEditor();
  return true;
}

function applyDetailNormalization() {
  const range = getDetailSelectionRange();
  if (!range) return false;
  const normalizedText = normalizedDetailSelectionText(logicalTextFromDetailRange(range));
  if (!normalizedText) return false;
  pushDetailUndo();
  insertPlainTextAtDetailSelection(normalizedText);
  syncNodeDetailFromEditor();
  return true;
}

function applyDetailBlock(blockClass) {
  const range = getDetailSelectionRange();
  if (!range) return false;
  const blockText = logicalTextFromDetailRange(range).replace(/\n$/, "");
  if (!blockText) return false;
  pushDetailUndo();

  const codeBlock = document.createElement("pre");
  codeBlock.className = blockClass;
  const code = document.createElement("code");
  if (blockClass === "detail-code-block") appendGoSyntax(code, blockText);
  else code.textContent = blockText;
  codeBlock.append(code);
  range.deleteContents();
  range.insertNode(codeBlock);
  collapseDetailSelectionAfter(codeBlock);
  syncNodeDetailFromEditor();
  return true;
}

function detailBlockForCaret() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const container = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentElement;
  return container?.closest?.("pre.detail-code-block, pre.detail-point-block, div.detail-title-block") || null;
}

function setCaretOutsideDetailBlock(block, direction) {
  const parent = block?.parentNode;
  if (!parent) return false;
  const range = document.createRange();
  if (direction === "up") range.setStartBefore(block);
  else range.setStartAfter(block);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function isCaretAtDetailBlockBoundary(block, boundary) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const caretRange = selection.getRangeAt(0);
  const textRange = document.createRange();
  textRange.selectNodeContents(block);
  if (boundary === "start") {
    textRange.setEnd(caretRange.startContainer, caretRange.startOffset);
    return textRange.toString().length === 0;
  }
  textRange.setStart(caretRange.startContainer, caretRange.startOffset);
  return textRange.toString().length === 0;
}

function handleDetailBlockArrowNavigation(event) {
  if (!["ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return false;
  const block = detailBlockForCaret();
  if (!block) return false;
  if (event.key === "ArrowLeft" && isCaretAtDetailBlockBoundary(block, "start")) {
    event.preventDefault();
    return setCaretOutsideDetailBlock(block, "up");
  }
  if (event.key === "ArrowLeft") return false;
  const text = block.textContent || "";
  const range = window.getSelection().getRangeAt(0);
  if (block.classList.contains("detail-title-block")) {
    const breaks = [...block.querySelectorAll("br")];
    const hasBreakBefore = breaks.some((lineBreak) => range.comparePoint(lineBreak, 0) > 0);
    const hasBreakAfter = breaks.some((lineBreak) => range.comparePoint(lineBreak, 0) < 0);
    if ((event.key === "ArrowUp" && !hasBreakBefore) || (event.key === "ArrowDown" && !hasBreakAfter)) {
      event.preventDefault();
      return setCaretOutsideDetailBlock(block, event.key === "ArrowUp" ? "up" : "down");
    }
    return false;
  }
  const offsetRange = document.createRange();
  offsetRange.selectNodeContents(block);
  offsetRange.setEnd(range.startContainer, range.startOffset);
  const offset = offsetRange.toString().length;
  const firstLine = !text.slice(0, offset).includes("\n");
  const lastLine = !text.slice(offset).includes("\n");
  if ((event.key === "ArrowUp" && firstLine) || (event.key === "ArrowDown" && lastLine)) {
    event.preventDefault();
    return setCaretOutsideDetailBlock(block, event.key === "ArrowUp" ? "up" : "down");
  }
  return false;
}

function deleteEmptyDetailBlock(event) {
  if (!["Delete", "Backspace"].includes(event.key)) return false;
  const block = detailBlockForCaret();
  if (!block || block.textContent.trim()) return false;
  event.preventDefault();
  pushDetailUndo();
  const range = document.createRange();
  range.setStartBefore(block);
  range.collapse(true);
  block.remove();
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  syncNodeDetailFromEditor();
  return true;
}

function insertLineInsideTitleBlock(event) {
  if (event.key !== "Enter") return false;
  const block = detailBlockForCaret();
  if (!block?.classList.contains("detail-title-block")) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  event.preventDefault();
  pushDetailUndo();
  const range = selection.getRangeAt(0);
  const lineBreak = document.createElement("br");
  range.insertNode(lineBreak);
  const nextRange = document.createRange();
  nextRange.setStartAfter(lineBreak);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  syncNodeDetailFromEditor();
  return true;
}

function deleteBeforeDetailBlock(event) {
  if (event.key !== "Delete") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (range.startContainer !== els.nodeDetail) return false;
  const block = els.nodeDetail.childNodes[range.startOffset];
  if (!block?.matches?.("pre.detail-code-block, pre.detail-point-block, div.detail-title-block")) return false;
  const previous = block.previousSibling;
  if (!previous || previous.nodeType !== Node.ELEMENT_NODE || previous.tagName.toLowerCase() !== "br") return false;
  event.preventDefault();
  pushDetailUndo();
  previous.remove();
  const nextRange = document.createRange();
  nextRange.setStartBefore(block);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  syncNodeDetailFromEditor();
  return true;
}

function insertLineBeforeDetailBlock(event) {
  if (event.key !== "Enter") return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  const parent = range.startContainer;
  if (parent.nodeType !== Node.ELEMENT_NODE || parent !== els.nodeDetail) return false;
  const block = parent.childNodes[range.startOffset];
  if (!block?.matches?.("pre.detail-code-block, pre.detail-point-block, div.detail-title-block")) return false;
  event.preventDefault();
  pushDetailUndo();
  const lineBreak = document.createElement("br");
  parent.insertBefore(lineBreak, block);
  const nextRange = document.createRange();
  nextRange.setStartAfter(lineBreak);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  syncNodeDetailFromEditor();
  return true;
}

function applyDetailCodeBlock() {
  return applyDetailBlock("detail-code-block");
}

function applyDetailPointBlock() {
  return applyDetailBlock("detail-point-block");
}

function applyDetailTitleBlock() {
  const range = getDetailSelectionRange();
  if (!range) return false;
  const titleText = logicalTextFromDetailRange(range).replace(/\n$/, "");
  if (!titleText) return false;
  pushDetailUndo();
  const titleBlock = document.createElement("div");
  titleBlock.className = "detail-title-block";
  const title = document.createElement("strong");
  titleText.split("\n").forEach((line, index) => {
    if (index > 0) title.append(document.createElement("br"));
    title.append(document.createTextNode(line));
  });
  titleBlock.append(title);
  range.deleteContents();
  range.insertNode(titleBlock);
  collapseDetailSelectionAfter(titleBlock);
  syncNodeDetailFromEditor();
  return true;
}

function insertPlainTextAtDetailSelection(text) {
  const selection = window.getSelection();
  const range = getDetailRange() || document.createRange();
  if (!selection.rangeCount || !getDetailRange()) {
    range.selectNodeContents(els.nodeDetail);
    range.collapse(false);
  }
  range.deleteContents();

  const fragment = document.createDocumentFragment();
  const lines = String(text || "").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement("br"));
    fragment.append(document.createTextNode(line));
  });
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  selection.removeAllRanges();
  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.addRange(nextRange);
  }
}

function plainTextFromClipboard(event) {
  const clipboard = event.clipboardData;
  if (!clipboard) return "";
  const plain = clipboard.getData("text/plain");
  if (plain) return plain;
  const html = clipboard.getData("text/html");
  if (!html) return "";
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.innerText || holder.textContent || "";
}

function insertImageAtDetailSelection(src, selectionRange = null, dimensions = {}) {
  const selection = window.getSelection();
  let range = selectionRange || getDetailRange();
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(els.nodeDetail);
    range.collapse(false);
  }
  range.deleteContents();

  const image = document.createElement("img");
  image.src = src;
  image.alt = "";
  const width = normalizeDetailImageDimension(dimensions.width);
  const height = normalizeDetailImageDimension(dimensions.height);
  if (width !== null) image.setAttribute("width", String(width));
  if (height !== null) image.setAttribute("height", String(height));
  range.insertNode(image);
  collapseDetailSelectionAfter(image);
}

function safeImageFromClipboardHtml(event) {
  const html = event.clipboardData?.getData("text/html");
  if (!html) return null;
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const source = [...holder.querySelectorAll("img")]
    .find((image) => isSafeDetailImageSource(image.getAttribute("src")));
  if (!source) return null;
  return {
    src: source.getAttribute("src"),
    width: source.getAttribute("width"),
    height: source.getAttribute("height"),
  };
}

function safeDetailBlockFromClipboardHtml(event) {
  const html = event.clipboardData?.getData("text/html");
  if (!html) return "";
  const holder = document.createElement("div");
  holder.innerHTML = html;
  if (!holder.querySelector("pre")) return "";
  return sanitizeDetailHtml(html);
}

function insertSanitizedDetailHtmlAtSelection(html) {
  const selection = window.getSelection();
  const range = getDetailRange() || document.createRange();
  if (!selection.rangeCount || !getDetailRange()) {
    range.selectNodeContents(els.nodeDetail);
    range.collapse(false);
  }
  range.deleteContents();

  const holder = document.createElement("div");
  holder.innerHTML = sanitizeDetailHtml(html);
  const fragment = document.createDocumentFragment();
  let lastNode = null;
  [...holder.childNodes].forEach((node) => {
    lastNode = fragment.appendChild(node);
  });
  range.insertNode(fragment);

  selection.removeAllRanges();
  if (lastNode) {
    const nextRange = document.createRange();
    nextRange.setStartAfter(lastNode);
    nextRange.collapse(true);
    selection.addRange(nextRange);
  }
}

function pasteIntoDetailEditor(event) {
  const imageItem = [...(event.clipboardData?.items || [])]
    .find((item) => item.kind === "file" && item.type.startsWith("image/"));
  const imageFile = imageItem?.getAsFile();
  if (imageFile) {
    event.preventDefault();
    pushDetailUndo();
    const selectionRange = getDetailRange()?.cloneRange() || null;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source = String(reader.result || "");
      if (!isSafeDetailImageSource(source)) return;
      insertImageAtDetailSelection(source, selectionRange);
      syncNodeDetailFromEditor();
    }, { once: true });
    reader.readAsDataURL(imageFile);
    return;
  }

  const clipboardHtml = event.clipboardData?.getData("text/html") || "";
  const sanitizedClipboardHtml = clipboardHtml ? sanitizeDetailHtml(clipboardHtml) : "";
  if (sanitizedClipboardHtml && (clipboardHtml.includes("<img") || clipboardHtml.includes("<pre") || clipboardHtml.includes("detail-title-block"))) {
    event.preventDefault();
    pushDetailUndo();
    insertSanitizedDetailHtmlAtSelection(sanitizedClipboardHtml);
    syncNodeDetailFromEditor();
    return;
  }

  const plainClipboardText = event.clipboardData?.getData("text/plain") || "";
  const internalBlockClipboard = !event.clipboardData?.getData("text/html")
    && (plainClipboardText === state.detailCodePlainClipboard
      ? state.detailCodeClipboard
      : plainClipboardText === state.detailPointPlainClipboard
        ? state.detailPointClipboard
        : plainClipboardText === state.detailTitlePlainClipboard
          ? state.detailTitleClipboard
          : null);
  if (internalBlockClipboard) {
    event.preventDefault();
    pushDetailUndo();
    insertSanitizedDetailHtmlAtSelection(internalBlockClipboard);
    syncNodeDetailFromEditor();
    return;
  }

  const clipboardTypes = [...(event.clipboardData?.types || [])];
  if (
    state.detailImageClipboard
    && !plainClipboardText
    && (clipboardTypes.length === 0 || clipboardTypes.includes("text/html"))
  ) {
    event.preventDefault();
    pushDetailUndo();
    insertSanitizedDetailHtmlAtSelection(state.detailImageClipboard);
    syncNodeDetailFromEditor();
    return;
  }

  const text = plainTextFromClipboard(event);
  if (!text) return;
  event.preventDefault();
  pushDetailUndo();
  insertPlainTextAtDetailSelection(text);
  syncNodeDetailFromEditor();
}

function mapBounds() {
  if (nodes.length === 0) return null;
  return nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + node.w),
      maxY: Math.max(acc.maxY, node.y + node.h),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function scaleRequiredForWholeMap() {
  const bounds = mapBounds();
  if (!bounds) return ZOOM_DEFAULT_MIN_SCALE;
  const rect = els.shell.getBoundingClientRect();
  const mapW = Math.max(1, bounds.maxX - bounds.minX);
  const mapH = Math.max(1, bounds.maxY - bounds.minY);
  const availableW = Math.max(1, rect.width - FIT_VIEW_PADDING);
  const availableH = Math.max(1, rect.height - FIT_VIEW_PADDING);
  return Math.min(availableW / mapW, availableH / mapH);
}

function minZoomScale() {
  return Math.max(
    ZOOM_ABSOLUTE_MIN_SCALE,
    Math.min(ZOOM_DEFAULT_MIN_SCALE, scaleRequiredForWholeMap()),
  );
}

function positionDetailImageResizeHandle() {
  const image = state.detailImage;
  const handle = els.detailImageResizeHandle;
  const container = handle?.parentElement;
  if (!image || !handle || !container || !image.isConnected) {
    handle?.classList.remove("visible");
    return;
  }
  const imageRect = image.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  handle.style.left = `${imageRect.right - containerRect.left - 6}px`;
  handle.style.top = `${imageRect.bottom - containerRect.top - 6}px`;
}

function clearDetailImageSelection() {
  if (state.detailImage) state.detailImage.classList.remove("detail-image-selected");
  state.detailImage = null;
  state.detailImageResize = null;
  els.detailImageResizeHandle.classList.remove("visible");
}

function selectDetailImage(image) {
  if (state.detailImage && state.detailImage !== image) {
    state.detailImage.classList.remove("detail-image-selected");
  }
  state.detailImage = image;
  image.classList.add("detail-image-selected");
  els.detailImageResizeHandle.classList.add("visible");
  const range = document.createRange();
  range.selectNode(image);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  positionDetailImageResizeHandle();
}

function copySelectedDetailImage(event = null) {
  const image = state.detailImage;
  if (!image || !image.isConnected) return false;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const parent = image.parentNode;
  const selectsOnlyImage = range.collapsed
    ? image.contains(range.startContainer)
    : (range.startContainer === parent
      && range.endContainer === parent
      && range.endOffset === range.startOffset + 1
      && parent.childNodes[range.startOffset] === image);
  if (!selectsOnlyImage) return false;
  const html = sanitizeDetailHtml(image.outerHTML);
  if (!html) return false;
  state.detailImageClipboard = html;
  if (event?.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", "");
    return true;
  }

  const previousRanges = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    previousRanges.push(selection.getRangeAt(index).cloneRange());
  }
  const copyRange = document.createRange();
  copyRange.selectNode(image);
  selection.removeAllRanges();
  selection.addRange(copyRange);
  try {
    document.execCommand("copy");
  } catch (error) {
    // The internal clipboard remains available when browser clipboard access is blocked.
  }
  selection.removeAllRanges();
  previousRanges.forEach((previousRange) => selection.addRange(previousRange));
  return true;
}

function detailBlockFromSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!els.nodeDetail.contains(range.commonAncestorContainer)) return null;
  const block = [...els.nodeDetail.querySelectorAll("pre.detail-code-block, pre.detail-point-block, div.detail-title-block")]
    .find((block) => {
      try {
        return range.intersectsNode(block);
      } catch (error) {
        return false;
      }
    });
  if (!block) return null;
  if (range.collapsed) return block.contains(range.startContainer) ? block : null;
  if (block.contains(range.startContainer) && block.contains(range.endContainer)) {
    // A selection inside a block may be just one sentence. Only intercept it
    // when the selected text covers the block's complete content.
    const selectedText = range.toString();
    const blockText = block.textContent || "";
    if (selectedText === blockText) return block;
    return null;
  }
  const parent = block.parentNode;
  if (
    range.startContainer === parent
    && range.endContainer === parent
    && range.endOffset === range.startOffset + 1
    && parent.childNodes[range.startOffset] === block
  ) return block;
  return null;
}

function copySelectedDetailBlock(event = null) {
  const block = detailBlockFromSelection();
  if (!block) return false;
  const html = sanitizeDetailHtml(block.outerHTML);
  if (!html) return false;
  const plain = block.textContent || "";
  if (block.classList.contains("detail-point-block")) {
    state.detailPointClipboard = html;
    state.detailPointPlainClipboard = plain;
  } else if (block.classList.contains("detail-title-block")) {
    state.detailTitleClipboard = html;
    state.detailTitlePlainClipboard = plain;
  } else {
    state.detailCodeClipboard = html;
    state.detailCodePlainClipboard = plain;
  }
  if (event?.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", plain);
    return true;
  }

  const selection = window.getSelection();
  const previousRanges = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    previousRanges.push(selection.getRangeAt(index).cloneRange());
  }
  const range = document.createRange();
  range.selectNode(block);
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    document.execCommand("copy");
  } catch (error) {
    // The internal clipboard remains available when browser clipboard access is blocked.
  }
  selection.removeAllRanges();
  previousRanges.forEach((previousRange) => selection.addRange(previousRange));
  return true;
}

function beginDetailImageResize(event) {
  const image = state.detailImage;
  if (!image) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = image.getBoundingClientRect();
  const ratio = image.naturalWidth > 0 && image.naturalHeight > 0
    ? image.naturalWidth / image.naturalHeight
    : rect.width / Math.max(1, rect.height);
  pushDetailUndo();
  state.detailImageResize = {
    image,
    startX: event.clientX,
    startWidth: rect.width,
    startRatio: ratio || 1,
  };
  els.detailImageResizeHandle.setPointerCapture?.(event.pointerId);
}

function updateDetailImageResize(event) {
  const resize = state.detailImageResize;
  if (!resize) return;
  const editorRect = els.nodeDetail.getBoundingClientRect();
  const maxWidth = Math.min(1600, Math.max(48, editorRect.width - 28));
  const width = Math.max(48, Math.min(maxWidth, resize.startWidth + event.clientX - resize.startX));
  const height = Math.max(48, Math.round(width / resize.startRatio));
  resize.image.setAttribute("width", String(Math.round(width)));
  resize.image.setAttribute("height", String(height));
  syncNodeDetailFromEditor();
  positionDetailImageResizeHandle();
}

function endDetailImageResize() {
  if (!state.detailImageResize) return;
  state.detailImageResize = null;
}

function tidySelected() {
  if (state.selected.size < 2) return;
  saveHistory();
  MindMapLogic.tidyTree(nodes, [...state.selected], { levelGap: 145, siblingGap: 34, forestGap: 70 });
  render();
}

function fitView() {
  const bounds = mapBounds();
  if (!bounds) return;
  const rect = els.shell.getBoundingClientRect();
  const mapW = bounds.maxX - bounds.minX;
  const mapH = bounds.maxY - bounds.minY;
  state.scale = Math.max(ZOOM_ABSOLUTE_MIN_SCALE, Math.min(1.25, scaleRequiredForWholeMap()));
  state.tx = (rect.width - mapW * state.scale) / 2 - bounds.minX * state.scale;
  state.ty = (rect.height - mapH * state.scale) / 2 - bounds.minY * state.scale;
  render();
}

function createIndependentNode(point) {
  saveHistory();
  const id = makeId();
  const node = {
    id,
    parentId: null,
    x: point.x,
    y: point.y,
    w: 154,
    h: 60,
    text: "新节点",
    detail: "",
    color: "default",
    fontSize: 16,
    children: [],
  };
  nodes.push(node);
  resizeNode(node);
  selectOnly(id);
}

function selectAllNodes() {
  state.selected = new Set(nodes.map((node) => node.id));
  state.activeId = nodes[0]?.id || "";
  state.connectingFromIds = [];
  syncInspector();
  render();
}

function createSummaryNodeFromSelection() {
  const selectedIds = [...state.selected];
  if (!MindMapLogic.canCreateSummaryNode(nodes, selectedIds)) return;
  saveHistory();
  const selected = selectedNodes().sort((a, b) => a.y - b.y);
  const maxRight = Math.max(...selected.map((node) => node.x + node.w));
  const minTop = Math.min(...selected.map((node) => node.y));
  const maxBottom = Math.max(...selected.map((node) => node.y + node.h));
  const id = makeId();
  const node = {
    id,
    parentId: selected[0].id,
    x: maxRight + 180,
    y: (minTop + maxBottom) / 2 - 27,
    w: 154,
    h: 54,
    text: "概要",
    detail: "",
    color: "default",
    fontSize: 16,
    children: [],
  };
  nodes.push(node);
  selected.forEach((source) => {
    if (!source.children.includes(id)) source.children.push(id);
  });
  resizeNode(node);
  selectOnly(id);
}

function beginConnection() {
  let sourceIds = state.selected.size > 0 ? [...state.selected] : [state.activeId].filter(Boolean);
  if (sourceIds.length === 0) return;
  if (sourceIds.length > 1 && !MindMapLogic.canCreateSummaryNode(nodes, sourceIds)) {
    sourceIds = [state.activeId].filter(Boolean);
  }
  if (sourceIds.length === 0) return;
  state.connectingFromIds = sourceIds;
  render();
}

function connectToNode(targetId) {
  if (state.connectingFromIds.length === 0 || state.connectingFromIds.includes(targetId)) {
    state.connectingFromIds = [];
    render();
    return false;
  }
  saveHistory();
  const connected = MindMapLogic.connectManyNodes(nodes, state.connectingFromIds, targetId);
  state.connectingFromIds = [];
  if (!connected) {
    state.history.pop();
    render();
    return false;
  }
  state.selected = new Set([targetId]);
  state.activeId = targetId;
  syncInspector();
  render();
  return true;
}

function deleteSelection() {
  if (state.selected.size === 0) return;
  saveHistory();
  const deleteIds = new Set();
  [...state.selected].forEach((id) => {
    MindMapLogic.collectSubtreeIds(nodes, id).forEach((subId) => deleteIds.add(subId));
  });
  nodes.forEach((node) => {
    node.children = node.children.filter((childId) => !deleteIds.has(childId));
  });
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (deleteIds.has(nodes[i].id)) nodes.splice(i, 1);
  }
  state.selected.clear();
  state.activeId = nodes[0]?.id || "";
  if (state.activeId) state.selected.add(state.activeId);
  render();
}

function copySelection() {
  if (state.selected.size === 0) return;
  const selected = new Set(state.selected);
  const rootIds = nodes
    .filter((node) => selected.has(node.id) && (!node.parentId || !selected.has(node.parentId)))
    .map((node) => node.id);
  const allIds = new Set();
  rootIds.forEach((id) => MindMapLogic.collectSubtreeIds(nodes, id).forEach((subId) => allIds.add(subId)));
  const copiedNodes = nodes.filter((node) => allIds.has(node.id)).map((node) => JSON.parse(JSON.stringify(node)));
  const copiedSet = new Set(copiedNodes.map((node) => node.id));
  copiedNodes.forEach((node) => {
    if (!copiedSet.has(node.parentId)) node.parentId = null;
    node.children = node.children.filter((childId) => copiedSet.has(childId));
  });
  state.clipboard = { nodes: copiedNodes, rootIds };
}

function cutSelection() {
  if (state.selected.size === 0) return;
  copySelection();
  deleteSelection();
}

function pasteClipboard() {
  if (!state.clipboard || state.clipboard.nodes.length === 0) return;
  saveHistory();
  const sourceNodes = state.clipboard.nodes.map((node) => JSON.parse(JSON.stringify(node)));
  const minX = Math.min(...sourceNodes.map((node) => node.x));
  const minY = Math.min(...sourceNodes.map((node) => node.y));
  const result = MindMapLogic.cloneSelectedSubtrees(
    sourceNodes,
    state.clipboard.rootIds,
    () => makeId(),
    { dx: state.lastMouseWorld.x - minX, dy: state.lastMouseWorld.y - minY },
  );
  nodes.push(...result.clones);
  state.selected = new Set(result.roots);
  state.activeId = result.roots[0] || "";
  render();
}

function edgePath(from, to) {
  const p1 = { x: from.x + from.w, y: from.y + from.h / 2 };
  const p2 = { x: to.x, y: to.y + to.h / 2 };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normal = { x: -dy / distance, y: dx / distance };
  const bend = Math.max(-34, Math.min(34, dy * 0.12));
  const c1 = {
    x: p1.x + dx * 0.36 + normal.x * bend,
    y: p1.y + dy * 0.18 + normal.y * bend,
  };
  const c2 = {
    x: p2.x - dx * 0.36 + normal.x * bend,
    y: p2.y - dy * 0.18 + normal.y * bend,
  };
  return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, p1, p2 };
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function updateViewport() {
  els.edgeLayer.setAttribute("transform", `translate(${state.tx} ${state.ty}) scale(${state.scale})`);
  els.nodeLayer.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  scheduleVisibilityUpdate();
}

function centerNodeInViewport(id) {
  const node = byId(id);
  if (!node) return;
  const rect = els.shell.getBoundingClientRect();
  state.tx = rect.width / 2 - (node.x + node.w / 2) * state.scale;
  state.ty = rect.height / 2 - (node.y + node.h / 2) * state.scale;
  updateViewport();
  markDirty();
}

function createEdgeElements() {
  const elements = {
    path: svgEl("path"),
    arrow: svgEl("path", { d: "M-7,-5 L6,0 L-7,5 Z" }),
    startDot: svgEl("circle"),
    endDot: svgEl("circle"),
  };
  els.edgeLayer.append(elements.path, elements.arrow, elements.startDot, elements.endDot);
  return elements;
}

function updateEdgeElements(from, to, elements) {
  const active = state.selected.has(from.id) || state.selected.has(to.id);
  const geometry = edgePath(from, to);
  elements.path.setAttribute("class", `edge${active ? " active" : ""}`);
  elements.path.setAttribute("d", geometry.d);
  const totalLength = elements.path.getTotalLength();
  const marker = elements.path.getPointAtLength(totalLength / 2);
  const before = elements.path.getPointAtLength(Math.max(0, totalLength / 2 - 8));
  const angle = Math.atan2(marker.y - before.y, marker.x - before.x) * 180 / Math.PI;
  elements.arrow.setAttribute("class", `mid-arrow${active ? " active" : ""}`);
  elements.arrow.setAttribute("transform", `translate(${marker.x} ${marker.y}) rotate(${angle})`);
  elements.startDot.setAttribute("class", "edge-dot");
  elements.startDot.setAttribute("cx", geometry.p1.x);
  elements.startDot.setAttribute("cy", geometry.p1.y);
  elements.startDot.setAttribute("r", active ? 4.5 : 3.4);
  elements.endDot.setAttribute("class", "edge-dot");
  elements.endDot.setAttribute("cx", geometry.p2.x);
  elements.endDot.setAttribute("cy", geometry.p2.y);
  elements.endDot.setAttribute("r", active ? 4.5 : 3.4);
}

function renderEdges() {
  updateViewport();
  const seen = new Set();
  nodes.forEach((from) => {
    from.children.forEach((childId) => {
      const to = byId(childId);
      if (!to) return;
      const key = `${from.id}->${to.id}`;
      seen.add(key);
      const elements = renderCache.edges.get(key) || createEdgeElements();
      renderCache.edges.set(key, elements);
      updateEdgeElements(from, to, elements);
    });
  });
  renderCache.edges.forEach((elements, key) => {
    if (seen.has(key)) return;
    elements.path.remove();
    elements.arrow.remove();
    elements.startDot.remove();
    elements.endDot.remove();
    renderCache.edges.delete(key);
  });
  updateVisibility();
}

function updateConnectedEdges(nodeIds) {
  const affected = new Set(nodeIds);
  nodes.forEach((from) => {
    from.children.forEach((childId) => {
      if (!affected.has(from.id) && !affected.has(childId)) return;
      const to = byId(childId);
      const elements = renderCache.edges.get(`${from.id}->${childId}`);
      if (to && elements) updateEdgeElements(from, to, elements);
    });
  });
  updateVisibility();
}

function updateNodeElement(node) {
  const item = renderCache.nodes.get(node.id);
  if (!item) return;
  item.className = `node${state.selected.has(node.id) ? " selected" : ""}${state.connectingFromIds.includes(node.id) ? " connecting" : ""}`;
  item.dataset.color = node.color === "default" ? "" : node.color;
  item.style.left = `${node.x}px`;
  item.style.top = `${node.y}px`;
  item.style.width = `${node.w}px`;
  item.style.height = `${node.h}px`;
  // Rich text can be megabytes long; never push the whole thing into a tooltip
  // attribute on every render.
  const hint = node.detail || node.text || "";
  const tooltip = hint.length > NODE_TOOLTIP_LIMIT ? `${hint.slice(0, NODE_TOOLTIP_LIMIT)}…` : hint;
  if (item.title !== tooltip) item.title = tooltip;
  const title = item.querySelector(".node-title");
  if (title) {
    if (state.editingId !== node.id && title.textContent !== node.text) title.textContent = node.text;
    title.style.fontSize = `${node.fontSize}px`;
    title.style.color = (palette[node.color] || palette.default).text;
  }
}

function renderNodes() {
  els.nodeLayer.replaceChildren();
  renderCache.nodes.clear();
  updateViewport();
  nodes.forEach((node) => {
    const item = document.createElement("article");
    item.dataset.id = node.id;
    item.innerHTML = `
      <div class="node-card">
        <div class="node-title" contenteditable="false" spellcheck="false"></div>
      </div>
      <div class="resize-handle resize-top" data-side="top"></div>
      <div class="resize-handle resize-right" data-side="right"></div>
      <div class="resize-handle resize-bottom" data-side="bottom"></div>
      <div class="resize-handle resize-left" data-side="left"></div>
    `;
    const title = item.querySelector(".node-title");
    item.addEventListener("pointerdown", (event) => onNodePointerDown(event, node.id));
    item.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      beginTitleEdit(title, node.id);
    });
    title.addEventListener("input", () => {
      const current = byId(node.id);
      if (!current) return;
      current.text = title.textContent.trim() || "未命名节点";
      resizeNode(current);
      syncInspector();
      updateNodeElement(current);
      updateConnectedEdges([current.id]);
      markDirty();
    });
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        endTitleEdit(title, node.id);
      }
      if (event.key === "Escape") {
        event.stopPropagation();
        endTitleEdit(title, node.id);
      }
    });
    title.addEventListener("blur", () => endTitleEdit(title, node.id));
    renderCache.nodes.set(node.id, item);
    updateNodeElement(node);
    els.nodeLayer.append(item);
  });
  updateVisibility();
}

function computeVisibleNodeIds() {
  const rect = els.shell.getBoundingClientRect();
  const margin = 360;
  const view = {
    left: (-state.tx - margin) / state.scale,
    right: (rect.width - state.tx + margin) / state.scale,
    top: (-state.ty - margin) / state.scale,
    bottom: (rect.height - state.ty + margin) / state.scale,
  };
  return new Set(nodes
    .filter((node) => {
      const selected = state.selected.has(node.id) || state.connectingFromIds.includes(node.id);
      const visible = node.x <= view.right
        && node.x + node.w >= view.left
        && node.y <= view.bottom
        && node.y + node.h >= view.top;
      return selected || visible;
    })
    .map((node) => node.id));
}

function updateVisibility() {
  const visibleNodeIds = computeVisibleNodeIds();
  renderCache.visibleNodeIds = visibleNodeIds;
  renderCache.nodes.forEach((item, id) => {
    item.style.display = visibleNodeIds.has(id) ? "" : "none";
  });
  renderCache.edges.forEach((elements, key) => {
    const [fromId, toId] = key.split("->");
    const visible = visibleNodeIds.has(fromId)
      || visibleNodeIds.has(toId)
      || state.selected.has(fromId)
      || state.selected.has(toId);
    const display = visible ? "" : "none";
    elements.path.style.display = display;
    elements.arrow.style.display = display;
    elements.startDot.style.display = display;
    elements.endDot.style.display = display;
  });
}

function scheduleVisibilityUpdate() {
  if (renderCache.visibilityFrame) return;
  renderCache.visibilityFrame = requestAnimationFrame(() => {
    renderCache.visibilityFrame = 0;
    updateVisibility();
  });
}

function beginTitleEdit(title, id) {
  saveHistory();
  state.editingId = id;
  state.activeId = id;
  state.selected = new Set([id]);
  syncInspector();
  renderEdges();
  markSelectedNodes();
  title.contentEditable = "true";
  title.focus();
  const range = document.createRange();
  range.selectNodeContents(title);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function endTitleEdit(title, id) {
  if (state.editingId !== id) return;
  title.contentEditable = "false";
  window.getSelection()?.removeAllRanges();
  state.editingId = null;
}

function markSelectedNodes() {
  document.querySelectorAll(".node").forEach((el) => {
    el.classList.toggle("selected", state.selected.has(el.dataset.id));
  });
  scheduleVisibilityUpdate();
}

function updateNodeDom(id) {
  const node = byId(id);
  if (!node) return;
  updateNodeElement(node);
}

function render() {
  renderEdges();
  renderNodes();
  syncInspector();
}

function onNodePointerDown(event, id) {
  if (state.editingId) {
    return;
  }

  flushActiveDetailEditor();

  event.preventDefault();
  if (state.connectingFromIds.length > 0) {
    event.stopPropagation();
    connectToNode(id);
    return;
  }
  const world = screenToWorld(event.clientX, event.clientY);
  const handle = event.target.closest(".resize-handle");
  if (handle) {
    saveHistory();
    state.activeId = id;
    state.selected = new Set([id]);
    syncInspector();
    renderEdges();
    markSelectedNodes();
    state.pointer = {
      type: "resize",
      side: handle.dataset.side,
      startX: event.clientX,
      startY: event.clientY,
      lastWorld: world,
      nodeId: id,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    return;
  }
  if (event.ctrlKey || event.metaKey) {
    if (state.selected.has(id)) {
      state.selected.delete(id);
      if (state.activeId === id) state.activeId = [...state.selected][0] || "";
    } else {
      state.selected.add(id);
      state.activeId = id;
    }
    syncInspector();
    renderEdges();
    markSelectedNodes();
    return;
  }
  if (!state.selected.has(id)) {
    state.selected = new Set([id]);
  }
  state.activeId = id;
  syncInspector();
  renderEdges();
  markSelectedNodes();
  state.pointer = {
    type: "node",
    startX: event.clientX,
    startY: event.clientY,
    lastWorld: world,
    moved: false,
    historySaved: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onShellPointerDown(event) {
  if (event.button !== 0 || event.target.closest(".node")) return;
  state.connectingFromIds = [];
  const world = screenToWorld(event.clientX, event.clientY);
  const additive = event.ctrlKey || event.metaKey;
  state.pointer = {
    type: state.mode === "select" || event.ctrlKey || event.metaKey ? "box" : "pan",
    startX: event.clientX,
    startY: event.clientY,
    lastWorld: world,
    moved: false,
    additive,
  };
  if (state.pointer.type === "pan") {
    els.shell.classList.add("panning");
  } else {
    if (!additive) clearSelection();
    showSelectionBox(event.clientX, event.clientY, event.clientX, event.clientY);
    render();
  }
}

function onInspectorResizeStart(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  if (state.inspectorExpanded) {
    state.inspectorExpanded = false;
    if (isBottomInspector()) state.inspectorRestoreHeight = null;
    else state.inspectorRestoreWidth = null;
    syncInspectorToggle();
  }
  state.pointer = {
    type: "inspector-resize",
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  document.body.classList.add("inspector-resizing");
  event.currentTarget.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
  state.lastMouseWorld = screenToWorld(event.clientX, event.clientY);
  if (!state.pointer) return;
  const pointer = state.pointer;
  const moved = Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 3;
  pointer.moved = pointer.moved || moved;

  if (pointer.type === "pan") {
    state.tx += event.movementX;
    state.ty += event.movementY;
    updateViewport();
    markDirty();
    return;
  }

  if (pointer.type === "inspector-resize") {
    if (isBottomInspector()) {
      setInspectorHeight(window.innerHeight - event.clientY);
    } else {
      setInspectorWidth(window.innerWidth - event.clientX);
    }
    markDirty();
    return;
  }

  if (pointer.type === "node") {
    const world = screenToWorld(event.clientX, event.clientY);
    const dx = world.x - pointer.lastWorld.x;
    const dy = world.y - pointer.lastWorld.y;
    if (!pointer.historySaved) {
      saveHistory();
      pointer.historySaved = true;
    }
    selectedNodes().forEach((node) => {
      node.x += dx;
      node.y += dy;
      updateNodeElement(node);
    });
    pointer.lastWorld = world;
    updateConnectedEdges([...state.selected]);
    markDirty();
    return;
  }

  if (pointer.type === "resize") {
    const node = byId(pointer.nodeId);
    if (!node) return;
    const world = screenToWorld(event.clientX, event.clientY);
    const dx = world.x - pointer.lastWorld.x;
    const dy = world.y - pointer.lastWorld.y;
    if (pointer.side === "right") {
      node.w = Math.max(90, node.w + dx);
    } else if (pointer.side === "left") {
      const nextW = Math.max(90, node.w - dx);
      node.x += node.w - nextW;
      node.w = nextW;
    } else if (pointer.side === "bottom") {
      node.h = Math.max(42, node.h + dy);
    } else if (pointer.side === "top") {
      const nextH = Math.max(42, node.h - dy);
      node.y += node.h - nextH;
      node.h = nextH;
    }
    pointer.lastWorld = world;
    updateNodeElement(node);
    updateConnectedEdges([node.id]);
    markDirty();
    return;
  }

  if (pointer.type === "box") {
    showSelectionBox(pointer.startX, pointer.startY, event.clientX, event.clientY);
  }
}

function onPointerUp(event) {
  if (!state.pointer) return;
  const pointer = state.pointer;
  if (pointer.type === "inspector-resize") {
    document.body.classList.remove("inspector-resizing");
  }
  if (pointer.type === "box") {
    hideSelectionBox();
    if (pointer.moved) {
      const a = screenToWorld(pointer.startX, pointer.startY);
      const b = screenToWorld(event.clientX, event.clientY);
      selectNodesInRect(a, b, pointer.additive);
    } else {
      clearSelection();
      render();
    }
  }
  if (pointer.type === "pan") {
    els.shell.classList.remove("panning");
    if (!pointer.moved) {
      clearSelection();
      render();
    }
  }
  state.pointer = null;
}

function clearSelection() {
  state.selected.clear();
  state.activeId = "";
  state.connectingFromIds = [];
  syncInspector();
  markDirty();
}

function showSelectionBox(x1, y1, x2, y2) {
  const start = clientToLocal(x1, y1);
  const end = clientToLocal(x2, y2);
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  els.selectionBox.classList.add("visible");
  els.selectionBox.style.left = `${left}px`;
  els.selectionBox.style.top = `${top}px`;
  els.selectionBox.style.width = `${width}px`;
  els.selectionBox.style.height = `${height}px`;
}

function hideSelectionBox() {
  els.selectionBox.classList.remove("visible");
}

function selectNodesInRect(a, b, additive = false) {
  const selectedIds = MindMapLogic.selectNodesInWorldRect(nodes, a, b);
  state.selected = additive
    ? new Set([...state.selected, ...selectedIds])
    : new Set(selectedIds);
  state.activeId = selectedIds[0] || [...state.selected][0] || "";
  if (!state.activeId) state.activeId = "node-1";
  if (!state.selected.has(state.activeId)) state.activeId = [...state.selected][0] || "";
  syncInspector();
  render();
  markDirty();
}

function onWheel(event) {
  if (state.mode !== "pan") return;
  event.preventDefault();
  const local = clientToLocal(event.clientX, event.clientY);
  const before = screenToWorld(event.clientX, event.clientY);
  const factor = event.deltaY < 0 ? 1.1872 : 0.8128;
  state.scale = Math.max(minZoomScale(), Math.min(ZOOM_MAX_SCALE, state.scale * factor));
  state.tx = local.x - before.x * state.scale;
  state.ty = local.y - before.y * state.scale;
  updateViewport();
  markDirty();
}

function isEditingText(target) {
  return target.closest("[contenteditable='true'], textarea, input");
}

function isDetailEditorActive() {
  if (document.activeElement === els.nodeDetail || els.nodeDetail.contains(document.activeElement)) return true;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const ancestor = range.commonAncestorContainer;
  const container = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentElement;
  return Boolean(container && els.nodeDetail.contains(container));
}

function beginActiveTitleEdit() {
  const id = state.activeId || [...state.selected][0];
  if (!id) return false;
  const title = renderCache.nodes.get(id)?.querySelector(".node-title");
  if (!title) return false;
  beginTitleEdit(title, id);
  return true;
}

function onKeyDown(event) {
  if (event.target instanceof Element && event.target.closest("dialog")) return;
  if (isDetailEditorActive() && handleDetailBlockArrowNavigation(event)) return;
  if (isDetailEditorActive() && deleteEmptyDetailBlock(event)) return;
  if (isDetailEditorActive() && insertLineInsideTitleBlock(event)) return;
  if (isDetailEditorActive() && deleteBeforeDetailBlock(event)) return;
  if (isDetailEditorActive() && insertLineBeforeDetailBlock(event)) return;
  if (event.key === "Control" || event.metaKey) {
    setMode("select");
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && isDetailEditorActive()) {
    event.preventDefault();
    event.stopPropagation();
    undoDetailEditor();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && state.detailImage && isDetailEditorActive()) {
    if (copySelectedDetailImage()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && isDetailEditorActive()) {
    if (copySelectedDetailBlock()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
  if (event.key === "Escape" && state.detailFormatBrush) {
    event.preventDefault();
    stopDetailFormatBrush();
    return;
  }
  if (isEditingText(event.target)) return;
  if (event.ctrlKey && event.altKey && (event.key === "Alt" || event.key === "Control")) {
    event.preventDefault();
    if (!event.repeat && !state.modifierCreateActive) {
      state.modifierCreateActive = true;
      createIndependentNode(state.lastMouseWorld);
    }
    return;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
    event.preventDefault();
    cutSelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
    event.preventDefault();
    pasteClipboard();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveNow({ requireFile: Boolean(state.fileHandle) });
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
    event.preventDefault();
    selectAllNodes();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
    event.preventDefault();
    createSummaryNodeFromSelection();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === "Control" || event.key === "Shift")) {
    event.preventDefault();
    beginConnection();
    return;
  }
  if (event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (beginActiveTitleEdit()) {
      event.preventDefault();
      return;
    }
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "q") {
    event.preventDefault();
    tidySelected();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    addChild();
  }
  if (event.key === "Enter") {
    event.preventDefault();
    addSibling();
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    const direction = event.key.replace("Arrow", "").toLowerCase();
    const target = MindMapLogic.navigateNode(nodes, state.activeId, direction);
    if (target) {
      selectOnly(target);
      centerNodeInViewport(target);
    }
  }
}

els.fontSize.addEventListener("input", () => applyFontSize(Number(els.fontSize.value)));
els.nodeDetail.addEventListener("beforeinput", (event) => {
  if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
    event.preventDefault();
    undoDetailEditor();
    return;
  }
  pushDetailUndo();
});
els.nodeDetail.addEventListener("input", () => {
  syncNodeDetailFromEditor();
});
els.nodeDetail.addEventListener("paste", pasteIntoDetailEditor);
els.nodeDetail.addEventListener("mouseup", paintDetailFormatBrush);
els.nodeDetail.addEventListener("click", (event) => {
  if (event.target instanceof HTMLImageElement) {
    selectDetailImage(event.target);
    return;
  }
  clearDetailImageSelection();
});
els.nodeDetail.addEventListener("scroll", positionDetailImageResizeHandle);
els.detailImageResizeHandle.addEventListener("pointerdown", beginDetailImageResize);
window.addEventListener("pointermove", updateDetailImageResize);
window.addEventListener("pointerup", endDetailImageResize);
els.detailLineGap.addEventListener("change", () => {
  const node = byId(state.activeId);
  if (!node) return;
  pushDetailUndo();
  node.detailLineGap = normalizeDetailLineGap(els.detailLineGap.value);
  els.nodeDetail.style.lineHeight = detailLineHeight(node.detailLineGap);
  markDirty();
});
els.detailFontSize.addEventListener("input", () => {
  applyDetailFontSize(Number(els.detailFontSize.value));
});
els.openFile.addEventListener("click", openProjectFile);
els.newFile?.addEventListener("click", () => openNewProjectDialog());
els.cancelNewFile?.addEventListener("click", () => els.newFileDialog.close());
els.cancelOpenFile?.addEventListener("click", () => els.openFileDialog.close());
els.closeOpenFile?.addEventListener("click", () => els.openFileDialog?.close());
els.openFileDir?.addEventListener("click", chooseDataDirectoryFromDialog);
els.openFileSearch?.addEventListener("input", () => {
  // Rebuilding the grid on every keystroke is wasted work; wait for a short pause
  // and then only redraw when the query actually changed.
  window.clearTimeout(openFileView.searchTimer);
  openFileView.searchTimer = window.setTimeout(() => {
    const query = els.openFileSearch.value;
    if (query === openFileView.query) return;
    openFileView.query = query;
    setOpenFileGroups();
    renderOpenFileList();
  }, 90);
});
els.openFileDialog?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveOpenFileActive(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveOpenFileActive(-1);
    return;
  }
  if (event.key === "Enter") {
    const target = event.target;
    if (target instanceof Element && target.closest("button") && !target.closest(".file-card")) return;
    const entry = openFileView.flat[openFileView.activeIndex];
    if (!entry) return;
    event.preventDefault();
    openDataFile(entry);
  }
});
els.openFileDialog?.addEventListener("close", () => {
  els.openFileList?.replaceChildren();
  openFileView.loading = false;
  openFileView.query = "";
  openFileView.groups = [];
  openFileView.flat = [];
});
els.newFileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createNewProjectFile();
});
els.saveAsFile.addEventListener("click", saveAsProjectFile);
els.exportMarkdown.addEventListener("click", exportMarkdownFile);
els.pushRepository?.addEventListener("click", pushRepository);
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;
  try {
    await loadProjectFromFile(file);
  } catch (error) {
    setSaveStatus("打开失败", "error");
  }
});
document.querySelectorAll(".swatches button").forEach((button) => {
  button.addEventListener("click", () => applyColor(button.dataset.color));
});
document.querySelectorAll("[data-detail-highlight]").forEach((button) => {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => applyDetailStyle("highlight", button.dataset.detailHighlight));
});
document.querySelectorAll("[data-detail-color]").forEach((button) => {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => applyDetailStyle("color", button.dataset.detailColor));
});
els.detailFormatBrush.addEventListener("mousedown", (event) => event.preventDefault());
els.detailFormatBrush.addEventListener("click", startDetailFormatBrush);
els.detailLineNumbers.addEventListener("mousedown", (event) => event.preventDefault());
els.detailLineNumbers.addEventListener("click", applyDetailLineNumbers);
document.querySelector("#detailNormalize")?.addEventListener("mousedown", (event) => event.preventDefault());
document.querySelector("#detailNormalize")?.addEventListener("click", applyDetailNormalization);
els.detailCode?.addEventListener("mousedown", (event) => event.preventDefault());
els.detailCode?.addEventListener("click", applyDetailCodeBlock);
els.detailPoint?.addEventListener("mousedown", (event) => event.preventDefault());
els.detailPoint?.addEventListener("click", applyDetailPointBlock);
els.detailTitle?.addEventListener("mousedown", (event) => event.preventDefault());
els.detailTitle?.addEventListener("click", applyDetailTitleBlock);

els.canvasSwitcher?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});
els.canvasSwitcher?.querySelectorAll("[data-canvas-id]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    switchCanvas(button.dataset.canvasId);
  });
});
els.inspectorToggle?.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
});
els.inspectorToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleInspectorExpanded();
});
els.shell.addEventListener("pointerdown", onShellPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("mousemove", (event) => {
  state.lastMouseWorld = screenToWorld(event.clientX, event.clientY);
});
els.inspectorResizer.addEventListener("pointerdown", onInspectorResizeStart);
els.shell.addEventListener("wheel", onWheel, { passive: false });
document.addEventListener("copy", (event) => {
  if (event.target === els.nodeDetail || els.nodeDetail.contains(event.target)) {
    if (copySelectedDetailImage(event)) return;
    copySelectedDetailBlock(event);
  }
}, true);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", (event) => {
  if (!event.ctrlKey || !event.altKey) {
    state.modifierCreateActive = false;
  }
  if (event.key === "Control" || (!event.ctrlKey && !event.metaKey)) {
    setMode("pan");
  }
});
window.addEventListener("resize", () => {
  setInspectorWidth(state.inspectorExpanded ? window.innerWidth : state.inspectorWidth);
  setInspectorHeight(state.inspectorHeight, { allowFullHeight: state.inspectorExpanded && isBottomInspector() });
  render();
  positionDetailImageResizeHandle();
});
window.addEventListener("beforeunload", (event) => {
  if (!state.dirty && !state.saving) return;
  event.preventDefault();
  event.returnValue = "";
});

async function bootstrap() {
  state.windowSessionId = sessionStorage.getItem("smind-window-session") || crypto.randomUUID();
  sessionStorage.setItem("smind-window-session", state.windowSessionId);
  setInspectorWidth(state.inspectorWidth);
  setMode("pan");
  refreshFileChip();
  try {
    await navigator.storage?.persist?.();
  } catch (error) {
    // Best-effort only; IndexedDB recovery still works without persistent quota.
  }
  await probeDataServer();
  let loadedRememberedFile = false;
  try {
    const stored = await getStoredValue(sessionStorageKey("file-handle"));
    if (stored?.handle) {
      state.fileHandle = stored.handle;
      state.currentFileName = stored.fileName || state.currentFileName;
      try {
        await loadProjectFromFile(await state.fileHandle.getFile(), state.fileHandle);
        loadedRememberedFile = true;
      } catch (error) {
        // Fall back to the recovery copy when the file moved or permission expired.
        state.fileHandle = null;
      }
    }
  } catch (error) {
    // Some local browser modes block IndexedDB.
  }
  try {
    const directoryHandle = await getStoredValue(sessionStorageKey("data-directory-handle"))
      || await getStoredValue("data-directory-handle");
    if (directoryHandle) state.dataDirectoryHandle = directoryHandle;
  } catch (error) {
    // The open dialog asks for the directory again when needed.
  }
  if (!loadedRememberedFile) await loadDefaultProject();
  refreshFileChip();
}

bootstrap();
