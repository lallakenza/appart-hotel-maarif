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
// Surfaces d'après plans architecte Jad (Nour Architects) — version finale
// Exposition d'après plan cadastral TF 17527/d (sept 2012) + plans archi O3 RT
//
// ORIENTATION BÂTIMENT (d'après plan cadastral) :
//   Façade rue (entrée principale) = Nord-Ouest → Rue des Camélias
//   Fond du bâtiment               = Sud-Est    → Intérieur îlot / cour
//   Côté gauche des plans archi     = Côté RUE (NW)
//   Côté droit des plans archi      = Côté INTÉRIEUR (SE)
//
// TERMINOLOGIE MAROC :
//   Studio = T2 en France : chambre séparée + salon/cuisine → unités premium, plus grandes
//   Loft   = Kitchenette : espace ouvert cuisine/lit, pas de chambre séparée → plus petit, tarif inférieur
//
// Étage 1/2/3 : même layout (2 studios par étage)
// Étage 4/5 : 1 loft + 1 studio par étage (lofts avec terrasse)
const UNITS = [
  { floor: "Sous-sol", type: "Services",          surface: null,  category: "service",    label: "Buanderie / Vestiaires / Réfectoire",                position: "Sous-sol",    exposition: null },
  { floor: "RDC",      type: "Local commercial",  surface: 40.00, category: "commercial", label: "Local commercial (~40 m² + extension sous-sol)",      position: "Rue",         exposition: "Nord-Ouest", note: "Vitrine sur Rue des Camélias + extension sous-sol" },
  { floor: "RDC",      type: "Studio",            surface: 46.10, category: "studio",     label: "Studio RDC — 46,10 m²",                               position: "Intérieur",   exposition: "Sud-Est",    note: "Fond du RDC, derrière réception" },
  { floor: "RDC",      type: "Réception",         surface: null,  category: "service",    label: "Hall & réception",                                     position: "Rue",         exposition: "Nord-Ouest", note: "Entrée principale côté rue" },
  { floor: "Étage 1",  type: "Studio A",          surface: 37.41, category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 1",  type: "Studio B",          surface: 32.75, category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 2",  type: "Studio A",          surface: 37.41, category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 2",  type: "Studio B",          surface: 32.75, category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 3",  type: "Studio A",          surface: 37.41, category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 3",  type: "Studio B",          surface: 32.75, category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 4",  type: "Loft",              surface: 28.55, category: "loft",       label: "Loft — 28,55 m² (+ terrasse)",                         position: "Rue",         exposition: "Nord-Ouest", note: "Côté rue + terrasse, vue dégagée étage élevé" },
  { floor: "Étage 4",  type: "Studio",            surface: 32.75, category: "studio",     label: "Studio — 32,75 m²",                                    position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot" },
  { floor: "Étage 5",  type: "Loft",              surface: 22.63, category: "loft",       label: "Loft — 22,63 m² (+ terrasse 15,77 m²)",                position: "Rue",         exposition: "Nord-Ouest", note: "Dernier étage côté rue + grande terrasse 15,77 m², meilleure vue" },
  { floor: "Étage 5",  type: "Studio",            surface: 32.75, category: "studio",     label: "Studio — 32,75 m²",                                    position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur, dernier étage" },
];

// ======= HYPOTHÈSES DE REVENUS =======
// Basées sur benchmark Booking.com Maarif (mars 2026, 17 propriétés analysées)
// + données AirDNA, Airbtics, AirROI, SandsOfWealth (2025-2026)
//
// TERMINOLOGIE MAROC (≠ France) :
//   Studio = T2 (chambre + salon, 32-46 m²) → unité premium, tarif plus élevé
//   Loft   = Kitchenette (espace ouvert, 22-28 m²) → unité entrée de gamme, tarif inférieur
//
// Benchmark Booking.com Maarif — Studios / T2 (32-46 m², chambre séparée):
//   StayHere Lifestyle 770 MAD/n (8.5) | AS Premium Soho 745 (8.8)
//   unocapital 750 (8.5) | Élégant Studio 755 (9.2) | StayHere Palmier 600 (8.1)
//   → Médiane pro: 650-750 MAD/n | Budget: 500-615 MAD/n
//
// Benchmark Booking.com Maarif — Lofts / Kitchenettes (22-30 m², espace ouvert):
//   Faya Nova 615 (8.2) | Studio Palmiers 525 (7.3)
//   Petits espaces sans chambre séparée → tarif 20-30% inférieur aux studios
//   → Médiane pro: 400-550 MAD/n
//
// Positionnement : Premium / Boutique (design, service, 8.5+ visé)
// Les studios (T2) commandent un premium grâce à la chambre séparée
// Les lofts (kitchenettes) sont plus abordables mais attractifs (terrasse, vue)

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
//   Studios / T2 (chambre+salon, 32-46 m²) : 600-780 MAD/n (premium)
//   Lofts / Kitchenettes (espace ouvert, 22-28 m²) : 380-580 MAD/n (budget/solo)

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
    prixNuitStudio: 500,       // Studio T2 (32-46 m², chambre séparée) — pricing d'entrée
    prixNuitLoft: 380,         // Loft kitchenette (22-28 m², espace ouvert) — budget
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
    prixNuitStudio: 580,       // Studio T2 — pricing progressif
    prixNuitLoft: 420,         // Loft kitchenette — remplit grâce au prix attractif
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
    prixNuitStudio: 650,       // Studio T2 — médiane Booking.com Maarif opérateurs pro
    prixNuitLoft: 480,         // Loft kitchenette — attractif pour solo/court séjour
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
    prixNuitStudio: 720,       // Studio T2 — positionnement premium confirmé
    prixNuitLoft: 530,         // Loft kitchenette — premium grâce terrasse + design
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
    prixNuitStudio: 780,       // Studio T2 — top quartile Maarif, note 8.5+ Booking
    prixNuitLoft: 580,         // Loft kitchenette — premium avec terrasse vue dégagée
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
// Sources : AirDNA, Airbtics, AirROI, SandsOfWealth, ANIT, Observatoire du Tourisme,
//           AirBoo Rentabilité, EasyHost, Medias24, ONMT, Challenge.ma
const MARKET_DATA = {
  // Tourisme national (ONMT / Observatoire du Tourisme 2025)
  visiteurs2025: 19_800_000,          // Record historique — ONMT
  nuitees2025: 43_400_000,            // +9% vs 2024
  recettesDevises2025: 138_000_000_000, // MAD — record
  tauxOccupNational2025: 0.58,        // +3 pts vs 2024
  visiteurs2024: 17_400_000,
  nuitees2024: 28_700_000,
  croissanceNuitees: 0.12,
  croissanceCasaS1_2025: 0.20,

  // Données Airbnb Casablanca (multi-sources 2025-2026)
  airbnbData: {
    source: "AirDNA, Airbtics (fév 2025 – jan 2026), AirROI 2026, SandsOfWealth 2026, AirBoo, EasyHost",
    totalListingsCasa: 5_209,          // AirDNA (+47.1% YoY)
    listingsMaarif: 1_348,             // Airbtics — quartier le plus saturé
    croissanceListings: 0.50,          // +50% YoY — forte pression concurrentielle
    adrMaarifMAD: 600,                 // SandsOfWealth 2026 — ADR moyenne Casa ~600, médiane 500-550
    adrRangeMaarif: { min: 450, max: 850 },  // SandsOfWealth — Maarif spécifique
    adrStudioT2: { min: 550, max: 780, median: 650 },  // Studios avec chambre séparée (32-46 m²)
    adrLoftKitchenette: { min: 380, max: 580, median: 480 },  // Kitchenettes espace ouvert (22-28 m²)

    // ═══ TAUX D'OCCUPATION — SYNTHÈSE MULTI-SOURCES ═══
    // Données Airbnb/STR (plateformes analytics)
    occupancyMedianeCasa: 0.49,        // Airbtics (fév 2025 – jan 2026)
    occupancyMedianeAirROI: 0.358,     // AirROI (oct 2024 – sept 2025) — plus conservateur
    occupancySandsOfWealth: 0.45,      // SandsOfWealth 2026 — fourchette réaliste 38-55%
    occupancyEasyHost: 0.60,           // EasyHost (optimiste, 600 MAD/nuit)
    occupancyTop25: 0.58,              // AirROI — top quartile
    occupancyTop10: 0.76,              // AirROI — top décile
    occupancyBreakEven: { min: 0.25, max: 0.30 },  // SandsOfWealth — 8-10 nuits/mois
    // Données par quartier (AirBoo Rentabilité 2025 — biens pro, note 4.5+/5)
    occupancyByQuartier: {
      source: "AirBoo Rentabilité 2025 — profils pro gérés efficacement, note 4.5+/5",
      centreVille: { taux: 0.75, prixNuit: 850 },   // MAD
      maarif:      { taux: 0.72, prixNuit: 800 },
      anfa:        { taux: 0.78, prixNuit: 950 },
      ainDiab:     { taux: 0.70, prixNuit: 1000 },
      bourgogne:   { taux: 0.65, prixNuit: 700 },
      californie:  { taux: 0.60, prixNuit: 750 },
    },
    // Hôtellerie classée (Observatoire du Tourisme / ONMT / Medias24)
    occupancyHotelCasa: {
      t1_2025_moyen: 0.53,            // Medias24 — Jan-Mars 2025, +8 pts vs 2024
      mars_2025: 0.46,                // Challenge.ma — recul saisonnier Ramadan, -9 pts vs 2024
      source: "Medias24, Challenge.ma, Observatoire du Tourisme",
    },
    // Saisonnalité (AirROI)
    occupancySaisonnier: {
      peak: { mois: "Août, Déc, Juil", occupancy: 0.428, adr: 780 },    // MAD
      shoulder: { mois: "Oct, Nov, Avr, Jun", occupancy: 0.374, adr: 740 },
      low: { mois: "Fév, Mars, Mai", occupancy: 0.367, adr: 670 },
      highest: { mois: "Best month", occupancy: 0.459, adr: 850 },
      lowest: { mois: "Worst month", occupancy: 0.318, adr: 650 },
    },
    // Tendance : occupation en baisse, tarifs en hausse (Airbtics)
    occupancyTrend: {
      variation1an: -0.039,            // -3,9% sur 1 an
      variation3ans: -0.109,           // -10,9% sur 3 ans (saturation marché)
      tarifVariation1an: +0.103,       // +10,3% — montée en gamme compense
      revenueVariation1an: +0.060,     // +6% — revenue progresse malgré occupation en baisse
    },
    revenueMedianMensuel: 7_500,       // SandsOfWealth — MAD/mois
    revenueTop: 16_000,                // SandsOfWealth — top performers MAD/mois
    saisonHaute: { mois: "Juin-Sept", boost: 0.40 },     // +40% revenu
    saisonBasse: { mois: "Nov-Fév", baisse: -0.25 },     // -25% revenu
    clienteleInternationale: 0.83,     // 83% international (AirROI)
    origineTop: "France (29.5%)",
    dureeSejourMoyenne: 3.8,           // nuits
    // Segments par prix (Airbtics — occupancy par gamme)
    occupancyByPricing: {
      budget:   { small: 0.58, medium: 0.64, large: 0.62 },
      midScale: { small: 0.65, medium: 0.70, large: 0.68 },  // Notre positionnement
      luxury:   { small: 0.52, medium: 0.58, large: 0.60 },
    },
  },

  // Occupancy par segment — croisement hôtelier + STR + quartiers
  occupancyBySegment: [
    // Hôtellerie classée (Observatoire du Tourisme / ONMT 2025)
    { segment: "National 2025 (classé)",          taux: 0.58,  source: "ONMT" },
    { segment: "Luxe / Haut de gamme Casa",       taux: 0.623, source: "Observatoire" },
    { segment: "Milieu de gamme (4*)",             taux: 0.50,  source: "Observatoire" },
    { segment: "Casa T1 2025 (classé)",            taux: 0.53,  source: "Medias24" },
    // STR / Airbnb (multi-sources 2025-2026)
    { segment: "Airbnb médiane Casa (Airbtics)",   taux: 0.49,  source: "Airbtics" },
    { segment: "Airbnb médiane Casa (AirROI)",     taux: 0.358, source: "AirROI" },
    { segment: "Airbnb moyenne Casa (SandsOfWealth)", taux: 0.45, source: "SandsOfWealth" },
    { segment: "Airbnb top 25% Casa",              taux: 0.58,  source: "AirROI" },
    { segment: "Airbnb top 10% Casa",              taux: 0.76,  source: "AirROI" },
    // Biens gérés pro (AirBoo 2025 — note 4.5+/5)
    { segment: "Pro géré — Maarif (AirBoo)",       taux: 0.72,  source: "AirBoo" },
    { segment: "Pro géré — Anfa (AirBoo)",          taux: 0.78,  source: "AirBoo" },
    { segment: "Pro géré — Centre-ville (AirBoo)",  taux: 0.75,  source: "AirBoo" },
    // Mid-scale segment (Airbtics — notre positionnement)
    { segment: "Mid-scale small (Airbtics)",        taux: 0.65,  source: "Airbtics" },
    { segment: "Mid-scale medium (Airbtics)",       taux: 0.70,  source: "Airbtics" },
  ],

  // Positionnement tarifaire (moyenne pondérée Studios T2 + Lofts)
  prixNuiteeRange: {
    bas: 400,
    moyen: 600,
    haut: 780,
    maarifMedianePro: 650,
    source: "Booking.com Maarif mars 2026 (17 propriétés) — ajusté mix Studios T2 + Lofts",
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
    studiosPro: { min: 600, median: 700, max: 780, label: "Studios / T2 pro (32-46 m²)" },
    studiosParticulier: { min: 500, median: 570, max: 650, label: "Studios / T2 particulier" },
    loftsPro: { min: 380, median: 480, max: 580, label: "Lofts / Kitchenettes (22-30 m²)" },
    luxe2BR: { min: 1000, median: 1175, max: 1490, label: "2BR+ Luxe (85m²+)" },
  },
  occupancy: {
    // STR / Airbnb — multiples sources pour triangulation
    casaMedianAirbtics: 0.49,          // Airbtics (fév 2025 – jan 2026) — 3649 annonces
    casaMedianAirROI: 0.358,           // AirROI (oct 2024 – sept 2025) — 1973 annonces
    casaMoyenneSandsOfWealth: 0.45,    // SandsOfWealth 2026 — fourchette 38-55%
    casaEasyHost: 0.60,                // EasyHost — données optimistes
    casaTop25: 0.58,                   // AirROI — top quartile
    casaTop10: 0.76,                   // AirROI — top décile
    casaTopPerformers: 0.65,           // SandsOfWealth — top performers 55-65%
    // Biens pro gérés (AirBoo — note 4.5+/5)
    maarifProGere: 0.72,              // AirBoo Rentabilité 2025 — Maarif, bien géré
    casaMoyenneProGere: 0.68,         // AirBoo — moyenne quartiers centraux
    // Hôtellerie classée (ONMT / Observatoire)
    hotel4Stars: 0.50,                // Observatoire du Tourisme
    luxeSegment: 0.623,               // Observatoire du Tourisme
    nationalClasse2025: 0.58,         // ONMT — taux national classé 2025
    casaT1_2025: 0.53,               // Medias24 — Casa T1 2025
    // Villes comparables (EasyHost)
    marrakech: 0.65,
    agadir: 0.62,
    tanger: 0.58,
    rabat: 0.55,
    fes: 0.50,
    source: "AirROI, Airbtics, SandsOfWealth, AirBoo, EasyHost, ONMT, Medias24, Observatoire du Tourisme",
  },
  insights: [
    "StayHere domine avec 3 propriétés (Maarif, Palmier, Oasis) — marque forte, volumes élevés",
    "AS Premium By Soho (8.8/10) = meilleur rapport qualité/volume — modèle à suivre",
    "Écart de prix x2 entre particuliers basiques (525 MAD) et pros premium (770 MAD)",
    "Les propriétés avec services hôteliers (petit-déj, conciergerie) justifient +15-25% de premium",
    "Segment ultra-luxe (piscine/jacuzzi privé) atteint 1490 MAD/n mais niche très restreinte",
  ],
  // ═══ ANALYSE TAUX D'OCCUPATION — CONCLUSION ═══
  // Croisement de 8+ sources indépendantes (mars 2026)
  //
  // FOURCHETTE MÉDIANE MARCHÉ (annonce lambda non pro) : 35-49%
  //   → AirROI médiane : 35.8%, Airbtics médiane : 49%, SandsOfWealth : 45%
  //   → Tendance : occupation en baisse -3.9%/an (saturation +50% listings/an)
  //
  // FOURCHETTE BIEN PRO GÉRÉ (note 4.5+/5, multi-canal) : 55-72%
  //   → AirBoo Maarif pro : 72%, AirROI top 25% : 58%
  //   → Mid-scale segment (Airbtics) : 65-70%
  //   → C'EST NOTRE CIBLE avec un appart-hôtel structuré
  //
  // TOP 10% (marketing, review 4.8+, brand, volume) : 76%+
  //   → AirROI top 10% : 76%+, Anfa pro : 78%
  //
  // HÔTELLERIE CLASSÉE CASA : 46-53% (T1 2025)
  //   → National 2025 : 58%, Marrakech : 73%
  //
  // CALIBRATION SCÉNARIOS :
  //   Pessimiste (35%) = médiane AirROI — annonce non optimisée
  //   Prudent (42%)    = entre médiane AirROI et Airbtics
  //   Réaliste (48%)   = médiane Airbtics — bien géré sans être top
  //   Favorable (54%)  = début top 25% — bonne réputation établie
  //   Optimiste (60%)  = top performers SandsOfWealth — brand forte
  //
  // NOTE : les données AirBoo (72% Maarif) correspondent à un bien noté 4.5+/5 géré
  //   professionnellement, ce qui justifie notre scénario favorable/optimiste.
  //   Les chiffres AirROI (35.8%) incluent TOUS les listings, y compris inactifs et mal gérés.
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
      { label: "Composante éco-responsable (bonus 40%)", requis: false, projet: true, detail: "Activable via toggle — investissement éco ~300K MAD, subvention 40% = 120K MAD" },
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

const PROJECTION_YEARS = 20;

// ======= GO SIYAHA — BONUS ÉCOLOGIQUE =======
// Programme Go Siyaha (Maroc PME / Min. Tourisme) — Volet Croissance Verte
// Sources : marocpme.gov.ma, invest-time.com, leseco.ma, medias24.com (2024-2025)
//
// Subvention : 40% du coût des équipements éco-responsables (projets < 10 MDH)
// Assistance technique : 90% du coût d'audit énergétique
// Projets doivent être complétés sous 3 ans
// Conditions : entreprise marocaine, hébergement touristique, CA < 200 MDH
//
// Équipements éligibles :
//   - Chauffe-eau solaire / panneaux photovoltaïques
//   - Isolation thermique renforcée
//   - Éclairage LED basse consommation
//   - Robinetterie économe en eau / double chasse
//   - Tri des déchets / compostage
//   - Certification éco-label
//
// Estimation investissement écologique pour 11 unités locatives :
//   - Chauffe-eau solaire (11 unités)        : 150 000 MAD
//   - LED + domotique éclairage              :  30 000 MAD
//   - Isolation thermique renforcée          :  80 000 MAD
//   - Robinetterie & sanitaire éco           :  25 000 MAD
//   - Audit énergétique + certification      :  15 000 MAD
//   - TOTAL estimé                           : 300 000 MAD
//
// Économies opérationnelles estimées :
//   - Chauffe-eau solaire : -40% sur eau chaude (~20% des utilities)
//   - LED : -60% sur éclairage (~10% des utilities)
//   - Isolation : -15% sur climatisation (~15% des utilities)
//   - Robinetterie éco : -20% sur eau (~10% des utilities)
//   → Réduction globale estimée : 15-20% des utilities annuelles

const GO_SIYAHA_ECO = {
  enabled: false,  // toggle par l'utilisateur
  tauxSubvention: 0.40,          // 40% du coût éco couvert par Go Siyaha
  investissementEco: 300_000,    // MAD — montant total des équipements éco (ajustable)
  // Détail des postes d'investissement
  postes: [
    { label: "Chauffe-eau solaire (11 unités)", montant: 150_000 },
    { label: "Éclairage LED + domotique",       montant: 30_000 },
    { label: "Isolation thermique renforcée",    montant: 80_000 },
    { label: "Robinetterie & sanitaire éco",     montant: 25_000 },
    { label: "Audit énergétique + certification",montant: 15_000 },
  ],
  // Économies annuelles sur les utilities (% de réduction)
  reductionUtilities: 0.18,      // 18% de réduction sur les utilities annuelles
  // Économie supplémentaire sur consommables (produits éco, moins de gaspillage)
  reductionConsommables: 0.05,   // 5% de réduction sur les consommables
  // Avantage marketing : meilleur rating, premium price justifié
  premiumPrix: 0,                // 0 MAD — conservateur, pas de premium prix intégré
  // Durée d'amortissement des équipements éco
  amortissementEcoAns: 10,
  // Sources
  sources: [
    "marocpme.gov.ma — Go Siyaha, volet Croissance Verte",
    "invest-time.com — Morocco Go Siyaha tourism opportunity",
    "leseco.ma — 11 nouveaux projets validés pour un tourisme plus durable",
    "medias24.com — Go Siyaha 720 MDH pour 1 700 entreprises",
    "lkelma.com — Ce qu'il offre aux entreprises touristiques marocaines",
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// GO SIYAHA — PROGRAMME COMPLET (section dédiée)
// Sources : Maroc PME, Ministère du Tourisme, Morocco World News,
//           BarlAman Today, Lkelma, Invest-Time
// ═══════════════════════════════════════════════════════════════════════
const GO_SIYAHA_PROGRAMME = {
  // --- Infos générales ---
  nom: "Go Siyaha",
  gestionnaire: "Maroc PME (Agence nationale de développement des PME)",
  ministere: "Ministère du Tourisme, de l'Artisanat et de l'Économie Sociale et Solidaire",
  lancement: "Février 2024",
  budgetGlobal: 720_000_000,       // 720 MDH
  objectifEntreprises: 1_700,      // cible 2026
  entreprisesSoutenues: 1_000,     // juillet 2025 — 59% de l'objectif
  restantAides: 700,               // packages restants
  plateforme: "https://marocpme.gov.ma/gosiyaha/",
  cadre: "Feuille de route tourisme 2023-2026",

  // --- Taux de subvention par type ---
  subventions: [
    { type: "Animation touristique",       taux: 0.35, plafondInvest: 10_000_000, detail: "Activités touristiques, loisirs, sport" },
    { type: "Hébergement",                 taux: 0.30, plafondInvest: 10_000_000, detail: "Hôtels, riads, maisons d'hôtes avec activités d'animation" },
    { type: "Croissance verte / Éco",      taux: 0.40, plafondInvest: 10_000_000, detail: "Équipements éco-responsables, photovoltaïque, isolation" },
    { type: "Assistance technique",        taux: 0.90, plafondInvest: null,        detail: "Consulting, digital, stratégie financière — entreprise ne paie que 10%" },
  ],

  // --- Secteurs éligibles ---
  secteursEligibles: [
    "Hébergement (hôtels, riads, résidences de tourisme, maisons d'hôtes)",
    "Agences de voyages",
    "Transport touristique",
    "Restauration touristique",
    "Animation et divertissement touristique",
    "Activités sportives et de loisirs",
  ],

  // --- Timeline / évolution du programme ---
  timeline: [
    { date: "Février 2024",   event: "Lancement officiel du programme Go Siyaha", detail: "Budget : 720 MDH, objectif 1 700 entreprises" },
    { date: "Mai 2024",       event: "430 dossiers déposés", detail: "Premières candidatures en cours d'instruction" },
    { date: "Septembre 2024", event: "12 premiers projets subventionnés", detail: "1ère vague : loisirs nautiques, éco-tourisme, hébergement distinctif, sport" },
    { date: "Février 2025",   event: "8ème comité CPP — 11 projets éco-tourisme approuvés", detail: "23 MDH investissement total, 7 MDH subvention Go Siyaha. Projets de 130K à 10M MAD" },
    { date: "Mars 2025",      event: "24 projets Croissance Verte approuvés", detail: "58 MDH investissement total, 20 MDH subventionné. Panneaux solaires, LED, gestion déchets" },
    { date: "Juillet 2025",   event: "1 000 entreprises soutenues (59% objectif)", detail: "3 réformes majeures annoncées" },
    { date: "22 juillet 2025", event: "Suppression seuil minimum investissement", detail: "Plus besoin de 1M MAD minimum — ouvert aux micro-entreprises, coopératives, jeunes" },
    { date: "22 juillet 2025", event: "Ouverture aux entreprises existantes", detail: "Les entreprises existantes peuvent postuler si elles développent de nouvelles activités d'animation" },
    { date: "22 juillet 2025", event: "Assistance technique dès la conception", detail: "Support disponible avant même la création de l'entreprise (structuration idée, business plan)" },
  ],

  // --- Process de candidature ---
  process: [
    { etape: 1, titre: "Dossier en ligne",           detail: "Soumettre le dossier sur marocpme.gov.ma/gosiyaha/, avec business plan, étude de marché, devis fournisseurs, statuts juridiques" },
    { etape: 2, titre: "Instruction / validation",    detail: "Revue par Maroc PME, vérification éligibilité et viabilité économique" },
    { etape: 3, titre: "Comité Public-Privé (CPP)",   detail: "Le dossier passe devant le Comité paritaire (représentants État + secteur privé)" },
    { etape: 4, titre: "Signature convention",        detail: "Accord formel, conditions de versement, jalons à respecter" },
    { etape: 5, titre: "Réalisation & suivi",         detail: "Mise en œuvre du projet, visites de contrôle, versement progressif de la subvention" },
  ],
  delaiTraitement: "4 à 8 semaines (estimation, varie selon complexité)",

  // --- Documents requis ---
  documentsRequis: [
    "Business plan détaillé avec projections financières",
    "Étude de marché démontrant la pertinence du projet",
    "Devis fournisseurs pour les équipements / travaux",
    "Statuts juridiques de la société (ou projet de statuts si pré-création)",
    "États financiers (si entreprise existante)",
    "Preuve de viabilité économique du projet",
    "Certificat d'inscription au registre de commerce (ou engagement)",
  ],

  // --- Projets approuvés documentés ---
  projetsApprouves: [
    { date: "Sept 2024", nb: 12, types: "Nautisme, éco-tourisme, hébergement distinctif, sport", investissement: null },
    { date: "Fév 2025",  nb: 11, types: "Éco-tourisme (panneaux solaires, gestion énergie)", investissement: 23_000_000, subvention: 7_000_000,
      villes: "Dakhla, Berkane, Casablanca, Azilal, Tanger, Khenifra, Sefrou, M'diq, Errachidia, Marrakech",
      fourchette: "130K MAD (maison d'hôtes solaire) à ~10M MAD (hôtel club)" },
    { date: "Mars 2025",  nb: 24, types: "Croissance Verte (photovoltaïque, LED, déchets)", investissement: 58_000_000, subvention: 20_000_000 },
  ],

  // --- Risques & alertes ---
  risques: [
    { risque: "Bureaucratie documentaire",       severite: "moyen",  detail: "Dossier complet exigé (business plan, étude de marché, devis). Rejet si incomplet." },
    { risque: "Délais de traitement",             severite: "moyen",  detail: "4-8 semaines annoncé mais peut s'allonger. Le CPP ne se réunit pas en continu." },
    { risque: "Places limitées",                  severite: "élevé",  detail: "700 packages restants sur 1 700. Course aux dossiers — first come first served." },
    { risque: "Versement conditionnel",           severite: "moyen",  detail: "La subvention est versée sur jalons/preuves d'avancement. Pas un chèque en blanc." },
    { risque: "Éligibilité hébergement seul",     severite: "faible", detail: "Hébergement seul = 30%. Pour 40% il faut un volet éco/vert ou animation." },
    { risque: "Manque de feedback public",        severite: "info",   detail: "Très peu de retours d'expérience sur forums/réseaux. Programme récent (2024), les retours viendront." },
    { risque: "Changement de conditions",         severite: "faible", detail: "Le programme a déjà évolué 3 fois en 18 mois. Les conditions peuvent encore changer." },
  ],

  // --- Notre éligibilité ---
  notreProjet: {
    eligible: true,
    volet: "Croissance verte / Éco-responsable",
    tauxApplicable: 0.40,       // 40% car volet éco
    investissementVise: 300_000, // ajustable via slider
    subventionEstimee: 120_000,  // 300K × 40%
    assistanceTechnique: true,   // on paie 10%, programme couvre 90%
    points_forts: [
      "SARL nouvelle → éligible sans historique",
      "Résidence de tourisme = secteur hébergement éligible",
      "Volet écologique (solaire, LED, isolation) → 40% au lieu de 30%",
      "Seuil minimum supprimé (juil 2025) → pas de blocage si < 1M MAD",
      "Assistance technique dès la conception → aide au business plan",
      "Casablanca fait partie des villes où des projets ont été approuvés",
    ],
    points_vigilance: [
      "700 packages restants — déposer le dossier rapidement",
      "Business plan et étude de marché solides requis",
      "Versement sur preuves d'avancement, pas d'avance",
      "Le CPP valide au cas par cas — pas automatique",
    ],
  },

  // --- Sources ---
  sources: [
    { label: "Plateforme officielle", url: "https://marocpme.gov.ma/gosiyaha/" },
    { label: "Morocco World News — Expansion juillet 2025", url: "https://www.moroccoworldnews.com/2025/07/229756/go-siyaha-expands-access" },
    { label: "BarlAman Today — 11 projets éco-tourisme (fév 2025)", url: "https://barlamantoday.com/2025/02/28/moroccos-go-siyaha-program-greenlights-11-eco-tourism-projects/" },
    { label: "BarlAman Today — 12 premiers projets (sept 2024)", url: "https://barlamantoday.com/2024/09/24/twelve-new-tourism-projects-in-morocco-receive-first-go-siyaha-grants/" },
    { label: "Lkelma — Nouvelles mesures 2025", url: "https://lkelma.com/go-siyaha-2025-nouvelles-mesures-subvention-tourisme-maroc/" },
    { label: "Invest-Time — Vue d'ensemble", url: "https://invest-time.com/en/morocco-go-siyaha-tourism-opportunity/" },
    { label: "Ministère du Tourisme", url: "https://mtaess.gov.ma/fr/go-siyaha-supprime-ses-barrieres-pour-les-entrepreneurs-du-tourisme/" },
  ],
};
