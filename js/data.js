// ============================================================
// DATA LAYER — Raw project data, zero computation
// All amounts in MAD, all rates as decimals
// Sources citées pour chaque hypothèse
// ============================================================

const PROJECT = {
  name: "Résidence de Tourisme Maarif",
  location: "Rue des Camélias, Maarif, Casablanca",
  zone: "Zone B - Secteur B5",
  titreFoncier: "17527/d",
  structure: "R+5",
  architect: "Jad (Nour Architects)",
  coords: { lat: 33.5741, lng: -7.6437 },
  mapsUrl: "https://maps.app.goo.gl/zbgcXaV5d1qjkkYG7",
  residenceFiscale: "UAE",
};

// ======= PLANNING =======
const PLANNING = {
  delaiAutorisationsPret: 6,   // mois — obtention permis + déblocage prêt
  delaiConstruction: 16,       // mois
  get delaiTotal() { return this.delaiAutorisationsPret + this.delaiConstruction; }, // 22 mois
};

// ======= TERRAIN =======
const TERRAIN = {
  surface: 174,           // m²
  prix: 2_300_000,        // MAD hors frais (prix ferme)
  fraisAcquisition: 0.065, // enregistrement 4% + conservation 1.5% + notaire ~1%
};

// ======= BUDGET =======
const BUDGET = {
  totalTTC: 7_000_000,           // terrain + frais + construction + ameublement
  ameublementParUnite: 40_000,   // MAD par unité locative (achat en gros 11 unités)
};

// ======= PROGRAMME ARCHITECTURAL =======
// Surfaces estimées d'après plans provisoires architecte Jad (à affiner)
const UNITS = [
  { floor: "Sous-sol", type: "Services",          surface: null,  category: "service",    label: "Buanderie / Vestiaires / Réfectoire" },
  { floor: "RDC",      type: "Local commercial",  surface: 40.00, category: "commercial", label: "Local commercial (~40 m² + extension sous-sol)" },
  { floor: "RDC",      type: "Studio",            surface: 37.41, category: "studio",     label: "Studio RDC — 37,41 m²" },
  { floor: "RDC",      type: "Réception",         surface: null,  category: "service",    label: "Hall & réception" },
  { floor: "Étage 1",  type: "Studio A",          surface: 32.75, category: "studio",     label: "Studio A — 32,75 m²" },
  { floor: "Étage 1",  type: "Studio B",          surface: 37.41, category: "studio",     label: "Studio B — 37,41 m²" },
  { floor: "Étage 2",  type: "Studio A",          surface: 28.55, category: "studio",     label: "Studio A — 28,55 m²" },
  { floor: "Étage 2",  type: "Studio B",          surface: 32.75, category: "studio",     label: "Studio B — 32,75 m²" },
  { floor: "Étage 3",  type: "Studio A",          surface: 28.55, category: "studio",     label: "Studio A — 28,55 m²" },
  { floor: "Étage 3",  type: "Studio B",          surface: 32.75, category: "studio",     label: "Studio B — 32,75 m²" },
  { floor: "Étage 4",  type: "Loft",              surface: 46.10, category: "loft",       label: "Loft — 46,10 m²" },
  { floor: "Étage 4",  type: "Studio",            surface: 32.75, category: "studio",     label: "Studio — 32,75 m²" },
  { floor: "Étage 5",  type: "Loft",              surface: 40.98, category: "loft",       label: "Loft — 40,98 m²" },
  { floor: "Étage 5",  type: "Studio",            surface: 22.63, category: "studio",     label: "Studio — 22,63 m²" },
];

// ======= HYPOTHÈSES DE REVENUS =======
// Basées sur données AirDNA, Airbtics, AirROI, SandsOfWealth (2025-2026)
// Maarif ADR médiane : ~627 MAD (tout confondu)
// Range Maarif : 450 – 850 MAD/nuit
// Nos studios (25-37 m²) : positionnés segment éco-milieu de gamme
// Nos lofts (40-46 m²) : positionnés milieu de gamme

