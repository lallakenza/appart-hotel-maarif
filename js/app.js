// ============================================================
// APP LAYER — Orchestration, state management, event binding
// ============================================================

let currentScenario = "moyen";
let currentView = "overview";
let currentState = null;
let customOverrides = null; // null = using preset scenario

// --- Control panel fields (basic — scenario-linked) ---
const CTRL_FIELDS = [
  { id: "occ",    key: "tauxOccupation",  div: 100, min: 15, max: 85 },
  { id: "studio", key: "prixNuitStudio",  div: 1,   min: 200, max: 900 },
  { id: "loft",   key: "prixNuitLoft",    div: 1,   min: 200, max: 1200 },
  { id: "loyer",  key: "loyerCommercial", div: 1,   min: 3000, max: 20000 },
  { id: "taux",   key: "tauxBanque",      div: 100, min: 3, max: 8 },
];

// --- Advanced fields (global data objects) ---
const ADV_FIELDS = [
  // Charges d'exploitation
  { id: "gestion",      target: "CHARGES",              key: "tauxGestion",              div: 100 },
  { id: "salaire",      target: "CHARGES",              key: "salaireConcierge",         div: 1 },
  { id: "salaireMenage",target: "CHARGES",              key: "salaireMenage",            div: 1 },
  { id: "employes",     target: "CHARGES",              key: "nbEmployes",               div: 1 },
  { id: "eau",          target: "CHARGES",              key: "utilitiesFixe",            div: 1 },
  { id: "eauVar",       target: "CHARGES",              key: "utilitiesVarParUnite",     div: 1 },
  { id: "internet",     target: "CHARGES",              key: "internetTv",               div: 1 },
  { id: "assurance",    target: "CHARGES",              key: "assurance",                div: 1 },
  { id: "entretien",    target: "CHARGES",              key: "entretienBase",            div: 1 },
  { id: "comptable",    target: "CHARGES",              key: "comptableAnnuel",          div: 1 },
  { id: "consommables", target: "CHARGES",              key: "consommablesParNuitee",    div: 1 },
  { id: "divers",       target: "CHARGES",              key: "divers",                   div: 1 },
  // Revenus & canaux
  { id: "commissionOTA",target: "REVENUE_ASSUMPTIONS",  key: "commissionOTA",            div: 100 },
  { id: "partOTA",      target: "REVENUE_ASSUMPTIONS",  key: "partOTA",                  div: 100 },
  { id: "partInformel", target: "REVENUE_ASSUMPTIONS",  key: "partInformel",             div: 100 },
  { id: "croissance",   target: "REVENUE_ASSUMPTIONS",  key: "croissanceTarifs",         div: 100 },
  // Financement
  { id: "dureeBQ",      target: "BANQUE_CLASSIQUE",     key: "dureeAns",                 div: 1 },
  { id: "tauxTK",       target: "TAMWILKOM",            key: "tauxAnnuel",               div: 100 },
  { id: "dureeTK",      target: "TAMWILKOM",            key: "dureeAns",                 div: 1 },
  { id: "differeTK",    target: "TAMWILKOM",            key: "differeAns",               div: 1 },
];

// Store originals for advanced fields
let originalAdvanced = {};

// --- Budget field (special — modifies scenario's budgetTotal) ---
const BUDGET_FIELD = { id: "budget", key: "budgetTotal", div: 1_000_000 };

function getTargetObj(name) {
  if (name === "CHARGES") return CHARGES;
  if (name === "REVENUE_ASSUMPTIONS") return REVENUE_ASSUMPTIONS;
  if (name === "BANQUE_CLASSIQUE") return BANQUE_CLASSIQUE;
  if (name === "TAMWILKOM") return TAMWILKOM;
  return null;
}

// --- Core pipeline ---
function refresh() {
  // Apply custom overrides to scenario before computing
  if (customOverrides) {
    applyOverrides();
  }
  currentState = compute(currentScenario);
  currentState.gestion = computeGestionComparison(currentScenario);
  render(currentState);
  rebuildCharts(currentState);
}

