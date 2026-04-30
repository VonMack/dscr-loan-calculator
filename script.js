let currentMode = "monthly";
let gaugeChart = null;
let lastData = null;

function moneyToNumber(value) {
  return parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function updateLabels() {
  const prefix = currentMode === "monthly" ? "Monthly" : "Annual";
  document.getElementById("incomeLabel").innerText = `${prefix} Rental Income`;
  document.getElementById("mortgageLabel").innerText = `${prefix} P&I`;
  document.getElementById("taxesLabel").innerText = `${prefix} Taxes`;
  document.getElementById("insuranceLabel").innerText = `${prefix} Insurance`;
  document.getElementById("hoaLabel").innerText = `${prefix} HOA`;

  document.getElementById("rent").placeholder =
    currentMode === "monthly" ? "$2,500.00" : "$30,000.00";
  document.getElementById("mortgage").placeholder =
    currentMode === "monthly" ? "$1,500.00" : "$18,000.00";
  document.getElementById("taxes").placeholder =
    currentMode === "monthly" ? "$250.00" : "$3,000.00";
  document.getElementById("insurance").placeholder =
    currentMode === "monthly" ? "$120.00" : "$1,440.00";
  document.getElementById("hoa").placeholder =
    currentMode === "monthly" ? "$75.00" : "$900.00";
}

function setActiveMode(mode) {
  currentMode = mode;
  document.getElementById("monthlyBtn").classList.toggle("active", mode === "monthly");
  document.getElementById("annualBtn").classList.toggle("active", mode === "annual");
  updateLabels();
}

function createChart() {
  const ctx = document.getElementById("dscrChart").getContext("2d");
  gaugeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Coverage", "Remaining"],
      datasets: [{
        data: [0, 1],
        backgroundColor: ["#2563eb", "#e2e8f0"],
        borderWidth: 0,
        cutout: "78%"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

function updateChart(dscr) {
  const capped = Math.max(0, Math.min(dscr, 2));
  const remaining = Math.max(0, 2 - capped);
  const color =
    dscr >= 1.35 ? "#16a34a" :
    dscr >= 1.25 ? "#22c55e" :
    dscr >= 1.1 ? "#f59e0b" :
    dscr >= 1.0 ? "#fb923c" : "#ef4444";

  gaugeChart.data.datasets[0].data = [capped, remaining];
  gaugeChart.data.datasets[0].backgroundColor = [color, "#e2e8f0"];
  gaugeChart.update();
}

function getStatus(dscr) {
  if (dscr >= 1.35) return ["Very Strong Eligibility", "strong"];
  if (dscr >= 1.25) return ["Strong Eligibility", "strong"];
  if (dscr >= 1.1) return ["Moderate Eligibility", "moderate"];
  if (dscr >= 1.0) return ["Borderline Eligibility", "borderline"];
  return ["Weak Eligibility", "weak"];
}

function calculateDSCR() {
  const rentInput = document.getElementById("rent");
  const mortgageInput = document.getElementById("mortgage");
  const taxesInput = document.getElementById("taxes");
  const insuranceInput = document.getElementById("insurance");
  const hoaInput = document.getElementById("hoa");

  const rentError = document.getElementById("rentError");
  const resultCard = document.getElementById("resultCard");
  const dscrResult = document.getElementById("dscrResult");
  const statusPill = document.getElementById("statusPill");
  const summaryLines = document.getElementById("summaryLines");
  const exportStatus = document.getElementById("exportStatus");

  rentError.innerText = "";
  exportStatus.innerText = "";

  let rent = moneyToNumber(rentInput.value);
  let mortgage = moneyToNumber(mortgageInput.value);
  let taxes = moneyToNumber(taxesInput.value);
  let insurance = moneyToNumber(insuranceInput.value);
  let hoa = moneyToNumber(hoaInput.value);

  if (currentMode === "annual") {
    rent /= 12;
    mortgage /= 12;
    taxes /= 12;
    insurance /= 12;
    hoa /= 12;
  }

  if (rent <= 0) {
    resultCard.style.display = "none";
    rentError.innerText = "Rent should be greater than 0.";
    updateChart(0);
    return;
  }

  const pitia = mortgage + taxes + insurance + hoa;
  if (pitia <= 0) {
    resultCard.style.display = "none";
    updateChart(0);
    return;
  }

  const dscr = rent / pitia;
  lastData = { mode: currentMode, rent, mortgage, taxes, insurance, hoa, pitia, dscr };

  const [statusText, statusClass] = getStatus(dscr);

  dscrResult.innerText = `DSCR: ${dscr.toFixed(2)}`;
  statusPill.innerText = statusText;
  statusPill.className = `status-pill ${statusClass}`;

  summaryLines.innerHTML = `
  <div><strong>Mode:</strong> ${currentMode === "monthly" ? "Monthly" : "Annual (normalized to monthly)"}</div>
  <div><strong>Rent:</strong> ${formatMoney(rent)}</div>
  <div><strong>P&I:</strong> ${formatMoney(mortgage)}</div>
  <div><strong>Taxes:</strong> ${formatMoney(taxes)}</div>
  <div><strong>Insurance:</strong> ${formatMoney(insurance)}</div>
  <div><strong>HOA:</strong> ${formatMoney(hoa)}</div>
  <div><strong>Total PITIA:</strong> ${formatMoney(pitia)}</div>
  <div><strong>PITIA:</strong> Principal, Interest, Taxes, Insurance, & Association dues </div>
  <div><strong>Formula:</strong> Rent ÷ PITIA = ${rent.toFixed(2)} ÷ ${pitia.toFixed(2)}</div>
`;


  resultCard.style.display = "block";
  updateChart(dscr);
}

function buildTextReport() {
  if (!lastData) return "";
  return [
    "DSCR Mini Underwriting Summary",
    "-----------------------------",
    `Mode: ${lastData.mode === "monthly" ? "Monthly" : "Annual (normalized to monthly)"}`,
    `Rent: ${formatMoney(lastData.rent)}`,
    `P&I: ${formatMoney(lastData.mortgage)}`,
    `Taxes: ${formatMoney(lastData.taxes)}`,
    `Insurance: ${formatMoney(lastData.insurance)}`,
    `HOA: ${formatMoney(lastData.hoa)}`,
    `Total PITIA: ${formatMoney(lastData.pitia)}`,
    `DSCR: ${lastData.dscr.toFixed(2)}`
  ].join("\n");
}

function copyResults() {
  const exportStatus = document.getElementById("exportStatus");
  const text = buildTextReport();
  if (!text) {
    exportStatus.style.color = "#b91c1c";
    exportStatus.innerText = "Calculate DSCR first.";
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    exportStatus.style.color = "#15803d";
    exportStatus.innerText = "Summary copied to clipboard.";
  });
}

function downloadText() {
  const text = buildTextReport();
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dscr-summary.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV() {
  if (!lastData) return;
  const rows = [
    ["Field", "Value"],
    ["Mode", lastData.mode],
    ["Rent", lastData.rent],
    ["P&I", lastData.mortgage],
    ["Taxes", lastData.taxes],
    ["Insurance", lastData.insurance],
    ["HOA", lastData.hoa],
    ["Total PITIA", lastData.pitia],
    ["DSCR", lastData.dscr.toFixed(2)]
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dscr-summary.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", function () {
  createChart();
  updateLabels();

  document.getElementById("monthlyBtn").addEventListener("click", function () {
    setActiveMode("monthly");
  });

  document.getElementById("annualBtn").addEventListener("click", function () {
    setActiveMode("annual");
  });

  document.getElementById("calcBtn").addEventListener("click", calculateDSCR);
  document.getElementById("copyBtn").addEventListener("click", copyResults);
  document.getElementById("textBtn").addEventListener("click", downloadText);
  document.getElementById("csvBtn").addEventListener("click", downloadCSV);  
});
