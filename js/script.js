document.addEventListener("DOMContentLoaded", function () {
  const table = $("#containerTable").DataTable();
  const baseId = "appxekctFAWmMVFzc";
  const tableName = "data-cont";
  const token = "Bearer patiH2AOAO9YAtJhA.61cafc7228a34200466c4235f324b0a9368cf550d04e83656db17d3374ec35d4";

  function renderRow(row, index) {
    const feet = row["FEET"]?.trim().toUpperCase();
    const packageVal = row["PACKAGE"]?.trim().toUpperCase();

    let np20 = "", np40 = "", p20 = "", p40 = "";

    if (feet === '1X20' && packageVal === 'BAG') np20 = '✔';
    else if (feet === '1X40' && packageVal === 'BAG') np40 = '✔';
    else if (feet === '1X20' && packageVal !== 'BAG') p20 = '✔';
    else if (feet === '1X40' && packageVal !== 'BAG') p40 = '✔';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${row["NO CONTAINER"] || ""}</td>
        <td>${feet || ""}</td>
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
        rows.forEach((row, i) => {
          const html = renderRow(row, i);
          table.row.add($(html));
        });
        table.draw();
      })
      .catch(err => console.error("Airtable error:", err));
  }

  async function deleteAllAirtableRecords() {
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?pageSize=100`;

    const response = await fetch(url, {
      headers: { Authorization: token }
    });
    const data = await response.json();
    if (!data.records) return;

    const recordIds = data.records.map(rec => rec.id);
    const chunks = [];

    for (let i = 0; i < recordIds.length; i += 10) {
      chunks.push(recordIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records: chunk })
      });
    }

    console.log("Semua data lama berhasil dihapus.");
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
        await deleteAllAirtableRecords();
        uploadToAirtable(rows)
          .then(() => {
            alert("✅ Data berhasil dikirim ke Airtable!");
            loadAirtableData();
          })
          .catch(err => {
            console.error("Upload error:", err);
            alert("❌ Gagal upload ke Airtable.");
          });
      }
    });
  }

  document.getElementById("csvFile").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) parseAndUploadCSV(file);
  });

  loadAirtableData();
});
