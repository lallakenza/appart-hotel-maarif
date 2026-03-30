// ============================================================
// ENGINE LAYER — Pure computation, zero DOM, zero side effects
// Takes raw data → returns computed STATE
// ============================================================
//
// CHANGELOG:
// 28/03/2026 (v58) — TVA sur intérêts bancaires :
//   - Ajout TVA 10% sur intérêts (Art. 99-2° CGI) dans TVA déductible
//   - Les taux data.js sont HT ; la banque facture TVA 10% sur intérêts
//   - Pour entreprise assujettie TVA (hôtel), cette TVA est récupérable (Art. 92 CGI)
//   - Impact : ~25K/an de TVA déductible en plus → crédit TVA absorbé plus vite
// 28/03/2026 — Intégration modèle réaliste :
//   - Saisonnalité mensuelle : boucle 12 mois × coefficients (remplace occ × 365 flat)
//   - Ramp-up An 1 : pénalise occupation (×0.65) et ADR (×0.85)
//   - Évolution canaux : OTA multiplier décroissant Y1→Y5 (canauxEvolution)
//   - Charges additionnelles : provisionRenouv, taxeHabitation, syndic, marketing, fraisCreation
//   - Valeur résiduelle : utilise tauxAppreciation (2%) au lieu de croissanceTarifs (3%)
//   - Différé banque classique : 1 an intérêts seulement (interetsDiffereBQ)
//   - Fix : partOTA scope — remonté en const après boucle projections
//   - Nouveaux champs projections : occMoyEffective, occupationMensuelle, isRampUp, nuiteesAn
// 27/03/2026 — Création initiale
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
  // Apport net = terrain - MDM cashback (ce que l'investisseur a réellement immobilisé)
  const apportNet = apportTerrain - subventionMDM;

  // --- Montant à financer ---
  // MDM Invest est remboursée à l'investisseur MRE, PAS déduite du financement bancaire
  // La banque finance sur la base du coût brut - apport terrain
  const montantAFinancer = totalProjet - apportTerrain;

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
  const interetsDiffereBQ = montantBanque * BANQUE_CLASSIQUE.tauxAnnuel;
  const coutTotalBQ = (interetsDiffereBQ * BANQUE_CLASSIQUE.differeAns) + (annuiteBQ * (BANQUE_CLASSIQUE.dureeAns - BANQUE_CLASSIQUE.differeAns));

  // --- Montage financier (pourcentages) ---
  // MDM n'est PAS dans le montage : elle est remboursée à l'investisseur après coup
  const pctApport = apportTerrain / totalProjet;
  const pctTamwilkom = montantTamwilkom / totalProjet;
  const pctBanque = montantBanque / totalProjet;
  const pctMDM = subventionMDM / totalProjet; // pour info seulement

  // --- Nuitées ---
  const nuiteesParAn = nbUnites * 365 * occ;

  // --- Amortissement bâtiment (linéaire, terrain non amortissable) ---
  // On amortit le coût de construction HT (hors terrain) sur 20 ans
  const constructionHTForAmort = budgetConstruction / 1.20; // extraction du HT depuis TTC
  const amortissementAnnuel = constructionHTForAmort / FISCALITE.amortissementAns;

  // --- Amortissement mobilier (linéaire sur 7 ans) ---
  // Le mobilier est un actif distinct amorti sur sa durée de vie
  // TVA récupérable (Art. 92-I-6° CGI) → on amortit sur le HT, pas le TTC
  const amortMobilierAns = FISCALITE.amortissementMobilierAns || 7;
  const ameubleHTForAmort = ameublement / 1.20; // extraction HT (TVA récupérable)
  const amortissementMobilier = ameubleHTForAmort / amortMobilierAns;

  // --- Projections annuelles ---
  const projections = [];
  let cumulCF = 0; // pas d'apport cash, apport = terrain

  // --- Paramètres de répartition canaux (par scénario ou défaut) ---
  const basePartOTA = sc.partOTA ?? REVENUE_ASSUMPTIONS.partOTA;
  const basePartInformel = sc.partInformel ?? REVENUE_ASSUMPTIONS.partInformel;
  const basePartDirect = sc.partDirect ?? REVENUE_ASSUMPTIONS.partDirect;
  const commissionOTA = REVENUE_ASSUMPTIONS.commissionOTA;
  const nbEmployesSc = sc.nbEmployes ?? CHARGES.nbEmployes;
  const consommablesPN = sc.consommablesParNuitee ?? CHARGES.consommablesParNuitee;

  // --- Saisonnalité & ramp-up ---
  const saisonCoeffs = REVENUE_ASSUMPTIONS.saisonnalite;
  const rampUp = REVENUE_ASSUMPTIONS.rampUp;
  const canauxEvo = REVENUE_ASSUMPTIONS.canauxEvolution;

  // --- Inflation des charges et indexation loyer ---
  const inflationCharges = REVENUE_ASSUMPTIONS.inflationCharges ?? 0;
  const indexationLoyer = REVENUE_ASSUMPTIONS.indexationLoyer ?? 0;

  for (let y = 0; y < PROJECTION_YEARS; y++) {
    const growth = Math.pow(1 + REVENUE_ASSUMPTIONS.croissanceTarifs, y);
    const inflGrowth = Math.pow(1 + inflationCharges, y); // inflation cumulée pour charges fixes

    // ═══ RAMP-UP : An 1 pénalité sur ADR ═══
    const isRampUp = y < rampUp.dureeAns;
    const rampADR = isRampUp ? rampUp.coefADR : 1.0;
    const prixStudio = sc.prixNuitStudio * growth * rampADR;
    const prixLoft = sc.prixNuitLoft * growth * rampADR;

    // ═══ SAISONNALITÉ : calcul mensuel de l'occupation effective ═══
    // Au lieu de occ × 365, on calcule mois par mois avec coefficients saisonniers
    const rampOcc = isRampUp ? rampUp.coefOccupation : 1.0;
    const occEffective = occ * rampOcc; // occupation cible ajustée ramp-up
    let nuiteesStudios = 0, nuiteesLofts = 0;
    const joursParMois = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const occupationMensuelle = []; // pour affichage futur
    for (let m = 0; m < 12; m++) {
      const occMois = Math.min(occEffective * saisonCoeffs[m], 1.0); // cap à 100%
      occupationMensuelle.push(occMois);
      nuiteesStudios += nbStudios * joursParMois[m] * occMois;
      nuiteesLofts += nbLofts * joursParMois[m] * occMois;
    }
    const occMoyEffective = occupationMensuelle.reduce((a, b) => a + b, 0) / 12;

    // ═══ ÉVOLUTION DES CANAUX PAR ANNÉE ═══
    let partOTA = basePartOTA;
    let partInformel = basePartInformel;
    if (canauxEvo.enabled) {
      const multIdx = Math.min(y, canauxEvo.otaMultiplier.length - 1);
      const otaMult = canauxEvo.otaMultiplier[multIdx];
      partOTA = Math.min(basePartOTA * otaMult, 0.90); // cap 90%
      // L'excédent OTA est pris sur la part directe (pas sur informel)
      // partDirect diminue, partInformel reste stable
    }

    // ═══ REVENUS ═══
    // Revenu brut hébergement — avec saisonnalité et ramp-up intégrés
    const revStudios = nuiteesStudios * prixStudio;
    const revLofts = nuiteesLofts * prixLoft;
    const revBrutHotel = revStudios + revLofts;

    // Commission OTA : ne s'applique que sur la part OTA du CA (pas 100%)
    const commissions = revBrutHotel * partOTA * commissionOTA;
    const revNetHotel = revBrutHotel - commissions;

    // Part non-déclarée (informel, cash) — pour info/affichage, pas déduite des revenus
    const revInformel = revBrutHotel * partInformel;
    // Revenu fiscal déclaré = revBrutHotel - revInformel (pour l'IS)
    const revDeclareHotel = revBrutHotel - revInformel;

    const revCommercial = sc.loyerCommercial * 12 * Math.pow(1 + indexationLoyer, y);
    const revTotal = revNetHotel + revCommercial;

    // ═══ CHARGES ═══
    // Gestion société : 20% du CA brut hébergement (sur tout le CA, pas seulement OTA)
    const gestion = revBrutHotel * CHARGES.tauxGestion;

    // Consommables : variable selon nuitées réelles (linge, amenities, produits ménage)
    const nuiteesAn = nuiteesStudios + nuiteesLofts; // saisonnalité + ramp-up intégrés
    let consommables = nuiteesAn * consommablesPN * inflGrowth;
    const economieConsommablesEco = ecoEnabled ? consommables * GO_SIYAHA_ECO.reductionConsommables : 0;
    consommables -= economieConsommablesEco;

    // Comptable : forfait ANNUEL (corrigé de mensuel → annuel) — indexé inflation
    const comptable = CHARGES.comptableAnnuel * inflGrowth;

    // Utilities : partie fixe + partie variable (proportionnelle à l'occupation effective) — indexés inflation
    const nbUnitesOccupees = nbUnites * occMoyEffective; // avec saisonnalité + ramp-up
    const utilitiesMensuel = (CHARGES.utilitiesFixe + (nbUnitesOccupees * CHARGES.utilitiesVarParUnite)) * inflGrowth;
    let utilities = (utilitiesMensuel + CHARGES.internetTv * inflGrowth) * 12;
    // Go Siyaha Éco : réduction des utilities si équipements installés
    const economieUtilitiesEco = ecoEnabled ? utilities * GO_SIYAHA_ECO.reductionUtilities : 0;
    utilities -= economieUtilitiesEco;

    // Salaires : concierge + ménage (+ éventuel 3e employé en optimiste) — indexés inflation
    let masseSalariale;
    if (nbEmployesSc >= 3) {
      // 3 employés : 1 concierge + 2 ménage/linge
      masseSalariale = (CHARGES.salaireConcierge + CHARGES.salaireMenage * 2) * 12;
    } else {
      // 2 employés : 1 concierge + 1 ménage/linge
      masseSalariale = (CHARGES.salaireConcierge + CHARGES.salaireMenage) * 12;
    }
    const salaires = masseSalariale * (1 + CHARGES.chargesSociales) * inflGrowth;

    // Entretien : réduit les 5 premières années (bâtiment neuf), puis augmente — indexé inflation
    const entretien = (y < 5 ? CHARGES.entretienBase : CHARGES.entretienMature) * inflGrowth;

    // Taxe pro : exonérée les 5 premières années (nouvelle construction) — indexée inflation
    const taxesPro = y < FISCALITE.exoTaxeProAns ? 0 : CHARGES.taxesPro * inflGrowth;

    // --- Coûts additionnels identifiés (rapport qualitative mars 2026) ---
    // Renouvellement mobilier : cycle 7 ans, 40K/unité
    const cycleRenouv = CHARGES.renouvellementMobilierCycle || 7;
    const renouvMobilier = (y > 0 && (y + 1) % cycleRenouv === 0)
      ? CHARGES.renouvellementMobilierParUnite * nbUnites * inflGrowth
      : 0;
    // Provisionné annuellement pour lisser l'impact dans les KPIs — indexé inflation
    const provisionRenouv = (CHARGES.renouvellementMobilierParUnite * nbUnites) / cycleRenouv * inflGrowth;

    // Taxe d'habitation + services communaux (exo 5 ans nouvelle construction) — indexée inflation
    const taxeHabitation = y < 5 ? 0 : (CHARGES.taxeHabitation || 0) * inflGrowth;

    // Budget marketing de lancement (An 1 uniquement)
    const marketingLancement = y === 0 ? (CHARGES.budgetMarketingLancement || 0) : 0;

    // Frais création SARL + autorisations (An 1 uniquement)
    const fraisCreation = y === 0 ? (CHARGES.fraisCreation || 0) : 0;

    // Syndic / charges copropriété (annuel)
    const syndic = CHARGES.syndic || 0;

    // Assurance et divers : indexés inflation
    const assurance = CHARGES.assurance * inflGrowth;
    const divers = CHARGES.divers * inflGrowth;
    // Syndic : indexé inflation (même si 0 actuellement — prêt si changement)
    const syndicInflated = syndic * inflGrowth;

    const chargesTotal = gestion + consommables + comptable + utilities +
      assurance + entretien + salaires + taxesPro + divers +
      provisionRenouv + taxeHabitation + marketingLancement + fraisCreation + syndicInflated;

    const chargesDetail = {
      gestion, consommables, comptable, utilities, salaires,
      assurance,
      entretien,
      taxesPro,
      divers,
      economieEco: economieUtilitiesEco + economieConsommablesEco,
      provisionRenouv,
      taxeHabitation,
      marketingLancement,
      fraisCreation,
      syndic: syndicInflated,
      renouvMobilier,  // dépense réelle (0 sauf année de remplacement)
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

    // Capital restant dû (solde après remboursement de l'année y)
    let soldeTK = 0;
    if (y < TAMWILKOM.dureeAns) {
      soldeTK = montantTamwilkom;
      const rembMonths = Math.min(y + 1, TAMWILKOM.dureeAns) <= TAMWILKOM.differeAns ? 0
        : (Math.min(y + 1, TAMWILKOM.dureeAns) - TAMWILKOM.differeAns) * 12;
      for (let m = 0; m < rembMonths; m++) { const im = soldeTK * rTK; soldeTK -= (mensualiteTK - im); }
      soldeTK = Math.max(0, soldeTK);
    }
    let soldeBQ = 0;
    if (y < BANQUE_CLASSIQUE.dureeAns) {
      soldeBQ = montantBanque;
      const rembMonths = Math.min(y + 1, BANQUE_CLASSIQUE.dureeAns) <= BANQUE_CLASSIQUE.differeAns ? 0
        : (Math.min(y + 1, BANQUE_CLASSIQUE.dureeAns) - BANQUE_CLASSIQUE.differeAns) * 12;
      for (let m = 0; m < rembMonths; m++) { const im = soldeBQ * rBQ; soldeBQ -= (mensualiteBQ - im); }
      soldeBQ = Math.max(0, soldeBQ);
    }
    const capitalRestantDu = soldeTK + soldeBQ;

    // IS — L'amortissement est une charge non-cash qui réduit le bénéfice imposable
    // Amortissement construction sur 20 ans + mobilier sur 7 ans
    const dotationAmortConstruction = y < FISCALITE.amortissementAns ? amortissementAnnuel : 0;
    const dotationAmortMobilier = y < amortMobilierAns ? amortissementMobilier : 0;
    const dotationAmort = dotationAmortConstruction + dotationAmortMobilier;
    const cashFlowAvantIS = ebitda - debtServiceTotal;

    // Résultat fiscal : basé sur le revenu DÉCLARÉ (hors part informelle)
    // L'IS ne s'applique que sur la part déclarée du CA hébergement
    const revDeclare = revDeclareHotel - commissions + revCommercial; // revenu déclaré total
    const ebitdaDeclare = revDeclare - chargesTotal;
    const resultatFiscal = ebitdaDeclare - debtServiceTotal - dotationAmort;
    const beneficeImposable = Math.max(0, resultatFiscal);

    // ═══ EXONÉRATION IS DEVISES — Art. 6-I-B-3° CGI Maroc ═══
    // 5 premières années : exonération totale IS sur la part CA en devises (40%)
    // Après An 5 : la part devises est taxée au taux normal (20% depuis PLF 2026)
    const exoDevisesAns = FISCALITE.exoDevisesAns || 5;
    const pctExonere = y < exoDevisesAns ? FISCALITE.caDevisesPct : 0;
    const partLocale = beneficeImposable * (1 - pctExonere);
    const is = partLocale * FISCALITE.isTaux;
    const economieIS = dotationAmort * (1 - pctExonere) * FISCALITE.isTaux;

    // Cash-flow net réel (inclut la part informelle en trésorerie)
    const cashFlowNet = cashFlowAvantIS - is;
    cumulCF += cashFlowNet;

    projections.push({
      year: y + 1,
      revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
      revInformel, revDeclareHotel, partOTA, partInformel,
      chargesTotal, chargesDetail,
      ebitda, margeExploitation,
      debtTK, debtBQ, debtServiceTotal, capitalRestantDu,
      interetsTK, capitalTK, interetsBQ, capitalBQ,
      dotationAmort, resultatFiscal, beneficeImposable,
      cashFlowAvantIS, is, economieIS, cashFlowNet,
      cumulCashFlow: cumulCF,
      // --- Nouveaux champs (analyse qualitative) ---
      occMoyEffective,         // occupation effective avec saisonnalité + ramp-up
      occupationMensuelle,     // détail mensuel [12 valeurs]
      isRampUp,                // true si année de ramp-up
      nuiteesAn,               // nuitées réelles (saisonnalité appliquée)
    });
  }

  // --- Métriques clés (basées sur totalProjet — MDM = fonds de roulement, pas réduction du coût) ---
  const y1 = projections[0];
  const rendementBrut = (y1.revBrutHotel + y1.revCommercial) / totalProjet;
  const rendementNet = y1.cashFlowNet / totalProjet;
  const rendementNetApport = y1.cashFlowNet / apportNet; // apport net = terrain - MDM cashback
  const revpar = y1.revBrutHotel / (nbUnites * 365);
  const coutParNuitee = y1.chargesTotal / (y1.nuiteesAn || nuiteesParAn);

  // Payback (cumul CF vs apport net après MDM cashback)
  const paybackIdx = projections.findIndex(p => p.cumulCashFlow >= apportNet);
  const paybackYear = paybackIdx >= 0 ? paybackIdx + 1 : null;

  // ═══ ADVANCED CASH-FLOW KPIs ═══

  // TRI (IRR) — Taux de Rendement Interne sur 20 ans
  // Initial investment = -apportNet (terrain - MDM cashback), puis CF nets annuels
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
  // Valeur résiduelle pour TRI/VAN — le bien est "revendu" fictivement à l'an 20
  // Taux distinct de la croissance tarifs : basé sur l'historique immobilier Casablanca
  // BKAM 2015-2025 : 1-1,5%/an | Avec Mondial 2030 : 2%/an (REVENUE_ASSUMPTIONS.tauxAppreciation)
  const tauxAppreciation = REVENUE_ASSUMPTIONS.tauxAppreciation ?? REVENUE_ASSUMPTIONS.croissanceTarifs;
  const valeurResiduelle = totalProjet * Math.pow(1 + tauxAppreciation, PROJECTION_YEARS);

  // TRI inclut la valeur résiduelle dans le dernier flux (convention immobilière)
  const irrFlows = [-apportNet, ...projections.map((p, i) =>
    i === projections.length - 1 ? p.cashFlowNet + valeurResiduelle : p.cashFlowNet
  )];
  const triRaw = computeIRR(irrFlows, 0.10);
  const tri = (isFinite(triRaw) && triRaw > -1 && triRaw < 10) ? triRaw : null;

  // VAN (NPV) — Valeur Actuelle Nette au taux d'actualisation 8%, avec valeur résiduelle
  const tauxActualisation = 0.08;
  let van = -apportNet;
  for (let t = 0; t < projections.length; t++) {
    const flux = t === projections.length - 1
      ? projections[t].cashFlowNet + valeurResiduelle
      : projections[t].cashFlowNet;
    van += flux / Math.pow(1 + tauxActualisation, t + 1);
  }

  // Cash-on-Cash Return An 1 (CF net / apport net = terrain - MDM)
  const cashOnCash = y1.cashFlowNet / apportNet;

  // CF mensuel moyen An 1
  const cfMensuelAn1 = y1.cashFlowNet / 12;

  // Marge Cash-Flow (CF net / Revenu total)
  const margeCF = y1.revTotal > 0 ? y1.cashFlowNet / y1.revTotal : 0;

  // Wealth creation — CF cumulé + valeur résiduelle du bien
  // valeurResiduelle et tauxAppreciation déjà calculés plus haut (pour TRI/VAN)
  const y20 = projections[projections.length - 1];
  const cumulCF20 = y20.cumulCashFlow;

  const wealthTotal = cumulCF20 + valeurResiduelle - apportNet;
  const multipleApport = wealthTotal / apportNet;

  // Breakdown wealth pour affichage
  const wealthBreakdown = {
    cumulCF: cumulCF20,
    valeurResiduelle,
    apportNet,
    tauxAppreciation,
    total: wealthTotal,
  };

  // ═══ WEALTH MILESTONES — Y5, Y10, Y15, Y20 ═══
  // Capital investi total de l'utilisateur (apport en devises)
  const capitalInvesti = 2_500_000; // 2.5 MDH en devises étrangères

  // Equity build-up: property value + cumul CF - remaining debt
  const wealthMilestones = [5, 10, 15, 20].map(year => {
    const idx = Math.min(year - 1, projections.length - 1);
    const p = projections[idx];
    const propValue = totalProjet * Math.pow(1 + tauxAppreciation, year);
    const equity = propValue - p.capitalRestantDu; // valeur bien - dette restante
    const cumulCash = p.cumulCashFlow;
    const totalWealth = equity + cumulCash;
    const multiple = totalWealth / capitalInvesti;
    return { year, propValue, equity, cumulCash, totalWealth, multiple, debtRemaining: p.capitalRestantDu };
  });

  // Comparaison alternatives sur même horizon (sur capitalInvesti = 2.5 MDH)
  const altRates = [
    { name: "Livret épargne UAE", rate: 0.0625 },
    { name: "SCPI Europe (6%)", rate: 0.06 },
    { name: "Bourse MASI (8%)", rate: 0.08 },
    { name: "Bourse S&P 500 (10%)", rate: 0.10 },
  ];
  const altComparisons = altRates.map(alt => ({
    name: alt.name,
    rate: alt.rate,
    milestones: [5, 10, 15, 20].map(y => ({
      year: y,
      value: capitalInvesti * Math.pow(1 + alt.rate, y),
    })),
  }));

  // Wealth trajectory year by year (for chart)
  const wealthTrajectory = projections.map((p, i) => {
    const year = i + 1;
    const propValue = totalProjet * Math.pow(1 + tauxAppreciation, year);
    const equity = propValue - p.capitalRestantDu;
    return {
      year,
      projectWealth: equity + p.cumulCashFlow,
      epargne: capitalInvesti * Math.pow(1 + 0.0625, year),
      scpi: capitalInvesti * Math.pow(1 + 0.06, year),
      bourse: capitalInvesti * Math.pow(1 + 0.08, year),
      sp500: capitalInvesti * Math.pow(1 + 0.10, year),
    };
  });

  // ═══ WEALTH BUILDING PER MONTH — Le vrai KPI ═══
  // Décomposition : cash-flow net + remboursement capital (equity) + appréciation du bien
  // Appréciation composée : valeur(n) - valeur(n-1) = totalProjet × [(1+taux)^n - (1+taux)^(n-1)]
  const wealthBuildingByYear = projections.map((p, i) => {
    const cfNet = p.cashFlowNet;
    const equityPaydown = p.capitalTK + p.capitalBQ; // principal remboursé = equity construite
    const valeurFinAnnee = totalProjet * Math.pow(1 + tauxAppreciation, i + 1);
    const valeurDebutAnnee = totalProjet * Math.pow(1 + tauxAppreciation, i);
    const appreciation = valeurFinAnnee - valeurDebutAnnee; // appréciation composée de l'année
    const totalAnnuel = cfNet + equityPaydown + appreciation;
    return {
      year: i + 1,
      cfNet,
      equityPaydown,
      appreciation,
      totalAnnuel,
      totalMensuel: totalAnnuel / 12,
      cfNetMensuel: cfNet / 12,
      equityMensuel: equityPaydown / 12,
      appreciationMensuel: appreciation / 12,
    };
  });
  // KPI principal : moyenne An 1-5 et An 11-20 pour montrer la progression
  const wbAvgY1_5 = wealthBuildingByYear.slice(0, 5).reduce((s, w) => s + w.totalMensuel, 0) / 5;
  const wbAvgY6_10 = wealthBuildingByYear.slice(5, 10).reduce((s, w) => s + w.totalMensuel, 0) / 5;
  const wbAvgY11_20 = wealthBuildingByYear.slice(10, 20).reduce((s, w) => s + w.totalMensuel, 0) / 10;
  // Headline KPI : wealth building moyen sur 20 ans
  const wbAvg20 = wealthBuildingByYear.reduce((s, w) => s + w.totalMensuel, 0) / 20;

  // CF mensuel moyen par tranche
  const cfMoyenY1_5 = projections.slice(0, 5).reduce((s, p) => s + p.cashFlowNet, 0) / 5 / 12;
  const cfMoyenY6_10 = projections.slice(5, 10).reduce((s, p) => s + p.cashFlowNet, 0) / 5 / 12;
  const cfMoyenY11_20 = projections.slice(10, 20).reduce((s, p) => s + p.cashFlowNet, 0) / 10 / 12;

  // ═══ DAY 1 EQUITY — Construction groupée vs achat individuel ═══
  // TVA récupérée sur construction + ameublement (opérateur commercial, Art. 92-I-6° CGI)
  const tvaRecupereeEst = constructionHTForAmort * 0.20 + ameublement / 1.20 * 0.20; // construction + mobilier
  // Coût net après récupération TVA (construction revient au HT, ameublement idem)
  const coutConstructionNetTVA = budgetConstruction - constructionHTForAmort * 0.20; // = HT construction
  const ameubleNetTVA = ameublement - ameublement / 1.20 * 0.20; // = HT ameublement
  const coutTotalNetTVA = coutTerrain + coutConstructionNetTVA + ameubleNetTVA + (ecoEnabled ? coutNetEco : 0);
  // Coût par unité après récupération TVA
  const coutRevientParUnite = totalProjet / nbUnites;
  const coutRevientNetTVAParUnite = coutTotalNetTVA / nbUnites;
  // Surface locative
  const surfaceMoyenne = surfaceLocative / nbUnites;
  // Coût par m² de revient
  const coutM2RevientBrut = coutRevientParUnite / surfaceMoyenne;
  const coutM2RevientNetTVA = coutRevientNetTVAParUnite / surfaceMoyenne;
  // Prix marché pour un immeuble de rapport opérationnel en Maarif :
  // Méthode capitalisation des revenus : valeur = NOI / cap rate
  // NOI An 2 (stabilisé) : EBITDA An 2 (ramp-up terminé)
  const ebitdaAn2 = projections.length >= 2 ? projections[1].ebitda : projections[0].ebitda;
  const capRateMarche = 0.07; // 7% cap rate Maarif commercial — benchmark immo locatif Casa
  const valeurMarcheCapitalisation = ebitdaAn2 / capRateMarche;
  // Avantage construction groupée = valeur marché capitalisation vs coût réel
  const equityJour1 = valeurMarcheCapitalisation - totalProjet;
  const equityApresTVA = valeurMarcheCapitalisation - coutTotalNetTVA;

  const day1Equity = {
    coutRevientParUnite,
    coutRevientNetTVAParUnite,
    surfaceMoyenne,
    coutM2RevientBrut,
    coutM2RevientNetTVA,
    coutTotalNetTVA,
    tvaRecuperee: tvaRecupereeEst,
    valeurMarcheCapitalisation,
    capRateMarche,
    ebitdaAn2,
    equityJour1,
    equityApresTVA,
    equityJour1Pct: totalProjet > 0 ? equityJour1 / totalProjet : 0,
  };

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
    ? matureYears.reduce((s, p) => s + p.cashFlowNet, 0) / matureYears.length / apportNet
    : null;

  // Croissance CF Y1→Y10 et Y1→Y20
  const cfGrowthY10 = projections.length >= 10 ? (projections[9].cashFlowNet / y1.cashFlowNet - 1) : null;
  const cfGrowthY20 = (y20.cashFlowNet / y1.cashFlowNet - 1);

  // --- TVA : modélisation complète du différentiel 20% (achats) vs 10% (ventes) ---
  // Le terrain n'a PAS de TVA. Seul le budget construction est TTC (20%)
  const constructionHT = budgetConstruction / 1.20;
  const tvaConstruction = constructionHT * 0.20; // TVA payée sur construction
  // TVA sur ameublement — récupérable via Art. 92-I-6° CGI (36 mois)
  const ameubleHT = ameublement / 1.20;
  const tvaAmeublement = ameubleHT * 0.20;
  const tvaTotaleRecuperable = tvaConstruction + tvaAmeublement;

  // TVA déductible annuelle sur charges d'exploitation (20% sur services, 14% sur utilities)
  // Charges soumises à TVA 20%: gestion, consommables, comptable, internet, entretien, divers
  // Charges soumises à TVA 14%: eau/électricité, assurance
  // Charges sans TVA: salaires, taxe professionnelle
  const tvaProjections = [];
  let creditTVARestant = tvaTotaleRecuperable; // crédit initial = TVA construction + ameublement
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

    // TVA sur intérêts bancaires (10%, Art. 99-2° CGI)
    // Les taux dans data.js sont HT. La banque facture TVA 10% sur les intérêts.
    // Pour une entreprise assujettie TVA (hôtel 10%), cette TVA est déductible (Art. 92 CGI).
    // On utilise les intérêts HT déjà calculés dans les projections.
    const tvaInteretsBancaires = (p.interetsTK + p.interetsBQ) * 0.10;

    const tvaDeductible = tva20Charges + tva14Charges + tvaPlatformes + tvaInteretsBancaires;

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
      tvaInteretsBancaires,  // pour affichage détaillé
      soldeTVA,
      creditRestant: creditTVARestant,
      tvaAPayer: creditTVARestant <= 0 ? Math.max(0, soldeTVA) : 0,
    });
  }

  const tvaCollecteeAn1 = tvaProjections[0].tvaCollectee;
  const tvaDeductibleAn1 = tvaProjections[0].tvaDeductible;
  const creditTVA = tvaTotaleRecuperable; // crédit total initial (construction + ameublement)
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
    // Charges manquantes identifiées par l'audit :
    const cycleRenouv = CHARGES.renouvellementMobilierCycle || 7;
    const testProvisionRenouv = (CHARGES.renouvellementMobilierParUnite * nbUnites) / cycleRenouv;
    const testMarketingLancement = CHARGES.budgetMarketingLancement || 0; // An 1
    const testFraisCreation = CHARGES.fraisCreation || 0; // An 1
    const testSyndic = CHARGES.syndic || 0;
    // taxeHabitation = 0 en An 1 (exonération 5 ans)

    return testRevH * CHARGES.tauxGestion + testConsommables + CHARGES.comptableAnnuel +
           testUtilities + testSalaires + CHARGES.assurance + CHARGES.entretienBase + CHARGES.divers +
           testProvisionRenouv + testMarketingLancement + testFraisCreation + testSyndic;
  }

  // Répartition canaux hors boucle (pour break-even, sensibilité, debt projections)
  const partOTA = basePartOTA;

  // Break-even occupancy (taux d'occupation minimal pour CF net > 0)
  let breakEvenOcc = null;
  for (let testOcc = 0.10; testOcc <= 1.0; testOcc += 0.005) {
    const testRevH = (nbStudios * sc.prixNuitStudio + nbLofts * sc.prixNuitLoft) * 365 * testOcc;
    const testRevN = testRevH * (1 - partOTA * commissionOTA) + sc.loyerCommercial * 12;
    const testCh = _chargesForOcc(testOcc);
    const testEbitda = testRevN - testCh;
    const testDebt = interetsDiffereTK + interetsDiffereBQ;
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
    const debtY1 = interetsDiffereTK + interetsDiffereBQ;
    const cfAvIS = ebit - debtY1;
    const resFiscal = cfAvIS - amortissementAnnuel;
    const impot = Math.max(0, resFiscal) * (1 - FISCALITE.caDevisesPct) * FISCALITE.isTaux;
    const cf = cfAvIS - impot;
    return { occ: occRate, revenu: revN, ebitda: ebit, cashFlow: cf, rendement: cf / apportNet };
  });

  // --- Debt projections for full loan duration (max of TK and BQ) ---
  // Réutilise l'EBITDA des projections principales (saisonnalité + ramp-up + charges complètes)
  const maxLoanYears = Math.max(TAMWILKOM.dureeAns, BANQUE_CLASSIQUE.dureeAns);
  const debtProjections = [];
  for (let y = 0; y < maxLoanYears; y++) {
    // EBITDA : prendre des projections principales si disponible (cohérence saisonnalité/ramp-up)
    const ebitdaY = y < projections.length ? projections[y].ebitda : projections[projections.length - 1].ebitda;

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
      subventionMDM, apportDevisesMin, apportTerrain, apportNet,
      montantAFinancer,
      montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
      montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
      pctApport, pctTamwilkom, pctBanque, pctMDM,
    },
    kpi: {
      rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee,
      paybackYear, nuiteesParAn, dscr, breakEvenOcc,
      // Advanced CF KPIs
      tri, van, tauxActualisation, cashOnCash, cfMensuelAn1, margeCF,
      wealthTotal, wealthBreakdown, multipleApport, debtFreedomYear, cfPostDebtAvg,
      isCumule, ratioIS, rendementStabilise, cfGrowthY10, cfGrowthY20,
      // Wealth building
      capitalInvesti, wealthMilestones, altComparisons, wealthTrajectory,
      wealthBuildingByYear, wbAvg20, wbAvgY1_5, wbAvgY6_10, wbAvgY11_20,
      cfMoyenY1_5, cfMoyenY6_10, cfMoyenY11_20,
      day1Equity,
    },
    tva: { constructionHT, tvaConstruction, tvaAmeublement, tvaTotaleRecuperable, tvaCollecteeAn1, tvaDeductibleAn1, creditTVA, dureeRecupCredit, tvaProjections },
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

