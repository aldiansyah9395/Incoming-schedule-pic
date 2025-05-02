document.addEventListener("DOMContentLoaded", function () {
  const table = $("#containerTable").DataTable();
  const baseId = "appxekctFAWmMVFzc";
  const tableName = "data-cont";
  const token = "Bearer patiH2AOAO9YAtJhA.61cafc7228a34200466c4235f324b0a9368cf550d04e83656db17d3374ec35d4";

  function renderRow(row, index) {
    if (!row || !row["FEET"] || !row["PACKAGE"]) return ""; // Lewati data rusak

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
        console.log("✔ Records loaded:", rows.length);
      })
      .catch(err => console.error("Airtable error:", err));
  }

  async function deleteAllAirtableRecords() {
    let allRecordIds = [];
    let offset = null;
    const headers = { Authorization: token };

    // Ambil semua ID record dari semua halaman
    do {
      let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`;
      if (offset) url += `&offset=${offset}`;

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.records) {
        const ids = data.records.map(rec => rec.id);
        allRecordIds.push(...ids);
        offset = data.offset;
      } else {
        offset = null;
      }
    } while (offset);

    console.log(`🧹 Total record ditemukan: ${allRecordIds.length}`);

    // Hapus semua ID dalam batch 10
    for (let i = 0; i < allRecordIds.length; i += 10) {
      const batch = allRecordIds.slice(i, i + 10);
      const deleteRes = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: batch })
      });

      const result = await deleteRes.json();
      console.log(`✅ Dihapus ${result.records?.length || 0} record`);
    }

    console.log("✅ Semua record lama berhasil dihapus.");
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
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const rows = results.data;
        await deleteAllAirtableRecords();      // Hapus semua data lama
        await uploadToAirtable(rows);          // Upload data baru
        alert("✅ Data berhasil dikirim ke Airtable!");
        loadAirtableData();                    // Tampilkan di halaman
      }
    });
  }

  document.getElementById("csvFile").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) parseAndUploadCSV(file);
  });

  // Jalankan saat pertama kali halaman dibuka
  loadAirtableData();
});
