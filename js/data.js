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
  totalTTC: 7_000_000,           // terrain + frais + construction (HORS ameublement)
  ameublementParUnite: 40_000,   // MAD par unité locative (achat en gros 11 unités) — EN PLUS du 7M
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
// Basées sur benchmark Booking.com Maarif (mars 2026, 17 propriétés analysées)
// + données AirDNA, Airbtics, AirROI, SandsOfWealth (2025-2026)
//
// Benchmark Booking.com Maarif — Studios (30-45m²):
//   StayHere Lifestyle 770 MAD/n (8.5) | AS Premium Soho 745 (8.8)
//   unocapital 750 (8.5) | Élégant Studio 755 (9.2) | StayHere Palmier 600 (8.1)
//   Faya Nova 615 (8.2) | Studio Palmiers 525 (7.3)
//   → Médiane pro: 700-750 MAD/n | Budget: 525-615 MAD/n
//
// Benchmark Booking.com Maarif — 1BR/Loft (45-90m²):
//   maarif elite suite 965 (8.2) | StayHere Oasis 910 (8.6)
//   Chic & Cozy 735 (8.8) | Dynasty Luxury 650 (part.)
//   → Médiane pro: 735-910 MAD/n
//
// Positionnement : Premium / Boutique (design, service, 8.5+ visé)

const REVENUE_ASSUMPTIONS = {
  loyerCommercial: 8_000,     // MAD / mois (à confirmer)
  // --- Répartition canaux de réservation ---
  // Réalité Maroc STR : ~55% OTA (Booking/Airbnb), ~25% direct (WhatsApp/tél/repeat), ~20% informel (cash)
  // Commission ne s'applique que sur la part OTA
  // Sources : Mordor Intelligence 2025, PriceLabs Morocco, AirROI Marrakech 2025
  partOTA: 0.55,              // % des nuitées passant par plateformes (Booking, Airbnb)
  partDirect: 0.25,           // % direct déclaré (site, WhatsApp, téléphone, repeat guests)
  partInformel: 0.20,         // % cash / non-déclaré — réalité marché marocain (estimation conservatrice)
  commissionOTA: 0.15,        // Booking 15-18%, Airbnb 15.5%, moyenne pondérée ~15%
  croissanceTarifs: 0.03,     // annuelle
};

// ======= SCÉNARIOS =======
// Recalibrés avec benchmark Booking.com Maarif (mars 2026, 17 concurrents)
// Positionnement Premium/Boutique — prix alignés opérateurs professionnels
//
// Occupancy Casablanca (multi-sources 2025-2026) :
//   AirROI médiane: 35.8% | Airbtics médiane: 49% | SandsOfWealth moy: 45%
//   Top 25%: 58%+ | Hôtels 4*: 50% | Luxe: 62.3%
// ADR Maarif pro (Booking.com mars 2026) :
//   Studios pro: 600-770 MAD/n | 1BR/Lofts pro: 735-965 MAD/n

// ═══════════════════════════════════════════════════════════════════════
// SCÉNARIOS — Avec variations réalistes des charges selon contexte
// ═══════════════════════════════════════════════════════════════════════
// Paramètres variables par scénario :
//   - partOTA : plus d'OTA au début (pas de clientèle fidèle), baisse avec maturité
//   - partInformel : augmente avec la maturité (bouche-à-oreille, cash, repeat guests)
//   - nbEmployes : 2 de base, 3 en optimiste (volume de travail)
//   - consommablesParNuitee : légèrement variable (qualité amenities)
//
// Paramètres FIXES (ne varient PAS par scénario) :
//   - comptableAnnuel : même complexité comptable quel que soit l'occupation
//   - assurance : prime fixe annuelle, ne dépend pas du CA
//   - internetTv : coût fixe d'infrastructure
//   - chargesSociales : taux légal CNSS fixe
//   - taxesPro : basée sur valeur locative, pas sur le CA
// ═══════════════════════════════════════════════════════════════════════