const REVENUE_ASSUMPTIONS = {
  loyerCommercial: 8_000,     // MAD / mois (à confirmer)
  commissionPlatformes: 0.15, // Booking 15-18%, Airbnb ~14%, moyenne 15%
  croissanceTarifs: 0.03,     // annuelle
};

// ======= SCÉNARIOS =======
// Chaque scénario a ses propres prix ET taux d'occupation
// Sources : AirDNA Casablanca 2026, Airbtics, AirROI, SandsOfWealth
//
// Occupancy Casablanca (AirROI 2026) :
//   Médiane : 35.8%  |  Top 25% : 58%+  |  Top 10% : 76%+
// Occupancy Casablanca (Airbtics) :
//   Médiane : 49%
// Occupancy Casablanca (SandsOfWealth) :
//   Moyenne : 45%  |  Top performers : 55-65%
// ADR Maarif (Airbtics) : 627 MAD (tout type confondu)
// ADR Range Maarif (SandsOfWealth) : 450 – 850 MAD

const SCENARIOS = {
  prudent: {
    label: "Pessimiste",
    tauxOccupation: 0.35,      // en dessous médiane (nouvel entrant, marché saturé)
    prixNuitStudio: 380,       // bas de la fourchette Maarif, pricing agressif pour remplir
    prixNuitLoft: 480,         // lofts plus grands = léger premium
    loyerCommercial: 6_000,    // hypothèse basse
    source: "Sous médiane AirROI (35.8%) — scénario nouvel entrant, offre en hausse +50%/an",
  },
  moyen: {
    label: "Réaliste",
    tauxOccupation: 0.48,      // entre médiane Airbtics (49%) et moyenne SandsOfWealth (45%)
    prixNuitStudio: 450,       // milieu de gamme, cohérent avec Le 22 Appart'Hôtel (450-600)
    prixNuitLoft: 580,         // premium loft, cohérent avec Maarif Home (530-670)
    loyerCommercial: 8_000,    // marché Maarif
    source: "Médiane marché Airbtics/SandsOfWealth — gestion professionnelle, bon positionnement",
  },
  optimiste: {
    label: "Optimiste",
    tauxOccupation: 0.58,      // top 25% AirROI, cohérent avec top performers SandsOfWealth (55-65%)
    prixNuitStudio: 520,       // pricing premium, bonne réputation acquise
    prixNuitLoft: 650,         // aligné haut de gamme Maarif (Loft Residence GoodMove 500-700)
    loyerCommercial: 10_000,   // prime emplacement
    source: "Top 25% AirROI — établi, bonnes notes, clientèle fidèle, pricing dynamique",
  },
};

// ======= CHARGES D'EXPLOITATION =======
const CHARGES = {
  // Société de gestion — 20% du CA hébergement (confirmé)
  // Inclut : gestion réservations, accueil, suivi opérationnel
  tauxGestion: 0.20,

  // Ménage interne (2e employé dédié ménage/linge)
  // Plus de coût variable par nuitée — coût fixe salarial
  menageLinge: 0,            // MAD / nuitée — internalisé via employé dédié

  eauElectricite: 6_000,     // MAD / mois (~500/appart élec + eau + parties communes)
  internetTv: 1_500,         // MAD / mois (fibre pro + IPTV 11 unités)
  assurance: 15_000,         // MAD / an
  entretien: 30_000,         // MAD / an

  // 2 employés : 1 concierge + 1 ménage/linge
  salaireEmploye: 4_000,     // MAD / mois
  nbEmployes: 2,             // confirmé : concierge + ménage
  chargesSociales: 0.26,     // CNSS + AMO

  // Comptable externe
  comptable: 3_000,          // MAD / mois (estimation cabinet comptable Casablanca)

  taxesPro: 20_000,          // MAD / an (exo 5 ans nouvelle construction)
  divers: 20_000,            // MAD / an

  // Produits ménage, linge de maison, consommables
  consommables: 1_500,       // MAD / mois (estimé pour 11 unités)
};

