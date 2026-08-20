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
  projectMeta: null,
  currentFileName: "default.mindmap.json",
  fileHandle: null,
  autosaveTimer: null,
  dirty: false,
  saving: false,
  saveAgainAfterCurrent: false,
  suppressAutosave: true,
  detailUndoStacks: new Map(),
  restoringDetail: false,
  detailFormatBrush: null,
  detailImage: null,
  detailImageResize: null,
  detailImageClipboard: null,
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
  saveAsFile: document.querySelector("#saveAsFile"),
  exportMarkdown: document.querySelector("#exportMarkdown"),
  saveStatus: document.querySelector("#saveStatus"),
  fileInput: document.querySelector("#fileInput"),
  shell: document.querySelector("#canvasShell"),
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
  inspectorResizer: document.querySelector("#inspectorResizer"),
  detailImageResizeHandle: document.querySelector("#detailImageResizeHandle"),
};

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
  return els.nodeDetail.innerText.replace(/\n$/, "");
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

  function appendText(text, format) {
    if (!text) return;
    const hasStyle = Boolean(format.backgroundColor || format.color || format.fontSize);
    if (!hasStyle) {
      output.append(document.createTextNode(text));
      return;
    }
    const previous = output.lastChild;
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
    output.append(span);
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
      appendBreak();
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
}

function setSaveStatus(text, status = "saved") {
  els.saveStatus.textContent = text;
  els.saveStatus.dataset.state = status;
}

function currentProjectDocument() {
  const project = MindMapLogic.createProjectDocument({
    nodes,
    viewport: {
      scale: state.scale,
      tx: state.tx,
      ty: state.ty,
      inspectorWidth: state.inspectorWidth,
    },
    selection: {
      activeId: state.activeId,
      selectedIds: [...state.selected],
    },
    counters: {
      nextId: state.nextId,
    },
    meta: state.projectMeta || {
      title: state.currentFileName.replace(/\.mindmap\.json$|\.json$/i, "") || "未命名思维导图",
    },
  });
  state.projectMeta = project.meta;
  return project;
}

function applyProject(project, options = {}) {
  const normalized = MindMapLogic.normalizeProjectDocument(project);
  state.suppressAutosave = true;
  nodes.splice(0, nodes.length, ...normalized.nodes);
  state.projectMeta = normalized.meta;
  state.scale = normalized.viewport.scale;
  state.tx = normalized.viewport.tx;
  state.ty = normalized.viewport.ty;
  state.nextId = normalized.counters.nextId;
  state.selected = new Set(normalized.selection.selectedIds);
  state.activeId = normalized.selection.activeId;
  state.history = [];
  state.clipboard = null;
  state.connectingFromIds = [];
  setInspectorWidth(normalized.viewport.inspectorWidth);
  render();
  if (options.fitView) fitView();
  state.dirty = false;
  state.suppressAutosave = false;
}

function markDirty() {
  if (state.suppressAutosave) return;
  state.dirty = true;
  setSaveStatus("未保存", "dirty");
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    saveNow();
  }, 800);
}

const PROJECT_DB_NAME = "smind-storage";
const LEGACY_PROJECT_DB_NAME = "mindmap-product-storage";

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

async function saveRecovery(project) {
  await putStoredValue("recovery-project", {
    savedAt: new Date().toISOString(),
    fileName: state.currentFileName,
    project,
  });
}

async function rememberFileHandle() {
  if (!state.fileHandle) return;
  try {
    await putStoredValue("file-handle", {
      fileName: state.currentFileName,
      handle: state.fileHandle,
    });
  } catch (error) {
    // Some browsers reject FileSystemHandle persistence; recovery still works.
  }
}

async function writeProjectToHandle(project) {
  if (!state.fileHandle) return false;
  if (state.fileHandle.queryPermission) {
    const permission = await state.fileHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const requested = await state.fileHandle.requestPermission({ mode: "readwrite" });
      if (requested !== "granted") return false;
    }
  }
  const writable = await state.fileHandle.createWritable();
  await writable.write(JSON.stringify(project, null, 2));
  await writable.close();
  return true;
}

async function saveNow(options = {}) {
  window.clearTimeout(state.autosaveTimer);
  if (state.saving) {
    state.saveAgainAfterCurrent = true;
    return;
  }
  const project = currentProjectDocument();
  state.saving = true;
  setSaveStatus("保存中", "saving");
  try {
    const wroteFile = await writeProjectToHandle(project);
    await saveRecovery(project);
    if (!wroteFile && options.requireFile) {
      setSaveStatus("需要另存为", "error");
    } else {
      state.dirty = false;
      setSaveStatus(wroteFile ? "已保存" : "已自动保存", "saved");
    }
    await rememberFileHandle();
  } catch (error) {
    try {
      await saveRecovery(project);
      setSaveStatus("已保存恢复副本", "dirty");
    } catch (recoveryError) {
      setSaveStatus("保存失败", "error");
    }
  } finally {
    state.saving = false;
    if (state.saveAgainAfterCurrent) {
      state.saveAgainAfterCurrent = false;
      markDirty();
    }
  }
}

async function loadProjectFromFile(file, handle = null) {
  const text = await file.text();
  const project = MindMapLogic.normalizeProjectDocument(JSON.parse(text));
  state.fileHandle = handle;
  state.currentFileName = file.name || "未命名.mindmap.json";
  applyProject(project);
  setSaveStatus("已打开", "saved");
  await saveRecovery(currentProjectDocument());
  await rememberFileHandle();
}

