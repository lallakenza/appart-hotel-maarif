// ============================================================
// DATA LAYER — Raw project data, zero computation
// All amounts in MAD, all rates as decimals
// ============================================================

const PROJECT = {
  name: "Résidence de Tourisme Maarif",
  location: "Rue des Camélias, Maarif, Casablanca",
  zone: "Zone B - Secteur B5",
  titreFoncier: "17527/d",
  structure: "R+5",
  architect: "Nour Architects",
  coords: { lat: 33.5741, lng: -7.6437 },
  mapsUrl: "https://maps.app.goo.gl/zbgcXaV5d1qjkkYG7",
};

const TERRAIN = {
  surface: 174,           // m²
  prix: 2_300_000,        // MAD hors frais (prix ferme)
  fraisAcquisition: 0.065, // enregistrement 4% + conservation 1.5% + notaire ~1%
};

const BUDGET = {
  totalTTC: 7_000_000,           // terrain + frais + construction
  ameublementParUnite: 40_000,   // MAD par unité locative (achat en gros 11 unités)
};

// Programme architectural — surfaces estimées d'après plans architecte Jad
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

// Hypothèses de revenus (à valider)
const REVENUE_ASSUMPTIONS = {
  prixNuitStudio: 450,        // MAD / nuit (à confirmer)
  prixNuitLoft: 380,          // MAD / nuit (à confirmer)
  loyerCommercial: 8_000,     // MAD / mois (à confirmer)
  commissionPlatformes: 0.15, // Booking / Airbnb (à confirmer)
  croissanceTarifs: 0.03,     // annuelle (à confirmer)
};

// Scénarios d'occupation
const SCENARIOS = {
  prudent:   { tauxOccupation: 0.45, label: "Prudent (45%)" },
  moyen:     { tauxOccupation: 0.55, label: "Moyen (55%)" },
  optimiste: { tauxOccupation: 0.65, label: "Optimiste (65%)" },
};

// Charges d'exploitation
const CHARGES = {
  menageLinge: 80,           // MAD / nuitée occupée (à confirmer)
  eauElectricite: 8_000,     // MAD / mois (à confirmer)
  internetTv: 2_000,         // MAD / mois (à confirmer)
  assurance: 15_000,         // MAD / an (à confirmer)
  entretien: 30_000,         // MAD / an (à confirmer)
  salaireEmploye: 4_000,     // MAD / mois (concierge)
  nbEmployes: 1,             // 1 concierge
  chargesSociales: 0.26,     // CNSS + AMO
  taxesPro: 20_000,          // MAD / an (exo 5 ans nouvelle construction)
  divers: 20_000,            // MAD / an (à confirmer)
};

// ======= FINANCEMENT =======

// MDM Invest — subvention (10% du projet, plafonné 5 MDH)
// Condition : apport en devises ≥ 25% du projet
// Engagement : 5 ans sans désinvestissement
// Secteur : hébergement touristique = éligible
const MDM_INVEST = {
  tauxSubvention: 0.10,
  plafond: 5_000_000,
  apportDevisesMin: 0.25,    // 25% du projet en devises obligatoire
  engagementAnnees: 5,
};

// Tamwilkom (MDM Tamwil) — prêt complémentaire
// Source : tamwilcom.ma — conditions MRE
// Taux : 2,5% HT/an, durée max 7 ans, différé max 2 ans
// Plafond : 5 MDH, ne peut excéder la part banque
// Montant projet min : 2,5 MDH
const TAMWILKOM = {
  tauxAnnuel: 0.025,         // HT
  dureeAns: 7,
  differeAns: 2,
  plafond: 5_000_000,
  maxPctProjet: 0.40,        // max 40% du coût projet
};

// Banque classique — crédit investissement
// Source : Médias24, taux marché 2025
// Taux moyen : 4,25% pour 7-15 ans
const BANQUE_CLASSIQUE = {
  tauxAnnuel: 0.0425,        // taux fixe estimé
  dureeAns: 15,
  differeAns: 0,             // pas de différé
};

// Fiscalité
const FISCALITE = {
  tvaTaux: 0.10,             // taux réduit hébergement touristique
  isTaux: 0.20,
  caDevisesPct: 0.40,        // part du CA en devises (exonérée IS) — à confirmer
  exoEquipementsMois: 36,    // exonération TVA équipements
  exoTaxeProAns: 5,          // exonération taxe pro nouvelles constructions
};

// Données marché (sources: ANIT, Observatoire du Tourisme, Medias24)
const MARKET_DATA = {
  visiteurs2024: 17_400_000,
  nuitees2024: 28_700_000,
  croissanceNuitees: 0.12,
  croissanceCasaS1_2025: 0.20,
  occupancyBySegment: [
    { segment: "Luxe / Haut de gamme",      taux: 0.623 },
    { segment: "Milieu de gamme (4*)",       taux: 0.50  },
    { segment: "Économique (3-4* B)",        taux: 0.45  },
    { segment: "Appart-hôtel Maarif (est.)", taux: 0.55  },
  ],
  prixNuiteeRange: {
    bas: 370,
    moyen: 550,
    haut: 670,
    notreHypothese: 450,
  },
  concurrence: [
    { nom: "Maarif Home",              type: "Appart-hôtel",     prix: "530 – 670 MAD", gamme: "Milieu" },
    { nom: "Le 22 Appart' Hôtel",     type: "Appart-hôtel",     prix: "450 – 600 MAD", gamme: "Milieu" },
    { nom: "Studios Airbnb (indép.)",  type: "Location courte",  prix: "200 – 550 MAD", gamme: "Économique" },
    { nom: "Loft Residence GoodMove",  type: "Appart-hôtel",     prix: "500 – 700 MAD", gamme: "Haut" },
  ],
};

// Risques identifiés
const RISKS = [
  { name: "Taux d'occupation < prévisions",     prob: 0.4, impact: 0.7, mitigation: "Diversifier canaux (Booking, Airbnb, direct), offres long séjour, corporate" },
  { name: "Retard de construction",              prob: 0.5, impact: 0.5, mitigation: "Contrat clé en main, pénalités retard, suivi hebdomadaire" },
  { name: "Dépassement budget construction",     prob: 0.5, impact: 0.6, mitigation: "Marge 10-15%, devis fermés, maîtrise d'oeuvre rigoureuse" },
  { name: "Vacance local commercial",            prob: 0.3, impact: 0.2, mitigation: "Emplacement Maarif très attractif, bail long terme" },
  { name: "Réglementation (licence tourisme)",   prob: 0.3, impact: 0.8, mitigation: "Vérifier conformité zone B5, autorisations préalables" },
  { name: "Taux de change (revenus devises)",    prob: 0.3, impact: 0.3, mitigation: "Avantage fiscal compense partiellement" },
  { name: "Saisonnalité marquée",                prob: 0.6, impact: 0.4, mitigation: "Clientèle d'affaires régulière, pricing dynamique" },
  { name: "Gestion à distance (MRE)",            prob: 0.5, impact: 0.5, mitigation: "Société gestion locale, outils digitaux, caméras" },
];

const PROJECTION_YEARS = 10;
