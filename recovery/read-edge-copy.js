const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const srcRoot = process.argv[2] || 'D:/Smind/recovery/edge-indexeddb';
const appUrl = 'file:///D:/Smind/src/index.html';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smind-recovery-'));
fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
for (const name of ['IndexedDB', 'Local Storage']) {
  const src = path.join(srcRoot, name);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(profile, 'Default', name), { recursive: true });
}
const srcIndexed = srcRoot;
const dstIndexed = path.join(profile, 'Default', 'IndexedDB');
fs.mkdirSync(dstIndexed, { recursive: true });
for (const ent of fs.readdirSync(srcIndexed, { withFileTypes: true })) {
  if (ent.name.endsWith('.indexeddb.leveldb') || ent.name.endsWith('.indexeddb.blob')) {
    const dst = path.join(dstIndexed, ent.name);
    if (!fs.existsSync(dst)) fs.cpSync(path.join(srcIndexed, ent.name), dst, { recursive: true });
  }
}
(async () => {
  const context = await chromium.launchPersistentContext(profile, { executablePath: edge, headless: true });
  const page = await context.newPage();
  await page.goto(appUrl);
  const result = await page.evaluate(async () => {
    const req = indexedDB.open('smind-storage', 1);
    const db = await new Promise((resolve, reject) => { req.onerror=()=>reject(req.error); req.onsuccess=()=>resolve(req.result); req.onupgradeneeded=()=>req.result.createObjectStore('kv'); });
    const keys = await new Promise((resolve, reject) => { const r=db.transaction('kv').objectStore('kv').getAllKeys(); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
    const vals = {};
    for (const k of keys) vals[k] = await new Promise((resolve,reject)=>{const r=db.transaction('kv').objectStore('kv').get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    return { keys, values: vals };
  });
  fs.writeFileSync(process.argv[3] || 'D:/Smind/recovery/edge-read-result.json', JSON.stringify(result, null, 2));
  console.log(result.keys);
  await context.close();
})();
