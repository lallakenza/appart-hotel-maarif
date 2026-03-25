// ============================================================
// CHARTS LAYER — Chart.js visualizations, reads computed STATE
// ============================================================

const CHART_COLORS = {
  primary:      "#1e3a5f",
  primaryLight: "#3b7dd8",
  gold:         "#b45309",
  green:        "#16a34a",
  red:          "#dc2626",
  amber:        "#d97706",
  gray:         "#94a3b8",
  blue:         "#2563eb",
};

let _charts = {};

function destroyChart(key) {
  if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
}

function rebuildCharts(state) {
  chartBudget(state);
  chartMontage(state);
  chartRevenueEvolution(state);
  chartRevenueBreakdown(state);
  chartChargesBreakdown(state);
  chartRevenusVsCharges(state);
  chartDebtService(state);
  chartCashFlow(state);
  chartOccupancy();
  chartSensitivity(state);
  chartIS(state);
}

// --- Budget pie ---
function chartBudget(S) {
  destroyChart("budget");
  const ctx = document.getElementById("chart-budget")?.getContext("2d");
  if (!ctx) return;
  _charts.budget = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Terrain + Frais", "Construction", "Ameublement"],
      datasets: [{ data: [S.terrain.coutTerrain, S.terrain.budgetConstruction, S.budget.ameublement], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.amber] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: ctx => ctx.label + ": " + fmtMAD(ctx.parsed) } } } }
  });
}

// --- Montage pie ---
function chartMontage(S) {
  destroyChart("montage");
  const ctx = document.getElementById("chart-montage")?.getContext("2d");
  if (!ctx) return;
  _charts.montage = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Apport (Terrain)", "Tamwilkom", "Banque classique", "Subvention MDM"],
      datasets: [{ data: [S.financement.apportTerrain, S.financement.montantTamwilkom, S.financement.montantBanque, S.financement.subventionMDM], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.primaryLight, CHART_COLORS.green] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: ctx => ctx.label + ": " + fmtMAD(ctx.parsed) } } } }
  });
}

// --- Revenue evolution ---
function chartRevenueEvolution(S) {
  destroyChart("revEvolution");
  const ctx = document.getElementById("chart-rev-evolution")?.getContext("2d");
  if (!ctx) return;
  _charts.revEvolution = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "Revenus hôtel (net)", data: S.projections.map(p => p.revNetHotel), backgroundColor: CHART_COLORS.primary, stack: "rev" },
        { label: "Local commercial",    data: S.projections.map(p => p.revCommercial), backgroundColor: CHART_COLORS.gold, stack: "rev" },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}

// --- Revenue breakdown An1 ---
function chartRevenueBreakdown(S) {
  destroyChart("revBreakdown");
  const ctx = document.getElementById("chart-rev-breakdown")?.getContext("2d");
  if (!ctx) return;
  const y1 = S.projections[0];
  _charts.revBreakdown = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Studios", "Lofts", "Local commercial"],
      datasets: [{ data: [y1.revStudios, y1.revLofts, y1.revCommercial], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.gold] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: ctx => ctx.label + ": " + fmtMAD(ctx.parsed) } } } }
  });
}

// --- Charges breakdown ---
function chartChargesBreakdown(S) {
  destroyChart("chargesBreak");
  const ctx = document.getElementById("chart-charges-breakdown")?.getContext("2d");
  if (!ctx) return;
  const ch = S.projections[0].chargesDetail;
  _charts.chargesBreak = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Ménage", "Utilities", "Salaires", "Assurance", "Entretien", "Taxes", "Divers"],
      datasets: [{ data: [ch.menage, ch.utilities, ch.salaires, ch.assurance, ch.entretien, ch.taxesPro, ch.divers],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.green, CHART_COLORS.gold, CHART_COLORS.amber, CHART_COLORS.red, CHART_COLORS.gray] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: ctx => ctx.label + ": " + fmtMAD(ctx.parsed) } } } }
  });
}

