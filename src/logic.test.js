const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  rectFromPoints,
  rectsOverlap,
  selectNodesInWorldRect,
  navigateNode,
  tidyTree,
  collectSubtreeIds,
  cloneSelectedSubtrees,
  canCreateSummaryNode,
  connectNodes,
  connectManyNodes,
  createProjectDocument,
  normalizeProjectDocument,
  projectToMarkdown,
} = require("./logic");

function run(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`not ok ${name}`);
    throw error;
  }
}

const nodes = [
  { id: "root", parentId: null, x: 0, y: 0, w: 120, h: 60, text: "Root", children: ["a", "b"] },
  { id: "a", parentId: "root", x: 260, y: -80, w: 140, h: 64, text: "A", children: ["a1", "a2"] },
  { id: "b", parentId: "root", x: 260, y: 80, w: 180, h: 64, text: "B", children: ["b1", "b2"] },
  { id: "a1", parentId: "a", x: 560, y: -125, w: 130, h: 58, text: "A1", children: [] },
  { id: "a2", parentId: "a", x: 560, y: -30, w: 170, h: 58, text: "A2", children: [] },
  { id: "b1", parentId: "b", x: 560, y: 35, w: 150, h: 58, text: "B1", children: [] },
  { id: "b2", parentId: "b", x: 560, y: 130, w: 120, h: 58, text: "B2", children: [] },
];

run("rectFromPoints normalizes drag direction", () => {
  assert.deepEqual(rectFromPoints({ x: 90, y: 110 }, { x: 20, y: 40 }), {
    left: 20,
    right: 90,
    top: 40,
    bottom: 110,
  });
});

run("rectsOverlap treats touched node edges as selected", () => {
  assert.equal(
    rectsOverlap(
      { left: 10, right: 40, top: 10, bottom: 40 },
      { left: 40, right: 80, top: 20, bottom: 60 },
    ),
    true,
  );
});

run("selectNodesInWorldRect selects every node touched by the box", () => {
  const selected = selectNodesInWorldRect(nodes, { x: 240, y: -95 }, { x: 455, y: 160 });
  assert.deepEqual(selected, ["a", "b"]);
});

run("left and right navigate parent and first child", () => {
  assert.equal(navigateNode(nodes, "a", "left"), "root");
  assert.equal(navigateNode(nodes, "a", "right"), "a1");
});

run("up and down navigate siblings by vertical order", () => {
  assert.equal(navigateNode(nodes, "b", "up"), "a");
  assert.equal(navigateNode(nodes, "a", "down"), "b");
});

