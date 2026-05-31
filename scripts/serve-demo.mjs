import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("artifacts/component-one-showcase");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

http.createServer((req, res) => {
  const url = req.url === "/" ? "/index.html" : decodeURI(req.url);
  const file = path.join(root, url);

  // Security: ensure we don't serve outside the demo directory
  if (!file.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const content = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found: " + url);
  }
}).listen(8080, () => {
  console.log("👉 http://localhost:8080");
});