// --- Revenus vs Charges bar ---
function chartRevenusVsCharges(S) {
  destroyChart("revVsCh");
  const ctx = document.getElementById("chart-rev-vs-charges")?.getContext("2d");
  if (!ctx) return;
  _charts.revVsCh = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "Revenus",  data: S.projections.map(p => p.revTotal),     backgroundColor: CHART_COLORS.primary },
        { label: "Charges",  data: S.projections.map(p => p.chargesTotal), backgroundColor: CHART_COLORS.red },
        { label: "EBITDA",   data: S.projections.map(p => p.ebitda),       backgroundColor: CHART_COLORS.green },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}

// --- Debt service ---
function chartDebtService(S) {
  destroyChart("debt");
  const ctx = document.getElementById("chart-debt")?.getContext("2d");
  if (!ctx) return;
  _charts.debt = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "Tamwilkom (2,5%)", data: S.projections.map(p => p.debtTK), backgroundColor: CHART_COLORS.gold, stack: "debt" },
        { label: "Banque (~4,25%)",  data: S.projections.map(p => p.debtBQ), backgroundColor: CHART_COLORS.primaryLight, stack: "debt" },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}

// --- Cash-flow ---
function chartCashFlow(S) {
  destroyChart("cashflow");
  const ctx = document.getElementById("chart-cashflow")?.getContext("2d");
  if (!ctx) return;
  _charts.cashflow = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "Cash-Flow Net",  data: S.projections.map(p => p.cashFlowNet),    backgroundColor: CHART_COLORS.green },
        { label: "Cumul",          data: S.projections.map(p => p.cumulCashFlow),   backgroundColor: CHART_COLORS.primary },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}

// --- Occupancy market ---
function chartOccupancy() {
  destroyChart("occupancy");
  const ctx = document.getElementById("chart-occupancy")?.getContext("2d");
  if (!ctx) return;
  _charts.occupancy = new Chart(ctx, {
    type: "bar",
    data: {
      labels: MARKET_DATA.occupancyBySegment.map(s => s.segment),
      datasets: [{ label: "Taux d'occupation", data: MARKET_DATA.occupancyBySegment.map(s => s.taux * 100), backgroundColor: [CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.gold, CHART_COLORS.green] }]
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { max: 80, ticks: { callback: v => v + "%" } } }, plugins: { legend: { display: false } } }
  });
}

// --- Sensitivity line ---
function chartSensitivity(S) {
  destroyChart("sensitivity");
  const ctx = document.getElementById("chart-sensitivity")?.getContext("2d");
  if (!ctx) return;
  _charts.sensitivity = new Chart(ctx, {
    type: "line",
    data: {
      labels: S.sensitivity.map(s => fmtPct(s.occ, 0)),
      datasets: [
        { label: "Revenu",     data: S.sensitivity.map(s => s.revenu),   borderColor: CHART_COLORS.primary, tension: 0.3, fill: false },
        { label: "EBITDA",     data: S.sensitivity.map(s => s.ebitda),   borderColor: CHART_COLORS.gold,    tension: 0.3, fill: false },
        { label: "Cash-Flow",  data: S.sensitivity.map(s => s.cashFlow), borderColor: CHART_COLORS.green,   tension: 0.3, fill: false },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}

// --- IS chart ---
function chartIS(S) {
  destroyChart("is");
  const ctx = document.getElementById("chart-is")?.getContext("2d");
  if (!ctx) return;
  _charts.is = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "IS payé",           data: S.projections.map(p => p.is),         backgroundColor: CHART_COLORS.red },
        { label: "Économie IS devises", data: S.projections.map(p => p.economieIS), backgroundColor: CHART_COLORS.green },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => fmtK(v) } } }, plugins: { tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + fmtMAD(ctx.parsed.y) } } } }
  });
}
