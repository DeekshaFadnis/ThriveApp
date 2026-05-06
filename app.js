const STORAGE_KEY = "thrive-app-execution-v1";

const categoryColors = {
  Health: "#65e4a3",
  Finance: "#ffd166",
  Personal: "#ff7aa8"
};

const starterState = {
  activeView: "setup",
  focusAcceptedId: null,
  goals: {
    quarter: "Q2 2026",
    health: "Train for a marathon in September",
    finance: "Save for Mexico in September",
    personal: "I want to create content for my baby towel company and reach 50,000 users",
    deadline: "September 2026",
    target: "50,000 users"
  },
  strategy: null,
  actions: []
};

let state = loadState();

let viewTabs;
let views;
let goalForm;
let actionForm;

function initialState() {
  const generated = generatePlan(starterState.goals);
  return {
    ...structuredClone(starterState),
    strategy: generated.strategy,
    actions: generated.actions
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    console.log("saved goals/actions loaded on page load", "none found, using starter state");
    return initialState();
  }

  try {
    const parsed = normalizeState(JSON.parse(saved));
    console.log("saved goals/actions loaded on page load", parsed);
    return parsed;
  } catch {
    console.log("saved goals/actions loaded on page load", "invalid saved data, using starter state");
    return initialState();
  }
}

