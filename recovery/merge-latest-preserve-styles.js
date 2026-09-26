const fs = require('fs');
const formalPath = 'D:/Smind/data/Leetcode-非TOP100-100题.mindmap.json';
const candidatePath = 'D:/Smind/recovery/Leetcode-recovered-00-latest.mindmap.json';
const backupPath = 'D:/Smind/recovery/Leetcode-before-sync-20260909.json';
const formal = JSON.parse(fs.readFileSync(formalPath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
fs.copyFileSync(formalPath, backupPath);
const styleKeys = ['color', 'fontSize', 'detailLineGap', 'detailHtml'];
const allFormal = Object.values(formal.canvases || {}).flatMap(c => c.nodes || []);
const byId = new Map(allFormal.map(n => [n.id, n]));
const byText = new Map(allFormal.map(n => [n.text, n]));
let matched = 0;
for (const canvas of Object.values(candidate.canvases || {})) {
  for (const node of canvas.nodes || []) {
    const source = byId.get(node.id) || byText.get(node.text);
    if (!source) continue;
    matched++;
    for (const key of styleKeys) {
      if (source[key] !== undefined && (source[key] !== '' || node[key] === undefined || key === 'color')) node[key] = source[key];
    }
  }
}
candidate.meta = { ...candidate.meta, updatedAt: new Date().toISOString() };
fs.writeFileSync(formalPath, JSON.stringify(candidate, null, 2) + '\n');
console.log(JSON.stringify({ backupPath, matched, output: formalPath }, null, 2));
