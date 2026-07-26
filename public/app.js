const startBtn = document.getElementById("startBtn");

const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const latencyEl = document.getElementById("latency");
const jitterEl = document.getElementById("jitter");

const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");

const UPLOAD_SIZE = 512 * 1024;
const DOWNLOAD_URL = "/speed-test.bin";

function phase(text) {
  phaseEl.textContent = text;
}

function status(text) {
  statusEl.textContent = text;
}

function speedMbps(bytes, milliseconds) {
  if (milliseconds <= 0) return 0;

  const bits = bytes * 8;
  const seconds = milliseconds / 1000;

  return bits / seconds / 1000000;
}

function showSpeed(value) {
  speedEl.textContent = Number(value).toFixed(1);
}

async function measureLatency(samples = 8) {
  const times = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    await fetch(`/ping?t=${Date.now()}-${Math.random()}`, {
      method: "GET",
      cache: "no-store"
    });

    const time = performance.now() - start;
    times.push(time);

    // Show the current ping while testing
    showSpeed(0);
    status(`Measuring latency... ${time.toFixed(1)} ms`);
  }

  const average =
    times.reduce((sum, value) => sum + value, 0) / times.length;

  return {
    average,
    samples: times
  };
}

function calculateJitter(times) {
  if (times.length < 2) return 0;

  let total = 0;

  for (let i = 1; i < times.length; i++) {
    total += Math.abs(times[i] - times[i - 1]);
  }

  return total / (times.length - 1);
}


// ================================
// DOWNLOAD TEST
// ================================

async function measureDownload() {
  phase("DOWNLOAD");
  status("Testing download speed...");

  const start = performance.now();

  const response = await fetch(
    `${DOWNLOAD_URL}?t=${Date.now()}-${Math.random()}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("Download test failed");
  }

  if (!response.body) {
    throw new Error("Streaming download not supported");
  }

  const reader = response.body.getReader();

  let totalBytes = 0;
  let lastUpdate = start;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    totalBytes += value.byteLength;

    const now = performance.now();
    const elapsed = now - start;

    // Update gauge continuously
    if (now - lastUpdate >= 100) {
      const currentSpeed = speedMbps(totalBytes, elapsed);

      showSpeed(currentSpeed);

      status(
        `Downloading... ${currentSpeed.toFixed(1)} Mbps`
      );

      lastUpdate = now;
    }
  }

  const elapsed = performance.now() - start;

  const finalSpeed = speedMbps(totalBytes, elapsed);

  showSpeed(finalSpeed);

  return finalSpeed;
}


// ================================
// UPLOAD TEST
// ================================

async function measureUpload() {
  phase("UPLOAD");
  status("Testing upload speed...");

  const data = new Uint8Array(UPLOAD_SIZE);

  const start = performance.now();

  // Start upload
  const uploadPromise = fetch(
    `/upload?t=${Date.now()}-${Math.random()}`,
    {
      method: "POST",
      body: data,
      cache: "no-store"
    }
  );

  // Animate gauge while upload is happening
  let animationRunning = true;

  const updateGauge = async () => {
    while (animationRunning) {
      const elapsed = performance.now() - start;

      if (elapsed > 100) {
        const estimatedSpeed = speedMbps(
          data.byteLength,
          elapsed
        );

        showSpeed(estimatedSpeed);

        status(
          `Uploading... ${estimatedSpeed.toFixed(1)} Mbps`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  updateGauge();

  const response = await uploadPromise;

  animationRunning = false;

  if (!response.ok) {
    throw new Error("Upload test failed");
  }

  const elapsed = performance.now() - start;

  const finalSpeed = speedMbps(
    data.byteLength,
    elapsed
  );

  showSpeed(finalSpeed);

  return finalSpeed;
}


// ================================
// MAIN TEST
// ================================

async function runTest() {
  startBtn.disabled = true;

  speedEl.textContent = "0.0";

  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";
  latencyEl.textContent = "—";
  jitterEl.textContent = "—";

  try {

    // ----------------------------
    // PING / LATENCY / JITTER
    // ----------------------------

    phase("PING");
    status("Measuring latency...");

    const latencyResult = await measureLatency(8);

    const latency = latencyResult.average;

    const jitter = calculateJitter(
      latencyResult.samples
    );

    pingEl.textContent = Math.round(latency);

    latencyEl.textContent =
      latency.toFixed(1);

    jitterEl.textContent =
      jitter.toFixed(1);


    // ----------------------------
    // DOWNLOAD
    // ----------------------------

    const download = await measureDownload();

    downloadEl.textContent =
      download.toFixed(1);

    showSpeed(download);


    // ----------------------------
    // UPLOAD
    // ----------------------------

    const upload = await measureUpload();

    uploadEl.textContent =
      upload.toFixed(1);

    showSpeed(upload);


    // ----------------------------
    // COMPLETE
    // ----------------------------

    phase("COMPLETE");

    status(
      `Test complete • ${latency.toFixed(1)} ms latency • ${jitter.toFixed(1)} ms jitter`
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


// START BUTTON

startBtn.addEventListener(
  "click",
  runTest
);
