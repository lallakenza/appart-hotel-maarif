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
  renderHeader(state);
  renderExecutiveSummary(state);
  renderVerdict(state);
  renderScenarioButtons(state);
  renderKPIs(state);
  renderKPIInsights(state);
  renderBudget(state);
  renderProgramme(state);
  renderSurfaceUtile(state);
  renderScenarioComparison(state);
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
  renderGoSiyaha(state);
  renderMontages(state);
  renderCapexOpex(state);
}

// --- Header badge (dynamic total projet) ---
function renderHeader(S) {
  setText("header-badge", fmtMAD(S.budget.investissementNet) + "*");
}

// --- Executive Summary Mini-Scorecard ---
function renderExecutiveSummary(S) {
  const y1 = S.projections[0];
  const K = S.kpi;
  const elem = document.getElementById("exec-summary");

  if (!elem) return;

  // Only show if it's the overview (to avoid clutter)
  if (currentView !== "overview" && typeof currentView !== "undefined") {
    elem.style.display = "none";
    return;
  }
  elem.style.display = "grid";

  function setExecKPI(id, val, dotId, isGood) {
    const el = document.getElementById(id);
    const dot = document.getElementById(dotId);
    if (el) el.textContent = val;
    if (dot) {
      dot.style.background = isGood ? "var(--green)" : isGood === false ? "var(--red)" : "var(--amber)";
    }
  }

  // Investissement
  setExecKPI("exec-invest", fmtK(S.budget.investissementNet) + "*", "exec-invest-dot", true);

  // CF An1
  const cfGood = y1.cashFlowNet > 0;
  setExecKPI("exec-cf", fmtK(y1.cashFlowNet), "exec-cf-dot", cfGood);

  // TRI
  const triGood = K.tri >= 0.10 ? true : K.tri >= 0.07 ? null : false;
  setExecKPI("exec-tri", isFinite(K.tri) ? fmtPct(K.tri, 0) : "N/A", "exec-tri-dot", triGood);

  // Payback
  const pbGood = K.paybackYear && K.paybackYear <= 7 ? true : K.paybackYear && K.paybackYear <= 10 ? null : false;
  setExecKPI("exec-payback", K.paybackYear ? K.paybackYear + " ans" : ">20a", "exec-payback-dot", pbGood);

  // DSCR
  const dscrGood = K.dscr >= 1.5 ? true : K.dscr >= 1.2 ? null : false;
  setExecKPI("exec-dscr", K.dscr === Infinity ? "∞" : K.dscr.toFixed(2) + "x", "exec-dscr-dot", dscrGood);

  // VAN
  const vanGood = K.van > 0;
  setExecKPI("exec-van", fmtK(K.van), "exec-van-dot", vanGood);
}