// ======= FINANCEMENT =======
// Structure : Apport = Terrain | Reste financé 50% Tamwilkom + 50% Banque classique

// MDM Invest — subvention étatique via Tamwilcom
// Source : tamwilcom.ma, finances.gov.ma
// Condition OBLIGATOIRE : apport en devises ≥ 25% du projet
// Engagement : 5 ans sans désinvestissement, sinon remboursement intégral
// Secteur hébergement touristique = éligible
// Délai réponse banque : 21 jours ouvrables, versement sous 5 jours après validation
const MDM_INVEST = {
  tauxSubvention: 0.10,
  plafond: 5_000_000,
  apportDevisesMin: 0.25,    // 25% du projet en devises — CONFIRMÉ par propriétaire
  engagementAnnees: 5,
};

// Tamwilkom (MDM Tamwil) — cofinancement avec banque
// Source : tamwilcom.ma — programme MDM Tamwil
// Taux : 2,5% HT/an (confirmé par propriétaire)
// Durée max : 7 ans
// Différé max : 2 ans sur principal
// Plafond : 5 MDH, max 40% du coût projet, ne peut excéder la part banque
// Min projet : 2,5 MDH (OK — notre projet = 7 MDH)
const TAMWILKOM = {
  tauxAnnuel: 0.025,         // HT (confirmé)
  dureeAns: 7,
  differeAns: 2,
  plafond: 5_000_000,
  maxPctProjet: 0.40,        // max 40% du coût projet
};

// Banque classique — crédit investissement ENTREPRISE
// Source : Bank Al-Maghrib T4-2025 — Taux débiteur moyen TPME : 5,22%
// Taux directeur BAM : 2.50% (maintenu mars 2026)
// Fourchette marché TPME investissement : 5,17% – 5,61%
// Grandes entreprises : 4,74% – 4,96%
// NB : ce projet (7M MAD) relève de la catégorie TPME
// Durée : 7-20 ans pour investissement
const BANQUE_CLASSIQUE = {
  tauxAnnuel: 0.0525,        // estimation médiane TPME investissement (BAM T4-2025)
  dureeAns: 15,
  differeAns: 0,
};

// ======= FISCALITÉ =======
// Résidence fiscale UAE — pas d'IS sur revenu des personnes au Maroc
// Mais IS sur la société marocaine si SCI ou SARL
const FISCALITE = {
  tvaTaux: 0.10,             // taux réduit hébergement touristique
  isTaux: 0.20,              // IS société marocaine
  caDevisesPct: 0.40,        // part du CA en devises (exonérée IS) — à confirmer
  amortissementAns: 20,      // bâtiment amorti linéairement sur 20 ans (5%/an) — terrain non amortissable
  exoEquipementsMois: 36,    // exonération TVA équipements
  exoTaxeProAns: 5,          // exonération taxe pro nouvelles constructions
  residenceFiscale: "UAE",   // pas d'impôt sur le revenu aux UAE
};

