// ============================================================
// DATA LAYER — Raw project data, zero computation
// All amounts in MAD, all rates as decimals
// Sources citées pour chaque hypothèse
// ============================================================
//
// CHANGELOG:
// 01/04/2026 (v85) — AUDIT MÉTIER INDÉPENDANT + GESTION DUEL :
//   - Taxe habitation+TSC : 12K→35K MAD/an (TH ~24.5K + TSC 10.5% VL, Source: CasablancaCity.ma)
//   - Commission OTA : 15%→17% (Booking.com standard 17%, Airbnb 15.5%, Source: Booking Partner Hub)
//   - Comptable : 30K→36K MAD/an (SARL hôtelière TVA double taux, Source: LEC.ma)
//   - Gestion Duel : correction doublons conciergerie vs auto-géré
//     Mode conciergerie : blanchisserie=0 (inclus dans 20%), consommables×50% (amenities/linge couverts)
//     Mode auto-géré : ajout PMS/channel manager 15K/an (Guesty/Lodgify + serrures connectées)
//   - AUDIT_RT : ajout corrections audit métier v85 dans les données structurées
// 01/04/2026 (v84) — AUDIT OPÉRATIONNEL RT 2★ :
//   - Cross-référence cahier des charges RT 2★ (Arrêté 985-24) vs modèle financier
//   - STAFFING : ajout gardien de nuit (salaireGardienNuit: 3,400, gardienNuitEnabled: true)
//     Norme A "Personnel d'accueil 24h/24 7j/7" → gardien nuit obligatoire même en mode conciergerie
//   - CONSOMMABLES : 30→35 MAD/nuitée (cuisine obligatoire RT = consommables supplémentaires)
//   - ASSURANCE : 18K→22K MAD/an (RT classé + cuisine/unité = risque incendie accru)
//   - ENTRETIEN : 20K/40K→25K/45K MAD/an (entretien électroménager cuisine)
//   - TAXE SÉJOUR : 2→5 MAD/nuitée (RT classé 2★ tarif supérieur Dahir 1-19-40)
//   - AJOUT blanchisserie : 12 MAD/nuitée (lavage draps/serviettes entre séjours)
//   - AJOUT renouvellement linge : 15K MAD/an (usure intensive STR)
//   - Impact total : +109K MAD/an de charges vs ancien modèle (~+19%)
//   - EBITDA corrigé : 550K MAD (marge 46.2%) vs 659K (55.3%) — projet reste rentable
//   - Ajout constante AUDIT_RT avec données structurées pour section dashboard
//   - engine.js : gardien nuit intégré dans calcul salaires mode conciergerie
//   - engine.js : blanchisserie + renouvLinge ajoutés aux chargesTotal et chargesDetail
// 28/03/2026 (v57) — Correction taux banque SARL :
//   - BANQUE_CLASSIQUE : 4,35% → 5,20% (le 4,35% était le taux résidentiel particulier)
//   - Source : BAM T4-2025 taux débiteur moyen TPME = 5,22%, Médias24 jan 2026 chef entreprise = 5,15%
// 28/03/2026 (v56) — Fix mobile + audit corrections :
//   - Amortissement mobilier sur HT (TVA récupérable Art. 92-I-6° CGI)
//   - Tables responsive mobile (data-cols="wide" + overflow-x scroll)
// 28/03/2026 — Intégration recommandations analyse qualitative :
//   - BANQUE_CLASSIQUE : 5,25%/15ans → 4,35%/20ans + 1an différé (source Médias24 sept 2025)
//   - REVENUE_ASSUMPTIONS.tauxAppreciation : nouveau champ 2%/an (séparé de croissanceTarifs 3%)
//   - REVENUE_ASSUMPTIONS.saisonnalite : 12 coeff. mensuels (source ListingOK/Airbtics Casa)
//   - REVENUE_ASSUMPTIONS.rampUp : An 1 à 65% occ, 85% ADR (nouvel entrant sans avis)
//   - REVENUE_ASSUMPTIONS.canauxEvolution : OTA multiplier décroissant Y1→Y5
//   - CHARGES ajoutés : taxeHabitation 12K (exo 5 ans), marketing lancement 80K,
//     frais création SARL 20K, renouvellement mobilier cycle 7 ans × 40K/unité
//   - GO_SIYAHA_PROGRAMME.recommandation : traiter comme bonus (taux conversion ~4,5%)
//   - Correction : loi 80-14 n'a PAS de plafond 120 jours (c'est la loi ELAN française)
// 27/03/2026 — Création initiale avec analyse qualitative 4 phases
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
  { floor: "Sous-sol", type: "Services",          surface: null,  terrasse: 0,     category: "service",    label: "Buanderie / Vestiaires / Réfectoire",                position: "Sous-sol",    exposition: null },
  { floor: "RDC",      type: "Local commercial",  surface: 40.00, terrasse: 0,     category: "commercial", label: "Local commercial (~40 m² + extension sous-sol)",      position: "Rue",         exposition: "Nord-Ouest", note: "Vitrine sur Rue des Camélias + extension sous-sol" },
  { floor: "RDC",      type: "Studio",            surface: 46.10, terrasse: 9.30,  category: "studio",     label: "Studio RDC — 46,10 m² (+ terrasse ~9,30 m²)",         position: "Intérieur",   exposition: "Sud-Est",    note: "Fond du RDC, derrière réception + terrasse latérale ~9,30 m² (estimée : 1,40 m × 6,63 m)" },
  { floor: "RDC",      type: "Réception",         surface: null,  terrasse: 0,     category: "service",    label: "Hall & réception",                                     position: "Rue",         exposition: "Nord-Ouest", note: "Entrée principale côté rue" },
  { floor: "Étage 1",  type: "Studio A",          surface: 37.41, terrasse: 0,     category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 1",  type: "Studio B",          surface: 32.75, terrasse: 0,     category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 2",  type: "Studio A",          surface: 37.41, terrasse: 0,     category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 2",  type: "Studio B",          surface: 32.75, terrasse: 0,     category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 3",  type: "Studio A",          surface: 37.41, terrasse: 0,     category: "studio",     label: "Studio A — 37,41 m²",                                  position: "Rue",         exposition: "Nord-Ouest", note: "Côté Rue des Camélias, vue dégagée" },
  { floor: "Étage 3",  type: "Studio B",          surface: 32.75, terrasse: 0,     category: "studio",     label: "Studio B — 32,75 m²",                                  position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot, plus calme" },
  { floor: "Étage 4",  type: "Loft",              surface: 28.55, terrasse: 9.45,  category: "loft",       label: "Loft — 28,55 m² (+ terrasse 9,45 m²)",                 position: "Rue",         exposition: "Nord-Ouest", note: "Côté rue + terrasse 9,45 m², vue dégagée étage élevé" },
  { floor: "Étage 4",  type: "Studio",            surface: 32.75, terrasse: 0,     category: "studio",     label: "Studio — 32,75 m²",                                    position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur îlot" },
  { floor: "Étage 5",  type: "Loft",              surface: 22.63, terrasse: 15.77, category: "loft",       label: "Loft — 22,63 m² (+ terrasse 15,77 m²)",                position: "Rue",         exposition: "Nord-Ouest", note: "Dernier étage côté rue + grande terrasse 15,77 m², meilleure vue" },
  { floor: "Étage 5",  type: "Studio",            surface: 32.75, terrasse: 0,     category: "studio",     label: "Studio — 32,75 m²",                                    position: "Intérieur",   exposition: "Sud-Est",    note: "Côté intérieur, dernier étage" },
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
  commissionOTA: 0.17,        // ⚠ AUDIT MÉTIER v85 : corrigé 15%→17%
  // Booking.com standard Maroc : 17% (Booking Partner Hub, Médias24 mai 2024)
  // Airbnb host-only (obligatoire déc. 2025) : 15.5% (Loftely.com, Armonia Solutions)
  // Moyenne pondérée Booking dominant (~70% du mix OTA) : 0.70×17% + 0.30×15.5% ≈ 16.55% → arrondi 17%
  croissanceTarifs: 0.03,     // annuelle — croissance prix/nuit (≈ inflation)

  // --- Inflation des charges ---
  // Les charges fixes (salaires, utilities, comptable, assurance, entretien, divers, etc.)
  // augmentent avec l'inflation générale. Au Maroc : IPC 2023 = 6.1%, 2024 = 1.3%, tendance ~2%
  // Source : HCP (Haut-Commissariat au Plan), Bank Al-Maghrib
  inflationCharges: 0.02,     // 2%/an — inflation charges fixes (conservateur)

  // --- Indexation loyer commercial ---
  // Les baux commerciaux au Maroc sont typiquement indexés à l'IPC ou à un taux fixe
  // Pratique courante : révision triennale ou annuelle de 2-3%
  // Source : pratique bail commercial marocain, dahir n° 1-16-99
  indexationLoyer: 0.02,       // 2%/an — indexation du loyer commercial

  // --- Transition conciergerie → in-house ---
  // Année à partir de laquelle on passe de conciergerie (20% CA) à gestion in-house (2 emp. SMIG)
  // 0 = in-house dès le début | 3 = conciergerie Y1-Y3, in-house à partir Y4
  // 21 = jamais (toujours conciergerie)
  switchInHouseAn: 21,          // 21 = jamais → conciergerie permanente (défaut)

  // --- Taux d'actualisation pour la VAN ---
  // Le taux reflète le coût d'opportunité du capital investi
  // 8% = standard immobilier commercial, entre obligataire (~5%) et equity (~12%)
  tauxActualisation: 0.08,     // 8% — taux d'actualisation pour le calcul de la VAN

  // --- Appréciation du bien immobilier ---
  // DISTINCT de la croissance tarifs : historique Casablanca 1-1,5%/an (BKAM 2015-2025)
  // Avec effet Mondial 2030, hypothèse ajustée à 2%/an
  // Source : BKAM/ANCFCC indice prix actifs immobiliers, Yakeey, Agenz
  tauxAppreciation: 0.02,     // 2%/an (vs 3% ancien = croissanceTarifs, trop optimiste)

  // --- Saisonnalité mensuelle ---
  // Coefficients multiplicateurs sur le taux d'occupation annuel moyen
  // Source : ListingOK Casablanca 2025 (taux mensuels réels)
  // Formule : coeff_mois = occ_réelle_mois / occ_moyenne_annuelle
  // Occ moyenne annuelle réelle ListingOK Casa : 42.8%
  // IMPORTANT : la moyenne des 12 coefficients DOIT faire 1.0 (neutre sur l'année)
  saisonnalite: [
    0.61,  // Janvier  — 26.2% réel → 26.2/42.8 = 0.61 — creux absolu
    0.69,  // Février  — 29.4% réel
    0.91,  // Mars     — 38.8% réel — reprise progressive
    1.02,  // Avril    — 43.5% réel — printemps
    1.13,  // Mai      — 48.2% réel — pré-saison
    1.21,  // Juin     — 52.0% réel — haute saison
    1.30,  // Juillet  — 55.8% réel — pic absolu (diaspora)
    1.20,  // Août     — 51.5% réel — haute saison
    1.19,  // Septembre — 50.8% réel — rentrée, business stable
    1.08,  // Octobre  — 46.2% réel
    0.88,  // Novembre — 37.8% réel — ralentissement
    0.78,  // Décembre — 33.5% réel — hiver (sauf fêtes)
  ],
  // Vérification : (0.61+0.69+0.91+1.02+1.13+1.21+1.30+1.20+1.19+1.08+0.88+0.78)/12 = 1.000

  // --- Période de ramp-up (montée en puissance) ---
  // Un nouvel entrant sans avis met 12-18 mois à atteindre son potentiel
  // Source : analyse qualitative mars 2026, retour opérateurs Maarif
  rampUp: {
    dureeAns: 1,              // 1ère année = ramp-up
    coefOccupation: 0.65,     // Occupation = 65% du taux cible (ex: 48% → 31%)
    coefADR: 0.85,            // ADR = 85% du tarif cible (discount lancement)
  },

  // --- Évolution des canaux par année ---
  // Année 1 : forte dépendance OTA (nouvel entrant, 0 avis)
  // Progression vers plus de direct à mesure que la réputation se construit
  // Source : retours opérateurs, benchmark StayHere/AS Premium
  canauxEvolution: {
    enabled: true,             // true = canaux évoluent par année | false = fixes (ancien comportement)
    // Coefficient annuel : multiplie la partOTA du scénario, le reste se redistribue
    // Y1 : OTA majoré, Y5+ : converge vers la valeur scénario
    otaMultiplier: [
      1.30,  // An 1  — 30% de plus d'OTA que le scénario cible
      1.20,  // An 2
      1.10,  // An 3
      1.05,  // An 4
      1.00,  // An 5+ — valeur du scénario atteinte
    ],
  },
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
    nbEmployes: 0,             // Conciergerie gère tout (ménage, draps, accueil)
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
    nbEmployes: 0,             // Conciergerie gère tout
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
    nbEmployes: 0,             // Conciergerie gère tout
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
    nbEmployes: 0,             // Conciergerie gère tout
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
    nbEmployes: 0,             // Conciergerie gère tout (même en optimiste)
    source: "Top 25% — leader segment, RevPAR élevé, forte marge grâce à l'occupation",
  },
};

