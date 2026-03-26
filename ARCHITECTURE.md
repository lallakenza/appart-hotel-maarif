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
| `PROJECT` | Infos générales | Nom, localisation, structure R+5, architecte |
| `PLANNING` | Délais | 6 mois autorisations + 16 mois construction = 22 mois |
| `TERRAIN` | Terrain | 174 m², 2.3 MDH, frais acquisition 6.5% |
| `BUDGET` | Budget global | 7 MDH TTC tout compris, ameublement 40K/unité |
| `UNITS[]` | Programme architectural | 11 unités locatives (8 studios + 3 lofts) + 1 local commercial + services |
| `SCENARIOS{}` | 3 scénarios | pessimiste/moyen/optimiste (taux occ, prix nuit, loyer) |
| `REVENUE_ASSUMPTIONS` | Hypothèses revenus | Commission plateformes 15%, croissance tarifs 3%/an |
| `CHARGES` | Charges exploitation | Gestion 20%, salaire 5K/employé, utilities, assurance, etc. |
| `FISCALITE` | Fiscalité marocaine | IS 20%, exo taxe pro 5 ans, amortissement 20 ans |
| `BANQUE_CLASSIQUE` | Crédit bancaire | **5.25% TPME** (BAM T4-2025), 15 ans, différé 0 |
| `TAMWILKOM` | Prêt Tamwilkom | 2.5% HT, 7 ans, différé 2 ans, plafond 5 MDH |
| `MDM_INVEST` | Subvention MDM | 10% projet (plafond 5 MDH), apport devises min 25% |
| `MARKET_DATA` | Données marché | Segments occupation, tarifs AirDNA, saisonnalité |
| `SUBVENTIONS[]` | 9 programmes | Avec conditions détaillées, éligibilité, processus, sources |
| `MDM_PROCESS` | Process MDM détaillé | Timeline, documents, feedbacks MRE, risques |

### Décisions modélisation importantes

- **Taux banque 5.25%** : Taux TPME investissement (pas particulier). Source : BAM T4-2025, fourchette 5.17-5.61%
- **TVA construction 20%** : Le budget 7M est TTC. Construction HT = (7M - terrain) / 1.20
- **TVA hébergement 10%** : Taux réduit tourisme. TVA utilities 14%. TVA services 20%
- **Terrain sans TVA** : Le terrain n'est pas soumis à la TVA
- **Amortissement** : Bâtiment HT (hors terrain) amorti sur 20 ans linéaire (5%/an). Réduit l'IS
- **Commissions plateformes** : 15% du CA brut hôtelier (Booking/Airbnb)
- **Loyer commercial** : Revenu stable non soumis aux plateformes

### Subventions — Audit d'éligibilité

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
| ADEREE/AMEE | ❌ | 0 | Aucun investissement vert prévu |
| Charte Invest. 2023 | ❌ | 0 | 7 emplois requis, seulement 2-3 |
| SMIT | ⚠️ Partiel | 0 | Zone urbaine = faible priorité |
| IS Devises | ❌ | 0 | Plateformes paient en MAD |

---

## engine.js — Moteur de calcul

### Fonction `compute(scenario)` → STATE

Entrée : nom du scénario (`"pessimiste"` | `"moyen"` | `"optimiste"`)

