const startBtn = document.getElementById("startBtn");

const speedEl = document.getElementById("speed");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");
const latencyEl = document.getElementById("latency");
const jitterEl = document.getElementById("jitter");

const phaseEl = document.getElementById("phase");
const statusEl = document.getElementById("status");


// ------------------------------------
// SETTINGS
// ------------------------------------

const DOWNLOAD_STREAMS = 4;
const UPLOAD_STREAMS = 4;

const DOWNLOAD_SIZE_MB = 10;
const UPLOAD_SIZE_MB = 2;

const DOWNLOAD_URL = "/speed-test.bin";


// ------------------------------------
// UI
// ------------------------------------

function phase(text) {
  phaseEl.textContent = text;
}

function status(text) {
  statusEl.textContent = text;
}

function showSpeed(value) {
  if (!Number.isFinite(value)) return;

  speedEl.textContent = value.toFixed(1);
}


// ------------------------------------
// SPEED CALCULATION
// ------------------------------------

function speedMbps(bytes, milliseconds) {

  if (
    !Number.isFinite(bytes) ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return 0;
  }

  return (
    bytes * 8 /
    (milliseconds / 1000) /
    1000000
  );
}


// ------------------------------------
// LATENCY + JITTER
// ------------------------------------

async function measureLatency(samples = 10) {

  const times = [];

  for (let i = 0; i < samples; i++) {

    const start = performance.now();

    const response = await fetch(
      `/ping?t=${Date.now()}-${Math.random()}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Ping test failed");
    }

    const elapsed = performance.now() - start;

    times.push(elapsed);

    status(
      `Latency test ${i + 1}/${samples} • ${elapsed.toFixed(1)} ms`
    );
  }

  const average =
    times.reduce(
      (sum, value) => sum + value,
      0
    ) / times.length;


  // Jitter = average absolute difference
  // between consecutive latency samples.

  let jitterTotal = 0;

  for (let i = 1; i < times.length; i++) {

    jitterTotal += Math.abs(
      times[i] - times[i - 1]
    );
  }

  const jitter =
    times.length > 1
      ? jitterTotal / (times.length - 1)
      : 0;


  return {
    average,
    jitter,
    samples: times
  };
}


// ------------------------------------
// DOWNLOAD STREAM
// ------------------------------------

async function downloadStream(streamId, sizeMB, onProgress) {

  const url =
    `${DOWNLOAD_URL}?size=${sizeMB}` +
    `&stream=${streamId}` +
    `&t=${Date.now()}-${Math.random()}`;


  const response = await fetch(url, {
    cache: "no-store"
  });


  if (!response.ok) {
    throw new Error("Download stream failed");
  }


  if (!response.body) {
    throw new Error("Streaming is not supported");
  }


  const reader =
    response.body.getReader();


  let bytes = 0;


  while (true) {

    const {
      done,
      value
    } = await reader.read();


    if (done) break;


    bytes += value.byteLength;


    onProgress(value.byteLength);
  }


  return bytes;
}


// ------------------------------------
// DOWNLOAD TEST
// ------------------------------------

async function measureDownload() {

  phase("DOWNLOAD");

  status(
    "Starting download test..."
  );


  let totalBytes = 0;

  const start =
    performance.now();


  let lastUpdate =
    start;


  const streams = [];


  for (
    let i = 0;
    i < DOWNLOAD_STREAMS;
    i++
  ) {

    streams.push(
      downloadStream(
        i,
        DOWNLOAD_SIZE_MB,
        bytes => {

          totalBytes += bytes;


          const now =
            performance.now();


          if (
            now - lastUpdate >= 100
          ) {

            const elapsed =
              now - start;


            const currentSpeed =
              speedMbps(
                totalBytes,
                elapsed
              );


            showSpeed(
              currentSpeed
            );


            status(
              `Downloading... ${currentSpeed.toFixed(1)} Mbps`
            );


            lastUpdate = now;
          }
        }
      )
    );
  }


  await Promise.all(streams);


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


// ------------------------------------
// UPLOAD STREAM
// ------------------------------------

function uploadStream(
  streamId,
  sizeMB,
  onProgress
) {

  return new Promise(
    (resolve, reject) => {

      const xhr =
        new XMLHttpRequest();


      const size =
        Math.floor(
          sizeMB *
          1024 *
          1024
        );


      const data =
        new Uint8Array(size);


      xhr.open(
        "POST",
        `/upload?stream=${streamId}&t=${Date.now()}-${Math.random()}`,
        true
      );


      xhr.setRequestHeader(
        "Content-Type",
        "application/octet-stream"
      );


      xhr.upload.onprogress =
        event => {

          if (!event.lengthComputable) {
            return;
          }


          onProgress(
            event.loaded
          );
        };


      xhr.onload = () => {

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {

          resolve(
            size
          );

        } else {

          reject(
            new Error(
              "Upload stream failed"
            )
          );
        }
      };


      xhr.onerror = () => {

        reject(
          new Error(
            "Upload connection failed"
          )
        );
      };


      xhr.send(data);
    }
  );
}


// ------------------------------------
// UPLOAD TEST
// ------------------------------------

async function measureUpload() {

  phase("UPLOAD");

  status(
    "Starting upload test..."
  );


  const start =
    performance.now();


  let totalBytes = 0;

  let lastReportedBytes = 0;

  let lastUpdate =
    start;


  const streams = [];


  for (
    let i = 0;
    i < UPLOAD_STREAMS;
    i++
  ) {

    streams.push(
      uploadStream(
        i,
        UPLOAD_SIZE_MB,
        loaded => {

          const difference =
            loaded -
            lastReportedBytes;


          if (difference > 0) {

            totalBytes +=
              difference;


            lastReportedBytes =
              loaded;
          }


          const now =
            performance.now();


          if (
            now - lastUpdate >= 100
          ) {

            const elapsed =
              now - start;


            const currentSpeed =
              speedMbps(
                totalBytes,
                elapsed
              );


            showSpeed(
              currentSpeed
            );


            status(
              `Uploading... ${currentSpeed.toFixed(1)} Mbps`
            );


            lastUpdate =
              now;
          }
        }
      )
    );
  }


  await Promise.all(streams);


  const elapsed =
    performance.now() - start;


  const expectedBytes =
    UPLOAD_STREAMS *
    UPLOAD_SIZE_MB *
    1024 *
    1024;


  const finalSpeed =
    speedMbps(
      expectedBytes,
      elapsed
    );


  showSpeed(
    finalSpeed
  );


  return finalSpeed;
}


// ------------------------------------
// MAIN TEST
// ------------------------------------

async function runTest() {

  startBtn.disabled = true;


  speedEl.textContent =
    "0.0";


  downloadEl.textContent =
    "—";

  uploadEl.textContent =
    "—";

  pingEl.textContent =
    "—";

  latencyEl.textContent =
    "—";

  jitterEl.textContent =
    "—";


  try {

    // ================================
    // LATENCY
    // ================================

    phase("PING");

    status(
      "Finding network response time..."
    );


    const latencyResult =
      await measureLatency(10);


    const latency =
      latencyResult.average;


    const jitter =
      latencyResult.jitter;


    pingEl.textContent =
      Math.round(latency);


    latencyEl.textContent =
      latency.toFixed(1);


    jitterEl.textContent =
      jitter.toFixed(1);


    // ================================
    // DOWNLOAD
    // ================================

    const download =
      await measureDownload();


    downloadEl.textContent =
      download.toFixed(1);


    // ================================
    // UPLOAD
    // ================================

    const upload =
      await measureUpload();


    uploadEl.textContent =
      upload.toFixed(1);


    // ================================
    // COMPLETE
    // ================================

    phase("COMPLETE");


    status(
      `Test complete • ` +
      `${latency.toFixed(1)} ms latency • ` +
      `${jitter.toFixed(1)} ms jitter`
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


startBtn.addEventListener(
  "click",
  runTest
);
