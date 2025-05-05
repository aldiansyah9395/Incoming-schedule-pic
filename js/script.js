document.addEventListener("DOMContentLoaded", function () {
  const table = $("#containerTable").DataTable();
  const baseId = "appxekctFAWmMVFzc";
  const tableName = "data-cont";
  const token = "Bearer patiH2AOAO9YAtJhA.61cafc7228a34200466c4235f324b0a9368cf550d04e83656db17d3374ec35d4";

  const csvInput = document.getElementById("csvFile");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadStatus = document.getElementById("uploadStatus");
  let selectedFile = null;
  let airtableRecords = {};

  function showStatus(message, type = "info") {
    uploadStatus.textContent = message;
    uploadStatus.className = `status ${type}`;
  }

  function getStatusProgress(timeIn, unloadingTime, finish) {
  timeIn = typeof timeIn === 'string' ? timeIn.trim() : (timeIn ? String(timeIn).trim() : "");
  unloadingTime = typeof unloadingTime === 'string' ? unloadingTime.trim() : (unloadingTime ? String(unloadingTime).trim() : "");
  finish = typeof finish === 'string' ? finish.trim() : (finish ? String(finish).trim() : "");

  const allEmpty = [timeIn, unloadingTime, finish].every(val => val === "");
  const allDash = [timeIn, unloadingTime, finish].every(val => val === "-");

  if (allEmpty) return "Outstanding";
  if (allDash) return "Reschedule";
  if (timeIn && timeIn !== "-" && (!unloadingTime || unloadingTime === "-")) return "Waiting";
  if (timeIn && unloadingTime && timeIn !== "-" && unloadingTime !== "-" && (!finish || finish === "-")) return "Processing";
  if (timeIn && unloadingTime && finish && timeIn !== "-" && unloadingTime !== "-" && finish !== "-") return "Finish";

  return "";
}
  
  function renderRow(row, index, id) {
    if (!row || !row["FEET"] || !row["PACKAGE"]) return "";

    const feet = row["FEET"].trim().toUpperCase();
    const packageVal = row["PACKAGE"].trim().toUpperCase();
    let np20 = "", np40 = "", p20 = "", p40 = "";
    const isBag = packageVal.includes("BAG");

    if (feet === '1X20' && isBag) np20 = '✔';
    else if (feet === '1X40' && isBag) np40 = '✔';
    else if (feet === '1X20' && !isBag) p20 = '✔';
    else if (feet === '1X40' && !isBag) p40 = '✔';

    const status = getStatusProgress(row["TIME IN"], row["UNLOADING TIME"], row["FINISH"]);
    console.log("Record time values:", row["TIME IN"], row["UNLOADING TIME"], row["FINISH"]);

    return `
      <tr data-id="${id}">
        <td>${index + 1}</td>
        <td>${row["NO CONTAINER"] || ""}</td>
        <td>${feet}</td>
        <td>${np20}</td>
        <td>${np40}</td>
        <td>${p20}</td>
        <td>${p40}</td>
        <td>${row["INVOICE NO"] || ""}</td>
        <td>${row["PACKAGE"] || ""}</td>
        <td>${row["INCOMING PLAN"] || ""}</td>
        <td class="status-progress">${status}</td>
        <td contenteditable class="editable time-in">${row["TIME IN"] === "-" ? "" : (row["TIME IN"] || "")}</td>
        <td contenteditable class="editable unloading-time">${row["UNLOADING TIME"] === "-" ? "" : (row["UNLOADING TIME"] || "")}</td>
        <td contenteditable class="editable finish">${row["FINISH"] === "-" ? "" : (row["FINISH"] || "")}</td>
      </tr>
    `;
  }

  function ensureAllFieldsAreStrings(record) {
    const result = {};
    for (const key in record) {
      result[key] = record[key] !== null && record[key] !== undefined ? String(record[key]) : "";
    }
    return result;
  }

  function loadAirtableData() {
    fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`, {
      headers: { Authorization: token }
    })
      .then(res => res.json())
      .then(data => {
        table.clear();
        airtableRecords = {};

        data.records.forEach((record, i) => {
          const html = renderRow(record.fields, i, record.id);
          airtableRecords[record.id] = record.fields;
          if (html) table.row.add($(html));
        });

        table.draw();
      })
      .catch(err => console.error("❌ Gagal ambil data dari Airtable:", err));
  }

  function sanitizeTime(value) {
    const val = value?.trim();
    return val === "" ? "-" : val;
  }

  function updateAirtableField(recordId, timeInRaw, unloadingTimeRaw, finishRaw) {
    const timeIn = sanitizeTime(timeInRaw);
    const unloadingTime = sanitizeTime(unloadingTimeRaw);
    const finish = sanitizeTime(finishRaw);
    const status = getStatusProgress(timeIn, unloadingTime, finish);

    const payload = {
      fields: {
        "TIME IN": timeIn,
        "UNLOADING TIME": unloadingTime,
        "FINISH": finish,
      }
    };

    fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${recordId}`, {
      method: "PATCH",
      headers: {
        Authorization: token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(() => {
        const row = document.querySelector(`tr[data-id='${recordId}']`);
        if (row) row.querySelector(".status-progress").textContent = status;
      })
      .catch(err => {
        console.error("❌ Update error:", err);
        alert("Gagal mengupdate data ke Airtable. Cek console untuk detail.");
      });
  }

  document.addEventListener("blur", function (e) {
    if (e.target.classList.contains("editable")) {
      const row = e.target.closest("tr");
      const recordId = row.dataset.id;

      const timeIn = row.querySelector(".time-in").textContent.trim() || "-";
      const unloading = row.querySelector(".unloading-time").textContent.trim() || "-";
      const finish = row.querySelector(".finish").textContent.trim() || "-";

      updateAirtableField(recordId, timeIn, unloading, finish);
    }
  }, true);

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
      records: chunk.map(rawFields => {
        const fields = ensureAllFieldsAreStrings(rawFields);
        // JANGAN TAMBAHKAN "STATUS PROGRESS" KARENA SUDAH DIHAPUS DARI AIRTABLE
        return { fields };
      })
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
          showStatus("🗑 Menghapus data lama dari Databse", "info");
          await deleteAllAirtableRecords();

          showStatus("📤 Mengupload data baru ke Database...", "info");
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