function applyOverrides() {
  const sc = SCENARIOS[currentScenario];
  if (customOverrides.tauxOccupation !== undefined) sc.tauxOccupation = customOverrides.tauxOccupation;
  if (customOverrides.prixNuitStudio !== undefined) sc.prixNuitStudio = customOverrides.prixNuitStudio;
  if (customOverrides.prixNuitLoft !== undefined)   sc.prixNuitLoft = customOverrides.prixNuitLoft;
  if (customOverrides.loyerCommercial !== undefined) sc.loyerCommercial = customOverrides.loyerCommercial;
  if (customOverrides.tauxBanque !== undefined)     BANQUE_CLASSIQUE.tauxAnnuel = customOverrides.tauxBanque;
}

// --- View management ---
function switchView(view) {
  currentView = view;
  // Auto-collapse control panel
  const panel = document.getElementById("control-panel");
  const ctrlBtn = document.getElementById("ctrl-toggle");
  if (panel) panel.classList.remove("open");
  if (ctrlBtn) ctrlBtn.classList.remove("open");
  // Also collapse advanced
  const advBody = document.getElementById("ctrl-advanced-body");
  if (advBody) advBody.classList.remove("open");
  const advToggle = document.getElementById("ctrl-advanced-toggle");
  if (advToggle) advToggle.classList.remove("open");

  document.querySelectorAll("[data-view]").forEach(el => {
    el.classList.toggle("hidden", el.dataset.view !== view);
  });

  // Update nav active states (handle both top-level and dropdown items)
  document.querySelectorAll(".nav-item").forEach(item => {
    const directNav = item.dataset.nav;
    const hasDropdown = item.querySelector(".nav-dropdown");
    if (directNav) {
      item.classList.toggle("active", directNav === view);
    } else if (hasDropdown) {
      const dropItems = hasDropdown.querySelectorAll("[data-nav]");
      const isInGroup = Array.from(dropItems).some(d => d.dataset.nav === view);
      item.classList.toggle("active", isInGroup);
    }
  });

  // Update dropdown item active states
  document.querySelectorAll(".nav-dropdown-item").forEach(item => {
    item.classList.toggle("active", item.dataset.nav === view);
  });

  if (currentState) rebuildCharts(currentState);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Scenario management ---
function switchScenario(scenario) {
  currentScenario = scenario;
  customOverrides = null; // reset overrides when choosing a preset

  // Restore original scenario values (in case they were overridden)
  restoreScenarioDefaults(scenario);

  // Update all scenario buttons
  document.querySelectorAll(".scenario-btn[data-scenario]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.scenario === scenario);
  });
  document.getElementById("btn-custom").style.display = "none";

  // Sync control panel sliders to this scenario's values
  syncControlPanel(scenario);

  refresh();
}

// Store original scenario data (deep copy at init)
let originalScenarios = {};
function storeOriginalScenarios() {
  Object.keys(SCENARIOS).forEach(key => {
    originalScenarios[key] = { ...SCENARIOS[key] };
  });
}
let originalBanqueTaux = 0;

function restoreScenarioDefaults(scenario) {
  const orig = originalScenarios[scenario];
  if (!orig) return;
  Object.assign(SCENARIOS[scenario], orig);
  BANQUE_CLASSIQUE.tauxAnnuel = originalBanqueTaux;
}

// --- Control Panel ---
function syncControlPanel(scenario) {
  const sc = SCENARIOS[scenario];
  setCtrl("occ",    sc.tauxOccupation * 100);
  setCtrl("studio", sc.prixNuitStudio);
  setCtrl("loft",   sc.prixNuitLoft);
  setCtrl("loyer",  sc.loyerCommercial);
  setCtrl("taux",   BANQUE_CLASSIQUE.tauxAnnuel * 100);
  setCtrl("budget", (sc.budgetTotal || BUDGET.totalTTC) / 1_000_000);
}

