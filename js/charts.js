// ============================================================
// CHARTS LAYER — Chart.js visualizations with rich tooltips
// ============================================================
//
// CHANGELOG:
// 28/03/2026 — Label chart dette dynamique (taux banque réel au lieu de "~5,25%" en dur)
// 27/03/2026 — Création initiale
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
  teal:         "#0d9488",
};

let _charts = {};
let _currentState = null;

function destroyChart(key) {
  if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
}

function rebuildCharts(state) {
  _currentState = state;
  chartBudget(state);
  chartMontage(state);
  chartRevenueEvolution(state);
  chartRevenueBreakdown(state);
  chartChargesBreakdown(state);
  chartRevenusVsCharges(state);
  chartDebtService(state);
  chartCashFlow(state);
  chartCFWaterfall(state);
  chartOccupancy();
  chartSensitivity(state);
  chartIS(state);
  chartAlternatives(state);
  chartRendementEvolution(state);
  chartCRD(state);
}

// ======================== RICH TOOLTIP SYSTEM ========================

function getOrCreateTooltip(chart) {
  let el = chart.canvas.parentNode.querySelector('.ct-tooltip');
  if (!el) {
    el = document.createElement('div');
    el.className = 'ct-tooltip';
    chart.canvas.parentNode.style.position = 'relative';
    chart.canvas.parentNode.appendChild(el);
  }
  return el;
}

function externalTooltip(context, contentFn) {
  const { chart, tooltip } = context;
  const el = getOrCreateTooltip(chart);

  if (tooltip.opacity === 0) {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    return;
  }

  const idx = tooltip.dataPoints?.[0]?.dataIndex;
  if (idx == null) return;

  el.innerHTML = contentFn(idx, tooltip.dataPoints);
  el.style.opacity = '1';
  el.style.pointerEvents = 'none';

  // Position relative to chart canvas parent
  const rect = chart.canvas.getBoundingClientRect();
  const parentRect = chart.canvas.parentNode.getBoundingClientRect();
  const caretX = tooltip.caretX;
  const caretY = tooltip.caretY;

  // Measure tooltip
  el.style.visibility = 'hidden';
  el.style.display = 'block';
  const ttW = el.offsetWidth;
  const ttH = el.offsetHeight;
  el.style.visibility = '';

  // Flip if near right edge
  let left = caretX + 16;
  if (caretX + ttW + 32 > rect.width) {
    left = caretX - ttW - 16;
  }
  left = Math.max(4, Math.min(left, rect.width - ttW - 4));

  let top = caretY - ttH / 2;
  top = Math.max(4, Math.min(top, rect.height - ttH - 4));

  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

// ======================== CHARTS ========================

// --- Budget pie ---
function chartBudget(S) {
  destroyChart("budget");
  const ctx = document.getElementById("chart-budget")?.getContext("2d");
  if (!ctx) return;
  _charts.budget = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Terrain + Frais", "Construction", "Ameublement"],
      datasets: [{
        data: [S.terrain.coutTerrain, S.terrain.budgetConstruction - S.budget.ameublement, S.budget.ameublement],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.amber]
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => c.label + ": " + fmtMAD(c.parsed) + " (" + fmtPct(c.parsed / S.budget.totalProjet, 0) + ")" } }
      }
    }
  });
}

// --- Montage financier pie ---
function chartMontage(S) {
  destroyChart("montage");
  const ctx = document.getElementById("chart-montage")?.getContext("2d");
  if (!ctx) return;
  _charts.montage = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Apport (Terrain)", "Tamwilkom", "Banque classique"],
      datasets: [{
        data: [S.financement.apportTerrain, S.financement.montantTamwilkom, S.financement.montantBanque],
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.gold, CHART_COLORS.primaryLight]
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => c.label + ": " + fmtMAD(c.parsed) + " (" + fmtPct(c.parsed / S.budget.totalProjet, 0) + ")" } }
      }
    }
  });
}

// --- Revenue evolution with RICH TOOLTIP ---
function chartRevenueEvolution(S) {
  destroyChart("revEvolution");
  const ctx = document.getElementById("chart-rev-evolution")?.getContext("2d");
  if (!ctx) return;
  _charts.revEvolution = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [
        { label: "Studios (net)", data: S.projections.map(p => p.revBrutHotel > 0 ? p.revNetHotel * (p.revStudios / p.revBrutHotel) : 0), backgroundColor: CHART_COLORS.primary, stack: "rev" },
        { label: "Lofts (net)",   data: S.projections.map(p => p.revBrutHotel > 0 ? p.revNetHotel * (p.revLofts / p.revBrutHotel) : 0), backgroundColor: CHART_COLORS.primaryLight, stack: "rev" },
        { label: "Commercial",    data: S.projections.map(p => p.revCommercial), backgroundColor: CHART_COLORS.gold, stack: "rev" },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { stacked: true, ticks: { callback: v => fmtK(v) } }, x: { stacked: true } },
      plugins: {
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const p = S.projections[idx];
            const sc = SCENARIOS[_currentState.scenario];
            const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, idx);
            const pxS = Math.round(sc.prixNuitStudio * Math.pow(1.03, idx));
            const pxL = Math.round(sc.prixNuitLoft * Math.pow(1.03, idx));
            return `<div class="ctt-title">An ${p.year} — Revenus</div>
              <div class="ctt-row"><span>🏠 Studios (${S.units.nbStudios} × ${pxS} MAD/n)</span><span class="ctt-val">${fmtK(p.revStudios)}</span></div>
              <div class="ctt-row"><span>🏢 Lofts (${S.units.nbLofts} × ${pxL} MAD/n)</span><span class="ctt-val">${fmtK(p.revLofts)}</span></div>
              <div class="ctt-row ctt-sub"><span>Commissions plateformes (15%)</span><span class="ctt-val ctt-neg">-${fmtK(p.commissions)}</span></div>
              <div class="ctt-row"><span>🏪 Local commercial</span><span class="ctt-val">${fmtK(p.revCommercial)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>Revenu Total Net</span><span class="ctt-val">${fmtMAD(p.revTotal)}</span></div>
              ${idx > 0 ? '<div class="ctt-row ctt-sub"><span>Croissance vs An 1</span><span class="ctt-val">+' + fmtPct((p.revTotal / S.projections[0].revTotal) - 1, 1) + '</span></div>' : ''}`;
          })
        }
      }
    }
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
      labels: ["Studios (brut)", "Lofts (brut)", "Local commercial"],
      datasets: [{ data: [y1.revStudios, y1.revLofts, y1.revCommercial], backgroundColor: [CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.gold] }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { callbacks: { label: c => { const tot = y1.revBrutHotel + y1.revCommercial; return c.label + ": " + fmtMAD(c.parsed) + " (" + fmtPct(c.parsed / tot, 0) + ")"; } } }
      }
    }
  });
}

