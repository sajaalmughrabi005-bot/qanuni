// Tiny helper to deep-merge translation keys into src/messages/<locale>/<file>.json
const fs = require("fs");
const path = require("path");
function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] && typeof target[k] === "object" ? target[k] : {}, v);
    } else target[k] = v;
  }
  return target;
}
function merge(locale, file, obj) {
  const p = path.join(__dirname, "../../src/messages", locale, file + ".json");
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  deepMerge(json, obj);
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + "\n");
}
module.exports = { merge };