function syncAdvancedPanel() {
  ADV_FIELDS.forEach(f => {
    const obj = getTargetObj(f.target);
    if (obj) setCtrl(f.id, obj[f.key] * f.div);
  });
}

function setCtrl(id, value) {
  const range = document.getElementById("ctrl-" + id);
  const input = document.getElementById("ctrl-" + id + "-val");
  if (range) range.value = value;
  if (input) input.value = parseFloat(value.toFixed(1));
}

function getCtrlValues() {
  return {
    tauxOccupation: parseFloat(document.getElementById("ctrl-occ-val").value) / 100,
    prixNuitStudio: parseFloat(document.getElementById("ctrl-studio-val").value),
    prixNuitLoft:   parseFloat(document.getElementById("ctrl-loft-val").value),
    loyerCommercial: parseFloat(document.getElementById("ctrl-loyer-val").value),
    tauxBanque:     parseFloat(document.getElementById("ctrl-taux-val").value) / 100,
  };
}

function onControlChange(fromRange, id) {
  const range = document.getElementById("ctrl-" + id);
  const input = document.getElementById("ctrl-" + id + "-val");
  if (fromRange) {
    input.value = range.value;
  } else {
    range.value = input.value;
  }

  // Check if values match any preset scenario
  const vals = getCtrlValues();
  const matchedScenario = findMatchingScenario(vals);

  if (matchedScenario) {
    // Values match a preset — switch to it cleanly
    customOverrides = null;
    currentScenario = matchedScenario;
    document.querySelectorAll(".scenario-btn[data-scenario]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.scenario === matchedScenario);
    });
    document.getElementById("btn-custom").style.display = "none";
    restoreScenarioDefaults(matchedScenario);
  } else {
    // Custom values — show "Personnalisé" badge
    customOverrides = vals;
    document.querySelectorAll(".scenario-btn[data-scenario]").forEach(btn => btn.classList.remove("active"));
    const customBtn = document.getElementById("btn-custom");
    customBtn.style.display = "";
    customBtn.classList.add("active");
  }

  refresh();
}

// --- Advanced control change ---
function onAdvancedChange(fromRange, id) {
  const range = document.getElementById("ctrl-" + id);
  const input = document.getElementById("ctrl-" + id + "-val");
  if (fromRange) {
    input.value = range.value;
  } else {
    range.value = input.value;
  }

  // Special handling for budget slider
  if (id === "budget") {
    const val = parseFloat(input.value) * 1_000_000;
    SCENARIOS[currentScenario].budgetTotal = val;
    refresh();
    return;
  }

  // Find the field definition and apply value to the target object
  const field = ADV_FIELDS.find(f => f.id === id);
  if (field) {
    const obj = getTargetObj(field.target);
    if (obj) {
      obj[field.key] = parseFloat(input.value) / field.div;
    }
  }

  refresh();
}

function findMatchingScenario(vals) {
  for (const key of Object.keys(originalScenarios)) {
    const sc = originalScenarios[key];
    if (
      Math.abs(vals.tauxOccupation - sc.tauxOccupation) < 0.005 &&
      Math.abs(vals.prixNuitStudio - sc.prixNuitStudio) < 5 &&
      Math.abs(vals.prixNuitLoft - sc.prixNuitLoft) < 5 &&
      Math.abs(vals.loyerCommercial - sc.loyerCommercial) < 250 &&
      Math.abs(vals.tauxBanque - originalBanqueTaux) < 0.005
    ) {
      return key;
    }
  }
  return null;
}

function toggleControlPanel() {
  const panel = document.getElementById("control-panel");
  const btn = document.getElementById("ctrl-toggle");
  panel.classList.toggle("open");
  btn.classList.toggle("open");
}