// --- Charges breakdown (FIXED — was referencing ch.menage which doesn't exist) ---
function chartChargesBreakdown(S) {
  destroyChart("chargesBreak");
  const ctx = document.getElementById("chart-charges-breakdown")?.getContext("2d");
  if (!ctx) return;
  const ch = S.projections[0].chargesDetail;
  const total = S.projections[0].chargesTotal;
  _charts.chargesBreak = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [`Gestion (${Math.round(CHARGES.tauxGestion*100)}%)`, "Salaires", "Utilities", "Consommables", "Comptable", "Assurance", "Entretien", "Taxes pro", "Divers"],
      datasets: [{
        data: [ch.gestion, ch.salaires, ch.utilities, ch.consommables, ch.comptable, ch.assurance, ch.entretien, ch.taxesPro, ch.divers],
        backgroundColor: [CHART_COLORS.red, CHART_COLORS.primary, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.gray, CHART_COLORS.gold, CHART_COLORS.amber, CHART_COLORS.primaryLight, "#cbd5e1"]
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, padding: 10 } },
        tooltip: { callbacks: { label: c => c.label + ": " + fmtMAD(c.parsed) + "/an (" + fmtPct(c.parsed / total, 0) + ")" } }
      }
    }
  });
}

// --- Revenus vs Charges with BREAKDOWN + RICH TOOLTIP ---
let _revChBreakdown = true; // default: show breakdown

function chartRevenusVsCharges(S) {
  destroyChart("revVsCh");
  const ctx = document.getElementById("chart-rev-vs-charges")?.getContext("2d");
  if (!ctx) return;

  let datasets;
  if (_revChBreakdown) {
    datasets = [
      // Revenue stack
      { label: "Studios", data: S.projections.map(p => p.revStudios - (p.commissions * p.revStudios / p.revBrutHotel)), backgroundColor: "#1e3a5f", stack: "rev" },
      { label: "Lofts", data: S.projections.map(p => p.revLofts - (p.commissions * p.revLofts / p.revBrutHotel)), backgroundColor: "#3b6b9a", stack: "rev" },
      { label: "Local commercial", data: S.projections.map(p => p.revCommercial), backgroundColor: "#6b9fd4", stack: "rev" },
      // Charges stack
      { label: `Gestion (${Math.round(CHARGES.tauxGestion*100)}%)`, data: S.projections.map(p => p.chargesDetail.gestion), backgroundColor: "#dc2626", stack: "ch" },
      { label: "Salaires", data: S.projections.map(p => p.chargesDetail.salaires), backgroundColor: "#ef4444", stack: "ch" },
      { label: "Utilities", data: S.projections.map(p => p.chargesDetail.utilities), backgroundColor: "#f87171", stack: "ch" },
      { label: "Autres charges", data: S.projections.map(p => { const c = p.chargesDetail; return c.consommables + c.comptable + c.assurance + c.entretien + c.taxesPro + c.divers; }), backgroundColor: "#fca5a5", stack: "ch" },
      // EBITDA
      { label: "EBITDA", data: S.projections.map(p => p.ebitda), backgroundColor: CHART_COLORS.green, stack: "ebitda" },
    ];
  } else {
    datasets = [
      { label: "Revenus", data: S.projections.map(p => p.revTotal), backgroundColor: CHART_COLORS.primary },
      { label: "Charges", data: S.projections.map(p => p.chargesTotal), backgroundColor: CHART_COLORS.red },
      { label: "EBITDA",  data: S.projections.map(p => p.ebitda), backgroundColor: CHART_COLORS.green },
    ];
  }

  _charts.revVsCh = new Chart(ctx, {
    type: "bar",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { callback: v => fmtK(v) } }
      },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const p = S.projections[idx];
            const ch = p.chargesDetail;
            const revStudiosNet = p.revStudios - (p.commissions * p.revStudios / p.revBrutHotel);
            const revLoftsNet = p.revLofts - (p.commissions * p.revLofts / p.revBrutHotel);
            const autres = ch.consommables + ch.comptable + ch.assurance + ch.entretien + ch.taxesPro + ch.divers;
            return `<div class="ctt-title">An ${p.year} — Compte de résultat</div>
              <div class="ctt-row" style="color:#1e3a5f"><span>Studios (net commissions)</span><span class="ctt-val">${fmtMAD(revStudiosNet)}</span></div>
              <div class="ctt-row" style="color:#3b6b9a"><span>Lofts (net commissions)</span><span class="ctt-val">${fmtMAD(revLoftsNet)}</span></div>
              <div class="ctt-row" style="color:#6b9fd4"><span>Local commercial</span><span class="ctt-val">${fmtMAD(p.revCommercial)}</span></div>
              <div class="ctt-row ctt-sub"><span>Commissions plateformes</span><span class="ctt-val" style="color:var(--muted)">-${fmtMAD(p.commissions)}</span></div>
              <div class="ctt-row ctt-total"><span>Revenus nets</span><span class="ctt-val">${fmtMAD(p.revTotal)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-neg-row"><span>Gestion (${Math.round(CHARGES.tauxGestion*100)}%)</span><span class="ctt-val ctt-neg">-${fmtK(ch.gestion)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Salaires + charges</span><span class="ctt-val ctt-neg">-${fmtK(ch.salaires)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Utilities</span><span class="ctt-val ctt-neg">-${fmtK(ch.utilities)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Autres</span><span class="ctt-val ctt-neg">-${fmtK(autres)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>EBITDA</span><span class="ctt-val" style="color:#16a34a">${fmtMAD(p.ebitda)}</span></div>
              <div class="ctt-row ctt-sub"><span>Marge d'exploitation</span><span class="ctt-val">${fmtPct(p.margeExploitation)}</span></div>`;
          })
        }
      }
    }
  });
}

function toggleRevChBreakdown(on) {
  _revChBreakdown = on;
  document.querySelectorAll(".revch-toggle-btn").forEach(b => b.classList.toggle("active", (b.dataset.mode === "breakdown") === on));
  if (currentState) chartRevenusVsCharges(currentState);
}

// --- Debt service with RICH TOOLTIP + capital/intérêts split + monthly/annual ---
let _debtSplit = false;  // false = total per source, true = capital + intérêts
let _debtMonthly = false; // false = annual, true = monthly

