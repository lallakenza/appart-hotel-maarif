// ============================================================
// RENDER LAYER — DOM updates only, reads computed STATE
// Zero computation here, only formatting + DOM manipulation
// ============================================================

// --- Formatters ---
function fmtMAD(n) {
  if (n == null || isNaN(n)) return "–";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " MAD";
}
function fmtK(n) {
  if (n == null || isNaN(n)) return "–";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return Math.round(n).toString();
}
function fmtPct(n, decimals = 1) {
  if (n == null || isNaN(n)) return "–";
  return (n * 100).toFixed(decimals) + "%";
}
function fmtNum(n) {
  if (n == null || isNaN(n)) return "–";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n));
}
function fmtM2(n) {
  return n != null ? n.toFixed(2) + " m²" : "–";
}

// --- Color helpers ---
function clrSign(val) { return val >= 0 ? "var(--green)" : "var(--red)"; }
function badgeClass(type) {
  const map = { studio: "badge-green", loft: "badge-amber", commercial: "badge-blue", service: "badge-gray" };
  return map[type] || "badge-gray";
}

// --- Main render ---
function render(state) {
  renderVerdict(state);
  renderScenarioButtons(state);
  renderKPIs(state);
  renderKPIInsights(state);
  renderBudget(state);
  renderProgramme(state);
  renderRevenus(state);
  renderCharges(state);
  renderFinancement(state);
  renderCashFlow(state);
  renderGestion(state);
  renderMarche(state);
  renderFiscalite(state);
  renderRisques(state);
  renderSensibilite(state);
  renderSubventions(state);
}

// --- Verdict Go / No-Go ---
function renderVerdict(S) {
  const y1 = S.projections[0];
  const dscr = S.kpi.dscr;
  const cfPositif = y1.cashFlowNet > 0;
  const dscrOk = dscr >= 1.2;
  const rdtApport = S.kpi.rendementNetApport;
  const breakEven = S.kpi.breakEvenOcc;
  const currentOcc = SCENARIOS[S.scenario].tauxOccupation;
  const margeSecurite = breakEven ? currentOcc - breakEven : 0;

  // Score: 0-5 based on key metrics
  let score = 0;
  if (cfPositif) score++;
  if (dscrOk) score++;
  if (rdtApport > 0.03) score++;
  if (breakEven && margeSecurite > 0.08) score++;
  if (S.kpi.paybackYear && S.kpi.paybackYear <= 10) score++;

  const banner = document.getElementById("verdict-banner");
  const svg = document.getElementById("verdict-svg");
  const title = document.getElementById("verdict-title");
  const subtitle = document.getElementById("verdict-subtitle");
  const metrics = document.getElementById("verdict-metrics");
  const scoreBadge = document.getElementById("verdict-score-badge");

  if (!banner) return;

  // SVG icon paths
  const svgCheck = '<path d="M20 6L9 17l-5-5"/>';
  const svgAlert = '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>';
  const svgX = '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>';

  banner.className = "verdict-banner";
  if (score >= 4) {
    banner.classList.add("verdict-go");
    svg.innerHTML = svgCheck;
    title.textContent = "Projet viable — Go conditionnel";
    subtitle.textContent = "Les fondamentaux sont solides. Le projet génère un cash-flow positif avec une marge de sécurité sur l'occupation. Attention aux risques opérationnels (gestion à distance, saturation Maarif).";
  } else if (score >= 2) {
    banner.classList.add("verdict-caution");
    svg.innerHTML = svgAlert;
    title.textContent = "Projet fragile — Go avec réserves";
    subtitle.textContent = "Le cash-flow est positif mais la marge de sécurité est faible. Un taux d'occupation inférieur aux prévisions mettrait le projet en difficulté. Négocier de meilleures conditions de financement améliorerait significativement le profil.";
  } else {
    banner.classList.add("verdict-nogo");
    svg.innerHTML = svgX;
    title.textContent = "Projet à risque — No-Go recommandé";
    subtitle.textContent = "Le cash-flow est négatif ou le DSCR insuffisant dans ce scénario. Les conditions actuelles ne permettent pas de couvrir la dette. Reconsidérer le montage financier ou le positionnement tarifaire.";
  }

  // Score badge with mini bar
  const scoreBar = Array.from({length: 5}, (_, i) =>
    `<span${i < score ? ' class="filled"' : ''}></span>`
  ).join('');
  scoreBadge.innerHTML = `<span class="verdict-score-bar">${scoreBar}</span> ${score}/5`;

  // Metric helper
  function dot(ok) { return `<span class="verdict-dot ${ok ? 'dot-ok' : 'dot-warn'}"></span>`; }
  function dotBad(ok) { return `<span class="verdict-dot ${ok ? 'dot-ok' : 'dot-bad'}"></span>`; }

  metrics.innerHTML = `
    <div class="verdict-metric">${dotBad(cfPositif)} CF An 1: ${fmtMAD(y1.cashFlowNet)}</div>
    <div class="verdict-metric">${dot(dscrOk)} DSCR: ${dscr === Infinity ? '∞' : dscr.toFixed(2) + 'x'}</div>
    <div class="verdict-metric">${dot(margeSecurite > 0.08)} Break-even: ${breakEven ? fmtPct(breakEven, 0) : '?'}</div>
    <div class="verdict-metric">${dot(rdtApport > 0.03)} Rdt/apport: ${fmtPct(rdtApport)}</div>
  `;
}

// --- Scenario buttons: always show ORIGINAL preset values ---
function renderScenarioButtons(S) {
  const originals = typeof originalScenarios !== "undefined" ? originalScenarios : SCENARIOS;
  Object.keys(SCENARIOS).forEach(key => {
    const sc = originals[key] || SCENARIOS[key];
    const btn = document.getElementById("btn-" + key);
    if (btn) {
      btn.innerHTML = `${sc.label}<br><small style="font-weight:400;opacity:.7">${fmtPct(sc.tauxOccupation, 0)} · ${sc.prixNuitStudio} MAD/n</small>`;
    }
  });
}

