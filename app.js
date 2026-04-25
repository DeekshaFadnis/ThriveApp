const STORAGE_KEY = "thrive-state-v1";

const seedState = {
  money: [
    { id: crypto.randomUUID(), name: "Paycheck", amount: 4200, type: "income", category: "Income" },
    { id: crypto.randomUUID(), name: "Rent", amount: 1650, type: "expense", category: "Home" },
    { id: crypto.randomUUID(), name: "Groceries", amount: 184, type: "expense", category: "Food" },
    { id: crypto.randomUUID(), name: "Gym membership", amount: 62, type: "expense", category: "Wellness" }
  ],
  health: [
    { day: "Mon", energy: 6, hydration: true, movement: true, sleep: false },
    { day: "Tue", energy: 7, hydration: true, movement: false, sleep: true },
    { day: "Wed", energy: 5, hydration: false, movement: true, sleep: false },
    { day: "Thu", energy: 8, hydration: true, movement: true, sleep: true },
    { day: "Fri", energy: 7, hydration: true, movement: true, sleep: true }
  ],
  goals: [
    { id: crypto.randomUUID(), name: "Build emergency fund", area: "Finances", progress: 42 },
    { id: crypto.randomUUID(), name: "Run a relaxed 5K", area: "Health", progress: 68 },
    { id: crypto.randomUUID(), name: "Finish product design course", area: "Learning", progress: 31 }
  ],
  wins: 1
};

let state = loadState();

const moneyForm = document.querySelector("#moneyForm");
const healthForm = document.querySelector("#healthForm");
const goalForm = document.querySelector("#goalForm");
const views = document.querySelectorAll(".view");
const navTabs = document.querySelectorAll(".nav-tab");
const title = document.querySelector("#viewTitle");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedState);

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(seedState);
  }
}