function chartDebtService(S) {
  destroyChart("debt");
  const ctx = document.getElementById("chart-debt")?.getContext("2d");
  if (!ctx) return;

  // Use debtProjections (full loan duration) instead of projections (10 years)
  const dp = S.debtProjections || S.projections;
  const div = _debtMonthly ? 12 : 1;
  const suffix = _debtMonthly ? "/mois" : "/an";

  // Update chart title with actual duration
  const titleEl = document.getElementById("debt-chart-title");
  if (titleEl) titleEl.textContent = "Service de la Dette sur " + dp.length + " ans";

  let datasets;

  if (_debtSplit) {
    datasets = [
      { label: "TK — Capital", data: dp.map(p => p.capitalTK / div), backgroundColor: "#d4a017", stack: "debt" },
      { label: "TK — Intérêts", data: dp.map(p => p.interetsTK / div), backgroundColor: "#f5d679", stack: "debt" },
      { label: "BQ — Capital", data: dp.map(p => p.capitalBQ / div), backgroundColor: "#1e3a5f", stack: "debt" },
      { label: "BQ — Intérêts", data: dp.map(p => p.interetsBQ / div), backgroundColor: "#6b9fd4", stack: "debt" },
      { label: "EBITDA", data: dp.map(p => p.ebitda / div), type: "line", borderColor: CHART_COLORS.green, backgroundColor: "transparent", tension: 0.3, pointRadius: 3, borderDash: [5, 3], order: -1 },
    ];
  } else {
    datasets = [
      { label: "Tamwilkom (2,5%)", data: dp.map(p => p.debtTK / div), backgroundColor: CHART_COLORS.gold, stack: "debt" },
      { label: "Banque (" + (BANQUE_CLASSIQUE.tauxAnnuel * 100).toFixed(2) + "%)", data: dp.map(p => p.debtBQ / div), backgroundColor: CHART_COLORS.primaryLight, stack: "debt" },
      { label: "EBITDA", data: dp.map(p => p.ebitda / div), type: "line", borderColor: CHART_COLORS.green, backgroundColor: "transparent", tension: 0.3, pointRadius: 3, borderDash: [5, 3], order: -1 },
    ];
  }

  _charts.debt = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dp.map(p => "An " + p.year),
      datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => fmtK(v) } } },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const p = dp[idx];
            if (!p) return "";
            const isDiffTK = idx < TAMWILKOM.differeAns;
            const dscr = p.debtServiceTotal > 0 ? (p.ebitda / p.debtServiceTotal) : Infinity;
            const dscrColor = dscr > 1.5 ? '#16a34a' : dscr > 1.2 ? '#d97706' : '#dc2626';
            return `<div class="ctt-title">An ${p.year} — Service de la dette ${_debtMonthly ? '(mensuel)' : '(annuel)'}</div>
              <div class="ctt-row" style="color:#d4a017"><span>TK Capital</span><span class="ctt-val">${fmtMAD(p.capitalTK / div)}</span></div>
              <div class="ctt-row" style="color:#f5d679"><span>TK Intérêts ${isDiffTK ? '(différé)' : ''}</span><span class="ctt-val">${fmtMAD(p.interetsTK / div)}</span></div>
              <div class="ctt-row" style="color:#1e3a5f"><span>BQ Capital</span><span class="ctt-val">${fmtMAD(p.capitalBQ / div)}</span></div>
              <div class="ctt-row" style="color:#6b9fd4"><span>BQ Intérêts</span><span class="ctt-val">${fmtMAD(p.interetsBQ / div)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>Total dette ${suffix}</span><span class="ctt-val">${fmtMAD(p.debtServiceTotal / div)}</span></div>
              <div class="ctt-row ctt-sub"><span>dont intérêts</span><span class="ctt-val" style="color:var(--muted)">${fmtMAD((p.interetsTK + p.interetsBQ) / div)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row"><span>EBITDA</span><span class="ctt-val" style="color:#16a34a">${fmtMAD(p.ebitda / div)}</span></div>
              <div class="ctt-row ctt-total"><span>DSCR</span><span class="ctt-val" style="color:${dscrColor}">${dscr === Infinity ? '∞' : dscr.toFixed(2) + 'x'}</span></div>`;
          })
        }
      }
    }
  });
}

function toggleDebtSplit(on) {
  _debtSplit = on;
  document.querySelectorAll(".debt-split-btn").forEach(b => b.classList.toggle("active", (b.dataset.mode === "split") === on));
  if (currentState) chartDebtService(currentState);
}

function toggleDebtPeriod(monthly) {
  _debtMonthly = monthly;
  document.querySelectorAll(".debt-period-btn").forEach(b => b.classList.toggle("active", (b.dataset.mode === "monthly") === monthly));
  if (currentState) chartDebtService(currentState);
}

// --- Cash-flow with RICH TOOLTIP, MONTHLY TOGGLE, FILTER, HORIZON & CUMUL ---
let _cfMonthly = false;
let _cfFilter = "all"; // "all", "revenus", "charges"
let _cfHorizon = 20; // 5, 10, or 20 years
let _cfShowCumul = false; // show/hide cumul line (off by default)

function toggleCFPeriod(monthly) {
  _cfMonthly = monthly;
  document.querySelectorAll(".cf-period-btn").forEach(b => b.classList.toggle("active", (b.dataset.mode === "monthly") === monthly));
  if (_currentState) chartCashFlow(_currentState);
}

function toggleCFHorizon(years) {
  _cfHorizon = years;
  document.querySelectorAll(".cf-horizon-btn").forEach(b => b.classList.toggle("active", parseInt(b.dataset.horizon) === years));
  if (_currentState) chartCashFlow(_currentState);
}

function toggleCFCumul() {
  _cfShowCumul = !_cfShowCumul;
  document.querySelectorAll(".cf-cumul-btn").forEach(b => b.classList.toggle("active", _cfShowCumul));
  if (_currentState) chartCashFlow(_currentState);
}


