// XMind → mindmap.product.v1 转换脚本
// 用法: node convert_xmind.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const XMIND_DIR = "D:\\Documents\\Xmind";
const OUTPUT_DIR = "D:\\Smind\\data";
const EXTRACT_PS1 = path.join(__dirname, "_tmp_extract.ps1");

const FILES = [
  "Golang.xmind",
  "Redis.xmind",
  "计算机网络.xmind",
  "实习期间.xmind",
  "git.xmind",
];

// XMind 颜色 → mindmap 颜色映射
const COLOR_MAP = {
  "#FF9F0033": "orange",
  "#FFABD533": "yellow",
  "#50C3F733": "cyan",
  "#2CD55133": "green",
  "#7B1FA233": "purple",
  "#05A8F433": "blue",
  "#FDD83433": "yellow",
  "#FFC00933": "orange",
  "#0CE6CF33": "cyan",
  "#FF000033": "red",
  "#FF6B6B33": "red",
  "#4ECDC433": "green",
  "#45B7D133": "blue",
  "#96CEB433": "green",
  "#FFEAA733": "yellow",
  "#DDA0DD33": "purple",
  "#98D8C833": "cyan",
  "#F7DC6F33": "yellow",
  "#BB8FCE33": "purple",
  "#85C1E933": "blue",
  "#F8C47133": "orange",
  "#82E0AA33": "green",
};

function extractXmindJson(xmindPath) {
  const tmpFile = path.join(os.tmpdir(), `_xmind_${Date.now()}.json`);
  try {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${EXTRACT_PS1}" -xmindPath "${xmindPath}" -outPath "${tmpFile}"`,
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );
    const raw = fs.readFileSync(tmpFile, "utf8");
    return JSON.parse(raw);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) { /* ignore */ }
  }
}

function guessColorFromStyle(topic) {
  if (topic.style && topic.style.properties && topic.style.properties["svg:fill"]) {
    const fill = topic.style.properties["svg:fill"].toUpperCase();
    // Try exact match
    if (COLOR_MAP[fill]) return COLOR_MAP[fill];
    // Try to match by hue
    const hex = fill.replace(/[^0-9A-F]/g, "");
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (r > 200 && g < 100 && b < 100) return "red";
      if (r > 200 && g > 150 && b < 80) return "orange";
      if (r > 180 && g > 180 && b < 80) return "yellow";
      if (r < 100 && g > 150 && b < 100) return "green";
      if (r < 100 && g > 150 && b > 150) return "cyan";
      if (r < 100 && g < 130 && b > 180) return "blue";
      if (r > 120 && g < 100 && b > 180) return "purple";
    }
  }
  return "default";
}

function extractNotes(topic) {
  // XMind notes can be in different places
  if (topic.notes && topic.notes.plain && topic.notes.plain.content) {
    return topic.notes.plain.content;
  }
  return "";
}

function convertTopic(topic, parentId, allNodes, nextId, depth) {
  const id = `node-${nextId.val}`;
  nextId.val += 1;

  const color = guessColorFromStyle(topic);
  const fontSize = depth === 0 ? 18 : depth === 1 ? 16 : 15;
  const detail = extractNotes(topic);
  const title = topic.title || "未命名";

  const node = {
    id,
    parentId,
    x: 0,
    y: 0,
    w: Math.max(136, Math.min(260, title.length * 14 + 54)),
    h: Math.max(54, 24 + Math.ceil(title.length / 12) * 24),
    text: title,
    detail,
    detailHtml: detail
      ? detail.split(/\r?\n/).map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")).join("<br>")
      : "",
    detailLineGap: 0.5,
    color,
    fontSize,
    children: [],
  };

  allNodes.push(node);

  // Process children
  const attached = topic.children?.attached || [];
  for (const child of attached) {
    const childId = convertTopic(child, id, allNodes, nextId, depth + 1);
    node.children.push(childId);
  }

  return id;
}

function layoutNodes(nodes) {
  const map = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => !n.parentId || !map.has(n.parentId));

  const levelGap = 280;
  const siblingGap = 28;

  function computeHeight(node) {
    const children = node.children.map((cid) => map.get(cid)).filter(Boolean);
    if (children.length === 0) return node.h;
    const total = children.reduce((sum, c) => sum + computeHeight(c), 0)
      + siblingGap * (children.length - 1);
    return Math.max(node.h, total);
  }

  function place(node, x, topY) {
    const height = computeHeight(node);
    const children = node.children.map((cid) => map.get(cid)).filter(Boolean);

    node.x = x;
    if (children.length === 0) {
      node.y = Math.round(topY + (height - node.h) / 2);
      return;
    }

    const childrenHeight = children.reduce((sum, c) => sum + computeHeight(c), 0)
      + siblingGap * (children.length - 1);
    let y = topY + (height - childrenHeight) / 2;
    for (const child of children) {
      place(child, x + levelGap, y);
      y += computeHeight(child) + siblingGap;
    }

    const first = children[0];
    const last = children[children.length - 1];
    const center = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
    node.y = Math.round(center - node.h / 2);
  }

  let currentY = 0;
  const forestGap = 64;
  for (const root of roots) {
    place(root, 0, currentY);
    currentY += computeHeight(root) + forestGap;
  }
}

function convertXmindToProject(xmindPath, outputPath) {
  const fileName = path.basename(xmindPath, ".xmind");
  console.log(`转换: ${fileName}...`);

  const sheets = extractXmindJson(xmindPath);
  const now = new Date().toISOString();

  // Collect all nodes from all sheets
  const allNodes = [];
  const nextId = { val: 1 };

  for (const sheet of sheets) {
    if (sheet.rootTopic) {
      convertTopic(sheet.rootTopic, null, allNodes, nextId, 0);
    }
  }

  if (allNodes.length === 0) {
    console.log(`  ⚠ ${fileName}: 没有节点，跳过`);
    return;
  }

  // Layout
  layoutNodes(allNodes);

  const project = {
    schema: "mindmap.product.v1",
    meta: {
      title: fileName,
      createdAt: now,
      updatedAt: now,
    },
    viewport: {
      scale: 1,
      tx: 420,
      ty: 300,
      inspectorWidth: 390,
    },
    nodes: allNodes,
    selection: {
      activeId: allNodes[0].id,
      selectedIds: [allNodes[0].id],
    },
    counters: {
      nextId: nextId.val,
    },
  };

  // Validate: fix parentId references
  const nodeIds = new Set(allNodes.map((n) => n.id));
  for (const node of allNodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      node.parentId = null;
    }
    node.children = node.children.filter((cid) => nodeIds.has(cid));
  }

  const outputFile = path.join(outputPath, `${fileName}.mindmap.json`);
  fs.writeFileSync(outputFile, JSON.stringify(project, null, 2), "utf8");
  console.log(`  ✓ ${outputFile} (${allNodes.length} 个节点)`);
}

// Main
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const file of FILES) {
  const xmindPath = path.join(XMIND_DIR, file);
  if (!fs.existsSync(xmindPath)) {
    console.log(`⚠ 文件不存在: ${xmindPath}`);
    continue;
  }
  try {
    convertXmindToProject(xmindPath, OUTPUT_DIR);
  } catch (err) {
    console.log(`  ✗ 错误: ${err.message}`);
  }
}

console.log("\n完成！");