
const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");

let running = false;

function setSpeed(value) {
  speedEl.textContent = Number(value).toFixed(1);
}

function setPhase(text) {
  phaseEl.textContent = text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measurePing() {
  const samples = [];

  for (let i = 0; i < 5; i++) {
    const start = performance.now();

    try {
      await fetch(`/api/ping?t=${Date.now()}-${i}`, {
        cache: "no-store"
      });

      samples.push(performance.now() - start);
    } catch (error) {
      console.error("Ping error:", error);
    }
  }

  if (!samples.length) {
    throw new Error("Ping test failed");
  }

  samples.sort((a, b) => a - b);

  // Ignore the slowest sample.
  const useful = samples.slice(0, Math.max(1, samples.length - 1));

  const average =
    useful.reduce((sum, value) => sum + value, 0) / useful.length;

  return average;
}

async function measureDownload() {
  const connections = 4;
  const results = [];

  const start = performance.now();

  async function downloadWorker(worker) {
    let bytes = 0;

    try {
      const response = await fetch(
        `/api/download?size=25000000&worker=${worker}&t=${Date.now()}-${worker}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Download request failed");
      }

      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        bytes += value.byteLength;

        const elapsed = (performance.now() - start) / 1000;

        if (elapsed > 0) {
          const mbps = (bytes * 8) / elapsed / 1000000;
          setSpeed(mbps);
        }
      }
    } catch (error) {
      console.error(`Download worker ${worker}:`, error);
    }

    return bytes;
  }

  for (let i = 0; i < connections; i++) {
    results.push(downloadWorker(i));
  }

  const bytes = (await Promise.all(results)).reduce(
    (sum, value) => sum + value,
    0
  );

  const seconds = (performance.now() - start) / 1000;

  if (!bytes || !seconds) {
    throw new Error("Download test failed");
  }

  return (bytes * 8) / seconds / 1000000;
}

async function measureUpload() {
  const connections = 3;
  const size = 12000000;

  const data = new Uint8Array(size);

  // Fill with deterministic data.
  for (let i = 0; i < data.length; i += 4096) {
    data[i] = i % 255;
  }

  const start = performance.now();

  async function uploadWorker(worker) {
    try {
      await fetch(
        `/api/upload?worker=${worker}&t=${Date.now()}-${worker}`,
        {
          method: "POST",
          body: data,
          cache: "no-store"
        }
      );
    } catch (error) {
      console.error(`Upload worker ${worker}:`, error);
    }
  }

  const jobs = [];

  for (let i = 0; i < connections; i++) {
    jobs.push(uploadWorker(i));
  }

  await Promise.all(jobs);

  const seconds = (performance.now() - start) / 1000;
  const totalBytes = size * connections;

  if (!seconds) {
    throw new Error("Upload test failed");
  }

  return (totalBytes * 8) / seconds / 1000000;
}

async function runTest() {
  if (running) return;

  running = true;
  startBtn.disabled = true;

  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";

  try {
    // PING
    setPhase("PING");
    statusEl.textContent = "Checking connection latency...";

    const ping = await measurePing();

    pingEl.textContent = Math.round(ping);

    await sleep(500);

    // DOWNLOAD
    setPhase("DOWNLOAD");
    statusEl.textContent = "Measuring download speed...";

    const download = await measureDownload();

    downloadEl.textContent = download.toFixed(1);
    setSpeed(download);

    await sleep(700);

    // UPLOAD
    setPhase("UPLOAD");
    statusEl.textContent = "Measuring upload speed...";

    const upload = await measureUpload();

    uploadEl.textContent = upload.toFixed(1);
    setSpeed(upload);

    await sleep(500);

    // FINISHED
    setPhase("COMPLETE");
    statusEl.textContent =
      "Speed test complete. Thanks for using FAIBALINK.";

    // Keep the download result in the main gauge.
    setSpeed(download);

  } catch (error) {
    console.error(error);

    setPhase("ERROR");
    statusEl.textContent =
      "Unable to complete the speed test. Please try again.";

    setSpeed(0);

  } finally {
    startBtn.disabled = false;
    running = false;
  }
}

startBtn.addEventListener("click", runTest);
