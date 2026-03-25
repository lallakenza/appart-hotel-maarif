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
// (à confirmer avec le propriétaire)
const CHARGES = {
  menageLinge: 80,           // MAD / nuitée occupée
  eauElectricite: 8_000,     // MAD / mois
  internetTv: 2_000,         // MAD / mois
  assurance: 15_000,         // MAD / an
  entretien: 30_000,         // MAD / an
  salaireEmploye: 4_000,     // MAD / mois (concierge)
  nbEmployes: 1,
  chargesSociales: 0.26,     // CNSS + AMO
  taxesPro: 20_000,          // MAD / an (exo 5 ans nouvelle construction)
  divers: 20_000,            // MAD / an
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

// Banque classique — crédit investissement
// Source : Médias24 jan 2026 — TAEG moyen crédits immo : 5.50% (en baisse -17bps/an)
// Taux directeur BAM : 2.25% (maintenu mars 2026)
// Fourchette marché : 3.90% – 5.50% selon profil
// MRE bénéficient de conditions préférentielles
// Durée : 7-25 ans pour investissement
const BANQUE_CLASSIQUE = {
  tauxAnnuel: 0.045,         // estimation prudente MRE investissement
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

const PROJECTION_YEARS = 10;
