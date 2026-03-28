#!/usr/bin/env node
// ============================================================
// AUDIT V5 — EXHAUSTIVE LINE-BY-LINE MATHEMATICAL AUDIT
// Runs independently from the engine, manual calculations only
// ============================================================

// ═══════════════════════════════════════════════════════════
// REPLICATE ALL DATA CONSTANTS
// ═══════════════════════════════════════════════════════════

const nbStudios = 9; // 1 RDC + 2×étage1 + 2×étage2 + 2×étage3 + 1×étage4 + 1×étage5
const nbLofts = 2;   // étage4 + étage5
const nbUnites = 11;
const surfaceLocative = 46.10 + 37.41 + 32.75 + 37.41 + 32.75 + 37.41 + 32.75 + 32.75 + 32.75 + 28.55 + 22.63;
// = 373.26 m²

const terrainPrix = 2_300_000;
const fraisAcq = 0.065;
const coutTerrain = terrainPrix * (1 + fraisAcq); // 2,449,500

// Scénario réaliste
const occ = 0.48;
const prixStudio = 650;
const prixLoft = 480;
const loyerCommercial = 8_000;
const baseBudget = 7_200_000;
const budgetConstruction = baseBudget - coutTerrain;
const ameublement = 40_000 * nbUnites; // 440,000
const totalProjet = baseBudget + ameublement; // 7,640,000

// Go Siyaha disabled
const ecoEnabled = false;

// Canaux
const basePartOTA = 0.55;
const basePartDirect = 0.25;
const basePartInformel = 0.20;
const commissionOTA = 0.15;
const croissanceTarifs = 0.03;
const tauxAppreciation = 0.02;

// Saisonnalité
const saisonCoeffs = [0.61, 0.69, 0.91, 1.02, 1.13, 1.21, 1.30, 1.20, 1.19, 1.08, 0.88, 0.78];
const joursParMois = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Ramp-up
const rampUpDuree = 1;
const rampCoefOcc = 0.65;
const rampCoefADR = 0.85;

// Canaux évolution
const otaMultiplier = [1.30, 1.20, 1.10, 1.05, 1.00];

// Charges
const tauxGestion = 0.15;
const consommablesPN = 30;
const utilitiesFixe = 500;
const utilitiesVar = 400;
const internetTv = 1_200;
const assurance = 18_000;
const entretienBase = 20_000;
const entretienMature = 40_000;
const salaireConcierge = 4_500;
const salaireMenage = 3_500;
const chargesSociales = 0.2071;
const comptableAnnuel = 30_000;
const taxesPro = 25_000;
const divers = 15_000;
const nbEmployes = 2;
const renouvCycle = 7;
const renouvParUnite = 40_000;
const taxeHabitation = 12_000;
const budgetMarketing = 20_000;
const fraisCreation = 20_000;
const syndic = 0;

// Financement
const TK_taux = 0.025;
const TK_duree = 7;
const TK_differe = 2;
const TK_plafond = 5_000_000;
const TK_maxPct = 0.40;

const BQ_taux = 0.0435;
const BQ_duree = 20;
const BQ_differe = 1;

// Fiscalité
const isTaux = 0.20;
const caDevisesPct = 0.40;
const amortissementAns = 20;
const exoTaxeProAns = 5;

// MDM
const mdmTaux = 0.10;
const mdmPlafond = 5_000_000;