const SCENARIOS = {
  prudent: {
    label: "Pessimiste",
    tauxOccupation: 0.35,
    prixNuitStudio: 500,
    prixNuitLoft: 650,
    loyerCommercial: 6_000,
    budgetTotal: 7_000_000,
    // --- Charges variables par scénario ---
    partOTA: 0.70,             // Nouvel entrant : 70% OTA (pas encore de clientèle directe)
    partDirect: 0.20,          // 20% direct (walk-in, quelques contacts)
    partInformel: 0.10,        // 10% informel (peu de réseau, peu de cash)
    nbEmployes: 2,             // Minimum : 1 concierge + 1 ménage
    consommablesParNuitee: 45, // Amenities basiques pour limiter les coûts
    source: "Nouvel entrant — forte dépendance OTA, pricing d'entrée, occupation basse Y1",
  },
  prudent_moyen: {
    label: "Prudent",
    tauxOccupation: 0.42,
    prixNuitStudio: 550,
    prixNuitLoft: 720,
    loyerCommercial: 7_000,
    budgetTotal: 7_000_000,
    partOTA: 0.65,
    partDirect: 0.22,
    partInformel: 0.13,
    nbEmployes: 2,
    consommablesParNuitee: 48,
    source: "Montée en puissance — début de clientèle directe, pricing progressif",
  },
  moyen: {
    label: "Réaliste",
    tauxOccupation: 0.48,
    prixNuitStudio: 620,
    prixNuitLoft: 800,
    loyerCommercial: 8_000,
    budgetTotal: 7_200_000,
    partOTA: 0.55,             // Équilibre OTA/direct comme la moyenne du marché
    partDirect: 0.25,
    partInformel: 0.20,        // Bouche-à-oreille, WhatsApp, repeat guests cash
    nbEmployes: 2,
    consommablesParNuitee: 50,
    source: "Médiane marché — mix canaux équilibré, pricing aligné opérateurs pro Maarif",
  },
  moyen_optimiste: {
    label: "Favorable",
    tauxOccupation: 0.54,
    prixNuitStudio: 680,
    prixNuitLoft: 870,
    loyerCommercial: 9_500,
    budgetTotal: 7_200_000,
    partOTA: 0.48,             // Bonne réputation → plus de direct
    partDirect: 0.27,
    partInformel: 0.25,        // Réseau établi, corporate en cash, repeat guests
    nbEmployes: 2,
    consommablesParNuitee: 55, // Meilleure qualité amenities (positionnement premium)
    source: "Établi — clientèle fidèle, bonne note Booking, forte part directe",
  },
  optimiste: {
    label: "Optimiste",
    tauxOccupation: 0.60,
    prixNuitStudio: 750,
    prixNuitLoft: 950,
    loyerCommercial: 11_000,
    budgetTotal: 7_500_000,
    partOTA: 0.42,             // Forte notoriété → moins de dépendance OTA
    partDirect: 0.28,
    partInformel: 0.30,        // Maximum informel : réseau, corporate, long séjour cash
    nbEmployes: 3,             // Volume justifie un 3e employé (réception renforcée)
    consommablesParNuitee: 60, // Premium amenities, linge haut de gamme
    source: "Top 25% — leader segment, RevPAR élevé, 3 employés nécessaires",
  },
};

