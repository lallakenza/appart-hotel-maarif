// ============================================================
// RENDER LAYER — DOM updates only, reads computed STATE
// Zero computation here, only formatting + DOM manipulation
// ============================================================
//
// CHANGELOG:
// 29/03/2026 — Insights dynamiques sur les 8 KPI cards Cash-Flow :
//   - CF Net An 1 : mensuel + multiplicateur Y1→Y10
//   - TRI : comparaison vs S&P 500, MASI, épargne UAE
//   - VAN : multiple de l'apport au taux d'actualisation
//   - Payback : break-even occupancy
//   - Rdt Net/Projet : trajectoire vers rendement stabilisé Y15-20
//   - Rdt Net/Apport : multiplicateur levier vs rendement projet
//   - Cash-on-Cash : comparaison vs livret UAE et immo Casa
//   - Marge CF : montant net gardé par mois
// 28/03/2026 — Affichage des nouvelles données :
//   - renderRevenus : colonne "Occ. eff." + badge ramp-up par année
//   - renderCharges : lignes syndic, taxeHabitation, provisionRenouv, marketing, fraisCréation
// 27/03/2026 — Création initiale
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
  renderHypotheses();
  renderKPIInsights(state);
  renderBudget(state);
  renderProgramme(state);
  renderSurfaceUtile(state);
  renderScenarioComparison(state);
  renderRevenus(state);
  renderCharges(state);
  renderFinancement(state);
  renderCashFlow(state);
  renderWealth(state);
  renderGestion(state);
  renderGestionDuel(state);
  renderMarche(state);
  renderFiscalite(state);
  renderRisques(state);
  renderStressTests(state);
  renderSensibilite(state);
  renderSubventions(state);
  renderGoSiyaha(state);
  renderMontages(state);
  renderCapexOpex(state);
  renderDossierBanque(state);
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
// WEALTH-ORIENTED scoring: long-term value creation is the primary driver
function renderVerdict(S) {
  const y1 = S.projections[0];
  const K = S.kpi;
  const dscr = K.dscr;
  const breakEven = K.breakEvenOcc;
  const currentOcc = SCENARIOS[S.scenario].tauxOccupation;
  const margeSecurite = breakEven ? currentOcc - breakEven : 0;

  // ═══ WEALTH-BASED SCORING (7 points) ═══
  // Primary criteria (wealth creation — 5 pts max)
  let score = 0;
  const mult20 = K.wealthMilestones ? K.wealthMilestones[3].multiple : 0;
  const beatsEpargne = K.wealthTrajectory ? K.wealthTrajectory[19].projectWealth > K.wealthTrajectory[19].epargne : false;
  const beatsBourse = K.wealthTrajectory ? K.wealthTrajectory[19].projectWealth > K.wealthTrajectory[19].bourse : false;
  const triOk = K.tri != null && K.tri > 0.12; // TRI > 12%
  const wbOk = K.wbAvg20 != null && K.wbAvg20 >= 20_000; // Wealth building > 20K/mois

  if (mult20 >= 5) score += 2;        // Capital ×5+ en 20 ans → 2 pts
  else if (mult20 >= 3) score += 1;   // Capital ×3+ → 1 pt
  if (beatsEpargne) score++;           // Bat le livret épargne UAE 6.25%
  if (beatsBourse) score++;            // Bat la bourse MASI 8%
  if (triOk) score++;                  // TRI > 12%

  // Secondary criteria (risque court terme — 2 pts max, ne plombe pas le score)
  if (breakEven && margeSecurite > 0.05) score++; // Marge sécurité occupation
  if (wbOk) score++;                               // Wealth building > 20K/mois

  const maxScore = 7;

  const banner = document.getElementById("verdict-banner");
  const svg = document.getElementById("verdict-svg");
  const title = document.getElementById("verdict-title");
  const subtitle = document.getElementById("verdict-subtitle");
  const metrics = document.getElementById("verdict-metrics");
  const scoreBadge = document.getElementById("verdict-score-badge");

  if (!banner) return;

  const svgCheck = '<path d="M20 6L9 17l-5-5"/>';
  const svgAlert = '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>';
  const svgX = '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>';

  banner.className = "verdict-banner";
  if (score >= 5) {
    banner.classList.add("verdict-go");
    svg.innerHTML = svgCheck;
    title.textContent = "Machine à Richesse — Go";
    subtitle.textContent = `Ce projet multiplie votre capital par ×${mult20.toFixed(1)} en 20 ans et bat toutes les alternatives passives. ` +
      `Les premières années de cash-flow tendu sont le prix d'entrée pour construire un actif générateur de revenus croissants. ` +
      `Le fonds de roulement MDM (764K) couvre les années DSCR < 1.`;
  } else if (score >= 3) {
    banner.classList.add("verdict-caution");
    svg.innerHTML = svgAlert;
    title.textContent = "Création de richesse modérée — Go avec réserves";
    subtitle.textContent = `Le projet crée de la richesse (×${mult20.toFixed(1)} en 20 ans) mais ne domine pas clairement toutes les alternatives. ` +
      `Le risque opérationnel (gestion à distance, saisonnalité) doit être pesé contre le potentiel de création de valeur.`;
  } else {
    banner.classList.add("verdict-nogo");
    svg.innerHTML = svgX;
    title.textContent = "Création de richesse insuffisante — No-Go";
    subtitle.textContent = `Dans ce scénario, le projet ne crée pas assez de richesse pour justifier les risques opérationnels. ` +
      `Un placement passif offrirait un meilleur rapport rendement/risque. Revoir les hypothèses tarifaires ou le financement.`;
  }

  // Score badge
  const scoreBar = Array.from({length: maxScore}, (_, i) =>
    `<span${i < score ? ' class="filled"' : ''}></span>`
  ).join('');
  scoreBadge.innerHTML = `<span class="verdict-score-bar">${scoreBar}</span> ${score}/${maxScore}`;

  // Metric helper
  function dot(ok) { return `<span class="verdict-dot ${ok ? 'dot-ok' : 'dot-warn'}"></span>`; }
  function dotBad(ok) { return `<span class="verdict-dot ${ok ? 'dot-ok' : 'dot-bad'}"></span>`; }

  metrics.innerHTML = `
    <div class="verdict-metric">${dotBad(mult20 >= 5)} Multiple ×${mult20.toFixed(1)} en 20 ans</div>
    <div class="verdict-metric">${dot(beatsEpargne)} ${beatsEpargne ? 'Bat' : 'Sous'} épargne UAE 6.25%</div>
    <div class="verdict-metric">${dot(beatsBourse)} ${beatsBourse ? 'Bat' : 'Sous'} bourse MASI 8%</div>
    <div class="verdict-metric">${dot(triOk)} TRI: ${K.tri != null ? fmtPct(K.tri) : '–'}</div>
    <div class="verdict-metric">${dot(wbOk)} Wealth building: ${K.wbAvg20 ? fmtMAD(K.wbAvg20) + '/mois' : '–'}</div>
    <div class="verdict-metric" style="opacity:.7">${dot(margeSecurite > 0.05)} Break-even: ${breakEven ? fmtPct(breakEven, 0) : '?'} (marge ${fmtPct(margeSecurite, 0)})</div>
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
  const occLabel = y1.occMoyEffective != null
    ? fmtPct(y1.occMoyEffective, 1) + " eff."
    : fmtPct(sc.tauxOccupation, 0);
  const rampLabel = y1.isRampUp ? " 🚀 Ramp-up" : "";
  setText("rev-scenario",    sc.label + " — Occ. " + occLabel + rampLabel + " · Studios " + sc.prixNuitStudio + " MAD · Lofts " + sc.prixNuitLoft + " MAD");

  const tbody = document.getElementById("rev-table-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  S.projections.forEach(p => {
    const tr = document.createElement("tr");
    const occEff = p.occMoyEffective != null ? fmtPct(p.occMoyEffective, 1) : "–";
    const ramp = p.isRampUp ? ' <span class="badge badge-amber" style="font-size:0.65rem">ramp-up</span>' : "";
    tr.innerHTML = `
      <td>An ${p.year}${ramp}</td>
      <td class="num">${occEff}</td>
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
    { name: `Gestion (${Math.round(CHARGES.tauxGestion * 100)}% CA héberg.)`, val: ch.gestion },
    { name: "Salaires 2 employés (charges incl.)",  val: ch.salaires },
    { name: "Eau + Électricité + Internet",          val: ch.utilities },
    { name: "Consommables ménage & linge",           val: ch.consommables },
    { name: "Comptable externe",                     val: ch.comptable },
    { name: "Assurance",                             val: ch.assurance },
    { name: "Entretien & maintenance",               val: ch.entretien },
    { name: "Taxes professionnelles" + (ch.taxesPro === 0 ? " (exonéré 5 ans)" : ""), val: ch.taxesPro },
    // Syndic : N/A — immeuble indivisible, monopropriété (pas de copropriété)
    { name: "Taxe d'habitation" + (ch.taxeHabitation === 0 ? " (exonéré 5 ans)" : ""), val: ch.taxeHabitation },
    { name: "Provision renouvellement mobilier",      val: ch.provisionRenouv },
    { name: "Divers & imprévus",                     val: ch.divers },
  ];
  // Coûts ponctuels An 1
  if (ch.marketingLancement > 0) items.push({ name: "Marketing de lancement (An 1)", val: ch.marketingLancement });
  if (ch.fraisCreation > 0) items.push({ name: "Frais création SARL (An 1)", val: ch.fraisCreation });
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

  // Row 1: CF Net, TRI, VAN, Payback — with dynamic insights
  setText("cf-net-an1",     fmtMAD(y1.cashFlowNet));
  // Insight CF Net: monthly + Y1→Y10 growth trajectory
  const cfY10 = S.projections.length >= 10 ? S.projections[9].cashFlowNet : null;
  const cfInsight = fmtMAD(K.cfMensuelAn1) + "/mois"
    + (cfY10 != null && y1.cashFlowNet > 0
       ? " · ×" + (cfY10 / y1.cashFlowNet).toFixed(1) + " en An 10"
       : y1.cashFlowNet <= 0 ? (() => { const idx = S.projections.findIndex(p => p.cashFlowNet > 0); return idx >= 0 ? " · positif dès An " + (idx + 1) : " · reste négatif sur 20 ans"; })() : "");
  setText("cf-net-mensuel", cfInsight);

  setText("cf-tri",         isFinite(K.tri) ? fmtPct(K.tri, 1) : "N/A");
  // Insight TRI: compare vs MASI 8% and S&P 10%
  const triPct = K.tri != null ? K.tri * 100 : 0;
  const triInsight = triPct > 10
    ? "Bat S&P 500 (10%) et MASI (8%)"
    : triPct > 8
    ? "Bat MASI (8%), sous S&P 500 (10%)"
    : triPct > 6.25
    ? "Bat l'épargne UAE (6,25%)"
    : "Sous les alternatives passives";
  setText("cf-tri-insight", triInsight);

  setText("cf-van",         fmtMAD(K.van));
  // Insight VAN: express as multiple of apport + verdict
  const vanMultiple = S.financement.apportNet > 0 ? K.van / S.financement.apportNet : 0;
  const vanInsight = K.van >= 0
    ? "+" + vanMultiple.toFixed(1) + "× l'apport à " + fmtPct(K.tauxActualisation, 0)
    : "Projet détruit " + fmtPct(Math.abs(vanMultiple), 0) + " de l'apport";
  setText("cf-van-taux", vanInsight);

  setText("cf-payback",     K.paybackYear ? K.paybackYear + " ans" : "> " + PROJECTION_YEARS + " ans");
  // Insight Payback: break-even occupancy context
  const paybackInsight = K.breakEvenOcc != null
    ? "Break-even à " + fmtPct(K.breakEvenOcc, 0) + " d'occupation"
    : "Sur apport personnel";
  setText("cf-payback-insight", paybackInsight);

  // Row 2: Rendements — with dynamic insights
  setText("cf-rdt-projet",  fmtPct(K.rendementNet));
  // Insight Rdt Projet: compare An1 vs stabilisé Y15-20
  const rdtStabPct = K.rendementStabilise ? (K.rendementStabilise * 100).toFixed(1) : null;
  const rdtProjetInsight = rdtStabPct
    ? "→ " + rdtStabPct + "% stabilisé (Y15-20)"
    : "Cash yield An 1";
  setText("cf-rdt-projet-insight", rdtProjetInsight);

  setText("cf-rdt-apport",  fmtPct(K.rendementNetApport));
  // Insight Rdt Apport: leverage multiplier or negative warning
  const leverageX = K.rendementNet > 0 ? (K.rendementNetApport / K.rendementNet).toFixed(1) : null;
  const leverageInsight = leverageX
    ? "Levier ×" + leverageX + " vs rendement projet"
    : K.rendementNetApport < 0
    ? "CF An 1 négatif — levier amplifie la perte"
    : "Effet de levier neutre";
  setText("cf-rdt-apport-insight", leverageInsight);

  setText("cf-coc",         fmtPct(K.cashOnCash));
  // Insight Cash-on-Cash: compare vs alternatives
  const cocPct = K.cashOnCash * 100;
  const cocInsight = cocPct > 6.25
    ? "Bat livret UAE (6,25%) et immo Casa (5,5%)"
    : cocPct > 5.5
    ? "Bat immo locatif Casa (5,5%)"
    : cocPct > 0
    ? "Sous immo locatif Casa (5,5%)"
    : "CF négatif An 1 — positif après ramp-up";
  setText("cf-coc-insight", cocInsight);

  setText("cf-marge",       fmtPct(K.margeCF));
  // Insight Marge CF: contextual interpretation
  const margePct = K.margeCF * 100;
  const margeInsight = margePct > 10
    ? fmtMAD(Math.round(K.margeCF * y1.revTotal / 12)) + " net gardé/mois"
    : margePct > 0
    ? "Marge serrée — " + fmtMAD(Math.round(K.margeCF * y1.revTotal / 12)) + " net/mois"
    : "Marge négative An 1 — ramp-up";
  setText("cf-marge-insight", margeInsight);

  // Trajectoire long-terme
  setText("cf-wealth",        fmtMAD(K.wealthTotal));
  setText("cf-multiple",      "×" + K.multipleApport.toFixed(1) + " l'apport récupéré");

  // Wealth breakdown
  if (K.wealthBreakdown) {
    const wb = K.wealthBreakdown;
    setText("wb-cf",     fmtMAD(wb.cumulCF));
    setText("wb-resid",  "+" + fmtMAD(wb.valeurResiduelle));
    setText("wb-apport", "−" + fmtMAD(wb.apportNet));
    setText("wb-total",  fmtMAD(wb.total));
    setText("wb-taux",   fmtPct(wb.tauxAppreciation, 0));
  }
  setText("cf-debt-free",     K.debtFreedomYear ? "An " + K.debtFreedomYear : "> " + PROJECTION_YEARS + " ans");
  setText("cf-post-debt",     K.cfPostDebtAvg ? fmtMAD(K.cfPostDebtAvg) + " / an" : "–");
  setText("cf-post-debt-mensuel", K.cfPostDebtAvg ? fmtMAD(K.cfPostDebtAvg / 12) + " / mois" : "");
  setText("cf-rdt-stab",     K.rendementStabilise ? fmtPct(K.rendementStabilise) : "–");

  // Croissance & fiscalité
  setText("cf-growth-10",   K.cfGrowthY10 != null ? (K.cfGrowthY10 >= 0 ? "+" : "") + fmtPct(K.cfGrowthY10, 0) : "–");
  setText("cf-growth-20",   K.cfGrowthY20 != null ? (K.cfGrowthY20 >= 0 ? "+" : "") + fmtPct(K.cfGrowthY20, 0) : "–");
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