function toggleCFFilter(filter) {
  _cfFilter = filter;
  document.querySelectorAll(".cf-filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === filter));
  if (_currentState) chartCashFlow(_currentState);
}

function chartCashFlow(S) {
  destroyChart("cashflow");
  const ctx = document.getElementById("chart-cashflow")?.getContext("2d");
  if (!ctx) return;

  const titleEl = document.getElementById("cf-chart-title");

  // --- Filter mode: show only revenus or charges breakdown ---
  if (_cfFilter === "revenus") {
    if (titleEl) titleEl.textContent = _cfMonthly ? "Détail Revenus — Mensuel (An 1)" : "Détail Revenus sur " + _cfHorizon + " ans";
    _buildCFRevenusChart(ctx, S);
    return;
  }
  if (_cfFilter === "charges") {
    if (titleEl) titleEl.textContent = _cfMonthly ? "Détail Charges — Mensuel (An 1)" : "Détail Charges sur " + _cfHorizon + " ans";
    _buildCFChargesChart(ctx, S);
    return;
  }

  // --- Default "all" mode ---
  // Cumul toggle: only relevant in annual view
  const cumulBtn = document.querySelector(".cf-cumul-btn");
  if (cumulBtn) {
    cumulBtn.disabled = _cfMonthly;
    cumulBtn.style.opacity = _cfMonthly ? "0.4" : "1";
    cumulBtn.style.pointerEvents = _cfMonthly ? "none" : "";
  }

  if (_cfMonthly) {
    if (titleEl) titleEl.textContent = "Cash-Flow Net — Moyenne Mensuelle par Année";
    _buildCFMonthlyChart(ctx, S);
  } else {
    if (titleEl) titleEl.textContent = "Cash-Flow Net" + (_cfShowCumul ? " et Cumul" : "") + " sur " + _cfHorizon + " ans";
    _buildCFAnnualChart(ctx, S);
  }
}

function _buildCFAnnualChart(ctx, S) {
  const proj = S.projections.slice(0, _cfHorizon);
  const datasets = [
    {
      label: "Cash-Flow Net",
      data: proj.map(p => p.cashFlowNet),
      backgroundColor: proj.map(p => p.cashFlowNet >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
      borderRadius: 4,
    },
  ];
  if (_cfShowCumul) {
    datasets.push({
      label: "Cumul",
      data: proj.map(p => p.cumulCashFlow),
      type: "line",
      borderColor: CHART_COLORS.primary,
      backgroundColor: "rgba(30,58,95,0.06)",
      fill: true,
      tension: 0.3,
      pointRadius: 5,
      pointBackgroundColor: proj.map(p => p.cumulCashFlow >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      order: -1,
    });
  }
  _charts.cashflow = new Chart(ctx, {
    type: "bar",
    data: {
      labels: proj.map(p => "An " + p.year),
      datasets: datasets,
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: {
          ticks: { callback: v => fmtK(v) },
          grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(220,38,38,0.4)' : 'rgba(0,0,0,0.05)', lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1 }
        },
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const p = proj[idx];
            const rdtApport = S.financement.apportNet > 0 ? p.cashFlowNet / S.financement.apportNet : 0;
            return `<div class="ctt-title">An ${p.year} — Cash-Flow</div>
              <div class="ctt-row"><span>Revenus nets</span><span class="ctt-val">${fmtMAD(p.revTotal)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Charges exploitation</span><span class="ctt-val ctt-neg">-${fmtMAD(p.chargesTotal)}</span></div>
              <div class="ctt-row" style="color:#16a34a"><span><strong>= EBITDA</strong></span><span class="ctt-val"><strong>${fmtMAD(p.ebitda)}</strong></span></div>
              <div class="ctt-row ctt-neg-row"><span>Service dette</span><span class="ctt-val ctt-neg">-${fmtMAD(p.debtServiceTotal)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>IS</span><span class="ctt-val ctt-neg">-${fmtMAD(p.is)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>Cash-Flow Net</span><span class="ctt-val" style="color:${p.cashFlowNet >= 0 ? '#16a34a' : '#dc2626'}">${fmtMAD(p.cashFlowNet)}</span></div>
              <div class="ctt-row ctt-sub"><span>Mensuel</span><span class="ctt-val">${fmtMAD(p.cashFlowNet / 12)}/mois</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row"><span>Cumul</span><span class="ctt-val" style="color:${p.cumulCashFlow >= 0 ? '#16a34a' : '#dc2626'}">${fmtMAD(p.cumulCashFlow)}</span></div>
              <div class="ctt-row ctt-sub"><span>Rendement / apport</span><span class="ctt-val">${fmtPct(rdtApport)}</span></div>`;
          })
        }
      }
    }
  });
}

function _buildCFMonthlyChart(ctx, S) {
  const mProj = S.projections.slice(0, _cfHorizon);
  const labels = mProj.map(p => "An " + p.year);
  const monthlyAvg = mProj.map(p => p.cashFlowNet / 12);

  _charts.cashflow = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "CF Net Mensuel Moyen",
          data: monthlyAvg,
          backgroundColor: monthlyAvg.map(v => v >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
          borderRadius: 4,
        },
        {
          label: "CF Net Annuel",
          data: mProj.map(p => p.cashFlowNet),
          type: "line",
          borderColor: CHART_COLORS.primary,
          backgroundColor: "rgba(30,58,95,0.06)",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: mProj.map(p => p.cashFlowNet >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          yAxisID: "y1",
          order: -1,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: {
          position: "left",
          title: { display: true, text: "Mensuel (MAD)", font: { size: 11 } },
          ticks: { callback: v => fmtK(v) },
          grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(220,38,38,0.4)' : 'rgba(0,0,0,0.05)', lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1 }
        },
        y1: {
          position: "right",
          title: { display: true, text: "Annuel (MAD)", font: { size: 11 } },
          ticks: { callback: v => fmtK(v) },
          grid: { drawOnChartArea: false },
        }
      },
      plugins: {
        legend: { labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const p = mProj[idx];
            if (!p) return "";
            const mensuel = p.cashFlowNet / 12;
            const revMensuel = p.revTotal / 12;
            const chgMensuel = p.chargesTotal / 12;
            const detteMensuel = p.debtServiceTotal / 12;
            return `<div class="ctt-title">An ${p.year} — Détail Mensuel Moyen</div>
              <div class="ctt-row"><span>Revenus / mois</span><span class="ctt-val">${fmtMAD(revMensuel)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Charges / mois</span><span class="ctt-val ctt-neg">-${fmtMAD(chgMensuel)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>Dette / mois</span><span class="ctt-val ctt-neg">-${fmtMAD(detteMensuel)}</span></div>
              <div class="ctt-row ctt-neg-row"><span>IS / mois</span><span class="ctt-val ctt-neg">-${fmtMAD(p.is / 12)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>CF Net / mois</span><span class="ctt-val" style="color:${mensuel >= 0 ? '#16a34a' : '#dc2626'}">${fmtMAD(mensuel)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-sub"><span>CF Net annuel</span><span class="ctt-val">${fmtMAD(p.cashFlowNet)}</span></div>`;
          })
        }
      }
    }
  });
}

