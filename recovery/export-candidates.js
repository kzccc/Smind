const fs = require('fs');
const path = require('path');
const input = JSON.parse(fs.readFileSync('D:/Smind/recovery/edge-read-result.json', 'utf8'));
const rows = input.keys.filter((key) => key.startsWith('recovery-project'))
  .map((key) => ({ key, value: input.values[key] }))
  .filter(({ value }) => value?.fileName === 'Leetcode-非TOP100-100题.mindmap.json')
  .sort((a, b) => String(b.value.savedAt).localeCompare(String(a.value.savedAt)));
const report = [];
rows.forEach(({ key, value }, index) => {
  const project = value.project;
  const nodes = Object.values(project.canvases || {}).flatMap((canvas) => canvas.nodes || []);
  const styled = nodes.filter((node) => node.color && node.color !== 'default' || /background-color\s*:|color\s*:/.test(node.detailHtml || ''));
  const titles = nodes.filter((node) => /两数之和|字母异位词|移动零|颜色分类|缺失的第一个正数/.test(node.text || '')).map((node) => ({ text: node.text, color: node.color, styledHtml: /background-color\s*:|color\s*:/.test(node.detailHtml || '') }));
  const filename = `Leetcode-recovered-${String(index + 1).padStart(2, '0')}.mindmap.json`;
  fs.writeFileSync(path.join('D:/Smind/recovery', filename), JSON.stringify(project, null, 2));
  report.push({ candidate: filename, sourceKey: key, savedAt: value.savedAt, nodeCount: nodes.length, styledCount: styled.length, titles });
});
fs.writeFileSync('D:/Smind/recovery/candidate-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