// ======= CHARGES D'EXPLOITATION =======
const CHARGES = {
  // ═══════════════════════════════════════════════════════════════
  // ANALYSE APPROFONDIE — Sources : CNSS 2025, SMIG 2026, Lydec,
  // ONEE, benchmark opérateurs STR Maroc, cabinets comptables Casa
  // ═══════════════════════════════════════════════════════════════

  // --- Société de gestion — 20% du CA hébergement brut ---
  // Confirmé : HouseBooking, YourHostHelper, Welkeys Maroc ~20%
  // Inclut : gestion réservations, accueil, check-in/out, suivi opérationnel
  tauxGestion: 0.20,

  // --- Utilities : EAU + ÉLECTRICITÉ ---
  // Tarif commercial Lydec Casablanca : ~1.07 MAD/kWh (vs 1.17 résidentiel)
  // Appart meublé avec clim : ~200-400 kWh/mois occupé, ~80-120 kWh vide (frigo, veille)
  // Eau : ~150-250 MAD/mois par unité occupée
  // Parties communes (hall, couloirs, éclairage, ascenseur) : ~1,500 MAD/mois fixe
  // MODÈLE : partie fixe + partie variable (proportionnelle à l'occupation)
  utilitiesFixe: 2_500,      // MAD / mois — parties communes + base incompressible (veille, frigo)
  utilitiesVarParUnite: 400,  // MAD / mois / unité occupée (eau + élec + clim)
  // Pour occupation 48% (5.3 unités occupées en moy) : 2500 + 5.3×400 = 4,620 MAD/mois
  // Pour occupation 60% (6.6 unités) : 2500 + 6.6×400 = 5,140 MAD/mois
  // Ancien fixe 6,000 était dans la bonne fourchette mais ne variait pas

  internetTv: 1_200,          // MAD / mois — fibre pro Inwi/Maroc Telecom 100Mbps (~400) + IPTV (800)
  // Source : Inwi Pro 2025, fournisseurs IPTV Maroc. 11 unités partagent 1 connexion pro

  // --- Assurance multirisque professionnelle ---
  assurance: 18_000,          // MAD / an — multirisque hôtelier (incendie, RC, bris machines, perte exploitation)
  // Source : courtiers Casablanca, fourchette 15,000-25,000 pour petit hôtel
  // Inclut RC professionnelle obligatoire pour hébergement touristique

  // --- Entretien & maintenance ---
  // Nouveau bâtiment : 1-1.5% de la valeur construction/an
  // Budget construction ~4.5M → 1% = 45,000, mais garanti 5 ans → réduit An 1-3
  entretienBase: 20_000,      // MAD / an — années 1-5 (bâtiment neuf sous garantie)
  entretienMature: 40_000,    // MAD / an — après 5 ans (vieillissement normal)
  // Le moteur appliquera entretienBase si y < 5, entretienMature sinon

  // --- Salaires ---
  // SMIG 2026 : 3,400 MAD/mois brut (17.92 MAD/h × 191h)
  // Source : Décret SMIG janvier 2026, neoexpertise.net
  // Concierge/réceptionniste petit appart-hôtel : SMIG + 15-30% (responsabilité, langues)
  // Femme de ménage / lingère : SMIG ou légèrement au-dessus
  salaireConcierge: 4_500,    // MAD / mois brut — réception + gestion quotidienne
  salaireMenage: 3_500,       // MAD / mois brut — ménage + linge (SMIG + prime)
  nbEmployes: 2,              // 1 concierge + 1 ménage/linge

  // --- Charges sociales patronales CNSS 2025 ---
  // Allocations familiales : 6.40% | Prestations sociales : 8.60% | AMO : 4.11% | Formation : 1.60%
  // Total patronal : 20.71% (plafonné à 8,000 MAD pour certaines cotisations)
  // Source : espace-paie.ma, comptable-tanger.com 2025
  chargesSociales: 0.2071,    // CNSS + AMO patronal réel (corrigé de 26% → 20.71%)

  // --- Comptable / Expert-comptable ---
  // TPE/PME Casablanca : forfait annuel 24,000-36,000 MAD pour tenue + déclarations
  // Petit appart-hôtel = 1 visite/mois + bilan annuel + déclarations fiscales
  // Source : lec.ma, tmsonline.ma 2025
  comptableAnnuel: 30_000,    // MAD / AN (≠ /mois!) — corrigé de 3,000/mois à 30,000/an
  // = 2,500 MAD/mois — cabinet comptable Casablanca pour TPE hôtelière

  // --- Taxe professionnelle ---
  // Exonération totale 5 premières années (nouvelle construction)
  // Après : base = valeur locative × coefficient × taux (10-30% selon activité)
  // Pour hébergement touristique : ~1.25% de la valeur construction (6-12M MAD bracket)
  // Source : upsilon-consulting.com, CGI Art. 6-I-A
  taxesPro: 25_000,           // MAD / an (après exonération)

  // --- Divers & imprévus ---
  divers: 15_000,             // MAD / an — frais bancaires, fournitures bureau, déplacements, licences PMS

  // --- Consommables : VARIABLE selon occupation ---
  // Linge de maison, produits ménage, amenities (savon, shampoing, café/thé)
  // Estimé : 40-60 MAD par nuitée occupée (fournitures + amortissement linge)
  // Source : benchmark opérateurs STR Maroc, Mews hospitality 2025
  consommablesParNuitee: 50,  // MAD / nuitée occupée — linge, ménage, amenities
  // Pour 11 unités × 365j × 48% occ = 1,928 nuitées → 96,400 MAD/an
  // Ancien : 1,500/mois = 18,000/an — LARGEMENT sous-estimé
  // Note : une grosse partie du coût ménage est dans les salaires (employé dédié)
  // Ici c'est uniquement les fournitures consommables

  menageLinge: 0,             // Internalisé via employé dédié (salaireMenage)
};