function _buildCFRevenusChart(ctx, S) {
  const isMonthly = _cfMonthly;
  const div = isMonthly ? 12 : 1;

  if (isMonthly) {
    // Monthly revenus breakdown for Year 1
    const p = S.projections[0];
    const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
    _charts.cashflow = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Studios", data: months.map(() => p.revStudios / 12), backgroundColor: CHART_COLORS.primary, borderRadius: 4, stack: "rev" },
          { label: "Lofts", data: months.map(() => p.revLofts / 12), backgroundColor: CHART_COLORS.primaryLight, borderRadius: 4, stack: "rev" },
          { label: "Loyer commercial", data: months.map(() => p.revCommercial / 12), backgroundColor: CHART_COLORS.gold, borderRadius: 4, stack: "rev" },
          { label: "Commissions", data: months.map(() => -p.commissions / 12), backgroundColor: CHART_COLORS.red, borderRadius: 4, stack: "rev" },
        ]
      },
      options: _cfFilterChartOptions("Détail revenus mensuels — An 1", (idx) => {
        const p = S.projections[0];
        return `<div class="ctt-title">${months[idx]} — Revenus</div>
          <div class="ctt-row"><span>Studios</span><span class="ctt-val">${fmtMAD(p.revStudios / 12)}</span></div>
          <div class="ctt-row"><span>Lofts</span><span class="ctt-val">${fmtMAD(p.revLofts / 12)}</span></div>
          <div class="ctt-row"><span>Loyer commercial</span><span class="ctt-val">${fmtMAD(p.revCommercial / 12)}</span></div>
          <div class="ctt-row ctt-neg-row"><span>Commissions</span><span class="ctt-val ctt-neg">-${fmtMAD(p.commissions / 12)}</span></div>
          <div class="ctt-divider"></div>
          <div class="ctt-row ctt-total"><span>Revenu net</span><span class="ctt-val">${fmtMAD(p.revTotal / 12)}</span></div>`;
      })
    });
  } else {
    // Annual revenus breakdown with horizon
    const revProj = S.projections.slice(0, _cfHorizon);
    _charts.cashflow = new Chart(ctx, {
      type: "bar",
      data: {
        labels: revProj.map(p => "An " + p.year),
        datasets: [
          { label: "Studios", data: revProj.map(p => p.revStudios), backgroundColor: CHART_COLORS.primary, borderRadius: 4, stack: "rev" },
          { label: "Lofts", data: revProj.map(p => p.revLofts), backgroundColor: CHART_COLORS.primaryLight, borderRadius: 4, stack: "rev" },
          { label: "Loyer commercial", data: revProj.map(p => p.revCommercial), backgroundColor: CHART_COLORS.gold, borderRadius: 4, stack: "rev" },
          { label: "Commissions", data: revProj.map(p => -p.commissions), backgroundColor: CHART_COLORS.red, borderRadius: 4, stack: "rev" },
          { label: "Revenu net total", data: revProj.map(p => p.revTotal), type: "line", borderColor: CHART_COLORS.green, tension: 0.3, pointRadius: 4, pointBackgroundColor: CHART_COLORS.green, pointBorderColor: "#fff", pointBorderWidth: 2, fill: false, order: -1 },
        ]
      },
      options: _cfFilterChartOptions("Détail revenus annuels", (idx) => {
        const p = revProj[idx];
        return `<div class="ctt-title">An ${p.year} — Revenus</div>
          <div class="ctt-row"><span>Studios</span><span class="ctt-val">${fmtMAD(p.revStudios)}</span></div>
          <div class="ctt-row"><span>Lofts</span><span class="ctt-val">${fmtMAD(p.revLofts)}</span></div>
          <div class="ctt-row"><span>Loyer commercial</span><span class="ctt-val">${fmtMAD(p.revCommercial)}</span></div>
          <div class="ctt-row ctt-neg-row"><span>Commissions</span><span class="ctt-val ctt-neg">-${fmtMAD(p.commissions)}</span></div>
          <div class="ctt-divider"></div>
          <div class="ctt-row ctt-total"><span>Revenu net</span><span class="ctt-val">${fmtMAD(p.revTotal)}</span></div>`;
      })
    });
  }
}

function _buildCFChargesChart(ctx, S) {
  if (_cfMonthly) {
    const p = S.projections[0];
    const ch = p.chargesDetail;
    const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
    _charts.cashflow = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Gestion", data: months.map(() => ch.gestion / 12), backgroundColor: CHART_COLORS.primary, borderRadius: 4, stack: "ch" },
          { label: "Salaires", data: months.map(() => ch.salaires / 12), backgroundColor: CHART_COLORS.red, borderRadius: 4, stack: "ch" },
          { label: "Utilities", data: months.map(() => ch.utilities / 12), backgroundColor: CHART_COLORS.amber, borderRadius: 4, stack: "ch" },
          { label: "Assurance", data: months.map(() => ch.assurance / 12), backgroundColor: CHART_COLORS.teal, borderRadius: 4, stack: "ch" },
          { label: "Autres", data: months.map(() => (ch.entretien + ch.comptable + ch.consommables + ch.divers) / 12), backgroundColor: CHART_COLORS.gray, borderRadius: 4, stack: "ch" },
        ]
      },
      options: _cfFilterChartOptions("Détail charges mensuelles — An 1", (idx) => {
        return `<div class="ctt-title">${months[idx]} — Charges</div>
          <div class="ctt-row"><span>Gestion</span><span class="ctt-val">${fmtMAD(ch.gestion / 12)}</span></div>
          <div class="ctt-row"><span>Salaires</span><span class="ctt-val">${fmtMAD(ch.salaires / 12)}</span></div>
          <div class="ctt-row"><span>Utilities</span><span class="ctt-val">${fmtMAD(ch.utilities / 12)}</span></div>
          <div class="ctt-row"><span>Assurance</span><span class="ctt-val">${fmtMAD(ch.assurance / 12)}</span></div>
          <div class="ctt-row"><span>Entretien</span><span class="ctt-val">${fmtMAD(ch.entretien / 12)}</span></div>
          <div class="ctt-row"><span>Comptable</span><span class="ctt-val">${fmtMAD(ch.comptable / 12)}</span></div>
          <div class="ctt-row"><span>Consommables</span><span class="ctt-val">${fmtMAD(ch.consommables / 12)}</span></div>
          <div class="ctt-row"><span>Divers</span><span class="ctt-val">${fmtMAD(ch.divers / 12)}</span></div>
          <div class="ctt-divider"></div>
          <div class="ctt-row ctt-total"><span>Total</span><span class="ctt-val">${fmtMAD(p.chargesTotal / 12)}</span></div>`;
      })
    });
  } else {
    const chProj = S.projections.slice(0, _cfHorizon);
    _charts.cashflow = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chProj.map(p => "An " + p.year),
        datasets: [
          { label: "Gestion", data: chProj.map(p => p.chargesDetail.gestion), backgroundColor: CHART_COLORS.primary, borderRadius: 4, stack: "ch" },
          { label: "Salaires", data: chProj.map(p => p.chargesDetail.salaires), backgroundColor: CHART_COLORS.red, borderRadius: 4, stack: "ch" },
          { label: "Utilities", data: chProj.map(p => p.chargesDetail.utilities), backgroundColor: CHART_COLORS.amber, borderRadius: 4, stack: "ch" },
          { label: "Assurance", data: chProj.map(p => p.chargesDetail.assurance), backgroundColor: CHART_COLORS.teal, borderRadius: 4, stack: "ch" },
          { label: "Autres", data: chProj.map(p => p.chargesDetail.entretien + p.chargesDetail.comptable + p.chargesDetail.consommables + p.chargesDetail.divers), backgroundColor: CHART_COLORS.gray, borderRadius: 4, stack: "ch" },
          { label: "Total charges", data: chProj.map(p => p.chargesTotal), type: "line", borderColor: CHART_COLORS.red, tension: 0.3, pointRadius: 4, pointBackgroundColor: CHART_COLORS.red, pointBorderColor: "#fff", pointBorderWidth: 2, fill: false, order: -1 },
        ]
      },
      options: _cfFilterChartOptions("Détail charges annuelles", (idx) => {
        const p = chProj[idx];
        const ch = p.chargesDetail;
        return `<div class="ctt-title">An ${p.year} — Charges</div>
          <div class="ctt-row"><span>Gestion</span><span class="ctt-val">${fmtMAD(ch.gestion)}</span></div>
          <div class="ctt-row"><span>Salaires</span><span class="ctt-val">${fmtMAD(ch.salaires)}</span></div>
          <div class="ctt-row"><span>Utilities</span><span class="ctt-val">${fmtMAD(ch.utilities)}</span></div>
          <div class="ctt-row"><span>Assurance</span><span class="ctt-val">${fmtMAD(ch.assurance)}</span></div>
          <div class="ctt-row"><span>Entretien</span><span class="ctt-val">${fmtMAD(ch.entretien)}</span></div>
          <div class="ctt-row"><span>Comptable</span><span class="ctt-val">${fmtMAD(ch.comptable)}</span></div>
          <div class="ctt-row"><span>Consommables</span><span class="ctt-val">${fmtMAD(ch.consommables)}</span></div>
          <div class="ctt-row"><span>Divers</span><span class="ctt-val">${fmtMAD(ch.divers)}</span></div>
          <div class="ctt-divider"></div>
          <div class="ctt-row ctt-total"><span>Total</span><span class="ctt-val">${fmtMAD(p.chargesTotal)}</span></div>`;
      })
    });
  }
}

