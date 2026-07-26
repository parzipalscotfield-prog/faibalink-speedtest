const startBtn = document.getElementById("startBtn");

const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const latencyEl = document.getElementById("latency");
const jitterEl = document.getElementById("jitter");

const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");


// ========================================
// TEST SETTINGS
// ========================================

const DOWNLOAD_URL = "/speed-test.bin";

// 5 MB upload
const UPLOAD_SIZE = 5 * 1024 * 1024;


// ========================================
// HELPERS
// ========================================

function phase(text) {
  phaseEl.textContent = text;
}

function status(text) {
  statusEl.textContent = text;
}

function showSpeed(value) {
  if (!Number.isFinite(value)) {
    speedEl.textContent = "0.0";
    return;
  }

  speedEl.textContent = value.toFixed(1);
}

function speedMbps(bytes, milliseconds) {
  if (bytes <= 0 || milliseconds <= 0) {
    return 0;
  }

  return (
    (bytes * 8) /
    (milliseconds / 1000) /
    1000000
  );
}


// ========================================
// LATENCY / PING
// ========================================

async function measureLatency(samples = 10) {

  const times = [];

  for (let i = 0; i < samples; i++) {

    const start = performance.now();

    try {

      const response = await fetch(
        `/ping?t=${Date.now()}-${Math.random()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Ping failed");
      }

      await response.text();

      const elapsed =
        performance.now() - start;

      times.push(elapsed);

      status(
        `Measuring latency... ${elapsed.toFixed(1)} ms`
      );

    } catch (error) {

      console.error("Latency sample failed:", error);
    }
  }

  if (times.length < 3) {
    throw new Error("Not enough latency samples");
  }

  const sorted = [...times].sort(
    (a, b) => a - b
  );

  // Average latency
  const average =
    times.reduce(
      (sum, value) => sum + value,
      0
    ) / times.length;

  // Median is useful as the ping figure
  const middle =
    Math.floor(sorted.length / 2);

  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    average,
    median,
    samples: times
  };
}


// ========================================
// JITTER
// ========================================

function calculateJitter(times) {

  if (times.length < 2) {
    return 0;
  }

  let totalDifference = 0;

  for (let i = 1; i < times.length; i++) {

    totalDifference += Math.abs(
      times[i] - times[i - 1]
    );
  }

  return (
    totalDifference /
    (times.length - 1)
  );
}


// ========================================
// DOWNLOAD TEST
// ========================================

async function measureDownload() {

  phase("DOWNLOAD");

  status(
    "Connecting to FAIBALINK speed test server..."
  );

  const start = performance.now();

  const response = await fetch(
    `${DOWNLOAD_URL}?t=${Date.now()}-${Math.random()}`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("Download test failed");
  }

  if (!response.body) {
    throw new Error(
      "Browser does not support streaming downloads"
    );
  }

  const reader =
    response.body.getReader();

  let totalBytes = 0;

  let lastBytes = 0;
  let lastTime = start;

  while (true) {

    const {
      done,
      value
    } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    const now =
      performance.now();

    // Update gauge every 100 ms
    if (now - lastTime >= 100) {

      const intervalBytes =
        totalBytes - lastBytes;

      const intervalTime =
        now - lastTime;

      const currentSpeed =
        speedMbps(
          intervalBytes,
          intervalTime
        );

      showSpeed(currentSpeed);

      const elapsed =
        now - start;

      status(
        `Downloading... ${currentSpeed.toFixed(1)} Mbps`
      );

      lastBytes = totalBytes;
      lastTime = now;
    }
  }

  // IMPORTANT:
  // Final result uses the COMPLETE transfer.
  const elapsed =
    performance.now() - start;

  const finalSpeed =
    speedMbps(
      totalBytes,
      elapsed
    );

  showSpeed(finalSpeed);

  return finalSpeed;
}


// ========================================
// UPLOAD TEST
// ========================================

function measureUpload() {

  return new Promise(
    (resolve, reject) => {

      phase("UPLOAD");

      status(
        "Preparing upload test..."
      );

      // Generate random-looking data so
      // compression cannot make the test artificial.
      const data =
        new Uint8Array(UPLOAD_SIZE);

      if (window.crypto?.getRandomValues) {

        const chunkSize = 65536;

        for (
          let offset = 0;
          offset < data.length;
          offset += chunkSize
        ) {

          const end =
            Math.min(
              offset + chunkSize,
              data.length
            );

          window.crypto.getRandomValues(
            data.subarray(offset, end)
          );
        }

      } else {

        for (
          let i = 0;
          i < data.length;
          i++
        ) {
          data[i] =
            Math.floor(Math.random() * 256);
        }
      }


      const xhr =
        new XMLHttpRequest();

      const start =
        performance.now();


      xhr.open(
        "POST",
        `/upload?t=${Date.now()}-${Math.random()}`,
        true
      );

      xhr.setRequestHeader(
        "Content-Type",
        "application/octet-stream"
      );

      xhr.setRequestHeader(
        "Cache-Control",
        "no-cache"
      );


      // --------------------------------
      // REAL UPLOAD PROGRESS
      // --------------------------------

      xhr.upload.onprogress =
        function (event) {

          if (!event.lengthComputable) {
            return;
          }

          const now =
            performance.now();

          const elapsed =
            now - start;

          if (elapsed <= 0) {
            return;
          }

          const bytesSent =
            event.loaded;

          const currentSpeed =
            speedMbps(
              bytesSent,
              elapsed
            );

          showSpeed(currentSpeed);

          const percent =
            (event.loaded /
              event.total) *
            100;

          status(
            `Uploading... ${percent.toFixed(0)}% • ${currentSpeed.toFixed(1)} Mbps`
          );
        };


      // --------------------------------
      // UPLOAD COMPLETE
      // --------------------------------

      xhr.onload =
        function () {

          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {

            reject(
              new Error(
                `Upload failed: HTTP ${xhr.status}`
              )
            );

            return;
          }

          const elapsed =
            performance.now() - start;

          // Final upload speed is based on
          // the COMPLETE payload.
          const finalSpeed =
            speedMbps(
              data.byteLength,
              elapsed
            );

          showSpeed(finalSpeed);

          resolve(finalSpeed);
        };


      xhr.onerror =
        function () {

          reject(
            new Error(
              "Network error during upload"
            )
          );
        };


      xhr.ontimeout =
        function () {

          reject(
            new Error(
              "Upload timed out"
            )
          );
        };


      xhr.timeout = 30000;


      // Start actual upload
      xhr.send(data);
    }
  );
}


// ========================================
// MAIN SPEED TEST
// ========================================

async function runTest() {

  startBtn.disabled = true;

  // Reset results
  showSpeed(0);

  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";
  latencyEl.textContent = "—";
  jitterEl.textContent = "—";


  try {

    // ====================================
    // PING / LATENCY / JITTER
    // ====================================

    phase("PING");

    status(
      "Measuring latency..."
    );

    const latencyResult =
      await measureLatency(10);


    const latency =
      latencyResult.average;

    const ping =
      latencyResult.median;

    const jitter =
      calculateJitter(
        latencyResult.samples
      );


    pingEl.textContent =
      Math.round(ping);

    latencyEl.textContent =
      latency.toFixed(1);

    jitterEl.textContent =
      jitter.toFixed(1);


    // ====================================
    // DOWNLOAD
    // ====================================

    const download =
      await measureDownload();

    downloadEl.textContent =
      download.toFixed(1);

    showSpeed(download);


    // ====================================
    // UPLOAD
    // ====================================

    const upload =
      await measureUpload();

    uploadEl.textContent =
      upload.toFixed(1);

    showSpeed(upload);


    // ====================================
    // COMPLETE
    // ====================================

    phase("COMPLETE");

    status(
      `Test complete • ${download.toFixed(1)} Mbps down • ${upload.toFixed(1)} Mbps up`
    );

  } catch (error) {

    console.error(error);

    phase("ERROR");

    status(
      "Test failed. Please try again."
    );
  }


  startBtn.disabled = false;
}


// ========================================
// START
// ========================================

startBtn.addEventListener(
  "click",
  runTest
);