function normalizeState(saved) {
  return {
    money: Array.isArray(saved.money) ? saved.money : structuredClone(seedState.money),
    health: Array.isArray(saved.health) ? saved.health : structuredClone(seedState.health),
    goals: Array.isArray(saved.goals) ? saved.goals : structuredClone(seedState.goals),
    wins: Number.isFinite(saved.wins) ? saved.wins : seedState.wins
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setToday() {
  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function getMoneyTotals() {
  return state.money.reduce(
    (totals, item) => {
      totals[item.type] += Number(item.amount);
      return totals;
    },
    { income: 0, expense: 0 }
  );
}

function getGoalAverage() {
  if (!state.goals.length) return 0;
  const total = state.goals.reduce((sum, goal) => sum + Number(goal.progress), 0);
  return Math.round(total / state.goals.length);
}

function getHealthScore() {
  if (!state.health.length) return 0;
  const total = state.health.reduce((sum, log) => {
    const habits = [log.hydration, log.movement, log.sleep].filter(Boolean).length;
    return sum + log.energy * 7 + habits * 10;
  }, 0);
  return Math.round(total / state.health.length);
}

function getThriveScore() {
  const totals = getMoneyTotals();
  const moneyScore = Math.max(0, Math.min(100, 50 + ((totals.income - totals.expense) / 80)));
  const healthScore = getHealthScore();
  const goalScore = getGoalAverage();
  const winScore = Math.min(100, state.wins * 12);
  return Math.round(moneyScore * 0.3 + healthScore * 0.3 + goalScore * 0.3 + winScore * 0.1);
}

function getLowestGoal() {
  return state.goals.reduce((lowest, goal) => {
    if (!lowest || Number(goal.progress) < Number(lowest.progress)) return goal;
    return lowest;
  }, null);
}

function getPriority(balance, healthScore, goalAverage) {
  const lowestGoal = getLowestGoal();

  if (balance < 300) {
    return {
      label: "Review spending for 10 minutes",
      detail: "Your tracked balance is tight, so protecting the next few days matters most.",
      reason: `${currency.format(balance)} available after tracked expenses.`,
      support: "Open Finances and look for one flexible expense you can pause or reduce today."
    };
  }

  if (healthScore < 70 || state.health.length < 3) {
    return {
      label: "Do one health baseline",
      detail: "Your wellbeing rhythm needs the fastest win: water, movement, or sleep.",
      reason: `${state.health.length} health logs with a ${healthScore}/100 rhythm.`,
      support: "Open Health and save one simple log. A small consistent signal beats a perfect plan."
    };
  }

  if (lowestGoal && goalAverage < 65) {
    return {
      label: `Move "${lowestGoal.name}" forward`,
      detail: "Your money and health are stable enough today to spend attention on progress.",
      reason: `Goal progress averages ${goalAverage}%, and this goal is at ${lowestGoal.progress}%.`,
      support: "Open Goals and add five points after completing one concrete step."
    };
  }

  return {
    label: "Choose a small future-proofing win",
    detail: "Your core signals look steady, so use today for a low-pressure improvement.",
    reason: `${currency.format(balance)} balance, ${healthScore}/100 health rhythm, ${goalAverage}% goal progress.`,
    support: "Pick the area that would make tomorrow feel lighter, then mark it done."
  };
}

function drawRing(canvas, value) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const center = size / 2;
  const radius = 70;
  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = 15;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#e6ebe6";
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#2f8f6b";
  ctx.beginPath();
  ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (value / 100));
  ctx.stroke();
}

function drawBarChart(canvas, labels, datasets) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const chartHeight = height - padding * 1.6;
  const max = Math.max(10, ...datasets.flatMap((set) => set.values));
  const groupWidth = (width - padding * 2) / labels.length;
  const barWidth = Math.min(34, groupWidth / (datasets.length + 1.7));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d9ded8";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i += 1) {
    const y = padding + (chartHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  labels.forEach((label, index) => {
    const x = padding + groupWidth * index + groupWidth / 2;
    datasets.forEach((set, setIndex) => {
      const value = set.values[index] ?? 0;
      const barHeight = (value / max) * chartHeight;
      const barX = x - (datasets.length * barWidth) / 2 + setIndex * (barWidth + 4);
      const barY = padding + chartHeight - barHeight;
      ctx.fillStyle = set.color;
      ctx.fillRect(barX, barY, barWidth, barHeight);
    });
    ctx.fillStyle = "#667085";
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, height - 16);
  });
}

function renderDashboard() {
  const totals = getMoneyTotals();
  const balance = totals.income - totals.expense;
  const goalAverage = getGoalAverage();
  const healthScore = getHealthScore();
  const priority = getPriority(balance, healthScore, goalAverage);

  document.querySelector("#balanceMetric").textContent = currency.format(balance);
  document.querySelector("#streakMetric").textContent = `${state.health.length} days`;
  document.querySelector("#goalsMetric").textContent = `${goalAverage}%`;
  document.querySelector("#dashboard-title").textContent = priority.label;
  document.querySelector("#priorityDetail").textContent = priority.detail;
  document.querySelector("#priorityReason").textContent = priority.reason;
  document.querySelector("#prioritySupport").textContent = priority.support;
  document.querySelector("#dailySummary").textContent = "Based on today's signals";
}

function renderMoney() {
  const totals = getMoneyTotals();
  document.querySelector("#financeSummary").textContent =
    `${currency.format(totals.income)} in, ${currency.format(totals.expense)} out`;

  document.querySelector("#moneyList").innerHTML = state.money
    .map(
      (item) => `
        <div class="item">
          <div class="item-info">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="item-meta">${escapeHtml(item.category)} · ${item.type}</span>
          </div>
          <strong class="amount-${item.type}">${item.type === "income" ? "+" : "-"}${currency.format(item.amount)}</strong>
        </div>
      `
    )
    .join("");
}

