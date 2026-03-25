// ============================================================
// APP LAYER — Orchestration, state management, event binding
// ============================================================

let currentScenario = "moyen";
let currentView = "overview";
let currentState = null;

// --- Core pipeline ---
function refresh() {
  currentState = compute(currentScenario);
  render(currentState);
  rebuildCharts(currentState);
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
  // Rebuild charts for visible section
  if (currentState) rebuildCharts(currentState);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Scenario management ---
function switchScenario(scenario) {
  currentScenario = scenario;
  document.querySelectorAll(".scenario-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.scenario === scenario);
  });
  refresh();
}

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  // Bind nav
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.nav));
  });

  // Bind scenario
  document.querySelectorAll(".scenario-btn").forEach(btn => {
    btn.addEventListener("click", () => switchScenario(btn.dataset.scenario));
  });

  // Initial render
  refresh();
  switchView("overview");

  // Stagger KPI animation
  document.querySelectorAll(".kpi-card").forEach((card, i) => {
    card.style.animationDelay = (i * 0.06) + "s";
  });
});