run("tidyTree keeps child order and centers parents over their selected children", () => {
  const nine = [
    { id: "root", parentId: null, x: 40, y: 120, w: 150, h: 70, children: ["a", "b", "c", "d"] },
    { id: "a", parentId: "root", x: 390, y: -120, w: 150, h: 70, children: [] },
    { id: "b", parentId: "root", x: 210, y: -50, w: 150, h: 70, children: ["b1", "b2"] },
    { id: "c", parentId: "root", x: 450, y: 170, w: 150, h: 70, children: [] },
    { id: "d", parentId: "root", x: 260, y: 260, w: 150, h: 70, children: ["d1", "d2"] },
    { id: "b1", parentId: "b", x: 800, y: 500, w: 150, h: 70, children: [] },
    { id: "b2", parentId: "b", x: 720, y: 30, w: 150, h: 70, children: [] },
    { id: "d1", parentId: "d", x: 690, y: 360, w: 150, h: 70, children: [] },
    { id: "d2", parentId: "d", x: 910, y: 100, w: 150, h: 70, children: [] },
  ];

  tidyTree(nine, nine.map((node) => node.id), { levelGap: 220, siblingGap: 30 });

  const root = nine.find((node) => node.id === "root");
  const secondLayer = ["a", "b", "c", "d"].map((id) => nine.find((node) => node.id === id));
  const thirdLayer = ["b1", "b2", "d1", "d2"].map((id) => nine.find((node) => node.id === id));

  assert.deepEqual(secondLayer.map((node) => node.id), ["a", "b", "c", "d"]);
  assert.equal(new Set(secondLayer.map((node) => node.x)).size, 1);
  assert.equal(new Set(thirdLayer.map((node) => node.x)).size, 1);
  assert.equal(secondLayer[0].x, root.x + root.w + 220);
  assert.equal(thirdLayer[0].x, secondLayer[0].x + secondLayer[0].w + 220);
  assert.ok(secondLayer[0].y < secondLayer[1].y);
  assert.ok(secondLayer[1].y < secondLayer[2].y);
  assert.ok(secondLayer[2].y < secondLayer[3].y);

  const b = nine.find((node) => node.id === "b");
  const b1 = nine.find((node) => node.id === "b1");
  const b2 = nine.find((node) => node.id === "b2");
  const d = nine.find((node) => node.id === "d");
  const d1 = nine.find((node) => node.id === "d1");
  const d2 = nine.find((node) => node.id === "d2");
  const bChildrenCenter = (b1.y + b1.h / 2 + b2.y + b2.h / 2) / 2;
  const dChildrenCenter = (d1.y + d1.h / 2 + d2.y + d2.h / 2) / 2;
  const secondLayerCenter = (
    secondLayer[0].y + secondLayer[0].h / 2
    + secondLayer[3].y + secondLayer[3].h / 2
  ) / 2;

  assert.equal(b.y + b.h / 2, bChildrenCenter);
  assert.equal(d.y + d.h / 2, dChildrenCenter);
  assert.equal(root.y + root.h / 2, secondLayerCenter);
});

run("tidyTree keeps a real horizontal gap between parent and child rectangles", () => {
  const wideParent = [
    { id: "root", parentId: null, x: 40, y: 0, w: 260, h: 80, children: ["child"] },
    { id: "child", parentId: "root", x: 120, y: 0, w: 150, h: 70, children: [] },
  ];

  tidyTree(wideParent, ["root", "child"], { levelGap: 120, siblingGap: 30 });

  const root = wideParent.find((node) => node.id === "root");
  const child = wideParent.find((node) => node.id === "child");
  assert.equal(child.x - (root.x + root.w), 120);
});

run("tidyTree orders same-layer children by current vertical position", () => {
  const shuffled = [
    { id: "root", parentId: null, x: 0, y: 0, w: 150, h: 70, children: ["one", "two", "three", "four"] },
    { id: "one", parentId: "root", x: 250, y: 200, w: 150, h: 70, children: [] },
    { id: "two", parentId: "root", x: 250, y: -40, w: 150, h: 70, children: [] },
    { id: "three", parentId: "root", x: 250, y: 310, w: 150, h: 70, children: [] },
    { id: "four", parentId: "root", x: 250, y: 420, w: 150, h: 70, children: [] },
  ];

  tidyTree(shuffled, shuffled.map((node) => node.id), { siblingGap: 20, levelGap: 220 });

  const ordered = ["two", "one", "three", "four"].map((id) => shuffled.find((node) => node.id === id));
  assert.ok(ordered[0].y < ordered[1].y);
  assert.ok(ordered[1].y < ordered[2].y);
  assert.ok(ordered[2].y < ordered[3].y);
});