function closeAllDropdowns() {
  document.querySelectorAll(".nav-item.dropdown-open").forEach(d => d.classList.remove("dropdown-open"));
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  // Store original scenario data
  storeOriginalScenarios();
  originalBanqueTaux = BANQUE_CLASSIQUE.tauxAnnuel;

  // Store original advanced values
  ADV_FIELDS.forEach(f => {
    const obj = getTargetObj(f.target);
    if (obj) originalAdvanced[f.id] = obj[f.key];
  });

  // Bind new nav items (direct navigation items)
  document.querySelectorAll(".nav-item[data-nav]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      switchView(item.dataset.nav);
    });
  });

  // Bind dropdown toggles
  document.querySelectorAll(".nav-item.has-dropdown").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = item.classList.contains("dropdown-open");
      closeAllDropdowns();
      if (!wasOpen) item.classList.add("dropdown-open");
    });
  });

  // Bind dropdown items
  document.querySelectorAll(".nav-dropdown-item[data-nav]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      switchView(item.dataset.nav);
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => closeAllDropdowns());

  // Bind scenario buttons
  document.querySelectorAll(".scenario-btn[data-scenario]").forEach(btn => {
    btn.addEventListener("click", () => switchScenario(btn.dataset.scenario));
  });

  // Bind control panel toggle
  document.getElementById("ctrl-toggle").addEventListener("click", toggleControlPanel);

  // Bind basic control panel inputs (range + number)
  CTRL_FIELDS.forEach(f => {
    const range = document.getElementById("ctrl-" + f.id);
    const input = document.getElementById("ctrl-" + f.id + "-val");
    if (range) {
      range.addEventListener("input", () => onControlChange(true, f.id));
    }
    if (input) {
      input.addEventListener("input", () => onControlChange(false, f.id));
      input.addEventListener("change", () => onControlChange(false, f.id));
    }
  });

  // Bind budget slider (special)
  const budgetRange = document.getElementById("ctrl-budget");
  const budgetInput = document.getElementById("ctrl-budget-val");
  if (budgetRange) {
    budgetRange.addEventListener("input", () => onAdvancedChange(true, "budget"));
  }
  if (budgetInput) {
    budgetInput.addEventListener("input", () => onAdvancedChange(false, "budget"));
    budgetInput.addEventListener("change", () => onAdvancedChange(false, "budget"));
  }

  // Bind advanced control panel inputs (range + number)
  ADV_FIELDS.forEach(f => {
    const range = document.getElementById("ctrl-" + f.id);
    const input = document.getElementById("ctrl-" + f.id + "-val");
    if (range) {
      range.addEventListener("input", () => onAdvancedChange(true, f.id));
    }
    if (input) {
      input.addEventListener("input", () => onAdvancedChange(false, f.id));
      input.addEventListener("change", () => onAdvancedChange(false, f.id));
    }
  });

  // Initial sync
  syncControlPanel(currentScenario);
  syncAdvancedPanel();

  // Initial render
  refresh();
  switchView("overview");

  // Stagger KPI animation
  document.querySelectorAll(".kpi-card").forEach((card, i) => {
    card.style.animationDelay = (i * 0.06) + "s";
  });

  // --- Mobile menu ---
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const navEl = document.querySelector(".nav");
  const navOverlay = document.getElementById("nav-overlay");

  function openMobileMenu() {
    navEl.classList.add("mobile-open");
    navOverlay.classList.add("show");
    mobileMenuBtn.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeMobileMenu() {
    navEl.classList.remove("mobile-open");
    navOverlay.classList.remove("show");
    mobileMenuBtn.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (navEl.classList.contains("mobile-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }
  if (navOverlay) {
    navOverlay.addEventListener("click", closeMobileMenu);
  }

  // Close mobile menu when navigating
  const origSwitchView = switchView;
  switchView = function(view) {
    closeMobileMenu();
    origSwitchView(view);
  };
});
