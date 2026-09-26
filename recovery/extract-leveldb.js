const fs = require("fs");
const path = require("path");
const leveldown = require("leveldown");

const root = process.argv[2];
const out = process.argv[3];
if (!root || !out) throw new Error("usage: node extract-leveldb.js <leveldb-dir> <output>");

function textVariants(buffer) {
  return [
    buffer.toString("utf8"),
    buffer.toString("utf16le"),
  ];
}

(async () => {
  const records = [];
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith(".indexeddb.leveldb")) continue;
    const dir = path.join(root, name);
    let db;
    try { db = leveldown(dir); } catch { continue; }
    try {
      await new Promise((resolve, reject) => db.open((error) => error ? reject(error) : resolve()));
      const iterator = db.iterator();
      await new Promise((resolve, reject) => {
        const next = () => iterator.next((error, key, value) => {
          if (error) return reject(error);
          if (!key && !value) return resolve();
          const variants = textVariants(Buffer.concat([key, value]));
          const text = variants.find((candidate) => candidate.includes("Leetcode-非TOP100-100题"));
          if (text) records.push({ db: name, key: key.toString("hex"), value: value.toString("base64"), text });
          next();
        });
        next();
      });
    } catch (error) {
      records.push({ db: name, error: String(error) });
    } finally {
      await new Promise((resolve) => db.close(resolve));
    }
  }
  fs.writeFileSync(out, JSON.stringify(records, null, 2));
  console.log(`records=${records.length}`);
})();