// --- KPI Strip ---
function renderKPIs(S) {
  const y1 = S.projections[0];
  const dscr = S.kpi.dscr;
  const breakEven = S.kpi.breakEvenOcc;
  const currentOcc = SCENARIOS[S.scenario].tauxOccupation;

  setKPI("kpi-invest",     fmtMAD(S.budget.totalProjet));
  setKPI("kpi-rdt-brut",   fmtPct(S.kpi.rendementBrut),   S.kpi.rendementBrut > 0.10 ? "kpi-green" : S.kpi.rendementBrut > 0.06 ? "kpi-amber" : "kpi-red");
  setKPI("kpi-cf-net",     fmtMAD(y1.cashFlowNet),         y1.cashFlowNet > 0 ? "kpi-green" : "kpi-red");
  setKPI("kpi-rdt-apport", fmtPct(S.kpi.rendementNetApport), S.kpi.rendementNetApport > 0.05 ? "kpi-green" : S.kpi.rendementNetApport > 0.02 ? "kpi-amber" : "kpi-red");

  // DSCR
  const dscrVal = dscr === Infinity ? "∞" : dscr.toFixed(2) + "x";
  const dscrColor = dscr >= 1.5 ? "kpi-green" : dscr >= 1.2 ? "kpi-amber" : "kpi-red";
  setKPI("kpi-dscr", dscrVal, dscrColor);

  // Break-even occupancy
  if (breakEven) {
    const margin = currentOcc - breakEven;
    const beColor = margin > 0.10 ? "kpi-green" : margin > 0.05 ? "kpi-amber" : "kpi-red";
    setKPI("kpi-breakeven", fmtPct(breakEven, 0), beColor);
  } else {
    setKPI("kpi-breakeven", "> 75%", "kpi-red");
  }

  const paybackColor = S.kpi.paybackYear && S.kpi.paybackYear <= 7 ? "kpi-green" : S.kpi.paybackYear && S.kpi.paybackYear <= 10 ? "kpi-amber" : "kpi-red";
  setKPI("kpi-payback", S.kpi.paybackYear ? S.kpi.paybackYear + " ans" : "> " + PROJECTION_YEARS + " ans", paybackColor);
  setKPI("kpi-revpar", fmtNum(S.kpi.revpar) + " MAD");
}

function setKPI(id, value, colorClass) {
  const el = document.getElementById(id);
  if (!el) return;
  const valEl = el.querySelector(".kpi-value");
  if (valEl) {
    valEl.textContent = value;
    valEl.className = "kpi-value" + (colorClass ? " " + colorClass : "");
  }
}

