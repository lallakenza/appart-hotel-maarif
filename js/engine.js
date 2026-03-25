// ============================================================
// ENGINE LAYER — Pure computation, zero DOM, zero side effects
// Takes raw data → returns computed STATE
// ============================================================

function compute(scenario) {
  const occ = SCENARIOS[scenario].tauxOccupation;

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

  // --- MDM Invest ---
  const subventionMDM = Math.min(BUDGET.totalTTC * MDM_INVEST.tauxSubvention, MDM_INVEST.plafond);
  const apportDevisesMin = BUDGET.totalTTC * MDM_INVEST.apportDevisesMin;

  // --- MDM Tamwil mensualité ---
  const r = MDM_TAMWIL.tauxAnnuel / 12;
  const n = (MDM_TAMWIL.dureeAns - MDM_TAMWIL.differeAns) * 12;
  const mensualite = n > 0 ? (MDM_TAMWIL.montant * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const annuite = mensualite * 12;
  const interetsDiffere = MDM_TAMWIL.montant * MDM_TAMWIL.tauxAnnuel;
  const coutTotalCredit = (interetsDiffere * MDM_TAMWIL.differeAns) + (annuite * (MDM_TAMWIL.dureeAns - MDM_TAMWIL.differeAns));

  // --- Montage financier ---
  const apportPersonnel = BUDGET.totalTTC - subventionMDM - MDM_TAMWIL.montant;
  const pctApport = apportPersonnel / BUDGET.totalTTC;
  const pctCredit = MDM_TAMWIL.montant / BUDGET.totalTTC;
  const pctSubvention = subventionMDM / BUDGET.totalTTC;

  // --- Nuitées ---
  const nuiteesParAn = nbUnites * 365 * occ;

  // --- Projections annuelles ---
  const projections = [];
  let cumulCF = -apportPersonnel;

  for (let y = 0; y < PROJECTION_YEARS; y++) {
    const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, y);
    const prixStudio = REVENUE_ASSUMPTIONS.prixNuitStudio * growth;
    const prixLoft = REVENUE_ASSUMPTIONS.prixNuitLoft * growth;

    // Revenus
    const revStudios = nbStudios * prixStudio * 365 * occ;
    const revLofts = nbLofts * prixLoft * 365 * occ;
    const revBrutHotel = revStudios + revLofts;
    const commissions = revBrutHotel * REVENUE_ASSUMPTIONS.commissionPlatformes;
    const revNetHotel = revBrutHotel - commissions;
    const revCommercial = REVENUE_ASSUMPTIONS.loyerCommercial * 12;
    const revTotal = revNetHotel + revCommercial;

    // Charges
    const menage = CHARGES.menageLinge * nuiteesParAn;
    const utilities = (CHARGES.eauElectricite + CHARGES.internetTv) * 12;
    const salaires = CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales);
    const chargesTotal = menage + utilities + CHARGES.assurance + CHARGES.entretien + salaires + CHARGES.taxesPro + CHARGES.divers;

    const chargesDetail = {
      menage, utilities, salaires,
      assurance: CHARGES.assurance,
      entretien: CHARGES.entretien,
      taxesPro: CHARGES.taxesPro,
      divers: CHARGES.divers,
    };

    // EBITDA
    const ebitda = revTotal - chargesTotal;
    const margeExploitation = revTotal > 0 ? ebitda / revTotal : 0;

    // Service dette
    const isDiffere = y < MDM_TAMWIL.differeAns;
    const debtService = isDiffere ? interetsDiffere : annuite;
    const isPostCredit = y >= MDM_TAMWIL.dureeAns;
    const debtServiceEffective = isPostCredit ? 0 : debtService;

    // IS (simplifié)
    const cashFlowAvantIS = ebitda - debtServiceEffective;
    const beneficeImposable = Math.max(0, cashFlowAvantIS);
    const partLocale = beneficeImposable * (1 - FISCALITE.caDevisesPct);
    const is = partLocale * FISCALITE.isTaux;
    const economieIS = beneficeImposable * FISCALITE.caDevisesPct * FISCALITE.isTaux;

    // Cash-flow net
    const cashFlowNet = cashFlowAvantIS - is;
    cumulCF += cashFlowNet;

    projections.push({
      year: y + 1,
      revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
      chargesTotal, chargesDetail,
      ebitda, margeExploitation,
      isDiffere, isPostCredit, debtServiceEffective,
      cashFlowAvantIS, is, economieIS, cashFlowNet,
      cumulCashFlow: cumulCF,
    });
  }

  // --- Métriques clés ---
  const y1 = projections[0];
  const rendementBrut = (y1.revBrutHotel + y1.revCommercial) / BUDGET.totalTTC;
  const rendementNet = y1.cashFlowNet / BUDGET.totalTTC;
  const rendementNetApport = y1.cashFlowNet / apportPersonnel;
  const revpar = y1.revBrutHotel / (nbUnites * 365);
  const coutParNuitee = y1.chargesTotal / nuiteesParAn;

  // Payback
  const paybackIdx = projections.findIndex(p => p.cumulCashFlow >= 0);
  const paybackYear = paybackIdx >= 0 ? paybackIdx + 1 : null;

  // TVA
  const tvaConstruction = budgetConstruction * 0.20 * 0.5; // estimation
  const tvaCollecteeAn1 = y1.revBrutHotel * FISCALITE.tvaTaux;
  const creditTVA = Math.max(0, tvaConstruction - tvaCollecteeAn1);

  // Sensibilité
  const sensitivity = [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75].map(occRate => {
    const nuitees = nbUnites * 365 * occRate;
    const revH = (nbStudios * REVENUE_ASSUMPTIONS.prixNuitStudio + nbLofts * REVENUE_ASSUMPTIONS.prixNuitLoft) * 365 * occRate;
    const revN = revH * (1 - REVENUE_ASSUMPTIONS.commissionPlatformes) + REVENUE_ASSUMPTIONS.loyerCommercial * 12;
    const ch = CHARGES.menageLinge * nuitees + (CHARGES.eauElectricite + CHARGES.internetTv) * 12 +
               CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales) +
               CHARGES.assurance + CHARGES.entretien + CHARGES.taxesPro + CHARGES.divers;
    const ebit = revN - ch;
    const debt = interetsDiffere; // année 1
    const cfAvIS = ebit - debt;
    const impot = Math.max(0, cfAvIS) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const cf = cfAvIS - impot;
    return { occ: occRate, revenu: revN, ebitda: ebit, cashFlow: cf, rendement: cf / apportPersonnel };
  });

  return {
    terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain },
    units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale },
    financement: { subventionMDM, apportDevisesMin, mensualite, annuite, interetsDiffere, coutTotalCredit, apportPersonnel, pctApport, pctCredit, pctSubvention },
    kpi: { rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee, paybackYear, nuiteesParAn },
    tva: { tvaConstruction, tvaCollecteeAn1, creditTVA },
    projections,
    sensitivity,
    scenario,
  };
}