// ======= DONNÉES MARCHÉ =======
// Sources : AirDNA, Airbtics, AirROI, SandsOfWealth, ANIT, Observatoire du Tourisme
const MARKET_DATA = {
  // Tourisme national
  visiteurs2024: 17_400_000,
  nuitees2024: 28_700_000,
  croissanceNuitees: 0.12,
  croissanceCasaS1_2025: 0.20,

  // Données Airbnb Casablanca (multi-sources 2025-2026)
  airbnbData: {
    source: "AirDNA, Airbtics (fév 2025 – jan 2026), AirROI 2026, SandsOfWealth 2026",
    totalListingsCasa: 5_209,          // AirDNA (+47.1% YoY)
    listingsMaarif: 1_348,             // Airbtics — quartier le plus saturé
    croissanceListings: 0.50,          // +50% YoY — forte pression concurrentielle
    adrMaarifMAD: 627,                 // Airbtics — ADR médiane Maarif
    adrRangeMaarif: { min: 450, max: 850 },  // SandsOfWealth
    occupancyMedianeCasa: 0.49,        // Airbtics
    occupancyMedianeAirROI: 0.358,     // AirROI (plus conservateur)
    occupancyTop25: 0.58,              // AirROI
    occupancyTop10: 0.76,              // AirROI
    revenueMedianMensuel: 7_500,       // SandsOfWealth — MAD/mois
    revenueTop: 16_000,                // SandsOfWealth — top performers MAD/mois
    saisonHaute: { mois: "Juin-Sept", boost: 0.40 },     // +40% revenu
    saisonBasse: { mois: "Nov-Fév", baisse: -0.25 },     // -25% revenu
    clienteleInternationale: 0.83,     // 83% international (AirROI)
    origineTop: "France (29.5%)",
    dureeSejourMoyenne: 3.8,           // nuits
  },

  // Occupancy par segment hôtelier (Observatoire du Tourisme)
  occupancyBySegment: [
    { segment: "Luxe / Haut de gamme",      taux: 0.623 },
    { segment: "Milieu de gamme (4*)",       taux: 0.50  },
    { segment: "Économique (3-4* B)",        taux: 0.45  },
    { segment: "Airbnb médiane Casa",        taux: 0.49  },
    { segment: "Airbnb top 25% Casa",        taux: 0.58  },
  ],

  // Positionnement tarifaire
  prixNuiteeRange: {
    bas: 380,
    moyen: 530,
    haut: 700,
    maarifMediane: 627,
  },

  // Concurrence directe Maarif
  concurrence: [
    { nom: "Maarif Home",              type: "Appart-hôtel",     prix: "530 – 670 MAD", gamme: "Milieu" },
    { nom: "Le 22 Appart' Hôtel",     type: "Appart-hôtel",     prix: "450 – 600 MAD", gamme: "Milieu" },
    { nom: "Studios Airbnb (indép.)",  type: "Location courte",  prix: "200 – 550 MAD", gamme: "Économique" },
    { nom: "Loft Residence GoodMove",  type: "Appart-hôtel",     prix: "500 – 700 MAD", gamme: "Haut" },
  ],
};

// ======= RISQUES =======
const RISKS = [
  { name: "Taux d'occupation < prévisions",     prob: 0.5, impact: 0.8, mitigation: "Diversifier canaux (Booking, Airbnb, direct), offres long séjour, corporate" },
  { name: "Saturation offre Maarif (+50%/an)",   prob: 0.6, impact: 0.6, mitigation: "Différenciation qualité, service appart-hôtel vs Airbnb indépendant" },
  { name: "Retard de construction",              prob: 0.5, impact: 0.5, mitigation: "Contrat clé en main, pénalités retard, suivi hebdomadaire" },
  { name: "Dépassement budget construction",     prob: 0.5, impact: 0.6, mitigation: "Marge 10-15%, devis fermés, maîtrise d'oeuvre rigoureuse" },
  { name: "Vacance local commercial",            prob: 0.3, impact: 0.2, mitigation: "Emplacement Maarif très attractif, bail long terme" },
  { name: "Réglementation (licence tourisme)",   prob: 0.3, impact: 0.8, mitigation: "Vérifier conformité zone B5, autorisations préalables" },
  { name: "Saisonnalité marquée",                prob: 0.6, impact: 0.4, mitigation: "Clientèle d'affaires régulière, pricing dynamique, long séjour basse saison" },
  { name: "Gestion à distance (UAE)",            prob: 0.5, impact: 0.5, mitigation: "Société gestion locale, outils digitaux, caméras" },
  { name: "Pression tarifaire (offre x2 en 3 ans)", prob: 0.5, impact: 0.5, mitigation: "Qualité supérieure, avis clients, fidélisation" },
];