async function openProjectFile() {
  try {
    if (window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: "Mind Map Project",
          accept: {
            "application/json": [".mindmap.json", ".json"],
          },
        }],
        multiple: false,
      });
      const file = await handle.getFile();
      await loadProjectFromFile(file, handle);
      return;
    }
    els.fileInput.value = "";
    els.fileInput.click();
  } catch (error) {
    if (error.name !== "AbortError") setSaveStatus("打开失败", "error");
  }
}

function downloadProject(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.currentFileName.endsWith(".json") ? state.currentFileName : "未命名.mindmap.json";
  link.click();
  URL.revokeObjectURL(url);
}

function exportMarkdownFile() {
  const title = state.projectMeta?.title || state.currentFileName.replace(/\.mindmap\.json$|\.json$/i, "");
  const markdown = MindMapLogic.projectToMarkdown(nodes, title || "未命名思维导图");
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title || "mindmap"}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveAsProjectFile() {
  const project = currentProjectDocument();
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: state.currentFileName || "未命名.mindmap.json",
        types: [{
          description: "Mind Map Project",
          accept: {
            "application/json": [".mindmap.json", ".json"],
          },
        }],
      });
      state.fileHandle = handle;
      state.currentFileName = handle.name || state.currentFileName;
      await saveNow({ requireFile: true });
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
    const recovery = await getStoredValue("recovery-project");
    if (recovery?.project) {
      state.currentFileName = recovery.fileName || "恢复项目.mindmap.json";
      applyProject(recovery.project);
      setSaveStatus("已恢复自动保存", "saved");
      return;
    }
  } catch (error) {
    // Continue to the separated default data file.
  }
  try {
    const response = await fetch("../data/default.mindmap.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`default data ${response.status}`);
    const project = await response.json();
    state.currentFileName = "default.mindmap.json";
    applyProject(project, { fitView: true });
    setSaveStatus("自动保存", "saved");
    await saveRecovery(currentProjectDocument());
  } catch (error) {
    applyProject(currentProjectDocument(), { fitView: true });
    setSaveStatus("自动保存", "saved");
  }
}

function setMode(mode) {
  state.mode = mode;
  els.shell.classList.toggle("select-mode", mode === "select");
}

function selectOnly(id) {
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

function getDetailSelectionRange() {
  const range = getDetailRange();
  if (!range || range.collapsed) return null;
  return range;
}

function syncNodeDetailFromEditor() {
  const node = byId(state.activeId);
  if (!node) return;
  node.detailHtml = sanitizeDetailHtml(els.nodeDetail.innerHTML);
  node.detail = plainTextFromDetailEditor();
  node.detailLineGap = normalizeDetailLineGap(els.detailLineGap.value);
  updateNodeDom(node.id);
  markDirty();
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

  const clipboardImage = safeImageFromClipboardHtml(event);
  if (clipboardImage) {
    event.preventDefault();
    pushDetailUndo();
    insertImageAtDetailSelection(
      clipboardImage.src,
      getDetailRange()?.cloneRange() || null,
      clipboardImage,
    );
    syncNodeDetailFromEditor();
    return;
  }

  const plainClipboardText = event.clipboardData?.getData("text/plain") || "";
  const clipboardTypes = [...(event.clipboardData?.types || [])];
  if (
    state.detailImageClipboard
    && !plainClipboardText
    && (clipboardTypes.length === 0 || clipboardTypes.includes("text/html"))
  ) {
    event.preventDefault();
    pushDetailUndo();
    const holder = document.createElement("div");
    holder.innerHTML = state.detailImageClipboard;
    const image = holder.querySelector("img");
    if (image) {
      insertImageAtDetailSelection(
        image.getAttribute("src"),
        getDetailRange()?.cloneRange() || null,
        {
          width: image.getAttribute("width"),
          height: image.getAttribute("height"),
        },
      );
      syncNodeDetailFromEditor();
    }
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
  const html = sanitizeDetailHtml(image.outerHTML);
  if (!html) return false;
  state.detailImageClipboard = html;
  if (event?.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", "");
    return true;
  }

  const selection = window.getSelection();
  const previousRanges = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    previousRanges.push(selection.getRangeAt(index).cloneRange());
  }
  const range = document.createRange();
  range.selectNode(image);
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
  item.title = node.detail || node.text;
  const title = item.querySelector(".node-title");
  if (title) {
    if (state.editingId !== node.id && title.textContent !== node.text) title.textContent = node.text;
    title.style.fontSize = `${node.fontSize}px`;
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
    setInspectorWidth(window.innerWidth - event.clientX);
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
    event.preventDefault();
    event.stopPropagation();
    copySelectedDetailImage();
    return;
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
els.saveAsFile.addEventListener("click", saveAsProjectFile);
els.exportMarkdown.addEventListener("click", exportMarkdownFile);
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
    copySelectedDetailImage(event);
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
  setInspectorWidth(state.inspectorWidth);
  render();
  positionDetailImageResizeHandle();
});
window.addEventListener("beforeunload", (event) => {
  if (!state.dirty && !state.saving) return;
  event.preventDefault();
  event.returnValue = "";
});

async function bootstrap() {
  setInspectorWidth(state.inspectorWidth);
  setMode("pan");
  try {
    await navigator.storage?.persist?.();
  } catch (error) {
    // Best-effort only; IndexedDB recovery still works without persistent quota.
  }
  try {
    const stored = await getStoredValue("file-handle");
    if (stored?.handle) {
      state.fileHandle = stored.handle;
      state.currentFileName = stored.fileName || state.currentFileName;
    }
  } catch (error) {
    // Some local browser modes block IndexedDB.
  }
  await loadDefaultProject();
}

bootstrap();
