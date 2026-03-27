// ============================================================
// ENGINE LAYER — Pure computation, zero DOM, zero side effects
// Takes raw data → returns computed STATE
// ============================================================

function pmt(rate, nper, pv) {
  if (rate === 0) return pv / nper;
  return (pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

function compute(scenario) {
  const sc = SCENARIOS[scenario];
  const occ = sc.tauxOccupation;

  // --- Terrain ---
  const fraisTerrain = TERRAIN.prix * TERRAIN.fraisAcquisition;
  const coutTerrain = TERRAIN.prix + fraisTerrain;
  let budgetConstruction = BUDGET.totalTTC - coutTerrain;
  const coutM2Terrain = TERRAIN.prix / TERRAIN.surface;

  // --- Unités ---
  const studios = UNITS.filter(u => u.category === "studio");
  const lofts = UNITS.filter(u => u.category === "loft");
  const locatifs = UNITS.filter(u => u.category === "studio" || u.category === "loft");
  const nbStudios = studios.length;
  const nbLofts = lofts.length;
  const nbUnites = locatifs.length;
  const surfaceLocative = locatifs.reduce((s, u) => s + u.surface, 0);
  const surfaceCommerciale = UNITS.find(u => u.category === "commercial")?.surface || 0;

  // --- Surface utile (intérieur + 50% terrasse) ---
  const surfaceTerrasseTotale = locatifs.reduce((s, u) => s + (u.terrasse || 0), 0);
  const surfaceInterieureTotale = surfaceLocative + surfaceCommerciale;
  const surfaceUtile = surfaceInterieureTotale + surfaceTerrasseTotale * 0.5;

  // --- Budget total (ameublement EN PLUS du budget de base) ---
  const baseBudget = sc.budgetTotal || BUDGET.totalTTC; // scénario peut overrider le budget
  budgetConstruction = baseBudget - coutTerrain; // recalc si budget change par scénario
  const ameublement = BUDGET.ameublementParUnite * nbUnites;

  // --- Go Siyaha Bonus Écologique ---
  const ecoEnabled = GO_SIYAHA_ECO.enabled;
  const investissementEco = ecoEnabled ? GO_SIYAHA_ECO.investissementEco : 0;
  const subventionEco = investissementEco * GO_SIYAHA_ECO.tauxSubvention; // 40%
  const coutNetEco = investissementEco - subventionEco; // coût net après subvention
  const totalProjet = baseBudget + ameublement + coutNetEco;

  // --- MDM Invest ---
  const subventionMDM = Math.min(totalProjet * MDM_INVEST.tauxSubvention, MDM_INVEST.plafond);
  const investissementNet = totalProjet - subventionMDM; // coût net investisseur après MDM
  const apportDevisesMin = totalProjet * MDM_INVEST.apportDevisesMin;

  // --- Apport = terrain (en nature) ---
  const apportTerrain = coutTerrain; // terrain + frais = apport en nature

  // --- Montant à financer ---
  const montantAFinancer = totalProjet - subventionMDM - apportTerrain;

  // --- Répartition 50/50 Tamwilkom + Banque classique ---
  const montantTamwilkom = Math.min(
    montantAFinancer / 2,
    TAMWILKOM.plafond,
    totalProjet * TAMWILKOM.maxPctProjet
  );
  const montantBanque = montantAFinancer - montantTamwilkom;

  // --- Tamwilkom : mensualité ---
  const rTK = TAMWILKOM.tauxAnnuel / 12;
  const nTK = (TAMWILKOM.dureeAns - TAMWILKOM.differeAns) * 12;
  const mensualiteTK = pmt(rTK, nTK, montantTamwilkom);
  const annuiteTK = mensualiteTK * 12;
  const interetsDiffereTK = montantTamwilkom * TAMWILKOM.tauxAnnuel;
  const coutTotalTK = (interetsDiffereTK * TAMWILKOM.differeAns) + (annuiteTK * (TAMWILKOM.dureeAns - TAMWILKOM.differeAns));

  // --- Banque classique : mensualité ---
  const rBQ = BANQUE_CLASSIQUE.tauxAnnuel / 12;
  const nBQ = (BANQUE_CLASSIQUE.dureeAns - BANQUE_CLASSIQUE.differeAns) * 12;
  const mensualiteBQ = pmt(rBQ, nBQ, montantBanque);
  const annuiteBQ = mensualiteBQ * 12;
  const coutTotalBQ = annuiteBQ * BANQUE_CLASSIQUE.dureeAns;

  // --- Montage financier (pourcentages) ---
  const pctApport = apportTerrain / totalProjet;
  const pctTamwilkom = montantTamwilkom / totalProjet;
  const pctBanque = montantBanque / totalProjet;
  const pctSubvention = subventionMDM / totalProjet;

  // --- Nuitées ---
  const nuiteesParAn = nbUnites * 365 * occ;

  // --- Amortissement bâtiment (linéaire, terrain non amortissable) ---
  // On amortit le coût de construction HT (hors terrain) sur 20 ans
  const constructionHTForAmort = budgetConstruction / 1.20; // extraction du HT depuis TTC
  const amortissementAnnuel = constructionHTForAmort / FISCALITE.amortissementAns;

  // --- Projections annuelles ---
  const projections = [];
  let cumulCF = 0; // pas d'apport cash, apport = terrain

  // --- Paramètres de répartition canaux (par scénario ou défaut) ---
  const partOTA = sc.partOTA ?? REVENUE_ASSUMPTIONS.partOTA;
  const partInformel = sc.partInformel ?? REVENUE_ASSUMPTIONS.partInformel;
  const commissionOTA = REVENUE_ASSUMPTIONS.commissionOTA;
  const nbEmployesSc = sc.nbEmployes ?? CHARGES.nbEmployes;
  const consommablesPN = sc.consommablesParNuitee ?? CHARGES.consommablesParNuitee;

  for (let y = 0; y < PROJECTION_YEARS; y++) {
    const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, y);
    const prixStudio = sc.prixNuitStudio * growth;
    const prixLoft = sc.prixNuitLoft * growth;

    // ═══ REVENUS ═══
    // Revenu brut hébergement (100% des nuitées)
    const revStudios = nbStudios * prixStudio * 365 * occ;
    const revLofts = nbLofts * prixLoft * 365 * occ;
    const revBrutHotel = revStudios + revLofts;

    // Commission OTA : ne s'applique que sur la part OTA du CA (pas 100%)
    // Réalité : 55-70% passe par Booking/Airbnb, le reste est direct ou informel
    const commissions = revBrutHotel * partOTA * commissionOTA;
    const revNetHotel = revBrutHotel - commissions;

    // Part non-déclarée (informel, cash) — pour info/affichage, pas déduite des revenus
    const revInformel = revBrutHotel * partInformel;
    // Revenu fiscal déclaré = revBrutHotel - revInformel (pour l'IS)
    const revDeclareHotel = revBrutHotel - revInformel;

    const revCommercial = sc.loyerCommercial * 12;
    const revTotal = revNetHotel + revCommercial;

    // ═══ CHARGES ═══
    // Gestion société : 20% du CA brut hébergement (sur tout le CA, pas seulement OTA)
    const gestion = revBrutHotel * CHARGES.tauxGestion;

    // Consommables : variable selon nuitées réelles (linge, amenities, produits ménage)
    const nuiteesAn = nbUnites * 365 * occ;
    let consommables = nuiteesAn * consommablesPN;
    const economieConsommablesEco = ecoEnabled ? consommables * GO_SIYAHA_ECO.reductionConsommables : 0;
    consommables -= economieConsommablesEco;

    // Comptable : forfait ANNUEL (corrigé de mensuel → annuel)
    const comptable = CHARGES.comptableAnnuel;

    // Utilities : partie fixe + partie variable (proportionnelle à l'occupation)
    const nbUnitesOccupees = nbUnites * occ; // unités occupées en moyenne
    const utilitiesMensuel = CHARGES.utilitiesFixe + (nbUnitesOccupees * CHARGES.utilitiesVarParUnite);
    let utilities = (utilitiesMensuel + CHARGES.internetTv) * 12;
    // Go Siyaha Éco : réduction des utilities si équipements installés
    const economieUtilitiesEco = ecoEnabled ? utilities * GO_SIYAHA_ECO.reductionUtilities : 0;
    utilities -= economieUtilitiesEco;

    // Salaires : concierge + ménage (+ éventuel 3e employé en optimiste)
    let masseSalariale;
    if (nbEmployesSc >= 3) {
      // 3 employés : 1 concierge + 2 ménage/linge
      masseSalariale = (CHARGES.salaireConcierge + CHARGES.salaireMenage * 2) * 12;
    } else {
      // 2 employés : 1 concierge + 1 ménage/linge
      masseSalariale = (CHARGES.salaireConcierge + CHARGES.salaireMenage) * 12;
    }
    const salaires = masseSalariale * (1 + CHARGES.chargesSociales);

    // Entretien : réduit les 5 premières années (bâtiment neuf), puis augmente
    const entretien = y < 5 ? CHARGES.entretienBase : CHARGES.entretienMature;

    // Taxe pro : exonérée les 5 premières années (nouvelle construction)
    const taxesPro = y < FISCALITE.exoTaxeProAns ? 0 : CHARGES.taxesPro;

    const chargesTotal = gestion + consommables + comptable + utilities +
      CHARGES.assurance + entretien + salaires + taxesPro + CHARGES.divers;

    const chargesDetail = {
      gestion, consommables, comptable, utilities, salaires,
      assurance: CHARGES.assurance,
      entretien: entretien,
      taxesPro: taxesPro,
      divers: CHARGES.divers,
      economieEco: economieUtilitiesEco + economieConsommablesEco,
    };

    // EBITDA
    const ebitda = revTotal - chargesTotal;
    const margeExploitation = revTotal > 0 ? ebitda / revTotal : 0;

    // Service dette Tamwilkom (capital + intérêts)
    const isDiffereTK = y < TAMWILKOM.differeAns;
    let debtTK, interetsTK, capitalTK;
    if (isDiffereTK) {
      interetsTK = interetsDiffereTK;
      capitalTK = 0;
      debtTK = interetsTK;
    } else if (y < TAMWILKOM.dureeAns) {
      debtTK = annuiteTK;
      // Approximate yearly interest on remaining balance
      const yRemb = y - TAMWILKOM.differeAns;
      const nTKMonths = (TAMWILKOM.dureeAns - TAMWILKOM.differeAns) * 12;
      let balTK = montantTamwilkom;
      for (let m = 0; m < yRemb * 12; m++) {
        const intM = balTK * rTK;
        balTK -= (mensualiteTK - intM);
      }
      let yearIntTK = 0;
      for (let m = 0; m < 12; m++) {
        const intM = balTK * rTK;
        yearIntTK += intM;
        balTK -= (mensualiteTK - intM);
      }
      interetsTK = yearIntTK;
      capitalTK = debtTK - interetsTK;
    } else {
      debtTK = 0; interetsTK = 0; capitalTK = 0;
    }

    // Service dette Banque classique (capital + intérêts)
    const isDiffereBQ = y < BANQUE_CLASSIQUE.differeAns;
    let debtBQ, interetsBQ, capitalBQ;
    if (isDiffereBQ) {
      interetsBQ = montantBanque * BANQUE_CLASSIQUE.tauxAnnuel;
      capitalBQ = 0;
      debtBQ = interetsBQ;
    } else if (y < BANQUE_CLASSIQUE.dureeAns) {
      debtBQ = annuiteBQ;
      const yRemb = y - BANQUE_CLASSIQUE.differeAns;
      let balBQ = montantBanque;
      for (let m = 0; m < yRemb * 12; m++) {
        const intM = balBQ * rBQ;
        balBQ -= (mensualiteBQ - intM);
      }
      let yearIntBQ = 0;
      for (let m = 0; m < 12; m++) {
        const intM = balBQ * rBQ;
        yearIntBQ += intM;
        balBQ -= (mensualiteBQ - intM);
      }
      interetsBQ = yearIntBQ;
      capitalBQ = debtBQ - interetsBQ;
    } else {
      debtBQ = 0; interetsBQ = 0; capitalBQ = 0;
    }

    const debtServiceTotal = debtTK + debtBQ;

    // IS — L'amortissement est une charge non-cash qui réduit le bénéfice imposable
    // Amortissement sur 20 ans (seulement pendant la durée de vie fiscale)
    const dotationAmort = y < FISCALITE.amortissementAns ? amortissementAnnuel : 0;
    const cashFlowAvantIS = ebitda - debtServiceTotal;

    // Résultat fiscal : basé sur le revenu DÉCLARÉ (hors part informelle)
    // L'IS ne s'applique que sur la part déclarée du CA hébergement
    const revDeclare = revDeclareHotel - commissions + revCommercial; // revenu déclaré total
    const ebitdaDeclare = revDeclare - chargesTotal;
    const resultatFiscal = ebitdaDeclare - debtServiceTotal - dotationAmort;
    const beneficeImposable = Math.max(0, resultatFiscal);
    const partLocale = beneficeImposable * (1 - FISCALITE.caDevisesPct);
    const is = partLocale * FISCALITE.isTaux;
    const economieIS = dotationAmort * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;

    // Cash-flow net réel (inclut la part informelle en trésorerie)
    const cashFlowNet = cashFlowAvantIS - is;
    cumulCF += cashFlowNet;

    projections.push({
      year: y + 1,
      revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
      revInformel, revDeclareHotel, partOTA, partInformel,
      chargesTotal, chargesDetail,
      ebitda, margeExploitation,
      debtTK, debtBQ, debtServiceTotal,
      interetsTK, capitalTK, interetsBQ, capitalBQ,
      dotationAmort, resultatFiscal, beneficeImposable,
      cashFlowAvantIS, is, economieIS, cashFlowNet,
      cumulCashFlow: cumulCF,
    });
  }

  // --- Métriques clés (basées sur investissement NET = après MDM) ---
  const y1 = projections[0];
  const rendementBrut = (y1.revBrutHotel + y1.revCommercial) / investissementNet;
  const rendementNet = y1.cashFlowNet / investissementNet;
  const rendementNetApport = y1.cashFlowNet / apportTerrain;
  const revpar = y1.revBrutHotel / (nbUnites * 365);
  const coutParNuitee = y1.chargesTotal / nuiteesParAn;

  // Payback (cumul CF vs apport terrain)
  const paybackIdx = projections.findIndex(p => p.cumulCashFlow >= apportTerrain);
  const paybackYear = paybackIdx >= 0 ? paybackIdx + 1 : null;

  // ═══ ADVANCED CASH-FLOW KPIs ═══

  // TRI (IRR) — Taux de Rendement Interne sur 20 ans
  // Initial investment = -apportTerrain (seul cash sorti), puis CF nets annuels
  function computeIRR(cashFlows, guess) {
    const maxIter = 100; const tol = 1e-7;
    let rate = guess || 0.10;
    for (let i = 0; i < maxIter; i++) {
      let npv = 0, dnpv = 0;
      for (let t = 0; t < cashFlows.length; t++) {
        const factor = Math.pow(1 + rate, t);
        npv += cashFlows[t] / factor;
        dnpv -= t * cashFlows[t] / (factor * (1 + rate));
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < tol) { rate = newRate; break; }
      rate = newRate;
    }
    return rate;
  }
  const irrFlows = [-apportTerrain, ...projections.map(p => p.cashFlowNet)];
  const tri = computeIRR(irrFlows, 0.10);

  // VAN (NPV) — Valeur Actuelle Nette au taux d'actualisation 8%
  const tauxActualisation = 0.08;
  let van = -apportTerrain;
  for (let t = 0; t < projections.length; t++) {
    van += projections[t].cashFlowNet / Math.pow(1 + tauxActualisation, t + 1);
  }

  // Cash-on-Cash Return An 1 (CF net / apport réel en cash = terrain)
  const cashOnCash = y1.cashFlowNet / apportTerrain;

  // CF mensuel moyen An 1
  const cfMensuelAn1 = y1.cashFlowNet / 12;

  // Marge Cash-Flow (CF net / Revenu total)
  const margeCF = y1.revTotal > 0 ? y1.cashFlowNet / y1.revTotal : 0;

  // Wealth creation — total CF cumulé sur 20 ans
  const y20 = projections[projections.length - 1];
  const wealthTotal = y20.cumulCashFlow;
  const multipleApport = wealthTotal / apportTerrain;

  // Debt Freedom Year — année où toute la dette est remboursée
  const debtFreedomIdx = projections.findIndex(p => p.debtServiceTotal === 0);
  const debtFreedomYear = debtFreedomIdx >= 0 ? debtFreedomIdx + 1 : null;

  // CF post-dette (CF moyen après libération de toute dette)
  let cfPostDebtAvg = null;
  if (debtFreedomIdx >= 0) {
    const postDebtYears = projections.slice(debtFreedomIdx);
    cfPostDebtAvg = postDebtYears.reduce((s, p) => s + p.cashFlowNet, 0) / postDebtYears.length;
  }

  // IS cumulé sur 20 ans & ratio IS/CF
  const isCumule = projections.reduce((s, p) => s + p.is, 0);
  const cfBrutCumule = projections.reduce((s, p) => s + p.cashFlowNet + p.is, 0);
  const ratioIS = cfBrutCumule > 0 ? isCumule / cfBrutCumule : 0;

  // Rendement stabilisé (moyenne Y15-Y20 = projet mature, sans dette)
  const matureYears = projections.slice(14); // Y15-Y20
  const rendementStabilise = matureYears.length > 0
    ? matureYears.reduce((s, p) => s + p.cashFlowNet, 0) / matureYears.length / apportTerrain
    : null;

  // Croissance CF Y1→Y10 et Y1→Y20
  const cfGrowthY10 = projections.length >= 10 ? (projections[9].cashFlowNet / y1.cashFlowNet - 1) : null;
  const cfGrowthY20 = (y20.cashFlowNet / y1.cashFlowNet - 1);

  // --- TVA : modélisation complète du différentiel 20% (achats) vs 10% (ventes) ---
  // Le terrain n'a PAS de TVA. Seul le budget construction est TTC (20%)
  const constructionHT = budgetConstruction / 1.20;
  const tvaConstruction = constructionHT * 0.20; // TVA payée sur construction

  // TVA déductible annuelle sur charges d'exploitation (20% sur services, 14% sur utilities)
  // Charges soumises à TVA 20%: gestion, consommables, comptable, internet, entretien, divers
  // Charges soumises à TVA 14%: eau/électricité, assurance
  // Charges sans TVA: salaires, taxe professionnelle
  const tvaProjections = [];
  let creditTVARestant = tvaConstruction; // crédit initial = TVA construction
  for (let y = 0; y < PROJECTION_YEARS; y++) {
    const p = projections[y];
    const ch = p.chargesDetail;

    // TVA collectée (10% hébergement touristique + 20% loyer commercial)
    const tvaCollecteeHotel = p.revBrutHotel * 0.10;
    const tvaCollecteeCommercial = p.revCommercial * 0.20;
    const tvaCollectee = tvaCollecteeHotel + tvaCollecteeCommercial;

    // TVA déductible sur charges (les charges sont TTC dans notre modèle)
    const tva20Charges = (ch.gestion + ch.consommables + ch.comptable + ch.entretien + ch.divers) * 0.20 / 1.20;
    const tva14Charges = (ch.utilities + ch.assurance) * 0.14 / 1.14;
    const tvaPlatformes = p.commissions * 0.20 / 1.20; // commissions plateformes = service à 20%
    const tvaDeductible = tva20Charges + tva14Charges + tvaPlatformes;

    // Solde TVA annuel = collectée - déductible
    const soldeTVA = tvaCollectee - tvaDeductible;

    // Le solde positif rembourse le crédit de construction
    if (creditTVARestant > 0 && soldeTVA > 0) {
      creditTVARestant = Math.max(0, creditTVARestant - soldeTVA);
    }

    tvaProjections.push({
      year: y + 1,
      tvaCollectee,
      tvaDeductible,
      soldeTVA,
      creditRestant: creditTVARestant,
      tvaAPayer: creditTVARestant <= 0 ? Math.max(0, soldeTVA) : 0,
    });
  }

  const tvaCollecteeAn1 = tvaProjections[0].tvaCollectee;
  const tvaDeductibleAn1 = tvaProjections[0].tvaDeductible;
  const creditTVA = tvaConstruction; // crédit total initial
  const anneesRecupCredit = tvaProjections.findIndex(t => t.creditRestant <= 0);
  const dureeRecupCredit = anneesRecupCredit >= 0 ? anneesRecupCredit + 1 : null;

  // DSCR (Debt Service Coverage Ratio) — An 1
  const dscr = y1.debtServiceTotal > 0 ? y1.ebitda / y1.debtServiceTotal : Infinity;

  // Helper: compute charges for a given occupancy (Year 1 = entretienBase, no taxePro)
  function _chargesForOcc(testOcc) {
    const testRevH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * testOcc;
    const testNuitees = nbUnites * 365 * testOcc;
    const testNbOcc = nbUnites * testOcc;
    let testUtilities = (CHARGES.utilitiesFixe + testNbOcc * CHARGES.utilitiesVarParUnite + CHARGES.internetTv) * 12;
    let testConsommables = testNuitees * consommablesPN;
    // Appliquer réductions éco si activé
    if (ecoEnabled) {
      testUtilities *= (1 - GO_SIYAHA_ECO.reductionUtilities);
      testConsommables *= (1 - GO_SIYAHA_ECO.reductionConsommables);
    }
    const testSalaires = (nbEmployesSc >= 3
      ? (CHARGES.salaireConcierge + CHARGES.salaireMenage * 2)
      : (CHARGES.salaireConcierge + CHARGES.salaireMenage)) * 12 * (1 + CHARGES.chargesSociales);
    return testRevH * CHARGES.tauxGestion + testConsommables + CHARGES.comptableAnnuel +
           testUtilities + testSalaires + CHARGES.assurance + CHARGES.entretienBase + CHARGES.divers;
  }

  // Break-even occupancy (taux d'occupation minimal pour CF net > 0)
  let breakEvenOcc = null;
  for (let testOcc = 0.10; testOcc <= 1.0; testOcc += 0.005) {
    const testRevH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * testOcc;
    const testRevN = testRevH * (1 - partOTA * commissionOTA) + sc.loyerCommercial * 12;
    const testCh = _chargesForOcc(testOcc);
    const testEbitda = testRevN - testCh;
    const testDebt = interetsDiffereTK + annuiteBQ;
    const testCFavIS = testEbitda - testDebt;
    const testResultatFiscal = testCFavIS - amortissementAnnuel;
    const testIS = Math.max(0, testResultatFiscal) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const testCF = testCFavIS - testIS;
    if (testCF >= 0) { breakEvenOcc = testOcc; break; }
  }

  // Sensibilité
  const sensitivity = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75].map(occRate => {
    const revH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * occRate;
    const revN = revH * (1 - partOTA * commissionOTA) + sc.loyerCommercial * 12;
    const ch = _chargesForOcc(occRate);
    const ebit = revN - ch;
    const debtY1 = interetsDiffereTK + annuiteBQ;
    const cfAvIS = ebit - debtY1;
    const resFiscal = cfAvIS - amortissementAnnuel;
    const impot = Math.max(0, resFiscal) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const cf = cfAvIS - impot;
    return { occ: occRate, revenu: revN, ebitda: ebit, cashFlow: cf, rendement: cf / apportTerrain };
  });

  // --- Debt projections for full loan duration (max of TK and BQ) ---
  const maxLoanYears = Math.max(TAMWILKOM.dureeAns, BANQUE_CLASSIQUE.dureeAns);
  const debtProjections = [];
  for (let y = 0; y < maxLoanYears; y++) {
    const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, y);
    const prixS = sc.prixNuitStudio * growth;
    const prixL = sc.prixNuitLoft * growth;
    const revH = (nbStudios * prixS + nbLofts * prixL) * 365 * occ;
    const revN = revH * (1 - partOTA * commissionOTA) + sc.loyerCommercial * 12;
    const gestionY = revH * CHARGES.tauxGestion;
    const nuiteesY = nbUnites * 365 * occ;
    const nbOccY = nbUnites * occ;
    let utilitiesY = (CHARGES.utilitiesFixe + nbOccY * CHARGES.utilitiesVarParUnite + CHARGES.internetTv) * 12;
    let consommablesY = nuiteesY * consommablesPN;
    if (ecoEnabled) {
      utilitiesY *= (1 - GO_SIYAHA_ECO.reductionUtilities);
      consommablesY *= (1 - GO_SIYAHA_ECO.reductionConsommables);
    }
    const salairesY = (nbEmployesSc >= 3
      ? (CHARGES.salaireConcierge + CHARGES.salaireMenage * 2)
      : (CHARGES.salaireConcierge + CHARGES.salaireMenage)) * 12 * (1 + CHARGES.chargesSociales);
    const taxesProY = y < FISCALITE.exoTaxeProAns ? 0 : CHARGES.taxesPro;
    const entretienY = y < 5 ? CHARGES.entretienBase : CHARGES.entretienMature;
    const chTotal = gestionY + consommablesY + CHARGES.comptableAnnuel + utilitiesY +
      CHARGES.assurance + entretienY + salairesY + taxesProY + CHARGES.divers;
    const ebitdaY = revN - chTotal;

    // TK debt
    const isDiffTK = y < TAMWILKOM.differeAns;
    let dTK, iTK, cTK;
    if (isDiffTK) { iTK = interetsDiffereTK; cTK = 0; dTK = iTK; }
    else if (y < TAMWILKOM.dureeAns) {
      dTK = annuiteTK;
      let bTK = montantTamwilkom;
      for (let m = 0; m < (y - TAMWILKOM.differeAns) * 12; m++) { const im = bTK * rTK; bTK -= (mensualiteTK - im); }
      let yiTK = 0;
      for (let m = 0; m < 12; m++) { const im = bTK * rTK; yiTK += im; bTK -= (mensualiteTK - im); }
      iTK = yiTK; cTK = dTK - iTK;
    } else { dTK = 0; iTK = 0; cTK = 0; }

    // BQ debt
    const isDiffBQ = y < BANQUE_CLASSIQUE.differeAns;
    let dBQ, iBQ, cBQ;
    if (isDiffBQ) { iBQ = montantBanque * BANQUE_CLASSIQUE.tauxAnnuel; cBQ = 0; dBQ = iBQ; }
    else if (y < BANQUE_CLASSIQUE.dureeAns) {
      dBQ = annuiteBQ;
      let bBQ = montantBanque;
      for (let m = 0; m < (y - BANQUE_CLASSIQUE.differeAns) * 12; m++) { const im = bBQ * rBQ; bBQ -= (mensualiteBQ - im); }
      let yiBQ = 0;
      for (let m = 0; m < 12; m++) { const im = bBQ * rBQ; yiBQ += im; bBQ -= (mensualiteBQ - im); }
      iBQ = yiBQ; cBQ = dBQ - iBQ;
    } else { dBQ = 0; iBQ = 0; cBQ = 0; }

    debtProjections.push({
      year: y + 1, ebitda: ebitdaY,
      debtTK: dTK, interetsTK: iTK, capitalTK: cTK,
      debtBQ: dBQ, interetsBQ: iBQ, capitalBQ: cBQ,
      debtServiceTotal: dTK + dBQ,
    });
  }

  return {
    terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain, constructionHTForAmort },
    amortissement: { annuel: amortissementAnnuel, duree: FISCALITE.amortissementAns, total: constructionHTForAmort },
    units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale, surfaceTerrasseTotale, surfaceInterieureTotale, surfaceUtile },
    budget: { ameublement, totalProjet, investissementNet, investissementEco, subventionEco, coutNetEco, ecoEnabled },
    financement: {
      subventionMDM, apportDevisesMin, apportTerrain,
      montantAFinancer,
      montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
      montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
      pctApport, pctTamwilkom, pctBanque, pctSubvention,
    },
    kpi: {
      rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee,
      paybackYear, nuiteesParAn, dscr, breakEvenOcc,
      // Advanced CF KPIs
      tri, van, tauxActualisation, cashOnCash, cfMensuelAn1, margeCF,
      wealthTotal, multipleApport, debtFreedomYear, cfPostDebtAvg,
      isCumule, ratioIS, rendementStabilise, cfGrowthY10, cfGrowthY20,
    },
    tva: { constructionHT, tvaConstruction, tvaCollecteeAn1, tvaDeductibleAn1, creditTVA, dureeRecupCredit, tvaProjections },
    projections,
    debtProjections,
    sensitivity,
    scenario,
  };
}

