const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Allow large upload requests
app.use(express.raw({
  type: "*/*",
  limit: "20mb"
}));

// Serve website
app.use(express.static(path.join(__dirname, "public")));

// Fast ping endpoint
app.get("/ping", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  res.status(200).send("OK");
});

// Upload test endpoint
app.post("/upload", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  res.status(200).send("OK");
});

// Generate download data
app.get("/speed-test.bin", (req, res) => {
  const size = 5 * 1024 * 1024; // 5 MB

  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": size,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  const chunk = Buffer.alloc(64 * 1024);

  let remaining = size;

  function sendChunk() {
    while (remaining > 0) {
      const currentSize = Math.min(chunk.length, remaining);
      remaining -= currentSize;

      if (!res.write(chunk.subarray(0, currentSize))) {
        res.once("drain", sendChunk);
        return;
      }
    }

    res.end();
  }

  sendChunk();
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`FAIBALINK Speed Test running on port ${PORT}`);
});
