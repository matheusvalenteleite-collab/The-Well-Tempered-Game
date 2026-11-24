// Builds two single-file pages from page.html + bowcore.js + app.js:
//   dist/artifact.html  (body fragment, for a claude.ai Artifact, which adds its own <head>)
//   dist/index.html     (complete page, for any static host)
const fs = require("fs"), path = require("path");
const dir = __dirname, rd = (f) => fs.readFileSync(path.join(dir, f), "utf8");
let page = rd("page.html");
for (const f of ["bowcore.js", "app.js"]) page = page.replace(`<script src="${f}"></script>`, () => `<script>\n${rd(f)}\n</script>`);
fs.mkdirSync(path.join(dir, "dist"), { recursive: true });
fs.writeFileSync(path.join(dir, "dist/artifact.html"), page);
const head = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black">\n`;
const [pre, ...rest] = page.split("</style>");
const headPart = pre + "</style>" + rest[0].slice(0, rest[0].indexOf("\n<div"));
const body = rest.join("</style>").slice(rest[0].indexOf("\n<div"));
fs.writeFileSync(path.join(dir, "dist/index.html"), head + headPart + "\n</head><body>" + body + "\n</body></html>\n");
console.log("built dist/artifact.html and dist/index.html");
