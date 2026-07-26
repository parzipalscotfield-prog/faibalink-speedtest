const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Allow large upload requests
app.use(express.raw({
  type: "*/*",
  limit: "100mb"
}));

// Serve website files
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// PING
// -------------------------

app.get("/api/ping", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache"
  });

  res.status(204).end();
});

// -------------------------
// DOWNLOAD
// -------------------------

app.get("/api/download", (req, res) => {

  const requestedSize = parseInt(req.query.size, 10) || 25000000;

  // Protect server from unnecessarily huge requests
  const size = Math.min(requestedSize, 50000000);

  const chunkSize = 1024 * 1024;

  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": size,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff"
  });

  const chunk = Buffer.alloc(chunkSize);

  let sent = 0;

  function sendChunk() {

    while (sent < size) {

      const remaining = size - sent;
      const currentSize = Math.min(chunkSize, remaining);

      const ok = res.write(
        currentSize === chunkSize
          ? chunk
          : chunk.subarray(0, currentSize)
      );

      sent += currentSize;

      if (!ok) {
        res.once("drain", sendChunk);
        return;
      }
    }

    res.end();
  }

  sendChunk();
});

// -------------------------
// UPLOAD
// -------------------------

app.post("/api/upload", (req, res) => {

  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache"
  });

  res.status(204).end();
});

// -------------------------
// START SERVER
// -------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FAIBALINK Speed Test running on port ${PORT}`);
});
