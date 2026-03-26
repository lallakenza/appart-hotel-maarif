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
  renderBudget(state);
  renderProgramme(state);
  renderRevenus(state);
  renderCharges(state);
  renderFinancement(state);
  renderCashFlow(state);
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
  setKPI("kpi-payback", S.kpi.paybackYear ? S.kpi.paybackYear + " ans" : "> 10 ans", paybackColor);
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

// --- Budget ---
function renderBudget(S) {
  setText("budget-terrain-prix", fmtMAD(TERRAIN.prix));
  setText("budget-terrain-frais", fmtMAD(S.terrain.fraisTerrain));
  setText("budget-terrain-total", fmtMAD(S.terrain.coutTerrain));
  setText("budget-construction", fmtMAD(S.terrain.budgetConstruction));
  setText("budget-ameublement", fmtMAD(S.budget.ameublement));
  setText("budget-total", fmtMAD(BUDGET.totalTTC));
  setText("budget-m2", fmtNum(S.terrain.coutM2Terrain) + " MAD/m²");
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
}

// --- Cash-Flow ---
function renderCashFlow(S) {
  const y1 = S.projections[0];
  setText("cf-net-an1",     fmtMAD(y1.cashFlowNet));
  setText("cf-rdt-projet",  fmtPct(S.kpi.rendementNet));
  setText("cf-rdt-apport",  fmtPct(S.kpi.rendementNetApport));
  setText("cf-payback",     S.kpi.paybackYear ? S.kpi.paybackYear + " ans" : "> 10 ans");

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
    const gammeClass = c.gamme === "Haut" ? "badge-green" : c.gamme === "Milieu" ? "badge-blue" : "badge-amber";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${c.nom}</td><td>${c.type}</td><td>${c.prix}</td><td><span class="badge ${gammeClass}">${c.gamme}</span></td>`;
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
  setText("fisc-tva-recup",      recup ? recup + " ans" : "> 10 ans");
  setText("fisc-tva-recup-sub",  recup ? "Puis TVA à payer normalement" : "Crédit non épuisé sur 10 ans");

  // Info box details
  setText("fisc-constr-ht",  fmtMAD(S.tva.constructionHT));
  setText("fisc-tva-constr", fmtMAD(S.tva.tvaConstruction));
  const badgeRecup = document.getElementById("fisc-badge-recup");
  if (badgeRecup) badgeRecup.textContent = recup ? recup + " premières années" : "> 10 ans";

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
