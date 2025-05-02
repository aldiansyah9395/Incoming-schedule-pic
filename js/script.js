document.addEventListener("DOMContentLoaded", function () {
  const table = $("#containerTable").DataTable();
  const baseId = "appxekctFAWmMVFzc";
  const tableName = "data-cont";
  const token = "Bearer patiH2AOAO9YAtJhA.61cafc7228a34200466c4235f324b0a9368cf550d04e83656db17d3374ec35d4";

  const csvInput = document.getElementById("csvFile");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadStatus = document.getElementById("uploadStatus");
  let selectedFile = null;

  function showStatus(message, type = "info") {
    uploadStatus.textContent = message;
    uploadStatus.className = `status ${type}`;
  }

  function renderRow(row, index) {
    if (!row || !row["FEET"] || !row["PACKAGE"]) return "";

    const feet = row["FEET"].trim().toUpperCase();
    const packageVal = row["PACKAGE"].trim().toUpperCase();

    let np20 = "", np40 = "", p20 = "", p40 = "";
    const isBag = packageVal.includes("BAG");

    if (feet === '1X20' && isBag) np20 = '✔';
    else if (feet === '1X40' && isBag) np40 = '✔';
    else if (feet === '1X20' && !isBag) p20 = '✔';
    else if (feet === '1X40' && !isBag) p40 = '✔';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${row["NO CONTAINER"] || ""}</td>
        <td>${feet}</td>
        <td>${np20}</td>
        <td>${np40}</td>
        <td>${p20}</td>
        <td>${p40}</td>
        <td>${row["INVOICENO"] || ""}</td>
        <td>${row["PACKAGE"] || ""}</td>
        <td>${row["INCOMING PLAN"] || ""}</td>
        <td>${row["STATUS PROGRESS"] || ""}</td>
        <td>${row["TIME IN"] || ""}</td>
        <td>${row["UNLOADING TIME"] || ""}</td>
        <td>${row["FINISH"] || ""}</td>
      </tr>
    `;
  }

  function loadAirtableData() {
    fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`, {
      headers: { Authorization: token }
    })
      .then(res => res.json())
      .then(data => {
        table.clear();
        const rows = data.records.map(r => r.fields);

        rows
          .filter(row => row["FEET"] && row["PACKAGE"])
          .forEach((row, i) => {
            const html = renderRow(row, i);
            if (html) table.row.add($(html));
          });

        table.draw();
      })
      .catch(err => console.error("❌ Gagal ambil data dari Airtable:", err));
  }

  async function deleteAllAirtableRecords() {
    const headers = {
      Authorization: token,
      "Content-Type": "application/json"
    };

    let allRecordIds = [];
    let offset = "";

    try {
      do {
        const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}${offset ? `?offset=${offset}` : ""}`, {
          headers: { Authorization: token }
        });
        const json = await res.json();

        if (json.records && json.records.length > 0) {
          const ids = json.records.map(r => r.id);
          allRecordIds.push(...ids);
          offset = json.offset || null;
        } else {
          offset = null;
        }
      } while (offset);

      for (let i = 0; i < allRecordIds.length; i += 10) {
        const batch = allRecordIds.slice(i, i + 10);

        if (batch.length === 0) continue;

        const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${batch.map(id => `records[]=${id}`).join("&")}`;

        const res = await fetch(url, {
          method: "DELETE",
          headers
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Gagal hapus batch:", res.status, errorText);
        }
      }
    } catch (err) {
      console.error("❌ Error saat menghapus semua record:", err);
    }
  }

  function uploadToAirtable(records) {
    const chunks = [];
    for (let i = 0; i < records.length; i += 10) {
      chunks.push(records.slice(i, i + 10));
    }

    const uploads = chunks.map(chunk => {
      const payload = {
        records: chunk.map(fields => ({ fields }))
      };

      return fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    });

    return Promise.all(uploads);
  }

  async function parseAndUploadCSV(file) {
    showStatus("⏳ Sedang memproses file CSV...", "info");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data;

        try {
          showStatus("🗑 Menghapus data lama dari Airtable...", "info");
          await deleteAllAirtableRecords();

          showStatus("📤 Mengupload data baru ke Airtable...", "info");
          await uploadToAirtable(rows);

          showStatus("✅ Upload selesai!", "success");
          loadAirtableData();
        } catch (err) {
          console.error(err);
          showStatus("❌ Gagal upload data!", "error");
        }
      }
    });
  }

  csvInput.addEventListener("change", function (e) {
    selectedFile = e.target.files[0];
    showStatus("📁 File siap diupload. Klik tombol Upload.", "info");
  });

  uploadBtn.addEventListener("click", function () {
    if (!selectedFile) {
      showStatus("⚠️ Silakan pilih file CSV terlebih dahulu!", "error");
      return;
    }

    parseAndUploadCSV(selectedFile);
  });

  loadAirtableData();
});
