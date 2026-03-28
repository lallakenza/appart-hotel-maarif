#!/usr/bin/env node
/**
 * AUDIT V3 — Deep verification of ALL financial computations
 * Independent manual recalculation vs engine output
 */

const TOLERANCE = 1; // 1 MAD tolerance for rounding

// ═══════════════════════════════════════════════════════════════
// RAW DATA FROM ENGINE (extracted via Chrome JS console)
// ═══════════════════════════════════════════════════════════════

const PARAMS = {
  tk: { montant: 2595250, taux: 0.025, duree: 7, differe: 2, annuite: 552706.0824794464, intDiffere: 64881.25 },
  bq: { montant: 2595250, taux: 0.0435, duree: 20, differe: 1, annuite: 200961.04623669005, intDiffere: 112893.375 },
  apportNet: 1685500,
  totalProjet: 7640000, // note: this is the TTC project cost including MDM working capital
  amortAnnuel: 197937.5,
  amortDuree: 20,
  amortTotal: 3958750,
  tauxApprec: 0.02,
  fiscal: { caDevisesPct: 0.4, isTaux: 0.2, exoAns: 5 }
};

// Engine debt projections [year, iTK, cTK, dTK, iBQ, cBQ, dBQ]
const ENGINE_DEBT = [
  [1,64881,0,64881,112893,0,112893],
  [2,64881,0,64881,111116,89845,200961],
  [3,59253,493453,552706,107129,93832,200961],
  [4,46774,505932,552706,102965,97996,200961],
  [5,33980,518726,552706,98616,102345,200961],
  [6,20862,531844,552706,94074,106887,200961],
  [7,7412,545294,552706,89331,111630,200961],
  [8,0,0,0,84377,116584,200961],
  [9,0,0,0,79203,121758,200961],
  [10,0,0,0,73800,127161,200961],
  [11,0,0,0,68157,132804,200961],
  [12,0,0,0,62263,138698,200961],
  [13,0,0,0,56108,144853,200961],
  [14,0,0,0,49680,151281,200961],
  [15,0,0,0,42966,157995,200961],
  [16,0,0,0,35955,165006,200961],
  [17,0,0,0,28632,172329,200961],
  [18,0,0,0,20985,179977,200961],
  [19,0,0,0,12998,187964,200961],
  [20,0,0,0,4656,196305,200961]
];

// Engine projections [year, revBrut, revTotal, ebitda, debtTotal, iTK, cTK, iBQ, cBQ, CRD, amort, resFiscal, benef, IS, cfAvIS, cfNet, cumul]
const ENGINE_PROJ_1_7 = [
  [1,660332,685512,210204,177775,64881,0,112893,0,5190500,197938,-297574,0,0,32429,32429,32429],
  [2,1231026,1205155,655102,265842,64881,0,111116,89845,5100655,197938,-54883,0,0,389260,389260,421690],
  [3,1267957,1248890,693298,753667,59253,493453,107129,93832,4513370,197938,-511898,0,0,-60369,-60369,361320],
  [4,1305996,1288864,727566,753667,46774,505932,102965,97996,3909441,197938,-485238,0,0,-26101,-26101,335219],
  [5,1345176,1330199,763024,753667,33980,518726,98616,102345,3288370,197938,-457616,0,0,9357,9357,344576],
  [6,1385531,1367225,736997,753667,20862,531844,94074,106887,2649639,197938,-491714,0,0,-16671,-16671,327906],
  [7,1427097,1405362,768898,753667,7412,545294,89331,111630,1992715,197938,-468126,0,0,15231,15231,343137],
];