function _cfFilterChartOptions(title, tooltipFn) {
  return {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        ticks: { callback: v => fmtK(v) },
        grid: { color: 'rgba(0,0,0,0.05)' }
      }
    },
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: {
        enabled: false,
        external: (ctx) => externalTooltip(ctx, tooltipFn)
      }
    }
  };
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
      datasets: [{ label: "Taux d'occupation", data: MARKET_DATA.occupancyBySegment.map(s => s.taux * 100), backgroundColor: [CHART_COLORS.green, CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.gold, CHART_COLORS.teal], borderRadius: 4 }]
    },
    options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { max: 80, ticks: { callback: v => v + "%" } } }, plugins: { legend: { display: false } } }
  });
}

// --- Sensitivity with RICH TOOLTIP + zero line ---
function chartSensitivity(S) {
  destroyChart("sensitivity");
  const ctx = document.getElementById("chart-sensitivity")?.getContext("2d");
  if (!ctx) return;
  const currentOcc = SCENARIOS[S.scenario].tauxOccupation;

  _charts.sensitivity = new Chart(ctx, {
    type: "line",
    data: {
      labels: S.sensitivity.map(s => fmtPct(s.occ, 0)),
      datasets: [
        { label: "Revenu", data: S.sensitivity.map(s => s.revenu), borderColor: CHART_COLORS.primary, tension: 0.3, fill: false, pointRadius: S.sensitivity.map(s => Math.abs(s.occ - currentOcc) < 0.01 ? 8 : 3), pointBackgroundColor: S.sensitivity.map(s => Math.abs(s.occ - currentOcc) < 0.01 ? CHART_COLORS.gold : CHART_COLORS.primary) },
        { label: "EBITDA", data: S.sensitivity.map(s => s.ebitda), borderColor: CHART_COLORS.gold, tension: 0.3, fill: false, pointRadius: S.sensitivity.map(s => Math.abs(s.occ - currentOcc) < 0.01 ? 8 : 3), pointBackgroundColor: S.sensitivity.map(s => Math.abs(s.occ - currentOcc) < 0.01 ? CHART_COLORS.gold : CHART_COLORS.gold) },
        { label: "Cash-Flow", data: S.sensitivity.map(s => s.cashFlow), borderColor: CHART_COLORS.green, tension: 0.3, fill: { target: 'origin', above: 'rgba(22,163,74,0.06)', below: 'rgba(220,38,38,0.06)' }, pointRadius: S.sensitivity.map(s => Math.abs(s.occ - currentOcc) < 0.01 ? 8 : 3), pointBackgroundColor: S.sensitivity.map(s => s.cashFlow >= 0 ? CHART_COLORS.green : CHART_COLORS.red) },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: {
          ticks: { callback: v => fmtK(v) },
          grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(220,38,38,0.5)' : 'rgba(0,0,0,0.05)', lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1 }
        }
      },
      plugins: {
        tooltip: {
          enabled: false,
          external: (ctx) => externalTooltip(ctx, (idx) => {
            const s = S.sensitivity[idx];
            const isCurrent = Math.abs(s.occ - currentOcc) < 0.01;
            const isBreakEven = S.kpi.breakEvenOcc && Math.abs(s.occ - S.kpi.breakEvenOcc) < 0.03;
            const nuitees = S.units.nbUnites * 365 * s.occ;
            return `<div class="ctt-title">${fmtPct(s.occ, 0)} d'occupation ${isCurrent ? '<span style="background:#b45309;color:#fff;padding:1px 8px;border-radius:10px;font-size:11px;margin-left:6px">Scénario actuel</span>' : ''}</div>
              <div class="ctt-row"><span>Nuitées vendues</span><span class="ctt-val">${fmtNum(Math.round(nuitees))}/an</span></div>
              <div class="ctt-row"><span>Revenu net</span><span class="ctt-val">${fmtMAD(s.revenu)}</span></div>
              <div class="ctt-row"><span>EBITDA</span><span class="ctt-val">${fmtMAD(s.ebitda)}</span></div>
              <div class="ctt-divider"></div>
              <div class="ctt-row ctt-total"><span>Cash-Flow Net</span><span class="ctt-val" style="color:${s.cashFlow >= 0 ? '#16a34a' : '#dc2626'}">${fmtMAD(s.cashFlow)}</span></div>
              <div class="ctt-row"><span>Rendement / apport</span><span class="ctt-val" style="color:${s.rendement >= 0 ? '#16a34a' : '#dc2626'}">${fmtPct(s.rendement)}</span></div>
              ${isBreakEven ? '<div class="ctt-row" style="color:#dc2626;font-weight:600;margin-top:4px"><span>⚠ Seuil de rentabilité</span></div>' : ''}
              ${s.cashFlow < 0 ? '<div class="ctt-row" style="color:#dc2626;font-weight:600;margin-top:4px"><span>🔴 Cash-flow négatif — perte mensuelle de ' + fmtMAD(Math.abs(s.cashFlow / 12)) + '</span></div>' : ''}`;
          })
        }
      }
    }
  });
}

