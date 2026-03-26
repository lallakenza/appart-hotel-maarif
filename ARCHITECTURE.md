# Appart'Hôtel Maarif — Architecture Technique & Documentation

## Vue d'ensemble

Dashboard d'analyse financière pour un projet d'appart-hôtel à Maarif, Casablanca.
Application 100% vanilla JS (aucun framework), déployée sur GitHub Pages.

- **Repo** : `lallakenza/appart-hotel-maarif`
- **Branche** : `gh-pages` (déploiement direct)
- **URL** : `https://lallakenza.github.io/appart-hotel-maarif/`
- **Lib externe** : Chart.js 4.4.1 (CDN)
- **Cache-busting** : query param `?v=N` sur tous les `<script>` (incrémenter à chaque deploy)

## Profil investisseur

- **Amine** — MRE (Marocain Résident à l'Étranger), résident fiscal **UAE**
- **Structure** : SARL marocaine en cours de création
- **Budget total** : 7 MDH TTC (terrain + construction + ameublement)
- **Employés prévus** : 2-3 (réception, ménage)
- **Localisation** : Rue des Camélias, Maarif, Casablanca (zone urbaine B5)
- **Épargne alternative** : Livret UAE à 6.25% (comparaison rendement vs placement sûr)

---

## Architecture des fichiers

```
index.html          — HTML + CSS intégré + structure de toutes les vues
js/
  data.js           — Données brutes du projet (zéro computation)
  engine.js         — Moteur de calcul pur (zéro DOM, zéro side effects)
  render.js         — Rendu DOM (lit le STATE, écrit dans le HTML)
  charts.js         — Visualisations Chart.js + tooltips riches
  app.js            — Orchestration, gestion d'état, event binding
ARCHITECTURE.md     — Ce fichier
```

### Pipeline de données

```
data.js → engine.js → render.js + charts.js
                ↑
              app.js (orchestration, sliders, scénarios)
```

1. `data.js` exporte des constantes globales (`PROJECT`, `TERRAIN`, `BUDGET`, `UNITS`, `SCENARIOS`, etc.)
2. `engine.js` : `compute(scenario)` prend un nom de scénario → retourne un objet `STATE` complet
3. `render.js` : `render(state)` + fonctions spécialisées écrivent dans le DOM
4. `charts.js` : `rebuildCharts(state)` reconstruit tous les graphiques Chart.js
5. `app.js` : gère les événements (scénarios, sliders, navigation), appelle `refresh()` qui enchaîne compute → render → charts

---

## data.js — Données brutes

### Constantes principales

| Constante | Description | Valeurs clés |
|-----------|-------------|--------------|
| `PROJECT` | Infos générales | Nom, localisation, structure R+5, architecte Jad (Nour Architects), résidence fiscale UAE |
| `PLANNING` | Délais | 6 mois autorisations + 16 mois construction = 22 mois |
| `TERRAIN` | Terrain | 174 m², 2.3 MDH, frais acquisition 6.5% |
| `BUDGET` | Budget global | 7 MDH TTC tout compris, ameublement 40K/unité |
| `UNITS[]` | Programme architectural | **9 studios + 2 lofts** = 11 unités locatives + 1 local commercial + services |
| `SCENARIOS{}` | 5 scénarios | pessimiste / prudent / réaliste / favorable / optimiste |
| `CHARGES` | Charges exploitation | Gestion 20%, salaire 5K/employé, utilities (fixe+var), consommables 50 MAD/nuitée |
| `REVENUE_ASSUMPTIONS` | Hypothèses revenus | Commission plateformes 15%, croissance tarifs 3%/an |
| `FISCALITE` | Fiscalité marocaine | IS 20%, exo taxe pro 5 ans, amortissement 20 ans |
| `BANQUE_CLASSIQUE` | Crédit bancaire | **5.25% TPME** (BAM T4-2025), 15 ans, différé 0 |
| `TAMWILKOM` | Prêt Tamwilkom | 2.5% HT, 7 ans, différé 2 ans, plafond 5 MDH |
| `MDM_INVEST` | Subvention MDM | 10% projet (plafond 5 MDH), apport devises min 25% |
| `MARKET_DATA` | Données marché complètes | 8+ sources croisées, occupation multi-niveaux, saisonnalité |
| `BENCHMARK` | Concurrence Maarif | 17 propriétés Booking.com, segments prix, occupation |
| `GO_SIYAHA_ECO` | Bonus écologique | Investissement ajustable, 40% subvention, réduction utilities 18% |
| `SUBVENTIONS[]` | 9 programmes | Avec conditions détaillées, éligibilité, processus, sources |
| `RISKS[]` | 9 risques | Probabilité, impact, mitigation |
| `MDM_PROCESS` | Process MDM détaillé | Timeline, documents, feedbacks MRE, risques |

### Terminologie Maroc vs France

| Terme Maroc | Équivalent France | Description | Surface typique |
|-------------|-------------------|-------------|-----------------|
| **Studio** | T2 | Chambre séparée + salon/cuisine | 32-46 m² |
| **Loft** | Kitchenette | Espace ouvert cuisine/lit, pas de chambre séparée | 22-28 m² |

**⚠️ ATTENTION** : Au Maroc, un "studio" est PLUS GRAND et PLUS CHER qu'un "loft". C'est l'inverse de la connotation européenne.

### Programme architectural (UNITS)

```
Sous-sol   : Services (buanderie, vestiaires, réfectoire)
RDC        : 1 Local commercial (40 m²) + 1 Studio (46.10 m²) + Réception
Étage 1-3  : 2 Studios par étage (37.41 m² + 32.75 m²) × 3 = 6 Studios
Étage 4    : 1 Loft (28.55 m² + terrasse) + 1 Studio (32.75 m²)
Étage 5    : 1 Loft (22.63 m² + terrasse 15.77 m²) + 1 Studio (32.75 m²)
────────────
TOTAL      : 9 Studios + 2 Lofts = 11 unités locatives
```

### Scénarios (5 niveaux)

| Scénario | Taux Occ. | Prix/nuit Studio | Prix/nuit Loft | Loyer Commercial | Justification |
|----------|-----------|------------------|----------------|------------------|---------------|
| Pessimiste | 35% | 500 MAD | 380 MAD | 6 000 | Nouvel entrant, forte dépendance OTA, Y1 |
| Prudent | 42% | 580 MAD | 420 MAD | 7 000 | Montée en puissance, début clientèle directe |
| Réaliste | 48% | 650 MAD | 480 MAD | 8 000 | Médiane marché, mix canaux équilibré |
| Favorable | 54% | 720 MAD | 530 MAD | 9 500 | Établi, clientèle fidèle, bonne note Booking |
| Optimiste | 60% | 780 MAD | 580 MAD | 11 000 | Top 25%, leader segment, RevPAR élevé |

**Studios sont TOUJOURS plus chers que Lofts** (écart ~25-35%).

### Canaux de distribution (par scénario)

| Scénario | OTA (Booking/Airbnb) | Direct | Informel |
|----------|---------------------|--------|----------|
| Pessimiste | 70% | 20% | 10% |
| Prudent | 65% | 22% | 13% |
| Réaliste | 55% | 25% | 20% |
| Favorable | 48% | 27% | 25% |
| Optimiste | 42% | 28% | 30% |

### Go Siyaha — Bonus Écologique (GO_SIYAHA_ECO)

```javascript
GO_SIYAHA_ECO = {
  enabled: false,              // Toggle via UI
  tauxSubvention: 0.40,        // 40% subvention sur équipement éco
  investissementEco: 300_000,  // MAD — ajustable 100K-600K via slider
  reductionUtilities: 0.18,    // -18% sur utilities (eau, élec, clim)
  reductionConsommables: 0.05, // -5% sur consommables
  premiumPrix: 0,              // Pas de premium prix (conservateur)
  amortissementEcoAns: 10,     // Amortissement sur 10 ans
}
```

**Impact budget** : `totalProjet = baseBudget + ameublement + coutNetEco`
Où `coutNetEco = investissementEco × (1 - tauxSubvention)`

---

## Données marché — Analyse occupation multi-sources

### Sources croisées (8+ sources indépendantes, mars 2026)

#### STR / Airbnb — Plateformes analytics

| Source | Occupation médiane | ADR | Période | Annonces |
|--------|-------------------|-----|---------|----------|
| Airbtics | **49%** | 647 MAD | Fév 2025 – Jan 2026 | 3 649 |
| AirROI | **35.8%** | 630 MAD ($63) | Oct 2024 – Sept 2025 | 1 973 |
| SandsOfWealth | **45%** | ~600 MAD | 2026 | — |
| EasyHost | **60%** | 600 MAD | 2025 | 3 000+ |

**⚠️ Pourquoi les chiffres divergent ?**
- AirROI (35.8%) inclut TOUS les listings y compris inactifs et mal gérés → médiane basse
- Airbtics (49%) filtre mieux les actifs → plus réaliste
- EasyHost (60%) = estimation optimiste, pas data analytics
- La vraie médiane de marché est **~45-49%** pour Casa toutes catégories confondues

#### Performance par tiers (AirROI)

| Tiers | Occupation | ADR | Revenu mensuel |
|-------|-----------|-----|----------------|
| Top 10% | **76%+** | $112+ (1 120 MAD) | $1 822+ (18K MAD) |
| Top 25% | **58%+** | $83+ (830 MAD) | $1 184+ (12K MAD) |
| Médiane | **35%** | $63 (630 MAD) | $685 (7K MAD) |
| Bottom 25% | **16%** | $51 (510 MAD) | $320 (3K MAD) |

#### Biens gérés professionnellement (AirBoo Rentabilité 2025)

*Profil : note 4.5+/5, bien décoré, gestion efficace — exactement notre cible*

| Quartier | Occupation | Prix/nuit |
|----------|-----------|-----------|
| Centre-ville | 75% | 850 MAD |
| **Maarif** | **72%** | **800 MAD** |
| Anfa | 78% | 950 MAD |
| Ain Diab | 70% | 1 000 MAD |
| Bourgogne | 65% | 700 MAD |
| Californie | 60% | 750 MAD |

#### Hôtellerie classée (ONMT / Observatoire du Tourisme 2025)

| Métrique | Valeur | Source |
|----------|--------|--------|
| National 2025 (classé) | **58%** | ONMT |
| Casablanca T1 2025 | **53%** | Medias24 |
| Casablanca Mars 2025 | **46%** | Challenge.ma (Ramadan) |
| Marrakech 2025 | **73%** | ONMT |
| Luxe / Haut de gamme | **62.3%** | Observatoire |
| Milieu de gamme (4*) | **50%** | Observatoire |

#### Segments par pricing (Airbtics)

| Gamme | Petite surface | Moyenne | Grande |
|-------|---------------|---------|--------|
| Budget ($) | 58% | 64% | 62% |
| **Mid-scale ($$)** | **65%** | **70%** | **68%** |
| Luxury ($$$) | 52% | 58% | 60% |

**Notre positionnement = Mid-scale** → occupation attendue **65-70%** pour un bien pro dans ce segment.

#### Saisonnalité (AirROI)

| Saison | Mois | Occupation | ADR |
|--------|------|-----------|-----|
| Peak | Août, Déc, Juil | **42.8%** | 780 MAD |
| Shoulder | Oct, Nov, Avr, Jun | **37.4%** | 740 MAD |
| Low | Fév, Mars, Mai | **36.7%** | 670 MAD |
| Meilleur mois | — | **45.9%** | 850 MAD |
| Pire mois | — | **31.8%** | 650 MAD |

#### Tendances (Airbtics — 3 ans)

| Métrique | Variation 1 an | Variation 3 ans |
|----------|---------------|-----------------|
| Occupation | **-3.9%** | **-10.9%** |
| Tarifs (ADR) | **+10.3%** | **+10.3%** |
| Revenue | **+6.0%** | — |

**Conclusion tendance** : Le marché se sature (+50% listings/an) → occupation en baisse. Mais la montée en gamme (tarifs +10%) compense. Les opérateurs pro qui maintiennent la qualité s'en sortent.

#### Villes comparables (EasyHost)

| Ville | Occupation | Prix/nuit | Listings |
|-------|-----------|-----------|----------|
| Marrakech | 65% | 700 MAD | 5 000+ |
| **Casablanca** | **60%** | **600 MAD** | **3 000+** |
| Agadir | 62% | 500 MAD | 1 800 |
| Tanger | 58% | 550 MAD | 2 500 |
| Rabat | 55% | 500 MAD | 2 000 |
| Fès | 50% | 450 MAD | 1 500 |

### Calibration scénarios vs données marché

```
Pessimiste (35%) = médiane AirROI → annonce non optimisée, entrée marché
Prudent    (42%) = entre médiane AirROI et Airbtics → montée en puissance
Réaliste   (48%) = médiane Airbtics → bien géré sans être top
Favorable  (54%) = début top 25% → bonne réputation établie
Optimiste  (60%) = top performers SandsOfWealth → brand forte
```

**Note** : Les données AirBoo (72% Maarif pro) montrent qu'un bien noté 4.5+/5 et géré professionnellement peut atteindre des taux BIEN au-dessus de notre scénario optimiste. Nos scénarios restent donc conservateurs.

### Clientèle et marché

- **83% internationale** (AirROI) — Top origine : France (29.5%)
- **Durée séjour** : 3.8 nuits moyenne
- **Demande** : Business travelers en semaine (spécificité Casa vs Marrakech)
- **Break-even** : 25-30% occupation → 8-10 nuits/mois (SandsOfWealth)
- **97.1%** des listings Casa = Entire home/apt, **67.2%** = 1-bedroom

### Alerte saturation

- Maarif concentre **1 348 annonces** sur 5 209 à Casablanca = quartier le plus saturé
- Croissance listings : **+50%/an** → pression concurrentielle forte
- **Différenciation indispensable** : qualité, service appart-hôtel, multi-canal, note élevée

---

## engine.js — Moteur de calcul

### Fonction `compute(scenario)` → STATE

Entrée : nom du scénario (`"prudent"` | `"prudent_moyen"` | `"moyen"` | `"moyen_optimiste"` | `"optimiste"`)

Calculs principaux (dans l'ordre) :

1. **Terrain** : coût terrain + frais = apport en nature
2. **Unités** : compte studios (9) / lofts (2), surfaces
3. **Budget** : `totalProjet = baseBudget + ameublement + coutNetEco`
4. **Go Siyaha Eco** (si activé) : investissementEco - subventionEco (40%) = coutNetEco ajouté au budget
5. **MDM Invest** : subvention = min(10% projet, 5M plafond) = 700K
6. **Financement** : montant à financer = total - subvention - apport terrain, réparti 50/50 TK/BQ
7. **Mensualités** : PMT classique pour TK et BQ (avec différé TK 2 ans)
8. **Amortissement** : constructionHT / 20 ans
9. **Projections 20 ans** : boucle année par année
   - Revenus : studios × 9 + lofts × 2 + commercial (avec croissance 3%/an)
   - Charges : détail par poste, **avec réductions eco si activé** (-18% utilities, -5% consommables)
   - EBITDA = revenus - charges
   - **Dette avec split capital/intérêts** : calcul mois par mois du solde restant
   - IS : résultat fiscal = EBITDA - dette - amortissement → imposable × 20%
   - Cash-flow net = EBITDA - dette - IS
10. **TVA** : modèle annuel avec crédit initial (TVA construction) qui se résorbe
11. **Sensibilité** : simulation pour taux occ de 25% à 75%
12. **Break-even** : recherche du taux d'occupation minimal pour CF net ≥ 0

### Intégration Go Siyaha Eco dans les calculs

```javascript
// Budget
const coutNetEco = investissementEco - subventionEco;
const totalProjet = baseBudget + ameublement + coutNetEco;

// Projection loop (chaque année)
const economieUtilitiesEco = ecoEnabled ? utilities * 0.18 : 0;
utilities -= economieUtilitiesEco;
const economieConsommablesEco = ecoEnabled ? consommables * 0.05 : 0;
consommables -= economieConsommablesEco;
// → économies reportées dans chargesDetail.economieEco
```

### Structure du STATE retourné

```javascript
{
  terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain, constructionHTForAmort },
  amortissement: { annuel, duree, total },
  units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale },
  budget: { ameublement, totalProjet, investissementEco, subventionEco, coutNetEco, ecoEnabled },
  financement: {
    subventionMDM, apportTerrain, montantAFinancer,
    montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
    montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
    pctApport, pctTamwilkom, pctBanque, pctSubvention,
  },
  kpi: { rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee, paybackYear, nuiteesParAn, dscr, breakEvenOcc },
  tva: { constructionHT, tvaConstruction, tvaCollecteeAn1, tvaDeductibleAn1, creditTVA, dureeRecupCredit, tvaProjections[] },
  projections: [{ // × 20 années
    year, revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
    chargesTotal, chargesDetail: { gestion, consommables, comptable, utilities, salaires, assurance, entretien, taxesPro, divers, economieEco },
    ebitda, margeExploitation,
    debtTK, debtBQ, debtServiceTotal,
    interetsTK, capitalTK, interetsBQ, capitalBQ,
    dotationAmort, resultatFiscal, beneficeImposable,
    cashFlowAvantIS, is, economieIS, cashFlowNet, cumulCashFlow,
  }],
  sensitivity: [{ occ, revenu, ebitda, cashFlow, rendement }],
  scenario,
}
```

---

## render.js — Rendu DOM

### Fonctions principales

| Fonction | Description |
|----------|-------------|
| `render(state)` | Fonction principale, appelle toutes les sous-fonctions |
| `renderHeader(S)` | **Badge dynamique** avec totalProjet formaté (plus de valeur hardcodée) |
| `renderOverview(S)` | KPIs vue d'ensemble + programme architectural + 8 insights contextuels |
| `renderRevenu(S)` | KPIs revenus, tableau détail par année |
| `renderCharges(S)` | KPIs charges, tableau détail par poste |
| `renderBudget(S)` | Budget avec **labels dynamiques** (nb unités × montant), ligne eco conditionnelle |
| `renderFinancement(S)` | Montage financier, cartes TK/BQ, barre de progression |
| `renderCashFlow(S)` | KPIs cash-flow, tableau annuel |
| `renderFiscalite(S)` | TVA différentiel, tableau année par année, amortissement |
| `renderSubventions(S)` | Tableau subventions expandables, **texte dynamique** (totalProjet) |
| `renderVerdict(S)` | Bannière verdict (Go/Caution/NoGo) avec SVG icons et score |

### KPI Insights (renderOverview)

8 insights contextuels dynamiques :

1. **Investissement** : Décomposition budget, **avec ligne éco verte 🌿 si Go Siyaha activé**
2. **Rendement Brut** : Comparaison avec **Livret UAE 6.25%** (pas 2.8% Maroc), note sur leverage
3. **Rendement Net** : Comparaison avec marché
4. **Rendement / Apport** : **Capital remboursé An 1** = richesse créée via le crédit
5. **RevPAR** : Benchmarks dynamiques via `MARKET_DATA.prixNuiteeRange`
6. **Cash-flow An 1** : Analyse mensuel
7. **Break-even** : Nuits minimum requises
8. **Payback** : Durée retour sur investissement

### Éléments dynamiques (plus rien de hardcodé)

| Élément | Avant | Après |
|---------|-------|-------|
| Header badge | "7 000 000 MAD" hardcodé | `fmtMAD(S.budget.totalProjet)` |
| Budget ameublement label | "11 × 40K" hardcodé | `${nbUnites} × ${fmt(ameublementParUnite)}` |
| Subventions info text | "investissement de 7 MDH" hardcodé | `investissement de ${fmtMAD(totalProjet)}` |
| KPI #2 comparaison | Livret Maroc 2.8% | **Livret UAE 6.25%** |
| KPI #8 benchmarks | Valeurs 525/750/965 hardcodées | `MARKET_DATA.prixNuiteeRange.bas/moyen/haut` |

---

## charts.js — Visualisations

### Charts avec tooltips riches

| Fonction | Canvas ID | Description | Toggles |
|----------|-----------|-------------|---------|
| `chartBudget()` | `chart-budget` | Doughnut répartition budget | — |
| `chartMontage()` | `chart-montage` | Doughnut montage financier | — |
| `chartRevenueEvolution()` | `chart-revenue-evo` | Barres stacked studios/lofts/commercial 20 ans | — |
| `chartRevenueBreakdown()` | `chart-revenue-breakdown` | Doughnut revenus An 1 | — |
| `chartChargesBreakdown()` | `chart-charges-breakdown` | Doughnut charges An 1 | — |
| `chartRevenusVsCharges()` | `chart-rev-vs-charges` | **Barres stacked** revenus vs charges vs EBITDA | **Détail / Simple** |
| `chartDebtService()` | `chart-debt` | Barres stacked dette + EBITDA ligne | **Capital & Intérêts / Total** + **Annuel / Mensuel** |
| `chartCashFlow()` | `chart-cashflow` | Barres CF net + ligne cumul | — |
| `chartOccupancy()` | `chart-occupancy` | Barres horizontales taux occupation par segment | — |
| `chartSensitivity()` | `chart-sensitivity` | Lignes revenu/EBITDA/CF par taux occ | — |

### Tooltip externe (`externalTooltip`)

Tous les charts importants utilisent un tooltip HTML personnalisé (pas le tooltip Chart.js natif).
Le tooltip est positionné dynamiquement et contient un mini "compte de résultat" contextuel.

### Toggles charts

- `_revChBreakdown` : booléen global, contrôle la vue Détail/Simple du chart Revenus vs Charges
- `_debtSplit` : booléen, vue Total vs Capital & Intérêts
- `_debtMonthly` : booléen, vue Annuel vs Mensuel (divise toutes les valeurs par 12)

Fonctions toggle : `toggleRevChBreakdown(on)`, `toggleDebtSplit(on)`, `toggleDebtPeriod(monthly)`

---

## app.js — Orchestration

### État global

```javascript
let currentScenario = "moyen";    // prudent | prudent_moyen | moyen | moyen_optimiste | optimiste
let currentView = "overview";     // overview | revenue | charges | financement | cashflow | marche | fiscalite | risques | subventions
let currentState = null;          // résultat de compute()
let customOverrides = null;       // null = preset, sinon { tauxOccupation, prixNuitStudio, ... }
```

### Flux principal

```
DOMContentLoaded
  → storeOriginalScenarios() // deep copy pour pouvoir restaurer
  → syncControlPanel("moyen")
  → refresh() → compute() → render() → rebuildCharts()
  → switchView("overview")
```

### Control Panel (sliders)

6 paramètres ajustables :
- Taux occupation (15% - 85%)
- Prix nuit Studio T2 (300 - 1000 MAD)
- Prix nuit Loft kitchenette (200 - 800 MAD)
- Loyer commercial (3000 - 15000 MAD)
- Taux banque (3% - 8%)
- **Go Siyaha Eco toggle** + slider investissement éco (100K - 600K MAD)

Quand un slider change :
1. Sync range ↔ input numérique
2. `findMatchingScenario()` : si les valeurs correspondent à un preset → on switch proprement
3. Sinon → `customOverrides` activé, badge "Personnalisé" affiché
4. `refresh()` recalcule tout

### Go Siyaha Eco — Toggle

```javascript
document.getElementById("ctrl-eco-toggle").addEventListener("change", (e) => {
  GO_SIYAHA_ECO.enabled = e.target.checked;
  // Affiche/masque les champs eco et info panel
  refresh();
});
```

---

## index.html — Structure & CSS

### Vues (data-view)

```
overview      — Vue d'ensemble + verdict
revenue       — Revenus & Occupation
charges       — Charges & Exploitation + Revenus vs Charges chart
financement   — Financement MDM + dette chart
cashflow      — Cash-Flow & Rentabilité + sensitivity
marche        — Étude de Marché (occupation, saisonnalité)
fiscalite     — Fiscalité & TVA (amortissement, TVA différentiel)
risques       — Analyse de Risques (SWOT, risques clés)
subventions   — Subventions & Aides (tableau expandable, MDM process)
```

### CSS intégré

- Design system : variables CSS (--primary, --gold, --green, etc.)
- Composants : `.card`, `.kpi-card`, `.badge`, `.meter`, `.progress-bar`
- Tables : `.table-wrap` pour scroll horizontal, `.total-row`, `.highlight-row`
- Tooltip riche : `.ct-tooltip`, `.ctt-row`, `.ctt-val`, `.ctt-neg`
- Verdict banner : `.verdict-banner`, `.verdict-go/caution/nogo`, SVG icons
- Subventions : `.sub-row-clickable`, `.sub-detail-panel`, `.sub-cond-item`, `.sub-verdict`
- Toggle buttons : `.toggle-group`, `.toggle-btn`
- **Eco toggle** : `.eco-toggle-wrap`, `.eco-toggle-slider` (switch iOS-style)
- Responsive : breakpoints à 900px (tablet) et 600px (mobile/iPhone)

### Subventions expandables

Chaque ligne du tableau subventions est cliquable. Au clic :
- La ligne principale s'active visuellement (fond bleu)
- Une ligne détail s'affiche en dessous avec :
  - Liste des conditions (✓ vert / ✗ rouge)
  - Verdict coloré (vert/jaune/rouge) avec explication
  - Processus et source

### Responsive (mobile)

À 600px et moins :
- KPI grid → 1 colonne
- Header centré, font réduit
- Nav tabs compressés
- Cards avec padding réduit
- Charts hauteur 220px
- Tables font .75rem
- Tooltips plus compacts

---

## Subventions — Audit d'éligibilité

Chaque subvention a un tableau `conditions[]` avec :
- `label` : nom de la condition
- `requis` : true si obligatoire
- `projet` : true si le projet la remplit
- `detail` : explication

Plus `whyEligible` ou `whyNotEligible` pour le verdict global.

| Programme | Éligible | Montant | Raison |
|-----------|----------|---------|--------|
| MDM Invest | ✅ | 700K | MRE + tourisme + apport devises |
| Go Siyaha | ✅ | 350K | Seuil supprimé juil. 2025 |
| TAHFIZ | ✅ | 120K | SARL avant fin 2026, 2-3 CDI |
| Go Siyaha Digital | ✅ | 80K | Composante Go Siyaha |
| Exo TVA Équipements | ✅ | 88K | Convention investissement |
| ADEREE/AMEE | ❌ | 0 | Aucun investissement vert prévu (sauf si eco activé) |
| Charte Invest. 2023 | ❌ | 0 | 7 emplois requis, seulement 2-3 |
| SMIT | ⚠️ Partiel | 0 | Zone urbaine = faible priorité |
| IS Devises | ❌ | 0 | Plateformes paient en MAD |

---

## Déploiement

```bash
# Depuis /sessions/clever-loving-wozniak/appart-hotel-v2/
git add -A
git commit -m "description"
git push origin gh-pages
```

**Important** : Incrémenter le `?v=N` sur tous les `<script>` dans index.html pour forcer le cache-busting. Les fichiers sont mis en cache agressivement par GitHub Pages.

PAT GitHub : (stocké dans la session Claude, ne pas committer)

---

## Décisions modélisation importantes

- **Taux banque 5.25%** : Taux TPME investissement (pas particulier). Source : BAM T4-2025, fourchette 5.17-5.61%
- **TVA construction 20%** : Le budget 7M est TTC. Construction HT = (7M - terrain) / 1.20
- **TVA hébergement 10%** : Taux réduit tourisme. TVA utilities 14%. TVA services 20%
- **Terrain sans TVA** : Le terrain n'est pas soumis à la TVA
- **Amortissement** : Bâtiment HT (hors terrain) amorti sur 20 ans linéaire (5%/an). Réduit l'IS
- **Commissions plateformes** : 15% du CA brut hôtelier (Booking/Airbnb)
- **Loyer commercial** : Revenu stable non soumis aux plateformes
- **PROJECTION_YEARS = 20** : Horizon long terme pour évaluer la rentabilité post-crédit
- **Livret UAE 6.25%** : Comparaison rendement (pas livret Maroc 2.8%)
- **Eco savings** : 18% utilities + 5% consommables (Go Siyaha programme)

---

## Pièges & erreurs passées

1. **Types d'unités inversés** : Au Maroc, Studio = T2 (PLUS GRAND, PLUS CHER) et Loft = Kitchenette (PLUS PETIT). Ne pas confondre avec la terminologie européenne
2. **Pricing inversé** : Studios doivent TOUJOURS être plus chers que Lofts (~25-35% d'écart)
3. **Taux banque** : Ne PAS utiliser les taux particuliers (hypothécaire ~4.25%). Utiliser les taux **TPME investissement** de BAM (5.17-5.61% T4-2025)
4. **TVA terrain** : Le terrain n'a PAS de TVA. Seul le budget construction est TTC
5. **TVA formule** : Pour extraire la TVA d'un montant TTC : `montantTTC / 1.20 × 0.20` (pas `× 0.20 × 0.5`)
6. **Amortissement** : Non-cash → réduit l'IS mais ne sort PAS de la trésorerie. Ne PAS le soustraire du cash-flow
7. **IS Devises** : Les plateformes (Booking/Airbnb) versent en **MAD**, pas en devises. L'exonération IS devises ne s'applique pas
8. **TAHFIZ** : Réaliste pour 2-3 employés = ~120K, pas 1.5M (chiffre initial surestimé pour 8 employés)
9. **Cache JS** : Toujours incrémenter `?v=N` sinon les utilisateurs voient l'ancienne version → crash si HTML changé
10. **renderVerdict()** : L'élément s'appelle `verdict-svg` (pas `verdict-icon`). Bug connu si anciennes refs
11. **Valeurs hardcodées** : TOUT doit être dynamique — header badge, labels budget, textes subventions, benchmarks KPI
12. **Livret comparaison** : Investisseur basé UAE → utiliser 6.25% (pas le livret Maroc 2.8%)
13. **Occupation marché** : Les données AirROI (35.8%) incluent les listings inactifs — ne pas prendre comme référence unique. Croiser avec Airbtics (49%) et AirBoo par quartier