// ======= SUBVENTIONS & AIDES =======
// Audit d'éligibilité basé sur : MRE UAE, SARL nouvelle, 7 MDH, 2-3 employés, Maarif Casa
const SUBVENTIONS = [
  {
    name: "MDM Invest",
    institution: "Tamwilcom / Ministère MRE",
    type: "national",
    offer: "Subvention 10% du projet (plafond 5 MDH) + garantie financement 40%",
    montantEstime: 700_000,
    eligible: true,
    eligibilityNote: "MRE, investissement tourisme, min 1 MDH, apport devises 25%. Programme phare MRE.",
    process: "Via banque partenaire → validation Tamwilcom (21j ouvrés + 5j)",
    source: "tamwilcom.ma",
    conditions: [
      { label: "Statut MRE", requis: true, projet: true, detail: "Résident fiscal UAE — statut MRE confirmé" },
      { label: "Investissement min. 1 MDH", requis: true, projet: true, detail: "Projet = 7 MDH > 1 MDH" },
      { label: "Apport en devises ≥ 25%", requis: true, projet: true, detail: "Apport 2,5 MDH depuis UAE = 36% du projet" },
      { label: "Secteur éligible (tourisme)", requis: true, projet: true, detail: "Hébergement touristique = secteur prioritaire" },
      { label: "Plafond subvention 5 MDH", requis: true, projet: true, detail: "10% de 7M = 700K < 5 MDH" },
      { label: "Société de droit marocain", requis: true, projet: true, detail: "SARL en cours de création" },
    ],
    whyEligible: "Profil idéal : MRE avec apport en devises, investissement tourisme > 1 MDH. Programme conçu spécifiquement pour ce type de projet.",
  },
  {
    name: "Go Siyaha",
    institution: "Maroc PME / Min. Tourisme",
    type: "sectoriel",
    offer: "5% du projet (base) + assistance technique 90%. Jusqu'à 30% si éco-responsable.",
    montantEstime: 350_000,
    montantMax: 2_100_000,
    eligible: true,
    eligibilityNote: "Seuil minimum supprimé depuis juil. 2025. Hébergement touristique éligible. Ouvert aux nouvelles entreprises.",
    process: "Via CRI ou plateforme Maroc PME → évaluation régionale → versement 50/50 avancement",
    source: "marocpme.gov.ma — Go Siyaha juil. 2025",
    conditions: [
      { label: "Activité hébergement touristique", requis: true, projet: true, detail: "Résidence de tourisme = éligible" },
      { label: "Seuil d'investissement minimum", requis: true, projet: true, detail: "Seuil supprimé en juillet 2025 (ancien : 2 MDH)" },
      { label: "Entreprise nouvelle ou existante", requis: true, projet: true, detail: "Ouvert aux nouvelles créations (SARL)" },
      { label: "Composante éco-responsable (bonus)", requis: false, projet: false, detail: "Non prévu en phase 1 — bonus 30% non accessible" },
    ],
    whyEligible: "Programme sectoriel tourisme, seuil supprimé depuis juil. 2025. Le projet est un hébergement touristique neuf — profil éligible de base.",
  },
  {
    name: "ANAPEC TAHFIZ",
    institution: "ANAPEC",
    type: "emploi",
    offer: "Exonération IR salarié (plafond 10K MAD/mois) + CNSS employeur + taxe formation. 24 mois, max 10 salariés.",
    montantEstime: 120_000,
    eligible: true,
    eligibilityNote: "SARL créée avant fin 2026. CDI dans les 24 mois de création. 2-3 employés = OK (max 10).",
    process: "Création SARL → inscription ANAPEC → recrutement CDI → avantages sur paie",
    source: "anapec.org — LF 2023, actif jusqu'à fin 2026",
    conditions: [
      { label: "SARL créée avant fin 2026", requis: true, projet: true, detail: "Création prévue 2026 — dans les délais" },
      { label: "Recrutement en CDI", requis: true, projet: true, detail: "2-3 employés en CDI (réception, ménage)" },
      { label: "Salaire ≤ 10 000 MAD/mois", requis: true, projet: true, detail: "Profils hôteliers : 4 000-6 000 MAD = OK" },
      { label: "Max 10 salariés", requis: true, projet: true, detail: "2-3 employés < 10" },
      { label: "Embauche dans les 24 mois de création", requis: true, projet: true, detail: "Recrutement dès ouverture = dans les 24 mois" },
    ],
    whyEligible: "SARL nouvelle, 2-3 CDI à salaires modestes. Programme actif jusqu'à fin 2026. Économie réaliste ~120K sur 24 mois.",
  },
  {
    name: "Go Siyaha Digital",
    institution: "Maroc PME / Min. Tourisme",
    type: "sectoriel",
    offer: "90% des coûts d'infrastructure digitale (PMS, channel manager, paiement en ligne, WiFi)",
    montantEstime: 80_000,
    eligible: true,
    eligibilityNote: "Composante du programme Go Siyaha. Éligibilité liée à Go Siyaha.",
    process: "Inclus dans programme Go Siyaha. Budget 720 MDH lancé 2024.",
    source: "marocpme.gov.ma",
    conditions: [
      { label: "Éligible Go Siyaha", requis: true, projet: true, detail: "Éligibilité Go Siyaha confirmée (voir ci-dessus)" },
      { label: "Besoin digital identifié", requis: true, projet: true, detail: "PMS + channel manager + paiement en ligne nécessaires" },
      { label: "Budget digital ≤ 100K", requis: false, projet: true, detail: "Estimation ~90K pour PMS + channel manager + WiFi pro" },
    ],
    whyEligible: "Composante digitale du programme Go Siyaha. L'hébergement touristique nécessite PMS et channel manager — coûts couverts à 90%.",
  },
  {
    name: "ADEREE/AMEE Énergie",
    institution: "AMEE (Agence Marocaine Efficacité Énergétique)",
    type: "green",
    offer: "30% de subvention sur investissements décarbonation (solaire, LED, isolation)",
    montantEstime: 0,
    eligible: false,
    eligibilityNote: "Non planifié. Nécessite un projet d'efficacité énergétique (solaire, isolation, pompe à chaleur) + audit certifié. À envisager en phase 2.",
    process: "Audit énergétique certifié → projet avec calculs → soumission AMEE → 30%",
    source: "amee.ma",
    conditions: [
      { label: "Projet d'efficacité énergétique", requis: true, projet: false, detail: "Aucun investissement vert prévu en phase 1" },
      { label: "Audit énergétique certifié", requis: true, projet: false, detail: "Pas d'audit prévu — nécessite bureau d'études spécialisé" },
      { label: "Investissement solaire/isolation/PAC", requis: true, projet: false, detail: "Non inclus dans le budget construction actuel" },
    ],
    whyNotEligible: "Aucun investissement en efficacité énergétique n'est prévu dans le projet actuel. Possibilité de candidater en phase 2 si panneaux solaires ou pompe à chaleur installés.",
  },
  {
    name: "Charte Investissement 2023",
    institution: "CRI Casablanca-Settat",
    type: "national",
    offer: "Prime sectorielle tourisme 5% + primes additionnelles (emploi, genre, durabilité)",
    montantEstime: 0,
    eligible: false,
    eligibilityNote: "Non éligible. Dispositif principal : 50 MDH + 50 emplois. Dispositif TPME tourisme : 1 emploi/MDH = 7 emplois min. Projet = 2-3 employés seulement.",
    process: "Dossier au CRI → convention d'investissement → versement à 50% et 100% avancement",
    source: "casainvest.ma — Décret Charte 2023",
    conditions: [
      { label: "Dispositif principal : ≥ 50 MDH", requis: true, projet: false, detail: "Projet = 7 MDH << 50 MDH minimum" },
      { label: "Dispositif principal : ≥ 50 emplois", requis: true, projet: false, detail: "Projet = 2-3 employés << 50 emplois" },
      { label: "Dispositif TPME : 1 emploi/MDH investi", requis: true, projet: false, detail: "7 MDH × 1 = 7 emplois requis, projet = 2-3" },
      { label: "Secteur tourisme (prime 5%)", requis: true, projet: true, detail: "Hébergement touristique = OK sur ce critère" },
    ],
    whyNotEligible: "Le projet ne remplit ni le seuil principal (50 MDH / 50 emplois) ni le seuil TPME tourisme (7 emplois requis pour 7 MDH, seulement 2-3 prévus).",
  },
  {
    name: "SMIT Appui Financier",
    institution: "SMIT / Min. Tourisme",
    type: "sectoriel",
    offer: "Subvention 5% (urbain) à 10% (rural) + appui technique",
    montantEstime: 0,
    eligible: "partial",
    eligibilityNote: "Incertain. SMIT concentre l'appui sur zones rurales et grands projets. Projet urbain Casablanca de 7 MDH = faible priorité. À tenter néanmoins.",
    process: "Inscription banqueprojetstourisme.ma → évaluation SMIT → appui technique + financier",
    source: "smit.gov.ma",
    conditions: [
      { label: "Projet touristique", requis: true, projet: true, detail: "Résidence de tourisme = oui" },
      { label: "Zone prioritaire (rural, balnéaire)", requis: true, projet: false, detail: "Maarif, Casablanca = zone urbaine, non prioritaire" },
      { label: "Taille du projet (grands projets favorisés)", requis: false, projet: false, detail: "7 MDH = petit projet pour le SMIT" },
      { label: "Inscription banqueprojetstourisme.ma", requis: true, projet: true, detail: "Peut être fait en ligne — pas de blocage" },
    ],
    whyNotEligible: "Le SMIT concentre ses appuis sur les zones rurales et les grands projets structurants. Un projet urbain de 7 MDH à Casablanca a une faible priorité, mais la candidature reste possible.",
  },
  {
    name: "Exonération TVA Équipements",
    institution: "Administration fiscale",
    type: "fiscal",
    offer: "Exonération TVA 20% sur biens d'équipement acquis pendant 36 mois",
    montantEstime: 88_000,
    eligible: true,
    eligibilityNote: "Nécessite convention d'investissement. Couvre ameublement et équipements hôteliers. 36 mois.",
    process: "Convention investissement → attestation exonération → achat HT",
    source: "Code Général des Impôts, art. 92-I-6°",
    conditions: [
      { label: "Convention d'investissement signée", requis: true, projet: true, detail: "À obtenir via CRI Casablanca-Settat" },
      { label: "Biens d'équipement identifiés", requis: true, projet: true, detail: "Ameublement 11 unités = 440K MAD HT" },
      { label: "Acquisition dans les 36 mois", requis: true, projet: true, detail: "Achat prévu pendant phase construction" },
    ],
    whyEligible: "Convention d'investissement accessible pour tout projet > 1 MDH. L'ameublement hôtelier est clairement un bien d'équipement éligible. Économie : 88K MAD de TVA.",
  },
  {
    name: "IS Exonéré sur CA Devises",
    institution: "Administration fiscale",
    type: "fiscal",
    offer: "Exonération IS totale (5 ans) puis 50% sur CA réalisé en devises",
    montantEstime: 0,
    eligible: false,
    eligibilityNote: "Non applicable. Les plateformes (Booking, Airbnb) versent en MAD sur compte marocain. L'exonération exige des encaissements effectifs en devises étrangères. Seulement applicable si réservations directes payées en EUR/USD.",
    process: "Comptabilité séparée devises vs MAD + justificatifs bancaires",
    source: "Code Général des Impôts, art. 6-I-B-4",
    conditions: [
      { label: "CA réalisé et encaissé en devises", requis: true, projet: false, detail: "Booking/Airbnb versent en MAD sur compte marocain" },
      { label: "Justificatifs bancaires en devises", requis: true, projet: false, detail: "Pas de réception de devises étrangères" },
      { label: "Comptabilité séparée devises/MAD", requis: true, projet: false, detail: "Non applicable si tout est en MAD" },
      { label: "Réservations directes en EUR/USD", requis: false, projet: false, detail: "Possible mais marginal (<5% du CA estimé)" },
    ],
    whyNotEligible: "Les plateformes (Booking, Airbnb) convertissent les paiements et versent en MAD. L'exonération exige des encaissements effectifs en devises — ce qui n'est pas le cas ici.",
  },
];