// ======= FINANCEMENT =======
// Structure : Apport = Terrain | Reste financé 50% Tamwilkom + 50% Banque classique

// MDM Invest — subvention étatique via Tamwilcom
// Sources multiples vérifiées (voir FINANCEMENT_SOURCES)
// Prime d'investissement : 10% du coût du projet, plafonnée à 5 MDH
// Condition : apport en devises ≥ 25% du projet (réforme en cours pour passer à 20% + dirhams)
// Engagement : 5 ans sans désinvestissement, sinon remboursement intégral
// Secteurs éligibles : industrie, éducation, hébergement/tourisme, santé, transport, énergie, green economy, IT
// Délai réponse banque : 21 jours ouvrables, versement Tamwilcom sous 5 jours
// Projet min : 1 MDH | Versement par tranches selon avancement de l'investissement
// ATTENTION : programme historiquement sous-performant (48 dossiers validés entre 2002-2022)
const MDM_INVEST = {
  tauxSubvention: 0.10,
  plafond: 5_000_000,
  apportDevisesMin: 0.25,    // 25% du projet en devises — réforme en cours pour baisser à 20% + dirhams
  engagementAnnees: 5,
  projetMin: 1_000_000,      // 1 MDH minimum
  delaiReponseBanque: 21,    // jours ouvrables
  delaiVersementTamwilcom: 5, // jours ouvrables après validation
};

