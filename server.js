const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Serve website files
app.use(express.static(path.join(__dirname, "public")));

// Ping endpoint
app.get("/ping", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });

  res.status(200).send("OK");
});

// Upload endpoint
app.post(
  "/upload",
  express.raw({
    type: "application/octet-stream",
    limit: "5mb"
  }),
  (req, res) => {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });

    res.status(200).send("OK");
  }
);

// Download test
app.get("/speed-test.bin", (req, res) => {
  const size = 5 * 1024 * 1024;

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
      const amount = Math.min(chunk.length, remaining);
      remaining -= amount;

      if (!res.write(chunk.subarray(0, amount))) {
        res.once("drain", sendChunk);
        return;
      }
    }

    res.end();
  }

  sendChunk();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FAIBALINK Speed Test running on port ${PORT}`);
});