Calculs principaux (dans l'ordre) :

1. **Terrain** : coût terrain + frais = apport en nature
2. **Unités** : compte studios/lofts, surfaces
3. **Budget** : totalProjet = 7M TTC (terrain + construction + ameublement)
4. **MDM Invest** : subvention = min(10% projet, 5M plafond) = 700K
5. **Financement** : montant à financer = total - subvention - apport terrain, réparti 50/50 TK/BQ
6. **Mensualités** : PMT classique pour TK et BQ (avec différé TK 2 ans)
7. **Amortissement** : constructionHT / 20 ans
8. **Projections 10 ans** : boucle année par année
   - Revenus : studios + lofts + commercial (avec croissance 3%/an)
   - Charges : détail par poste
   - EBITDA = revenus - charges
   - **Dette avec split capital/intérêts** : calcul mois par mois du solde restant
   - IS : résultat fiscal = EBITDA - dette - amortissement → imposable × 20%
   - Cash-flow net = EBITDA - dette - IS
9. **TVA** : modèle annuel avec crédit initial (TVA construction) qui se résorbe
10. **Sensibilité** : simulation pour taux occ de 25% à 75%
11. **Break-even** : recherche du taux d'occupation minimal pour CF net ≥ 0

### Structure du STATE retourné

```javascript
{
  terrain: { coutTerrain, fraisTerrain, budgetConstruction, coutM2Terrain, constructionHTForAmort },
  amortissement: { annuel, duree, total },
  units: { nbStudios, nbLofts, nbUnites, surfaceLocative, surfaceCommerciale },
  budget: { ameublement, totalProjet },
  financement: {
    subventionMDM, apportTerrain, montantAFinancer,
    montantTamwilkom, mensualiteTK, annuiteTK, interetsDiffereTK, coutTotalTK,
    montantBanque, mensualiteBQ, annuiteBQ, coutTotalBQ,
    pctApport, pctTamwilkom, pctBanque, pctSubvention,
  },
  kpi: { rendementBrut, rendementNet, rendementNetApport, revpar, coutParNuitee, paybackYear, nuiteesParAn, dscr, breakEvenOcc },
  tva: { constructionHT, tvaConstruction, tvaCollecteeAn1, tvaDeductibleAn1, creditTVA, dureeRecupCredit, tvaProjections[] },
  projections: [{ // × 10 années
    year, revStudios, revLofts, revBrutHotel, commissions, revNetHotel, revCommercial, revTotal,
    chargesTotal, chargesDetail: { gestion, consommables, comptable, utilities, salaires, assurance, entretien, taxesPro, divers },
    ebitda, margeExploitation,
    debtTK, debtBQ, debtServiceTotal,
    interetsTK, capitalTK, interetsBQ, capitalBQ,  // ← split capital/intérêts
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
| `renderOverview(S)` | KPIs vue d'ensemble + programme architectural |
| `renderRevenu(S)` | KPIs revenus, tableau détail par année |
| `renderCharges(S)` | KPIs charges, tableau détail par poste |
| `renderFinancement(S)` | Montage financier, cartes TK/BQ, barre de progression |
| `renderCashFlow(S)` | KPIs cash-flow, tableau annuel |
| `renderFiscalite(S)` | TVA différentiel, tableau année par année, amortissement |
| `renderSubventions(S)` | Tableau subventions **avec lignes expandables**, MDM process, feedbacks, risques |
| `renderVerdict(S)` | Bannière verdict (Go/Caution/NoGo) avec SVG icons et score |
| `setText(id, text)` | Utilitaire : `document.getElementById(id).textContent = text` |
| `toggleSubDetail(idx)` | Ouvre/ferme le détail d'une subvention (accordion) |

### Subventions expandables

Chaque ligne du tableau subventions est cliquable. Au clic :
- La ligne principale s'active visuellement (fond bleu)
- Une ligne détail s'affiche en dessous avec :
  - Liste des conditions (✓ vert / ✗ rouge)
  - Verdict coloré (vert/jaune/rouge) avec explication
  - Processus et source

---

## charts.js — Visualisations

### Charts avec tooltips riches

| Fonction | Canvas ID | Description | Toggles |
|----------|-----------|-------------|---------|
| `chartBudget()` | `chart-budget` | Doughnut répartition budget | — |
| `chartMontage()` | `chart-montage` | Doughnut montage financier | — |
| `chartRevenueEvolution()` | `chart-revenue-evo` | Barres stacked studios/lofts/commercial 10 ans | — |
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
let currentScenario = "moyen";    // pessimiste | moyen | optimiste
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

5 paramètres ajustables : taux occupation, prix nuit studio, prix nuit loft, loyer commercial, taux banque.

Quand un slider change :
1. Sync range ↔ input numérique
2. `findMatchingScenario()` : si les valeurs correspondent à un preset → on switch proprement
3. Sinon → `customOverrides` activé, badge "Personnalisé" affiché
4. `refresh()` recalcule tout

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
- Responsive : breakpoints à 900px (tablet) et 600px (mobile/iPhone)

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

## Pièges & erreurs passées

1. **Taux banque** : Ne PAS utiliser les taux particuliers (hypothécaire ~4.25%). Utiliser les taux **TPME investissement** de BAM (5.17-5.61% T4-2025)
2. **TVA terrain** : Le terrain n'a PAS de TVA. Seul le budget construction est TTC
3. **TVA formule** : Pour extraire la TVA d'un montant TTC : `montantTTC / 1.20 × 0.20` (pas `× 0.20 × 0.5`)
4. **Amortissement** : Non-cash → réduit l'IS mais ne sort PAS de la trésorerie. Ne PAS le soustraire du cash-flow
5. **IS Devises** : Les plateformes (Booking/Airbnb) versent en **MAD**, pas en devises. L'exonération IS devises ne s'applique pas
6. **TAHFIZ** : Réaliste pour 2-3 employés = ~120K, pas 1.5M (chiffre initial surestimé pour 8 employés)
7. **Cache JS** : Toujours incrémenter `?v=N` sinon les utilisateurs voient l'ancienne version → crash si HTML changé
8. **renderVerdict()** : L'élément s'appelle `verdict-svg` (pas `verdict-icon`). Bug connu si anciennes refs