// ============================================================
// GESTION COMPARISON — Gestion propre vs Société de gestion
// ============================================================
function computeGestionComparison(scenario) {
  const sc = SCENARIOS[scenario];
  const occ = sc.tauxOccupation;

  const studios = UNITS.filter(u => u.category === "studio");
  const lofts = UNITS.filter(u => u.category === "loft");
  const nbStudios = studios.length;
  const nbLofts = lofts.length;
  const nbUnites = nbStudios + nbLofts;

  const partOTA = sc.partOTA ?? REVENUE_ASSUMPTIONS.partOTA;
  const revBrut = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * occ;
  const commissions = revBrut * partOTA * REVENUE_ASSUMPTIONS.commissionOTA;
  const revNet = revBrut - commissions;
  const revCommercial = sc.loyerCommercial * 12;
  const revTotal = revNet + revCommercial;

  // --- Charges communes (fixes, identiques dans les deux cas) ---
  const nbUnitesOcc = nbUnites * occ;
  const utilitiesMensuel = CHARGES.utilitiesFixe + (nbUnitesOcc * CHARGES.utilitiesVarParUnite);
  const utilities = (utilitiesMensuel + CHARGES.internetTv) * 12;
  const nuiteesAn = nbUnites * 365 * occ;
  const consommablesPN = sc.consommablesParNuitee ?? CHARGES.consommablesParNuitee;
  const consommables = nuiteesAn * consommablesPN;
  const assurance = CHARGES.assurance;
  const entretien = CHARGES.entretienBase; // Year 1 comparison
  const divers = CHARGES.divers;
  const chargesCommunes = utilities + consommables + assurance + entretien + divers;

  // === OPTION A : Société de gestion ===
  // Commission 20% CA brut + 2 employés (concierge + ménage)
  const gestionSociete = revBrut * CHARGES.tauxGestion;
  const comptableSociete = CHARGES.comptableAnnuel;
  const salairesSociete = (CHARGES.salaireConcierge + CHARGES.salaireMenage) * 12 * (1 + CHARGES.chargesSociales);
  const chargesSociete = gestionSociete + comptableSociete + salairesSociete + chargesCommunes;
  const ebitdaSociete = revTotal - chargesSociete;
  const margeSociete = revTotal > 0 ? ebitdaSociete / revTotal : 0;

  // === OPTION B : Gestion propre ===
  // Pas de commission société (0%), mais :
  // - 3 employés au lieu de 2 (ajout réceptionniste/manager)
  // - Salaire manager plus élevé (5,500 MAD)
  // - Comptable identique
  // - Logiciel gestion : ~500 MAD/mois (Lodgify, Guesty, etc.)
  // - Temps personnel investisseur : non chiffré (coût d'opportunité)
  const nbEmployesPropre = 3;
  const salairesPropre = (CHARGES.salaireConcierge + CHARGES.salaireMenage + 5_500) * 12 * (1 + CHARGES.chargesSociales);
  const comptablePropre = CHARGES.comptableAnnuel;
  const logicielGestion = 500 * 12; // PMS + channel manager
  const chargesPropre = salairesPropre + comptablePropre + logicielGestion + chargesCommunes;
  const ebitdaPropre = revTotal - chargesPropre;
  const margePropre = revTotal > 0 ? ebitdaPropre / revTotal : 0;

  // Différentiel
  const economiePropre = ebitdaPropre - ebitdaSociete;

  return {
    revBrut, revNet, revCommercial, revTotal,
    chargesCommunes,
    societe: {
      label: "Société de gestion",
      gestion: gestionSociete,
      salaires: salairesSociete,
      comptable: comptableSociete,
      nbEmployes: 2,
      chargesTotal: chargesSociete,
      ebitda: ebitdaSociete,
      marge: margeSociete,
      avantages: [
        "Gestion 100% déléguée — idéal résidence UAE",
        "Expertise pricing dynamique & revenue management",
        "Réseau et visibilité multi-plateformes",
        "Remplacement employés géré par la société",
        "Moins de stress opérationnel",
      ],
      inconvenients: [
        "Coût élevé (20% du CA brut hébergement)",
        "Moins de contrôle sur la qualité",
        "Intérêts potentiellement divergents",
        "Dépendance vis-à-vis d'un prestataire",
      ],
    },
    propre: {
      label: "Gestion propre",
      gestion: 0,
      salaires: salairesPropre,
      comptable: comptablePropre,
      logiciel: logicielGestion,
      nbEmployes: nbEmployesPropre,
      chargesTotal: chargesPropre,
      ebitda: ebitdaPropre,
      marge: margePropre,
      avantages: [
        "Économie significative (" + fmt(economiePropre) + " MAD/an)",
        "Contrôle total sur la qualité et les prix",
        "Relation directe avec les clients",
        "Flexibilité opérationnelle maximale",
        "Meilleure marge d'exploitation",
      ],
      inconvenients: [
        "Nécessite un manager sur place (résidence UAE)",
        "Gestion RH (3 employés à gérer à distance)",
        "Investissement temps personnel important",
        "Risque si le manager quitte",
        "Courbe d'apprentissage pricing/OTAs",
      ],
    },
    economiePropre,
    recommandation: "Pour un investisseur basé aux UAE, la société de gestion est recommandée en phase de lancement (Y1-Y2). Transition vers gestion propre avec manager de confiance envisageable Y3+ une fois la marque établie.",
  };
}

function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
