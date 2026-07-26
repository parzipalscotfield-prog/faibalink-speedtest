const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public")));

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
// UPLOAD
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
// DOWNLOAD
// ------------------------------------

app.get("/speed-test.bin", (req, res) => {

  noCache(res);

  let sizeMB = Number(req.query.size) || 10;

  // Safety limits
  sizeMB = Math.max(1, Math.min(sizeMB, 50));

  const DOWNLOAD_SIZE = Math.floor(sizeMB * 1024 * 1024);

  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": DOWNLOAD_SIZE,
    "Content-Encoding": "identity",
    "X-Content-Type-Options": "nosniff"
  });

  const chunk = Buffer.alloc(64 * 1024);

  let remaining = DOWNLOAD_SIZE;

  function sendChunk() {

    while (remaining > 0) {

      const amount = Math.min(
        chunk.length,
        remaining
      );

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


// ------------------------------------
// START
// ------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `FAIBALINK Speed Test running on port ${PORT}`
  );
});