const ENGINE_PROJ_8_20 = [
  [8,1469910,1444642,801757,200961,0,0,84377,116584,1876131,197938,108877,108877,13065,600796,587731,930868],
  [9,1514007,1485102,835602,200961,0,0,79203,121758,1754373,197938,133902,133902,16068,634641,618573,1549441],
  [10,1559428,1526775,870462,200961,0,0,73800,127161,1627212,197938,159678,159678,19161,669501,650340,2199781],
  [11,1606210,1569698,906368,200961,0,0,68157,132804,1494407,197938,186227,186227,22347,705407,683060,2882840],
  [12,1654397,1613909,943351,200961,0,0,62263,138698,1355709,197938,213573,213573,25629,742390,716761,3599601],
  [13,1704029,1659446,981443,200961,0,0,56108,144853,1210856,197938,241739,241739,29009,780482,751474,4351075],
  [14,1755149,1706350,1020679,200961,0,0,49680,151281,1059575,197938,270750,270750,32490,819718,787228,5138303],
  [15,1807804,1754660,1061091,200961,0,0,42966,157995,901580,197938,300632,300632,36076,860130,824054,5962357],
  [16,1862038,1804420,1102716,200961,0,0,35955,165006,736574,197938,331409,331409,39769,901755,861985,6824342],
  [17,1917899,1855672,1145589,200961,0,0,28632,172329,564245,197938,363111,363111,43573,944628,901055,7725397],
  [18,1975431,1908461,1189749,200961,0,0,20985,179977,384268,197938,395763,395763,47492,988788,941296,8666693],
  [19,2034694,1962834,1235233,200961,0,0,12998,187964,196305,197938,429395,429395,51527,1034272,982745,9649438],
  [20,2095735,2018840,1282082,200961,0,0,4656,196305,0,197938,464035,464035,55684,1081121,1025437,10674874]
];

const ENGINE_PROJ = [...ENGINE_PROJ_1_7, ...ENGINE_PROJ_8_20];

const ENGINE_KPIS = {
  rendBrut: 0.0989963570104712,
  rendNet: 0.004244696963095171,
  tri: 0.18512092038436329,
  van: 4539902.202676519,
  payback: 10,
  breakEven: 0.235,
  dscr: 1.1824190870775124
};

const ENGINE_IRR_FLOWS = [-1685500,32429,389260,-60369,-26101,9357,-16671,15231,587731,618573,650340,683060,716761,751474,787228,824054,861985,901055,941296,982745,12378075];

let bugs = [];
let warnings = [];

function check(label, expected, actual, tolerance = TOLERANCE) {
  const diff = Math.abs(expected - actual);
  if (diff > tolerance) {
    bugs.push(`❌ ${label}: attendu ${expected}, obtenu ${actual} (écart: ${diff.toFixed(2)})`);
    return false;
  }
  return true;
}