// --- KPI Insights ---
function renderKPIInsights(S) {
  const y1 = S.projections[0];
  const sc = SCENARIOS[S.scenario];
  const currentOcc = sc.tauxOccupation;
  const breakEven = S.kpi.breakEvenOcc;

  // 1. Investissement Total — breakdown
  const pctTerrain = S.terrain.coutTerrain / S.budget.totalProjet;
  const pctConstruction = S.terrain.budgetConstruction / S.budget.totalProjet;
  const pctAmeub = S.budget.ameublement / S.budget.totalProjet;
  let investInsightHtml = `
    <div class="insight-row"><span class="insight-label">Terrain + frais</span><span class="insight-val">${fmtK(S.terrain.coutTerrain)} <small>(${fmtPct(pctTerrain,0)})</small></span></div>
    <div class="insight-row"><span class="insight-label">Construction</span><span class="insight-val">${fmtK(S.terrain.budgetConstruction)} <small>(${fmtPct(pctConstruction,0)})</small></span></div>
    <div class="insight-row"><span class="insight-label">Ameublement</span><span class="insight-val">${fmtK(S.budget.ameublement)} <small>(${fmtPct(pctAmeub,0)})</small></span></div>`;
  if (S.budget.ecoEnabled) {
    const pctEco = S.budget.coutNetEco / S.budget.totalProjet;
    investInsightHtml += `
    <div class="insight-row"><span class="insight-label" style="color:#16a34a">🌿 Éco (net sub. 40%)</span><span class="insight-val" style="color:#16a34a">${fmtK(S.budget.coutNetEco)} <small>(${fmtPct(pctEco,0)})</small></span></div>
    <div style="margin-top:2px;font-size:.66rem;color:#16a34a">Subvention Go Siyaha : ${fmtK(S.budget.subventionEco)} économisés</div>`;
  }
  investInsightHtml += `
    <div style="margin-top:4px;font-size:.68rem;color:var(--text-sec)">Coût / m² terrain : <span class="insight-highlight">${fmtNum(S.terrain.coutM2Terrain)} MAD/m²</span></div>`;
  setInsight("kpi-invest-insight", investInsightHtml);

  // 2. Rendement Brut — comparison vs alternatives
  const rdtBrut = S.kpi.rendementBrut;
  const opciRdt = 0.045; // OPCI rendement ~4.5%
  const livretRdt = 0.028; // Livret épargne ~2.8%
  const bondsRdt = 0.04; // Bons du trésor ~4%
  setInsight("kpi-rdt-brut-insight", `
    <div style="margin-bottom:4px">vs alternatives :</div>
    <div class="insight-row"><span class="insight-label">OPCI (~4.5%)</span><span class="insight-val ${rdtBrut > opciRdt ? 'insight-good' : 'insight-bad'}">${rdtBrut > opciRdt ? '+' : ''}${fmtPct(rdtBrut - opciRdt)}</span></div>
    <div class="insight-row"><span class="insight-label">Bons trésor (~4%)</span><span class="insight-val ${rdtBrut > bondsRdt ? 'insight-good' : 'insight-bad'}">${rdtBrut > bondsRdt ? '+' : ''}${fmtPct(rdtBrut - bondsRdt)}</span></div>
    <div class="insight-row"><span class="insight-label">Livret épargne (~2.8%)</span><span class="insight-val insight-good">+${fmtPct(rdtBrut - livretRdt)}</span></div>
  `);

  // 3. Cash-Flow Net — monthly + per unit breakdown
  const cfMensuel = y1.cashFlowNet / 12;
  const cfParUnite = y1.cashFlowNet / S.units.nbUnites;
  const revMensuel = y1.revTotal / 12;
  const chgMensuel = y1.chargesTotal / 12;
  const detteMensuel = y1.debtServiceTotal / 12;
  setInsight("kpi-cf-net-insight", `
    <div class="insight-row"><span class="insight-label">Revenus / mois</span><span class="insight-val" style="color:var(--green)">${fmtK(revMensuel)}</span></div>
    <div class="insight-row"><span class="insight-label">Charges / mois</span><span class="insight-val" style="color:var(--red)">-${fmtK(chgMensuel)}</span></div>
    <div class="insight-row"><span class="insight-label">Dette / mois</span><span class="insight-val" style="color:var(--red)">-${fmtK(detteMensuel)}</span></div>
    <div style="border-top:1px dashed var(--border);margin-top:3px;padding-top:3px">
      <div class="insight-row"><span class="insight-label"><strong>= CF Net / mois</strong></span><span class="insight-val" style="color:${cfMensuel >= 0 ? 'var(--green)' : 'var(--red)'}"><strong>${fmtK(cfMensuel)}</strong></span></div>
      <div class="insight-row"><span class="insight-label">Par unité / an</span><span class="insight-val">${fmtK(cfParUnite)}</span></div>
    </div>
  `);

  // 4. Rendement / Apport — leverage effect
  const rdtNet = S.kpi.rendementNet;
  const rdtApport = S.kpi.rendementNetApport;
  const leverageMultiple = rdtApport > 0 && rdtNet > 0 ? rdtApport / rdtNet : 0;
  setInsight("kpi-rdt-apport-insight", `
    <div class="insight-row"><span class="insight-label">Rdt net / projet</span><span class="insight-val">${fmtPct(rdtNet)}</span></div>
    <div class="insight-row"><span class="insight-label">Rdt net / apport</span><span class="insight-val insight-highlight">${fmtPct(rdtApport)}</span></div>
    ${leverageMultiple > 1 ? `<div style="margin-top:4px;font-size:.68rem">Effet levier : <span class="insight-good">×${leverageMultiple.toFixed(1)}</span> — l'emprunt multiplie le rendement sur apport</div>` : `<div style="margin-top:4px;font-size:.68rem"><span class="insight-bad">Levier négatif</span> — le coût de la dette dépasse le rendement</div>`}
  `);

  // 5. DSCR — detailed
  const dscr = S.kpi.dscr;
  const ebitda = y1.ebitda;
  const dette = y1.debtServiceTotal;
  const dscrAn5 = S.projections[4] ? (S.projections[4].debtServiceTotal > 0 ? S.projections[4].ebitda / S.projections[4].debtServiceTotal : Infinity) : dscr;
  setInsight("kpi-dscr-insight", `
    <div class="insight-row"><span class="insight-label">EBITDA An 1</span><span class="insight-val">${fmtK(ebitda)}</span></div>
    <div class="insight-row"><span class="insight-label">Service dette An 1</span><span class="insight-val" style="color:var(--red)">${fmtK(dette)}</span></div>
    <div class="insight-bar">
      <span style="font-size:.65rem">1.0x</span>
      <div class="insight-bar-track"><div class="insight-bar-fill" style="width:${Math.min(100, (dscr / 3) * 100)}%;background:${dscr >= 1.5 ? 'var(--green)' : dscr >= 1.2 ? 'var(--amber)' : 'var(--red)'}"></div></div>
      <span style="font-size:.65rem">3.0x</span>
    </div>
    <div style="font-size:.68rem;margin-top:2px">DSCR An 5 : <span class="insight-highlight">${dscrAn5 === Infinity ? '∞' : dscrAn5.toFixed(2) + 'x'}</span></div>
  `);

  // 6. Break-even — marge de sécurité
  if (breakEven) {
    const margin = currentOcc - breakEven;
    const marginPts = Math.round(margin * 100);
    const marginClass = marginPts > 10 ? "insight-good" : marginPts > 5 ? "insight-warn" : "insight-bad";
    const marginLabel = marginPts > 10 ? "Confortable" : marginPts > 5 ? "Faible" : "Critique";
    setInsight("kpi-breakeven-insight", `
      <div class="insight-bar">
        <span style="font-size:.65rem">0%</span>
        <div class="insight-bar-track" style="position:relative">
          <div class="insight-bar-fill" style="width:${breakEven * 100}%;background:var(--red);opacity:.3"></div>
          <div style="position:absolute;left:${breakEven * 100}%;top:-4px;width:2px;height:12px;background:var(--red)"></div>
          <div style="position:absolute;left:${currentOcc * 100}%;top:-4px;width:2px;height:12px;background:var(--green)"></div>
        </div>
        <span style="font-size:.65rem">100%</span>
      </div>
      <div class="insight-row" style="margin-top:4px"><span class="insight-label">Occ. actuelle</span><span class="insight-val">${fmtPct(currentOcc, 0)}</span></div>
      <div class="insight-row"><span class="insight-label">Marge sécurité</span><span class="${marginClass}">${marginPts} pts — ${marginLabel}</span></div>
    `);
  } else {
    setInsight("kpi-breakeven-insight", `<span class="insight-bad">Break-even non atteint dans la plage testée (10-100%)</span>`);
  }

  // 7. Payback — cumulative CF progress
  const payback = S.kpi.paybackYear;
  const apport = S.financement.apportTerrain;
  const cumulY5 = S.projections[4] ? S.projections[4].cumulCashFlow : 0;
  const cumulY10 = S.projections[9] ? S.projections[9].cumulCashFlow : 0;
  const pctRecupY5 = apport > 0 ? Math.min(1, cumulY5 / apport) : 0;
  setInsight("kpi-payback-insight", `
    <div class="insight-row"><span class="insight-label">Apport (terrain)</span><span class="insight-val">${fmtK(apport)}</span></div>
    <div class="insight-row"><span class="insight-label">Cumul CF An 5</span><span class="insight-val" style="color:${cumulY5 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(cumulY5)}</span></div>
    <div class="insight-row"><span class="insight-label">Cumul CF An 10</span><span class="insight-val" style="color:${cumulY10 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(cumulY10)}</span></div>
    <div class="insight-bar" style="margin-top:4px">
      <div class="insight-bar-track"><div class="insight-bar-fill" style="width:${Math.max(0, pctRecupY5 * 100)}%;background:${pctRecupY5 >= 1 ? 'var(--green)' : 'var(--amber)'}"></div></div>
      <span style="font-size:.65rem">${fmtPct(pctRecupY5, 0)} récup. An 5</span>
    </div>
  `);

  // 8. RevPAR — vs market benchmarks
  const revpar = S.kpi.revpar;
  const adrBudget = 525; // Budget segment Maarif
  const adrPremium = 750; // Premium segment Maarif
  const adrLuxe = 965; // Luxe segment Maarif
  setInsight("kpi-revpar-insight", `
    <div style="margin-bottom:4px">Position marché Maarif :</div>
    <div class="insight-bar">
      <div class="insight-bar-track" style="position:relative;height:6px">
        <div style="position:absolute;left:0;width:${(adrBudget / adrLuxe) * 100}%;height:100%;background:#fee2e2;border-radius:2px 0 0 2px"></div>
        <div style="position:absolute;left:${(adrBudget / adrLuxe) * 100}%;width:${((adrPremium - adrBudget) / adrLuxe) * 100}%;height:100%;background:#fef3c7"></div>
        <div style="position:absolute;left:${(adrPremium / adrLuxe) * 100}%;width:${((adrLuxe - adrPremium) / adrLuxe) * 100}%;height:100%;background:#d1fae5;border-radius:0 2px 2px 0"></div>
        <div style="position:absolute;left:${Math.min(100, (revpar / adrLuxe) * 100)}%;top:-3px;width:3px;height:12px;background:var(--primary);border-radius:1px"></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--text-sec);margin-top:2px">
      <span>Budget (${adrBudget})</span><span>Premium (${adrPremium})</span><span>Luxe (${adrLuxe})</span>
    </div>
    <div class="insight-row" style="margin-top:4px"><span class="insight-label">Nuitées / an</span><span class="insight-val">${fmtNum(S.kpi.nuiteesParAn)}</span></div>
    <div class="insight-row"><span class="insight-label">Coût / nuitée</span><span class="insight-val">${fmtNum(S.kpi.coutParNuitee)} MAD</span></div>
  `);
}

function setInsight(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// --- Budget ---
function renderBudget(S) {
  setText("budget-terrain-prix", fmtMAD(TERRAIN.prix));
  setText("budget-terrain-frais", fmtMAD(S.terrain.fraisTerrain));
  setText("budget-terrain-total", fmtMAD(S.terrain.coutTerrain));
  setText("budget-construction", fmtMAD(S.terrain.budgetConstruction));
  setText("budget-ameublement", fmtMAD(S.budget.ameublement));
  setText("budget-total", fmtMAD(S.budget.totalProjet));
  setText("budget-m2", fmtNum(S.terrain.coutM2Terrain) + " MAD/m²");

  // Go Siyaha Éco row
  const ecoRow = document.getElementById("budget-eco-row");
  if (ecoRow) {
    if (S.budget.ecoEnabled) {
      ecoRow.style.display = "";
      setText("budget-eco-invest", fmtMAD(S.budget.investissementEco));
      setText("budget-eco-subvention", "- " + fmtMAD(S.budget.subventionEco));
      setText("budget-eco-net", fmtMAD(S.budget.coutNetEco));
    } else {
      ecoRow.style.display = "none";
    }
  }
}

// --- Programme architectural ---
function renderProgramme(S) {
  const tbody = document.getElementById("programme-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  UNITS.forEach(u => {
    if (u.category === "service") return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.floor}</td>
      <td>${u.type}</td>
      <td class="num">${u.surface ? fmtM2(u.surface) : "–"}</td>
      <td><span class="badge ${badgeClass(u.category)}">${u.category}</span></td>
    `;
    tbody.appendChild(tr);
  });
  const tr = document.createElement("tr");
  tr.className = "total-row";
  tr.innerHTML = `
    <td colspan="2"><strong>Total surface locative</strong></td>
    <td class="num"><strong>${fmtM2(S.units.surfaceLocative)}</strong></td>
    <td><strong>${S.units.nbUnites} unités + 1 commercial</strong></td>
  `;
  tbody.appendChild(tr);
}

