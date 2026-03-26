// ============================================================
// APP LAYER — Orchestration, state management, event binding
// ============================================================

let currentScenario = "moyen";
let currentView = "overview";
let currentState = null;
let customOverrides = null; // null = using preset scenario

// --- Control panel fields ---
const CTRL_FIELDS = [
  { id: "occ",    key: "tauxOccupation",  div: 100, min: 15, max: 85 },
  { id: "studio", key: "prixNuitStudio",  div: 1,   min: 200, max: 900 },
  { id: "loft",   key: "prixNuitLoft",    div: 1,   min: 200, max: 1200 },
  { id: "loyer",  key: "loyerCommercial", div: 1,   min: 3000, max: 20000 },
  { id: "taux",   key: "tauxBanque",      div: 100, min: 3, max: 8 },
];

// --- Core pipeline ---
function refresh() {
  // Apply custom overrides to scenario before computing
  if (customOverrides) {
    applyOverrides();
  }
  currentState = compute(currentScenario);
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
  document.querySelectorAll("[data-view]").forEach(el => {
    el.classList.toggle("hidden", el.dataset.view !== view);
  });
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === view);
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

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  // Store original scenario data
  storeOriginalScenarios();
  originalBanqueTaux = BANQUE_CLASSIQUE.tauxAnnuel;

  // Bind nav
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.nav));
  });

  // Bind scenario buttons
  document.querySelectorAll(".scenario-btn[data-scenario]").forEach(btn => {
    btn.addEventListener("click", () => switchScenario(btn.dataset.scenario));
  });

  // Bind control panel toggle
  document.getElementById("ctrl-toggle").addEventListener("click", toggleControlPanel);

  // Bind control panel inputs (range + number)
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

  // Initial sync
  syncControlPanel(currentScenario);

  // Initial render
  refresh();
  switchView("overview");

  // Stagger KPI animation
  document.querySelectorAll(".kpi-card").forEach((card, i) => {
    card.style.animationDelay = (i * 0.06) + "s";
  });
});
