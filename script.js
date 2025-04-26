
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    console.log('CSV Content:', text);
    // TODO: Kirim data ke Google Sheets via API / Apps Script
  };
  reader.readAsText(file);
}

function updateStatus(rowId) {
  const row = document.getElementById(rowId);
  const timeIn = row.querySelector('.time-in').textContent;
  const unloadingTime = row.querySelector('.unloading-time').textContent;
  const finish = row.querySelector('.finish').textContent;
  const statusCell = row.querySelector('.status-cell');

  if (finish.trim() !== '') {
    statusCell.textContent = 'Unloading process already done';
    row.className = 'data-row status-Done';
  } else if (unloadingTime.trim() !== '') {
    statusCell.textContent = 'Processing';
    row.className = 'data-row status-Processing';
  } else if (timeIn.trim() !== '') {
    statusCell.textContent = 'Waiting';
    row.className = 'data-row status-Waiting';
  } else {
    statusCell.textContent = 'Planning';
    row.className = 'data-row status-Planning';
  }
}

function updateAllStatuses() {
  const rows = document.querySelectorAll('.data-row');
  rows.forEach(row => updateStatus(row.id));
}

window.onload = updateAllStatuses;