// Tamwilkom (MDM Tamwil) — cofinancement avec banque
// Sources multiples vérifiées (voir FINANCEMENT_SOURCES)
// Taux : 2,5% HT/an (fixe, portion Tamwilcom)
// Taux banque : librement négocié avec la banque
// Durée max : 7 ans | Différé max : 2 ans sur principal
// Plafond : 5 MDH | Min : 1 MDH | max 40% du coût projet, ne peut excéder la part banque
// Projet min : 2,5 MDH (OK — notre projet = 7 MDH)
// Éligibilité MRE : titre de séjour valide OU retour définitif < 1 an
// Commercialisé via les banques partenaires marocaines
const TAMWILKOM = {
  tauxAnnuel: 0.025,         // HT (confirmé Tamwilcom)
  dureeAns: 7,
  differeAns: 2,
  plafond: 5_000_000,
  plancher: 1_000_000,       // min 1 MDH
  maxPctProjet: 0.40,        // max 40% du coût projet
  projetMin: 2_500_000,      // 2,5 MDH minimum
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

// ======= SOURCES & FEEDBACK FINANCEMENT MDM =======
const FINANCEMENT_SOURCES = {
  mdmInvest: [
    { label: "Tamwilcom — Page officielle MDM Invest", url: "https://www.tamwilcom.ma/fr/votre-projet/mdm-invest" },
    { label: "Ministère des Finances — Fonds MDM Invest", url: "https://www.finances.gov.ma/fr/Pages/detail-actualite.aspx?fiche=1489" },
    { label: "CRI Tanger — Fiche MDM Invest", url: "https://investangier.com/mdm-invest/" },
    { label: "Bladi.net — Aide méconnue pour les MRE", url: "https://www.bladi.net/vous-etes-mre-comment-obtenir-subvention-maroc,116133.html" },
    { label: "LesEco.ma — Tamwilcom nouveautés 2024", url: "https://leseco.ma/maroc/financement-des-projets-mre-tamwilcom-devoile-de-nouveaux-outils-financiers-pour-booster-linvestissement.html" },
    { label: "Le360 — Ce qui va changer pour MDM Invest", url: "https://fr.le360.ma/economie/investissements-des-mre-au-maroc-ce-qui-va-changer-pour-le-fonds-mdm-invest-233775/" },
    { label: "La Vie Éco — MDM Invest levier stratégique", url: "https://www.lavieeco.com/argent/programme-mdm-invest-un-levier-strategique-pour-canaliser-lepargne-des-marocains-du-monde/" },
  ],
  mdmTamwil: [
    { label: "Tamwilcom — Page officielle MDM Tamwil", url: "https://www.tamwilcom.ma/fr/votre-projet/mdm-tamwil" },
    { label: "LesEco.ma — Nouveaux outils financiers MRE", url: "https://leseco.ma/maroc/financement-des-projets-mre-tamwilcom-devoile-de-nouveaux-outils-financiers-pour-booster-linvestissement.html" },
    { label: "L'Économiste — Nouveaux mécanismes MRE", url: "https://www.leconomiste.com/flash-infos/tamwilcom-lance-de-nouveaux-mecanismes-de-financement-pour-les-mre" },
    { label: "OnnVision — Guide MDM Tamwil", url: "https://onnvision.com/investir-au-maroc-partie-4-mdm-tamwil-nouveau-financement-pour-les-mre/" },
    { label: "Le Matin — Tamwilcom mécanismes MRE", url: "https://lematin.ma/economie/tamwilcom-presente-les-mecanismes-dedies-au-financement-des-projets-des-mre/235857" },
  ],
  feedback: [
    {
      type: "warning",
      title: "Programme historiquement sous-performant",
      detail: "Seulement 48 dossiers validés entre 2002 et 2022 sur MDM Invest. Selon le HCP (2022), seuls 2,9% des MRE ont réalisé un investissement au Maroc.",
      source: "Bladi.net / HCP 2022",
      url: "https://www.bladi.net/investir-maroc-oui-mais-mre-veulent-garanties,115462.html",
    },
    {
      type: "warning",
      title: "Complexité administrative",
      detail: "Les MRE dénoncent la complexité des procédures, l'absence de guichet unique, le manque d'accompagnement et de visibilité fiscale.",
      source: "Bladi.net / CESE",
      url: "https://www.bladi.net/investir-maroc-oui-mais-mre-veulent-garanties,115462.html",
    },
    {
      type: "info",
      title: "Réforme en cours (2024+)",
      detail: "Baisse du seuil d'apport (de 25% vers 20%), possibilité d'apport en dirhams (plus seulement en devises), élargissement des secteurs éligibles (énergie, transport, green economy, IT). Couplage possible avec Intelaka et Fonds Innov Invest.",
      source: "Le360 / LesEco.ma",
      url: "https://fr.le360.ma/economie/investissements-des-mre-au-maroc-ce-qui-va-changer-pour-le-fonds-mdm-invest-233775/",
    },
    {
      type: "positive",
      title: "Hébergement touristique = secteur éligible",
      detail: "L'hébergement touristique fait partie des secteurs explicitement éligibles à MDM Invest et MDM Tamwil, confirmé par Tamwilcom et le CRI Tanger.",
      source: "Tamwilcom / CRI Tanger",
      url: "https://investangier.com/mdm-invest/",
    },
    {
      type: "info",
      title: "Versement par tranches",
      detail: "La subvention MDM Invest est versée par tranches selon l'avancement de l'investissement, pas en une seule fois. La banque est le point d'entrée unique pour le dépôt de dossier.",
      source: "Bladi.net",
      url: "https://www.bladi.net/vous-etes-mre-comment-obtenir-subvention-maroc,116133.html",
    },
    {
      type: "warning",
      title: "Engagement 5 ans strict",
      detail: "En cas de désinvestissement dans les 5 ans suivant le dernier versement, la subvention doit être remboursée intégralement. Condition non négociable.",
      source: "Tamwilcom",
      url: "https://www.tamwilcom.ma/fr/votre-projet/mdm-invest",
    },
  ],
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
    bas: 500,
    moyen: 680,
    haut: 950,
    maarifMedianePro: 730,
    source: "Booking.com Maarif mars 2026 (17 propriétés)",
  },

  // Concurrence directe Maarif
  concurrence: [
    { nom: "StayHere Maarif Lifestyle",    type: "Appart-hôtel pro",    prix: "770 MAD/n", rating: 8.5, reviews: 1927, surface: "35m²", gamme: "Premium" },
    { nom: "AS Premium By Soho Hotels",    type: "Appart-hôtel pro",    prix: "745 MAD/n", rating: 8.8, reviews: 1523, surface: "Suite", gamme: "Premium" },
    { nom: "unocapital",                   type: "Appart-hôtel pro",    prix: "750 MAD/n", rating: 8.5, reviews: 200,  surface: "45m²", gamme: "Premium" },
    { nom: "StayHere Palmier City Living",  type: "Appart-hôtel pro",    prix: "600 MAD/n", rating: 8.1, reviews: 922,  surface: "30m²", gamme: "Milieu+" },
    { nom: "Faya Nova Central Stay",        type: "Appart-hôtel pro",    prix: "615 MAD/n", rating: 8.2, reviews: 260,  surface: "42m²", gamme: "Milieu+" },
    { nom: "StayHere Oasis Residential",    type: "Appart-hôtel pro",    prix: "910 MAD/n", rating: 8.6, reviews: 250,  surface: "50m²", gamme: "Premium" },
    { nom: "maarif elite suite",            type: "Particulier premium", prix: "965 MAD/n", rating: 8.2, reviews: 99,   surface: "Suite", gamme: "Luxe" },
    { nom: "Chic & Cozy 1BR Oasis",        type: "Particulier premium", prix: "735 MAD/n", rating: 8.8, reviews: 59,   surface: "90m²", gamme: "Premium" },
    { nom: "W-Aldorf",                      type: "Appart-hôtel pro",    prix: "1175 MAD/n", rating: 8.0, reviews: 423,  surface: "85m²", gamme: "Luxe" },
    { nom: "Dynasty Luxury Palmiers",       type: "Particulier",         prix: "650 MAD/n", rating: null, reviews: null, surface: "45m²", gamme: "Milieu+" },
    { nom: "Élégant Studio Centre",         type: "Particulier premium", prix: "755 MAD/n", rating: 9.2, reviews: 4,    surface: "47m²", gamme: "Premium" },
    { nom: "Studio Palmiers Maarif",        type: "Particulier",         prix: "525 MAD/n", rating: 7.3, reviews: 4,    surface: "30m²", gamme: "Économique" },
  ],
};