// MDM Invest & Tamwil detailed process
const MDM_PROCESS = {
  invest: {
    name: "MDM Invest",
    timeline: {
      officiel: "26 jours ouvrés (21j banque + 5j Tamwilcom)",
      reel: "4 à 7+ mois selon retours d'expérience",
    },
    steps: [
      { step: 1, desc: "Dépôt dossier complet à la banque partenaire", delai: "J0" },
      { step: 2, desc: "Analyse et vérification par la banque (éligibilité, business plan, apport devises)", delai: "21 jours ouvrés" },
      { step: 3, desc: "Transmission du dossier approuvé à Tamwilcom/CCG", delai: "J+21" },
      { step: 4, desc: "Validation Tamwilcom et notification", delai: "5 jours ouvrés" },
      { step: 5, desc: "Déblocage des fonds (subvention + prêt Tamwilkom)", delai: "5 jours après validation" },
    ],
    documents: [
      "Business plan détaillé et étude de faisabilité",
      "Justificatif d'apport en devises (≥ 25% du projet)",
      "Statuts de la société et PV de modification",
      "Contrat de bail ou titre de propriété",
      "Déclarations fiscales des 3 dernières années",
      "Relevés bancaires et situation des engagements",
      "Prévisionnel de trésorerie sur 3 ans",
      "Carte de séjour / résidence à l'étranger valide",
    ],
    banquesPartenaires: ["Attijariwafa Bank", "Crédit Agricole du Maroc", "Bank of Africa", "BMCE Bank"],
    changements2024: [
      "Apport minimum réduit de 25% à 20% (juillet 2024)",
      "Prime maintenue à 10%, plafond 5 MDH",
      "Nouveaux secteurs éligibles ajoutés",
      "Investissement minimum confirmé : 1 MDH",
    ],
  },
  tamwil: {
    name: "MDM Tamwil (Tamwilkom)",
    conditions: {
      taux: "2,5% HT/an (~2,75% TTC)",
      duree: "7 ans maximum",
      differe: "2 ans sur principal",
      montant: "1 à 5 MDH",
      maxProjet: "40% du coût projet",
      minProjet: "2,5 MDH",
    },
  },
  feedbacks: {
    positifs: [
      "Structure attractive sur le papier (10% subvention + taux bas)",
      "Tamwilkom à 2,5% HT = très compétitif vs banque classique",
      "Pas de remboursement de la subvention si maintien 5 ans",
    ],
    negatifs: [
      "Seulement 48 dossiers approuvés entre 2002 et 2022 (sur des milliers attendus)",
      "Délais réels : 4-7+ mois au lieu de 5 semaines officielles",
      "Cas documenté : fonds bloqués 7 mois sans déblocage (Yabiladi)",
      "Bureaucratie lourde : paperasse difficile à obtenir depuis l'étranger",
      "Mauvaise communication du programme — beaucoup de MRE ne connaissent pas",
      "Seulement 2,9% des MRE investissent au Maroc (HCP 2022)",
      "Clause 5 ans rigide : pas de flexibilité si changement de circonstances",
      "Pas de processus d'appel transparent en cas de rejet",
    ],
    sources: [
      "Yabiladi.com — forums MRE (discussions approfondies)",
      "LesEco.ma — nouveautés financement MRE 2024",
      "Medias24 — annonces Tamwilcom juillet 2024",
      "HCP 2022 — étude migration et investissement",
    ],
    risques: [
      { risque: "Délai excessif", prob: 0.7, detail: "4-7 mois vs 5 semaines officielles" },
      { risque: "Rejet du dossier", prob: 0.3, detail: "Documentation incomplète ou non conforme" },
      { risque: "Banque non coopérative", prob: 0.4, detail: "Certaines agences peu formées sur MDM" },
      { risque: "Clause 5 ans bloquante", prob: 0.5, detail: "Revente/restructuration impossible sans remboursement" },
    ],
  },
};

const PROJECTION_YEARS = 10;