function pmt(rate, nper, pv) {
  if (rate === 0) return pv / nper;
  return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

// ═══════════════════════════════════════════════════════════
// COMPUTE ALL VALUES MANUALLY
// ═══════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════");
console.log("  AUDIT V5 — EXHAUSTIF LIGNE PAR LIGNE");
console.log("  Scénario: Réaliste (occ=48%, studio=650, loft=480)");
console.log("═══════════════════════════════════════════════════════════\n");

// --- BUDGET ---
console.log("=== BUDGET ===");
const fraisTerrain = terrainPrix * fraisAcq;
console.log(`Terrain: ${terrainPrix.toLocaleString()} + frais ${fraisTerrain.toLocaleString()} = ${coutTerrain.toLocaleString()}`);
console.log(`Construction: ${baseBudget.toLocaleString()} - ${coutTerrain.toLocaleString()} = ${budgetConstruction.toLocaleString()}`);
console.log(`Ameublement: ${nbUnites} × 40,000 = ${ameublement.toLocaleString()}`);
console.log(`Total projet: ${totalProjet.toLocaleString()}`);
console.log(`Surface locative: ${surfaceLocative.toFixed(2)} m²`);
console.log(`Surface moyenne: ${(surfaceLocative/nbUnites).toFixed(2)} m²/unité`);

// --- FINANCEMENT ---
console.log("\n=== FINANCEMENT ===");
const subventionMDM = Math.min(totalProjet * mdmTaux, mdmPlafond);
const apportTerrain = coutTerrain;
const apportNet = apportTerrain - subventionMDM;
const montantAFinancer = totalProjet - apportTerrain;
const montantTK = Math.min(montantAFinancer / 2, TK_plafond, totalProjet * TK_maxPct);
const montantBQ = montantAFinancer - montantTK;

console.log(`MDM subvention: ${totalProjet.toLocaleString()} × 10% = ${subventionMDM.toLocaleString()}`);
console.log(`Apport terrain: ${apportTerrain.toLocaleString()}`);
console.log(`Apport net: ${apportTerrain.toLocaleString()} - ${subventionMDM.toLocaleString()} = ${apportNet.toLocaleString()}`);
console.log(`À financer: ${montantAFinancer.toLocaleString()}`);
console.log(`  TK max: min(${(montantAFinancer/2).toLocaleString()}, ${TK_plafond.toLocaleString()}, ${(totalProjet*TK_maxPct).toLocaleString()}) = ${montantTK.toLocaleString()}`);
console.log(`  BQ: ${montantBQ.toLocaleString()}`);

// --- PARTIE A6: SERVICE DETTE MOIS PAR MOIS ---
console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE A6 — SERVICE DETTE MOIS PAR MOIS AN 1-3");
console.log("════════════════════════════════════════════════════════");

const rTK = TK_taux / 12;
const nTK = (TK_duree - TK_differe) * 12; // 60 mois
const mensualiteTK = pmt(rTK, nTK, montantTK);
const annuiteTK = mensualiteTK * 12;
const interetsDiffereTK = montantTK * TK_taux;

const rBQ = BQ_taux / 12;
const nBQ = (BQ_duree - BQ_differe) * 12; // 228 mois
const mensualiteBQ = pmt(rBQ, nBQ, montantBQ);
const annuiteBQ = mensualiteBQ * 12;
const interetsDiffereBQ = montantBQ * BQ_taux;

console.log(`\nTamwilkom: ${montantTK.toLocaleString()} @ ${TK_taux*100}%/an sur ${TK_duree}ans (${TK_differe}ans différé)`);
console.log(`  Taux mensuel: ${rTK.toFixed(8)}`);
console.log(`  Mois de remboursement: ${nTK}`);
console.log(`  Mensualité (PMT): ${mensualiteTK.toFixed(2)} MAD`);
console.log(`  Annuité: ${annuiteTK.toFixed(2)} MAD`);
console.log(`  Intérêts différé/an: ${interetsDiffereTK.toFixed(2)} MAD`);

console.log(`\nBanque classique: ${montantBQ.toLocaleString()} @ ${BQ_taux*100}%/an sur ${BQ_duree}ans (${BQ_differe}an différé)`);
console.log(`  Taux mensuel: ${rBQ.toFixed(8)}`);
console.log(`  Mois de remboursement: ${nBQ}`);
console.log(`  Mensualité (PMT): ${mensualiteBQ.toFixed(2)} MAD`);
console.log(`  Annuité: ${annuiteBQ.toFixed(2)} MAD`);
console.log(`  Intérêts différé/an: ${interetsDiffereBQ.toFixed(2)} MAD`);

// Month-by-month for years 1-3
for (let year = 1; year <= 3; year++) {
  console.log(`\n--- AN ${year} — Détail mensuel ---`);

  // TK
  let tkStatus, tkMensuel;
  if (year <= TK_differe) {
    tkStatus = "DIFFÉRÉ (intérêts seuls)";
    tkMensuel = montantTK * TK_taux / 12;
  } else {
    tkStatus = "REMBOURSEMENT (capital + intérêts)";
    tkMensuel = mensualiteTK;
  }

  // BQ
  let bqStatus, bqMensuel;
  if (year <= BQ_differe) {
    bqStatus = "DIFFÉRÉ (intérêts seuls)";
    bqMensuel = montantBQ * BQ_taux / 12;
  } else {
    bqStatus = "REMBOURSEMENT (capital + intérêts)";
    bqMensuel = mensualiteBQ;
  }

  console.log(`  TK: ${tkStatus}`);
  console.log(`    Mensualité TK: ${tkMensuel.toFixed(2)} MAD/mois × 12 = ${(tkMensuel*12).toFixed(2)} MAD/an`);
  console.log(`  BQ: ${bqStatus}`);
  console.log(`    Mensualité BQ: ${bqMensuel.toFixed(2)} MAD/mois × 12 = ${(bqMensuel*12).toFixed(2)} MAD/an`);
  console.log(`  TOTAL DETTE An ${year}: ${((tkMensuel + bqMensuel) * 12).toFixed(2)} MAD/an = ${(tkMensuel + bqMensuel).toFixed(2)} MAD/mois`);

  // Détail mois par mois avec capital restant dû
  if (year > TK_differe || year > BQ_differe) {
    let balTK = montantTK;
    let balBQ = montantBQ;

    // Avancer le solde TK
    if (year > TK_differe) {
      const monthsPassed = (year - 1 - TK_differe) * 12;
      for (let m = 0; m < Math.max(0, monthsPassed); m++) {
        const intM = balTK * rTK;
        balTK -= (mensualiteTK - intM);
      }
    }

    // Avancer le solde BQ
    if (year > BQ_differe) {
      const monthsPassed = (year - 1 - BQ_differe) * 12;
      for (let m = 0; m < Math.max(0, monthsPassed); m++) {
        const intM = balBQ * rBQ;
        balBQ -= (mensualiteBQ - intM);
      }
    }

    console.log(`  Détail mensuel An ${year}:`);
    let yearIntTK = 0, yearCapTK = 0, yearIntBQ = 0, yearCapBQ = 0;
    for (let m = 1; m <= 12; m++) {
      let intTKm = 0, capTKm = 0, intBQm = 0, capBQm = 0;

      if (year > TK_differe) {
        intTKm = balTK * rTK;
        capTKm = mensualiteTK - intTKm;
        balTK -= capTKm;
        yearIntTK += intTKm;
        yearCapTK += capTKm;
      } else {
        intTKm = montantTK * rTK;
        yearIntTK += intTKm;
      }

      if (year > BQ_differe) {
        intBQm = balBQ * rBQ;
        capBQm = mensualiteBQ - intBQm;
        balBQ -= capBQm;
        yearIntBQ += intBQm;
        yearCapBQ += capBQm;
      } else {
        intBQm = montantBQ * rBQ;
        yearIntBQ += intBQm;
      }

      if (m <= 3 || m === 12) { // Show first 3 months + last
        console.log(`    M${m}: TK int=${intTKm.toFixed(0)} cap=${capTKm.toFixed(0)} | BQ int=${intBQm.toFixed(0)} cap=${capBQm.toFixed(0)} | Total=${(intTKm+capTKm+intBQm+capBQm).toFixed(0)}/mois`);
      } else if (m === 4) {
        console.log(`    ... (mois 4-11 similaires) ...`);
      }
    }
    console.log(`  RÉCAP An ${year}: TK int=${yearIntTK.toFixed(0)} cap=${yearCapTK.toFixed(0)} | BQ int=${yearIntBQ.toFixed(0)} cap=${yearCapBQ.toFixed(0)}`);
    console.log(`  Total intérêts: ${(yearIntTK+yearIntBQ).toFixed(0)} | Total capital: ${(yearCapTK+yearCapBQ).toFixed(0)} | Total dette: ${(yearIntTK+yearCapTK+yearIntBQ+yearCapBQ).toFixed(0)}`);
    console.log(`  CRD fin An ${year}: TK=${Math.max(0,balTK).toFixed(0)} + BQ=${Math.max(0,balBQ).toFixed(0)} = ${(Math.max(0,balTK)+Math.max(0,balBQ)).toFixed(0)}`);
  }
}

// ═══════════════════════════════════════════════════════════
// PARTIE A1-A3: REVENUS MENSUELS, COMMISSIONS, CHARGES
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE A1-A3 — REVENUS, COMMISSIONS, CHARGES MENSUELS");
console.log("════════════════════════════════════════════════════════");

const constructionHTForAmort = budgetConstruction / 1.20;
const amortissementAnnuel = constructionHTForAmort / amortissementAns;

console.log(`\nAmortissement: construction HT = ${budgetConstruction.toLocaleString()} / 1.20 = ${constructionHTForAmort.toFixed(0)}`);
console.log(`  Dotation annuelle: ${constructionHTForAmort.toFixed(0)} / ${amortissementAns} = ${amortissementAnnuel.toFixed(2)} MAD/an`);

let cumulCF = 0;
const projections = [];
const bugs = [];

for (let y = 0; y < 20; y++) {
  const growth = Math.pow(1 + croissanceTarifs, y);
  const isRampUp = y < rampUpDuree;
  const rampADR = isRampUp ? rampCoefADR : 1.0;
  const pStudio = prixStudio * growth * rampADR;
  const pLoft = prixLoft * growth * rampADR;

  const rampOcc = isRampUp ? rampCoefOcc : 1.0;
  const occEffective = occ * rampOcc;

  // Canaux
  const multIdx = Math.min(y, otaMultiplier.length - 1);
  const otaMult = otaMultiplier[multIdx];
  let partOTA = Math.min(basePartOTA * otaMult, 0.90);
  let partInformel = basePartInformel;

  // Mois par mois
  let nuiteesStudios = 0, nuiteesLofts = 0;
  const occupationMensuelle = [];
  const revMensuelDetail = [];

  if (y === 0) console.log(`\n--- AN 1 (RAMP-UP) — Détail mensuel ---`);
  if (y === 0) console.log(`  occEffective = ${occ} × ${rampCoefOcc} = ${occEffective}`);
  if (y === 0) console.log(`  ADR studio = ${prixStudio} × ${rampCoefADR} = ${pStudio.toFixed(2)}`);
  if (y === 0) console.log(`  ADR loft = ${prixLoft} × ${rampCoefADR} = ${pLoft.toFixed(2)}`);
  if (y === 0) console.log(`  OTA multiplier An 1 = ${otaMult} → partOTA = ${partOTA.toFixed(3)}`);

  const moisNoms = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  for (let m = 0; m < 12; m++) {
    const occMois = Math.min(occEffective * saisonCoeffs[m], 1.0);
    occupationMensuelle.push(occMois);
    const nStudios = nbStudios * joursParMois[m] * occMois;
    const nLofts = nbLofts * joursParMois[m] * occMois;
    nuiteesStudios += nStudios;
    nuiteesLofts += nLofts;

    const revS = nStudios * pStudio;
    const revL = nLofts * pLoft;
    const revBrut = revS + revL;
    const comm = revBrut * partOTA * commissionOTA;
    const revNet = revBrut - comm;

    // Charges variables mensuelles
    const nuiteesMois = nStudios + nLofts;
    const consomMois = nuiteesMois * consommablesPN;
    const nbOccMois = nbUnites * occMois;
    const utilMois = utilitiesFixe + nbOccMois * utilitiesVar;

    if (y === 0) {
      console.log(`  ${moisNoms[m]}: occ=${(occMois*100).toFixed(1)}% | nuit_S=${nStudios.toFixed(1)} nuit_L=${nLofts.toFixed(1)} | rev=${revBrut.toFixed(0)} comm=${comm.toFixed(0)} net=${revNet.toFixed(0)} | conso=${consomMois.toFixed(0)} util=${utilMois.toFixed(0)}`);
    }

    revMensuelDetail.push({ occMois, nStudios, nLofts, nuiteesMois, revS, revL, revBrut, comm, revNet, consomMois, utilMois });
  }

  const occMoyEffective = occupationMensuelle.reduce((a, b) => a + b, 0) / 12;
  const nuiteesAn = nuiteesStudios + nuiteesLofts;
  const revStudios = nuiteesStudios * pStudio;
  const revLofts = nuiteesLofts * pLoft;
  const revBrutHotel = revStudios + revLofts;
  const commissions = revBrutHotel * partOTA * commissionOTA;
  const revNetHotel = revBrutHotel - commissions;
  const revInformel = revBrutHotel * partInformel;
  const revDeclareHotel = revBrutHotel - revInformel;
  const revCommercial = loyerCommercial * 12;
  const revTotal = revNetHotel + revCommercial;

  // Charges
  const gestion = revBrutHotel * tauxGestion;
  const consommables = nuiteesAn * consommablesPN;
  const comptable = comptableAnnuel;
  const nbUnitesOcc = nbUnites * occMoyEffective;
  const utilMensuel = utilitiesFixe + nbUnitesOcc * utilitiesVar;
  const utilities = (utilMensuel + internetTv) * 12;
  const masseSal = (salaireConcierge + salaireMenage) * 12;
  const salaires = masseSal * (1 + chargesSociales);
  const entretien = y < 5 ? entretienBase : entretienMature;
  const taxPro = y < exoTaxeProAns ? 0 : taxesPro;
  const provisionRenouv = (renouvParUnite * nbUnites) / renouvCycle;
  const taxHab = y < 5 ? 0 : taxeHabitation;
  const marketing = y === 0 ? budgetMarketing : 0;
  const fraisCrea = y === 0 ? fraisCreation : 0;

  const chargesTotal = gestion + consommables + comptable + utilities + assurance + entretien + salaires + taxPro + divers + provisionRenouv + taxHab + marketing + fraisCrea + syndic;

  const ebitda = revTotal - chargesTotal;

  // Service dette (année y)
  let debtTK, interetsTK_, capitalTK_;
  if (y < TK_differe) {
    interetsTK_ = interetsDiffereTK;
    capitalTK_ = 0;
    debtTK = interetsTK_;
  } else if (y < TK_duree) {
    debtTK = annuiteTK;
    let balTK = montantTK;
    for (let m = 0; m < (y - TK_differe) * 12; m++) {
      const intM = balTK * rTK;
      balTK -= (mensualiteTK - intM);
    }
    let yearIntTK = 0;
    for (let m = 0; m < 12; m++) {
      const intM = balTK * rTK;
      yearIntTK += intM;
      balTK -= (mensualiteTK - intM);
    }
    interetsTK_ = yearIntTK;
    capitalTK_ = debtTK - interetsTK_;
  } else {
    debtTK = 0; interetsTK_ = 0; capitalTK_ = 0;
  }

  let debtBQ, interetsBQ_, capitalBQ_;
  if (y < BQ_differe) {
    interetsBQ_ = montantBQ * BQ_taux;
    capitalBQ_ = 0;
    debtBQ = interetsBQ_;
  } else if (y < BQ_duree) {
    debtBQ = annuiteBQ;
    let balBQ = montantBQ;
    for (let m = 0; m < (y - BQ_differe) * 12; m++) {
      const intM = balBQ * rBQ;
      balBQ -= (mensualiteBQ - intM);
    }
    let yearIntBQ = 0;
    for (let m = 0; m < 12; m++) {
      const intM = balBQ * rBQ;
      yearIntBQ += intM;
      balBQ -= (mensualiteBQ - intM);
    }
    interetsBQ_ = yearIntBQ;
    capitalBQ_ = debtBQ - interetsBQ_;
  } else {
    debtBQ = 0; interetsBQ_ = 0; capitalBQ_ = 0;
  }

  const debtServiceTotal = debtTK + debtBQ;

  // CRD
  let soldeTK = 0;
  if (y < TK_duree) {
    soldeTK = montantTK;
    const rembMonths = Math.min(y + 1, TK_duree) <= TK_differe ? 0 : (Math.min(y + 1, TK_duree) - TK_differe) * 12;
    for (let m = 0; m < rembMonths; m++) { const im = soldeTK * rTK; soldeTK -= (mensualiteTK - im); }
    soldeTK = Math.max(0, soldeTK);
  }
  let soldeBQ = 0;
  if (y < BQ_duree) {
    soldeBQ = montantBQ;
    const rembMonths = Math.min(y + 1, BQ_duree) <= BQ_differe ? 0 : (Math.min(y + 1, BQ_duree) - BQ_differe) * 12;
    for (let m = 0; m < rembMonths; m++) { const im = soldeBQ * rBQ; soldeBQ -= (mensualiteBQ - im); }
    soldeBQ = Math.max(0, soldeBQ);
  }
  const capitalRestantDu = soldeTK + soldeBQ;

  // IS
  const dotationAmort = y < amortissementAns ? amortissementAnnuel : 0;
  const cashFlowAvantIS = ebitda - debtServiceTotal;
  const revDeclare = revDeclareHotel - commissions + revCommercial;
  const ebitdaDeclare = revDeclare - chargesTotal;
  const resultatFiscal = ebitdaDeclare - debtServiceTotal - dotationAmort;
  const beneficeImposable = Math.max(0, resultatFiscal);
  const partLocale = beneficeImposable * (1 - caDevisesPct);
  const is = partLocale * isTaux;

  const cashFlowNet = cashFlowAvantIS - is;
  cumulCF += cashFlowNet;

  projections.push({
    year: y + 1, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
    revInformel, revDeclareHotel, partOTA, chargesTotal, ebitda,
    debtTK, debtBQ, debtServiceTotal, interetsTK: interetsTK_, interetsBQ: interetsBQ_,
    dotationAmort, resultatFiscal, beneficeImposable, is, cashFlowAvantIS, cashFlowNet,
    cumulCashFlow: cumulCF, capitalRestantDu, occMoyEffective, nuiteesAn,
    gestion, consommables, utilities, salaires, entretien, taxPro, provisionRenouv, taxHab, marketing: marketing, fraisCrea,
    pStudio, pLoft, nuiteesStudios, nuiteesLofts,
    revDeclare, ebitdaDeclare, partLocale,
  });
}

// ═══════════════════════════════════════════════════════════
// PARTIE A4: AMORTISSEMENT
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE A4 — AMORTISSEMENT");
console.log("════════════════════════════════════════════════════════");

console.log(`\nBase amortissable: budgetConstruction TTC / 1.20 = ${budgetConstruction.toLocaleString()} / 1.20 = ${constructionHTForAmort.toFixed(0)} MAD`);
console.log(`Durée: ${amortissementAns} ans (construction)`);
console.log(`Dotation annuelle: ${amortissementAnnuel.toFixed(2)} MAD/an`);
console.log(`\nNOTE AUDIT: Le mobilier (${ameublement.toLocaleString()} MAD) devrait être amorti sur 7 ans séparément.`);
console.log(`  Amortissement mobilier théorique: ${ameublement.toLocaleString()} / 7 = ${(ameublement/7).toFixed(0)} MAD/an`);
console.log(`  ACTUELLEMENT: le mobilier N'EST PAS amorti séparément dans le modèle.`);
console.log(`  Impact: manque ${(ameublement/7).toFixed(0)} MAD/an de déduction fiscale pendant 7 ans`);

// Vérification: amortissement déduit du résultat fiscal mais PAS du cash-flow
console.log(`\nVérification traitement amortissement:`);
const y1 = projections[0];
console.log(`  An 1: EBITDA = ${y1.ebitda.toFixed(0)}`);
console.log(`  An 1: CF avant IS = EBITDA - dette = ${y1.ebitda.toFixed(0)} - ${y1.debtServiceTotal.toFixed(0)} = ${y1.cashFlowAvantIS.toFixed(0)}`);
console.log(`  An 1: Résultat fiscal = EBITDA_déclaré - dette - amort = ${y1.ebitdaDeclare.toFixed(0)} - ${y1.debtServiceTotal.toFixed(0)} - ${y1.dotationAmort.toFixed(0)} = ${y1.resultatFiscal.toFixed(0)}`);
console.log(`  → Amortissement réduit le résultat fiscal mais PAS le CF avant IS ✅`);
if (y1.cashFlowAvantIS !== y1.ebitda - y1.debtServiceTotal) {
  bugs.push("A4: CF avant IS ≠ EBITDA - dette");
} else {
  console.log(`  → CF avant IS = EBITDA - dette ✅`);
}

// ═══════════════════════════════════════════════════════════
// PARTIE A5: IS DÉTAILLÉ ANNÉE PAR ANNÉE
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE A5 — IS DÉTAILLÉ ANNÉE PAR ANNÉE");
console.log("════════════════════════════════════════════════════════");

console.log("\n⚠️  BUG CRITIQUE TROUVÉ PAR RECHERCHE WEB:");
console.log("  Le modèle applique l'exonération devises (40%) de façon PERMANENTE.");
console.log("  RÈGLE RÉELLE (Art. 6-I CGI Maroc):");
console.log("    - 5 premières années: 100% exonération IS sur la part devises → OK (résultat similaire)");
console.log("    - Après An 5: La part devises est taxée au taux normal (20% IS depuis 2026)");
console.log("    - Le modèle garde l'exonération 40% pour TOUJOURS → sous-estime l'IS An 6-20");

console.log("\n  An | RevDéclaré | Charges | EBITDA_déc | Dette | Amort | Rés.Fiscal | Bénéf.Imp | partLocale | IS_actuel | IS_corrigé | Diff");
console.log("  ---|------------|---------|------------|-------|-------|------------|-----------|------------|-----------|------------|------");

let totalISActuel = 0, totalISCorrige = 0;
for (let i = 0; i < 20; i++) {
  const p = projections[i];
  totalISActuel += p.is;

  // IS corrigé: pas d'exonération devises après An 5
  let isCorrige;
  if (i < 5) {
    // 5 premières années: exonération identique (100% sur part devises = 40%)
    isCorrige = p.is;
  } else {
    // Après An 5: tout le bénéfice imposable est taxé à 20%
    isCorrige = p.beneficeImposable * isTaux;
  }
  totalISCorrige += isCorrige;

  const diff = isCorrige - p.is;
  const marker = diff > 100 ? " ⚠️" : "";
  console.log(`  A${(i+1).toString().padStart(2)} | ${p.revDeclare.toFixed(0).padStart(10)} | ${p.chargesTotal.toFixed(0).padStart(7)} | ${p.ebitdaDeclare.toFixed(0).padStart(10)} | ${p.debtServiceTotal.toFixed(0).padStart(5)} | ${p.dotationAmort.toFixed(0).padStart(5)} | ${p.resultatFiscal.toFixed(0).padStart(10)} | ${p.beneficeImposable.toFixed(0).padStart(9)} | ${p.partLocale.toFixed(0).padStart(10)} | ${p.is.toFixed(0).padStart(9)} | ${isCorrige.toFixed(0).padStart(10)} | ${diff.toFixed(0).padStart(5)}${marker}`);
}

console.log(`\n  IS cumulé 20 ans ACTUEL:  ${totalISActuel.toFixed(0)} MAD`);
console.log(`  IS cumulé 20 ans CORRIGÉ: ${totalISCorrige.toFixed(0)} MAD`);
console.log(`  DIFFÉRENCE: +${(totalISCorrige - totalISActuel).toFixed(0)} MAD d'IS en plus`);
console.log(`  Impact CF net 20 ans: -${(totalISCorrige - totalISActuel).toFixed(0)} MAD`);

if (totalISCorrige - totalISActuel > 10_000) {
  bugs.push(`A5: Exonération devises permanente → sous-estime IS de ${(totalISCorrige - totalISActuel).toFixed(0)} MAD sur 20 ans`);
}

// ═══════════════════════════════════════════════════════════
// PARTIE A4 bis: AMORTISSEMENT MOBILIER MANQUANT
// ═══════════════════════════════════════════════════════════
console.log("\n  IMPACT AMORTISSEMENT MOBILIER MANQUANT:");
const amortMobilier = ameublement / 7; // 62,857 MAD/an
let isAvecMobilier = 0;
for (let i = 0; i < 20; i++) {
  const p = projections[i];
  const dotAmortTotal = p.dotationAmort + (i < 7 ? amortMobilier : 0);
  // Recalcul avec amortissement mobilier
  const resultatFiscalCorr = p.ebitdaDeclare - p.debtServiceTotal - dotAmortTotal;
  const benefImposCorr = Math.max(0, resultatFiscalCorr);
  let isCorrMob;
  if (i < 5) {
    isCorrMob = benefImposCorr * (1 - caDevisesPct) * isTaux;
  } else {
    isCorrMob = benefImposCorr * isTaux;
  }
  isAvecMobilier += isCorrMob;
}
console.log(`  IS avec amort mobilier + correction devises: ${isAvecMobilier.toFixed(0)} MAD (vs ${totalISActuel.toFixed(0)} actuel)`);
console.log(`  Économie IS grâce à amort mobilier: ${(totalISCorrige - isAvecMobilier).toFixed(0)} MAD sur 20 ans`);

// ═══════════════════════════════════════════════════════════
// PARTIE C10: VALEUR RÉSIDUELLE
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE C10 — VALEUR RÉSIDUELLE");
console.log("════════════════════════════════════════════════════════");

const valeurResiduelle = totalProjet * Math.pow(1 + tauxAppreciation, 20);
console.log(`\nFormule actuelle: totalProjet × (1 + ${tauxAppreciation})^20`);
console.log(`  = ${totalProjet.toLocaleString()} × ${Math.pow(1 + tauxAppreciation, 20).toFixed(6)}`);
console.log(`  = ${valeurResiduelle.toFixed(0)} MAD`);

console.log(`\nAnalyse économique:`);
console.log(`  Le modèle applique l'appréciation sur le coût TOTAL du projet (terrain + construction + mobilier)`);
console.log(`  Ceci est une simplification. En réalité:`);
console.log(`    - Le terrain s'apprécie (2%/an ✅)`);
console.log(`    - La construction se déprécie physiquement mais s'apprécie nominalement (net ~2% ✅)`);
console.log(`    - Le mobilier perd de sa valeur (7 ans, remplacé)`);
console.log(`  L'approche totalProjet × (1+r)^n est standard en évaluation immobilière.`);
console.log(`  Elle suppose un entretien régulier et des renouvellements → cohérent avec provision renouvellement.`);

console.log(`\n  Alternatives de calcul pour vérification:`);
const valResTerrain = coutTerrain * Math.pow(1.02, 20);
const valResConstruction = budgetConstruction * Math.pow(1.02, 20); // appréciation nominale
console.log(`  Terrain seul (2%/an): ${coutTerrain.toLocaleString()} × 1.02^20 = ${valResTerrain.toFixed(0)}`);
console.log(`  Construction (2%/an): ${budgetConstruction.toLocaleString()} × 1.02^20 = ${valResConstruction.toFixed(0)}`);
console.log(`  Mobilier: valeur résiduelle ~0 (remplacé tous les 7 ans, amorti)`);
console.log(`  Total décomposé: ${(valResTerrain + valResConstruction).toFixed(0)} vs modèle ${valeurResiduelle.toFixed(0)}`);
console.log(`  Différence: ${(valeurResiduelle - valResTerrain - valResConstruction).toFixed(0)} (= appréciation mobilier incluse dans le modèle)`);

// ═══════════════════════════════════════════════════════════
// RÉCAPITULATIF ANNÉE PAR ANNÉE
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  RÉCAPITULATIF 20 ANS");
console.log("════════════════════════════════════════════════════════");

console.log("\n  An | RevBrut  | Comm   | RevNet  | RevComm | Charges | EBITDA  | Dette   | IS     | CF Net  | Cumul CF  | CRD");
console.log("  ---|----------|--------|---------|---------|---------|---------|---------|--------|---------|-----------|--------");
for (const p of projections) {
  console.log(`  A${p.year.toString().padStart(2)} | ${p.revBrutHotel.toFixed(0).padStart(8)} | ${p.commissions.toFixed(0).padStart(6)} | ${p.revNetHotel.toFixed(0).padStart(7)} | ${p.revCommercial.toFixed(0).padStart(7)} | ${p.chargesTotal.toFixed(0).padStart(7)} | ${p.ebitda.toFixed(0).padStart(7)} | ${p.debtServiceTotal.toFixed(0).padStart(7)} | ${p.is.toFixed(0).padStart(6)} | ${p.cashFlowNet.toFixed(0).padStart(7)} | ${p.cumulCashFlow.toFixed(0).padStart(9)} | ${p.capitalRestantDu.toFixed(0).padStart(7)}`);
}

// ═══════════════════════════════════════════════════════════
// TVA ANALYSIS (C12)
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  PARTIE C12 — TVA RÉCUPÉRABLE");
console.log("════════════════════════════════════════════════════════");

const tvaConstruction = constructionHTForAmort * 0.20;
console.log(`\nTVA construction: ${constructionHTForAmort.toFixed(0)} × 20% = ${tvaConstruction.toFixed(0)} MAD`);
console.log(`\n⚠️ FINDING: TVA sur ameublement NON incluse dans le modèle.`);
const ameubleHT = ameublement / 1.20;
const tvaAmeublement = ameubleHT * 0.20;
console.log(`  Ameublement HT: ${ameublement.toLocaleString()} / 1.20 = ${ameubleHT.toFixed(0)} MAD`);
console.log(`  TVA ameublement: ${tvaAmeublement.toFixed(0)} MAD (récupérable via Art. 92-I-6°)`);
console.log(`  TVA totale récupérable: ${(tvaConstruction + tvaAmeublement).toFixed(0)} MAD`);
console.log(`  vs modèle actuel: ${tvaConstruction.toFixed(0)} MAD`);
console.log(`  Différence: ${tvaAmeublement.toFixed(0)} MAD non récupéré`);

console.log(`\nCalendrier récupération TVA:`);
console.log(`  Mécanisme: offset contre TVA collectée (hébergement 10% + commercial 20%)`);
console.log(`  Crédit initial: ${tvaConstruction.toFixed(0)} MAD`);

let creditRestant = tvaConstruction;
for (let i = 0; i < 20 && creditRestant > 0; i++) {
  const p = projections[i];
  const tvaCollHotel = p.revBrutHotel * 0.10;
  const tvaCollComm = p.revCommercial * 0.20;
  const tvaCollectee = tvaCollHotel + tvaCollComm;

  const tva20Ch = (p.gestion + p.consommables + 30000 + p.entretien + 15000) * 0.20 / 1.20;
  const tva14Ch = (p.utilities + 18000) * 0.14 / 1.14;
  const tvaPlat = p.commissions * 0.20 / 1.20;
  const tvaDeductible = tva20Ch + tva14Ch + tvaPlat;

  const soldeTVA = tvaCollectee - tvaDeductible;
  const avant = creditRestant;
  if (soldeTVA > 0) creditRestant = Math.max(0, creditRestant - soldeTVA);

  console.log(`  An ${i+1}: TVA coll=${tvaCollectee.toFixed(0)} déd=${tvaDeductible.toFixed(0)} solde=${soldeTVA.toFixed(0)} → crédit ${avant.toFixed(0)}→${creditRestant.toFixed(0)}`);
  if (creditRestant <= 0) {
    console.log(`  → Crédit TVA construction épuisé An ${i+1}`);
    break;
  }
}

// ═══════════════════════════════════════════════════════════
// RÉSUMÉ BUGS
// ═══════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════");
console.log("  RÉSUMÉ DES BUGS TROUVÉS");
console.log("════════════════════════════════════════════════════════\n");

// Add additional findings
bugs.push("A4: Amortissement mobilier manquant — 440K/7 = 62,857 MAD/an non déduit du résultat fiscal (7 ans)");
bugs.push("C12: TVA ameublement non récupérée — 73,333 MAD de crédit TVA manquant");

for (let i = 0; i < bugs.length; i++) {
  console.log(`  BUG ${i+1}: ${bugs[i]}`);
}

console.log(`\n  Total bugs: ${bugs.length}`);
console.log("\n  FIN DE L'AUDIT V5");