// --- CF Waterfall An 1 ---
function chartCFWaterfall(S) {
  destroyChart("cfWaterfall");
  const ctx = document.getElementById("chart-cf-waterfall")?.getContext("2d");
  if (!ctx) return;
  const y1 = S.projections[0];
  const ch = y1.chargesDetail;

  // Build waterfall segments: RevBrut → -Commissions → -Gestion → -Salaires → -Utilities → -Autres → =EBITDA → -Dette → -IS → =CF Net
  const steps = [
    { label: "Revenus bruts", value: y1.revBrutHotel + y1.revCommercial, type: "positive" },
    { label: "Commissions OTA", value: -y1.commissions, type: "negative" },
    { label: `Gestion (${Math.round(CHARGES.tauxGestion*100)}%)`, value: -ch.gestion, type: "negative" },
    { label: "Salaires", value: -ch.salaires, type: "negative" },
    { label: "Utilities", value: -ch.utilities, type: "negative" },
    { label: "Consommables", value: -ch.consommables, type: "negative" },
    { label: "Autres charges", value: -(ch.comptable + ch.assurance + ch.entretien + ch.taxesPro + ch.divers), type: "negative" },
    { label: "EBITDA", value: y1.ebitda, type: "total" },
    { label: "Service dette", value: -y1.debtServiceTotal, type: "negative" },
    { label: "IS", value: -y1.is, type: "negative" },
    { label: "Cash-Flow Net", value: y1.cashFlowNet, type: "total" },
  ];

  // For waterfall: invisible base + colored bar
  const bases = []; const values = []; const colors = [];
  let running = 0;
  steps.forEach(s => {
    if (s.type === "total") {
      bases.push(0);
      values.push(s.value);
      colors.push(s.value >= 0 ? CHART_COLORS.green : CHART_COLORS.red);
    } else {
      if (s.value >= 0) {
        bases.push(running);
        values.push(s.value);
        colors.push(CHART_COLORS.green + "cc");
      } else {
        bases.push(running + s.value);
        values.push(-s.value);
        colors.push(CHART_COLORS.red + "cc");
      }
      running += s.value;
    }
  });

  _charts.cfWaterfall = new Chart(ctx, {
    type: "bar",
    data: {
      labels: steps.map(s => s.label),
      datasets: [
        { label: "Base", data: bases, backgroundColor: "transparent", borderWidth: 0, stack: "wf" },
        { label: "Valeur", data: values, backgroundColor: colors, borderRadius: 4, stack: "wf" },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, ticks: { callback: v => fmtK(v) }, grid: { color: ctx2 => ctx2.tick.value === 0 ? 'rgba(220,38,38,0.4)' : 'rgba(0,0,0,0.05)' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: item => item.datasetIndex === 1,
          callbacks: {
            label: c => {
              const s = steps[c.dataIndex];
              const sign = s.value >= 0 ? "+" : "";
              return s.label + ": " + sign + fmtMAD(s.value);
            }
          }
        }
      }
    }
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
        { label: "IS payé", data: S.projections.map(p => p.is), backgroundColor: CHART_COLORS.red, borderRadius: 4 },
        { label: "Économie IS devises", data: S.projections.map(p => p.economieIS), backgroundColor: CHART_COLORS.green, borderRadius: 4 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => fmtK(v) } } },
      plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ": " + fmtMAD(c.parsed.y) } } }
    }
  });
}

// --- NEW: Alternative investments comparison ---
function chartAlternatives(S) {
  destroyChart("alternatives");
  const ctx = document.getElementById("chart-alternatives")?.getContext("2d");
  if (!ctx) return;

  const rdt = S.kpi.rendementNetApport * 100;
  const alternatives = [
    { name: "Ce projet (An 1)",    val: rdt },
    { name: "SCPI Europe",          val: 4.5 },
    { name: "Immo locatif Casa",    val: 5.5 },
    { name: "Obligations Maroc",    val: 3.5 },
    { name: "Livret épargne UAE",   val: 6.25 },
    { name: "Bourse MASI (moy.)",   val: 7.0 },
  ];

  _charts.alternatives = new Chart(ctx, {
    type: "bar",
    data: {
      labels: alternatives.map(a => a.name),
      datasets: [{
        data: alternatives.map(a => a.val),
        backgroundColor: alternatives.map((a, i) => i === 0 ? (rdt > 4 ? CHART_COLORS.green : rdt > 2 ? CHART_COLORS.amber : CHART_COLORS.red) : CHART_COLORS.gray + '80'),
        borderColor: alternatives.map((a, i) => i === 0 ? (rdt > 4 ? CHART_COLORS.green : rdt > 2 ? CHART_COLORS.amber : CHART_COLORS.red) : 'transparent'),
        borderWidth: alternatives.map((a, i) => i === 0 ? 2 : 0),
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      scales: {
        x: { ticks: { callback: v => v + "%", stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: "Rendement annuel net (%)" } },
        y: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => c.label + ": " + c.parsed.x.toFixed(1) + "% rendement net annuel" + (c.dataIndex === 0 ? " (sur apport terrain)" : " (benchmark)") }
        }
      }
    }
  });
}

// --- Rendement evolution over 20 years ---
// ======================== CAPITAL RESTANT DÛ (GRAPH SÉPARÉ) ========================
// --- CRD Chart: two modes ---
let _crdMode = "crd"; // "crd" or "service"

function toggleCRDMode(mode) {
  _crdMode = mode;
  document.querySelectorAll("[data-crdmode]").forEach(b => b.classList.toggle("active", b.dataset.crdmode === mode));
  if (_currentState) chartCRD(_currentState);
}