// ============================================================
// CHARGE VARIANT — Compares current charges vs. "charges réduites"
// Runs compute() twice: once with current params, once with overrides
// Returns delta on key metrics without mutating global state
// ============================================================
// ============================================================
// GESTION DUEL — Full 20-year comparison: Auto-géré vs Société de gestion
// Each mode runs compute() with appropriate charge overrides
// ============================================================
function computeGestionDuel(scenario) {
  const saved = {
    assurance: CHARGES.assurance,
    internetTv: CHARGES.internetTv,
    divers: CHARGES.divers,
    tauxGestion: CHARGES.tauxGestion,
    nbEmployes: CHARGES.nbEmployes,
    salaireConcierge: CHARGES.salaireConcierge,
    salaireMenage: CHARGES.salaireMenage,
  };

  // ── MODE A : Gestion personnelle (auto-géré depuis UAE) ──
  // Pas de commission gestion, charges réduites (négociation directe)
  // 2 employés (concierge + ménage), pas de manager supplémentaire
  // L'investisseur gère pricing/OTA/coordination depuis UAE
  CHARGES.tauxGestion = 0;
  CHARGES.assurance = 13_000;       // Négociation bâtiment neuf
  CHARGES.internetTv = 833;         // ~10K/an, IPTV économique
  CHARGES.divers = 10_000;          // Optimisation divers
  const autoGere = compute(scenario);

  // ── MODE B : Société de gestion (propriétaire passif) ──
  // Commission 20% du CA hébergement brut (HouseBooking, local)
  // Charges standard (pas d'optimisation, la société gère les contrats)
  // 2 employés (fournis/supervisés par la société)
  CHARGES.tauxGestion = 0.20;       // Standard société de gestion Maroc
  CHARGES.assurance = saved.assurance;
  CHARGES.internetTv = saved.internetTv;
  CHARGES.divers = saved.divers;
  const societeGestion = compute(scenario);

  // Restore original values
  Object.assign(CHARGES, saved);

  return { autoGere, societeGestion };
}

function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