function normalizeState(saved) {
  return {
    activeView: ["setup", "plan", "dashboard"].includes(saved.activeView) ? saved.activeView : "setup",
    focusAcceptedId: saved.focusAcceptedId ?? null,
    goals: saved.goals && typeof saved.goals === "object" ? saved.goals : structuredClone(starterState.goals),
    strategy: saved.strategy ?? null,
    actions: Array.isArray(saved.actions) ? saved.actions : []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  console.log("data saved to localStorage", state);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function inferActionType(label) {
  const text = label.toLowerCase();
  if (text.includes("run") || text.includes("jog") || text.includes("walk") || text.includes("workout")) return "run";
  if (text.includes("tiktok") || text.includes("post") || text.includes("content") || text.includes("film")) return "content";
  if (text.includes("spend") || text.includes("budget") || text.includes("save") || text.includes("money")) return "budget";
  if (text.includes("plan") || text.includes("write") || text.includes("draft")) return "plan";
  return "general";
}

function scoringPreset(category, label) {
  const type = inferActionType(label);
  const presets = {
    run: { relevance: 10, impact: 8, feasibility: 8, effort: 4, reason: ["Directly supports your health goal", "Simple enough to start today", "Builds consistency"] },
    content: { relevance: 10, impact: 9, feasibility: 7, effort: 5, reason: ["Strong link to your personal goal", "Creates visible progress", "Good weekly impact"] },
    budget: { relevance: 9, impact: 7, feasibility: 9, effort: 3, reason: ["Protects your finance goal", "Easy to complete", "Keeps the week aligned"] },
    plan: { relevance: 8, impact: 7, feasibility: 9, effort: 2, reason: ["Clarifies the next step", "Low effort", "Makes future action easier"] },
    general: { relevance: 7, impact: 7, feasibility: 8, effort: 4, reason: ["Supports the goal", "Reasonable to complete today", "Keeps momentum moving"] }
  };

  const base = presets[type];
  if (category === "Finance" && type !== "budget") return { ...base, relevance: Math.max(7, base.relevance - 1) };
  return { ...base };
}

function createAction(label, category, detail = "") {
  const preset = scoringPreset(category, label);
  return {
    id: makeId("action"),
    label,
    category,
    detail,
    completed: false,
    scoring: {
      relevance: preset.relevance,
      impact: preset.impact,
      feasibility: preset.feasibility,
      effort: preset.effort
    },
    reason: preset.reason
  };
}

function generatePlan(goals) {
  const personalLooksLikeContent = /content|tiktok|video|user|audience|company|brand/i.test(goals.personal);
  const personalDaily = personalLooksLikeContent ? "Post one short educational product video" : "Spend 20 minutes on the personal goal";

  // This is a simulated strategy layer. Later, replace this function with an AI API call
  // that reads the user's natural-language goals and returns strategy, weekly actions,
  // and editable daily actions.
  return {
    strategy: {
      summary: "Turn each goal into one small repeatable daily move.",
      weekly: [
        "Pick one weekly health milestone and keep it realistic.",
        "Protect one finance decision every day.",
        "Create, test, and learn from simple personal-goal outputs."
      ],
      daily: [
        "Easy 2k jog/run",
        "No unnecessary spending today",
        personalDaily
      ]
    },
    actions: [
      createAction("Easy 2k jog/run", "Health", "This supports your health goal. Small runs build long-term endurance."),
      createAction("No unnecessary spending today", "Finance", "This supports your finance goal by keeping today inside the plan."),
      createAction(personalDaily, "Personal", "This turns the personal goal into one visible daily output.")
    ]
  };
}

function getPriorityScore(action) {
  const { relevance, impact, feasibility, effort } = action.scoring;
  return Math.round((relevance * impact * feasibility) / Math.max(1, effort));
}

function getPriorityAction() {
  const openActions = state.actions.filter((action) => !action.completed);
  const candidates = openActions.length ? openActions : state.actions;
  return [...candidates].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0] ?? null;
}

function goalTextFor(category) {
  const key = category.toLowerCase();
  return state.goals[key] || `${category} goal`;
}

function getProgress(category) {
  const categoryActions = state.actions.filter((action) => action.category === category);
  if (!categoryActions.length) return 0;
  const done = categoryActions.filter((action) => action.completed).length;
  return Math.round((done / categoryActions.length) * 100);
}

function getMomentumScore() {
  if (!state.actions.length) return 0;
  const completed = state.actions.filter((action) => action.completed).length;
  const completion = (completed / state.actions.length) * 80;
  const consistency = completed > 0 ? 20 : 0;
  return Math.round(completion + consistency);
}

function setView(viewName) {
  state.activeView = viewName;
  viewTabs.forEach((tab) => {
    const active = tab.dataset.view === viewName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  views.forEach((view) => view.classList.toggle("active", view.id === viewName));
  saveState();
}

function fillGoalForm() {
  goalForm.elements.quarter.value = state.goals.quarter;
  goalForm.elements.health.value = state.goals.health;
  goalForm.elements.finance.value = state.goals.finance;
  goalForm.elements.personal.value = state.goals.personal;
  goalForm.elements.deadline.value = state.goals.deadline;
  goalForm.elements.target.value = state.goals.target || "";
}

function renderStrategy() {
  const target = document.querySelector("#strategyOutput");
  if (!state.strategy) {
    target.innerHTML = `<div class="empty-state">Add goals, then break them into daily actions.</div>`;
    return;
  }

  target.innerHTML = `
    <p><strong>Strategy:</strong> ${escapeHtml(state.strategy.summary)}</p>
    <p><strong>Weekly:</strong></p>
    <ul class="strategy-list">${state.strategy.weekly.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <p><strong>Daily:</strong></p>
    <ul class="strategy-list">${state.strategy.daily.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

function renderPriority() {
  const priority = getPriorityAction();
  const empty = "Add goals and generate actions to get a daily priority.";
  document.querySelector("#focusTitle").textContent = priority ? priority.label : "No action yet";
  document.querySelector("#focusText").textContent = priority
    ? `${priority.detail || "This moves the quarter forward."} Every small action moves you closer.`
    : empty;
  document.querySelector("#priorityTitle").textContent = priority ? priority.label : "No priority yet";
  document.querySelector("#priorityWhy").textContent = priority
    ? `This supports your ${priority.category.toLowerCase()} goal: ${goalTextFor(priority.category)}`
    : empty;
  document.querySelector("#dashboardPriorityText").textContent = priority
    ? `${priority.label} · ${priority.category}`
    : empty;

  document.querySelector("#whyList").innerHTML = priority
    ? priority.reason.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>Create actions first.</li>";

  document.querySelector("#commitFocus").disabled = !priority;
  document.querySelector("#commitFocus").textContent =
    priority && state.focusAcceptedId === priority.id ? "Selected for today" : "I'll do this today";
}

function renderActions() {
  const editableMarkup = state.actions.length
    ? state.actions.map(renderActionCard).join("")
    : `<div class="empty-state">No actions yet. Generate a plan from Goal Setup.</div>`;
  const compactMarkup = state.actions.length
    ? state.actions.map(renderCompactActionCard).join("")
    : `<div class="empty-state">No actions yet. Generate a plan from Goal Setup.</div>`;

  document.querySelector("#actionList").innerHTML = editableMarkup;
  document.querySelector("#dashboardActions").innerHTML = compactMarkup;

  const done = state.actions.filter((action) => action.completed).length;
  document.querySelector("#actionsCount").textContent = `${state.actions.length} actions`;
  document.querySelector("#dashboardActionsCount").textContent = `${done} done`;
}

function renderCompactActionCard(action) {
  const checked = action.completed ? "✓" : "";
  const completedClass = action.completed ? "completed" : "";
  return `
    <article class="action-card ${completedClass}">
      <div class="action-main">
        <button class="action-check" type="button" data-toggle="${action.id}" aria-label="${action.completed ? "Undo" : "Complete"} ${escapeHtml(action.label)}">${checked}</button>
        <div class="action-copy">
          <div class="action-top">
            <strong>${escapeHtml(action.label)}</strong>
            <span class="meta-text">${escapeHtml(action.category)}</span>
          </div>
          <span>${escapeHtml(action.detail || `Supports ${goalTextFor(action.category)}`)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderActionCard(action) {
  const checked = action.completed ? "✓" : "";
  const completedClass = action.completed ? "completed" : "";
  return `
    <article class="action-card ${completedClass}">
      <div class="action-main">
        <button class="action-check" type="button" data-toggle="${action.id}" aria-label="${action.completed ? "Undo" : "Complete"} ${escapeHtml(action.label)}">${checked}</button>
        <div class="action-copy">
          <div class="action-top">
            <strong>${escapeHtml(action.label)}</strong>
            <span class="meta-text">${escapeHtml(action.category)}</span>
          </div>
          <span>${escapeHtml(action.detail || `Supports ${goalTextFor(action.category)}`)}</span>
        </div>
      </div>
      <div class="action-tools">
        <button class="tool-button" type="button" data-edit="${action.id}">Save edit</button>
        <button class="tool-button" type="button" data-delete="${action.id}">Delete</button>
      </div>
      <details>
        <summary>Edit</summary>
        <div class="edit-grid">
          <input type="text" value="${escapeAttribute(action.label)}" data-label="${action.id}" />
          <select data-category="${action.id}">
            ${["Health", "Finance", "Personal"].map((category) => `<option ${category === action.category ? "selected" : ""}>${category}</option>`).join("")}
          </select>
        </div>
      </details>
      <details>
        <summary>Customize</summary>
        <div class="slider-grid">
          ${renderSlider(action, "relevance", "Goal relevance")}
          ${renderSlider(action, "impact", "Impact")}
          ${renderSlider(action, "feasibility", "Feasibility")}
          ${renderSlider(action, "effort", "Effort")}
        </div>
      </details>
    </article>
  `;
}

function renderSlider(action, key, label) {
  return `
    <label>
      <span>${label}</span>
      <input type="range" min="1" max="10" value="${action.scoring[key]}" data-score="${action.id}:${key}" />
    </label>
  `;
}

function renderProgress() {
  document.querySelector("#goalProgress").innerHTML = ["Health", "Finance", "Personal"]
    .map((category) => {
      const progress = getProgress(category);
      return `
        <article class="goal-card">
          <div class="goal-top">
            <span class="goal-area">${category}</span>
            <strong>${progress}%</strong>
          </div>
          <h3>${escapeHtml(goalTextFor(category))}</h3>
          <div class="progress-track" aria-label="${category} progress">
            <div class="progress-fill" style="width: ${progress}%; background: ${categoryColors[category]}"></div>
          </div>
        </article>
      `;
    })
    .join("");

  const momentum = getMomentumScore();
  document.querySelector("#momentumScore").textContent = `${momentum}%`;
  document.querySelector("#momentumRing").style.setProperty("--ring-progress", `${momentum}%`);
}

function renderAll() {
  console.log("render function called", state);
  fillGoalForm();
  renderStrategy();
  renderPriority();
  renderActions();
  renderProgress();
  setView(state.activeView);
}

function saveGeneratedPlan(event) {
  event.preventDefault();
  console.log("form submitted", "goalForm");
  const form = new FormData(goalForm);
  state.goals = {
    quarter: form.get("quarter").trim(),
    health: form.get("health").trim(),
    finance: form.get("finance").trim(),
    personal: form.get("personal").trim(),
    deadline: form.get("deadline").trim(),
    target: form.get("target").trim()
  };
  console.log("goal data captured", state.goals);
  const generated = generatePlan(state.goals);
  state.strategy = generated.strategy;
  state.actions = generated.actions;
  state.focusAcceptedId = null;
  state.activeView = "plan";
  saveState();
  renderAll();
  closeDetails();
}

function addAction(event) {
  event.preventDefault();
  console.log("form submitted", "actionForm");
  const form = new FormData(actionForm);
  const label = form.get("label").trim();
  const category = form.get("category");
  console.log("goal data captured", { action: label, category });
  state.actions.push(createAction(label, category, `Supports ${goalTextFor(category)}`));
  actionForm.reset();
  saveState();
  renderAll();
}

function findAction(id) {
  return state.actions.find((action) => action.id === id);
}

function handleActionClick(event) {
  const toggle = event.target.closest("[data-toggle]");
  const deleteButton = event.target.closest("[data-delete]");
  const editButton = event.target.closest("[data-edit]");

  if (toggle) {
    const action = findAction(toggle.dataset.toggle);
    action.completed = !action.completed;
  }

  if (deleteButton) {
    state.actions = state.actions.filter((action) => action.id !== deleteButton.dataset.delete);
  }

  if (editButton) {
    const action = findAction(editButton.dataset.edit);
    const labelInput = document.querySelector(`[data-label="${action.id}"]`);
    const categoryInput = document.querySelector(`[data-category="${action.id}"]`);
    action.label = labelInput.value.trim() || action.label;
    action.category = categoryInput.value;
    const preset = scoringPreset(action.category, action.label);
    action.reason = preset.reason;
  }

  if (toggle || deleteButton || editButton) {
    saveState();
    renderAll();
  }
}

function handleScoreChange(event) {
  const input = event.target.closest("[data-score]");
  if (!input) return;
  const [id, key] = input.dataset.score.split(":");
  const action = findAction(id);
  action.scoring[key] = Number(input.value);
  saveState();
  renderAll();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function closeDetails() {
  document.querySelectorAll("details").forEach((details) => {
    details.open = false;
  });
}

function initApp() {
  viewTabs = document.querySelectorAll(".view-tab");
  views = document.querySelectorAll(".view");
  goalForm = document.querySelector("#goalForm");
  actionForm = document.querySelector("#actionForm");

  console.log("button IDs checked", {
    resetApp: Boolean(document.querySelector("#resetApp")),
    commitFocus: Boolean(document.querySelector("#commitFocus")),
    goalForm: Boolean(goalForm),
    actionForm: Boolean(actionForm)
  });

  // Future placeholder: notifications can remind the user about the selected daily focus.
  viewTabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
  goalForm.addEventListener("submit", saveGeneratedPlan);
  actionForm.addEventListener("submit", addAction);
  document.querySelector("#actionList").addEventListener("click", handleActionClick);
  document.querySelector("#dashboardActions").addEventListener("click", handleActionClick);
  document.querySelector("#actionList").addEventListener("change", handleScoreChange);
  document.querySelector("#dashboardActions").addEventListener("change", handleScoreChange);
  document.querySelector("#commitFocus").addEventListener("click", () => {
    const priority = getPriorityAction();
    if (!priority) return;
    state.focusAcceptedId = priority.id;
    saveState();
    renderAll();
  });
  document.querySelector("#resetApp").addEventListener("click", () => {
    state = initialState();
    saveState();
    renderAll();
    closeDetails();
  });

  renderAll();
}

document.addEventListener("DOMContentLoaded", initApp);