function chartCRD(S) {
  destroyChart("crd");
  const ctx = document.getElementById("chart-crd")?.getContext("2d");
  if (!ctx) return;

  const proj = S.projections;
  const montantInitial = S.financement.montantAFinancer;
  const titleEl = document.getElementById("crd-chart-title");

  if (_crdMode === "service") {
    // === MODE SERVICE DETTE : barres empilées capital/intérêts (TK + BQ) ===
    if (titleEl) titleEl.textContent = "Service de la Dette — Split Capital / Intérêts";
    const labels = proj.map(p => "An " + p.year);

    _charts.crd = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "TK — Capital", data: proj.map(p => p.capitalTK), backgroundColor: "#d4a017", stack: "debt", borderRadius: 0 },
          { label: "TK — Intérêts", data: proj.map(p => p.interetsTK), backgroundColor: "#f5d679", stack: "debt", borderRadius: 0 },
          { label: "BQ — Capital", data: proj.map(p => p.capitalBQ), backgroundColor: "#1e3a5f", stack: "debt", borderRadius: 0 },
          { label: "BQ — Intérêts", data: proj.map(p => p.interetsBQ), backgroundColor: "#6b9fd4", stack: "debt", borderRadius: { topLeft: 3, topRight: 3 } },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { callback: v => fmtK(v) }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
        plugins: {
          legend: { labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            enabled: false,
            external: (ctx) => externalTooltip(ctx, (idx) => {
              const p = proj[idx];
              if (!p) return "";
              const totalService = p.debtServiceTotal;
              const totalInterets = p.interetsTK + p.interetsBQ;
              const totalCapital = p.capitalTK + p.capitalBQ;
              const isDiffTK = idx < TAMWILKOM.differeAns;
              const isDiffBQ = idx < BANQUE_CLASSIQUE.differeAns;
              return `<div class="ctt-title">An ${p.year} — Service de la dette</div>
                <div class="ctt-row" style="color:#d4a017"><span>TK Capital</span><span class="ctt-val">${fmtMAD(p.capitalTK)}</span></div>
                <div class="ctt-row" style="color:#f5d679"><span>TK Intérêts${isDiffTK ? ' (différé)' : ''}</span><span class="ctt-val">${fmtMAD(p.interetsTK)}</span></div>
                <div class="ctt-row" style="color:#1e3a5f"><span>BQ Capital</span><span class="ctt-val">${fmtMAD(p.capitalBQ)}</span></div>
                <div class="ctt-row" style="color:#6b9fd4"><span>BQ Intérêts${isDiffBQ ? ' (différé)' : ''}</span><span class="ctt-val">${fmtMAD(p.interetsBQ)}</span></div>
                <div class="ctt-divider"></div>
                <div class="ctt-row ctt-total"><span>Total</span><span class="ctt-val">${fmtMAD(totalService)}</span></div>
                <div class="ctt-row ctt-sub"><span>dont capital</span><span class="ctt-val">${fmtMAD(totalCapital)}</span></div>
                <div class="ctt-row ctt-sub"><span>dont intérêts</span><span class="ctt-val" style="color:var(--muted)">${fmtMAD(totalInterets)}</span></div>`;
            })
          }
        }
      }
    });
  } else {
    // === MODE CRD : courbe du capital restant dû ===
    if (titleEl) titleEl.textContent = "Capital Restant Dû";
    const labels = ["Début", ...proj.map(p => "An " + p.year)];
    const crdData = [montantInitial, ...proj.map(p => p.capitalRestantDu)];

    _charts.crd = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Capital Restant Dû",
          data: crdData,
          borderColor: CHART_COLORS.red,
          backgroundColor: "rgba(220,38,38,0.08)",
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: crdData.map(v => v > 0 ? CHART_COLORS.red : CHART_COLORS.green),
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => fmtK(v) },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false,
            external: (ctx) => externalTooltip(ctx, (idx) => {
              if (idx === 0) {
                return `<div class="ctt-title">Début — Financement</div>
                  <div class="ctt-row"><span>Montant à financer</span><span class="ctt-val">${fmtMAD(montantInitial)}</span></div>
                  <div class="ctt-row ctt-sub"><span>Tamwilkom</span><span class="ctt-val">${fmtMAD(S.financement.montantTamwilkom)}</span></div>
                  <div class="ctt-row ctt-sub"><span>Banque classique</span><span class="ctt-val">${fmtMAD(S.financement.montantBanque)}</span></div>`;
              }
              const p = proj[idx - 1];
              const pctRemb = 1 - p.capitalRestantDu / montantInitial;
              return `<div class="ctt-title">An ${p.year} — Capital Restant Dû</div>
                <div class="ctt-row" style="color:${CHART_COLORS.red}"><span><strong>CRD</strong></span><span class="ctt-val"><strong>${fmtMAD(p.capitalRestantDu)}</strong></span></div>
                <div class="ctt-row ctt-sub"><span>% remboursé</span><span class="ctt-val">${fmtPct(pctRemb, 0)}</span></div>
                <div class="ctt-divider"></div>
                <div class="ctt-row"><span>Service dette An ${p.year}</span><span class="ctt-val">${fmtMAD(p.debtServiceTotal)}</span></div>
                <div class="ctt-row ctt-sub"><span>dont intérêts</span><span class="ctt-val">${fmtMAD(p.interetsTK + p.interetsBQ)}</span></div>
                <div class="ctt-row ctt-sub"><span>dont capital</span><span class="ctt-val">${fmtMAD(p.capitalTK + p.capitalBQ)}</span></div>`;
            })
          }
        }
      }
    });
  }
}

function chartRendementEvolution(S) {
  destroyChart("rendementEvolution");
  const ctx = document.getElementById("chart-rendement-evolution")?.getContext("2d");
  if (!ctx) return;

  const apport = S.financement.apportNet;
  const data = S.projections.map(p => apport > 0 ? (p.cashFlowNet / apport) * 100 : 0);

  _charts.rendementEvolution = new Chart(ctx, {
    type: "line",
    data: {
      labels: S.projections.map(p => "An " + p.year),
      datasets: [{
        label: "Rendement net % (CF/apport net)",
        data: data,
        borderColor: CHART_COLORS.primaryLight,
        backgroundColor: CHART_COLORS.primaryLight + '15',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.primaryLight,
        pointBorderWidth: 0,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: { callback: v => v.toFixed(1) + "%" },
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: c => c.dataset.label + ": " + c.parsed.y.toFixed(2) + "%",
            afterLabel: (c) => {
              const p = S.projections[c.dataIndex];
              return "CF: " + fmtMAD(p.cashFlowNet) + "/an";
            }
          }
        }
      }
    }
  });
}