// ======= BENCHMARK CONCURRENTIEL =======
// Source : Booking.com, recherche Maarif Casablanca, 15-17 avril 2026, 2 adultes
const BENCHMARK = {
  date: "Mars 2026",
  source: "Booking.com — Maarif, Casablanca",
  searchCriteria: "2 nuits, 2 adultes, avril 2026, type: Appartement",
  nbCompetitors: 17,
  summary: {
    studiosPro: { min: 600, median: 730, max: 770, label: "Studios pro (30-45m²)" },
    studiosParticulier: { min: 525, median: 570, max: 615, label: "Studios particulier" },
    loftsPro: { min: 735, median: 820, max: 965, label: "1BR/Lofts pro (45-90m²)" },
    luxe2BR: { min: 1000, median: 1175, max: 1490, label: "2BR+ Luxe (85m²+)" },
  },
  occupancy: {
    casaAverage: 0.46,
    casaMedianAirbtics: 0.49,
    casaMedianAirROI: 0.358,
    casaTop25: 0.58,
    hotel4Stars: 0.50,
    luxeSegment: 0.623,
    source: "AirROI, Airbtics, SandsOfWealth, Observatoire du Tourisme",
  },
  insights: [
    "StayHere domine avec 3 propriétés (Maarif, Palmier, Oasis) — marque forte, volumes élevés",
    "AS Premium By Soho (8.8/10) = meilleur rapport qualité/volume — modèle à suivre",
    "Écart de prix x2 entre particuliers basiques (525 MAD) et pros premium (770 MAD)",
    "Les propriétés avec services hôteliers (petit-déj, conciergerie) justifient +15-25% de premium",
    "Segment ultra-luxe (piscine/jacuzzi privé) atteint 1490 MAD/n mais niche très restreinte",
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