run("tidyTree is idempotent and centers a shared summary child", () => {
  const graph = [
    { id: "root", parentId: null, x: 80, y: 260, w: 150, h: 70, children: ["a", "b"] },
    { id: "a", parentId: "root", x: 360, y: 40, w: 150, h: 70, children: ["summary"] },
    { id: "b", parentId: "root", x: 240, y: 360, w: 150, h: 70, children: ["summary"] },
    { id: "summary", parentId: "a", x: 700, y: 520, w: 170, h: 70, children: [] },
  ];
  const ids = graph.map((node) => node.id);

  tidyTree(graph, ids, { levelGap: 220, siblingGap: 30 });
  const first = graph.map((node) => ({ id: node.id, x: node.x, y: node.y }));
  tidyTree(graph, ids, { levelGap: 220, siblingGap: 30 });
  const second = graph.map((node) => ({ id: node.id, x: node.x, y: node.y }));

  const a = graph.find((node) => node.id === "a");
  const b = graph.find((node) => node.id === "b");
  const summary = graph.find((node) => node.id === "summary");
  const sourceCenter = (a.y + a.h / 2 + b.y + b.h / 2) / 2;

  assert.deepEqual(second, first);
  assert.equal(summary.y + summary.h / 2, sourceCenter);
  assert.equal(summary.x, a.x + a.w + 220);
});

run("collectSubtreeIds includes selected node and all descendants", () => {
  assert.deepEqual(collectSubtreeIds(nodes, "a"), ["a", "a1", "a2"]);
});

run("cloneSelectedSubtrees copies hierarchy under fresh ids", () => {
  const result = cloneSelectedSubtrees(nodes, ["a"], (index) => `copy-${index}`, { dx: 40, dy: 50 });
  assert.equal(result.clones.length, 3);
  const rootClone = result.clones.find((node) => node.parentId === null);
  const childClones = result.clones.filter((node) => node.parentId === rootClone.id);

  assert.equal(rootClone.text, "A");
  assert.equal(rootClone.x, nodes.find((node) => node.id === "a").x + 40);
  assert.deepEqual(rootClone.children, childClones.map((node) => node.id));
  assert.deepEqual(childClones.map((node) => node.text), ["A1", "A2"]);
});

run("canCreateSummaryNode only allows multiple selected siblings with the same parent", () => {
  assert.equal(canCreateSummaryNode(nodes, ["a", "b"]), true);
  assert.equal(canCreateSummaryNode(nodes, ["a", "a1"]), false);
  assert.equal(canCreateSummaryNode(nodes, ["a"]), false);
  assert.equal(canCreateSummaryNode(nodes, ["root", "a"]), false);
});

run("connectNodes appends target as a child and prevents cycles", () => {
  const sample = JSON.parse(JSON.stringify(nodes));
  const result = connectNodes(sample, "a2", "b1");
  const a2 = sample.find((node) => node.id === "a2");
  const b = sample.find((node) => node.id === "b");
  const b1 = sample.find((node) => node.id === "b1");

  assert.equal(result, true);
  assert.deepEqual(a2.children, ["b1"]);
  assert.deepEqual(b.children, ["b1", "b2"]);
  assert.equal(b1.parentId, "b");
  assert.equal(connectNodes(sample, "b1", "a2"), false);
});

run("connectNodes appends a child connection without removing existing children", () => {
  const sample = JSON.parse(JSON.stringify(nodes));
  const result = connectNodes(sample, "a", "b1");
  const a = sample.find((node) => node.id === "a");
  const b = sample.find((node) => node.id === "b");
  const b1 = sample.find((node) => node.id === "b1");

  assert.equal(result, true);
  assert.deepEqual(a.children, ["a1", "a2", "b1"]);
  assert.deepEqual(b.children, ["b1", "b2"]);
  assert.equal(b1.parentId, "b");
});

run("connectNodes links mysql primary-key-index node to how-to-choose-primary-key", () => {
  const project = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "mysql.mindmap.json"), "utf8"));
  const sample = JSON.parse(JSON.stringify(project.nodes));
  const result = connectNodes(sample, "node-49", "node-202");
  const source = sample.find((node) => node.id === "node-49");
  const target = sample.find((node) => node.id === "node-202");

  assert.equal(result, true);
  assert.equal(source.children.includes("node-50"), true);
  assert.equal(source.children.includes("node-202"), true);
  assert.equal(target.text, "如何选择主键");
});

