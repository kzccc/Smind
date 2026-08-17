(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MindMapLogic = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const PROJECT_SCHEMA = "mindmap.product.v1";

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function byId(nodes) {
    return Object.fromEntries(nodes.map((node) => [node.id, node]));
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

  function normalizeLineGap(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0.5;
    return Math.max(0.1, Math.min(0.9, Math.round(number * 10) / 10));
  }

  function normalizeNode(node, index) {
    const id = String(node.id || `node-${index + 1}`);
    const detail = String(node.detail || "");
    return {
      id,
      parentId: node.parentId || null,
      x: Number.isFinite(node.x) ? node.x : 0,
      y: Number.isFinite(node.y) ? node.y : 0,
      w: Number.isFinite(node.w) ? node.w : 154,
      h: Number.isFinite(node.h) ? node.h : 54,
      text: String(node.text || "未命名节点"),
      detail,
      detailHtml: typeof node.detailHtml === "string" ? node.detailHtml : detailToHtml(detail),
      detailLineGap: normalizeLineGap(node.detailLineGap),
      color: String(node.color || "default"),
      fontSize: Number.isFinite(node.fontSize) ? node.fontSize : 16,
      children: Array.isArray(node.children) ? node.children.map(String) : [],
    };
  }

  function nextIdFromNodes(nodes) {
    const maxNumericId = nodes.reduce((max, node) => {
      const match = String(node.id).match(/^node-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return Math.max(maxNumericId, nodes.length) + 1;
  }

  function createProjectDocument(input = {}) {
    const now = input.now || new Date().toISOString();
    const meta = input.meta || {};
    return {
      schema: PROJECT_SCHEMA,
      meta: {
        title: meta.title || "未命名思维导图",
        createdAt: meta.createdAt || now,
        updatedAt: now,
      },
      viewport: {
        scale: input.viewport?.scale ?? 1,
        tx: input.viewport?.tx ?? 420,
        ty: input.viewport?.ty ?? 300,
        inspectorWidth: input.viewport?.inspectorWidth ?? 390,
      },
      nodes: deepClone(input.nodes || []).map(normalizeNode),
      selection: {
        activeId: input.selection?.activeId || "",
        selectedIds: [...new Set(input.selection?.selectedIds || [])],
      },
      counters: {
        nextId: input.counters?.nextId ?? nextIdFromNodes(input.nodes || []),
      },
    };
  }

  function normalizeProjectDocument(raw = {}) {
    const nodes = (Array.isArray(raw) ? raw : raw.nodes || []).map(normalizeNode);
    if (nodes.length === 0) {
      throw new Error("项目文件中没有可用节点");
    }
    const nodeIds = new Set(nodes.map((node) => node.id));
    nodes.forEach((node) => {
      if (node.parentId && !nodeIds.has(node.parentId)) node.parentId = null;
      node.children = node.children.filter((childId) => nodeIds.has(childId));
    });
    const selectedIds = (raw.selection?.selectedIds || []).filter((id) => nodeIds.has(id));
    const activeId = nodeIds.has(raw.selection?.activeId) ? raw.selection.activeId : selectedIds[0] || nodes[0].id;

    return createProjectDocument({
      meta: raw.meta || {},
      viewport: raw.viewport || {},
      nodes,
      selection: {
        activeId,
        selectedIds: selectedIds.length > 0 ? selectedIds : [activeId],
      },
      counters: {
        nextId: Math.max(raw.counters?.nextId || 1, nextIdFromNodes(nodes)),
      },
      now: raw.meta?.updatedAt,
    });
  }

  function projectToMarkdown(nodes, title = "未命名思维导图") {
    const map = byId(nodes);
    const childIds = new Set();
    nodes.forEach((node) => node.children.forEach((childId) => childIds.add(childId)));
    const roots = nodes
      .filter((node) => !node.parentId || !map[node.parentId] || !childIds.has(node.id))
      .sort((a, b) => a.y - b.y);
    const lines = [`# ${title}`, ""];

    function writeNode(node, depth, stack = new Set()) {
      const indent = "  ".repeat(depth);
      lines.push(`${indent}- ${node.text}`);
      if (node.detail) {
        node.detail.split(/\r?\n/).filter(Boolean).forEach((line) => {
          lines.push(`${indent}  ${line}`);
        });
      }
      if (stack.has(node.id)) return;
      const nextStack = new Set(stack);
      nextStack.add(node.id);
      node.children
        .map((id) => map[id])
        .filter(Boolean)
        .sort((a, b) => a.y - b.y)
        .forEach((child) => writeNode(child, depth + 1, nextStack));
    }

    roots.forEach((rootNode) => writeNode(rootNode, 0));
    return `${lines.join("\n")}\n`;
  }

  function rectFromPoints(a, b) {
    return {
      left: Math.min(a.x, b.x),
      right: Math.max(a.x, b.x),
      top: Math.min(a.y, b.y),
      bottom: Math.max(a.y, b.y),
    };
  }

  function nodeRect(node) {
    return {
      left: node.x,
      right: node.x + node.w,
      top: node.y,
      bottom: node.y + node.h,
    };
  }

  function rectsOverlap(a, b) {
    return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
  }

  function selectNodesInWorldRect(nodes, start, end) {
    const selection = rectFromPoints(start, end);
    return nodes
      .filter((node) => rectsOverlap(selection, nodeRect(node)))
      .map((node) => node.id);
  }

  function siblingsOf(nodes, node) {
    if (!node.parentId) return [node];
    const map = byId(nodes);
    const parent = map[node.parentId];
    if (!parent) return [node];
    return parent.children.map((id) => map[id]).filter(Boolean).sort((a, b) => a.y - b.y);
  }

  function navigateNode(nodes, activeId, direction) {
    const map = byId(nodes);
    const node = map[activeId] || nodes[0];
    if (!node) return null;
    if (direction === "left") return node.parentId || node.id;
    if (direction === "right") return node.children[0] || node.id;
    const siblings = siblingsOf(nodes, node);
    const index = siblings.findIndex((item) => item.id === node.id);
    if (direction === "up") return siblings[Math.max(0, index - 1)]?.id || node.id;
    if (direction === "down") return siblings[Math.min(siblings.length - 1, index + 1)]?.id || node.id;
    return node.id;
  }

  function nodeDepth(nodes, id) {
    const map = byId(nodes);
    let depth = 0;
    let current = map[id];
    while (current && current.parentId && map[current.parentId]) {
      depth += 1;
      current = map[current.parentId];
    }
    return depth;
  }

  function tidyByDepth(nodes, selectedIds) {
    const selected = nodes.filter((node) => selectedIds.includes(node.id));
    const groups = new Map();
    selected.forEach((node) => {
      const depth = nodeDepth(nodes, node.id);
      if (!groups.has(depth)) groups.set(depth, []);
      groups.get(depth).push(node);
    });
    groups.forEach((group) => {
      const left = Math.min(...group.map((node) => node.x));
      group.sort((a, b) => a.y - b.y);
      let y = Math.min(...group.map((node) => node.y));
      group.forEach((node) => {
        node.x = left;
        node.y = y;
        y += node.h + 28;
      });
    });
    return nodes;
  }

  function tidyTree(nodes, selectedIds, options = {}) {
    const selected = new Set(selectedIds);
    const map = byId(nodes);
    const siblingGap = options.siblingGap ?? 38;
    const forestGap = options.forestGap ?? 64;
    const levelGap = options.levelGap ?? 280;
    const selectedNodes = nodes.filter((node) => selected.has(node.id));
    if (selectedNodes.length === 0) return nodes;

    const selectedParentIdsByChild = new Map();
    selectedNodes.forEach((node) => {
      node.children.forEach((childId) => {
        if (!selected.has(childId)) return;
        if (!selectedParentIdsByChild.has(childId)) selectedParentIdsByChild.set(childId, []);
        selectedParentIdsByChild.get(childId).push(node.id);
      });
    });
    const sharedIds = new Set(
      [...selectedParentIdsByChild.entries()]
        .filter(([, parentIds]) => parentIds.length > 1)
        .map(([id]) => id),
    );

    const absoluteDepthCache = new Map();
    function absoluteDepth(id) {
      if (absoluteDepthCache.has(id)) return absoluteDepthCache.get(id);
      const node = map[id];
      if (!node || !node.parentId || !map[node.parentId]) {
        absoluteDepthCache.set(id, 0);
        return 0;
      }
      const depth = absoluteDepth(node.parentId) + 1;
      absoluteDepthCache.set(id, depth);
      return depth;
    }

    let roots = selectedNodes.filter((node) => !sharedIds.has(node.id) && (!node.parentId || !selected.has(node.parentId)));
    if (roots.length === 0) roots = selectedNodes.filter((node) => !sharedIds.has(node.id));
    const minDepth = Math.min(...roots.map((node) => absoluteDepth(node.id)));
    const baseX = Math.min(...selectedNodes.map((node) => node.x));
    const baseY = Math.min(...selectedNodes.map((node) => node.y));
    const maxDepth = Math.max(...selectedNodes.map((node) => absoluteDepth(node.id)));
    const maxWidthByDepth = new Map();
    selectedNodes.forEach((node) => {
      const depth = absoluteDepth(node.id);
      maxWidthByDepth.set(depth, Math.max(maxWidthByDepth.get(depth) || 0, node.w));
    });
    const columnX = new Map();
    let nextColumnX = baseX;
    for (let depth = minDepth; depth <= maxDepth; depth += 1) {
      columnX.set(depth, nextColumnX);
      nextColumnX += (maxWidthByDepth.get(depth) || 0) + levelGap;
    }

    function xForDepth(depth) {
      return columnX.get(depth) ?? (baseX + (depth - minDepth) * levelGap);
    }

    function selectedChildren(node) {
      return node.children
        .map((id) => map[id])
        .filter((child) => child && selected.has(child.id) && !sharedIds.has(child.id))
        .sort((a, b) => a.y - b.y);
    }

    const heights = new Map();
    function measure(node) {
      const children = selectedChildren(node);
      if (children.length === 0) {
        heights.set(node.id, node.h);
        return node.h;
      }
      const childrenHeight = children.reduce((sum, child) => sum + measure(child), 0)
        + siblingGap * (children.length - 1);
      const height = Math.max(node.h, childrenHeight);
      heights.set(node.id, height);
      return height;
    }

    function place(node, top) {
      const height = heights.get(node.id) ?? measure(node);
      const children = selectedChildren(node);
      node.x = xForDepth(absoluteDepth(node.id));
      if (children.length === 0) {
        node.y = Math.round(top + (height - node.h) / 2);
        return;
      }
      const childrenHeight = children.reduce((sum, child) => sum + heights.get(child.id), 0)
        + siblingGap * (children.length - 1);
      let y = top + (height - childrenHeight) / 2;
      children.forEach((child) => {
        place(child, y);
        y += (heights.get(child.id) ?? child.h) + siblingGap;
      });
      const first = children[0];
      const last = children[children.length - 1];
      const directChildrenCenter = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
      node.y = Math.round(directChildrenCenter - node.h / 2);
    }

    function placeAnchoredChildren(node) {
      const children = selectedChildren(node);
      if (children.length === 0) return;
      const childrenHeight = children.reduce((sum, child) => sum + (heights.get(child.id) ?? measure(child)), 0)
        + siblingGap * (children.length - 1);
      let y = node.y + node.h / 2 - childrenHeight / 2;
      children.forEach((child) => {
        place(child, y);
        y += (heights.get(child.id) ?? child.h) + siblingGap;
      });
    }

    function placeSharedNodes() {
      [...sharedIds]
        .map((id) => map[id])
        .filter(Boolean)
        .sort((a, b) => absoluteDepth(a.id) - absoluteDepth(b.id) || a.y - b.y)
        .forEach((node) => {
          const parents = (selectedParentIdsByChild.get(node.id) || [])
            .map((id) => map[id])
            .filter(Boolean);
          if (parents.length === 0) return;
          const parentCenters = parents.map((parent) => parent.y + parent.h / 2);
          const minCenter = Math.min(...parentCenters);
          const maxCenter = Math.max(...parentCenters);
          const maxParentDepth = Math.max(...parents.map((parent) => absoluteDepth(parent.id)));
          node.x = xForDepth(maxParentDepth + 1);
          node.y = Math.round((minCenter + maxCenter) / 2 - node.h / 2);
          heights.set(node.id, Math.max(node.h, heights.get(node.id) || node.h));
          placeAnchoredChildren(node);
        });
    }

    roots.forEach(measure);
    let y = baseY;
    roots.forEach((rootNode) => {
      place(rootNode, y);
      y += (heights.get(rootNode.id) ?? rootNode.h) + forestGap;
    });
    placeSharedNodes();
    return nodes;
  }

  function collectSubtreeIds(nodes, rootId) {
    const map = byId(nodes);
    const result = [];
    function visit(id) {
      const node = map[id];
      if (!node) return;
      result.push(id);
      node.children.forEach(visit);
    }
    visit(rootId);
    return result;
  }

  function cloneSelectedSubtrees(nodes, selectedIds, makeId, offset = {}) {
    const selected = new Set(selectedIds);
    const map = byId(nodes);
    const roots = nodes.filter((node) => selected.has(node.id) && (!node.parentId || !selected.has(node.parentId)));
    const clones = [];
    const oldToNew = new Map();
    let serial = 1;
    const dx = offset.dx ?? 36;
    const dy = offset.dy ?? 36;

    function cloneNode(node, parentId) {
      const id = makeId(serial, node);
      serial += 1;
      oldToNew.set(node.id, id);
      const clone = {
        ...JSON.parse(JSON.stringify(node)),
        id,
        parentId,
        x: node.x + dx,
        y: node.y + dy,
        children: [],
      };
      clones.push(clone);
      node.children
        .map((childId) => map[childId])
        .filter(Boolean)
        .forEach((child) => {
          const childClone = cloneNode(child, id);
          clone.children.push(childClone.id);
        });
      return clone;
    }

    roots.forEach((rootNode) => cloneNode(rootNode, null));
    return { clones, roots: roots.map((node) => oldToNew.get(node.id)).filter(Boolean), oldToNew };
  }

  function canCreateSummaryNode(nodes, selectedIds) {
    if (selectedIds.length < 2) return false;
    const map = byId(nodes);
    const selected = selectedIds.map((id) => map[id]).filter(Boolean);
    if (selected.length !== selectedIds.length) return false;
    const parentId = selected[0].parentId;
    if (!parentId) return false;
    return selected.every((node) => node.parentId === parentId);
  }

  function connectNodes(nodes, sourceId, targetId) {
    if (sourceId === targetId) return false;
    const map = byId(nodes);
    const source = map[sourceId];
    const target = map[targetId];
    if (!source || !target) return false;
    if (collectSubtreeIds(nodes, targetId).includes(sourceId)) return false;

    nodes.forEach((node) => {
      node.children = node.children.filter((childId) => childId !== targetId);
    });
    if (!source.children.includes(targetId)) source.children.push(targetId);
    target.parentId = sourceId;
    return true;
  }

  function connectManyNodes(nodes, sourceIds, targetId) {
    const uniqueSourceIds = [...new Set(sourceIds)];
    if (uniqueSourceIds.length === 0 || uniqueSourceIds.includes(targetId)) return false;
    if (uniqueSourceIds.length === 1) return connectNodes(nodes, uniqueSourceIds[0], targetId);
    if (!canCreateSummaryNode(nodes, uniqueSourceIds)) return false;

    const map = byId(nodes);
    const target = map[targetId];
    if (!target) return false;
    if (collectSubtreeIds(nodes, targetId).some((id) => uniqueSourceIds.includes(id))) return false;

    nodes.forEach((node) => {
      node.children = node.children.filter((childId) => childId !== targetId);
    });
    uniqueSourceIds.forEach((sourceId) => {
      const source = map[sourceId];
      if (source && !source.children.includes(targetId)) source.children.push(targetId);
    });
    target.parentId = uniqueSourceIds[0];
    return true;
  }

  return {
    PROJECT_SCHEMA,
    rectFromPoints,
    rectsOverlap,
    selectNodesInWorldRect,
    navigateNode,
    tidyByDepth,
    tidyTree,
    collectSubtreeIds,
    cloneSelectedSubtrees,
    canCreateSummaryNode,
    connectNodes,
    connectManyNodes,
    createProjectDocument,
    normalizeProjectDocument,
    projectToMarkdown,
  };
});