// --- Wealth Building ---
function renderWealth(S) {
  const K = S.kpi;
  if (!K.wealthMilestones) return;

  // Hero KPIs
  const wlthTotal = K.wealthMilestones[3].totalWealth; // Y20
  const multiple = K.wealthMilestones[3].multiple;
  setText("wlth-total", fmtMAD(wlthTotal));
  setText("wlth-multiple", "×" + multiple.toFixed(1) + " votre mise de départ");
  setText("wlth-capital", fmtMAD(K.capitalInvesti));

  // Milestones table
  const tb = document.getElementById("wlth-milestones-tbody");
  if (tb) {
    tb.innerHTML = "";
    K.wealthMilestones.forEach(m => {
      const tr = document.createElement("tr");
      const isY20 = m.year === 20;
      tr.style.cssText = isY20 ? "background:#d1fae5;font-weight:700" : "";
      tr.innerHTML = `
        <td>${m.year} ans</td>
        <td class="num">${fmtMAD(m.propValue)}</td>
        <td class="num">${fmtMAD(m.equity)}</td>
        <td class="num">${fmtMAD(m.cumulCash)}</td>
        <td class="num" style="color:#059669;font-weight:700">${fmtMAD(m.totalWealth)}</td>
        <td style="text-align:center;font-weight:700;color:${m.multiple >= 5 ? '#059669' : m.multiple >= 3 ? '#2563eb' : '#6b7280'}">×${m.multiple.toFixed(1)}</td>`;
      tb.appendChild(tr);
    });
  }

  // Wealth Building Breakdown
  setText("wlth-cf15", fmtMAD(K.cfMoyenY1_5));
  setText("wlth-cf610", fmtMAD(K.cfMoyenY6_10));
  setText("wlth-cf1120", fmtMAD(K.cfMoyenY11_20));

  // Wealth building decomposition
  const wbEl = document.getElementById("wlth-machine-msg");
  if (wbEl && K.wealthBuildingByYear) {
    const wb = K.wealthBuildingByYear;
    const y1 = wb[0];
    const y10 = wb[9];
    const y20 = wb[19];
    const avg = K.wbAvg20;

    wbEl.innerHTML = `
      <div style="margin-bottom:12px">
        <strong>Création de richesse : ${fmtMAD(avg)}/mois en moyenne sur 20 ans</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="background:var(--bg-offset,#f5f5f5);padding:10px;border-radius:8px;text-align:center">
          <div style="font-size:11px;opacity:.7">An 1</div>
          <div style="font-size:18px;font-weight:700;color:var(--accent,#0ea5e9)">${fmtMAD(y1.totalMensuel)}<small>/mois</small></div>
        </div>
        <div style="background:var(--bg-offset,#f5f5f5);padding:10px;border-radius:8px;text-align:center">
          <div style="font-size:11px;opacity:.7">An 10</div>
          <div style="font-size:18px;font-weight:700;color:var(--accent,#0ea5e9)">${fmtMAD(y10.totalMensuel)}<small>/mois</small></div>
        </div>
        <div style="background:var(--bg-offset,#f5f5f5);padding:10px;border-radius:8px;text-align:center">
          <div style="font-size:11px;opacity:.7">An 20</div>
          <div style="font-size:18px;font-weight:700;color:var(--accent,#0ea5e9)">${fmtMAD(y20.totalMensuel)}<small>/mois</small></div>
        </div>
      </div>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border,#ddd)">
          <th style="text-align:left;padding:4px 6px">Composante</th>
          <th style="text-align:right;padding:4px 6px">An 1</th>
          <th style="text-align:right;padding:4px 6px">An 10</th>
          <th style="text-align:right;padding:4px 6px">An 20</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:4px 6px">💰 Cash-flow net</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y1.cfNetMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y10.cfNetMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y20.cfNetMensuel)}</td></tr>
          <tr><td style="padding:4px 6px">🏦 Rembt capital prêt</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y1.equityMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y10.equityMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y20.equityMensuel)}</td></tr>
          <tr><td style="padding:4px 6px">📈 Appréciation bien</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y1.appreciationMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y10.appreciationMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y20.appreciationMensuel)}</td></tr>
          <tr style="font-weight:700;border-top:2px solid var(--border,#ddd)">
            <td style="padding:4px 6px">Total</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y1.totalMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y10.totalMensuel)}</td>
            <td style="text-align:right;padding:4px 6px">${fmtMAD(y20.totalMensuel)}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:10px;font-size:12px;opacity:.8;line-height:1.5">
        Même quand le cash-flow est négatif, vous construisez de la richesse via le remboursement du capital (les locataires paient votre dette) et l'appréciation du bien immobilier.
        ${y1.cfNetMensuel < 0 ? `<br><strong>An 1</strong> : le CF est négatif (${fmtMAD(y1.cfNetMensuel)}/mois), mais ${fmtMAD(y1.equityMensuel + y1.appreciationMensuel)}/mois de richesse se construit silencieusement.` : ''}
      </div>
    `;
  }

  // ═══ Interactive Year Explorer ═══
  const slider = document.getElementById("wlth-year-slider");
  if (slider && K.wealthBuildingByYear) {
    // Store data globally for slider callback
    window.__wbData = K.wealthBuildingByYear;
    window.__wbDebtFree = K.debtFreedomYear;
    slider.value = 1;
    updateWealthYearExplorer(1);
    slider.oninput = function() { updateWealthYearExplorer(+this.value); };
  }

  // Day 1 Equity
  const d = K.day1Equity;
  if (d) {
    setText("wlth-cout-total", fmtMAD(d.coutTotalNetTVA));
    setText("wlth-cout-unite", fmtMAD(d.coutRevientNetTVAParUnite) + " / unité (après TVA)");
    setText("wlth-tva-recup", fmtMAD(d.tvaRecuperee));
    setText("wlth-val-marche", fmtMAD(d.valeurMarcheCapitalisation));
    setText("wlth-cap-rate", "NOI stabilisé / cap rate " + (d.capRateMarche * 100).toFixed(0) + "%");
    const msgEl = document.getElementById("wlth-day1-msg");
    if (msgEl) {
      const equityPct = (d.equityJour1Pct * 100).toFixed(0);
      if (d.equityJour1 > 0) {
        msgEl.innerHTML = `<strong style="color:#059669">Equity créée dès le Jour 1 : +${fmtMAD(d.equityApresTVA)}</strong> — En construisant vous-même (construction groupée), vous créez un actif dont la valeur de marché (capitalisation du NOI) dépasse le coût de construction de <strong>${equityPct}%</strong>. ` +
          `La récupération de la TVA construction + mobilier (<strong>${fmtMAD(d.tvaRecuperee)}</strong>) réduit encore votre coût net réel.`;
      } else {
        msgEl.innerHTML = `Le coût de construction est supérieur à la valeur de capitalisation dans ce scénario. C'est normal en phase projet — la valeur se crée via les cash-flows futurs et l'appréciation immobilière.`;
      }
    }
  }

  // Alternatives comparison table
  const altTb = document.getElementById("wlth-alt-tbody");
  if (altTb && K.altComparisons) {
    altTb.innerHTML = "";
    // Project row first
    const projM = K.wealthMilestones;
    const trP = document.createElement("tr");
    trP.style.cssText = "background:#d1fae5;font-weight:700";
    trP.innerHTML = `<td style="color:#059669">Ce projet</td>` +
      projM.map(m => `<td class="num" style="color:#059669">${fmtMAD(m.totalWealth)}</td>`).join("") +
      `<td style="text-align:center;color:#059669">×${projM[3].multiple.toFixed(1)}</td>`;
    altTb.appendChild(trP);
    // Alternatives
    K.altComparisons.forEach(alt => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${alt.name}</td>` +
        alt.milestones.map(m => `<td class="num">${fmtMAD(m.value)}</td>`).join("") +
        `<td style="text-align:center">×${(alt.milestones[3].value / K.capitalInvesti).toFixed(1)}</td>`;
      altTb.appendChild(tr);
    });
  }
}

// ═══ Year Explorer — slider callback ═══
function updateWealthYearExplorer(year) {
  const wb = window.__wbData;
  if (!wb || !wb[year - 1]) return;
  const w = wb[year - 1];

  setText("wlth-year-label", "An " + year);

  setText("wlth-yr-cf", fmtMAD(w.cfNetMensuel));
  setText("wlth-yr-eq", fmtMAD(w.equityMensuel));
  setText("wlth-yr-ap", fmtMAD(w.appreciationMensuel));
  setText("wlth-yr-total", fmtMAD(w.totalMensuel));

  // Color CF based on sign
  const cfEl = document.getElementById("wlth-yr-cf");
  if (cfEl) cfEl.style.color = w.cfNetMensuel >= 0 ? "#059669" : "#dc2626";

  // Stacked bar proportions — negative CF shown in red
  const bar = document.getElementById("wlth-yr-bar");
  if (bar) {
    const absCf = Math.abs(w.cfNetMensuel);
    const abs = absCf + w.equityMensuel + w.appreciationMensuel;
    if (abs > 0) {
      const pCf = absCf / abs * 100;
      const pEq = w.equityMensuel / abs * 100;
      const pAp = w.appreciationMensuel / abs * 100;
      const cfColor = w.cfNetMensuel >= 0 ? "#059669" : "#dc2626";
      const cfLabel = w.cfNetMensuel < 0 ? "-" + Math.round(pCf) + "%" : Math.round(pCf) + "%";
      bar.innerHTML =
        `<div style="width:${pCf.toFixed(1)}%;background:${cfColor};display:flex;align-items:center;justify-content:center">${pCf >= 12 ? cfLabel : ''}</div>` +
        `<div style="width:${pEq.toFixed(1)}%;background:#2563eb;display:flex;align-items:center;justify-content:center">${pEq >= 12 ? Math.round(pEq) + '%' : ''}</div>` +
        `<div style="width:${pAp.toFixed(1)}%;background:#7c3aed;display:flex;align-items:center;justify-content:center">${pAp >= 12 ? Math.round(pAp) + '%' : ''}</div>`;
    }
  }

  // Contextual insight
  const insEl = document.getElementById("wlth-yr-insight");
  if (insEl) {
    const debtFree = window.__wbDebtFree;
    let insight = "";
    if (w.cfNetMensuel < 0)
      insight = "💡 CF négatif de " + fmtMAD(Math.abs(w.cfNetMensuel)) + "/mois — mais richesse nette créée : " + fmtMAD(w.totalMensuel) + "/mois (equity + appréciation − CF)";
    else if (debtFree && year >= debtFree)
      insight = "🔓 Dette remboursée — 100% du cash-flow est pour vous";
    else if (year <= 2)
      insight = "🚀 Phase ramp-up — la richesse se construit surtout via l'equity et l'appréciation";
    else if (w.totalMensuel > 100000)
      insight = "🏆 " + fmtMAD(w.totalAnnuel) + "/an de création de richesse";
    else
      insight = "📊 " + fmtMAD(w.totalAnnuel) + " de richesse créée cette année";
    insEl.textContent = insight;
  }
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
    { poste: `Gestion (${Math.round(CHARGES.tauxGestion * 100)}% CA héberg.)`, key: "gestion", nature: "Variable" },
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
          <td style="font-size:.78rem;color:var(--text-sec)">Exo. devises 5 ans (Art.6-I CGI)</td>
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

// ============================================================
// GESTION DUEL — Full comparison: Auto-géré vs Société de gestion
// ============================================================
function renderGestionDuel(S) {
  const D = S.gestionDuel;
  if (!D) return;
  const A = D.autoGere;   // Auto-géré
  const G = D.societeGestion;  // Société de gestion
  const aY1 = A.projections[0];
  const gY1 = G.projections[0];

  // ── KPI Summary ──
  const kpiGrid = document.getElementById("gd-kpi-grid");
  if (kpiGrid) {
    const deltaCharges = aY1.chargesTotal - gY1.chargesTotal;
    const deltaCF = aY1.cashFlowNet - gY1.cashFlowNet;
    kpiGrid.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">CF Net An 1 — Auto-géré</div><div class="kpi-value ${aY1.cashFlowNet >= 0 ? 'kpi-green' : 'kpi-red'}">${fmtMAD(aY1.cashFlowNet)}</div><div class="kpi-sub">TRI ${fmtPct(A.kpi.tri)}</div></div>
      <div class="kpi-card"><div class="kpi-label">CF Net An 1 — Société</div><div class="kpi-value ${gY1.cashFlowNet >= 0 ? 'kpi-green' : 'kpi-red'}">${fmtMAD(gY1.cashFlowNet)}</div><div class="kpi-sub">TRI ${fmtPct(G.kpi.tri)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Gain CF An 1</div><div class="kpi-value kpi-green">+${fmtMAD(deltaCF)}</div><div class="kpi-sub">En faveur auto-géré</div></div>
      <div class="kpi-card"><div class="kpi-label">Gain TRI</div><div class="kpi-value kpi-green">${(A.kpi.tri != null && G.kpi.tri != null) ? '+' + ((A.kpi.tri - G.kpi.tri) * 100).toFixed(2) + ' pts' : '–'}</div><div class="kpi-sub">${fmtPct(A.kpi.tri)} vs ${fmtPct(G.kpi.tri)}</div></div>
    `;
  }

  // ── Hypothèses ──
  const hypoEl = document.getElementById("gd-hypotheses-body");
  if (hypoEl) {
    hypoEl.innerHTML = `<div class="grid-2">
      <div style="padding:12px;background:#ecfdf5;border-radius:8px;border:1px solid #bbf7d0">
        <strong style="color:#065f46">Auto-géré (depuis UAE)</strong>
        <ul style="margin:8px 0 0 18px;font-size:.85rem;line-height:1.8">
          <li>Commission gestion : <strong>0%</strong></li>
          <li>Concierge (4 500 MAD) + ménage (3 500 MAD) = 2 employés</li>
          <li>Assurance : <strong>13 000 MAD/an</strong> (négociation bâtiment neuf)</li>
          <li>Internet/TV : <strong>833 MAD/mois</strong> (~10K/an, IPTV éco)</li>
          <li>Divers : <strong>10 000 MAD/an</strong></li>
          <li>L'investisseur gère pricing, OTA, coordination à distance</li>
          <li>Temps personnel non chiffré (coût d'opportunité)</li>
        </ul>
      </div>
      <div style="padding:12px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">
        <strong style="color:#1e40af">Société de gestion</strong>
        <ul style="margin:8px 0 0 18px;font-size:.85rem;line-height:1.8">
          <li>Commission gestion : <strong>20% du CA hébergement brut</strong></li>
          <li>Concierge + ménage = 2 employés (supervisés par la société)</li>
          <li>Assurance : <strong>${fmtNum(CHARGES.assurance)} MAD/an</strong></li>
          <li>Internet/TV : <strong>${fmtNum(CHARGES.internetTv)} MAD/mois</strong></li>
          <li>Divers : <strong>${fmtNum(CHARGES.divers)} MAD/an</strong></li>
          <li>Propriétaire 100% passif — zéro implication opérationnelle</li>
          <li>Expertise pricing dynamique, revenue management incluse</li>
        </ul>
      </div>
    </div>`;
  }

  // ── Charges détaillées An 1 ──
  const chargesEl = document.getElementById("gd-charges-compare-body");
  if (chargesEl) {
    const chargeItems = [
      { label: "Gestion (commission)", a: aY1.chargesDetail.gestion, g: gY1.chargesDetail.gestion },
      { label: "Salaires", a: aY1.chargesDetail.salaires, g: gY1.chargesDetail.salaires },
      { label: "Consommables", a: aY1.chargesDetail.consommables, g: gY1.chargesDetail.consommables },
      { label: "Utilities (eau/élec/internet)", a: aY1.chargesDetail.utilities, g: gY1.chargesDetail.utilities },
      { label: "Comptable", a: aY1.chargesDetail.comptable, g: gY1.chargesDetail.comptable },
      { label: "Assurance", a: aY1.chargesDetail.assurance, g: gY1.chargesDetail.assurance },
      { label: "Entretien", a: aY1.chargesDetail.entretien, g: gY1.chargesDetail.entretien },
      { label: "Divers", a: aY1.chargesDetail.divers, g: gY1.chargesDetail.divers },
      { label: "Provision renouvellement", a: aY1.chargesDetail.provisionRenouv || 0, g: gY1.chargesDetail.provisionRenouv || 0 },
      { label: "Marketing lancement (An 1)", a: aY1.chargesDetail.marketingLancement || 0, g: gY1.chargesDetail.marketingLancement || 0 },
      { label: "Frais création SARL (An 1)", a: aY1.chargesDetail.fraisCreation || 0, g: gY1.chargesDetail.fraisCreation || 0 },
    ];
    let html = '<table><thead><tr><th>Poste</th><th style="text-align:right;color:#065f46">Auto-géré</th><th style="text-align:right;color:#1e40af">Société</th><th style="text-align:right">Delta</th></tr></thead><tbody>';
    chargeItems.forEach(c => {
      const d = c.a - c.g;
      const dColor = d < 0 ? 'var(--green)' : d > 0 ? 'var(--red)' : '';
      const dStr = d === 0 ? '=' : (d < 0 ? '' : '+') + fmtMAD(d);
      html += `<tr><td>${c.label}</td><td class="num">${fmtMAD(c.a)}</td><td class="num">${fmtMAD(c.g)}</td><td class="num" style="color:${dColor}">${dStr}</td></tr>`;
    });
    html += `<tr style="font-weight:700;background:#fef3c7;border-top:2px solid var(--border)"><td>TOTAL CHARGES An 1</td><td class="num">${fmtMAD(aY1.chargesTotal)}</td><td class="num">${fmtMAD(gY1.chargesTotal)}</td>`;
    const dTotal = aY1.chargesTotal - gY1.chargesTotal;
    html += `<td class="num" style="color:${dTotal < 0 ? 'var(--green)' : 'var(--red)'}">${dTotal < 0 ? '' : '+'}${fmtMAD(dTotal)}</td></tr>`;
    html += '</tbody></table>';
    chargesEl.innerHTML = html;
  }

  // ── KPI Comparatif ──
  const kpiEl = document.getElementById("gd-kpi-compare-body");
  if (kpiEl) {
    const metrics = [
      { label: "Revenu brut hébergement An 1", a: aY1.revBrutHotel, g: gY1.revBrutHotel, fmt: fmtMAD },
      { label: "Revenu net An 1", a: aY1.revTotal, g: gY1.revTotal, fmt: fmtMAD },
      { label: "Charges totales An 1", a: aY1.chargesTotal, g: gY1.chargesTotal, fmt: fmtMAD, inverted: true },
      { label: "EBITDA An 1", a: aY1.ebitda, g: gY1.ebitda, fmt: fmtMAD, bold: true },
      { label: "Service dette An 1", a: aY1.debtServiceTotal, g: gY1.debtServiceTotal, fmt: fmtMAD },
      { label: "Cash-Flow Net An 1", a: aY1.cashFlowNet, g: gY1.cashFlowNet, fmt: fmtMAD, bold: true, highlight: true },
      { label: "Rendement Brut", a: A.kpi.rendementBrut, g: G.kpi.rendementBrut, fmt: fmtPct },
      { label: "Rendement Net", a: A.kpi.rendementNet, g: G.kpi.rendementNet, fmt: fmtPct },
      { label: "Rendement / Apport", a: A.kpi.rendementNetApport, g: G.kpi.rendementNetApport, fmt: fmtPct },
      { label: "TRI (20 ans)", a: A.kpi.tri, g: G.kpi.tri, fmt: fmtPct, bold: true, highlight: true },
      { label: "VAN @ 8%", a: A.kpi.van, g: G.kpi.van, fmt: fmtMAD },
      { label: "Payback", a: A.kpi.paybackYear, g: G.kpi.paybackYear, custom: v => v ? v + " ans" : "> 20 ans", inverted: true },
      { label: "Break-Even Occupation", a: A.kpi.breakEvenOcc, g: G.kpi.breakEvenOcc, fmt: v => fmtPct(v, 0), inverted: true },
      { label: "DSCR An 1", a: A.kpi.dscr, g: G.kpi.dscr, custom: v => v === Infinity ? "∞" : v.toFixed(2) + "x" },
      { label: "Cash-on-Cash An 1", a: A.kpi.cashOnCash, g: G.kpi.cashOnCash, fmt: fmtPct },
      { label: "CF Mensuel Moyen An 1", a: A.kpi.cfMensuelAn1, g: G.kpi.cfMensuelAn1, fmt: fmtMAD },
    ];
    let html = '<table><thead><tr><th>Métrique</th><th style="text-align:right;color:#065f46">Auto-géré</th><th style="text-align:right;color:#1e40af">Société</th><th style="text-align:right">Delta</th></tr></thead><tbody>';
    metrics.forEach(m => {
      const fmtFn = m.custom || m.fmt;
      const aStr = fmtFn(m.a);
      const gStr = fmtFn(m.g);
      let delta = '', dColor = '';
      if (m.custom && !m.fmt) {
        if (m.label === "Payback") {
          const d = (m.a || 99) - (m.g || 99);
          delta = d === 0 ? '=' : (d < 0 ? d : '+' + d) + ' an(s)';
          dColor = d < 0 ? 'var(--green)' : d > 0 ? 'var(--red)' : '';
        } else {
          const d = m.a - m.g;
          delta = d > 0 ? '+' + fmtFn(m.a).replace(/[^0-9.,]/g, '') : '–';
          dColor = d > 0 ? 'var(--green)' : '';
        }
      } else if (m.fmt === fmtPct || (typeof m.fmt === 'function' && m.fmt !== fmtMAD)) {
        const d = m.a - m.g;
        if (m.fmt === fmtPct) {
          delta = (d >= 0 ? '+' : '') + (d * 100).toFixed(2) + ' pts';
        } else {
          delta = (d >= 0 ? '+' : '') + m.fmt(d);
        }
        dColor = m.inverted ? (d < 0 ? 'var(--green)' : d > 0 ? 'var(--red)' : '') : (d > 0 ? 'var(--green)' : d < 0 ? 'var(--red)' : '');
      } else if (m.fmt === fmtMAD) {
        const d = m.a - m.g;
        delta = (d >= 0 ? '+' : '') + fmtMAD(d);
        dColor = m.inverted ? (d < 0 ? 'var(--green)' : d > 0 ? 'var(--red)' : '') : (d > 0 ? 'var(--green)' : d < 0 ? 'var(--red)' : '');
      }
      const rowStyle = m.highlight ? ' style="background:#eff6ff;font-weight:600"' : m.bold ? ' style="font-weight:600"' : '';
      html += `<tr${rowStyle}><td>${m.label}</td><td class="num">${aStr}</td><td class="num">${gStr}</td><td class="num" style="color:${dColor}">${delta}</td></tr>`;
    });
    html += '</tbody></table>';
    kpiEl.innerHTML = html;
  }

  // ── Projection 20 ans ──
  const projEl = document.getElementById("gd-projection-body");
  if (projEl) {
    const years = [1, 2, 3, 5, 7, 10, 15, 20];
    let html = '<table><thead><tr><th>Année</th><th style="text-align:right;color:#065f46">CF Auto-géré</th><th style="text-align:right;color:#1e40af">CF Société</th><th style="text-align:right">Gain</th><th style="text-align:right;color:#065f46">Cumul Auto</th><th style="text-align:right;color:#1e40af">Cumul Société</th></tr></thead><tbody>';
    years.forEach(y => {
      const i = y - 1;
      if (i >= A.projections.length) return;
      const aCF = A.projections[i].cashFlowNet;
      const gCF = G.projections[i].cashFlowNet;
      const gain = aCF - gCF;
      const aCum = A.projections[i].cumulCashFlow;
      const gCum = G.projections[i].cumulCashFlow;
      const bg = y <= 1 ? ' style="background:#fef3c7"' : '';
      html += `<tr${bg}>
        <td><strong>An ${y}</strong></td>
        <td class="num" style="color:${aCF >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(aCF)}</td>
        <td class="num" style="color:${gCF >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(gCF)}</td>
        <td class="num" style="color:var(--green)">+${fmtMAD(gain)}</td>
        <td class="num" style="color:${aCum >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(aCum)}</td>
        <td class="num" style="color:${gCum >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(gCum)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    projEl.innerHTML = html;
  }

  // ── Cumul 20 ans ──
  const cumulEl = document.getElementById("gd-cumul-body");
  if (cumulEl) {
    const lastA = A.projections[A.projections.length - 1];
    const lastG = G.projections[G.projections.length - 1];
    const totalGain = lastA.cumulCashFlow - lastG.cumulCashFlow;
    const vanDelta = A.kpi.van - G.kpi.van;
    cumulEl.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
        <div class="kpi-card" style="border-left:3px solid #16a34a"><div class="kpi-label">Cumul CF 20 ans — Auto-géré</div><div class="kpi-value kpi-green">${fmtMAD(lastA.cumulCashFlow)}</div></div>
        <div class="kpi-card" style="border-left:3px solid #2563eb"><div class="kpi-label">Cumul CF 20 ans — Société</div><div class="kpi-value">${fmtMAD(lastG.cumulCashFlow)}</div></div>
        <div class="kpi-card" style="border-left:3px solid #f59e0b;background:#fefce8"><div class="kpi-label">Gain cumulé Auto-géré</div><div class="kpi-value kpi-green">+${fmtMAD(totalGain)}</div><div class="kpi-sub">sur 20 ans</div></div>
      </div>
      <div class="info-box">
        <strong>En résumé :</strong> Sur 20 ans, la gestion personnelle génère <strong>+${fmtMAD(totalGain)} MAD</strong> de cash-flow cumulé supplémentaire par rapport à une société de gestion.
        La VAN à 8% est supérieure de <strong>+${fmtMAD(vanDelta)}</strong> et le TRI passe de <strong>${fmtPct(G.kpi.tri)}</strong> à <strong>${fmtPct(A.kpi.tri)}</strong>.
        ${A.kpi.paybackYear && G.kpi.paybackYear ? `Le payback s'accélère de ${G.kpi.paybackYear - A.kpi.paybackYear} an(s) (${A.kpi.paybackYear} vs ${G.kpi.paybackYear} ans).` : ''}
      </div>
    `;
  }

  // ── Recommandation ──
  const recEl = document.getElementById("gd-recommandation");
  if (recEl) {
    const deltaCF = aY1.cashFlowNet - gY1.cashFlowNet;
    recEl.innerHTML = `<strong>Phase 1 (An 1-2) :</strong> La gestion personnelle est nettement plus rentable (+${fmtMAD(deltaCF)}/an An 1), mais nécessite un concierge fiable et une implication active depuis les UAE (pricing dynamique, réponses guests, coordination ménage). Risque : si le concierge quitte ou baisse en qualité, l'occupation peut chuter.<br><br>
    <strong>Phase 2 (An 3+) :</strong> Avec une réputation établie (Booking 8.5+), des avis solides, et des processus rodés, la gestion personnelle devient encore plus avantageuse car le taux d'OTA baisse naturellement. Transition vers une société de gestion uniquement si la charge mentale devient excessive ou si vous souhaitez une passivité totale.<br><br>
    <strong>Option hybride :</strong> Commencer en auto-géré, investir l'économie An 1-2 dans le fonds de roulement (MDM), puis réévaluer An 3 en fonction de la qualité de service et de votre disponibilité.`;
  }

  // ── Tab detail: Auto-géré ──
  _renderModeDetail('gd-auto-detail', 'gd-auto-projection', A, '#065f46', 'Auto-géré');

  // ── Tab detail: Société ──
  _renderModeDetail('gd-societe-detail', 'gd-societe-projection', G, '#1e40af', 'Société de gestion');
}

function _renderModeDetail(detailId, projId, mode, color, label) {
  const y1 = mode.projections[0];
  const detEl = document.getElementById(detailId);
  if (detEl) {
    detEl.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="kpi-card"><div class="kpi-label">Revenu Net An 1</div><div class="kpi-value">${fmtMAD(y1.revTotal)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Charges An 1</div><div class="kpi-value">${fmtMAD(y1.chargesTotal)}</div></div>
        <div class="kpi-card"><div class="kpi-label">EBITDA An 1</div><div class="kpi-value">${fmtMAD(y1.ebitda)}</div></div>
        <div class="kpi-card"><div class="kpi-label">CF Net An 1</div><div class="kpi-value ${y1.cashFlowNet >= 0 ? 'kpi-green' : 'kpi-red'}">${fmtMAD(y1.cashFlowNet)}</div></div>
      </div>
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="kpi-card"><div class="kpi-label">TRI (20 ans)</div><div class="kpi-value">${fmtPct(mode.kpi.tri)}</div></div>
        <div class="kpi-card"><div class="kpi-label">VAN @ 8%</div><div class="kpi-value">${fmtMAD(mode.kpi.van)}</div></div>
        <div class="kpi-card"><div class="kpi-label">Payback</div><div class="kpi-value">${mode.kpi.paybackYear ? mode.kpi.paybackYear + ' ans' : '> 20'}</div></div>
        <div class="kpi-card"><div class="kpi-label">DSCR An 1</div><div class="kpi-value">${mode.kpi.dscr === Infinity ? '∞' : mode.kpi.dscr.toFixed(2) + 'x'}</div></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Poste</th><th style="text-align:right">Montant An 1</th><th style="text-align:right">% charges</th></tr></thead><tbody>
        ${_chargeDetailRows(y1)}
      </tbody></table></div>
    `;
  }

  const prEl = document.getElementById(projId);
  if (prEl) {
    let html = '<table><thead><tr><th>An</th><th style="text-align:right">Revenu Net</th><th style="text-align:right">Charges</th><th style="text-align:right">EBITDA</th><th style="text-align:right">Dette</th><th style="text-align:right">CF Net</th><th style="text-align:right">Cumul CF</th></tr></thead><tbody>';
    mode.projections.forEach((p, i) => {
      const bg = i === 0 ? ' style="background:#fef3c7"' : '';
      html += `<tr${bg}><td><strong>${i + 1}</strong></td><td class="num">${fmtMAD(p.revTotal)}</td><td class="num">${fmtMAD(p.chargesTotal)}</td><td class="num">${fmtMAD(p.ebitda)}</td><td class="num">${fmtMAD(p.debtServiceTotal)}</td><td class="num" style="color:${p.cashFlowNet >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(p.cashFlowNet)}</td><td class="num" style="color:${p.cumulCashFlow >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMAD(p.cumulCashFlow)}</td></tr>`;
    });
    html += '</tbody></table>';
    prEl.innerHTML = html;
  }
}

function _chargeDetailRows(y1) {
  const cd = y1.chargesDetail;
  const total = y1.chargesTotal;
  const items = [
    ['Gestion (commission)', cd.gestion],
    ['Salaires', cd.salaires],
    ['Consommables', cd.consommables],
    ['Utilities', cd.utilities],
    ['Comptable', cd.comptable],
    ['Assurance', cd.assurance],
    ['Entretien', cd.entretien],
    ['Divers', cd.divers],
    ['Provision renouvellement', cd.provisionRenouv || 0],
    ['Marketing lancement', cd.marketingLancement || 0],
    ['Frais création SARL', cd.fraisCreation || 0],
    ['Taxes professionnelles', cd.taxesPro || 0],
    ['Taxe de séjour', cd.taxeSejour || 0],
  ].filter(([, v]) => v > 0);
  return items.map(([label, val]) =>
    `<tr><td>${label}</td><td class="num">${fmtMAD(val)}</td><td class="num">${(val / total * 100).toFixed(1)}%</td></tr>`
  ).join('') +
    `<tr style="font-weight:700;background:#fef3c7;border-top:2px solid var(--border)"><td>TOTAL</td><td class="num">${fmtMAD(total)}</td><td class="num">100%</td></tr>`;
}

// ═══════════════════════════════════════════════════════════════
// HYPOTHÈSES PAGE — Populates all 10 sections with live data
// ═══════════════════════════════════════════════════════════════

function renderHypotheses() {
  const row = (a, b, c) => `<tr><td>${a}</td><td class="num">${b}</td><td>${c}</td></tr>`;

  // ── 1. REVENUS ──
  const ra = REVENUE_ASSUMPTIONS;
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const el1 = document.getElementById('hyp-revenus');
  if (el1) el1.innerHTML = [
    row('Loyer commercial RDC', fmtMAD(ra.loyerCommercial) + '/mois', 'Bail commercial local RDC ~40 m² — Rue des Camélias, Maarif'),
    row('Part OTA (défaut)', fmtPct(ra.partOTA), 'Booking 55%, Airbnb — Mordor Intelligence 2025, PriceLabs Morocco'),
    row('Part directe', fmtPct(ra.partDirect), 'WhatsApp, téléphone, repeat guests — retours opérateurs Maarif'),
    row('Part informelle', fmtPct(ra.partInformel), 'Cash / non-déclaré — réalité marché marocain (estimation conservatrice)'),
    row('Commission OTA', fmtPct(ra.commissionOTA), 'Booking 15-18%, Airbnb 15.5%, moyenne pondérée ~15%'),
    row('Croissance tarifs', fmtPct(ra.croissanceTarifs) + '/an', 'Alignée sur inflation — tendance IPC Maroc 2-3%'),
    row('Inflation charges', fmtPct(ra.inflationCharges) + '/an', 'IPC Maroc : 2023=6.1%, 2024=1.3%, tendance ~2% — HCP, Bank Al-Maghrib'),
    row('Indexation loyer', fmtPct(ra.indexationLoyer) + '/an', 'Pratique bail commercial marocain — dahir n° 1-16-99'),
    row('Taux d\'actualisation (VAN)', fmtPct(ra.tauxActualisation), 'Standard immobilier commercial — entre obligataire (~5%) et equity (~12%)'),
    row('Appréciation immobilière', fmtPct(ra.tauxAppreciation) + '/an', 'Historique Casa 1-1.5%/an (BKAM 2015-2025) + effet Mondial 2030'),
    row('Ramp-up durée', ra.rampUp.dureeAns + ' an', 'Nouvel entrant sans avis — 12-18 mois pour atteindre potentiel'),
    row('Ramp-up occupation', fmtPct(ra.rampUp.coefOccupation) + ' du cible', 'Coefficient réducteur An 1 — retour opérateurs Maarif'),
    row('Ramp-up ADR', fmtPct(ra.rampUp.coefADR) + ' du cible', 'Discount lancement An 1 pour accumuler des avis'),
    row('Évolution canaux', ra.canauxEvolution.enabled ? 'Activée' : 'Désactivée', 'OTA multiplier décroissant Y1→Y5 : ' + ra.canauxEvolution.otaMultiplier.map(m => '×' + m.toFixed(2)).join(', ')),
    row('Passage in-house', (ra.switchInHouseAn ?? 21) >= 21 ? 'Jamais (conciergerie permanente)' : (ra.switchInHouseAn === 0 ? 'Dès An 1' : 'À partir An ' + ((ra.switchInHouseAn ?? 21) + 1)), 'Transition conciergerie (20% CA) → in-house (2 emp. SMIG, 0% gestion). Configurable 0-21 ans.'),
  ].join('');

  // ── 2. CHARGES ──
  const ch = CHARGES;
  const el2 = document.getElementById('hyp-charges');
  if (el2) el2.innerHTML = [
    row('Conciergerie (outsourcing)', fmtPct(ch.tauxGestion) + ' du CA', 'Conciergerie externe tout inclus : ménage, draps, accueil, check-in/out, listings, pricing'),
    row('Mode par défaut', ch.nbEmployes === 0 ? 'Outsourcing' : 'In-house (' + ch.nbEmployes + ' emp.)', ch.nbEmployes === 0 ? 'Conciergerie gère tout → 0 employés directs' : 'Employés au SMIG, non déclarés CNSS'),
    row('Salaire SMIG (si in-house)', fmtMAD(ch.salaireConcierge) + '/mois', 'SMIG 2026 : 3 400 MAD/mois — utilisé uniquement en mode in-house'),
    row('CNSS', ch.chargesSociales > 0 ? fmtPct(ch.chargesSociales) : '0%', 'Employés non déclarés — taux légal si déclaration : 20.71%'),
    row('Utilities fixe', fmtMAD(ch.utilitiesFixe) + '/mois', 'Parties communes LED + ascenseur — bâtiment neuf R+5'),
    row('Utilities variable', fmtMAD(ch.utilitiesVarParUnite) + '/unité/mois', 'Eau + élec + clim par unité occupée — tarif commercial Lydec Casa'),
    row('Internet + TV', fmtMAD(ch.internetTv) + '/mois', 'Fibre pro Inwi/MT 100Mbps + IPTV 11 unités — Inwi Pro 2025'),
    row('Assurance', fmtMAD(ch.assurance) + '/an', 'Multirisque hôtelier (incendie, RC, bris, perte exploitation) — courtiers Casa'),
    row('Entretien (neuf)', fmtMAD(ch.entretienBase) + '/an', 'Années 1-5, bâtiment sous garantie — ~0.4% valeur construction'),
    row('Entretien (mature)', fmtMAD(ch.entretienMature) + '/an', 'Après 5 ans, vieillissement normal — ~1% valeur construction'),
    row('Comptable', fmtMAD(ch.comptableAnnuel) + '/an', 'Forfait TPE hôtelière — tenue + déclarations — lec.ma, tmsonline.ma 2025'),
    row('Consommables', fmtMAD(ch.consommablesParNuitee) + '/nuitée', 'Linge ~15 MAD + amenities ~7 MAD + produits ~5 MAD + divers ~3 MAD'),
    row('Taxe professionnelle', fmtMAD(ch.taxesPro) + '/an', 'Après 5 ans exo (nouvelle construction) — CGI Art. 6-I-A'),
    row('Taxe habitation', fmtMAD(ch.taxeHabitation) + '/an', 'À partir An 6 — exo 5 ans nouvelle construction — upsilon-consulting.com'),
    row('Divers & imprévus', fmtMAD(ch.divers) + '/an', 'Frais bancaires, fournitures, licences PMS, déplacements'),
    row('Marketing lancement', fmtMAD(ch.budgetMarketingLancement) + ' (An 1)', 'One-shot — photos pro, création listings, promotions Booking Genius'),
    row('Frais création SARL', fmtMAD(ch.fraisCreation) + ' (An 1)', 'One-shot — constitution SARL + autorisations touristiques'),
    row('Taxe de séjour', fmtMAD(ch.taxeSejour || 0) + '/nuitée', 'Dahir n° 1-19-40 — taxe de promotion touristique, reversée à la commune'),
    row('Renouvellement mobilier', fmtMAD(ch.renouvellementMobilierParUnite) + '/unité / ' + ch.renouvellementMobilierCycle + ' ans', 'Cycle hôtelier 5-7 ans — benchmark opérateurs STR'),
    row('Syndic', fmtMAD(ch.syndic) + '/an', 'N/A — immeuble indivisible, monopropriété intégrale'),
  ].join('');

  // ── 3. FINANCEMENT ──
  const el3 = document.getElementById('hyp-financement');
  if (el3) el3.innerHTML = [
    row('Budget total TTC', fmtMAD(BUDGET.totalTTC), 'Terrain + frais + construction (hors ameublement)'),
    row('Ameublement/unité', fmtMAD(BUDGET.ameublementParUnite), '11 unités × 40K — achat en gros, en plus du 7M'),
    row('Terrain', fmtMAD(TERRAIN.prix), TERRAIN.surface + ' m² — Rue des Camélias, Maarif'),
    row('Frais acquisition', fmtPct(TERRAIN.fraisAcquisition), 'Enregistrement 4% + conservation 1.5% + notaire ~1%'),
    row('Tamwilkom taux', fmtPct(TAMWILKOM.tauxAnnuel) + ' HT/an', 'Fixe, portion Tamwilcom — TTC réel 2.75% (TVA 10% récupérable)'),
    row('Tamwilkom durée', TAMWILKOM.dureeAns + ' ans', 'Maximum courant MDM Tamwil — plafond 5M MAD'),
    row('Tamwilkom différé', TAMWILKOM.differeAns + ' ans', 'Différé sur principal — intérêts payés dès le début'),
    row('Banque taux', fmtPct(BANQUE_CLASSIQUE.tauxAnnuel) + ' HT/an', 'BAM T4-2025 TPME moy 5.22% — Médias24 jan 2026'),
    row('Banque durée', BANQUE_CLASSIQUE.dureeAns + ' ans', 'Maximum courant investissement pro'),
    row('Banque différé', BANQUE_CLASSIQUE.differeAns + ' an', 'Différé capital — intérêts payés pendant le différé'),
    row('MDM Invest subvention', fmtPct(MDM_INVEST.tauxSubvention) + ' (plafond ' + fmtMAD(MDM_INVEST.plafond) + ')', 'Prime investissement MRE — Tamwilcom'),
    row('MDM Invest engagement', MDM_INVEST.engagementAnnees + ' ans', 'Pas de désinvestissement sinon remboursement intégral'),
    row('Construction', PLANNING.delaiConstruction + ' mois', 'Architecte Jad (Nour Architects) — R+5'),
    row('Délai total', PLANNING.delaiTotal + ' mois', 'Autorisations + prêt (' + PLANNING.delaiAutorisationsPret + ' mois) + construction'),
  ].join('');

  // ── 4. FISCALITÉ ──
  const fi = FISCALITE;
  const el4 = document.getElementById('hyp-fiscalite');
  if (el4) el4.innerHTML = [
    row('TVA hébergement', fmtPct(fi.tvaTaux), 'Taux réduit hébergement touristique — CGI Maroc'),
    row('IS (Impôt sur les Sociétés)', fmtPct(fi.isTaux), 'Taux unique 2026+ pour BNF < 100M MAD — PLF 2023/2026'),
    row('Exonération IS devises', fi.exoDevisesAns + ' ans', 'Art. 6-I-B-3° CGI — exo totale sur part CA en devises (60 mois)'),
    row('Part CA en devises', fmtPct(fi.caDevisesPct), 'Proportion estimée — clientèle internationale 83% (AirROI)'),
    row('Amortissement bâtiment', fi.amortissementAns + ' ans (linéaire)', '5%/an sur construction HT — terrain non amortissable'),
    row('Amortissement mobilier', fi.amortissementMobilierAns + ' ans (linéaire)', '14.3%/an sur ameublement HT (TVA récupérable Art. 92-I-6° CGI)'),
    row('Exo TVA équipements', fi.exoEquipementsMois + ' mois', 'Art. 92-I-6° CGI — TVA récupérable sur équipements'),
    row('Exo taxe pro', fi.exoTaxeProAns + ' ans', 'Nouvelles constructions — CGI Art. 6-I-A'),
    row('Résidence fiscale', fi.residenceFiscale, 'UAE — pas d\'IS sur revenu des personnes. IS uniquement sur SARL marocaine'),
  ].join('');

  // ── 5. MARCHÉ ──
  const md = MARKET_DATA;
  const el5 = document.getElementById('hyp-marche');
  if (el5) el5.innerHTML = [
    row('Visiteurs Maroc 2025', fmtNum(md.visiteurs2025), 'Record historique — ONMT'),
    row('Nuitées 2025', fmtNum(md.nuitees2025), '+9% vs 2024 — Observatoire du Tourisme'),
    row('Taux occ. national', fmtPct(md.tauxOccupNational2025), '+3 pts vs 2024 — ONMT'),
    row('Listings Airbnb Casa', fmtNum(md.airbnbData.totalListingsCasa), '+47.1% YoY — AirDNA'),
    row('Listings Maarif', fmtNum(md.airbnbData.listingsMaarif), 'Quartier le plus saturé — Airbtics'),
    row('ADR médiane Maarif', fmtMAD(md.airbnbData.adrMaarifMAD), 'SandsOfWealth 2026 — fourchette 450-850 MAD'),
    row('ADR Studios T2', fmtMAD(md.airbnbData.adrStudioT2.median) + ' (médiane)', 'Chambre séparée 32-46 m² — Booking.com Maarif mars 2026'),
    row('ADR Lofts', fmtMAD(md.airbnbData.adrLoftKitchenette.median) + ' (médiane)', 'Kitchenette 22-28 m² — Booking.com Maarif mars 2026'),
    row('Occ. médiane Airbtics', fmtPct(md.airbnbData.occupancyMedianeCasa), 'Fév 2025 – jan 2026, 3649 annonces'),
    row('Occ. médiane AirROI', fmtPct(md.airbnbData.occupancyMedianeAirROI), 'Oct 2024 – sept 2025, plus conservateur'),
    row('Occ. top 25%', fmtPct(md.airbnbData.occupancyTop25), 'AirROI — top quartile Casa'),
    row('Occ. pro Maarif (AirBoo)', fmtPct(md.airbnbData.occupancyByQuartier.maarif.taux), 'Biens gérés pro, note 4.5+/5 — AirBoo 2025'),
    row('Croissance listings', fmtPct(md.airbnbData.croissanceListings) + '/an', '+50% YoY — forte pression concurrentielle'),
    row('Clientèle internationale', fmtPct(md.airbnbData.clienteleInternationale), '83% — France 29.5% en tête (AirROI)'),
    row('Durée séjour moyenne', md.airbnbData.dureeSejourMoyenne + ' nuits', 'AirROI Casa 2025'),
    row('Nb concurrents analysés', BENCHMARK.nbCompetitors, BENCHMARK.source + ' — ' + BENCHMARK.date),
  ].join('');

  // ── 6. SCÉNARIOS ──
  const el6 = document.getElementById('hyp-scenarios');
  if (el6) el6.innerHTML = Object.entries(SCENARIOS).map(([k, sc]) =>
    `<tr><td><strong>${sc.label}</strong><br><span style="font-size:.78rem;color:var(--text-sec)">${sc.source}</span></td>` +
    `<td class="num">${fmtPct(sc.tauxOccupation)}</td>` +
    `<td class="num">${fmtMAD(sc.prixNuitStudio)}</td>` +
    `<td class="num">${fmtMAD(sc.prixNuitLoft)}</td>` +
    `<td class="num">${fmtMAD(sc.loyerCommercial)}/m</td>` +
    `<td class="num">${fmtPct(sc.partOTA)}</td></tr>`
  ).join('');

  // ── 7. SAISONNALITÉ ──
  const contextes = [
    'Creux absolu — post-fêtes', 'Reprise lente', 'Reprise progressive — printemps',
    'Printemps', 'Pré-saison — ponts', 'Haute saison — début été',
    'Pic absolu — diaspora', 'Haute saison — vacances', 'Rentrée — business stable',
    'Automne', 'Ralentissement', 'Hiver (sauf fêtes)'
  ];
  const el7 = document.getElementById('hyp-saison');
  if (el7) el7.innerHTML = ra.saisonnalite.map((coeff, i) =>
    `<tr><td>${mois[i]}</td><td class="num">${coeff.toFixed(2)}</td>` +
    `<td class="num">${(0.48 * coeff * 100).toFixed(1)}%</td>` +
    `<td>${contextes[i]}</td></tr>`
  ).join('');

  // ── 8. MÉTHODOLOGIE ──
  const el8 = document.getElementById('hyp-methodo');
  if (el8) el8.innerHTML = `
    <p><strong>Flux de calcul :</strong> data.js (constantes) → engine.js (compute) → render.js (affichage) → charts.js (graphiques)</p>

    <p style="margin-top:12px"><strong>Mensualités de prêt (PMT) :</strong><br>
    <code>PMT = P × r × (1+r)^n / [(1+r)^n − 1]</code><br>
    Où P = principal, r = taux mensuel, n = nombre de mois. Le différé ne paie que les intérêts (P × r).</p>

    <p style="margin-top:12px"><strong>TRI (Taux de Rendement Interne) :</strong><br>
    Résolution par Newton-Raphson — 100 itérations, tolérance 1e-7. Le flux initial est −apportNet (fonds propres investis).
    Les flux annuels sont les cash-flows nets. Le flux terminal inclut la valeur résiduelle (appréciation composée sur 20 ans) − solde dette restant.</p>

    <p style="margin-top:12px"><strong>VAN (Valeur Actuelle Nette) :</strong><br>
    <code>VAN = Σ CF_t / (1 + tauxActualisation)^t</code><br>
    Taux d'actualisation : ${fmtPct(ra.tauxActualisation)} (configurable). Reflète le coût d'opportunité du capital.</p>

    <p style="margin-top:12px"><strong>DSCR (Debt Service Coverage Ratio) :</strong><br>
    <code>DSCR = Résultat net d'exploitation / Service de la dette annuel</code><br>
    DSCR > 1.2 = confortable, > 1.5 = excellent, < 1.0 = déficit.</p>

    <p style="margin-top:12px"><strong>Seuil de rentabilité (break-even) :</strong><br>
    Recherche dichotomique du taux d'occupation auquel le cash-flow net = 0. Utilise les charges An 1 (snapshot) sans saisonnalité pour simplifier.</p>

    <p style="margin-top:12px"><strong>Appréciation composée :</strong><br>
    <code>Valeur(t) = Investissement × (1 + tauxAppréciation)^t</code><br>
    L'appréciation annuelle = Valeur(t) − Valeur(t−1). Taux : ${fmtPct(ra.tauxAppreciation)}/an (BKAM/ANCFCC).</p>

    <p style="margin-top:12px"><strong>Amortissement fiscal :</strong><br>
    Construction HT / ${fi.amortissementAns} ans (${(100/fi.amortissementAns).toFixed(1)}%/an) + Mobilier HT / ${fi.amortissementMobilierAns} ans (${(100/fi.amortissementMobilierAns).toFixed(1)}%/an).
    Le mobilier s'arrête à l'année ${fi.amortissementMobilierAns + 1} (${fi.amortissementMobilierAns} ans d'amortissement complets). Le terrain n'est pas amortissable.</p>

    <p style="margin-top:12px"><strong>IS (Impôt sur les Sociétés) :</strong><br>
    Base imposable = Résultat d'exploitation − Amortissement − Intérêts d'emprunt.
    Part devises (${fmtPct(fi.caDevisesPct)}) exonérée pendant ${fi.exoDevisesAns} ans (Art. 6-I-B-3° CGI). Taux : ${fmtPct(fi.isTaux)}.</p>

    <p style="margin-top:12px"><strong>Wealth Building :</strong><br>
    = Equity accumulée (remboursement principal) + Appréciation immobilière composée + Cash-flows cumulés.
    Calcul avec et sans dette (scénario remboursement anticipé).</p>
  `;

  // ── 9. LIMITES ──
  const el9 = document.getElementById('hyp-limites');
  if (el9) el9.innerHTML = `
    <p><strong>Simplifications connues du modèle :</strong></p>
    <p style="margin-top:8px">• <strong>Break-even sans saisonnalité</strong> — Le seuil de rentabilité utilise un snapshot An 1 et ignore les coefficients mensuels. En réalité, le break-even est plus difficile à atteindre en basse saison.</p>
    <p style="margin-top:6px">• <strong>IS à taux unique</strong> — Le modèle applique ${fmtPct(fi.isTaux)} pour tous les niveaux de bénéfice. En réalité, le barème IS Maroc est progressif (10%/20%/31%), mais 20% est correct pour la tranche 300K-1M MAD où se situe ce projet.</p>
    <p style="margin-top:6px">• <strong>Pas de report de déficit fiscal</strong> — Les pertes fiscales des premières années ne sont pas reportées sur les exercices suivants. En pratique, le CGI permet un report de 4 ans.</p>
    <p style="margin-top:6px">• <strong>TVA simplifiée</strong> — Le modèle calcule TVA collectée − TVA déductible de manière agrégée. Un suivi mensuel réel serait plus précis (crédit TVA possible en début d'activité).</p>
    <p style="margin-top:6px">• <strong>Inflation uniforme</strong> — Toutes les charges fixes augmentent au même taux (${fmtPct(ra.inflationCharges)}/an). En réalité, certains postes (énergie, salaires) peuvent évoluer différemment.</p>
    <p style="margin-top:6px">• <strong>Pas de vacance locative commercial</strong> — Le loyer RDC est perçu 12/12 sans interruption. En réalité, un changement de locataire peut entraîner 2-3 mois de vacance.</p>
    <p style="margin-top:6px">• <strong>Pas de coût de refinancement</strong> — Si les taux augmentent significativement, le modèle ne capture pas l'impact sur un éventuel refinancement.</p>
    <p style="margin-top:6px">• <strong>Valeur résiduelle théorique</strong> — L'appréciation composée suppose un marché liquide. La vente effective d'un R+5 à Maarif peut prendre 6-18 mois avec décote.</p>
    <p style="margin-top:6px">• <strong>Informel non modélisé fiscalement</strong> — La part informelle (cash) réduit le CA déclaré et donc l'IS, mais ce risque fiscal n'est pas quantifié.</p>
  `;

  // ── 10. SOURCES ──
  const el10 = document.getElementById('hyp-sources');
  if (el10) el10.innerHTML = `
    <p><strong>Marché STR & Occupation :</strong><br>
    Airbtics Casa (fév 2025 – jan 2026) · AirROI Casablanca (oct 2024 – sept 2025) · SandsOfWealth 2026 · AirBoo Rentabilité 2025 · EasyHost · ListingOK Casablanca 2025 · AirDNA</p>

    <p style="margin-top:10px"><strong>Tarification & Concurrence :</strong><br>
    Booking.com Maarif (mars 2026, 17 propriétés) · StayHere · AS Premium By Soho · unocapital · Faya Nova</p>

    <p style="margin-top:10px"><strong>Tourisme national :</strong><br>
    ONMT (Office National Marocain du Tourisme) · Observatoire du Tourisme · Medias24 · Challenge.ma · H24info · Telquel</p>

    <p style="margin-top:10px"><strong>Financement MRE :</strong><br>
    Tamwilcom (MDM Invest + MDM Tamwil) · Ministère des Finances · CRI Tanger · Bladi.net · LesEco.ma · Le360 · La Vie Éco · L'Économiste · OnnVision · Le Matin</p>

    <p style="margin-top:10px"><strong>Fiscalité & Réglementation :</strong><br>
    CGI Maroc (Art. 6-I-B-3°, Art. 19-I-A, Art. 92-I-6°, Art. 99-2°) · Circulaire 717 DGI · PLF 2023/2026 · upsilon-consulting.com · Dahir n° 1-16-99 (baux commerciaux)</p>

    <p style="margin-top:10px"><strong>Charges & Salaires :</strong><br>
    CNSS 2025 (espace-paie.ma) · SMIG 2026 (Décret jan 2026, neoexpertise.net) · Lydec tarifs commerciaux · Inwi Pro 2025 · lec.ma · tmsonline.ma · Mews Hospitality 2025</p>

    <p style="margin-top:10px"><strong>Immobilier :</strong><br>
    BKAM/ANCFCC indice prix actifs immobiliers · Yakeey Maarif · Agenz Casablanca · Infomédiaire 2026</p>

    <p style="margin-top:10px"><strong>Mondial 2030 :</strong><br>
    Bird & Bird · Challenge.ma · Médias24 · PremiumTravelNews</p>

    <p style="margin-top:14px;font-style:italic;color:var(--text-sec)">Analyse réalisée les 27-30 mars 2026. Données vérifiées par recoupement multi-sources. Ne constitue pas un conseil en investissement.</p>
  `;
}

// ============================================================
// STRESS TESTS — Cliff calendar, rate sensitivity, cash reserve
// ============================================================
function renderStressTests(S) {
  const st = S.stressTests;
  if (!st) return;

  // --- 1. Cliff Timeline visual ---
  const timeline = document.getElementById("stress-cliff-timeline");
  if (timeline && st.cliffs.length > 0) {
    // Visual timeline bar
    const maxYear = 20;
    let html = '<div style="position:relative;height:60px;background:linear-gradient(90deg,var(--green-light) 0%,var(--surface) 100%);border-radius:8px;overflow:visible;margin:8px 0">';
    st.cliffs.forEach(c => {
      const left = ((c.year - 1) / maxYear * 100).toFixed(1);
      const clr = c.severity === "high" ? "var(--danger)" : c.severity === "medium" ? "var(--warning)" : "var(--amber)";
      html += `<div style="position:absolute;left:${left}%;top:0;bottom:0;width:3px;background:${clr};border-radius:2px" title="An ${c.year}: ${c.label}"></div>`;
      html += `<div style="position:absolute;left:${left}%;top:-4px;transform:translateX(-50%);font-size:.7rem;font-weight:700;color:${clr}">An ${c.year}</div>`;
      html += `<div style="position:absolute;left:${left}%;bottom:-18px;transform:translateX(-50%);font-size:.65rem;color:var(--muted);white-space:nowrap">${c.label}</div>`;
    });
    html += '</div>';
    timeline.innerHTML = html;
    timeline.style.paddingTop = "12px";
    timeline.style.paddingBottom = "24px";
  } else if (timeline) {
    timeline.innerHTML = '<div class="info-box">Aucun cliff majeur détecté.</div>';
  }

  // --- Cliff table ---
  const cliffTb = document.getElementById("stress-cliff-tbody");
  if (cliffTb) {
    if (st.cliffs.length === 0) {
      cliffTb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Aucun cliff détecté</td></tr>';
    } else {
      cliffTb.innerHTML = st.cliffs.map(c => {
        const sevBadge = c.severity === "high" ? '<span class="badge badge-red">Élevé</span>'
          : c.severity === "medium" ? '<span class="badge badge-amber">Moyen</span>'
          : '<span class="badge badge-green">Faible</span>';
        const typeBadge = c.type === "debt" ? "🏦 Dette"
          : c.type === "fiscal" ? "📋 Fiscal"
          : "📉 Amort.";
        return `<tr>
          <td class="num" style="font-weight:700;font-size:1.1rem">An ${c.year}</td>
          <td>${typeBadge}</td>
          <td>${sevBadge}</td>
          <td style="font-weight:500">${c.label}</td>
          <td style="font-size:.85rem">${c.detail}</td>
        </tr>`;
      }).join("");
    }
  }

  // --- 2. Rate sensitivity table ---
  const rateTb = document.getElementById("stress-rate-tbody");
  if (rateTb && st.rateSensitivity) {
    rateTb.innerHTML = st.rateSensitivity.map(r => {
      const isCurrent = r.isCurrent;
      const dscrStr = isFinite(r.dscr) ? r.dscr.toFixed(2) + "×" : "∞";
      const status = r.dscr >= 1.5 ? "✅ Excellent" : r.dscr >= 1.2 ? "✅ Conforme" : r.dscr >= 1.0 ? "⚠️ Fragile" : "❌ Insuffisant";
      const clr = r.dscr >= 1.2 ? "var(--green)" : r.dscr >= 1.0 ? "var(--warning)" : "var(--danger)";
      const rowClass = isCurrent ? ' class="highlight-row"' : '';
      return `<tr${rowClass}>
        <td class="num" style="font-weight:${isCurrent ? '700' : '400'}">${(r.rate * 100).toFixed(2)}%${isCurrent ? ' <span class="badge badge-blue">Actuel</span>' : ''}</td>
        <td class="num">${fmtMAD(r.mensualiteBQ)}</td>
        <td class="num">${fmtMAD(r.debtServiceTotal)}</td>
        <td class="num">${fmtMAD(r.ebitda)}</td>
        <td class="num" style="color:${r.cashFlowNet >= 0 ? 'var(--green)' : 'var(--danger)'}; font-weight:600">${fmtMAD(r.cashFlowNet)}</td>
        <td class="num" style="color:${clr};font-weight:600">${dscrStr}</td>
        <td style="font-size:.82rem">${status}</td>
      </tr>`;
    }).join("");
  }

  // Rate warning
  const rateWarn = document.getElementById("stress-rate-warning");
  if (rateWarn) {
    if (st.criticalRate) {
      rateWarn.className = "warn-box";
      rateWarn.style.borderLeftColor = "var(--danger)";
      rateWarn.innerHTML = `<strong>⚠️ Seuil critique : ${(st.criticalRate * 100).toFixed(2)}%</strong> — Au-delà de ce taux BQ, le DSCR passe sous 1.0× et le projet ne couvre plus son service de dette en An 1. Le taux actuel (${(st.currentRate * 100).toFixed(2)}%) offre une marge de ${((st.criticalRate - st.currentRate) * 100).toFixed(2)} points de base.`;
    } else {
      rateWarn.className = "info-box";
      rateWarn.style.borderLeftColor = "var(--green)";
      rateWarn.innerHTML = '<strong>✅ Robuste</strong> — Le DSCR reste au-dessus de 1.0× même à 8% de taux BQ. Le projet est résilient face à une hausse des taux.';
    }
  }

  // --- 3. Cash reserve ---
  const reserveDetail = document.getElementById("stress-reserve-detail");
  if (reserveDetail && st.cashReserve) {
    const cr = st.cashReserve;
    const cfColor = cr.pessY1CF >= 0 ? "var(--green)" : "var(--danger)";
    reserveDetail.innerHTML = `
      CF Net An 1 pessimiste : <strong style="color:${cfColor}">${fmtMAD(cr.pessY1CF)}</strong><br>
      Soit <strong style="color:${cfColor}">${fmtMAD(cr.pessY1CFMensuel)} /mois</strong><br>
      Pire année (scénario actuel) : An ${cr.worstCFYear.year} → <strong style="color:${cr.worstCFYear.cf >= 0 ? 'var(--green)' : 'var(--danger)'}">${fmtMAD(cr.worstCFYear.cf)}</strong>
    `;
  }

  const recoDetail = document.getElementById("stress-reserve-reco-detail");
  if (recoDetail && st.cashReserve) {
    const cr = st.cashReserve;
    if (cr.reserveRecommandee > 0) {
      recoDetail.innerHTML = `
        <span style="font-size:1.3rem;font-weight:700;color:var(--danger)">${fmtMAD(cr.reserveRecommandee)}</span><br>
        <span style="font-size:.85rem">Prévoir une réserve de trésorerie de <strong>${fmtMAD(cr.reserveRecommandee)}</strong> pour couvrir les mois déficitaires du scénario pessimiste + marge de sécurité 50%.</span><br>
        <span style="font-size:.8rem;color:var(--muted)">Cette réserve couvre ~${Math.ceil(cr.reserveRecommandee / Math.abs(cr.pessY1CFMensuel))} mois de déficit pessimiste.</span>
      `;
    } else {
      recoDetail.innerHTML = '<span style="color:var(--green);font-weight:600">Aucune réserve nécessaire</span> — Même le scénario pessimiste génère un cash-flow positif dès An 1.';
    }
  }
}

// ============================================================
// DOSSIER BANQUE — Synthèse complète pour financement
// ============================================================
function renderDossierBanque(S) {
  const K = S.kpi;
  const B = S.budget;
  const F = S.financement;
  const p = S.projections;
  if (!K || !p || !p.length) return;

  const y1 = p[0];
  const totalProjet = B.totalProjet;
  const apportNet = F.apportNet;
  const montantTK = F.montantTamwilkom;
  const montantBQ = F.montantBanque;
  const montantTotal = montantTK + montantBQ;
  const subvMDM = F.subventionMDM || 0;

  // --- 1. Résumé Exécutif ---
  const resumeTb = document.getElementById("db-resume-tbody");
  if (resumeTb) resumeTb.innerHTML = [
    ["Nature du projet", "Construction et exploitation d'un appart-hôtel meublé de tourisme"],
    ["Localisation", "Quartier Maarif, Casablanca — zone touristique et d'affaires"],
    ["Surface terrain", TERRAIN.surface + " m²"],
    ["Surface construite", BUDGET.surfacePlancher + " m² (R+4)"],
    ["Nombre d'unités", S.units.nbStudios + " studios + " + S.units.nbLofts + " lofts + 1 local commercial"],
    ["Surface locative", Math.round(S.units.surfaceLocative) + " m²"],
    ["Investissement total TTC", fmtMAD(totalProjet)],
    ["Financement demandé", fmtMAD(montantTotal) + " (" + fmtPct(montantTotal / totalProjet) + " du coût total)"],
    ["Apport personnel", fmtMAD(apportNet) + " (terrain + fonds propres)"],
    ["Revenus prévisionnels An 1", fmtMAD(y1.revTotal)],
    ["EBITDA prévisionnel An 1", fmtMAD(y1.ebitda) + " (marge " + fmtPct(y1.margeExploitation) + ")"],
    ["DSCR An 1", K.dscr.toFixed(2) + "× (min. bancaire : 1.20×)"],
    ["TRI sur 20 ans", fmtPct(K.tri)],
  ].map(r => `<tr><td style="font-weight:500;width:40%">${r[0]}</td><td>${r[1]}</td></tr>`).join("");

  // --- 2. Porteur de Projet ---
  const porteurTb = document.getElementById("db-porteur-tbody");
  if (porteurTb) porteurTb.innerHTML = [
    ["Statut juridique", "SCI / SARL (à constituer) ou nom propre"],
    ["Résidence fiscale", "Émirats Arabes Unis (UAE)"],
    ["Statut MRE", "Marocain Résidant à l'Étranger — éligible MDM Invest"],
    ["Apport", "Terrain (valeur " + fmtMAD(TERRAIN.prix) + ") + fonds propres"],
    ["Revenus", "Salaire professionnel UAE (justificatifs joints)"],
    ["Expérience investissement", "À documenter (projets précédents, portefeuille immobilier)"],
  ].map(r => `<tr><td style="font-weight:500;width:40%">${r[0]}</td><td>${r[1]}</td></tr>`).join("");

  // --- 3. Plan de Financement KPIs ---
  setText("db-cout-total", fmtMAD(totalProjet));
  setText("db-apport", fmtMAD(apportNet));
  setText("db-apport-pct", fmtPct(apportNet / totalProjet) + " du total");
  setText("db-financement", fmtMAD(montantTotal));
  setText("db-financement-pct", fmtPct(montantTotal / totalProjet) + " du total");
  setText("db-mdm", fmtMAD(subvMDM));

  const planTb = document.getElementById("db-plan-financement-tbody");
  if (planTb) {
    const apportTerrain = F.apportTerrain;
    const rows = [
      ["Apport personnel (terrain + frais)", fmtMAD(apportTerrain), fmtPct(apportTerrain / totalProjet), "Terrain acquis (" + fmtMAD(TERRAIN.prix) + ") + frais acquisition"],
      ["(-) Subvention MDM Invest", '<span style="color:var(--green)">-' + fmtMAD(subvMDM) + '</span>', fmtPct(subvMDM / totalProjet), "10% du coût, plafond 5M MAD — Tamwilcom"],
      ["<strong>= Apport net investisseur</strong>", "<strong>" + fmtMAD(apportNet) + "</strong>", "<strong>" + fmtPct(apportNet / totalProjet) + "</strong>", "Mise de fonds réelle du porteur"],
      ["Tamwilkom (MDM Invest)", fmtMAD(montantTK), fmtPct(montantTK / totalProjet), (TAMWILKOM.tauxAnnuel * 100).toFixed(2) + "% sur " + TAMWILKOM.dureeAns + " ans, différé " + TAMWILKOM.differeAns + " ans"],
      ["Banque classique", fmtMAD(montantBQ), fmtPct(montantBQ / totalProjet), (BANQUE_CLASSIQUE.tauxAnnuel * 100).toFixed(2) + "% sur " + BANQUE_CLASSIQUE.dureeAns + " ans, différé " + BANQUE_CLASSIQUE.differeAns + " an"],
    ];
    rows.push(['<strong>TOTAL PROJET</strong>', '<strong>' + fmtMAD(totalProjet) + '</strong>', '<strong>100%</strong>', '']);
    planTb.innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td style="font-size:.8rem">${r[3]}</td></tr>`).join("");
  }

  // --- 4. Structure de la Dette ---
  const tkTb = document.getElementById("db-tamwilkom-tbody");
  if (tkTb) tkTb.innerHTML = [
    ["Montant", fmtMAD(montantTK)],
    ["Taux annuel", (TAMWILKOM.tauxAnnuel * 100).toFixed(2) + "%"],
    ["Durée", TAMWILKOM.dureeAns + " ans"],
    ["Différé", TAMWILKOM.differeAns + " ans (intérêts seuls)"],
    ["Mensualité différé", fmtMAD(F.mensualiteDiffereTK || montantTK * TAMWILKOM.tauxAnnuel / 12)],
    ["Mensualité amortissement", fmtMAD(F.mensualiteTK)],
    ["Garantie", "Garantie Tamwilcom + hypothèque"],
  ].map(r => `<tr><td style="font-weight:500">${r[0]}</td><td class="num">${r[1]}</td></tr>`).join("");

  const bqTb = document.getElementById("db-banque-tbody");
  if (bqTb) bqTb.innerHTML = [
    ["Montant", fmtMAD(montantBQ)],
    ["Taux annuel", (BANQUE_CLASSIQUE.tauxAnnuel * 100).toFixed(2) + "%"],
    ["Durée", BANQUE_CLASSIQUE.dureeAns + " ans"],
    ["Différé", BANQUE_CLASSIQUE.differeAns + " an (intérêts seuls)"],
    ["Mensualité différé", fmtMAD(F.mensualiteDiffereBQ || montantBQ * BANQUE_CLASSIQUE.tauxAnnuel / 12)],
    ["Mensualité amortissement", fmtMAD(F.mensualiteBQ)],
    ["Garantie", "Hypothèque 1er rang sur le bien"],
  ].map(r => `<tr><td style="font-weight:500">${r[0]}</td><td class="num">${r[1]}</td></tr>`).join("");

  // --- 5. Capacité de Remboursement ---
  const dscrVal = K.dscr;
  setText("db-dscr", dscrVal.toFixed(2) + "×");
  const dscrEl = document.getElementById("db-dscr");
  if (dscrEl) dscrEl.style.color = dscrVal >= 1.2 ? "var(--green)" : dscrVal >= 1.0 ? "var(--warning)" : "var(--danger)";
  setText("db-debt-service", fmtMAD(y1.debtServiceTotal));
  setText("db-debt-service-mensuel", fmtMAD(y1.debtServiceTotal / 12) + " /mois");
  setText("db-cf-an1", fmtMAD(y1.cashFlowNet));
  const cfEl = document.getElementById("db-cf-an1");
  if (cfEl) cfEl.style.color = y1.cashFlowNet >= 0 ? "var(--green)" : "var(--danger)";
  setText("db-cf-an1-mensuel", fmtMAD(y1.cashFlowNet / 12) + " /mois");
  setText("db-break-even", fmtPct(K.breakEvenOcc));

  // --- Ratios bancaires ---
  const ltv = montantTotal / totalProjet;
  setText("db-ltv", fmtPct(ltv));
  const ltvEl = document.getElementById("db-ltv");
  if (ltvEl) ltvEl.style.color = ltv <= 0.70 ? "var(--green)" : ltv <= 0.80 ? "var(--warning)" : "var(--danger)";

  setText("db-quotite", fmtPct(montantTotal / totalProjet));
  const tauxEffort = y1.revTotal > 0 ? y1.debtServiceTotal / y1.revTotal : 0;
  setText("db-taux-effort", fmtPct(tauxEffort));
  const teEl = document.getElementById("db-taux-effort");
  if (teEl) teEl.style.color = tauxEffort <= 0.35 ? "var(--green)" : tauxEffort <= 0.50 ? "var(--warning)" : "var(--danger)";

  const interetsY1 = (y1.interetsTK || F.interetsDiffereTK || 0) + (y1.interetsBQ || F.interetsDiffereBQ || 0);
  const icr = interetsY1 > 0 ? y1.ebitda / interetsY1 : Infinity;
  setText("db-icr", isFinite(icr) ? icr.toFixed(2) + "×" : "∞");
  const icrEl = document.getElementById("db-icr");
  if (icrEl) icrEl.style.color = icr >= 2.0 ? "var(--green)" : icr >= 1.5 ? "var(--warning)" : "var(--danger)";

  const dscrComm = document.getElementById("db-dscr-commentary");
  if (dscrComm) {
    const dscrStatus = dscrVal >= 1.5 ? "excellent" : dscrVal >= 1.2 ? "conforme" : dscrVal >= 1.0 ? "fragile" : "insuffisant";
    dscrComm.innerHTML = `<strong>DSCR ${dscrVal.toFixed(2)}× — Statut : ${dscrStatus}</strong>. ` +
      `Le projet génère un EBITDA de ${fmtMAD(y1.ebitda)} pour un service de dette de ${fmtMAD(y1.debtServiceTotal)}, ` +
      `soit une marge de sécurité de ${fmtPct((dscrVal - 1))} au-dessus du seuil de couverture. ` +
      `Le seuil d'occupation pour atteindre l'équilibre est de ${fmtPct(K.breakEvenOcc)}, ` +
      `bien en dessous du taux modélisé (${fmtPct(S.projections[0].occMoyEffective)}).`;
  }

  // --- 6. Compte d'Exploitation Prévisionnel (5 ans) ---
  const exploitTb = document.getElementById("db-exploitation-tbody");
  if (exploitTb) {
    const years5 = p.slice(0, 5);
    const rows = [
      { label: "Revenus bruts hébergement", key: "revBrutHotel", bold: false },
      { label: "(-) Commissions OTA", key: "commissions", neg: true },
      { label: "Revenus nets hébergement", key: "revNetHotel", bold: true },
      { label: "(+) Loyer commercial", key: "revCommercial" },
      { label: "= Revenus totaux", key: "revTotal", bold: true },
      { label: "(-) Charges d'exploitation", key: "chargesTotal", neg: true },
      { label: "= EBITDA", key: "ebitda", bold: true, green: true },
      { label: "(-) Service dette", key: "debtServiceTotal", neg: true },
      { label: "(-) IS", key: "is", neg: true },
      { label: "= Cash-Flow Net", key: "cashFlowNet", bold: true, green: true },
      { label: "Marge exploitation", key: "margeExploitation", pct: true },
    ];
    exploitTb.innerHTML = rows.map(r => {
      const tds = years5.map(yr => {
        let v = yr[r.key];
        if (r.pct) return `<td class="num">${fmtPct(v)}</td>`;
        const style = r.green && v > 0 ? 'color:var(--green)' : r.neg ? 'color:var(--danger)' : '';
        return `<td class="num" style="${style};${r.bold ? 'font-weight:600' : ''}">${r.neg ? '-' : ''}${fmtMAD(Math.abs(v))}</td>`;
      }).join("");
      return `<tr><td style="${r.bold ? 'font-weight:600' : ''}">${r.label}</td>${tds}</tr>`;
    }).join("");
  }

  // --- 7. Projection 20 ans ---
  const projTb = document.getElementById("db-projection-tbody");
  if (projTb) {
    projTb.innerHTML = p.map((yr, i) => {
      const clr = yr.cashFlowNet >= 0 ? 'var(--green)' : 'var(--danger)';
      return `<tr>
        <td class="num">${yr.year}</td>
        <td class="num">${fmtMAD(yr.revTotal)}</td>
        <td class="num" style="color:var(--danger)">${fmtMAD(yr.chargesTotal)}</td>
        <td class="num">${fmtMAD(yr.ebitda)}</td>
        <td class="num">${fmtMAD(yr.debtServiceTotal)}</td>
        <td class="num">${yr.is > 0 ? fmtMAD(yr.is) : '–'}</td>
        <td class="num" style="color:${clr};font-weight:600">${fmtMAD(yr.cashFlowNet)}</td>
        <td class="num" style="color:${yr.cumulCashFlow >= 0 ? 'var(--green)' : 'var(--danger)'};font-weight:600">${fmtMAD(yr.cumulCashFlow)}</td>
      </tr>`;
    }).join("");
  }

  // --- 8. Garanties ---
  const garTb = document.getElementById("db-garanties-tbody");
  if (garTb) {
    const valeurBien = totalProjet;
    garTb.innerHTML = [
      ["Hypothèque 1er rang", "Bien immobilier construit", fmtMAD(valeurBien), "Immeuble R+4 — Maarif, Casablanca"],
      ["Nantissement fonds de commerce", "Fonds de commerce hôtelier", "–", "Si exploitation en nom propre ou SCI"],
      ["Garantie Tamwilcom", "Garantie institutionnelle", fmtMAD(montantTK * 0.70), "Couvre ~70% du prêt Tamwilkom"],
      ["Domiciliation revenus", "Compte professionnel", "–", "Revenus locatifs domiciliés à la banque prêteuse"],
      ["Assurance décès/invalidité", "Assurance emprunteur", fmtMAD(montantTotal), "Couvre la totalité du crédit"],
      ["Caution personnelle", "Engagement personnel", "–", "Caution solidaire du porteur de projet"],
      ["Billet à ordre", "Titre exécutoire", fmtMAD(montantTotal), "Garantie complémentaire — exécution directe"],
      ["Engagement de non-cession", "Clause contractuelle", "–", "Bien non cessible pendant la durée du prêt"],
    ].map(r => `<tr><td style="font-weight:500">${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td style="font-size:.8rem">${r[3]}</td></tr>`).join("");
  }

  // --- 9. Analyse de Risques ---
  const risqTb = document.getElementById("db-risques-tbody");
  if (risqTb) risqTb.innerHTML = [
    ["Sous-occupation", "Élevé", "Modérée", "Seuil break-even bas (" + fmtPct(K.breakEvenOcc) + "), pricing dynamique, diversification canaux"],
    ["Retard construction", "Moyen", "Modérée", "Suivi AMOA, pénalités contractuelles, marge planning"],
    ["Hausse taux d'intérêt", "Moyen", "Faible", "Taux fixe Tamwilkom, capacité de renégociation BQ"],
    ["Concurrence Airbnb", "Moyen", "Élevée", "Positionnement premium, qualité service, avis clients"],
    ["Réglementation STR", "Faible", "Faible", "Cadre légal 80-14, conformité urbanisme assurée"],
    ["Change MAD/AED", "Faible", "Modérée", "Revenus en MAD, pas d'exposition directe"],
    ["Vacance prolongée", "Élevé", "Faible", "Diversification long/court séjour, clientèle corporate"],
  ].map(r => {
    const impClr = r[1] === "Élevé" ? "var(--danger)" : r[1] === "Moyen" ? "var(--warning)" : "var(--green)";
    const probClr = r[2] === "Élevée" ? "var(--danger)" : r[2] === "Modérée" ? "var(--warning)" : "var(--green)";
    return `<tr><td style="font-weight:500">${r[0]}</td><td style="color:${impClr};font-weight:600">${r[1]}</td><td style="color:${probClr}">${r[2]}</td><td style="font-size:.82rem">${r[3]}</td></tr>`;
  }).join("");

  // --- 10. Sensibilité ---
  const sensTb = document.getElementById("db-sensibilite-tbody");
  if (sensTb && S.sensitivity) {
    sensTb.innerHTML = S.sensitivity.map(s => {
      const dscr = s.ebitda && y1.debtServiceTotal > 0 ? s.ebitda / y1.debtServiceTotal : 0;
      const dscrStr = dscr.toFixed(2) + "×";
      const status = dscr >= 1.5 ? "✅ Excellent" : dscr >= 1.2 ? "✅ Conforme" : dscr >= 1.0 ? "⚠️ Fragile" : "❌ Insuffisant";
      const clr = dscr >= 1.2 ? "var(--green)" : dscr >= 1.0 ? "var(--warning)" : "var(--danger)";
      return `<tr>
        <td class="num" style="font-weight:600">${fmtPct(s.occ)}</td>
        <td class="num">${fmtMAD(s.revenu)}</td>
        <td class="num">${fmtMAD(s.ebitda)}</td>
        <td class="num" style="color:${s.cashFlow >= 0 ? 'var(--green)' : 'var(--danger)'}">${fmtMAD(s.cashFlow)}</td>
        <td class="num" style="color:${clr};font-weight:600">${dscrStr}</td>
        <td style="font-size:.82rem">${status}</td>
      </tr>`;
    }).join("");
  }

  // --- 11. Fiscalité ---
  const fiscTb = document.getElementById("db-fiscalite-tbody");
  if (fiscTb) {
    const ecoDevises = K.isCumule ? K.isCumule * FISCALITE.caDevisesPct : 0;
    fiscTb.innerHTML = [
      ["Exonération IS devises (40% CA)", "5 ans", fmtMAD(ecoDevises), "Art. 6-I-B-3° CGI"],
      ["Exonération taxe professionnelle", "5 ans", fmtMAD(CHARGES.taxesPro * 5), "Art. 6-I-A CGI — nouvelle construction"],
      ["Exonération taxe d'habitation", "5 ans", fmtMAD((CHARGES.taxeHabitation || 0) * 5), "Nouvelle construction"],
      ["Récupération TVA construction", "Immédiat", fmtMAD(S.tva ? S.tva.tvaTotaleRecuperable : 0), "TVA 20% sur construction + mobilier"],
      ["Amortissement bâtiment", "20 ans", fmtMAD(S.amortissement ? S.amortissement.dotationAnnuelleConstruction * 20 : 0), "5% linéaire — bouclier fiscal IS"],
      ["Amortissement mobilier", "7 ans", fmtMAD(S.amortissement ? S.amortissement.dotationAnnuelleMobilier * 7 : 0), "14.3% linéaire"],
      ["Cotisation minimale exonérée", "3 ans", fmtMAD(3000 * 3), "Art. 144 CGI — création d'entreprise"],
    ].map(r => `<tr><td style="font-weight:500">${r[0]}</td><td class="num">${r[1]}</td><td class="num" style="color:var(--green)">${r[2]}</td><td style="font-size:.8rem">${r[3]}</td></tr>`).join("");
  }

  // --- 12. KPIs ---
  setText("db-tri", fmtPct(K.tri));
  setText("db-van", fmtMAD(K.van));
  setText("db-payback", K.paybackYear ? "An " + K.paybackYear : "> 20 ans");
  setText("db-multiple", K.multipleApport ? K.multipleApport.toFixed(1) + "×" : "–");
  setText("db-rdt-brut", fmtPct(K.rendementBrut));
  setText("db-rdt-net", fmtPct(K.rendementNet));
  setText("db-wealth", fmtMAD(K.wealthTotal));

  // --- 13. Calendrier ---
  const calTb = document.getElementById("db-calendrier-tbody");
  if (calTb) calTb.innerHTML = [
    ["Acquisition terrain", "Fait", "–", "Terrain acquis, acte notarié établi"],
    ["Montage dossier bancaire", PLANNING.delaiAutorisationsPret + " mois", "M0 → M" + PLANNING.delaiAutorisationsPret, "Permis de construire + financement"],
    ["Construction", PLANNING.delaiConstruction + " mois", "M" + PLANNING.delaiAutorisationsPret + " → M" + (PLANNING.delaiAutorisationsPret + PLANNING.delaiConstruction), "Gros œuvre + second œuvre + finitions"],
    ["Ameublement & équipement", "2 mois", "M" + (PLANNING.delaiAutorisationsPret + PLANNING.delaiConstruction - 2) + " → M" + (PLANNING.delaiAutorisationsPret + PLANNING.delaiConstruction), "En parallèle des finitions"],
    ["Lancement commercial", "1 mois", "M" + (PLANNING.delaiAutorisationsPret + PLANNING.delaiConstruction), "Listing OTAs, photos pro, marketing lancement"],
    ["1ère exploitation", "–", "M" + (PLANNING.delaiAutorisationsPret + PLANNING.delaiConstruction + 1), "Début ramp-up (montée en occupation progressive)"],
  ].map(r => `<tr><td style="font-weight:500">${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td style="font-size:.82rem">${r[3]}</td></tr>`).join("");

  // --- Checklist ---
  const checkEl = document.getElementById("db-checklist");
  if (checkEl) checkEl.innerHTML = [
    "Documents identité & résidence",
    ["CIN nationale", "Passeport valide", "Attestation de résidence UAE (consulat)", "Attestation consulaire d'immatriculation"],
    "Documents financiers & solvabilité",
    ["Relevés bancaires UAE (6 derniers mois)", "Attestation de revenus / contrat de travail UAE", "Attestation d'apport personnel (origine des fonds)", "Attestation de solvabilité bancaire (banque UAE)", "Avis d'imposition UAE (si applicable)", "Bilan patrimonial du porteur de projet"],
    "Documents projet",
    ["Titre foncier du terrain (certificat de propriété)", "Permis de construire approuvé (ou récépissé de dépôt)", "Plans architecturaux approuvés (Nour Architects)", "Devis détaillé construction signé (entreprise BTP)", "Business plan financier (ce document)", "Étude de marché STR Casablanca", "Rapport d'expertise immobilière (estimation terrain + projet)"],
    "Documents juridiques",
    ["Statuts de la société (si SCI/SARL)", "Casier judiciaire vierge (< 3 mois)", "Certificat de non-faillite", "Billet à ordre (garantie complémentaire)", "Engagement de non-cession du bien pendant la durée du prêt"],
    "Assurances",
    ["Devis assurance emprunteur (décès/invalidité)", "Devis assurance multirisques immeuble", "Devis assurance responsabilité civile professionnelle"],
    "Documents MDM Invest (Tamwilkom)",
    ["Formulaire MDM Invest complété", "Attestation de compte en devises (banque marocaine ou UAE)", "Engagement de rapatriement de fonds", "Lettre de pré-accord Tamwilcom (si disponible)", "Justificatif de résidence à l'étranger (> 6 mois)"],
  ].map(item => {
    if (typeof item === "string") return `<div style="font-weight:700;margin-top:12px;margin-bottom:4px;color:var(--primary)">${item}</div>`;
    return item.map(i => `<div style="padding:2px 0 2px 16px">☐ ${i}</div>`).join("");
  }).join("");
}

// --- Utility ---
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