// ======= CHARGES D'EXPLOITATION =======
const CHARGES = {
  // ═══════════════════════════════════════════════════════════════
  // ANALYSE APPROFONDIE — Sources : CNSS 2025, SMIG 2026, Lydec,
  // ONEE, benchmark opérateurs STR Maroc, cabinets comptables Casa
  // ═══════════════════════════════════════════════════════════════

  // --- Gestion — 20% du CA hébergement brut ---
  // Via conciergerie externe (standard Maroc : 20% du CA)
  // La conciergerie gère listings, pricing, coordination, check-in/out de jour
  // ⚠ RT 2★ norme A : "Personnel d'accueil présent 24h/24 7j/7"
  // → Nécessite au minimum 1 gardien de nuit en plus de la conciergerie
  tauxGestion: 0.20,

  // --- Utilities : EAU + ÉLECTRICITÉ ---
  // Tarif commercial Lydec Casablanca : ~1.07 MAD/kWh (vs 1.17 résidentiel)
  // Appart meublé avec clim : ~200-400 kWh/mois occupé, ~80-120 kWh vide (frigo, veille)
  // Eau : ~150-250 MAD/mois par unité occupée
  // Parties communes (hall, couloirs, éclairage, ascenseur) : ~1,500 MAD/mois fixe
  // MODÈLE : partie fixe + partie variable (proportionnelle à l'occupation)
  utilitiesFixe: 500,         // MAD / mois — parties communes LED + ascenseur basse conso (bâtiment neuf)
  utilitiesVarParUnite: 400,  // MAD / mois / unité occupée (eau + élec + clim)
  // Pour occupation 48% (5.3 unités occupées en moy) : 500 + 5.3×400 = 2,620 MAD/mois
  // Pour occupation 60% (6.6 unités) : 500 + 6.6×400 = 3,140 MAD/mois

  internetTv: 1_200,          // MAD / mois — fibre pro Inwi/Maroc Telecom 100Mbps (~400) + IPTV (800)
  // Source : Inwi Pro 2025, fournisseurs IPTV Maroc. 11 unités partagent 1 connexion pro

  // --- Assurance multirisque professionnelle ---
  assurance: 22_000,          // MAD / an — multirisque RT classé (incendie, RC, bris machines, perte exploitation)
  // Source : courtiers Casablanca, fourchette 18,000-28,000 pour RT classée 2★
  // ⚠ AUDIT RT : augmenté de 18K→22K — RT classé avec cuisine/unité = risque incendie accru
  // Inclut RC professionnelle obligatoire pour hébergement touristique classé

  // --- Entretien & maintenance ---
  // Nouveau bâtiment : 1-1.5% de la valeur construction/an
  // Budget construction ~4.5M → 1% = 45,000, mais garanti 5 ans → réduit An 1-3
  entretienBase: 25_000,      // MAD / an — années 1-5 (bâtiment neuf sous garantie)
  entretienMature: 45_000,    // MAD / an — après 5 ans (vieillissement normal)
  // ⚠ AUDIT RT : augmenté de 20K/40K → 25K/45K — cuisine/unité = entretien plomberie/électroménager supplémentaire
  // Le moteur appliquera entretienBase si y < 5, entretienMature sinon

  // --- Salaires ---
  // SMIG 2026 : 3,400 MAD/mois brut (17.92 MAD/h × 191h)
  // Source : Décret SMIG janvier 2026, neoexpertise.net
  // Employés au SMIG, non déclarés CNSS (pratique courante petit hébergement Maroc)
  // Salaires (utilisés uniquement en mode in-house, pas en mode conciergerie)
  salaireConcierge: 3_400,    // MAD / mois — SMIG, accueil/réception
  salaireMenage: 3_400,       // MAD / mois — SMIG, ménage + linge
  nbEmployes: 0,              // 0 = conciergerie gère tout (défaut) | 2 = in-house
  // ⚠ NOTE : nbEmployes = 0 car le mode par défaut est conciergerie (20% CA, tout inclus)
  // En mode in-house (gestionDuel), les employés sont ajoutés au SMIG sans CNSS

  // --- Gardien de nuit (AUDIT RT 2★) ---
  // Norme A obligatoire : "Personnel d'accueil présent 24h/24 7j/7"
  // Même en mode conciergerie, un gardien de nuit est nécessaire pour la classification RT
  // La conciergerie couvre le jour (check-in/out), le gardien couvre la nuit (22h-8h)
  salaireGardienNuit: 3_400,  // MAD / mois — SMIG, gardien nuit (22h-8h)
  gardienNuitEnabled: true,   // true = gardien nuit budgété (RT 2★ conforme)

  // --- Charges sociales patronales ---
  // Employés non déclarés CNSS → pas de charges sociales patronales
  // ⚠ Risque juridique : en cas de contrôle CNSS, redressement possible
  // Taux légal si déclaration : AF 6.40% + PS 8.60% + AMO 4.11% + Formation 1.60% = 20.71%
  chargesSociales: 0,         // 0% — employés non déclarés (réalité terrain)

  // --- Comptable / Expert-comptable ---
  // TPE/PME Casablanca : forfait annuel 24,000-36,000 MAD pour tenue + déclarations
  // Petite RT = 1 visite/mois + bilan annuel + déclarations fiscales
  // Source : lec.ma, tmsonline.ma 2025
  comptableAnnuel: 36_000,    // MAD / AN — ⚠ AUDIT MÉTIER v85 : corrigé 30K→36K
  // = 3,000 MAD/mois — cabinet comptable Casablanca pour SARL hôtelière
  // Justification : TVA double taux (10% hébergement + 20% commercial), IS avec exonérations devises,
  // cotisation minimale, déclarations CNSS (gardien), bilan annuel complexe
  // Source : LEC.ma (TPE 2K-5K/mois, hausse +15% depuis 2023), TMSOnline.ma

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
  consommablesParNuitee: 35,  // MAD / nuitée occupée — RT 2★ exige amenities + consommables cuisine
  // Pour 11 unités × 365j × 48% occ = 1,928 nuitées → 67,480 MAD/an
  // Amenities ~7 MAD + produits ménagers ~5 MAD + linge (usure+lavage) ~15 MAD
  // + consommables cuisine RT (éponge, liquide vaisselle, sacs poubelle, thé/café) ~5 MAD + divers ~3 MAD
  // ⚠ AUDIT RT : augmenté de 30→35 MAD — la cuisine obligatoire RT génère des consommables supplémentaires

  menageLinge: 0,             // Internalisé via employé dédié (salaireMenage)

  // --- CHARGES AJOUTÉES (AUDIT RT 2★ avril 2026) ---

  // Blanchisserie / lavage linge entre séjours
  // RT 2★ norme A : "Linge de toilette en coton" fourni à chaque client
  // 11 unités × ~175 nuitées/an/unité × 12 MAD/nuitée = ~23K MAD/an
  // Buanderie sous-sol réduit le coût vs prestataire externe
  blanchisserieParNuitee: 12, // MAD / nuitée — lavage draps + serviettes

  // Renouvellement linge annuel (usure intensive STR)
  // Draps, serviettes, oreillers : durée de vie ~12-18 mois en STR
  renouvellementLingeAnnuel: 15_000, // MAD / an — remplacement progressif linge usé

  // --- COÛTS AJOUTÉS (rapport qualitative mars 2026) ---

  // Renouvellement mobilier : cycle de 7 ans, 40K MAD/unité
  // Source : benchmark hôtelier, durée de vie mobilier STR 5-7 ans
  renouvellementMobilierCycle: 7,    // années entre deux renouvellements
  renouvellementMobilierParUnite: 40_000, // MAD/unité (identique à l'ameublement initial)

  // Taxe d'habitation + taxe services communaux (TSC)
  // ⚠ AUDIT MÉTIER v85 : corrigé de 12K→35K MAD/an
  // TH : valeur locative (VL) = 3% × valeur construction (~4.5M) = 135K → taux 20% - 2.5K = ~24.5K
  // TSC : VL × 10.5% (zone urbaine Casablanca) = ~14.2K
  // Total TH + TSC ≈ 35-39K MAD/an — la TSC était complètement absente de l'ancien modèle
  // Source : CasablancaCity.ma (TH + TSC), Darify.ma, Valfoncier.ma, Loi 47-06
  // Exonération TH : 5 ans nouvelles constructions. TSC : applicable dès le début (mais engine exo 5 ans)
  taxeHabitation: 35_000,            // MAD / an (TH ~24.5K + TSC ~10.5K, à partir An 6)

  // Taxe de séjour (taxe de promotion touristique)
  // Instaurée par Dahir n° 1-19-40, Art. 4 : 2-25 MAD/nuit/personne selon classement
  // Pour résidence de tourisme / appart-hôtel non classé : 2 MAD/nuit estimé
  // Collectée auprès des touristes, reversée à la commune
  // Source : upsilon-consulting.com, DGI, communes urbaines
  taxeSejour: 5,                     // MAD / nuitée — taxe de promotion touristique RT 2★
  // ⚠ AUDIT RT : augmenté de 2→5 MAD — RT classé 2★ = tarif supérieur (Dahir 1-19-40, Art. 4)

  // Budget marketing de lancement (An 1 uniquement)
  // Photos pro, config listings, promotions Booking Genius, Google Ads
  // Source : analyse qualitative mars 2026
  budgetMarketingLancement: 20_000,  // MAD one-shot An 1 — photos pro + création listings

  // Frais création SARL + autorisations touristiques (An 1, one-shot)
  fraisCreation: 20_000,             // MAD one-shot An 1

  // --- Logiciel PMS / Channel Manager (AUDIT GESTION DUEL v85) ---
  // En mode auto-géré, le propriétaire doit gérer ses propres listings/réservations
  // Solution minimum : PMS + channel manager (Guesty Lite, Lodgify, Beds24, etc.)
  // Guesty Lite : ~$15/listing/mois × 11 unités = ~$165/mois ≈ 1,650 MAD/mois ≈ 20K MAD/an
  // Lodgify : ~$12-17/listing/mois, Beds24 : ~$8/listing/mois (basique)
  // Inclut : PMS, channel manager, calendrier synchronisé, messagerie auto, pricing dynamique basique
  // Serrures connectées (Nuki/Igloohome) : ~500 MAD/mois maintenance (abonnement cloud + piles)
  // Source : Guesty.com, Lodgify.com, benchmark opérateurs STR Maroc
  pmsChannelManager: 0,               // MAD / an — défaut 0 (mode conciergerie = société gère ses outils)
  pmsChannelManagerAutoGere: 15_000,  // MAD / an — activé UNIQUEMENT en mode auto-géré par computeGestionDuel
  // ⚠ N'est chargé QU'en mode auto-géré (en conciergerie, la société gère ses propres outils)

  // --- Flags Gestion Duel (AUDIT v85) ---
  // En mode conciergerie (20% CA), la société couvre : ménage, linge, check-in/out, listings
  // → La blanchisserie est INCLUSE dans les 20% (pas de double-comptage)
  // → Les consommables sont partiellement réduits (amenities fournis par conciergerie)
  // Réduction consommables conciergerie : on garde uniquement la partie « usure mobilier + cuisine »
  // soit environ 50% des 35 MAD (les 15 MAD linge + 3 MAD amenities sont couverts par la société)
  consommablesReductionConciergerie: 0.50,  // 50% des consommables couverts par conciergerie

  // Syndic : NON APPLICABLE — immeuble indivisible, monopropriété intégrale
  // Pas de copropriété, donc pas de charges de syndic
  syndic: 0,                         // MAD / an — N/A monopropriété
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
// STRATÉGIE : MDM Invest sera utilisé comme fonds de roulement (réserve trésorerie)
// et non comme réduction de dette. Les ~700K MAD seront le coussin de sécurité
// pour absorber le ramp-up et la saisonnalité des premières années.
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
// ⚠ TVA SUR INTÉRÊTS (Art. 99-2° CGI) : les taux ci-dessous sont HT.
// La banque facture en plus 10% de TVA sur les intérêts.
// Pour une entreprise assujettie TVA (hôtel 10%), cette TVA est DÉDUCTIBLE (Art. 92 CGI).
// Le moteur utilise les taux HT (= coût net correct) et gère la TVA intérêts séparément.
const TAMWILKOM = {
  tauxAnnuel: 0.025,         // HT — TTC réel = 2.75% (TVA 10% récupérable)
  dureeAns: 7,
  differeAns: 2,
  plafond: 5_000_000,
  plancher: 1_000_000,       // min 1 MDH
  maxPctProjet: 0.40,        // max 40% du coût projet
  projetMin: 2_500_000,      // 2,5 MDH minimum
};

// Banque classique — crédit investissement ENTREPRISE (SARL / TPME)
// ⚠ CORRECTION 28/03/2026 : 4,35% était le taux RÉSIDENTIEL moyen (particuliers)
//   Pour une SARL, les taux sont plus élevés (profil entreprise = plus de risque)
// Source : Bank Al-Maghrib T4-2025 — Taux débiteur moyen TPME : 5,22%
// Source : Médias24 janv 2026 — Chef d'entreprise : meilleur taux = 5,15% TAEG
// Taux directeur BAM : 2.50% (mars 2026, réduit depuis 2.75% en juin 2024)
// Fourchette marché TPME investissement : 5,17% – 5,61%
// Grandes entreprises : 4,74% – 4,96%
// NB : ce projet (7M MAD) relève de la catégorie TPME
// Durée : 7-20 ans pour investissement professionnel
const BANQUE_CLASSIQUE = {
  tauxAnnuel: 0.0520,        // HT — TTC réel = 5.72% (TVA 10% récupérable). BAM T4-2025 TPME moy 5,22%
  dureeAns: 20,              // 20 ans (maximum courant pour investissement pro)
  differeAns: 1,             // 1 an de différé capital
  // Historique :
  // V1 : 5,25% / 15 ans — initial
  // V2 : 4,35% / 20 ans — erreur, c'était le taux résidentiel particulier (Médias24 sept 2025)
  // V3 : 5,20% / 20 ans — corrigé avec taux TPME réel (BAM T4-2025 + Médias24 jan 2026)
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
  isTaux: 0.20,              // IS société marocaine — taux unique 2026+ pour BNF < 100M MAD
  caDevisesPct: 0.40,        // part du CA en devises (proportion, pas taux d'exonération)
  // ═══ EXONÉRATION IS HÔTELS — Art. 6-I-B-3° CGI Maroc ═══
  // Établissements hôteliers : exonération totale IS sur la part CA en devises
  // Durée : 60 mois (5 ans) à compter du 1er exercice d'hébergement en devises
  // Après 5 ans : la part devises est taxée au taux normal (20% depuis PLF 2026)
  // Source : Art. 6-I CGI, Art. 19-I-A CGI, Circulaire 717 DGI
  exoDevisesAns: 5,          // 5 ans d'exonération IS sur part devises (Art. 6-I-B-3° CGI)
  amortissementAns: 20,      // bâtiment amorti linéairement sur 20 ans (5%/an) — terrain non amortissable
  amortissementMobilierAns: 7, // mobilier/ameublement amorti sur 7 ans (14.3%/an)
  exoEquipementsMois: 36,    // exonération TVA équipements (Art. 92-I-6° CGI)
  exoTaxeProAns: 5,          // exonération taxe pro nouvelles constructions
  // ═══ COTISATION MINIMALE — Art. 144 CGI Maroc ═══
  cotisationMinTaux: 0.0025, // 0.25% du CA déclaré
  cotisationMinPlancher: 3_000, // plancher 3 000 MAD
  cotisationMinExoAns: 3,    // exonérée 36 mois (3 premiers exercices)
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
    { nom: "StayHere Maarif Lifestyle",    type: "RT / Appart pro",    prix: "770 MAD/n", rating: 8.5, reviews: 1927, surface: "35m²", gamme: "Premium" },
    { nom: "AS Premium By Soho Hotels",    type: "RT / Appart pro",    prix: "745 MAD/n", rating: 8.8, reviews: 1523, surface: "Suite", gamme: "Premium" },
    { nom: "unocapital",                   type: "RT / Appart pro",    prix: "750 MAD/n", rating: 8.5, reviews: 200,  surface: "45m²", gamme: "Premium" },
    { nom: "StayHere Palmier City Living",  type: "RT / Appart pro",    prix: "600 MAD/n", rating: 8.1, reviews: 922,  surface: "30m²", gamme: "Milieu+" },
    { nom: "Faya Nova Central Stay",        type: "RT / Appart pro",    prix: "615 MAD/n", rating: 8.2, reviews: 260,  surface: "42m²", gamme: "Milieu+" },
    { nom: "StayHere Oasis Residential",    type: "RT / Appart pro",    prix: "910 MAD/n", rating: 8.6, reviews: 250,  surface: "50m²", gamme: "Premium" },
    { nom: "maarif elite suite",            type: "Particulier premium", prix: "965 MAD/n", rating: 8.2, reviews: 99,   surface: "Suite", gamme: "Luxe" },
    { nom: "Chic & Cozy 1BR Oasis",        type: "Particulier premium", prix: "735 MAD/n", rating: 8.8, reviews: 59,   surface: "90m²", gamme: "Premium" },
    { nom: "W-Aldorf",                      type: "RT / Appart pro",    prix: "1175 MAD/n", rating: 8.0, reviews: 423,  surface: "85m²", gamme: "Luxe" },
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
    "Les propriétés avec services structurés (conciergerie, ménage) justifient +15-25% de premium",
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
  //   → C'EST NOTRE CIBLE avec une RT structurée
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
  { name: "Saturation offre Maarif (+50%/an)",   prob: 0.6, impact: 0.6, mitigation: "Différenciation qualité, RT classée vs Airbnb indépendant" },
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
    eligibilityNote: "Nécessite convention d'investissement. Couvre ameublement et équipements RT. 36 mois.",
    process: "Convention investissement → attestation exonération → achat HT",
    source: "Code Général des Impôts, art. 92-I-6°",
    conditions: [
      { label: "Convention d'investissement signée", requis: true, projet: true, detail: "À obtenir via CRI Casablanca-Settat" },
      { label: "Biens d'équipement identifiés", requis: true, projet: true, detail: "Ameublement 11 unités = 440K MAD HT" },
      { label: "Acquisition dans les 36 mois", requis: true, projet: true, detail: "Achat prévu pendant phase construction" },
    ],
    whyEligible: "Convention d'investissement accessible pour tout projet > 1 MDH. L'ameublement d'une RT est clairement un bien d'équipement éligible. Économie : 88K MAD de TVA.",
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
// Sources : Maroc PME, Ministère du Tourisme, Article19, LesEco,
//           Maroc.ma, Morocco World News, BarlAman Today, Lkelma
// Dernière vérification : mars 2026
// ═══════════════════════════════════════════════════════════════════════
const GO_SIYAHA_PROGRAMME = {
  // --- Infos générales ---
  nom: "Go Siyaha",
  gestionnaire: "Maroc PME (Agence nationale de développement des PME)",
  ministere: "Ministère du Tourisme, de l'Artisanat et de l'Économie Sociale et Solidaire",
  lancement: "Février 2024",
  budgetGlobal: 720_000_000,       // 720 MDH
  objectifEntreprises: 1_700,      // cible fin 2026
  plateforme: "https://marocpme.gov.ma/gosiyaha/",
  cadre: "Feuille de route tourisme 2023-2026",

  // --- Statut actuel (mars 2026) ---
  // IMPORTANT : distinction entre "demandes approuvées" et "projets financés"
  // Les chiffres officiels les plus récents datent de juillet 2025.
  // Aucune annonce de clôture — le programme s'inscrit dans la feuille de route 2023-2026.
  statut: "actif",                   // pas d'annonce de clôture à ce jour
  derniereMiseAJour: "Juillet 2025", // date des derniers chiffres confirmés
  // Chiffres vérifiés par chronologie :
  demandesApprouvees: 531,           // jan 2025, maroc.ma (processus de validation)
  projetsFinances: 24,               // fév 2025, LesEco (ayant reçu les fonds, 58M MAD invest)
  projetsAccompagnes: 1_000,         // juil 2025, Ministère (inclut assistance technique + pipeline)
  actionsAssistanceTechnique: 100,   // fév 2025, LesEco (100+ actions AT, 12M MAD)
  // Estimation restant (prudente) :
  restantEstime: "~700 (juil. 2025) — chiffre probablement réduit depuis",
  alerteChiffres: "⚠️ Les 1 000 'projets soutenus' incluent l'accompagnement technique, "
    + "pas uniquement les subventions directes. Seuls 24 projets avaient reçu "
    + "des fonds à fév. 2025. L'écart entre 'approuvé' et 'financé' est important."
    + " Aucun bilan 2026 publié à ce jour.",
  recommandation: "Traiter Go Siyaha comme un bonus, pas comme un financement central. "
    + "Le taux de conversion demandes→financement est historiquement très bas (~4.5% à fév 2025). "
    + "Ne pas intégrer la subvention dans le plan de base ; si obtenue, elle améliore le rendement.",

  // --- Taux de subvention par type ---
  subventions: [
    { type: "Animation touristique",       taux: 0.35, plafondInvest: 10_000_000, detail: "Activités touristiques, loisirs, sport" },
    { type: "Hébergement",                 taux: 0.30, plafondInvest: 10_000_000, detail: "RT, hôtels, riads, maisons d'hôtes avec activités d'animation" },
    { type: "Croissance verte / Éco",      taux: 0.40, plafondInvest: 10_000_000, detail: "Équipements éco-responsables, photovoltaïque, isolation" },
    { type: "Assistance technique",        taux: 0.90, plafondInvest: null,        detail: "Consulting, digital, stratégie financière — entreprise ne paie que 10%" },
  ],

  // --- Secteurs éligibles ---
  secteursEligibles: [
    "Hébergement (résidences de tourisme, hôtels, riads, maisons d'hôtes)",
    "Agences de voyages",
    "Transport touristique",
    "Restauration touristique",
    "Animation et divertissement touristique",
    "Activités sportives et de loisirs",
  ],

  // --- Timeline / évolution du programme ---
  timeline: [
    { date: "Février 2024",    event: "Lancement officiel du programme Go Siyaha", detail: "Budget : 720 MDH, objectif 1 700 entreprises", source: "Médias24" },
    { date: "Mai 2024",        event: "430 dossiers déposés", detail: "Premières candidatures en cours d'instruction" },
    { date: "Septembre 2024",  event: "12 premiers projets subventionnés", detail: "1ère vague : loisirs nautiques, éco-tourisme, hébergement distinctif, sport", source: "LesEco" },
    { date: "Décembre 2024",   event: "500 projets approuvés / 1 300 demandes", detail: "Interview ministre Ammor (Médias24). Taux d'approbation ~38%", source: "Médias24" },
    { date: "Janvier 2025",    event: "531 demandes approuvées", detail: "Déclaration officielle maroc.ma", source: "maroc.ma" },
    { date: "Février 2025",    event: "8ème CPP — 24 projets financés au total", detail: "58 MDH invest, 20 MDH subvention + 100 actions AT (12 MDH). Dernière vague : 11 projets éco, 23 MDH invest, 7 MDH sub", source: "LesEco, Article19" },
    { date: "Juillet 2025",    event: "1 000 projets accompagnés (59% objectif)", detail: "Inclut AT + projets en pipeline, pas uniquement subventions directes. 3 réformes annoncées", source: "Ministère du Tourisme" },
    { date: "22 juillet 2025", event: "Suppression seuil minimum investissement", detail: "Plus besoin de 1M MAD minimum — ouvert aux micro-entreprises, coopératives, jeunes", source: "Article19, Ministère" },
    { date: "22 juillet 2025", event: "Ouverture aux entreprises existantes", detail: "Les entreprises existantes peuvent postuler si elles développent de nouvelles activités d'animation", source: "Article19" },
    { date: "22 juillet 2025", event: "Assistance technique dès la conception", detail: "Support disponible avant même la création de l'entreprise (structuration idée, business plan)", source: "Ministère" },
    { date: "Mars 2026",       event: "⚠️ Pas de bilan 2026 publié", detail: "Programme toujours dans la feuille de route 2023-2026. Aucune annonce de clôture. Chiffres actualisés non disponibles.", source: "Vérification Claude — mars 2026" },
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

  // --- Projets financés documentés (attention : chiffres cumulatifs au 8ème CPP) ---
  projetsFinancesDetail: [
    { date: "Sept 2024", nb: 12, types: "Nautisme, éco-tourisme, hébergement distinctif, sport", investissement: null, source: "LesEco, Médias24" },
    { date: "Fév 2025",  nb: 11, types: "Éco-tourisme (panneaux solaires, gestion énergie)", investissement: 23_000_000, subvention: 7_000_000,
      villes: "Dakhla, Berkane, Casablanca, Azilal, Tanger, Khenifra, Sefrou, M'diq, Errachidia, Marrakech",
      fourchette: "130K MAD (maison d'hôtes solaire) à ~10M MAD (hôtel club)", source: "LesEco" },
    // NB : le cumul 24 projets / 58M MAD / 20M subv est le TOTAL depuis le lancement, pas une 3ème vague
    { date: "Fév 2025 (cumul)", nb: 24, types: "Total tous CPP : animation + éco-tourisme", investissement: 58_000_000, subvention: 20_000_000,
      note: "Cumul confirmé par LesEco. 100+ actions d'assistance technique (12M MAD) en complément.", source: "LesEco" },
  ],

  // --- Risques & alertes ---
  risques: [
    { risque: "Bureaucratie documentaire",       severite: "moyen",  detail: "Dossier complet exigé (business plan, étude de marché, devis). Rejet si incomplet." },
    { risque: "Délais de traitement",             severite: "moyen",  detail: "4-8 semaines annoncé mais peut s'allonger. Le CPP ne se réunit pas en continu." },
    { risque: "Places limitées — incertitude",     severite: "élevé",  detail: "~700 restants (juil. 2025, 8 mois). Chiffre probablement réduit. Aucun bilan 2026 publié. Déposer le dossier rapidement." },
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
      "~700 packages restants (juil. 2025) — chiffre probablement réduit, déposer rapidement",
      "Écart important entre 'approuvé' (531) et 'financé' (24) — pipeline lent",
      "Business plan et étude de marché solides requis",
      "Versement sur preuves d'avancement, pas d'avance",
      "Le CPP valide au cas par cas — pas automatique",
      "Aucun bilan 2026 publié — statut exact inconnu",
    ],
  },

  // --- Sources vérifiées (mars 2026) ---
  sources: [
    { label: "Plateforme officielle Maroc PME", url: "https://marocpme.gov.ma/gosiyaha/" },
    { label: "Maroc.ma — 531 demandes approuvées (jan 2025)", url: "https://www.maroc.ma/fr/actualites/programme-go-siyaha-531-demandes-approuvees-ce-jour" },
    { label: "LesEco — 8ème CPP, 11 projets éco validés (fév 2025)", url: "https://leseco.ma/maroc/go-siyaha-11-nouveaux-projets-valides-pour-un-tourisme-plus-durable.html" },
    { label: "Article19 — Élargissement PME et existants (juil 2025)", url: "https://article19.ma/accueil/archives/185409" },
    { label: "Ministère du Tourisme — Suppression des barrières (juil 2025)", url: "https://mtaess.gov.ma/fr/go-siyaha-supprime-ses-barrieres-pour-les-entrepreneurs-du-tourisme/" },
    { label: "Médias24 — Lancement 720 MDH (fév 2024)", url: "https://medias24.com/2024/02/15/go-siyaha-un-programme-a-720-mdh-pour-accompagner-plus-de-1-700-entreprises-touristiques/" },
    { label: "Médias24 — Bilan d'étape avec Ammor (déc 2024)", url: "https://medias24.com/2024/12/11/tourisme-bilan-detape-du-programme-go-siyaha-avec-f-z-ammor-interview/" },
    { label: "FNIH — Pourquoi il faut y croire", url: "https://www.fnih.ma/10313-2/" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// MONTAGES D'EXPLOITATION — Analyse comparative
// Contexte : MRE, résidence de tourisme Casablanca, MDM Invest, Go Siyaha
// Sources : CGI Maroc (LF 2026), Upsilon Consulting, Tax-News,
//           LesEco, Valfoncier, Armonia Solutions, AMDE
// Dernière vérification : mars 2026
// ═══════════════════════════════════════════════════════════════════════

const MONTAGES_EXPLOITATION = {
  // --- Contexte fiscal Maroc 2026 ---
  contexteFiscal: {
    IS_2026: [
      { tranche: "≤ 300 000 MAD", taux: 0.20, note: "Taux cible 2026 (était 17.5% en 2025)" },
      { tranche: "300 001 – 1 000 000 MAD", taux: 0.20, note: "Unifié à 20%" },
      { tranche: "1 000 001 – 100 000 000 MAD", taux: 0.20, note: "Convergence vers 20% (était 22.75% en 2025)" },
      { tranche: "≥ 100 000 000 MAD", taux: 0.35, note: "Grandes entreprises" },
    ],
    IS_note: "L'IS marocain est PROPORTIONNEL (non progressif) : tout le bénéfice est taxé au taux de la tranche dans laquelle il tombe.",
    cotisationMinimale: { taux: 0.0025, plancher: 3_000, exonerationCreation: "36 mois (extensible à 60 mois)" },
    TVA_hebergement: 0.10,
    TVA_standard: 0.20,
    exonerationHotelDevises: {
      duree: "5 ans (60 mois consécutifs)",
      condition: "CA réalisé en devises dûment rapatriées (virements bancaires étrangers, CB internationales, vouchers agences 'client non résident')",
      apres5ans: "Taux réduit de 20% sur la part devises (LF 2026)",
      attention: "Seule la quote-part devises est exonérée. Le CA en MAD (clients locaux) est taxé normalement dès le départ."
    },
    taxeProfessionnelle: "Exonération 5 ans pour toute nouvelle activité",
    droitsEnregistrement: "Exonération sur terrain nu si construction touristique achevée sous 6 ans, hypothèque légale État, conservation 10 ans",
    dividendes: {
      retenueSurce: 0.1125,
      retenueSurceNote: "11,25% en 2026 (LF 2023 : 15%→13,75%→12,5%→11,25%→10% en 2027)",
      abattementHolding: 1.00,
      note: "Les dividendes restant dans la holding sont exonérés d'IS (100% abattement si preuve de participation + n° IF). Mais dès qu'ils remontent à la personne physique → 11,25% retenue à la source (2026)."
    },
  },

  contrainteMDM: {
    note: "MDM Invest ne prohibe pas formellement la détention en nom propre, mais en pratique il finance des projets d'entreprise (SARL/SA). Une résidence de tourisme nécessite une structure sociétaire pour : la responsabilité limitée, l'éligibilité aux subventions Go Siyaha, la récupération TVA, l'exonération IS 5 ans devises, et la crédibilité bancaire. Les banques partenaires exigent généralement une structure société.",
    apportMinMRE: 0.25,
    contributionMDM: 0.10,
  },

  montages: [
    {
      id: "sarl-unique",
      rang: 1,
      nom: "SARL Unique",
      sousTitre: "Une seule société détient les murs ET exploite la résidence",
      recommandation: "Recommandé",
      schema: "Vous (PP) → SARL (murs + exploitation)",
      description: "Structure la plus simple et la plus courante au Maroc pour les résidences de tourisme. La SARL détient l'immeuble, gère l'exploitation, emploie le personnel, et encaisse les revenus.",
      avantages: [
        { point: "Simplicité maximale", detail: "Un seul jeu de comptabilité, une seule liasse fiscale, un seul commissaire aux comptes si CA > 50M MAD (sinon facultatif)." },
        { point: "Coûts de création et de gestion minimaux", detail: "~5 000–8 000 MAD de frais de création. Pas de conventions réglementées inter-sociétés." },
        { point: "Éligible Go Siyaha + MDM Invest", detail: "SARL = forme juridique standard acceptée par Maroc PME et Tamwilcom." },
        { point: "Exonération IS 5 ans sur CA devises", detail: "La SARL exploitante bénéficie directement de l'exonération hébergement touristique (art. 6-I-B-3 CGI). S'applique aux RT classées." },
        { point: "TVA 10% récupérable", detail: "TVA sur achats de construction et équipements récupérable. TVA hébergement à 10%." },
        { point: "Amortissement du bâtiment", detail: "L'immeuble s'amortit sur 20-25 ans, réduisant la base imposable chaque année." },
        { point: "Pas de problème de prix de transfert", detail: "Pas de loyer inter-sociétés à justifier auprès de l'administration fiscale." },
      ],
      inconvenients: [
        { point: "Pas de protection patrimoniale", detail: "Si la SARL a des dettes d'exploitation (fournisseurs, salariés), l'immeuble peut être saisi par les créanciers de la SARL." },
        { point: "Fiscalité sur la plus-value si cession", detail: "La plus-value est taxée comme bénéfice IS (20%), puis distribution du produit soumise à 11,25% retenue source (2026)." },
        { point: "Pas de flexibilité successorale", detail: "Transmettre la SARL = transmettre murs + exploitation en bloc." },
        { point: "Mélange des risques", detail: "Un litige d'exploitation expose directement l'actif immobilier." },
      ],
      fiscalite: {
        IS: "20% sur bénéfice net (LF 2026). Exonération 5 ans sur CA devises.",
        TVA: "10% hébergement. Récupération TVA sur investissements.",
        cotisationMin: "0.25% du CA, min 3 000 MAD. Exonéré 36 mois.",
        dividendes: "11,25% retenue à la source (2026) sur distribution PP.",
        taxePro: "Exonéré 5 ans.",
      },
      scoreSimplicite: 5, scoreProtection: 2, scoreFiscal: 4, scoreFlexibilite: 2, scoreGlobal: 4,
    },
    {
      id: "sci-sarl",
      rang: 2,
      nom: "SCI + SARL Exploitation",
      sousTitre: "SCI détient les murs, SARL exploite la RT",
      recommandation: "Possible mais attention",
      schema: "Vous (PP) → SCI (murs) ← loyer → SARL (exploitation)",
      description: "La SCI détient l'immeuble et le loue NUE à la SARL d'exploitation. Au Maroc, la SCI est une société CIVILE interdite d'activité commerciale. Si elle perçoit des loyers meublés ou exploite un hébergement touristique → requalification en activité commerciale → IS automatique. Seule la location nue (sans meubles/services) est permise pour garder le statut civil.",
      avantages: [
        { point: "Protection patrimoniale", detail: "L'immeuble dans la SCI est protégé des créanciers de la SARL d'exploitation." },
        { point: "Flexibilité successorale", detail: "Transmission progressive des parts de la SCI aux héritiers sans toucher à l'exploitation." },
        { point: "Loyer = charge déductible", detail: "Le loyer SARL→SCI réduit le bénéfice imposable de la SARL." },
        { point: "Option IR pour la SCI", detail: "Si location NUE : revenus fonciers imposés à l'IR des associés. Avantageux si revenus globaux modestes." },
      ],
      inconvenients: [
        { point: "Complexité administrative x2", detail: "Deux comptabilités, deux déclarations fiscales, deux AG annuelles." },
        { point: "Coût doublé", detail: "~10 000–15 000 MAD pour les deux structures." },
        { point: "Risque requalification fiscale", detail: "Le loyer SCI→SARL doit être au prix de marché, sinon abus de droit." },
        { point: "SCI à l'IS si meublé", detail: "Location meublée = activité commerciale → SCI bascule à l'IS automatiquement." },
        { point: "Pas d'exonération 5 ans pour la SCI", detail: "La SCI en location nue n'est pas un établissement d'hébergement touristique." },
        { point: "Pas d'amortissement si IR", detail: "SCI à l'IR = revenus fonciers sans amortissement." },
        { point: "MDM Invest = flou pour SCI", detail: "La SCI est civile. L'apport MDM irait sur la SARL, pas la SCI." },
      ],
      fiscalite: {
        IS_SCI: "Option IR (location nue) : revenus fonciers IR associés. Option IS (si meublé) : 20%.",
        IS_SARL: "20% sur bénéfice net. Exonération 5 ans CA devises.",
        TVA: "SCI location nue : exonérée TVA. SARL : 10% hébergement.",
        loyer: "Doit être au prix de marché. Attention prix de transfert.",
        dividendes: "11,25% retenue source (2026) sur toute distribution PP.",
      },
      scoreSimplicite: 2, scoreProtection: 4, scoreFiscal: 3, scoreFlexibilite: 4, scoreGlobal: 3,
    },
    {
      id: "deux-sarl",
      rang: 3,
      nom: "SARL Murs + SARL Exploitation",
      sousTitre: "Deux SARL séparées : immobilier + gestion",
      recommandation: "Surdimensionné",
      schema: "Vous (PP) → SARL Immo (murs) ← loyer → SARL RT (exploitation)",
      description: "Même logique de séparation mais avec deux SARL commerciales. La SARL Immo détient l'immeuble et loue à la SARL RT.",
      avantages: [
        { point: "Protection patrimoniale forte", detail: "L'immeuble est protégé des créanciers de l'exploitation." },
        { point: "Amortissement dans SARL Immo", detail: "Contrairement à la SCI à l'IR, l'immeuble est amorti sur 20-25 ans." },
        { point: "Cohérence juridique", detail: "Deux SARL = même cadre juridique, pas de complexité SCI." },
        { point: "Loyer déductible", detail: "Même avantage que SCI + SARL." },
      ],
      inconvenients: [
        { point: "Double imposition structurelle", detail: "SARL Immo paie IS sur loyers + SARL RT paie IS sur bénéfice + 11,25% retenue sur chaque distribution PP. Triple couche." },
        { point: "Complexité et coûts x2", detail: "Deux comptabilités, conventions réglementées, etc." },
        { point: "Pas d'exonération devises pour SARL Immo", detail: "Location ≠ hébergement touristique." },
        { point: "Surdimensionné pour 11 unités", detail: "Se justifie pour un parc de 5+ immeubles ou CA > 10M MAD." },
      ],
      fiscalite: {
        IS_Immo: "20% sur loyers nets (après amortissement). Pas d'exonération devises.",
        IS_RT: "20% sur bénéfice net. Exonération 5 ans CA devises.",
        TVA: "SARL Immo : TVA 20% sur loyers commerciaux. SARL RT : 10%.",
        dividendes: "11,25% retenue source (2026) × 2 sociétés.",
      },
      scoreSimplicite: 1, scoreProtection: 4, scoreFiscal: 2, scoreFlexibilite: 3, scoreGlobal: 2,
    },
    {
      id: "holding",
      rang: 4,
      nom: "Holding + 2 SARL",
      sousTitre: "Holding chapeaute SARL Immo et SARL Exploitation",
      recommandation: "Prématuré — si expansion",
      schema: "Vous (PP) → Holding SARL → SARL Immo + SARL RT",
      description: "La holding détient les parts des deux SARL. Dividendes filiales→holding exonérés IS 100%. Structure de groupe pour investisseurs multi-projets.",
      avantages: [
        { point: "Exonération dividendes 100%", detail: "Dividendes filiales→holding exonérés d'IS (art. 6-I-C-1 CGI). L'argent circule dans le groupe sans fiscalité." },
        { point: "Réinvestissement facilité", detail: "La holding réinvestit les dividendes sans que l'argent remonte à la PP (pas de 11,25% retenue)." },
        { point: "Consolidation et mutualisation", detail: "Services communs facturés par la holding. Optimisation des charges." },
        { point: "Protection maximale", detail: "Trois niveaux de séparation patrimoine personnel / actifs." },
        { point: "Vision expansion", detail: "Prêt pour un 2ème immeuble ou un autre business." },
      ],
      inconvenients: [
        { point: "Coût et complexité x3", detail: "3 sociétés = 3 comptabilités, 3 liasses, 3 AG. ~15 000–25 000 MAD/an de gestion." },
        { point: "Cotisation minimale x3", detail: "3 × 3 000 MAD/an minimum, même si la holding ne fait que percevoir des dividendes." },
        { point: "Pas d'économie fiscale immédiate", detail: "Les dividendes sont exonérés dans la holding, mais in fine PP → 15%. Le gain n'existe que si réinvestissement intra-groupe." },
        { point: "Prématuré pour un seul projet", detail: "Pour 11 unités et CA < 3M MAD, le coût de 3 structures ne se justifie pas." },
        { point: "Complexité prix de transfert x3", detail: "3 sociétés liées = risque accru de contrôle fiscal." },
      ],
      fiscalite: {
        IS_Holding: "20% sur bénéfice propre. Dividendes reçus exonérés 100%.",
        IS_Immo: "20% sur loyers nets.",
        IS_RT: "20% sur bénéfice net. Exonération 5 ans devises.",
        dividendes: "Filiales→Holding : 0%. Holding→PP : 15%.",
      },
      scoreSimplicite: 1, scoreProtection: 5, scoreFiscal: 3, scoreFlexibilite: 5, scoreGlobal: 2,
    },
  ],

  classement: [
    { rang: 1, id: "sarl-unique", raison: "Simplicité, coût minimal, éligibilité directe Go Siyaha + MDM Invest + exonération 5 ans devises. Pour un seul immeuble de 11 unités, c'est le choix rationnel." },
    { rang: 2, id: "sci-sarl", raison: "Intéressant SI objectif successoral fort. Mais complexité et risque requalification fiscale ne se justifient pas pour ce projet." },
    { rang: 3, id: "holding", raison: "À envisager UNIQUEMENT si expansion prévue (2ème immeuble dans les 3-5 ans). L'exonération dividendes 100% ne sert que si réinvestissement intra-groupe." },
    { rang: 4, id: "deux-sarl", raison: "Pire des deux mondes : complexité sans avantage fiscal de la holding. Pas recommandé." },
  ],

  recommandation: {
    montageRecommande: "sarl-unique",
    justification: "Pour une résidence de tourisme de 11 unités à Casablanca avec un budget de ~6M MAD et un CA prévisionnel < 3M MAD, la SARL unique offre le meilleur rapport simplicité/avantage fiscal. L'exonération IS 5 ans sur le CA devises + la TVA 10% récupérable + l'amortissement du bâtiment couvrent l'essentiel de l'optimisation.",
    evolutionPossible: "Si expansion prévue, vous pourrez créer une holding a posteriori et y loger la SARL existante par apport de parts.",
    attention: "⚠️ Analyse indicative. Consulter un expert-comptable marocain spécialisé hébergement touristique avant de valider.",
  },

  sources: [
    { label: "CGI Maroc — Exonération hébergement touristique art. 6-I-B-3", url: "https://www.finances.gov.ma/fr/vous-orientez/Pages/vos-impots-en-bref.aspx" },
    { label: "LesEco — Règles fiscales tourisme 2026", url: "https://leseco.ma/business/investissement-touristique-les-regles-fiscales-incontournables-de-2026.html" },
    { label: "Upsilon — Fiscalité hébergement touristique Maroc", url: "https://www.upsilon-consulting.com/quelle-fiscalite-des-hotels/" },
    { label: "Valfoncier — SCI au Maroc", url: "https://valfoncier.ma/sci-societe-civile-immobiliere-maroc/" },
    { label: "Armonia — Holding au Maroc 2025", url: "https://armonia-solutions.com/creation-societe/creer-holding-maroc/" },
    { label: "Tax-News — Holding au Maroc", url: "https://tax-news.ma/pourquoi-creer-une-societe-holding-au-maroc-a-partir-du-1er-janvier-2020/" },
    { label: "AMDE — Taux IS 2026", url: "https://amde.ma/taux-de-limpot-sur-les-societes-is-au-maroc/" },
    { label: "Tamwilcom — MDM Invest", url: "https://www.ccg.ma/fr/votre-projet/mdm-invest" },
  ],
};

// ============================================================
// CAHIER DES CHARGES — Résidence de Tourisme (RT)
// Sources : Décret 2-22-867 (BO 7462 bis) + Arrêté 985-24 (BO 7407 bis)
// ============================================================

const RT_CAHIER_CHARGES = {
  // --- Textes réglementaires ---
  textes: [
    { nom: "Décret n° 2-22-867", bo: "BO 7462 bis", date: "30/12/2023", objet: "Normes d'Équipement Dimensionnelles et Fonctionnelles (NEDF) — Construction, surfaces minimales, équipements obligatoires" },
    { nom: "Arrêté n° 985-24", bo: "BO 7407 bis", date: "27/05/2025", objet: "Normes de Production et Qualité des Services (NPQS) — Classification par étoiles, services, équipements intérieurs" },
    { nom: "Arrêté n° 836-24", bo: "BO 7407 bis", date: "27/05/2025", objet: "Normes spécifiques aux Résidences Immobilières Adossées (RIA)" },
  ],

  // --- Système de notation ---
  systemeNotation: {
    description: "Chaque norme est classée A (obligatoire) ou B (complémentaire). Les normes A doivent être respectées à 100%. Les normes B doivent atteindre un score agrégé minimal de 70%.",
    normeA: "Obligatoire — 100% de conformité requise",
    normeB: "Complémentaire — Score pondéré, min 70% de l'ensemble des normes B",
  },

  // --- Surfaces minimales par catégorie (Décret 2-22-867) ---
  surfacesMinimales: [
    { categorie: "RT Luxe", surface: 20, minUnites: 11, note: "Seule catégorie avec minimum d'unités" },
    { categorie: "RT 5★", surface: 45, minUnites: null, note: "Pas de minimum d'unités explicite" },
    { categorie: "RT 4★", surface: 40, minUnites: null, note: "" },
    { categorie: "RT 3★", surface: 30, minUnites: null, note: "" },
    { categorie: "RT 2★", surface: 25, minUnites: null, note: "" },
    { categorie: "RT 1★", surface: 20, minUnites: null, note: "" },
  ],

  // --- Différence clé RT vs Hôtel ---
  differenceRtHotel: [
    { critere: "Cuisine/Kitchenette", rt: "OBLIGATOIRE dans chaque unité (norme A)", hotel: "Non requise (minibar suffit)" },
    { critere: "Minimum d'unités", rt: "Aucun minimum sauf RT Luxe (11)", hotel: "10 chambres minimum (toutes catégories)" },
    { critere: "Services de restauration", rt: "Non obligatoires (cuisine dans l'unité)", hotel: "Restaurant obligatoire dès 3★" },
    { critere: "Surface minimale", rt: "20-45 m² selon catégorie", hotel: "12-30 m² selon catégorie" },
    { critere: "Personnel d'accueil", rt: "24h/24 7j/7 (check-in)", hotel: "24h/24 7j/7 + concierge dès 4★" },
    { critere: "Nettoyage", rt: "À la demande du client", hotel: "Quotidien obligatoire" },
    { critere: "Changement draps/linge", rt: "À la demande du client", hotel: "Quotidien ou tous les 2 jours" },
    { critere: "Type de clientèle cible", rt: "Séjours moyens/longs, autonomes", hotel: "Séjours courts, service complet" },
  ],

  // --- Normes RT 2★ détaillées (Arrêté 985-24, BO 1300-1318) ---
  normesRT2: {
    categorie: "RT 2★",
    boPages: "1300-1318",
    sections: [
      {
        titre: "Enseigne extérieure et façade",
        normes: [
          { desc: "Enseigne extérieure identifiant l'établissement", type: "A", score: null },
          { desc: "Enseigne en bon état d'entretien et de propreté", type: "B", score: 3 },
          { desc: "Éclairage nocturne de l'enseigne", type: "B", score: 2 },
          { desc: "Éclairage de la porte et l'entrée", type: "B", score: 3 },
          { desc: "Façades en bon état d'entretien et de propreté", type: "A", score: null },
        ]
      },
      {
        titre: "Entrée de l'établissement",
        normes: [
          { desc: "Portique de sécurité à l'entrée principale", type: "B", score: 3 },
          { desc: "Vidéosurveillance conforme à la réglementation", type: "B", score: 3 },
          { desc: "Détecteur de matériaux à l'entrée", type: "B", score: 3 },
        ]
      },
      {
        titre: "Espace et service d'accueil",
        normes: [
          { desc: "Comptoir ou bureau d'accueil pour enregistrement (check-in)", type: "A", score: null },
          { desc: "Bonne aération naturelle ou artificielle", type: "B", score: 2 },
          { desc: "Signalétique pour repérer l'espace d'accueil", type: "B", score: 2 },
          { desc: "Espace d'accueil propre et bien rangé", type: "B", score: 3 },
          { desc: "Personnel d'accueil présent 24h/24 et 7j/7", type: "A", score: null },
          { desc: "Personnel en uniforme propre et soigné", type: "B", score: 2 },
          { desc: "Tables basses, canapés ou fauteuils", type: "B", score: 3 },
          { desc: "Affichage des prix en MAD (obligatoire)", type: "A", score: null },
          { desc: "Prix des services facturés au client affichés", type: "A", score: null },
          { desc: "Internet dans espaces communs (si zone couverte)", type: "B", score: 3 },
        ]
      },
      {
        titre: "Toilettes espaces communs",
        normes: [
          { desc: "Signalétique H/F", type: "B", score: 2 },
          { desc: "Porte d'entrée avec fermeture automatique", type: "B", score: 2 },
          { desc: "Extraction d'air (VMC) par fenêtre ou ventilation", type: "B", score: 3 },
          { desc: "VMC dans l'ensemble des toilettes", type: "B", score: 3 },
          { desc: "Lavabos eau froide et chaude avec point lumineux", type: "B", score: 5 },
          { desc: "Mitigeur automatique avec contrôle température", type: "B", score: 3 },
          { desc: "Économiseur d'eau sur robinetterie", type: "B", score: 3 },
          { desc: "Distributeur de savon double volume, système stop", type: "A", score: null },
          { desc: "Poubelle avec couvercle et ouverture à pied", type: "A", score: null },
          { desc: "Cabines WC verrouillables avec point lumineux", type: "B", score: 3 },
        ]
      },
      {
        titre: "Couloirs, coursives et escaliers",
        normes: [
          { desc: "Éclairés jour et nuit, non encombrés", type: "A", score: null },
          { desc: "Bonne aération naturelle ou artificielle", type: "B", score: 3 },
          { desc: "Décoration (tableaux, fresques, peintures)", type: "B", score: 3 },
        ]
      },
      {
        titre: "Unités d'hébergement — Général",
        normes: [
          { desc: "Numéro ou appellation identifiant chaque unité", type: "A", score: null },
          { desc: "Unité non-fumeurs avec affichette 'Interdit de fumer'", type: "A", score: null },
          { desc: "Unités accessibles près des ascenseurs/escaliers", type: "B", score: 2 },
          { desc: "Porte avec serrure électronique / fermeture auto.", type: "B", score: 2 },
          { desc: "Entrebâilleur ou judas sur la porte", type: "B", score: 2 },
          { desc: "Porte sécurisée de l'intérieur (sans possibilité ouverture ext.)", type: "B", score: 2 },
          { desc: "Personnel en uniforme / bon état", type: "B", score: 2 },
        ]
      },
      {
        titre: "Température dans l'unité",
        normes: [
          { desc: "Climatisation possible (peut être installée)", type: "B", score: 2 },
          { desc: "Température maintenue entre 18°C et 26°C", type: "A", score: null },
        ]
      },
      {
        titre: "Fenêtres et baies vitrées",
        normes: [
          { desc: "Brise-vue (voilages, moucharabieh) pour la lumière", type: "A", score: null },
          { desc: "Fenêtres conformes normes de sécurité", type: "B", score: 3 },
          { desc: "Système d'occultation (rideaux, volets ou stores)", type: "A", score: null },
          { desc: "Rideaux/volets faciles à ouvrir et fermer", type: "B", score: 2 },
          { desc: "Poignées et cadres en bon état", type: "B", score: 3 },
          { desc: "Système de brise-vue et occultation en bon état", type: "A", score: null },
        ]
      },
      {
        titre: "Téléphone - Téléviseur",
        normes: [
          { desc: "Téléphone permettant appels intérieur/extérieur", type: "B", score: 2 },
          { desc: "Téléphone (clavier, écouteur, micros) en bon état", type: "B", score: 3 },
          { desc: "Wi-Fi (si couverture zone — non applicable sinon)", type: "B", score: 3 },
          { desc: "TV écran plat, en état de marche, 2 chaînes nationales min.", type: "A", score: null },
          { desc: "TV installée dans toutes les unités", type: "B", score: 3 },
          { desc: "TV sur support ou accroché au mur", type: "B", score: 3 },
          { desc: "Accès min. 3 chaînes étrangères", type: "B", score: 2 },
          { desc: "Télécommande, câbles invisibles, image nette", type: "B", score: 3 },
        ]
      },
      {
        titre: "Lits, literie et éclairage de chevet",
        normes: [
          { desc: "Lits aux dimensions min. : doubles 140×190 cm ou twin 80×190 cm", type: "A", score: null },
          { desc: "Tête de lit prévue", type: "A", score: null },
          { desc: "Lit supplémentaire adulte + alèse disponible sur demande", type: "B", score: 2 },
          { desc: "Lit supplémentaire bébé + alèse disponible sur demande", type: "B", score: 2 },
          { desc: "Lits supplémentaires protégés lors du stockage", type: "B", score: null },
          { desc: "Matelas d'épaisseur minimale 15 cm", type: "A", score: null },
          { desc: "Oreiller propre sans traversin (ou traversin optionnel)", type: "A", score: null },
          { desc: "Housse de protection + sommier au moins de la taille du matelas", type: "A", score: null },
          { desc: "Protège matelas en coton (alèse) lavable", type: "B", score: 2 },
          { desc: "Draps plats par lit couvrant suffisamment", type: "A", score: null },
        ]
      },
      {
        titre: "Équipement minimal dans l'unité",
        normes: [
          { desc: "1 point lumineux minimum par pièce", type: "A", score: null },
          { desc: "Spot encastré compté comme point lumineux", type: "B", score: null },
          { desc: "Lampes des abat-jours en bon état", type: "B", score: 3 },
          { desc: "Toutes les lampes en état de fonctionnement", type: "B", score: 3 },
          { desc: "Points lumineux éclairant sans zones sombres", type: "B", score: 2 },
          { desc: "1 table de chevet / table servant de bureau", type: "B", score: 3 },
          { desc: "1 miroir (bureau, coiffeuse ou porte intérieure)", type: "B", score: 2 },
          { desc: "1 prise de courant électrique libre, proche table", type: "B", score: 3 },
          { desc: "Équipements électriques en bon état", type: "B", score: 3 },
          { desc: "1 porte-bagages fixe ou pliable", type: "A", score: null },
          { desc: "Penderie : profondeur min. 50 cm, hauteur 140 cm", type: "B", score: 3 },
          { desc: "Min. 2 cintres à barres et 1 cintre à pinces par personne", type: "B", score: 3 },
          { desc: "Penderie avec tiroirs et/ou étagères", type: "B", score: 4 },
        ]
      },
      {
        titre: "Petit équipement dans l'unité",
        normes: [
          { desc: "Corbeille : 1) matériaux différents, 2) intérieur métallique, 3) ignifuge", type: "B", score: 2 },
          { desc: "Panneau 'Ne pas déranger' électronique", type: "B", score: 3 },
          { desc: "Brochures et documentation client", type: "B", score: 2 },
          { desc: "Coffre-fort électronique", type: "A", score: null },
        ]
      },
      {
        titre: "Cuisine / Kitchenette (OBLIGATOIRE RT)",
        normes: [
          { desc: "Évier + robinet mitigeur eau chaude/froide 24h/24", type: "A", score: null },
          { desc: "Économiseur d'eau sur la robinetterie", type: "A", score: null },
          { desc: "Plan de travail", type: "A", score: null },
          { desc: "Plaques de cuisson électriques", type: "A", score: null },
          { desc: "Hotte avec filtres installée", type: "B", score: 3 },
          { desc: "Prise de courant électrique dédiée cuisine", type: "A", score: null },
          { desc: "Armoire à étagères et/ou armoire murale", type: "A", score: null },
          { desc: "Vaisselle de table : 6 couverts complets (verres, assiettes, bols, tasses, cuillères, couteaux, fourchettes)", type: "B", score: 4 },
          { desc: "Théière avec 6 verres au minimum", type: "A", score: null },
          { desc: "Équipement cuisine : 1 saladier, 1 plat allant au four, 2 casseroles, 1 poêle, 1 couteau, 1 passoire", type: "B", score: 4 },
          { desc: "Four", type: "A", score: null },
          { desc: "Réfrigérateur", type: "A", score: null },
          { desc: "Machine à café", type: "B", score: 4 },
          { desc: "Bouilloire", type: "A", score: null },
          { desc: "Sacs poubelle", type: "A", score: null },
          { desc: "Poubelle munie d'un couvercle", type: "A", score: null },
        ]
      },
      {
        titre: "Sanitaires de l'unité",
        normes: [
          { desc: "Porte de salle de bain en bon état", type: "B", score: 3 },
          { desc: "VMC ou aération adéquate (fenêtre donnant sur extérieur)", type: "B", score: 3 },
          { desc: "WC : rouleau de papier toilette + dérouleur", type: "A", score: null },
          { desc: "WC : rouleau supplémentaire sur support", type: "B", score: 3 },
          { desc: "Distributeur sacs récupération serviettes hygiéniques", type: "B", score: 2 },
          { desc: "Cuvettes WC avec sièges et couvercles en bon état", type: "A", score: null },
          { desc: "Balayette WC en récipient isolant et fermé", type: "B", score: 2 },
          { desc: "Robinetterie, tuyauterie sans odeurs désagréables", type: "A", score: null },
          { desc: "Miroirs et vitres en bon état", type: "A", score: null },
          { desc: "Sols, plafonds, murs en bon état", type: "A", score: null },
          { desc: "Lavabo alimenté eau chaude et froide", type: "A", score: null },
          { desc: "Plomberie non apparente, design d'ensemble", type: "B", score: 3 },
          { desc: "Étagères pour affaires de toilette", type: "B", score: 2 },
          { desc: "2 verres retournés sur set à usage unique", type: "B", score: 2 },
          { desc: "Économiseur d'eau installé sur robinetterie", type: "B", score: 2 },
          { desc: "Chauffe-eau non apparent", type: "B", score: 3 },
          { desc: "Économiseur d'eau installé sur robinetterie (mousseur/réducteur)", type: "B", score: 3 },
          { desc: "Douche ou cabine de douche en bon état", type: "A", score: null },
          { desc: "Poignée de sécurité dans la douche", type: "A", score: null },
          { desc: "Produits d'accueil : shampoing + savon", type: "A", score: null },
          { desc: "Linge de toilette en coton (min. 1 drap 140×70, 1 serviette 70×50)", type: "A", score: null },
          { desc: "Faïence murale salle de bain / douche en bon état", type: "B", score: 3 },
          { desc: "Porte-serviette, étagère, porte-serviettes proximité douche", type: "A", score: null },
          { desc: "1 point lumineux minimum + miroir au-dessus du lavabo", type: "A", score: null },
        ]
      },
      {
        titre: "Services hôteliers",
        normes: [
          { desc: "Nettoyage des unités à la demande du client", type: "B", score: 2 },
          { desc: "Changement du linge et éponges à la demande", type: "B", score: 2 },
          { desc: "Changement des draps à la demande", type: "B", score: 2 },
          { desc: "Collecte des ordures et poubelles quotidienne", type: "B", score: null },
        ]
      },
      {
        titre: "Assistance médicale",
        normes: [
          { desc: "Trousse ou armoire de premiers secours", type: "A", score: null },
        ]
      },
      {
        titre: "Locaux des employés",
        normes: [
          { desc: "Réfectoire équipé (tables, chaises, fauteuils)", type: "B", score: 3 },
          { desc: "Bonne aération, température 18-26°C", type: "B", score: 3 },
          { desc: "Mobilier en bon état, vaisselle propre", type: "B", score: 2 },
          { desc: "Distributeurs eau potable / bouteilles", type: "B", score: 2 },
          { desc: "Lavabo au minimum (eau chaude/froide), réfectoire éloigné vestiaires", type: "B", score: 3 },
          { desc: "Vestiaires avec casiers individuels verrouillables", type: "B", score: 2 },
          { desc: "Casiers individuels verrouillables pour stagiaires", type: "B", score: 3 },
          { desc: "WC avec porte fermée, système chasse d'eau", type: "A", score: null },
          { desc: "Toilettes H/F séparées avec portes fermées", type: "B", score: 4 },
          { desc: "Douche avec porte fermée de l'intérieur", type: "A", score: null },
          { desc: "Rideaux de douche non acceptés", type: "B", score: null },
          { desc: "Lavabo eau chaude/froide + miroir + point lumineux", type: "A", score: null },
          { desc: "Économiseur d'eau (mousseur/réducteur)", type: "B", score: 3 },
          { desc: "Distributeur savon, sèche-mains, serviettes papier", type: "A", score: null },
          { desc: "Poubelle avec couvercle", type: "A", score: null },
          { desc: "Matériel locaux employés en bon état", type: "B", score: 3 },
          { desc: "Sols, plafonds, murs locaux employés en bon état", type: "A", score: null },
        ]
      },
    ],
  },

  // --- Éligibilité du projet Maarif ---
  eligibilite: {
    titre: "Éligibilité du projet Maarif",
    resume: "Le projet est éligible RT 2★ (tous les studios passent le seuil de 25 m²). Les lofts de 22,63 et 28,55 m² sont en dessous du seuil RT 2★ (25 m²) mais passent le RT 1★ (20 m²). Option : classer les lofts en catégorie inférieure ou les agrandir.",
    analyses: [
      { unite: "Studios A (×3)", surface: 37.41, rt2: true, rt1: true, note: "Largement au-dessus du seuil 2★ (25 m²)" },
      { unite: "Studios B (×4) + RDC", surface: 32.75, rt2: true, rt1: true, note: "Au-dessus du seuil 2★ (25 m²)" },
      { unite: "Studio RDC", surface: 46.10, rt2: true, rt1: true, note: "Le plus grand — passe même RT 3★ (30 m²)" },
      { unite: "Loft Étage 4", surface: 28.55, rt2: true, rt1: true, note: "Passe RT 2★ (25 m²) ✓" },
      { unite: "Loft Étage 5", surface: 22.63, rt2: false, rt1: true, note: "⚠ Sous le seuil RT 2★ (25 m²) mais passe RT 1★ (20 m²)" },
    ],
    conclusion: "9 studios sur 9 + 1 loft sur 2 passent RT 2★. Le loft de 22,63 m² (Étage 5) nécessite soit un classement mixte, soit un réaménagement (+2,37 m² en intégrant une partie de la terrasse de 15,77 m²).",
    strategieTVA: "En classant l'établissement en Résidence de Tourisme, la SARL peut récupérer la TVA sur la construction (~400-500K MAD), appliquer la TVA réduite de 10% sur l'hébergement, et bénéficier de l'exonération IS sur les devises pendant 5 ans. La cuisine/kitchenette obligatoire dans chaque unité permet de concurrencer frontalement les studios Airbnb existants à Maarif.",
  },

  // --- Sources ---
  sources: [
    { label: "Décret n° 2-22-867 — NEDF Résidences de tourisme", url: "https://www.sgg.gov.ma/BO/FR/2023/BO_7462-bis_Fr.pdf" },
    { label: "Arrêté n° 985-24 — NPQS Classification hôtelière", url: "https://www.sgg.gov.ma/BO/FR/2025/BO_7407-bis_Fr.pdf" },
    { label: "Arrêté n° 836-24 — Normes RIA", url: "https://www.sgg.gov.ma/BO/FR/2025/BO_7407-bis_Fr.pdf" },
  ],
};

// ============================================================
// AUDIT RT 2★ — Données de l'audit opérationnel (avril 2026)
// Cross-référence cahier des charges RT 2★ vs modèle financier
// ============================================================
const AUDIT_RT = {
  date: "01/04/2026",
  version: "v84",

  // --- FINDING 1 : Staffing 24/7 ---
  staffing: {
    titre: "Staffing 24/7 — Norme A obligatoire",
    normeRef: "Personnel d'accueil présent 24h/24 et 7j/7 (A)",
    heuresSemaine: 168,
    heuresLegalesEmploye: 44,
    shiftsMinimum: 4,
    models: [
      {
        nom: "In-house complet (conforme CNSS)",
        reception: 4, menage: 2, coutAnnuel: 330_000,
        pctCA: 27.7, conforme: true,
        note: "4 réceptionnistes rotation + 2 ménage, CNSS déclaré"
      },
      {
        nom: "In-house réduit (non déclaré)",
        reception: 3, menage: 1, coutAnnuel: 163_000,
        pctCA: 13.7, conforme: true,
        note: "3 réceptionnistes + 1 ménage, risque CNSS"
      },
      {
        nom: "Hybride conciergerie + gardien nuit",
        reception: 1, menage: 0, coutAnnuel: 279_000,
        pctCA: 23.4, conforme: true, recommended: true,
        note: "Conciergerie jour (20% CA) + gardien nuit SMIG — RECOMMANDÉ"
      },
      {
        nom: "Conciergerie pure (ancien modèle)",
        reception: 0, menage: 0, coutAnnuel: 239_000,
        pctCA: 20.0, conforme: false,
        note: "⚠ NON CONFORME — aucune présence nocturne"
      },
    ],
    verdict: "CRITIQUE",
    correction: "Ajout d'un gardien de nuit au SMIG (3,400 MAD/mois = 40,800 MAD/an)",
  },

  // --- FINDING 2 : Budget ameublement ---
  ameublement: {
    titre: "Budget ameublement RT 2★",
    budgetActuel: 40_000,
    coutEstimeRT: 38_250,
    coutNormesA: 33_350,
    coutNormesB: 4_900,
    verdict: "OK",
    ventilation: [
      { categorie: "Cuisine (RT obligatoire)", cout: 15_500, pct: 41 },
      { categorie: "Chambre / Literie", cout: 10_900, pct: 28 },
      { categorie: "Climatisation", cout: 5_000, pct: 13, note: "Souvent dans budget construction" },
      { categorie: "Électronique (TV + coffre-fort)", cout: 4_000, pct: 10 },
      { categorie: "Sanitaires", cout: 1_050, pct: 3 },
      { categorie: "Fenêtres (rideaux/occultants)", cout: 1_000, pct: 3 },
      { categorie: "Éclairage", cout: 800, pct: 2 },
    ],
    note: "Budget suffisant avec marge de 1,750 MAD/unité. La clim (5K) est normalement dans le budget construction.",
  },

  // --- FINDING 3 : Charges corrigées ---
  charges: {
    titre: "Charges sous-estimées — corrections RT",
    corrections: [
      { poste: "Gardien de nuit", ancien: 0, nouveau: 40_800, raison: "Norme A 24/7 — présence nocturne obligatoire", verdict: "AJOUT" },
      { poste: "Blanchisserie", ancien: 0, nouveau: 23_136, raison: "Lavage draps/serviettes entre séjours (12 MAD/nuitée)", verdict: "AJOUT" },
      { poste: "Renouvellement linge", ancien: 0, nouveau: 15_000, raison: "Usure intensive STR, remplacement annuel progressif", verdict: "AJOUT" },
      { poste: "Consommables", ancien: 57_840, nouveau: 67_480, raison: "RT exige amenities + consommables cuisine (30→35 MAD/nuitée)", verdict: "AUGMENTÉ" },
      { poste: "Taxe de séjour", ancien: 3_856, nouveau: 9_640, raison: "RT classé 2★ = 5 MAD/nuit (vs 2 MAD non classé)", verdict: "AUGMENTÉ" },
      { poste: "Assurance", ancien: 18_000, nouveau: 22_000, raison: "RT classé + cuisine/unité = risque incendie accru", verdict: "AUGMENTÉ" },
      { poste: "Entretien (neuf)", ancien: 20_000, nouveau: 25_000, raison: "Cuisine/unité = entretien plomberie/électroménager supplémentaire", verdict: "AUGMENTÉ" },
      { poste: "Utilities", ancien: 45_700, nouveau: 50_100, raison: "Norme A 18-26°C + cuisine = consommation élec supérieure", verdict: "AUGMENTÉ" },
    ],
    ecartTotal: 109_000,
    pctAugmentation: 19.1,
  },

  // --- FINDING 4 : Impact rentabilité ---
  impact: {
    titre: "Impact sur la rentabilité",
    scenarioRealiste: {
      revBrut: 1_193_000,
      revTotal: 1_191_000,
      chargesActuel: 532_000,
      chargesCorrige: 640_000,
      ebitdaActuel: 659_000,
      ebitdaCorrige: 550_000,
      margeActuelle: 55.3,
      margeCorrigee: 46.2,
    },
    verdict: "Le projet reste RENTABLE malgré les corrections (+109K MAD/an de charges).",
  },

  // --- FINDING 5 : Avantages RT vs Hôtel ---
  avantagesRT: [
    "Nettoyage À LA DEMANDE (pas quotidien) → réduit personnel ménage de 50%",
    "Pas de restaurant obligatoire → pas de chef, pas de stock alimentaire, pas de licence",
    "Pas de concierge dédié (obligatoire hôtel dès 4★)",
    "Récupération TVA construction estimée ~400-500K MAD",
    "Pas de minimum d'unités (sauf RT Luxe = 11)",
    "Cuisine dans l'unité = argument commercial fort vs Airbnb",
    "Changement draps/linge à la demande = économie estimée 30% vs quotidien",
  ],

  // --- Équipements complémentaires recommandés ---
  equipementsComplementaires: [
    { item: "Serrures connectées (self check-in)", cout: 8_800, note: "11 unités × 800 MAD — facilite check-in tardif" },
    { item: "Interphone/vidéo entrée", cout: 3_000, note: "Sécurité + accueil à distance" },
    { item: "Tablette accueil", cout: 2_000, note: "Self check-in automatisé" },
    { item: "Machine à laver professionnelle (sous-sol)", cout: 15_000, note: "Réduit coût blanchisserie de 30-40%" },
    { item: "Sèche-linge professionnel (sous-sol)", cout: 12_000, note: "Complément buanderie sous-sol" },
  ],
};