run("connectManyNodes allows sibling sources to share one target", () => {
  const sample = JSON.parse(JSON.stringify(nodes));
  const result = connectManyNodes(sample, ["a1", "a2"], "b1");
  const a1 = sample.find((node) => node.id === "a1");
  const a2 = sample.find((node) => node.id === "a2");
  const b = sample.find((node) => node.id === "b");
  const b1 = sample.find((node) => node.id === "b1");

  assert.equal(result, true);
  assert.equal(a1.children.includes("b1"), true);
  assert.equal(a2.children.includes("b1"), true);
  assert.equal(b.children.includes("b1"), true);
  assert.equal(b1.parentId, "b");
});

run("connectManyNodes rejects mixed-level sources and cycles", () => {
  const sample = JSON.parse(JSON.stringify(nodes));

  assert.equal(connectManyNodes(sample, ["a", "a1"], "b1"), false);
  assert.equal(connectManyNodes(sample, ["a1", "a2"], "a"), false);
});

run("createProjectDocument stores nodes, viewport, selection, and counters", () => {
  const project = createProjectDocument({
    nodes,
    viewport: { scale: 1.25, tx: 120, ty: 80, inspectorWidth: 520 },
    selection: { activeId: "a", selectedIds: ["a", "b"] },
    counters: { nextId: 42 },
    meta: { title: "测试项目", createdAt: "2026-08-15T00:00:00.000Z" },
    now: "2026-08-15T01:00:00.000Z",
  });

  assert.equal(project.schema, "mindmap.product.v1");
  assert.equal(project.meta.title, "测试项目");
  assert.equal(project.meta.createdAt, "2026-08-15T00:00:00.000Z");
  assert.equal(project.meta.updatedAt, "2026-08-15T01:00:00.000Z");
  assert.equal(project.nodes.length, nodes.length);
  assert.deepEqual(project.viewport, { scale: 1.25, tx: 120, ty: 80, inspectorWidth: 520 });
  assert.deepEqual(project.selection, { activeId: "a", selectedIds: ["a", "b"] });
  assert.deepEqual(project.counters, { nextId: 42 });

  project.nodes[0].text = "changed";
  assert.equal(nodes[0].text, "Root");
});

run("normalizeProjectDocument fills missing project defaults", () => {
  const project = normalizeProjectDocument({
    nodes: [{ id: "x", x: 1, y: 2, w: 120, h: 50, text: "X", children: [] }],
  });

  assert.equal(project.schema, "mindmap.product.v1");
  assert.equal(project.nodes[0].parentId, null);
  assert.equal(project.nodes[0].detail, "");
  assert.equal(project.nodes[0].detailHtml, "");
  assert.equal(project.nodes[0].detailLineGap, 0.5);
  assert.equal(project.nodes[0].color, "default");
  assert.equal(project.nodes[0].fontSize, 16);
  assert.equal(project.viewport.scale, 1);
  assert.equal(project.counters.nextId, 2);
  assert.deepEqual(project.selection, { activeId: "x", selectedIds: ["x"] });
});

run("normalizeProjectDocument derives rich detail html from plain text", () => {
  const project = normalizeProjectDocument({
    nodes: [{ id: "x", text: "X", detail: "第一行\n第二行", detailLineGap: 0.9, children: [] }],
  });

  assert.equal(project.nodes[0].detail, "第一行\n第二行");
  assert.equal(project.nodes[0].detailHtml, "第一行<br>第二行");
  assert.equal(project.nodes[0].detailLineGap, 0.9);
});

run("projectToMarkdown exports a readable outline", () => {
  const markdown = projectToMarkdown(nodes, "测试项目");

  assert.equal(markdown.includes("# 测试项目"), true);
  assert.equal(markdown.includes("- Root"), true);
  assert.equal(markdown.includes("  - A"), true);
  assert.equal(markdown.includes("    - A1"), true);
});