function sumMoney(category, type) {
  return state.money
    .filter((item) => item.category === category && item.type === type)
    .reduce((sum, item) => sum + Number(item.amount), 0);
}

function renderHealth() {
  const latest = state.health.at(-1);
  document.querySelector("#healthSummary").textContent =
    latest ? `Latest energy ${latest.energy}/10` : "No logs yet";

  const habitStats = ["hydration", "movement", "sleep"].map((habit) => {
    const count = state.health.filter((log) => log[habit]).length;
    return { habit, count };
  });

  document.querySelector("#habitRow").innerHTML = habitStats
    .map(
      ({ habit, count }) => `
        <div class="habit-pill">
          <span class="item-meta">${capitalize(habit)}</span>
          <strong>${count}/${state.health.length}</strong>
        </div>
      `
    )
    .join("");
}

function renderGoals() {
  document.querySelector("#goalSummary").textContent = `${getGoalAverage()}% average progress`;
  document.querySelector("#goalList").innerHTML = state.goals
    .map(
      (goal) => `
        <article class="goal-card">
          <div class="goal-top">
            <div class="item-info">
              <strong>${escapeHtml(goal.name)}</strong>
              <span class="item-meta">${escapeHtml(goal.area)}</span>
            </div>
            <strong>${goal.progress}%</strong>
          </div>
          <div class="progress-track" aria-label="${escapeHtml(goal.name)} progress">
            <div class="progress-fill" style="width: ${goal.progress}%"></div>
          </div>
          <div class="goal-controls">
            <button class="small-button" type="button" data-goal="${goal.id}" data-step="-5">-5</button>
            <button class="small-button" type="button" data-goal="${goal.id}" data-step="5">+5</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAll() {
  renderDashboard();
  renderMoney();
  renderHealth();
  renderGoals();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const viewName = tab.dataset.view;
    navTabs.forEach((button) => {
      button.classList.toggle("active", button === tab);
      button.setAttribute("aria-pressed", String(button === tab));
    });
    views.forEach((view) => view.classList.toggle("active", view.id === viewName));
    title.textContent = tab.textContent.trim();
  });
});

moneyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(moneyForm);
  state.money.unshift({
    id: crypto.randomUUID(),
    name: form.get("name").trim(),
    amount: Math.abs(Number(form.get("amount"))),
    type: form.get("type"),
    category: form.get("category")
  });
  moneyForm.reset();
  saveState();
  renderAll();
});

document.querySelector("#energyInput").addEventListener("input", (event) => {
  document.querySelector("#energyValue").textContent = event.target.value;
});

healthForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date());
  state.health.push({
    day,
    energy: Number(document.querySelector("#energyInput").value),
    hydration: document.querySelector("#hydrationInput").checked,
    movement: document.querySelector("#movementInput").checked,
    sleep: document.querySelector("#sleepInput").checked
  });
  state.health = state.health.slice(-7);
  saveState();
  renderAll();
});

document.querySelector("#goalProgress").addEventListener("input", (event) => {
  document.querySelector("#goalProgressValue").textContent = `${event.target.value}%`;
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(goalForm);
  state.goals.unshift({
    id: crypto.randomUUID(),
    name: form.get("name").trim(),
    area: form.get("area"),
    progress: Number(form.get("progress"))
  });
  goalForm.reset();
  document.querySelector("#goalProgressValue").textContent = "15%";
  saveState();
  renderAll();
});

document.querySelector("#goalList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-goal]");
  if (!button) return;
  const goal = state.goals.find((item) => item.id === button.dataset.goal);
  if (!goal) return;
  goal.progress = Math.max(0, Math.min(100, goal.progress + Number(button.dataset.step)));
  saveState();
  renderAll();
});

document.querySelector("#quickWin").addEventListener("click", () => {
  state.wins += 1;
  saveState();
  renderAll();
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  state = structuredClone(seedState);
  saveState();
  renderAll();
});

setToday();
renderAll();
