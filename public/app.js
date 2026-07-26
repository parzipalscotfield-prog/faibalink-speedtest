const startBtn = document.getElementById("startBtn");
const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");

const TEST_SIZE = 5 * 1024 * 1024; // 5 MB
const TEST_FILE = "/speed-test.bin";

function setPhase(text) {
  phaseEl.textContent = text;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function formatSpeed(mbps) {
  return mbps.toFixed(1);
}

async function measurePing(samples = 5) {
  const results = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    try {
      await fetch(`/ping?t=${Date.now()}-${Math.random()}`, {
        cache: "no-store",
        method: "GET"
      });

      results.push(performance.now() - start);
    } catch (error) {
      console.error("Ping error:", error);
    }
  }

  if (!results.length) return null;

  return results.reduce((a, b) => a + b, 0) / results.length;
}

async function measureJitter(samples = 8) {
  const results = [];

  for (let i = 0; i < samples; i++) {
    const start = performance.now();

    try {
      await fetch(`/ping?t=${Date.now()}-${Math.random()}`, {
        cache: "no-store",
        method: "GET"
      });

      results.push(performance.now() - start);
    } catch (error) {
      console.error("Jitter error:", error);
    }
  }

  if (results.length < 2) return null;

  let totalDifference = 0;

  for (let i = 1; i < results.length; i++) {
    totalDifference += Math.abs(results[i] - results[i - 1]);
  }

  return totalDifference / (results.length - 1);
}

async function measureDownload() {
  setPhase("DOWNLOAD");
  setStatus("Testing download speed...");

  const start = performance.now();

  const response = await fetch(
    `${TEST_FILE}?cache=${Date.now()}-${Math.random()}`,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error("Download test failed");
  }

  const data = await response.arrayBuffer();

  const duration = (performance.now() - start) / 1000;

  const megabits = (data.byteLength * 8) / 1000000;
  const mbps = megabits / duration;

  return mbps;
}

async function measureUpload() {
  setPhase("UPLOAD");
  setStatus("Testing upload speed...");

  const data = new Uint8Array(TEST_SIZE);

  const start = performance.now();

  const response = await fetch(`/upload?t=${Date.now()}`, {
    method: "POST",
    body: data,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Upload test failed");
  }

  const duration = (performance.now() - start) / 1000;

  const megabits = (data.byteLength * 8) / 1000000;
  const mbps = megabits / duration;

  return mbps;
}

async function runTest() {
  startBtn.disabled = true;

  speedEl.textContent = "0.0";
  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";

  try {
    // PING
    setPhase("PING");
    setStatus("Checking connection latency...");

    const ping = await measurePing();

    if (ping !== null) {
      pingEl.textContent = ping.toFixed(0);
    }

    // DOWNLOAD
    const download = await measureDownload();

    downloadEl.textContent = formatSpeed(download);
    speedEl.textContent = formatSpeed(download);

    // UPLOAD
    const upload = await measureUpload();

    uploadEl.textContent = formatSpeed(upload);

    // JITTER
    setPhase("JITTER");
    setStatus("Measuring connection stability...");

    const jitter = await measureJitter();

    // Show jitter temporarily in status
    if (jitter !== null) {
      setStatus(
        `Test complete • Ping ${ping?.toFixed(0) ?? "—"} ms • Jitter ${jitter.toFixed(1)} ms`
      );
    } else {
      setStatus("Test complete.");
    }

    setPhase("COMPLETE");

  } catch (error) {
    console.error(error);

    setPhase("ERROR");
    setStatus("Speed test failed. Please try again.");
  }

  startBtn.disabled = false;
}

startBtn.addEventListener("click", runTest);