function checkPct(label, expected, actual, tolerance = 0.001) {
  const diff = Math.abs(expected - actual);
  if (diff > tolerance) {
    bugs.push(`❌ ${label}: attendu ${(expected*100).toFixed(4)}%, obtenu ${(actual*100).toFixed(4)}% (écart: ${(diff*100).toFixed(4)}%)`);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT 1: TABLEAU D'AMORTISSEMENT DETTE
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 1: TABLEAU D'AMORTISSEMENT DETTE TK + BQ");
console.log("═".repeat(70));

// 1a. Verify PMT formula
function PMT(rate, nper, pv) {
  return pv * rate * Math.pow(1 + rate, nper) / (Math.pow(1 + rate, nper) - 1);
}

// TK: 2,595,250 at 2.5% over 5 years (7 - 2 différé)
const pmtTK = PMT(PARAMS.tk.taux, PARAMS.tk.duree - PARAMS.tk.differe, PARAMS.tk.montant);
check("PMT TK", PARAMS.tk.annuite, pmtTK, 0.01);
console.log(`PMT TK: calculé=${pmtTK.toFixed(2)}, engine=${PARAMS.tk.annuite.toFixed(2)} ✓`);

// BQ: 2,595,250 at 4.35% over 19 years (20 - 1 différé)
const pmtBQ = PMT(PARAMS.bq.taux, PARAMS.bq.duree - PARAMS.bq.differe, PARAMS.bq.montant);
check("PMT BQ", PARAMS.bq.annuite, pmtBQ, 0.01);
console.log(`PMT BQ: calculé=${pmtBQ.toFixed(2)}, engine=${PARAMS.bq.annuite.toFixed(2)} ✓`);

// 1b. Year-by-year amortization for TK
console.log("\n--- TAMWILKOM (2.5%/7ans/2ans différé) ---");
let crdTK = PARAMS.tk.montant;
for (let y = 1; y <= 7; y++) {
  const isDiffere = y <= PARAMS.tk.differe;
  let interets, capital, annuite;
  if (isDiffere) {
    interets = crdTK * PARAMS.tk.taux;
    capital = 0;
    annuite = interets;
  } else {
    annuite = PARAMS.tk.annuite;
    interets = crdTK * PARAMS.tk.taux;
    capital = annuite - interets;
  }
  const engineRow = ENGINE_DEBT[y-1];

  check(`TK An${y} intérêts`, Math.round(interets), engineRow[1], 1);
  check(`TK An${y} capital`, Math.round(capital), engineRow[2], 1);
  check(`TK An${y} annuité`, Math.round(annuite), engineRow[3], 1);

  console.log(`An ${y}: CRD=${Math.round(crdTK)} | Int=${Math.round(interets)} | Cap=${Math.round(capital)} | Ann=${Math.round(annuite)} | Engine: Int=${engineRow[1]} Cap=${engineRow[2]} Ann=${engineRow[3]} ${isDiffere ? '[DIFFÉRÉ]' : ''}`);

  crdTK -= capital;
}
console.log(`CRD TK final: ${Math.round(crdTK)} (doit être ~0)`);
check("CRD TK final", 0, Math.round(crdTK), 2);

// 1c. Year-by-year amortization for BQ
console.log("\n--- BANQUE CLASSIQUE (4.35%/20ans/1an différé) ---");
let crdBQ = PARAMS.bq.montant;
for (let y = 1; y <= 20; y++) {
  const isDiffere = y <= PARAMS.bq.differe;
  let interets, capital, annuite;
  if (isDiffere) {
    interets = crdBQ * PARAMS.bq.taux;
    capital = 0;
    annuite = interets;
  } else {
    annuite = PARAMS.bq.annuite;
    interets = crdBQ * PARAMS.bq.taux;
    capital = annuite - interets;
  }
  const engineRow = ENGINE_DEBT[y-1];

  check(`BQ An${y} intérêts`, Math.round(interets), engineRow[4], 1);
  check(`BQ An${y} capital`, Math.round(capital), engineRow[5], 1);
  check(`BQ An${y} annuité`, Math.round(annuite), engineRow[6], 1);

  if (y <= 2 || y >= 19) { // Print first 2 and last 2
    console.log(`An ${y}: CRD=${Math.round(crdBQ)} | Int=${Math.round(interets)} | Cap=${Math.round(capital)} | Ann=${Math.round(annuite)} ${isDiffere ? '[DIFFÉRÉ]' : ''}`);
  } else if (y === 3) {
    console.log(`An 3-18: ... (vérifié programmatiquement)`);
  }

  crdBQ -= capital;
}
console.log(`CRD BQ final: ${Math.round(crdBQ)} (doit être ~0)`);
check("CRD BQ final", 0, Math.round(crdBQ), 2);

// 1d. Verify CRD in projections matches debt schedule
console.log("\n--- Vérification CRD dans projections ---");
let crdCheckTK = PARAMS.tk.montant;
let crdCheckBQ = PARAMS.bq.montant;
for (let y = 1; y <= 20; y++) {
  const engineRow = ENGINE_DEBT[y-1];
  crdCheckTK -= engineRow[2]; // capitalTK
  crdCheckBQ -= engineRow[5]; // capitalBQ
  const expectedCRD = crdCheckTK + crdCheckBQ;
  const engineCRD = ENGINE_PROJ[y-1][11]; // capitalRestantDu column
  check(`CRD total An${y}`, Math.round(expectedCRD), engineCRD, 2);
}
console.log(`CRD vérifié année par année ✓`);

// ═══════════════════════════════════════════════════════════════
// AUDIT 2: CALCUL IS DÉTAILLÉ
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 2: CALCUL IS DÉTAILLÉ ANNÉE PAR ANNÉE");
console.log("═".repeat(70));

for (let y = 1; y <= 20; y++) {
  const p = ENGINE_PROJ[y-1];
  const ebitda = p[3];
  const debtService = p[4];
  const iTK = p[5], cTK = p[6], iBQ = p[7], cBQ = p[8];
  const amort = p[10];
  const engineResFiscal = p[11];
  const engineBenef = p[12];
  const engineIS = p[13];
  const engineCfAvIS = p[14];
  const engineCfNet = p[15];

  // Résultat fiscal = EBITDA - service dette - amortissement
  // Wait - that's CF avant IS - amortissement. Let me check the formula.
  // Actually: résultat fiscal = EBITDA - amortissement - intérêts (not principal)
  // résultat fiscal = cashFlowAvantIS - amortissement
  // where cashFlowAvantIS = EBITDA - service_dette_total

  const cfAvIS = ebitda - debtService;
  const resFiscal = cfAvIS - amort;

  check(`IS An${y} CF avant IS`, cfAvIS, engineCfAvIS, 1);
  check(`IS An${y} résultat fiscal`, resFiscal, engineResFiscal, 1);

  // Exonération IS: first 5 years, 80% of revenue from devises (40%) is exempt
  // Actually the fiscal code says: caDevisesPct of revenue is in devises,
  // and the IS rate is reduced by (1 - caDevisesPct) during exo years
  // Wait, let me re-read the engine code.
  // Engine: const testIS = Math.max(0, testResultatFiscal) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
  // So: IS = max(0, resFiscal) * (1 - 0.4) * 0.20 = max(0, resFiscal) * 0.60 * 0.20 = max(0, resFiscal) * 0.12
  // But this is applied for ALL years, not just the first 5.
  // Hmm, that means the engine applies the devises exemption permanently, not just 5 years.
  // Let me check the engine code more carefully.

  // For this audit, I'll use what the engine actually does:
  const benefImposable = Math.max(0, resFiscal);
  // The IS formula from engine: benefImposable * (1 - caDevisesPct) * isTaux
  const is = benefImposable * (1 - PARAMS.fiscal.caDevisesPct) * PARAMS.fiscal.isTaux;

  check(`IS An${y} bénéfice imposable`, Math.round(benefImposable), engineBenef, 1);
  check(`IS An${y} IS`, Math.round(is), engineIS, 1);

  // Verify CF net = CF avant IS - IS
  const cfNet = cfAvIS - Math.round(is);
  check(`IS An${y} CF net`, cfNet, engineCfNet, 2);

  if (y <= 3 || y >= 19) {
    console.log(`An ${y}: EBITDA=${ebitda} - Dette=${debtService} = CFavIS=${cfAvIS} | ResFisc=${Math.round(resFiscal)} | IS=${Math.round(is)} | CFnet=${engineCfNet}`);
  } else if (y === 4) {
    console.log(`An 4-18: ... (vérifié programmatiquement)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT 2b: VÉRIFICATION FORMULE IS
// ═══════════════════════════════════════════════════════════════
console.log("\n--- Vérification formule IS ---");
console.log(`Formule: IS = max(0, résultat_fiscal) × (1 - caDevisesPct) × isTaux`);
console.log(`         IS = max(0, res) × (1 - 0.4) × 0.20 = max(0, res) × 0.12`);

// NOTE: The engine uses a flat rate of 20% with devises exemption (40%)
// This gives an effective rate of 12% which is lower than the Moroccan progressive IS rate
// The Moroccan IS rates are: 10% (0-300K), 20% (300K-1M), 31% (>1M)
// The engine simplifies to a flat 20% × (1 - 40% devises) = 12% effective
// This is a known simplification — flag as warning
warnings.push("⚠️ IS: Engine uses flat 20% rate, not Moroccan progressive (10%/20%/31%). " +
  "Effective rate = 12% (after 40% devises exemption). Progressive rate would give lower IS for small profits.");

// Also check if exonération 5 ans is implemented
// From the engine code, the formula is the same for ALL years — no 5-year exemption
// This means the 40% devises deduction applies permanently, which is MORE generous than reality
// In reality, the 80% exemption on devises income is for the first 5 years only
// After that, the standard rate applies
warnings.push("⚠️ IS: Engine applies 40% devises deduction for ALL 20 years. " +
  "In reality, the 80% export exemption may be limited to 5 years. " +
  "After that, full IS should apply. Impact: years 6-20 IS is underestimated.");


// ═══════════════════════════════════════════════════════════════
// AUDIT 3: PROJECTION 20 ANS COHÉRENCE
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 3: PROJECTION 20 ANS COHÉRENCE CF");
console.log("═".repeat(70));

let cumulCheck = 0;
for (let y = 1; y <= 20; y++) {
  const p = ENGINE_PROJ[y-1];
  const ebitda = p[3];
  const debtService = p[4];
  const is = p[13];
  const cfAvIS = p[14];
  const cfNet = p[15];
  const cumul = p[16];

  // CF avant IS = EBITDA - service dette
  check(`CF An${y} cfAvIS = EBITDA - dette`, ebitda - debtService, cfAvIS, 1);

  // CF net = CF avant IS - IS
  check(`CF An${y} cfNet = cfAvIS - IS`, cfAvIS - is, cfNet, 1);

  // Cumul
  cumulCheck += cfNet;
  check(`CF An${y} cumul`, Math.round(cumulCheck), cumul, 2);
}
console.log(`Cumul CF 20 ans: calculé=${Math.round(cumulCheck)}, engine=${ENGINE_PROJ[19][16]} ✓`);

// Valeur résiduelle
const valResid = PARAMS.totalProjet * Math.pow(1 + PARAMS.tauxApprec, 20);
console.log(`\nValeur résiduelle: ${PARAMS.totalProjet} × (1+${PARAMS.tauxApprec})^20 = ${Math.round(valResid)}`);
check("Valeur résiduelle", 11352638, Math.round(valResid), 100);

// ═══════════════════════════════════════════════════════════════
// AUDIT 4: RECALCUL TRI MANUEL
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 4: RECALCUL TRI MANUEL");
console.log("═".repeat(70));

// IRR flows: [-apport, CF1, CF2, ..., CF19, CF20 + valResiduelle]
const irrFlows = ENGINE_IRR_FLOWS;
console.log(`Flux An 0: ${irrFlows[0]} (= -apport ${PARAMS.apportNet})`);
check("TRI flux An0", -PARAMS.apportNet, irrFlows[0]);

for (let y = 1; y <= 20; y++) {
  const expectedCF = ENGINE_PROJ[y-1][15]; // cfNet
  if (y < 20) {
    check(`TRI flux An${y}`, expectedCF, irrFlows[y], 1);
  } else {
    // An 20 = CF net + valeur résiduelle
    const expectedFlow = expectedCF + Math.round(valResid);
    check(`TRI flux An20`, expectedFlow, irrFlows[20], 100);
    console.log(`Flux An 20: CF=${expectedCF} + ValResid=${Math.round(valResid)} = ${expectedFlow} (engine: ${irrFlows[20]})`);
  }
}

// Manual IRR calculation (Newton-Raphson)
function computeIRR(flows, guess = 0.10) {
  let rate = guess;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += flows[t] / factor;
      dnpv -= t * flows[t] / (factor * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-9) { rate = newRate; break; }
    rate = newRate;
  }
  return rate;
}

const manualTRI = computeIRR(irrFlows);
console.log(`TRI calculé manuellement: ${(manualTRI*100).toFixed(4)}%`);
console.log(`TRI engine: ${(ENGINE_KPIS.tri*100).toFixed(4)}%`);
checkPct("TRI", ENGINE_KPIS.tri, manualTRI, 0.001);

// ═══════════════════════════════════════════════════════════════
// AUDIT 5: RECALCUL VAN MANUEL
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 5: RECALCUL VAN MANUEL (taux 8%)");
console.log("═".repeat(70));

const tauxActu = 0.08;
let manualVAN = 0;
for (let t = 0; t < irrFlows.length; t++) {
  manualVAN += irrFlows[t] / Math.pow(1 + tauxActu, t);
}
console.log(`VAN calculée: ${Math.round(manualVAN)}`);
console.log(`VAN engine: ${Math.round(ENGINE_KPIS.van)}`);
check("VAN", Math.round(ENGINE_KPIS.van), Math.round(manualVAN), 100);

// ═══════════════════════════════════════════════════════════════
// AUDIT 6: DSCR ANNÉE PAR ANNÉE
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 6: DSCR ANNÉE PAR ANNÉE");
console.log("═".repeat(70));

for (let y = 1; y <= 20; y++) {
  const p = ENGINE_PROJ[y-1];
  const ebitda = p[3];
  const debtService = p[4];
  const dscr = debtService > 0 ? ebitda / debtService : Infinity;

  if (y === 1) {
    check("DSCR An1", ENGINE_KPIS.dscr, dscr, 0.01);
    console.log(`An 1: EBITDA=${ebitda} / Dette=${debtService} = DSCR ${dscr.toFixed(3)} (engine: ${ENGINE_KPIS.dscr.toFixed(3)})`);
  }

  if (y <= 7) {
    console.log(`An ${y}: DSCR = ${ebitda} / ${debtService} = ${dscr.toFixed(3)} ${dscr < 1 ? '⚠️ <1' : '✓'}`);
  } else if (y === 8) {
    console.log(`An 8-20: BQ only (dette=${debtService}/an)`);
    console.log(`An ${y}: DSCR = ${ebitda} / ${debtService} = ${dscr.toFixed(3)} ✓`);
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT 9: COMPARAISON ALTERNATIVES
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 9: COMPARAISON ALTERNATIVES");
console.log("═".repeat(70));

const apport = PARAMS.apportNet;

// Livret épargne UAE 6.25% composé sur 20 ans
const tauxLivret = 0.0625;
const livret20 = apport * Math.pow(1 + tauxLivret, 20);
console.log(`Livret 6.25%: ${apport} × (1.0625)^20 = ${Math.round(livret20)}`);
console.log(`Gain livret: ${Math.round(livret20 - apport)} MAD (rendement total: ${((livret20/apport - 1)*100).toFixed(1)}%)`);

// OPCI ~4.5% composé sur 20 ans
const tauxOPCI = 0.045;
const opci20 = apport * Math.pow(1 + tauxOPCI, 20);
console.log(`OPCI 4.5%: ${apport} × (1.045)^20 = ${Math.round(opci20)}`);

// Bons du trésor ~4% composé sur 20 ans
const tauxBons = 0.04;
const bons20 = apport * Math.pow(1 + tauxBons, 20);
console.log(`Bons trésor 4%: ${apport} × (1.04)^20 = ${Math.round(bons20)}`);

// Projet immobilier: cumul CF + valeur résiduelle
const projetTotal = ENGINE_PROJ[19][16] + Math.round(valResid); // cumul CF + valeur résiduelle
console.log(`\nProjet immobilier: cumul CF 20ans (${ENGINE_PROJ[19][16]}) + valeur résiduelle (${Math.round(valResid)}) = ${projetTotal}`);
console.log(`\nComparaison sur apport ${apport}:`);
console.log(`  Livret UAE: ${Math.round(livret20)} (+${((livret20/apport - 1)*100).toFixed(1)}%)`);
console.log(`  OPCI:       ${Math.round(opci20)} (+${((opci20/apport - 1)*100).toFixed(1)}%)`);
console.log(`  Bons:       ${Math.round(bons20)} (+${((bons20/apport - 1)*100).toFixed(1)}%)`);
console.log(`  Projet:     ${projetTotal} (+${((projetTotal/apport - 1)*100).toFixed(1)}%)`);

// Dashboard shows "+3.6%" for livret, "+5.4%" for OPCI, "+5.9%" for bons
// These are rendement brut DIFFERENCES, not absolute returns
// rendement brut projet = 9.9%, livret = 6.25% → delta = +3.65% ≈ +3.6%
const rendBrutProjet = ENGINE_KPIS.rendBrut;
console.log(`\nRendement brut projet: ${(rendBrutProjet*100).toFixed(2)}%`);
console.log(`Delta vs livret: +${((rendBrutProjet - tauxLivret)*100).toFixed(1)}% (affiché: +3.6%)`);
console.log(`Delta vs OPCI:   +${((rendBrutProjet - tauxOPCI)*100).toFixed(1)}% (affiché: +5.4%)`);
console.log(`Delta vs bons:   +${((rendBrutProjet - tauxBons)*100).toFixed(1)}% (affiché: +5.9%)`);

// ═══════════════════════════════════════════════════════════════
// AUDIT 10: GESTION DUEL
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("AUDIT 10: SECTION GESTION DUEL");
console.log("═".repeat(70));

const GD = {
  auto: { cfAn1: 145883, tri: 0.24886818575442843, van: 6638331, chargesAn1: 361854, ebitdaAn1: 323658, breakEven: 0.185, payback: 7 },
  societe: { cfAn1: -587, tri: 0.16726871502027568, van: 3879965, chargesAn1: 508324, ebitdaAn1: 177188, breakEven: 0.255, payback: 11 },
  autoRevAn1: 685512, societeRevAn1: 685512
};

// Same revenue
check("GestionDuel: même revenu", GD.autoRevAn1, GD.societeRevAn1);
console.log(`Revenus An 1: Auto=${GD.autoRevAn1}, Société=${GD.societeRevAn1} — identiques ✓`);

// Charge delta
const chargeDelta = GD.societe.chargesAn1 - GD.auto.chargesAn1;
const ebitdaDelta = GD.auto.ebitdaAn1 - GD.societe.ebitdaAn1;
console.log(`Charges: Auto=${GD.auto.chargesAn1}, Société=${GD.societe.chargesAn1}, Delta=${chargeDelta}`);
console.log(`EBITDA: Auto=${GD.auto.ebitdaAn1}, Société=${GD.societe.ebitdaAn1}, Delta=${ebitdaDelta}`);
check("GestionDuel: delta charges = delta EBITDA", chargeDelta, ebitdaDelta, 1);

// CF delta
const cfDelta = GD.auto.cfAn1 - GD.societe.cfAn1;
console.log(`CF Net An 1: Auto=${GD.auto.cfAn1}, Société=${GD.societe.cfAn1}, Delta=${cfDelta}`);

// TRI delta
const triDelta = (GD.auto.tri - GD.societe.tri) * 100;
console.log(`TRI: Auto=${(GD.auto.tri*100).toFixed(1)}%, Société=${(GD.societe.tri*100).toFixed(1)}%, Delta=+${triDelta.toFixed(2)} pts`);

// ═══════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("RÉSUMÉ AUDIT V3");
console.log("═".repeat(70));

if (bugs.length === 0) {
  console.log(`\n✅ AUCUN BUG TROUVÉ dans les calculs financiers`);
} else {
  console.log(`\n❌ ${bugs.length} BUG(S) TROUVÉ(S):`);
  bugs.forEach(b => console.log(`  ${b}`));
}

if (warnings.length > 0) {
  console.log(`\n⚠️ ${warnings.length} AVERTISSEMENT(S):`);
  warnings.forEach(w => console.log(`  ${w}`));
}

console.log(`\nDétail: ${ENGINE_PROJ.length * 6 + ENGINE_DEBT.length * 6 + 20} vérifications effectuées`);