// --- Scenario Comparison Table ---
function renderScenarioComparison(S) {
  const tbody = document.getElementById("scenario-comparison-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Compute metrics for all 5 scenarios
  const scenarios = ["prudent", "prudent_moyen", "moyen", "moyen_optimiste", "optimiste"];

  scenarios.forEach(scKey => {
    const sc = SCENARIOS[scKey];
    const scState = compute(scKey); // Compute state for this scenario
    const y1 = scState.projections[0];
    const K = scState.kpi;

    // Moyenne pondérée prix/nuit (studios + lofts)
    const nbS = scState.units.nbStudios;
    const nbL = scState.units.nbLofts;
    const prixMoyenNuit = (nbS * sc.prixNuitStudio + nbL * sc.prixNuitLoft) / (nbS + nbL);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${sc.label}</strong></td>
      <td class="num">${fmtPct(sc.tauxOccupation, 0)}</td>
      <td class="num">${fmtNum(Math.round(prixMoyenNuit))} MAD</td>
      <td class="num">${fmtPct(K.rendementBrut)}</td>
      <td class="num" style="color:${y1.cashFlowNet >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(y1.cashFlowNet)}</td>
      <td class="num" style="color:${K.tri >= 0.10 ? 'var(--green)' : K.tri >= 0.07 ? 'var(--amber)' : 'var(--red)'}">${isFinite(K.tri) ? fmtPct(K.tri, 0) : 'N/A'}</td>
      <td class="num">${K.paybackYear ? K.paybackYear + ' ans' : '>20a'}</td>
      <td class="num" style="color:${K.dscr >= 1.5 ? 'var(--green)' : K.dscr >= 1.2 ? 'var(--amber)' : 'var(--red)'}">${K.dscr === Infinity ? '∞' : K.dscr.toFixed(2)}x</td>
      <td class="num" style="color:${K.van >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(K.van)}</td>
    `;
    tbody.appendChild(tr);
  });
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

  setKPI("kpi-invest",     fmtMAD(S.budget.investissementNet) + "*");
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
  const livretUAE = 0.0625; // Livret épargne UAE ~6.25%
  const opciRdt = 0.045;    // OPCI rendement ~4.5%
  const bondsRdt = 0.04;    // Bons du trésor Maroc ~4%
  setInsight("kpi-rdt-brut-insight", `
    <div style="margin-bottom:4px">vs alternatives :</div>
    <div class="insight-row"><span class="insight-label">Livret UAE (~6.25%)</span><span class="insight-val ${rdtBrut > livretUAE ? 'insight-good' : 'insight-bad'}">${rdtBrut > livretUAE ? '+' : ''}${fmtPct(rdtBrut - livretUAE)}</span></div>
    <div class="insight-row"><span class="insight-label">OPCI Maroc (~4.5%)</span><span class="insight-val ${rdtBrut > opciRdt ? 'insight-good' : 'insight-bad'}">${rdtBrut > opciRdt ? '+' : ''}${fmtPct(rdtBrut - opciRdt)}</span></div>
    <div class="insight-row"><span class="insight-label">Bons trésor (~4%)</span><span class="insight-val ${rdtBrut > bondsRdt ? 'insight-good' : 'insight-bad'}">${rdtBrut > bondsRdt ? '+' : ''}${fmtPct(rdtBrut - bondsRdt)}</span></div>
    <div style="margin-top:4px;font-size:.66rem;color:var(--text-sec)">⚡ Mais : l'immobilier crée du patrimoine via le capital de crédit (effet de levier)</div>
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
  // Capital remboursé An 1 = création de richesse via crédit
  const capitalRembAn1 = (y1.capitalTK || 0) + (y1.capitalBQ || 0);
  const totalCapitalCredit = S.financement.montantTamwilkom + S.financement.montantBanque;
  setInsight("kpi-rdt-apport-insight", `
    <div class="insight-row"><span class="insight-label">Rdt net / projet</span><span class="insight-val">${fmtPct(rdtNet)}</span></div>
    <div class="insight-row"><span class="insight-label">Rdt net / apport</span><span class="insight-val insight-highlight">${fmtPct(rdtApport)}</span></div>
    ${leverageMultiple > 1 ? `<div style="margin-top:4px;font-size:.68rem">Effet levier : <span class="insight-good">×${leverageMultiple.toFixed(1)}</span> — l'emprunt multiplie le rendement sur apport</div>` : `<div style="margin-top:4px;font-size:.68rem"><span class="insight-bad">Levier négatif</span> — le coût de la dette dépasse le rendement</div>`}
    <div style="margin-top:3px;font-size:.66rem;color:var(--text-sec)">💰 Capital remboursé An 1 : <span class="insight-good">${fmtK(capitalRembAn1)}</span> → patrimoine créé via le crédit</div>
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

  // 7. Payback — cumulative CF progress vs apport net
  const payback = S.kpi.paybackYear;
  const apport = S.financement.apportNet;
  const cumulY5 = S.projections[4] ? S.projections[4].cumulCashFlow : 0;
  const cumulY10 = S.projections[9] ? S.projections[9].cumulCashFlow : 0;
  const pctRecupY5 = apport > 0 ? Math.min(1, cumulY5 / apport) : 0;
  setInsight("kpi-payback-insight", `
    <div class="insight-row"><span class="insight-label">Apport net (terrain − MDM)</span><span class="insight-val">${fmtK(apport)}</span></div>
    <div class="insight-row"><span class="insight-label">Cumul CF An 5</span><span class="insight-val" style="color:${cumulY5 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(cumulY5)}</span></div>
    <div class="insight-row"><span class="insight-label">Cumul CF An 10</span><span class="insight-val" style="color:${cumulY10 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtK(cumulY10)}</span></div>
    <div class="insight-bar" style="margin-top:4px">
      <div class="insight-bar-track"><div class="insight-bar-fill" style="width:${Math.max(0, pctRecupY5 * 100)}%;background:${pctRecupY5 >= 1 ? 'var(--green)' : 'var(--amber)'}"></div></div>
      <span style="font-size:.65rem">${fmtPct(pctRecupY5, 0)} récup. An 5</span>
    </div>
  `);

  // 8. RevPAR — vs market benchmarks
  const revpar = S.kpi.revpar;
  const adrBudget = MARKET_DATA.prixNuiteeRange.bas;
  const adrPremium = MARKET_DATA.prixNuiteeRange.haut;
  const adrLuxe = BENCHMARK.summary.luxe2BR.median;
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
  // Dynamic ameublement label
  const ameubLabel = document.getElementById("budget-ameublement-label");
  if (ameubLabel) ameubLabel.textContent = `dont ameublement (${S.units.nbUnites} × ${fmtNum(BUDGET.ameublementParUnite / 1000)}K)`;
  setText("budget-total-brut", fmtMAD(S.budget.totalProjet));
  setText("budget-mdm", fmtMAD(S.financement.subventionMDM));
  setText("budget-total", fmtMAD(S.budget.investissementNet) + "*");
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
    const posIcon = u.position === "Rue" ? "🏙️" : u.position === "Intérieur" ? "🏠" : "";
    const posClass = u.position === "Rue" ? "pos-rue" : u.position === "Intérieur" ? "pos-int" : "";
    const ter = u.terrasse > 0 ? fmtM2(u.terrasse) : "–";
    const sUtile = u.surface ? (u.surface + (u.terrasse || 0) * 0.5).toFixed(2) + " m²" : "–";
    tr.innerHTML = `
      <td>${u.floor}</td>
      <td>${u.type}</td>
      <td class="num">${u.surface ? fmtM2(u.surface) : "–"}</td>
      <td class="num">${ter}</td>
      <td class="num" style="font-weight:600">${sUtile}</td>
      <td><span class="badge-pos ${posClass}">${posIcon} ${u.position || "–"}</span></td>
      <td>${u.exposition || "–"}</td>
      <td><span class="badge ${badgeClass(u.category)}">${u.category}</span></td>
    `;
    tbody.appendChild(tr);
  });
  const totalUtile = S.units.surfaceUtile;
  const tr = document.createElement("tr");
  tr.className = "total-row";
  tr.innerHTML = `
    <td colspan="2"><strong>Total</strong></td>
    <td class="num"><strong>${fmtM2(S.units.surfaceLocative + S.units.surfaceCommerciale)}</strong></td>
    <td class="num"><strong>${fmtM2(S.units.surfaceTerrasseTotale)}</strong></td>
    <td class="num" style="color:var(--green)"><strong>${fmtM2(totalUtile)}</strong></td>
    <td colspan="3"><strong>${S.units.nbUnites} unités + 1 commercial</strong></td>
  `;
  tbody.appendChild(tr);
}

// --- Surface Utile & Coût/m² ---
function renderSurfaceUtile(S) {
  const u = S.units;
  const totalNet = S.budget.investissementNet; // après MDM
  const ameublement = S.budget.ameublement;
  const subMDM = S.financement.subventionMDM;
  const prixNu = totalNet - ameublement; // terrain + construction - MDM (sans ameublement)

  // Coûts par m² (basés sur investissement net après MDM)
  const nuInt = u.surfaceInterieureTotale > 0 ? prixNu / u.surfaceInterieureTotale : 0;
  const nuUtile = u.surfaceUtile > 0 ? prixNu / u.surfaceUtile : 0;
  const meubleInt = u.surfaceInterieureTotale > 0 ? totalNet / u.surfaceInterieureTotale : 0;
  const meubleUtile = u.surfaceUtile > 0 ? totalNet / u.surfaceUtile : 0;

  // Surfaces
  setText("su-interieure", fmtM2(u.surfaceInterieureTotale));
  setText("su-terrasse", "+" + fmtM2(u.surfaceTerrasseTotale * 0.5));
  setText("su-terrasse-detail", fmtM2(u.surfaceTerrasseTotale) + " brut × 50%");
  setText("su-totale", fmtM2(u.surfaceUtile));

  // Prix nu (terrain + construction - MDM)
  setText("su-prix-nu", fmtNum(Math.round(nuUtile)) + " MAD/m²");
  setText("su-prix-nu-sub", fmtNum(Math.round(prixNu)) + " MAD — après MDM*");
  // Prix meublé (tout compris - MDM)
  setText("su-prix-meuble", fmtNum(Math.round(meubleUtile)) + " MAD/m²");
  setText("su-prix-meuble-sub", fmtNum(Math.round(totalNet)) + " MAD — après MDM*");
  // Par m² intérieur (sans terrasses)
  setText("su-cout-int", fmtNum(Math.round(nuInt)) + " MAD/m²");
  setText("su-cout-meuble-int", fmtNum(Math.round(meubleInt)) + " MAD/m²");

  // ── Benchmarks réels mars 2026 ──
  // Apparts neufs : Agenz (15 969), Yakeey (13 951), Nuroa studios neufs (21 000-23 000)
  // Terrains R+5 Maarif : Marocgest 174m² (20 115), 460m² (21 739), Nuroa 220m² (22 727),
  //   395m² (18 000), Abdelmoumen 447m² (16 900) → moyenne ~19 900 MAD/m²
  const benchAppart = { ancienMoy: 14000, neufStandard: 17000, studioNeuf: 21000 };
  const benchTerrain = 19900; // moyenne terrains R+5 Maarif (5 annonces actives)
  const terrainM2 = TERRAIN.prix / TERRAIN.surface; // prix terrain du projet / m² terrain

  // Comparaison nu à nu : prix nu projet vs prix vente neuf nu (hors ameublement)
  const diffNu = ((nuUtile / benchAppart.studioNeuf) - 1) * 100;
  // Comparaison terrain
  const diffTerrain = ((terrainM2 / benchTerrain) - 1) * 100;

  const el = document.getElementById("su-analyse");
  if (el) {
    const fmtDiff = (d) => d < 0
      ? `<strong style="color:var(--green)">${Math.abs(d).toFixed(0)}% en dessous</strong>`
      : `<strong style="color:var(--red)">${d.toFixed(0)}% au-dessus</strong>`;
    el.innerHTML =
      `<strong>① Terrain — comparaison marché Maarif R+5 :</strong><br>` +
      `<span style="color:var(--text-sec)">Votre terrain :</span> <strong>${fmtNum(Math.round(terrainM2))} MAD/m²</strong> (${fmtNum(TERRAIN.prix)} MAD ÷ ${TERRAIN.surface} m²)<br>` +
      `<span style="color:var(--text-sec)">Moyenne marché R+5 :</span> <strong>~${fmtNum(benchTerrain)} MAD/m²</strong> ` +
      `<span style="font-size:.78rem;color:var(--text-sec)">(174m²→20K, 220m²→23K, 395m²→18K, 460m²→22K, 447m²→17K)</span><br>` +
      `→ Votre terrain est ${fmtDiff(diffTerrain)} du marché` +
      `<br><br>` +
      `<strong>② Prix de revient nu à nu — vs vente neuf Maarif :</strong><br>` +
      `<span style="color:var(--text-sec)">Votre prix nu :</span> <strong>${fmtNum(Math.round(nuUtile))} MAD/m²</strong> utile (terrain + construction, sans ameublement)<br>` +
      `<span style="color:var(--text-sec)">Vente studio neuf standing :</span> <strong>~${fmtNum(benchAppart.studioNeuf)} MAD/m²</strong> <span style="font-size:.78rem;color:var(--text-sec)">(Nuroa.ma, prix vente nu)</span><br>` +
      `→ Prix nu ${fmtDiff(diffNu)} du marché neuf standing — et votre projet inclut en plus l'ameublement hôtelier complet (+${fmtNum(ameublement)} MAD)` +
      `<br><span style="font-size:.78rem;color:var(--text-sec);margin-top:6px;display:inline-block">Sources : Marocgest, Nuroa.ma, Agenz.ma, Yakeey.com, Mubawab (annonces actives mars 2026)</span>`;
  }

  // Update benchmark KPI card
  setText("su-benchmark", "~" + fmtNum(benchAppart.studioNeuf));
  const benchSub = document.getElementById("su-benchmark")?.closest(".kpi-card")?.querySelector(".kpi-sub");
  if (benchSub) benchSub.textContent = "MAD/m² studio neuf Maarif";
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

  // Progress bar — MDM n'est PAS dans le montage bancaire (remboursée à l'investisseur)
  const bar = document.getElementById("fin-progress");
  if (bar) {
    bar.innerHTML = `
      <div class="progress-seg" style="width:${F.pctApport * 100}%;background:var(--primary)" title="Apport terrain">Terrain ${fmtPct(F.pctApport, 0)}</div>
      <div class="progress-seg" style="width:${F.pctTamwilkom * 100}%;background:var(--gold)" title="Tamwilkom">TK ${fmtPct(F.pctTamwilkom, 0)}</div>
      <div class="progress-seg" style="width:${F.pctBanque * 100}%;background:var(--primary-light)" title="Banque classique">Banque ${fmtPct(F.pctBanque, 0)}</div>
    `;
  }

  // MDM note séparée
  const mdmNote = document.getElementById("fin-mdm-note");
  if (mdmNote) {
    mdmNote.innerHTML = '<span style="color:#2563eb;font-size:.82rem">ℹ️ MDM Invest : <strong>' + fmtMAD(F.subventionMDM) + '</strong> remboursée à l\'investisseur MRE* → Apport net réel : <strong>' + fmtMAD(F.apportNet) + '</strong> (terrain ' + fmtMAD(F.apportTerrain) + ' − MDM)</span>';
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
  const K = S.kpi;

  // Row 1: CF Net, TRI, VAN, Payback
  setText("cf-net-an1",     fmtMAD(y1.cashFlowNet));
  setText("cf-net-mensuel", fmtMAD(K.cfMensuelAn1) + " / mois");
  setText("cf-tri",         isFinite(K.tri) ? fmtPct(K.tri, 1) : "N/A");
  setText("cf-van",         fmtMAD(K.van));
  setText("cf-van-taux",    "Taux d'actualisation : " + fmtPct(K.tauxActualisation, 0));
  setText("cf-payback",     K.paybackYear ? K.paybackYear + " ans" : "> " + PROJECTION_YEARS + " ans");

  // Row 2: Rendements
  setText("cf-rdt-projet",  fmtPct(K.rendementNet));
  setText("cf-rdt-apport",  fmtPct(K.rendementNetApport));
  setText("cf-coc",         fmtPct(K.cashOnCash));
  setText("cf-marge",       fmtPct(K.margeCF));

  // Trajectoire long-terme
  setText("cf-wealth",        fmtMAD(K.wealthTotal));
  setText("cf-multiple",      "×" + K.multipleApport.toFixed(1) + " l'apport récupéré");
  setText("cf-debt-free",     K.debtFreedomYear ? "An " + K.debtFreedomYear : "> " + PROJECTION_YEARS + " ans");
  setText("cf-post-debt",     K.cfPostDebtAvg ? fmtMAD(K.cfPostDebtAvg) + " / an" : "–");
  setText("cf-post-debt-mensuel", K.cfPostDebtAvg ? fmtMAD(K.cfPostDebtAvg / 12) + " / mois" : "");
  setText("cf-rdt-stab",     K.rendementStabilise ? fmtPct(K.rendementStabilise) : "–");

  // Croissance & fiscalité
  setText("cf-growth-10",   K.cfGrowthY10 != null ? (K.cfGrowthY10 >= 0 ? "+" : "") + fmtPct(K.cfGrowthY10, 0) : "–");
  setText("cf-growth-20",   (K.cfGrowthY20 >= 0 ? "+" : "") + fmtPct(K.cfGrowthY20, 0));
  setText("cf-is-cumule",   fmtMAD(K.isCumule));
  setText("cf-ratio-is",    fmtPct(K.ratioIS, 1) + " du cash-flow brut");
  setText("cf-dscr",        K.dscr === Infinity ? "∞" : K.dscr.toFixed(2) + "x");
  const dscrEl = document.getElementById("cf-dscr");
  if (dscrEl) dscrEl.style.color = K.dscr >= 1.5 ? "var(--green)" : K.dscr >= 1.2 ? "var(--amber)" : "var(--red)";
  setText("cf-dscr-sub",    K.dscr >= 1.5 ? "Confortable (> 1,5x)" : K.dscr >= 1.2 ? "Acceptable (> 1,2x)" : "Risqué (< 1,2x)");

  // Color VAN
  const vanEl = document.getElementById("cf-van");
  if (vanEl) vanEl.closest(".kpi-card").querySelector(".kpi-value").style.color = K.van >= 0 ? "var(--green)" : "var(--red)";

  // Color TRI
  const triEl = document.getElementById("cf-tri");
  if (triEl) triEl.style.color = K.tri >= 0.08 ? "var(--green)" : K.tri >= 0.05 ? "var(--amber)" : "var(--red)";

  // Enriched table with marge and monthly CF, with color coding
  const tbody = document.getElementById("cf-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  S.projections.forEach(p => {
    const marge = p.revTotal > 0 ? p.cashFlowNet / p.revTotal : 0;
    const isPayback = S.kpi.paybackYear && p.year === S.kpi.paybackYear;
    const isDebtFree = S.kpi.debtFreedomYear && p.year === S.kpi.debtFreedomYear;

    // Color coding for rows
    let rowClass = '';
    let rowStyle = '';
    if (isPayback) {
      rowClass = 'highlight-row';
      rowStyle = 'background:#d1fae5!important;font-weight:700';
    } else if (isDebtFree) {
      rowStyle = 'background:#fef3c7!important;font-weight:700';
    } else if (p.cumulCashFlow < 0) {
      rowStyle = 'background:#fee2e2';
    } else if (p.cumulCashFlow >= 0) {
      rowStyle = 'background:#f0fdf4';
    }

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.style.cssText = rowStyle;
    tr.innerHTML = `
      <td><strong>An ${p.year}</strong>${isPayback ? ' 🎯' : ''}${isDebtFree ? ' 🔓' : ''}</td>
      <td class="num bold">${fmtMAD(p.revTotal)}</td>
      <td class="num neg">(${fmtMAD(p.chargesTotal)})</td>
      <td class="num"><strong>${fmtMAD(p.ebitda)}</strong></td>
      <td class="num">${fmtPct(p.margeExploitation, 0)}</td>
      <td class="num neg">${p.debtServiceTotal > 0 ? '(' + fmtMAD(p.debtServiceTotal) + ')' : '–'}</td>
      <td class="num neg">${p.is > 0 ? '(' + fmtMAD(p.is) + ')' : '–'}</td>
      <td class="num bold" style="color:${clrSign(p.cashFlowNet)}">${fmtMAD(p.cashFlowNet)}</td>
      <td class="num" style="color:${clrSign(p.cashFlowNet)}">${fmtMAD(p.cashFlowNet / 12)}</td>
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
  // Dynamic info text
  const baseBudget = SCENARIOS[S.scenario].budgetTotal || BUDGET.totalTTC;
  setText("sub-info-text", `Ce tableau recense toutes les subventions nationales, sectorielles et fiscales auxquelles le projet est potentiellement éligible. Les montants sont des estimations basées sur un investissement de ${fmtMAD(S.budget.totalProjet)}.`);

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

// --- Go Siyaha section ---
function renderGoSiyaha(S) {
  if (typeof GO_SIYAHA_PROGRAMME === "undefined") return;
  const P = GO_SIYAHA_PROGRAMME;

  // KPIs
  setText("gs-budget", fmtMAD(P.budgetGlobal));
  setText("gs-taux", "40%");
  setText("gs-entreprises", `${fmt(P.projetsAccompagnes)} / ${fmt(P.objectifEntreprises)}`);
  setText("gs-entreprises-sub", `${Math.round(P.projetsAccompagnes / P.objectifEntreprises * 100)}% accompagnés (juil. 2025) — ${P.projetsFinances} financés`);
  setText("gs-restant", P.restantEstime);

  // Taux de subvention table
  const tauxTbody = document.getElementById("gs-taux-tbody");
  if (tauxTbody) {
    tauxTbody.innerHTML = "";
    P.subventions.forEach(s => {
      const tr = document.createElement("tr");
      const isOurs = s.taux === 0.40;
      if (isOurs) tr.style.background = "#f0fdf4";
      tr.innerHTML = `
        <td>${isOurs ? "🌿 " : ""}${s.type}</td>
        <td><strong>${Math.round(s.taux * 100)}%</strong></td>
        <td>${s.plafondInvest ? fmtMAD(s.plafondInvest) : "Variable"}</td>
        <td>${s.detail}</td>
      `;
      tauxTbody.appendChild(tr);
    });
  }

  // Timeline
  const timelineEl = document.getElementById("gs-timeline");
  if (timelineEl) {
    timelineEl.innerHTML = "";
    P.timeline.forEach((t, i) => {
      const step = document.createElement("div");
      step.className = "sub-step";
      const isLatest = i >= P.timeline.length - 3;
      step.innerHTML = `
        <div class="sub-step-dot" style="${isLatest ? 'background:var(--green)' : ''}"></div>
        <div class="sub-step-content">
          <div class="sub-step-title">${t.date} — ${t.event}</div>
          <div class="sub-step-detail">${t.detail}</div>
        </div>
      `;
      timelineEl.appendChild(step);
    });
  }

  // Process
  const processEl = document.getElementById("gs-process");
  if (processEl) {
    processEl.innerHTML = "";
    P.process.forEach(p => {
      const step = document.createElement("div");
      step.className = "sub-step";
      step.innerHTML = `
        <div class="sub-step-dot"></div>
        <div class="sub-step-content">
          <div class="sub-step-title">Étape ${p.etape} — ${p.titre}</div>
          <div class="sub-step-detail">${p.detail}</div>
        </div>
      `;
      processEl.appendChild(step);
    });
  }

  // Documents
  const docsEl = document.getElementById("gs-docs");
  if (docsEl) {
    docsEl.innerHTML = "";
    P.documentsRequis.forEach(d => {
      const li = document.createElement("li");
      li.textContent = d;
      docsEl.appendChild(li);
    });
  }

  // Points forts
  const fortsEl = document.getElementById("gs-points-forts");
  if (fortsEl) {
    fortsEl.innerHTML = "";
    P.notreProjet.points_forts.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      fortsEl.appendChild(li);
    });
  }

  // Points vigilance
  const vigEl = document.getElementById("gs-points-vigilance");
  if (vigEl) {
    vigEl.innerHTML = "";
    P.notreProjet.points_vigilance.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p;
      vigEl.appendChild(li);
    });
  }

  // Risques table
  const risquesTbody = document.getElementById("gs-risques-tbody");
  if (risquesTbody) {
    risquesTbody.innerHTML = "";
    P.risques.forEach(r => {
      const tr = document.createElement("tr");
      const sevColor = r.severite === "élevé" ? "var(--red)" : r.severite === "moyen" ? "var(--amber-dark)" : "var(--green)";
      tr.innerHTML = `
        <td>${r.risque}</td>
        <td><span class="badge" style="background:${sevColor}20;color:${sevColor};font-weight:600">${r.severite}</span></td>
        <td>${r.detail}</td>
      `;
      risquesTbody.appendChild(tr);
    });
  }

  // Projets approuvés
  const projetsTbody = document.getElementById("gs-projets-tbody");
  if (projetsTbody) {
    projetsTbody.innerHTML = "";
    (P.projetsFinancesDetail || []).forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.date}</td>
        <td><strong>${p.nb}</strong></td>
        <td>${p.types}</td>
        <td>${p.investissement ? fmtMAD(p.investissement) : "–"}</td>
        <td>${p.subvention ? fmtMAD(p.subvention) : "–"}</td>
      `;
      if (p.villes) {
        const tr2 = document.createElement("tr");
        tr2.innerHTML = `<td colspan="5" style="font-size:.78rem;color:#666;padding-top:0">📍 ${p.villes}${p.fourchette ? " — Fourchette : " + p.fourchette : ""}</td>`;
        projetsTbody.appendChild(tr);
        projetsTbody.appendChild(tr2);
      } else {
        projetsTbody.appendChild(tr);
      }
    });
  }

  // Sources
  const sourcesEl = document.getElementById("gs-sources");
  if (sourcesEl) {
    sourcesEl.innerHTML = "";
    P.sources.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${s.url}" target="_blank" style="color:var(--primary)">${s.label}</a>`;
      sourcesEl.appendChild(li);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MONTAGES D'EXPLOITATION
// ═══════════════════════════════════════════════════════════════════════
function renderMontages(S) {
  if (typeof MONTAGES_EXPLOITATION === "undefined") return;
  const M = MONTAGES_EXPLOITATION;

  // Contexte fiscal IS 2026
  const isBody = document.getElementById("mt-is-tbody");
  if (isBody) {
    isBody.innerHTML = "";
    M.contexteFiscal.IS_2026.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${t.tranche}</td><td><strong>${Math.round(t.taux * 100)}%</strong></td><td>${t.note}</td>`;
      isBody.appendChild(tr);
    });
  }

  // Render each montage card
  M.montages.forEach(m => {
    // Score bars
    const scoreEl = document.getElementById(`mt-score-${m.id}`);
    if (scoreEl) {
      const dims = [
        { label: "Simplicité", val: m.scoreSimplicite },
        { label: "Protection", val: m.scoreProtection },
        { label: "Fiscal", val: m.scoreFiscal },
        { label: "Flexibilité", val: m.scoreFlexibilite },
      ];
      scoreEl.innerHTML = dims.map(d => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="width:80px;font-size:.78rem;color:#666">${d.label}</span>
          <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
            <div style="width:${d.val * 20}%;height:100%;background:${d.val >= 4 ? 'var(--green)' : d.val >= 3 ? 'var(--amber-dark)' : 'var(--red)'};border-radius:4px"></div>
          </div>
          <span style="font-size:.75rem;font-weight:600;width:20px;text-align:right">${d.val}/5</span>
        </div>
      `).join("");
    }

    // Avantages
    const avEl = document.getElementById(`mt-av-${m.id}`);
    if (avEl) {
      avEl.innerHTML = "";
      m.avantages.forEach(a => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${a.point}</strong> — ${a.detail}`;
        li.style.marginBottom = "6px";
        avEl.appendChild(li);
      });
    }

    // Inconvénients
    const incEl = document.getElementById(`mt-inc-${m.id}`);
    if (incEl) {
      incEl.innerHTML = "";
      m.inconvenients.forEach(i => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${i.point}</strong> — ${i.detail}`;
        li.style.marginBottom = "6px";
        incEl.appendChild(li);
      });
    }

    // Fiscalité detail
    const fiscEl = document.getElementById(`mt-fisc-${m.id}`);
    if (fiscEl) {
      fiscEl.innerHTML = Object.entries(m.fiscalite).map(([k, v]) =>
        `<div style="margin-bottom:4px"><strong>${k} :</strong> ${v}</div>`
      ).join("");
    }
  });

  // Classement table
  const classBody = document.getElementById("mt-classement-tbody");
  if (classBody) {
    classBody.innerHTML = "";
    M.classement.forEach(c => {
      const m = M.montages.find(x => x.id === c.id);
      const tr = document.createElement("tr");
      const badgeColor = c.rang === 1 ? "var(--green)" : c.rang === 2 ? "var(--amber-dark)" : "var(--red)";
      tr.innerHTML = `
        <td><span class="badge" style="background:${badgeColor}20;color:${badgeColor};font-weight:700;font-size:1rem">#${c.rang}</span></td>
        <td><strong>${m ? m.nom : c.id}</strong></td>
        <td><span class="badge" style="background:var(--primary)20;color:var(--primary);font-weight:600">${m ? m.scoreGlobal : "–"}/5</span></td>
        <td style="font-size:.85rem">${c.raison}</td>
      `;
      if (c.rang === 1) tr.style.background = "#f0fdf4";
      classBody.appendChild(tr);
    });
  }

  // Recommandation
  const recoEl = document.getElementById("mt-recommandation");
  if (recoEl) {
    recoEl.innerHTML = `
      <p><strong>${M.recommandation.justification}</strong></p>
      <p style="margin-top:8px">${M.recommandation.evolutionPossible}</p>
      <p style="margin-top:8px;color:var(--amber-dark)">${M.recommandation.attention}</p>
    `;
  }

  // Sources
  const srcEl = document.getElementById("mt-sources");
  if (srcEl) {
    srcEl.innerHTML = "";
    M.sources.forEach(s => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${s.url}" target="_blank" style="color:var(--primary)">${s.label}</a>`;
      srcEl.appendChild(li);
    });
  }
}

