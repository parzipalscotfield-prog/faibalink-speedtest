const speed = document.getElementById("speed");
const phase = document.getElementById("phase");
const status = document.getElementById("status");

const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const pingEl = document.getElementById("ping");

const startBtn = document.getElementById("startBtn");


function showSpeed(value, stage) {

  speed.textContent = value.toFixed(1);
  phase.textContent = stage;

}


async function pingTest() {

  const results = [];

  for (let i = 0; i < 5; i++) {

    const start = performance.now();

    await fetch(
      "/ping?test=" + Date.now() + "_" + i,
      {
        cache: "no-store"
      }
    );

    const time = performance.now() - start;

    results.push(time);

  }

  results.sort((a, b) => a - b);

  return results[2];

}


async function downloadTest() {

  const size = 12 * 1024 * 1024;

  const start = performance.now();

  const response = await fetch(
    "/download?bytes=" + size + "&t=" + Date.now(),
    {
      cache: "no-store"
    }
  );

  const reader = response.body.getReader();

  let received = 0;

  while (true) {

    const result = await reader.read();

    if (result.done) break;

    received += result.value.byteLength;

    const seconds =
      (performance.now() - start) / 1000;

    const mbps =
      (received * 8 / seconds) / 1000000;

    showSpeed(mbps, "DOWNLOAD");

  }

  const seconds =
    (performance.now() - start) / 1000;

  return (received * 8 / seconds) / 1000000;

}


async function uploadTest() {

  const size = 6 * 1024 * 1024;

  const data = new Uint8Array(size);

  const start = performance.now();

  await fetch(
    "/upload?t=" + Date.now(),
    {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/octet-stream"
      },
      cache: "no-store"
    }
  );

  const seconds =
    (performance.now() - start) / 1000;

  return (size * 8 / seconds) / 1000000;

}


startBtn.addEventListener("click", async () => {

  startBtn.disabled = true;

  downloadEl.textContent = "—";
  uploadEl.textContent = "—";
  pingEl.textContent = "—";

  status.textContent =
    "Testing your FAIBALINK connection...";


  try {

    // PING

    showSpeed(0, "PING");

    const ping = await pingTest();

    pingEl.textContent =
      ping.toFixed(0);


    // DOWNLOAD

    const download =
      await downloadTest();

    downloadEl.textContent =
      download.toFixed(1);


    // UPLOAD

    showSpeed(0, "UPLOAD");

    const upload =
      await uploadTest();

    uploadEl.textContent =
      upload.toFixed(1);


    // COMPLETE

    showSpeed(download, "DONE");

    status.textContent =
      "Test complete!";


  } catch (error) {

    console.error(error);

    phase.textContent = "ERROR";

    status.textContent =
      "Speed test failed. Please try again.";

  }


  startBtn.disabled = false;

});
