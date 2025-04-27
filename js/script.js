document.addEventListener('DOMContentLoaded', function () {
  const fileInput = document.getElementById('csvFile');
  const uploadBtn = document.getElementById('uploadBtn');
  const table = $('#containerTable').DataTable({
    columns: [
      { data: "No" },
      { data: "Container No" },
      { data: "Feet" },
      { data: "Unloading Type" },
      { data: "Invoice No" },
      { data: "Package" },
      { data: "Incoming Date" },
      { data: "Status" },
      { data: "Time In" },
      { data: "Unloading Time" },
      { data: "Finish" },
    ],
    paging: false,
    searching: false,
    info: false,
    ordering: false,
  });

  fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const parsedData = Papa.parse(text, { header: true }).data;

      // Sort berdasarkan Time In
      parsedData.sort((a, b) => {
        const timeA = a["Time In"] ? a["Time In"].split(":").map(Number) : [99, 99];
        const timeB = b["Time In"] ? b["Time In"].split(":").map(Number) : [99, 99];
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });

      // Update Status
      parsedData.forEach(row => {
        if (row["Finish"]) {
          row["Status"] = "Unloading process already done";
        } else if (row["Unloading Time"]) {
          row["Status"] = "Processing";
        } else if (row["Time In"]) {
          row["Status"] = "Waiting";
        } else {
          row["Status"] = "Planning";
        }
      });

      table.clear();
      table.rows.add(parsedData);
      table.draw();
    };
    reader.readAsText(file);
  });

  uploadBtn.addEventListener('click', function () {
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a CSV file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const parsedData = Papa.parse(text, { header: false }).data; // Header false biar semua ikut dikirim

      // Kirim ke Web App
      fetch('https://script.google.com/macros/s/AKfycby5vPXBTiDxkXo3Uc9SjXR0Pg52hKQ7qz69i7P18Yb8tGbHkdAXstypgNiA0Zmh8la7/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(parsedData)
      }).then(response => {
        alert('Upload sukses ke Google Sheets!');
      }).catch(error => {
        alert('Upload gagal: ' + error.message);
      });
    };
    reader.readAsText(file);
  });
});