// --- CAPEX / OPEX ---
function renderCapexOpex(S) {
  const total = S.budget.totalProjet;
  const ameub = S.budget.ameublement;
  const terrainPrix = TERRAIN.prix;
  const fraisTerrain = terrainPrix * TERRAIN.fraisAcquisition;
  const terrainTTC = terrainPrix + fraisTerrain;
  const construction = total - terrainTTC - ameub;
  const ecoNet = S.budget.ecoEnabled ? S.budget.coutNetEco : 0;
  const constructionPure = construction - ecoNet;

  // ── CAPEX KPIs (brut — investissement total) ──
  setText("capex-total", fmtMAD(total));
  setText("capex-par-unite", fmtMAD(Math.round(total / S.units.nbUnites)));
  setText("capex-par-m2", fmtNum(Math.round(total / S.units.surfaceUtile)) + " MAD/m²");
  setText("capex-m2-sub", fmtM2(S.units.surfaceUtile) + " utile");

  // ── CAPEX table ──
  const capexRows = [
    { poste: "Terrain", montant: terrainPrix, detail: TERRAIN.surface + " m² × " + fmtNum(Math.round(terrainPrix / TERRAIN.surface)) + " MAD/m²" },
    { poste: "Frais acquisition (~6,5%)", montant: fraisTerrain, detail: "Notaire, conservation, enregistrement" },
    { poste: "Terrain tout compris", montant: terrainTTC, detail: "", total: true },
    { poste: "Construction & aménagement", montant: constructionPure, detail: fmtNum(Math.round(constructionPure / S.units.surfaceInterieureTotale)) + " MAD/m² construit" },
  ];
  if (ecoNet > 0) {
    capexRows.push({ poste: "Éco-investissement Go Siyaha (net)", montant: ecoNet, detail: "Après subvention 40%" });
  }
  capexRows.push(
    { poste: "Ameublement hôtelier", montant: ameub, detail: S.units.nbUnites + " unités × " + fmtNum(Math.round(ameub / S.units.nbUnites)) + " MAD" },
    { poste: "TOTAL CAPEX BRUT", montant: total, detail: "", total: true, grand: true }
  );

  // Financement : apport terrain puis dette bancaire
  const subMDM = S.financement.subventionMDM;
  const apportTerrain = S.financement.apportTerrain;
  const aFinancer = S.financement.montantAFinancer;
  capexRows.push(
    { poste: "", montant: null, detail: "", separator: true },
    { poste: "Apport en nature (terrain)", montant: -apportTerrain, detail: "Terrain + frais comme apport", green: true },
    { poste: "RESTE À FINANCER", montant: aFinancer, detail: "Tamwilkom + Banque classique", total: true, grand: true },
    { poste: "", montant: null, detail: "", separator: true },
    { poste: "Remboursement MDM Invest (10%)*", montant: subMDM, detail: "Versée à l'investisseur MRE — réduit le coût net", blue: true }
  );

  const capexTbody = document.getElementById("capex-tbody");
  if (capexTbody) {
    capexTbody.innerHTML = "";
    capexRows.forEach(r => {
      if (r.separator) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td colspan="4" style="padding:4px;border:none"></td>';
        capexTbody.appendChild(tr);
        return;
      }
      const tr = document.createElement("tr");
      if (r.grand) tr.style.cssText = "background:#fef3c7;font-weight:700";
      else if (r.total) tr.style.fontWeight = "600";
      if (r.green) tr.style.color = "var(--green)";
      if (r.blue) tr.style.cssText = "color:#2563eb;background:#eff6ff;font-style:italic";
      const montantStr = r.montant < 0
        ? "(" + fmtMAD(Math.abs(r.montant)) + ")"
        : fmtMAD(r.montant);
      const pctStr = r.grand ? "" : r.montant < 0 ? "" : (r.montant / total * 100).toFixed(1) + "%";
      tr.innerHTML = `
        <td>${r.poste}</td>
        <td class="num">${montantStr}</td>
        <td class="num">${pctStr}</td>
        <td style="font-size:.82rem;color:var(--text-sec)">${r.detail}</td>
      `;
      capexTbody.appendChild(tr);
    });
  }

  // ── OPEX table (An 1, 2, 3) ──
  const p = S.projections;
  if (p.length < 3) return;

  const opexItems = [
    { poste: "Société de gestion (20% CA héberg.)", key: "gestion", nature: "Variable" },
    { poste: "Salaires (concierge + ménage)", key: "salaires", nature: "Fixe" },
    { poste: "Eau + Électricité + Internet", key: "utilities", nature: "Semi-variable" },
    { poste: "Consommables (linge, amenities)", key: "consommables", nature: "Variable" },
    { poste: "Comptable externe", key: "comptable", nature: "Fixe" },
    { poste: "Assurance", key: "assurance", nature: "Fixe" },
    { poste: "Entretien & maintenance", key: "entretien", nature: "Fixe (↑ après 5 ans)" },
    { poste: "Taxes professionnelles", key: "taxesPro", nature: "Fixe (exo. 5 ans)" },
    { poste: "Divers & imprévus", key: "divers", nature: "Fixe" },
  ];

  const opexTbody = document.getElementById("opex-tbody");
  if (opexTbody) {
    opexTbody.innerHTML = "";
    opexItems.forEach(item => {
      const v1 = p[0].chargesDetail[item.key];
      const v2 = p[1].chargesDetail[item.key];
      const v3 = p[2].chargesDetail[item.key];
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.poste}</td>
        <td class="num">${fmtMAD(v1)}</td>
        <td class="num">${fmtMAD(v2)}</td>
        <td class="num">${fmtMAD(v3)}</td>
        <td style="font-size:.78rem;color:var(--text-sec)">${item.nature}</td>
      `;
      opexTbody.appendChild(tr);
    });
    // Service dette rows
    for (let yi = 0; yi < 3; yi++) {
      const yr = p[yi];
      if (yi === 0) {
        const trDebt = document.createElement("tr");
        trDebt.style.cssText = "border-top:2px solid var(--border)";
        trDebt.innerHTML = `
          <td><strong>Service dette</strong></td>
          <td class="num"><strong>${fmtMAD(p[0].debtServiceTotal)}</strong></td>
          <td class="num"><strong>${fmtMAD(p[1].debtServiceTotal)}</strong></td>
          <td class="num"><strong>${fmtMAD(p[2].debtServiceTotal)}</strong></td>
          <td style="font-size:.78rem;color:var(--text-sec)">Tamwilkom + Banque</td>
        `;
        opexTbody.appendChild(trDebt);
        // IS row
        const trIS = document.createElement("tr");
        trIS.innerHTML = `
          <td>Impôt sur les sociétés (IS)</td>
          <td class="num">${fmtMAD(p[0].is)}</td>
          <td class="num">${fmtMAD(p[1].is)}</td>
          <td class="num">${fmtMAD(p[2].is)}</td>
          <td style="font-size:.78rem;color:var(--text-sec)">Exo. CA devises</td>
        `;
        opexTbody.appendChild(trIS);
      }
    }
    // Total OPEX row
    const totalOpex = (yi) => p[yi].chargesTotal + p[yi].debtServiceTotal + p[yi].is;
    const trTotal = document.createElement("tr");
    trTotal.style.cssText = "background:#fef3c7;font-weight:700";
    trTotal.innerHTML = `
      <td>TOTAL DÉCAISSEMENTS</td>
      <td class="num">${fmtMAD(totalOpex(0))}</td>
      <td class="num">${fmtMAD(totalOpex(1))}</td>
      <td class="num">${fmtMAD(totalOpex(2))}</td>
      <td></td>
    `;
    opexTbody.appendChild(trTotal);
  }

  // ── OPEX KPIs ──
  for (let i = 0; i < 3; i++) {
    const totalOpexAn = p[i].chargesTotal + p[i].debtServiceTotal + p[i].is;
    setText("opex-an" + (i + 1), fmtMAD(totalOpexAn));
    setText("opex-an" + (i + 1) + "-sub", "dont dette " + fmtK(p[i].debtServiceTotal));
  }

  // ── Synthèse 3 ans ──
  let opex3a = 0, rev3a = 0;
  for (let i = 0; i < 3; i++) {
    opex3a += p[i].chargesTotal + p[i].debtServiceTotal + p[i].is;
    rev3a += p[i].revTotal;
  }
  const total3a = total + opex3a;
  const cf3a = p[2].cumulCashFlow;
  setText("synthese-total-3a", fmtMAD(total3a));
  setText("synthese-rev-3a", fmtMAD(rev3a));
  const cfEl = document.getElementById("synthese-cf-3a");
  if (cfEl) {
    cfEl.textContent = fmtMAD(cf3a);
    cfEl.style.color = cf3a >= 0 ? "var(--green)" : "var(--red)";
  }
  const ratio = rev3a > 0 ? (opex3a / rev3a * 100) : 0;
  setText("synthese-ratio", ratio.toFixed(0) + "%");

  // Analyse
  const analyseEl = document.getElementById("capex-opex-analyse");
  if (analyseEl) {
    const opexAn1 = p[0].chargesTotal + p[0].debtServiceTotal + p[0].is;
    const chargeFixe = p[0].chargesDetail.salaires + p[0].chargesDetail.comptable +
      p[0].chargesDetail.assurance + p[0].chargesDetail.entretien + p[0].chargesDetail.divers;
    const chargeVar = p[0].chargesDetail.gestion + p[0].chargesDetail.consommables;
    analyseEl.innerHTML =
      `<strong>Structure des coûts An 1 :</strong> ` +
      `Charges fixes : <strong>${fmtMAD(chargeFixe)}</strong> (${(chargeFixe / p[0].chargesTotal * 100).toFixed(0)}%) — ` +
      `Charges variables : <strong>${fmtMAD(chargeVar)}</strong> (${(chargeVar / p[0].chargesTotal * 100).toFixed(0)}%)<br>` +
      `Le service de la dette représente <strong>${(p[0].debtServiceTotal / opexAn1 * 100).toFixed(0)}%</strong> des décaissements annuels. ` +
      `Le point mort se situe à un taux d'occupation d'environ <strong>${Math.ceil((p[0].chargesTotal + p[0].debtServiceTotal) / (p[0].revTotal / SCENARIOS[S.scenario].tauxOccupation) * 100)}%</strong>.`;
  }
}

// --- Utility ---
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
