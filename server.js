const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const publicDir = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Ping test
  if (url.pathname === "/ping") {
    res.writeHead(204);
    return res.end();
  }

  // Download test
  if (url.pathname === "/download") {
    const bytes = Math.min(
      Number(url.searchParams.get("bytes")) || 12 * 1024 * 1024,
      100 * 1024 * 1024
    );

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": bytes
    });

    const chunk = Buffer.alloc(64 * 1024);
    let sent = 0;

    function send() {
      while (sent < bytes) {
        const remaining = bytes - sent;

        const piece =
          remaining >= chunk.length
            ? chunk
            : chunk.subarray(0, remaining);

        sent += piece.length;

        if (!res.write(piece)) {
          return res.once("drain", send);
        }
      }

      res.end();
    }

    return send();
  }

  // Upload test
  if (url.pathname === "/upload" && req.method === "POST") {
    let received = 0;

    req.on("data", chunk => {
      received += chunk.length;
    });

    req.on("end", () => {
      res.writeHead(200, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({ received }));
    });

    return;
  }

  // Website files
  let file = url.pathname === "/" ? "/index.html" : url.pathname;

  const filePath = path.normalize(
    path.join(publicDir, file)
  );

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(filePath);

    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript"
    };

    res.writeHead(200, {
      "Content-Type":
        types[ext] || "application/octet-stream"
    });

    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(
    `FAIBALINK Speed Test running on port ${PORT}`
  );
});
