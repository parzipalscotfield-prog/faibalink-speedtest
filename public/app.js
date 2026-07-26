const startBtn = document.getElementById("startBtn");

const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const latencyEl = document.getElementById("latency");
const jitterEl = document.getElementById("jitter");

const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");

const UPLOAD_SIZE = 512 * 1024; // 512 KB
const DOWNLOAD_URL = "/speed-test.bin";

function phase(text) {
  phaseEl.textContent = text;
}

function status(text) {
  statusEl.textContent = text;
}

function speedMbps(bytes, milliseconds) {
  const bits = bytes * 8;
  const seconds = milliseconds / 1000;

  return bits / seconds / 1000000;
}

async function measureLatency(samples = 5) {
  const times = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    await fetch(`/ping?t=${Date.now()}-${Math.random()}`, {
      method: "GET",
      cache: "no-store"
    });

    const time = performance.now() - start;
    times.push(time);
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

  const data = await response.arrayBuffer();

  const elapsed = performance.now() - start;

  return speedMbps(data.byteLength, elapsed);
}

async function measureUpload() {
  phase("UPLOAD");
  status("Testing upload speed...");

  const data = new Uint8Array(UPLOAD_SIZE);

  const start = performance.now();

  const response = await fetch(
    `/upload?t=${Date.now()}-${Math.random()}`,
    {
      method: "POST",
      body: data,
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("Upload test failed");
  }

  const elapsed = performance.now() - start;

  return speedMbps(data.byteLength, elapsed);
}

async function runTest() {
  startBtn.disabled = true;

  speedEl.textContent = "0.0";
  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";
  latencyEl.textContent = "—";
  jitterEl.textContent = "—";

  try {
    // LATENCY + PING
    phase("PING");
    status("Measuring latency...");

    const latencyResult = await measureLatency(5);

    const latency = latencyResult.average;
    const jitter = calculateJitter(latencyResult.samples);

    pingEl.textContent = Math.round(latency);
    latencyEl.textContent = latency.toFixed(1);
    jitterEl.textContent = jitter.toFixed(1);

    // DOWNLOAD
    const download = await measureDownload();

    downloadEl.textContent = download.toFixed(1);
    speedEl.textContent = download.toFixed(1);

    // UPLOAD
    const upload = await measureUpload();

    uploadEl.textContent = upload.toFixed(1);

    // COMPLETE
    phase("COMPLETE");

    status(
      `Test complete • ${latency.toFixed(1)} ms latency • ${jitter.toFixed(1)} ms jitter`
    );

  } catch (error) {
    console.error(error);

    phase("ERROR");
    status("Test failed. Please try again.");
  }

  startBtn.disabled = false;
}

startBtn.addEventListener("click", runTest);