// --- Revenus ---
function renderRevenus(S) {
  const sc = SCENARIOS[S.scenario];
  const y1 = S.projections[0];
  setText("rev-brut-hotel",  fmtMAD(y1.revBrutHotel));
  setText("rev-commissions", fmtMAD(y1.commissions));
  setText("rev-net-hotel",   fmtMAD(y1.revNetHotel));
  setText("rev-commercial",  fmtMAD(y1.revCommercial));
  setText("rev-total",       fmtMAD(y1.revTotal));
  setText("rev-nuitees",     fmtNum(S.kpi.nuiteesParAn));
  setText("rev-scenario",    sc.label + " — " + fmtPct(sc.tauxOccupation, 0) + " · Studios " + sc.prixNuitStudio + " MAD · Lofts " + sc.prixNuitLoft + " MAD");

  const tbody = document.getElementById("rev-table-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  S.projections.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>An ${p.year}</td>
      <td class="num">${fmtMAD(p.revBrutHotel)}</td>
      <td class="num neg">(${fmtMAD(p.commissions)})</td>
      <td class="num">${fmtMAD(p.revNetHotel)}</td>
      <td class="num">${fmtMAD(p.revCommercial)}</td>
      <td class="num bold">${fmtMAD(p.revTotal)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Charges ---
function renderCharges(S) {
  const y1 = S.projections[0];
  const ch = y1.chargesDetail;
  setText("ch-total",  fmtMAD(y1.chargesTotal));
  setText("ch-ebitda", fmtMAD(y1.ebitda));
  setText("ch-marge",  fmtPct(y1.margeExploitation));
  setText("ch-nuitee", fmtNum(S.kpi.coutParNuitee) + " MAD");

  const items = [
    { name: "Société de gestion (20% CA héberg.)", val: ch.gestion },
    { name: "Salaires 2 employés (charges incl.)",  val: ch.salaires },
    { name: "Eau + Électricité + Internet",          val: ch.utilities },
    { name: "Consommables ménage & linge",           val: ch.consommables },
    { name: "Comptable externe",                     val: ch.comptable },
    { name: "Assurance",                             val: ch.assurance },
    { name: "Entretien & maintenance",               val: ch.entretien },
    { name: "Taxes professionnelles" + (ch.taxesPro === 0 ? " (exonéré 5 ans)" : ""), val: ch.taxesPro },
    { name: "Divers & imprévus",                     val: ch.divers },
  ];
  const tbody = document.getElementById("charges-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  items.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="num">${fmtMAD(item.val)}</td>
      <td class="num">${fmtMAD(item.val / 12)}</td>
      <td class="num">${fmtPct(item.val / y1.chargesTotal)}</td>
    `;
    tbody.appendChild(tr);
  });
  const trTotal = document.createElement("tr");
  trTotal.className = "total-row";
  trTotal.innerHTML = `<td><strong>Total</strong></td><td class="num"><strong>${fmtMAD(y1.chargesTotal)}</strong></td><td class="num"><strong>${fmtMAD(y1.chargesTotal / 12)}</strong></td><td class="num"><strong>100%</strong></td>`;
  tbody.appendChild(trTotal);
}

// --- Financement ---
function renderFinancement(S) {
  const F = S.financement;
  // Subvention
  setText("fin-subvention",     fmtMAD(F.subventionMDM));
  setText("fin-devises-min",    fmtMAD(F.apportDevisesMin));

  // Apport terrain
  setText("fin-apport",         fmtMAD(F.apportTerrain));
  setText("fin-pct-apport",     fmtPct(F.pctApport));

  // Tamwilkom
  setText("fin-tk-montant",     fmtMAD(F.montantTamwilkom));
  setText("fin-tk-taux",        fmtPct(TAMWILKOM.tauxAnnuel) + " HT");
  setText("fin-tk-duree",       TAMWILKOM.dureeAns + " ans (dont " + TAMWILKOM.differeAns + " ans différé)");
  setText("fin-tk-mensualite",  fmtMAD(F.mensualiteTK));
  setText("fin-tk-cout",        fmtMAD(F.coutTotalTK));

  // Banque classique
  setText("fin-bq-montant",     fmtMAD(F.montantBanque));
  setText("fin-bq-taux",        fmtPct(BANQUE_CLASSIQUE.tauxAnnuel));
  setText("fin-bq-duree",       BANQUE_CLASSIQUE.dureeAns + " ans");
  setText("fin-bq-mensualite",  fmtMAD(F.mensualiteBQ));
  setText("fin-bq-cout",        fmtMAD(F.coutTotalBQ));

  // Total
  setText("fin-total-projet",   fmtMAD(S.budget.totalProjet));
  setText("fin-montant-financer", fmtMAD(F.montantAFinancer));

  // Progress bar
  const bar = document.getElementById("fin-progress");
  if (bar) {
    bar.innerHTML = `
      <div class="progress-seg" style="width:${F.pctApport * 100}%;background:var(--primary)" title="Apport terrain">Terrain ${fmtPct(F.pctApport, 0)}</div>
      <div class="progress-seg" style="width:${F.pctTamwilkom * 100}%;background:var(--gold)" title="Tamwilkom">TK ${fmtPct(F.pctTamwilkom, 0)}</div>
      <div class="progress-seg" style="width:${F.pctBanque * 100}%;background:var(--primary-light)" title="Banque classique">Banque ${fmtPct(F.pctBanque, 0)}</div>
      <div class="progress-seg" style="width:${F.pctSubvention * 100}%;background:var(--green)" title="Subvention MDM Invest">MDM ${fmtPct(F.pctSubvention, 0)}</div>
    `;
  }

  // --- Feedback & Alertes MDM ---
  const feedbackEl = document.getElementById("fin-feedback");
  if (feedbackEl && typeof FINANCEMENT_SOURCES !== "undefined") {
    const iconMap = { warning: "⚠️", info: "ℹ️", positive: "✅" };
    const colorMap = { warning: "#fff3cd", info: "#e8f4fd", positive: "#d4edda" };
    const borderMap = { warning: "#f0c36d", info: "#7cb9e8", positive: "#82c785" };
    let html = "";
    FINANCEMENT_SOURCES.feedback.forEach(fb => {
      html += `<div class="fin-feedback-item" style="background:${colorMap[fb.type]};border-left:4px solid ${borderMap[fb.type]};padding:10px 14px;border-radius:6px;margin-bottom:8px">
        <div style="font-weight:700;font-size:.85rem;margin-bottom:4px">${iconMap[fb.type]} ${fb.title}</div>
        <div style="font-size:.8rem;color:#333;line-height:1.5">${fb.detail}</div>
        <a href="${fb.url}" target="_blank" rel="noopener" style="font-size:.72rem;color:#5a7;margin-top:4px;display:inline-block">📎 ${fb.source}</a>
      </div>`;
    });
    feedbackEl.innerHTML = html;
  }

  // --- Sources avec liens ---
  const srcEl = document.getElementById("fin-sources");
  if (srcEl && typeof FINANCEMENT_SOURCES !== "undefined") {
    let html = "<div style='margin-bottom:8px'><strong style='font-size:.8rem;color:var(--primary)'>MDM Invest</strong></div>";
    FINANCEMENT_SOURCES.mdmInvest.forEach(s => {
      html += `<a href="${s.url}" target="_blank" rel="noopener" class="fin-source-link">🔗 ${s.label}</a>`;
    });
    html += "<div style='margin:10px 0 8px'><strong style='font-size:.8rem;color:var(--primary)'>MDM Tamwil</strong></div>";
    FINANCEMENT_SOURCES.mdmTamwil.forEach(s => {
      html += `<a href="${s.url}" target="_blank" rel="noopener" class="fin-source-link">🔗 ${s.label}</a>`;
    });
    srcEl.innerHTML = html;
  }
}

// --- Cash-Flow ---
function renderCashFlow(S) {
  const y1 = S.projections[0];
  setText("cf-net-an1",     fmtMAD(y1.cashFlowNet));
  setText("cf-rdt-projet",  fmtPct(S.kpi.rendementNet));
  setText("cf-rdt-apport",  fmtPct(S.kpi.rendementNetApport));
  setText("cf-payback",     S.kpi.paybackYear ? S.kpi.paybackYear + " ans" : "> " + PROJECTION_YEARS + " ans");

  const tbody = document.getElementById("cf-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  S.projections.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>An ${p.year}</td>
      <td class="num bold">${fmtMAD(p.revTotal)}</td>
      <td class="num neg">(${fmtMAD(p.chargesTotal)})</td>
      <td class="num" style="background:#e8f5e9"><strong>${fmtMAD(p.ebitda)}</strong></td>
      <td class="num neg">(${fmtMAD(p.debtServiceTotal)})</td>
      <td class="num neg">(${fmtMAD(p.is)})</td>
      <td class="num bold" style="color:${clrSign(p.cashFlowNet)}">${fmtMAD(p.cashFlowNet)}</td>
      <td class="num bold" style="color:${clrSign(p.cumulCashFlow)}">${fmtMAD(p.cumulCashFlow)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Gestion propre vs Société ---
function renderGestion(S) {
  const G = S.gestion;
  if (!G) return;

  setText("gest-ebitda-societe", fmtMAD(G.societe.ebitda));
  setText("gest-marge-societe", "Marge " + fmtPct(G.societe.marge, 1));
  setText("gest-ebitda-propre", fmtMAD(G.propre.ebitda));
  setText("gest-marge-propre", "Marge " + fmtPct(G.propre.marge, 1));
  setText("gest-economie", "+" + fmtMAD(G.economiePropre) + " /an");
  setText("gest-rev-total", fmtMAD(G.revTotal) + " /an");

  // Société detail table
  const tbS = document.getElementById("gest-societe-tbody");
  if (tbS) tbS.innerHTML = `
    <tr><td>Revenus totaux</td><td class="num">${fmtMAD(G.revTotal)}</td></tr>
    <tr style="color:var(--danger)"><td>Commission société (${fmtPct(CHARGES.tauxGestion,0)} du CA brut)</td><td class="num">-${fmtMAD(G.societe.gestion)}</td></tr>
    <tr><td>Salaires (${G.societe.nbEmployes} employés)</td><td class="num">-${fmtMAD(G.societe.salaires)}</td></tr>
    <tr><td>Comptable</td><td class="num">-${fmtMAD(G.societe.comptable)}</td></tr>
    <tr><td>Charges communes (utilities, entretien...)</td><td class="num">-${fmtMAD(G.chargesCommunes)}</td></tr>
  `;
  const eSoc = document.getElementById("gest-societe-ebitda");
  if (eSoc) eSoc.textContent = fmtMAD(G.societe.ebitda);

  // Propre detail table
  const tbP = document.getElementById("gest-propre-tbody");
  if (tbP) tbP.innerHTML = `
    <tr><td>Revenus totaux</td><td class="num">${fmtMAD(G.revTotal)}</td></tr>
    <tr style="color:var(--green)"><td>Commission société</td><td class="num">0 MAD</td></tr>
    <tr><td>Salaires (${G.propre.nbEmployes} employés, incl. manager)</td><td class="num">-${fmtMAD(G.propre.salaires)}</td></tr>
    <tr><td>Comptable</td><td class="num">-${fmtMAD(G.propre.comptable)}</td></tr>
    <tr><td>Logiciel PMS/Channel Manager</td><td class="num">-${fmtMAD(G.propre.logiciel)}</td></tr>
    <tr><td>Charges communes (utilities, entretien...)</td><td class="num">-${fmtMAD(G.chargesCommunes)}</td></tr>
  `;
  const ePro = document.getElementById("gest-propre-ebitda");
  if (ePro) ePro.textContent = fmtMAD(G.propre.ebitda);

  // Avantages / Inconvénients
  const fillList = (id, items) => {
    const ul = document.getElementById(id);
    if (ul) ul.innerHTML = items.map(i => `<li>${i}</li>`).join("");
  };
  fillList("gest-societe-avantages", G.societe.avantages);
  fillList("gest-societe-inconvenients", G.societe.inconvenients);
  fillList("gest-propre-avantages", G.propre.avantages);
  fillList("gest-propre-inconvenients", G.propre.inconvenients);

  // Recommandation
  const recEl = document.getElementById("gest-recommandation");
  if (recEl) recEl.textContent = G.recommandation;
}

// --- Marché ---
function renderMarche(S) {
  setText("mkt-visiteurs", fmtNum(MARKET_DATA.visiteurs2024));
  setText("mkt-nuitees",   fmtNum(MARKET_DATA.nuitees2024));
  setText("mkt-croissance-casa", fmtPct(MARKET_DATA.croissanceCasaS1_2025, 0));
  // Airbnb data
  setText("mkt-listings-casa", fmtNum(MARKET_DATA.airbnbData.totalListingsCasa));
  setText("mkt-listings-maarif", fmtNum(MARKET_DATA.airbnbData.listingsMaarif));
  setText("mkt-adr-maarif", fmtNum(MARKET_DATA.airbnbData.adrMaarifMAD) + " MAD");
  setText("mkt-occ-mediane", fmtPct(MARKET_DATA.airbnbData.occupancyMedianeCasa, 0));
  setText("mkt-occ-top25", fmtPct(MARKET_DATA.airbnbData.occupancyTop25, 0));
  setText("mkt-croissance-listings", "+" + fmtPct(MARKET_DATA.airbnbData.croissanceListings, 0));

  const tbody = document.getElementById("mkt-concurrence-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  MARKET_DATA.concurrence.forEach(c => {
    const gammeClass = c.gamme === "Luxe" ? "badge-green" : c.gamme === "Premium" ? "badge-blue" : c.gamme === "Milieu+" ? "badge-amber" : "badge-amber";
    const ratingStr = c.rating ? `<strong>${c.rating}</strong>/10` : "–";
    const reviewsStr = c.reviews ? `(${c.reviews})` : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.nom}</td><td style="font-size:.78rem">${c.type}</td><td>${ratingStr} ${reviewsStr}</td><td><strong>${c.prix}</strong></td><td><span class="badge ${gammeClass}">${c.gamme}</span></td>`;
    tbody.appendChild(tr);
  });
}

// --- Fiscalité ---
function renderFiscalite(S) {
  // KPI cards
  setText("fisc-tva-collectee",  fmtMAD(S.tva.tvaCollecteeAn1));
  setText("fisc-tva-deductible", fmtMAD(S.tva.tvaDeductibleAn1));
  setText("fisc-tva-credit",     fmtMAD(S.tva.creditTVA));
  const recup = S.tva.dureeRecupCredit;
  setText("fisc-tva-recup",      recup ? recup + " ans" : "> " + PROJECTION_YEARS + " ans");
  setText("fisc-tva-recup-sub",  recup ? "Puis TVA à payer normalement" : "Crédit non épuisé sur " + PROJECTION_YEARS + " ans");

  // Info box details
  setText("fisc-constr-ht",  fmtMAD(S.tva.constructionHT));
  setText("fisc-tva-constr", fmtMAD(S.tva.tvaConstruction));
  const badgeRecup = document.getElementById("fisc-badge-recup");
  if (badgeRecup) badgeRecup.textContent = recup ? recup + " premières années" : "> " + PROJECTION_YEARS + " ans";

  // TVA projection table
  const tbody = document.getElementById("fisc-tva-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  S.tva.tvaProjections.forEach(t => {
    const tr = document.createElement("tr");
    const hasCredit = t.creditRestant > 0;
    tr.innerHTML = `
      <td>An ${t.year}</td>
      <td class="num">${fmtMAD(t.tvaCollectee)}</td>
      <td class="num">${fmtMAD(t.tvaDeductible)}</td>
      <td class="num" style="color:${t.soldeTVA >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(t.soldeTVA)}</td>
      <td class="num ${hasCredit ? 'bold' : ''}" style="color:${hasCredit ? 'var(--amber)' : 'var(--green)'}">${fmtMAD(t.creditRestant)}</td>
      <td class="num">${t.tvaAPayer > 0 ? fmtMAD(t.tvaAPayer) : '<span style="color:var(--green)">0 MAD</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Risques ---
function renderRisques(S) {
  const tbody = document.getElementById("risk-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const sorted = [...RISKS].sort((a, b) => (b.prob * b.impact) - (a.prob * a.impact));
  sorted.forEach(r => {
    const score = r.prob * r.impact;
    const level = score > 0.3 ? "badge-red" : score > 0.15 ? "badge-amber" : "badge-green";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.name}</td>
      <td><div class="meter"><div class="meter-fill" style="width:${r.prob * 100}%;background:var(--amber)"></div></div></td>
      <td><div class="meter"><div class="meter-fill" style="width:${r.impact * 100}%;background:var(--red)"></div></div></td>
      <td><span class="badge ${level}">${(score * 100).toFixed(0)}%</span></td>
      <td class="small">${r.mitigation}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Sensibilité ---
function renderSensibilite(S) {
  const tbody = document.getElementById("sens-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const currentOcc = SCENARIOS[S.scenario].tauxOccupation;
  const breakEven = S.kpi.breakEvenOcc;

  // Add break-even info above table
  const beInfo = document.getElementById("sens-breakeven-info");
  if (beInfo && breakEven) {
    const margin = currentOcc - breakEven;
    beInfo.innerHTML = `<strong>Seuil de rentabilité : ${fmtPct(breakEven, 0)} d'occupation</strong> — Marge de sécurité : ${fmtPct(margin, 0)} ${margin > 0.10 ? '✅ Confortable' : margin > 0.05 ? '⚠️ Faible' : '🔴 Critique'}`;
    beInfo.className = margin > 0.10 ? "info-box" : margin > 0.05 ? "warn-box" : "warn-box";
    beInfo.style.borderLeftColor = margin > 0.10 ? "var(--green)" : margin > 0.05 ? "var(--amber)" : "var(--red)";
  }

  S.sensitivity.forEach(s => {
    const isCurrent = Math.abs(s.occ - currentOcc) < 0.01;
    const isBreakEven = breakEven && Math.abs(s.occ - breakEven) < 0.03;
    const tr = document.createElement("tr");
    if (isCurrent) tr.className = "highlight-row";
    if (isBreakEven && !isCurrent) tr.style.background = "#fef2f2";
    tr.innerHTML = `
      <td class="${isCurrent ? 'bold' : ''}">
        ${fmtPct(s.occ, 0)}
        ${isCurrent ? ' <span class="badge badge-blue">Actuel</span>' : ''}
        ${isBreakEven ? ' <span class="badge badge-red">Break-even</span>' : ''}
      </td>
      <td class="num">${fmtMAD(s.revenu)}</td>
      <td class="num">${fmtMAD(s.ebitda)}</td>
      <td class="num bold" style="color:${clrSign(s.cashFlow)}">${fmtMAD(s.cashFlow)}</td>
      <td class="num" style="color:${clrSign(s.rendement)}">${fmtPct(s.rendement)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Subventions ---
function renderSubventions(S) {
  // KPI totals
  const eligible = SUBVENTIONS.filter(s => s.eligible === true);
  const totalConserv = eligible.reduce((sum, s) => sum + s.montantEstime, 0);
  const totalOpti = eligible.reduce((sum, s) => sum + (s.montantMax || s.montantEstime), 0);
  setText("sub-total-conserv", fmtMAD(totalConserv));
  setText("sub-total-opti",    fmtMAD(totalOpti));
  setText("sub-pct-projet",    fmtPct(totalConserv / S.budget.totalProjet));
  setText("sub-nb-programmes", eligible.length + " / " + SUBVENTIONS.length);

  // Table with expandable details
  const tbody = document.getElementById("sub-table-tbody");
  if (tbody) {
    tbody.innerHTML = "";
    SUBVENTIONS.forEach((s, i) => {
      const eligClass = s.eligible === true ? "sub-elig-yes" : s.eligible === "partial" ? "sub-elig-partial" : "sub-elig-no";
      const eligText = s.eligible === true ? "Éligible" : s.eligible === "partial" ? "Partiel" : "Non éligible";

      // Main row (clickable)
      const tr = document.createElement("tr");
      tr.className = "sub-row-clickable";
      tr.setAttribute("data-sub-idx", i);
      tr.innerHTML = `
        <td><strong>${s.name}</strong> <span class="sub-expand-icon">▸</span></td>
        <td class="small">${s.institution}</td>
        <td><span class="sub-type-badge sub-type-${s.type}">${s.type}</span></td>
        <td class="small">${s.offer}</td>
        <td class="num bold">${fmtMAD(s.montantEstime)}${s.montantMax ? '<br><small style="color:var(--muted)">max ' + fmtMAD(s.montantMax) + '</small>' : ''}</td>
        <td><span class="${eligClass}">${eligText}</span></td>
      `;
      tr.addEventListener("click", () => toggleSubDetail(i));
      tbody.appendChild(tr);

      // Detail row (hidden by default)
      const detailTr = document.createElement("tr");
      detailTr.className = "sub-detail-row hidden";
      detailTr.id = "sub-detail-" + i;
      const conditionsHtml = (s.conditions || []).map(c => {
        const icon = c.projet ? '<span style="color:var(--green)">✓</span>' : '<span style="color:var(--red)">✗</span>';
        return `<div class="sub-cond-item">
          <div class="sub-cond-status">${icon}</div>
          <div class="sub-cond-body">
            <div class="sub-cond-label">${c.label}${c.requis ? '' : ' <small style="color:var(--muted)">(optionnel)</small>'}</div>
            <div class="sub-cond-detail">${c.detail}</div>
          </div>
        </div>`;
      }).join("");

      const verdictClass = s.eligible === true ? "sub-verdict-yes" : s.eligible === "partial" ? "sub-verdict-partial" : "sub-verdict-no";
      const verdictIcon = s.eligible === true ? "✓" : s.eligible === "partial" ? "~" : "✗";
      const verdictLabel = s.eligible === true ? "Éligible" : s.eligible === "partial" ? "Éligibilité partielle" : "Non éligible";
      const verdictText = s.whyEligible || s.whyNotEligible || s.eligibilityNote;

      detailTr.innerHTML = `<td colspan="6">
        <div class="sub-detail-panel">
          <div class="sub-detail-section">
            <div class="sub-detail-heading">Conditions d'éligibilité</div>
            <div class="sub-cond-list">${conditionsHtml}</div>
          </div>
          <div class="sub-detail-section">
            <div class="sub-verdict ${verdictClass}">
              <span class="sub-verdict-icon">${verdictIcon}</span>
              <div>
                <div class="sub-verdict-label">${verdictLabel}</div>
                <div class="sub-verdict-text">${verdictText}</div>
              </div>
            </div>
          </div>
          <div class="sub-detail-meta">
            <span>Processus : ${s.process}</span>
            <span>Source : ${s.source}</span>
          </div>
        </div>
      </td>`;
      tbody.appendChild(detailTr);
    });
  }

  // MDM Process timeline
  const stepsEl = document.getElementById("mdm-steps");
  if (stepsEl && MDM_PROCESS.invest) {
    stepsEl.innerHTML = "";
    MDM_PROCESS.invest.steps.forEach(s => {
      stepsEl.innerHTML += `
        <div class="sub-step">
          <div class="sub-step-num">Étape ${s.step}</div>
          <div class="sub-step-desc">${s.desc}</div>
          <div class="sub-step-delai">${s.delai}</div>
        </div>`;
    });
  }

  setText("mdm-timeline-officiel", MDM_PROCESS.invest.timeline.officiel);
  setText("mdm-timeline-reel", MDM_PROCESS.invest.timeline.reel);
  setText("mdm-banques", MDM_PROCESS.invest.banquesPartenaires.join(", "));

  // Documents
  const docsEl = document.getElementById("mdm-docs");
  if (docsEl) {
    docsEl.innerHTML = MDM_PROCESS.invest.documents.map(d => `<li>${d}</li>`).join("");
  }

  // Changes 2024
  const changesEl = document.getElementById("mdm-changes");
  if (changesEl) {
    changesEl.innerHTML = MDM_PROCESS.invest.changements2024.map(c => `<li>${c}</li>`).join("");
  }

  // MDM Tamwil conditions
  const tamwilTbody = document.getElementById("mdm-tamwil-tbody");
  if (tamwilTbody && MDM_PROCESS.tamwil) {
    const c = MDM_PROCESS.tamwil.conditions;
    tamwilTbody.innerHTML = `
      <tr><td>Taux</td><td class="num bold">${c.taux}</td></tr>
      <tr><td>Durée</td><td class="num">${c.duree}</td></tr>
      <tr><td>Différé</td><td class="num">${c.differe}</td></tr>
      <tr><td>Montant</td><td class="num">${c.montant}</td></tr>
      <tr><td>Max % du projet</td><td class="num">${c.maxProjet}</td></tr>
      <tr><td>Projet minimum</td><td class="num">${c.minProjet}</td></tr>
    `;
  }

  // Feedbacks
  const fbPos = document.getElementById("mdm-fb-positifs");
  const fbNeg = document.getElementById("mdm-fb-negatifs");
  if (fbPos) fbPos.innerHTML = MDM_PROCESS.feedbacks.positifs.map(f => `<li>${f}</li>`).join("");
  if (fbNeg) fbNeg.innerHTML = MDM_PROCESS.feedbacks.negatifs.map(f => `<li>${f}</li>`).join("");

  // Risques MDM
  const riskTbody = document.getElementById("mdm-risques-tbody");
  if (riskTbody) {
    riskTbody.innerHTML = "";
    MDM_PROCESS.feedbacks.risques.forEach(r => {
      const probColor = r.prob >= 0.6 ? "var(--red)" : r.prob >= 0.4 ? "var(--amber)" : "var(--green)";
      riskTbody.innerHTML += `
        <tr>
          <td><strong>${r.risque}</strong></td>
          <td><div class="meter"><div class="meter-fill" style="width:${r.prob * 100}%;background:${probColor}"></div></div> ${(r.prob * 100).toFixed(0)}%</td>
          <td class="small">${r.detail}</td>
        </tr>`;
    });
  }

  // Sources
  setText("mdm-sources", MDM_PROCESS.feedbacks.sources.join(" | "));
}

// --- Subvention detail toggle ---
function toggleSubDetail(idx) {
  const detail = document.getElementById("sub-detail-" + idx);
  const row = document.querySelector(`tr[data-sub-idx="${idx}"]`);
  if (!detail || !row) return;
  const isOpen = !detail.classList.contains("hidden");
  // Close all others
  document.querySelectorAll(".sub-detail-row").forEach(r => r.classList.add("hidden"));
  document.querySelectorAll(".sub-row-clickable").forEach(r => r.classList.remove("sub-row-open"));
  if (!isOpen) {
    detail.classList.remove("hidden");
    row.classList.add("sub-row-open");
  }
}

// --- Utility ---
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
