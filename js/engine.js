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
  const budgetConstruction = BUDGET.totalTTC - coutTerrain;
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

  // --- Budget total (ameublement inclus dans totalTTC) ---
  const ameublement = BUDGET.ameublementParUnite * nbUnites;
  const totalProjet = BUDGET.totalTTC; // 7M TTC tout compris

  // --- MDM Invest ---
  const subventionMDM = Math.min(totalProjet * MDM_INVEST.tauxSubvention, MDM_INVEST.plafond);
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

  for (let y = 0; y < PROJECTION_YEARS; y++) {
    const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, y);
    const prixStudio = sc.prixNuitStudio * growth;
    const prixLoft = sc.prixNuitLoft * growth;

    // Revenus
    const revStudios = nbStudios * prixStudio * 365 * occ;
    const revLofts = nbLofts * prixLoft * 365 * occ;
    const revBrutHotel = revStudios + revLofts;
    const commissions = revBrutHotel * REVENUE_ASSUMPTIONS.commissionPlatformes;
    const revNetHotel = revBrutHotel - commissions;
    const revCommercial = sc.loyerCommercial * 12;
    const revTotal = revNetHotel + revCommercial;

    // Charges
    const gestion = revBrutHotel * CHARGES.tauxGestion;        // 20% du CA hébergement brut
    const consommables = CHARGES.consommables * 12;
    const comptable = CHARGES.comptable * 12;
    const utilities = (CHARGES.eauElectricite + CHARGES.internetTv) * 12;
    const salaires = CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales);
    // Taxe pro : exonérée les 5 premières années (nouvelle construction)
    const taxesPro = y < FISCALITE.exoTaxeProAns ? 0 : CHARGES.taxesPro;
    const chargesTotal = gestion + consommables + comptable + utilities +
      CHARGES.assurance + CHARGES.entretien + salaires + taxesPro + CHARGES.divers;

    const chargesDetail = {
      gestion, consommables, comptable, utilities, salaires,
      assurance: CHARGES.assurance,
      entretien: CHARGES.entretien,
      taxesPro: taxesPro,
      divers: CHARGES.divers,
    };

    // EBITDA
    const ebitda = revTotal - chargesTotal;
    const margeExploitation = revTotal > 0 ? ebitda / revTotal : 0;

    // Service dette Tamwilkom
    const isDiffereTK = y < TAMWILKOM.differeAns;
    const debtTK = isDiffereTK ? interetsDiffereTK : (y < TAMWILKOM.dureeAns ? annuiteTK : 0);

    // Service dette Banque classique
    const isDiffereBQ = y < BANQUE_CLASSIQUE.differeAns;
    const debtBQ = isDiffereBQ ? (montantBanque * BANQUE_CLASSIQUE.tauxAnnuel) : (y < BANQUE_CLASSIQUE.dureeAns ? annuiteBQ : 0);

    const debtServiceTotal = debtTK + debtBQ;

    // IS — L'amortissement est une charge non-cash qui réduit le bénéfice imposable
    // Amortissement sur 20 ans (seulement pendant la durée de vie fiscale)
    const dotationAmort = y < FISCALITE.amortissementAns ? amortissementAnnuel : 0;
    const cashFlowAvantIS = ebitda - debtServiceTotal;
    // Le bénéfice fiscal déduit l'amortissement (non-cash) et le service de dette
    const resultatFiscal = ebitda - debtServiceTotal - dotationAmort;
    const beneficeImposable = Math.max(0, resultatFiscal);
    const partLocale = beneficeImposable * (1 - FISCALITE.caDevisesPct);
    const is = partLocale * FISCALITE.isTaux;
    const economieIS = dotationAmort * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux; // économie grâce à l'amortissement

    // Cash-flow net (amortissement = non-cash, ne sort pas de la trésorerie)
    const cashFlowNet = cashFlowAvantIS - is;
    cumulCF += cashFlowNet;

    projections.push({
      year: y + 1,
      revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
      chargesTotal, chargesDetail,
      ebitda, margeExploitation,
      debtTK, debtBQ, debtServiceTotal,
      dotationAmort, resultatFiscal, beneficeImposable,
      cashFlowAvantIS, is, economieIS, cashFlowNet,
      cumulCashFlow: cumulCF,
    });
  }

  // --- Métriques clés ---
  const y1 = projections[0];
  const rendementBrut = (y1.revBrutHotel + y1.revCommercial) / totalProjet;
  const rendementNet = y1.cashFlowNet / totalProjet;
  const rendementNetApport = y1.cashFlowNet / apportTerrain;
  const revpar = y1.revBrutHotel / (nbUnites * 365);
  const coutParNuitee = y1.chargesTotal / nuiteesParAn;

  // Payback (cumul CF vs apport terrain)
  const paybackIdx = projections.findIndex(p => p.cumulCashFlow >= apportTerrain);
  const paybackYear = paybackIdx >= 0 ? paybackIdx + 1 : null;

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

  // Break-even occupancy (taux d'occupation minimal pour CF net > 0)
  // On cherche le taux où cashFlowNet = 0 en An 1
  let breakEvenOcc = null;
  for (let testOcc = 0.10; testOcc <= 1.0; testOcc += 0.005) {
    const testRevH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * testOcc;
    const testRevN = testRevH * (1 - REVENUE_ASSUMPTIONS.commissionPlatformes) + sc.loyerCommercial * 12;
    const testCh = testRevH * CHARGES.tauxGestion + CHARGES.consommables * 12 + CHARGES.comptable * 12 +
                   (CHARGES.eauElectricite + CHARGES.internetTv) * 12 +
                   CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales) +
                   CHARGES.assurance + CHARGES.entretien + CHARGES.divers;
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
    const nuitees = nbUnites * 365 * occRate;
    const revH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * occRate;
    const revN = revH * (1 - REVENUE_ASSUMPTIONS.commissionPlatformes) + sc.loyerCommercial * 12;
    const ch = revH * CHARGES.tauxGestion + CHARGES.consommables * 12 + CHARGES.comptable * 12 +
               (CHARGES.eauElectricite + CHARGES.internetTv) * 12 +
               CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales) +
               CHARGES.assurance + CHARGES.entretien + CHARGES.divers; // taxe pro exonérée An 1
    const ebit = revN - ch;
    const debtY1 = interetsDiffereTK + annuiteBQ; // année 1
    const cfAvIS = ebit - debtY1;
    const resFiscal = cfAvIS - amortissementAnnuel;
    const impot = Math.max(0, resFiscal) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const cf = cfAvIS - impot;
    return { occ: occRate, revenu: revN, ebitda: ebit, cashFlow: cf, rendement: cf / apportTerrain };
  });

  return {
    terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain, constructionHTForAmort },
    amortissement: { annuel: amortissementAnnuel, duree: FISCALITE.amortissementAns, total: constructionHTForAmort },
    units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale },
    budget: { ameublement, totalProjet },
    financement: {
      subventionMDM, apportDevisesMin, apportTerrain,
      montantAFinancer,
      montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
      montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
      pctApport, pctTamwilkom, pctBanque, pctSubvention,
    },
    kpi: { rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee, paybackYear, nuiteesParAn, dscr, breakEvenOcc },
    tva: { constructionHT, tvaConstruction, tvaCollecteeAn1, tvaDeductibleAn1, creditTVA, dureeRecupCredit, tvaProjections },
    projections,
    sensitivity,
    scenario,
  };
}
