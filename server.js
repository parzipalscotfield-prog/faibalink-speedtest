const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// ------------------------------------
// WEBSITE
// ------------------------------------

app.use(express.static(path.join(__dirname, "public")));


// ------------------------------------
// NO-CACHE HEADERS
// ------------------------------------

function noCache(res) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });
}


// ------------------------------------
// PING / LATENCY
// ------------------------------------

app.get("/ping", (req, res) => {
  noCache(res);

  res.set("Content-Type", "text/plain");
  res.status(200).send("OK");
});


// ------------------------------------
// UPLOAD TEST
// ------------------------------------

app.post(
  "/upload",
  express.raw({
    type: "*/*",
    limit: "20mb"
  }),
  (req, res) => {
    noCache(res);

    res.set({
      "Content-Type": "text/plain",
      "Content-Length": "2"
    });

    res.status(200).send("OK");
  }
);


// ------------------------------------
// DOWNLOAD TEST
// ------------------------------------

// 10 MB test file
const DOWNLOAD_SIZE = 10 * 1024 * 1024;

// Reusable 64 KB chunk
const chunk = Buffer.alloc(64 * 1024);

app.get("/speed-test.bin", (req, res) => {

  noCache(res);

  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": DOWNLOAD_SIZE,
    "Content-Encoding": "identity",
    "X-Content-Type-Options": "nosniff"
  });

  let remaining = DOWNLOAD_SIZE;

  function sendChunk() {

    while (remaining > 0) {

      const amount = Math.min(
        chunk.length,
        remaining
      );

      remaining -= amount;

      const canContinue = res.write(
        chunk.subarray(0, amount)
      );

      if (!canContinue) {
        res.once("drain", sendChunk);
        return;
      }
    }

    res.end();
  }

  sendChunk();
});


// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `FAIBALINK Speed Test running on port ${PORT}`
  );
});
