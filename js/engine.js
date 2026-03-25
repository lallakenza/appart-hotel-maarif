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

    // Service dette Tamwilkom
    const isDiffereTK = y < TAMWILKOM.differeAns;
    const debtTK = isDiffereTK ? interetsDiffereTK : (y < TAMWILKOM.dureeAns ? annuiteTK : 0);

    // Service dette Banque classique
    const isDiffereBQ = y < BANQUE_CLASSIQUE.differeAns;
    const debtBQ = isDiffereBQ ? (montantBanque * BANQUE_CLASSIQUE.tauxAnnuel) : (y < BANQUE_CLASSIQUE.dureeAns ? annuiteBQ : 0);

    const debtServiceTotal = debtTK + debtBQ;

    // IS (simplifié)
    const cashFlowAvantIS = ebitda - debtServiceTotal;
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
      debtTK, debtBQ, debtServiceTotal,
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

  // TVA
  const tvaConstruction = budgetConstruction * 0.20 * 0.5;
  const tvaCollecteeAn1 = y1.revBrutHotel * FISCALITE.tvaTaux;
  const creditTVA = Math.max(0, tvaConstruction - tvaCollecteeAn1);

  // Sensibilité
  const sensitivity = [0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75].map(occRate => {
    const nuitees = nbUnites * 365 * occRate;
    const revH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * occRate;
    const revN = revH * (1 - REVENUE_ASSUMPTIONS.commissionPlatformes) + sc.loyerCommercial * 12;
    const ch = CHARGES.menageLinge * nuitees + (CHARGES.eauElectricite + CHARGES.internetTv) * 12 +
               CHARGES.salaireEmploye * CHARGES.nbEmployes * 12 * (1 + CHARGES.chargesSociales) +
               CHARGES.assurance + CHARGES.entretien + CHARGES.taxesPro + CHARGES.divers;
    const ebit = revN - ch;
    const debtY1 = interetsDiffereTK + annuiteBQ; // année 1
    const cfAvIS = ebit - debtY1;
    const impot = Math.max(0, cfAvIS) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const cf = cfAvIS - impot;
    return { occ: occRate, revenu: revN, ebitda: ebit, cashFlow: cf, rendement: cf / apportTerrain };
  });

  return {
    terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain },
    units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale },
    budget: { ameublement, totalProjet },
    financement: {
      subventionMDM, apportDevisesMin, apportTerrain,
      montantAFinancer,
      montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
      montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
      pctApport, pctTamwilkom, pctBanque, pctSubvention,
    },
    kpi: { rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee, paybackYear, nuiteesParAn },
    tva: { tvaConstruction, tvaCollecteeAn1, creditTVA },
    projections,
    sensitivity,
    scenario,
  };
}
