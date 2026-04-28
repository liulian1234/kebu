/* ==========================================================
   MyTask Pro V2
   功能：
   1. 開銷首頁
   2. 任務 RPG
   3. 長期付款 / 存款
   4. 我的資料 / 統計
   ========================================================== */

const STORAGE_KEY = "mytask_pro_clean_v2";
const $ = (id) => document.getElementById(id);

/* =========================
   1. 工具函數
========================= */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function displayToday() {
  return new Date().toLocaleDateString("zh-Hant", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function money(amount) {
  return "SGD " + Number(amount || 0).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function pct(value) {
  const n = Math.max(0, Math.min(100, Number(value || 0)));
  return n.toFixed(1) + "%";
}

function esc(text = "") {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function monthsUntil(dateString) {
  if (!dateString) return null;

  const now = new Date();
  const end = new Date(dateString + "T00:00:00");

  if (Number.isNaN(end.getTime()) || end <= now) return 1;

  let months =
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth() - now.getMonth());

  if (end.getDate() > now.getDate()) months += 1;

  return Math.max(1, months);
}

/* =========================
   2. 預設資料
========================= */

function defaultState() {
  return {
    profile: {
      name: "",
      monthlyIncome: 0,
      entertainmentBudget: 200
    },

    xp: 0,

    expenses: [
      {
        id: uid(),
        type: "fixed",
        name: "房租",
        amount: 500,
        note: "每月一定要付",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "fixed",
        name: "孝敬費（老爸）",
        amount: 250,
        note: "每月一定要付",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "fixed",
        name: "Wifi",
        amount: 50,
        note: "每月一定要付",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "fixed",
        name: "地鐵",
        amount: 150,
        note: "每月一定要付",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "fixed",
        name: "吃飯",
        amount: 100,
        note: "每月一定要付",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "fixed",
        name: "車貸款",
        amount: 334,
        note: "RM1000/月粗估",
        createdAt: todayISO()
      }
    ],

    tasks: [
      {
        id: uid(),
        title: "更新目前存款",
        category: "理財",
        note: "每月底更新一次",
        xp: 25,
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        title: "整理想買清單",
        category: "生活",
        note: "刪掉不重要的東西",
        xp: 10,
        done: false,
        createdAt: todayISO()
      }
    ],

    plans: [
      {
        id: uid(),
        type: "savingGoal",
        name: "100,000 SGD 存款",
        total: 100000,
        current: 0,
        monthly: 0,
        deadline: "",
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "loan",
        name: "車貸",
        total: 31319,
        current: 0,
        monthly: 334,
        deadline: "",
        createdAt: todayISO()
      }
    ]
  };
}

/* =========================
   3. 讀取 / 保存資料
========================= */

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return defaultState();

    const saved = JSON.parse(raw);
    const base = defaultState();

    return {
      ...base,
      ...saved,
      profile: {
        ...base.profile,
        ...saved.profile
      },
      expenses: Array.isArray(saved.expenses) ? saved.expenses : base.expenses,
      tasks: Array.isArray(saved.tasks) ? saved.tasks : base.tasks,
      plans: Array.isArray(saved.plans) ? saved.plans : base.plans
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* =========================
   4. 計算功能
========================= */

function fixedExpenses() {
  return state.expenses.filter(e => e.type === "fixed");
}

function annualExpenses() {
  return state.expenses.filter(e => e.type === "annual");
}

function activeOneTimeExpenses() {
  return state.expenses.filter(e => e.type === "oneTime" && !e.spent);
}

function spentOneTimeThisMonth() {
  const now = todayISO().slice(0, 7);

  return state.expenses
    .filter(e => {
      return (
        e.type === "oneTime" &&
        e.spent &&
        String(e.spentAt || "").slice(0, 7) === now
      );
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

function totalFixed() {
  return fixedExpenses().reduce((sum, e) => {
    return sum + Number(e.amount || 0);
  }, 0);
}

function totalAnnualMonthly() {
  return annualExpenses().reduce((sum, e) => {
    return sum + Number(e.amount || 0) / 12;
  }, 0);
}

function totalOneTimePending() {
  return activeOneTimeExpenses().reduce((sum, e) => {
    return sum + Number(e.amount || 0);
  }, 0);
}

function totalLoanMonthly() {
  return state.plans
    .filter(p => p.type === "loan")
    .reduce((sum, p) => {
      return sum + Number(p.monthly || 0);
    }, 0);
}

function monthlyPressure() {
  return totalFixed() + totalAnnualMonthly() + totalLoanMonthly();
}

function suggestedSaving() {
  return Math.max(
    0,
    Number(state.profile.monthlyIncome || 0) - monthlyPressure()
  );
}

function taskStats() {
  const done = state.tasks.filter(t => t.done).length;
  const open = state.tasks.filter(t => !t.done).length;
  const total = state.tasks.length;

  return {
    done,
    open,
    total,
    rate: total ? (done / total) * 100 : 0
  };
}

function playerLevel() {
  return Math.floor(Number(state.xp || 0) / 100) + 1;
}

function currentLevelXp() {
  return Number(state.xp || 0) % 100;
}

function playerTitle() {
  const level = playerLevel();

  if (level >= 20) return "Legend";
  if (level >= 10) return "Master Planner";
  if (level >= 5) return "Productive Hunter";

  return "Beginner";
}

/* =========================
   5. 頁面切換
========================= */

const pageInfo = {
  expenses: [
    "開銷首頁",
    "主頁只負責顯示與添加開銷，乾淨、直接、好記錄。"
  ],
  tasks: [
    "任務 RPG",
    "完成任務就獲得 XP，讓大腦有一點獎勵感。"
  ],
  plans: [
    "長期付款 / 存款",
    "管理貸款、分期、存款目標和每月應存金額。"
  ],
  profile: [
    "我的資料 / 統計",
    "填寫個人資料，查看每月花費和任務完成統計。"
  ]
};

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".menu-btn").forEach(el => {
    el.classList.remove("active");
  });

  const pageEl = $(`page-${page}`);
  const btnEl = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add("active");
  if (btnEl) btnEl.classList.add("active");

  $("pageTitle").textContent = pageInfo[page][0];
  $("pageDesc").textContent = pageInfo[page][1];

  $("sidebar").classList.remove("show");

  render();
}

document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});

$("mobileMenuBtn").addEventListener("click", () => {
  $("sidebar").classList.toggle("show");
});

/* =========================
   6. 新增開銷
========================= */

$("expenseForm").addEventListener("submit", event => {
  event.preventDefault();

  const type = $("expenseType").value;
  const name = $("expenseName").value.trim();
  const amount = Number($("expenseAmount").value || 0);
  const note = $("expenseNote").value.trim();

  if (!name) {
    alert("請填開銷名稱。");
    return;
  }

  if (!amount) {
    alert("請填金額。");
    return;
  }

  state.expenses.unshift({
    id: uid(),
    type,
    name,
    amount,
    note,
    spent: false,
    createdAt: todayISO()
  });

  $("expenseName").value = "";
  $("expenseAmount").value = "";
  $("expenseNote").value = "";

  saveState();
  render();
});

/* =========================
   7. 新增任務
========================= */

$("openTaskFormBtn").addEventListener("click", () => {
  $("taskForm").classList.toggle("hidden");
});

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const xp = Number($("taskDifficulty").value || 10);
  const category = $("taskCategory").value.trim() || "一般";
  const note = $("taskNote").value.trim();

  if (!title) {
    alert("請填任務名稱。");
    return;
  }

  state.tasks.unshift({
    id: uid(),
    title,
    category,
    note,
    xp,
    done: false,
    createdAt: todayISO()
  });

  $("taskTitle").value = "";
  $("taskCategory").value = "";
  $("taskNote").value = "";
  $("taskForm").classList.add("hidden");

  saveState();
  render();
});

/* =========================
   8. 新增長期項目
========================= */

$("planForm").addEventListener("submit", event => {
  event.preventDefault();

  const type = $("planType").value;
  const name = $("planName").value.trim();
  const total = Number($("planTotal").value || 0);
  const current = Number($("planCurrent").value || 0);
  const monthly = Number($("planMonthly").value || 0);
  const deadline = $("planDeadline").value;

  if (!name) {
    alert("請填長期項目名稱。");
    return;
  }

  if (!total) {
    alert("請填目標 / 總額。");
    return;
  }

  state.plans.unshift({
    id: uid(),
    type,
    name,
    total,
    current,
    monthly,
    deadline,
    createdAt: todayISO()
  });

  $("planName").value = "";
  $("planTotal").value = "";
  $("planCurrent").value = "";
  $("planMonthly").value = "";
  $("planDeadline").value = "";

  saveState();
  render();
});

/* =========================
   9. 個人資料
========================= */

$("profileForm").addEventListener("submit", event => {
  event.preventDefault();

  state.profile.name = $("profileName").value.trim();
  state.profile.monthlyIncome = Number($("monthlyIncome").value || 0);
  state.profile.entertainmentBudget = Number($("entertainmentBudget").value || 0);

  saveState();
  render();

  alert("已保存資料。");
});

/* =========================
   10. 操作功能
========================= */

window.App = {
  deleteExpense(id) {
    if (!confirm("確定刪除這筆開銷嗎？")) return;

    state.expenses = state.expenses.filter(e => e.id !== id);

    saveState();
    render();
  },

  spendOneTime(id) {
    const item = state.expenses.find(e => e.id === id);

    if (!item) return;

    item.spent = true;
    item.spentAt = todayISO();

    saveState();
    render();
  },

  completeTask(id) {
    const task = state.tasks.find(t => t.id === id);

    if (!task || task.done) return;

    task.done = true;
    task.completedAt = todayISO();
    state.xp += Number(task.xp || 0);

    saveState();
    render();
  },

  deleteTask(id) {
    if (!confirm("確定刪除這個任務嗎？")) return;

    state.tasks = state.tasks.filter(t => t.id !== id);

    saveState();
    render();
  },

  updatePlanCurrent(id, value) {
    const plan = state.plans.find(p => p.id === id);

    if (!plan) return;

    plan.current = Number(value || 0);

    saveState();
    render();
  },

  deletePlan(id) {
    if (!confirm("確定刪除這個長期項目嗎？")) return;

    state.plans = state.plans.filter(p => p.id !== id);

    saveState();
    render();
  }
};

/* =========================
   11. 匯入 / 匯出 / 重置
========================= */

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = `mytask-pro-backup-${todayISO()}.json`;
  a.click();

  URL.revokeObjectURL(a.href);
});

$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());

    if (!imported.expenses || !imported.tasks || !imported.plans) {
      alert("這不是正確的 MyTask 備份檔。");
      return;
    }

    state = imported;

    saveState();
    render();

    alert("匯入成功。");
  } catch {
    alert("匯入失敗，請確認 JSON 檔案正確。");
  }
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("確定重置全部資料嗎？")) return;

  state = defaultState();

  saveState();
  render();
});

/* =========================
   12. HTML 模板
========================= */

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function expenseCard(item, mode) {
  const monthly = mode === "annual"
    ? Number(item.amount || 0) / 12
    : Number(item.amount || 0);

  const action = mode === "oneTime"
    ? `<button class="mini-btn green" onclick="App.spendOneTime('${item.id}')">勾選已花</button>`
    : "";

  const amountText = mode === "annual"
    ? `年費：${money(item.amount)}｜月均：${money(monthly)}`
    : money(item.amount);

  return `
    <article class="list-card">
      <div class="list-top">
        <div>
          <div class="list-title">${esc(item.name)}</div>
          <div class="list-meta">
            ${amountText}
            ${item.note ? "｜" + esc(item.note) : ""}
          </div>
        </div>

        <div class="amount">
          ${mode === "annual" ? money(monthly) : money(item.amount)}
        </div>
      </div>

      <div class="list-actions">
        ${action}
        <button class="mini-btn red" onclick="App.deleteExpense('${item.id}')">刪除</button>
      </div>
    </article>
  `;
}

function taskCard(task) {
  return `
    <article class="list-card">
      <div class="list-top">
        <div>
          <div class="list-title">
            ${task.done ? "✅ " : ""}${esc(task.title)}
          </div>

          <div class="list-meta">
            ${esc(task.category)}｜+${task.xp} XP
            ${task.note ? "｜" + esc(task.note) : ""}
            ${task.done ? "｜完成：" + esc(task.completedAt || "") : ""}
          </div>
        </div>

        <div class="amount">
          ${task.done ? "DONE" : "+" + task.xp + " XP"}
        </div>
      </div>

      <div class="list-actions">
        ${
          task.done
            ? ""
            : `<button class="mini-btn green" onclick="App.completeTask('${task.id}')">完成 +XP</button>`
        }

        <button class="mini-btn red" onclick="App.deleteTask('${task.id}')">刪除</button>
      </div>
    </article>
  `;
}

function planCard(plan) {
  const progress = plan.total
    ? (Number(plan.current || 0) / Number(plan.total || 1)) * 100
    : 0;

  const remain = Math.max(
    0,
    Number(plan.total || 0) - Number(plan.current || 0)
  );

  const months = plan.deadline ? monthsUntil(plan.deadline) : null;
  const needMonthly = months ? remain / months : 0;

  const monthlyText = plan.type === "loan"
    ? money(plan.monthly || 0)
    : months
      ? money(needMonthly)
      : money(suggestedSaving());

  return `
    <article class="plan-card">
      <h4>${esc(plan.name)}</h4>

      <p>${plan.type === "loan" ? "貸款 / 分期" : "存款目標"}</p>

      <div class="plan-numbers">
        <div>
          <span>總額</span>
          <strong>${money(plan.total)}</strong>
        </div>

        <div>
          <span>已完成</span>
          <strong>${money(plan.current)}</strong>
        </div>

        <div>
          <span>${plan.type === "loan" ? "每月付款" : "每月建議"}</span>
          <strong>${monthlyText}</strong>
        </div>
      </div>

      <div class="progress">
        <span style="width:${pct(progress)}"></span>
      </div>

      <div class="list-meta" style="margin-top:8px;">
        進度 ${pct(progress)}｜剩餘 ${money(remain)}
        ${months ? "｜剩餘 " + months + " 個月" : ""}
      </div>

      <div class="list-actions">
        <input
          type="number"
          value="${Number(plan.current || 0)}"
          onchange="App.updatePlanCurrent('${plan.id}', this.value)"
        />

        <button class="mini-btn red" onclick="App.deletePlan('${plan.id}')">
          刪除
        </button>
      </div>
    </article>
  `;
}

function chartRow(label, value, max, colorClass = "") {
  const width = max ? (value / max) * 100 : 0;

  return `
    <div class="chart-row">
      <div class="chart-info">
        <span>${label}</span>
        <strong>${money(value)}</strong>
      </div>

      <div class="chart-bar ${colorClass}">
        <span style="width:${pct(width)}"></span>
      </div>
    </div>
  `;
}

function countChart(label, value, max, colorClass = "") {
  const width = max ? (value / max) * 100 : 0;

  return `
    <div class="chart-row">
      <div class="chart-info">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>

      <div class="chart-bar ${colorClass}">
        <span style="width:${pct(width)}"></span>
      </div>
    </div>
  `;
}

/* =========================
   13. Render：開銷首頁
========================= */

function renderExpenses() {
  const fixed = fixedExpenses();
  const annual = annualExpenses();
  const oneTime = activeOneTimeExpenses();

  $("heroMonthlyPressure").textContent = money(monthlyPressure());

  $("fixedTotal").textContent = money(totalFixed());
  $("annualMonthly").textContent = money(totalAnnualMonthly());
  $("oneTimePending").textContent = money(totalOneTimePending());
  $("oneTimeSpent").textContent = money(spentOneTimeThisMonth());

  $("fixedCount").textContent = `${fixed.length} 項`;
  $("annualCount").textContent = `${annual.length} 項`;
  $("oneTimeCount").textContent = `${oneTime.length} 項`;

  $("fixedList").innerHTML = fixed.length
    ? fixed.map(item => expenseCard(item, "fixed")).join("")
    : empty("還沒有固定開銷。");

  $("annualList").innerHTML = annual.length
    ? annual.map(item => expenseCard(item, "annual")).join("")
    : empty("還沒有年費。");

  $("oneTimeList").innerHTML = oneTime.length
    ? oneTime.map(item => expenseCard(item, "oneTime")).join("")
    : empty("沒有待花的一次性娛樂開銷。");
}

/* =========================
   14. Render：任務 RPG
========================= */

function renderTasks() {
  const stats = taskStats();

  $("playerLevel").textContent = playerLevel();
  $("playerTitle").textContent = playerTitle();

  $("xpBar").style.width = pct(currentLevelXp());
  $("xpText").textContent = `${currentLevelXp()} / 100 XP`;

  $("taskOpenCount").textContent = stats.open;
  $("taskDoneCount").textContent = stats.done;
  $("totalXp").textContent = state.xp;

  const sorted = [...state.tasks].sort((a, b) => {
    return Number(a.done) - Number(b.done);
  });

  $("taskList").innerHTML = sorted.length
    ? sorted.map(taskCard).join("")
    : empty("還沒有任務，右上角新增一個。");
}

/* =========================
   15. Render：長期付款 / 存款
========================= */

function renderPlans() {
  $("suggestedSaving").textContent = money(suggestedSaving());

  const goals = state.plans.filter(p => p.type === "savingGoal");
  const loans = state.plans.filter(p => p.type === "loan");

  $("savingGoalsList").innerHTML = goals.length
    ? goals.map(planCard).join("")
    : empty("還沒有存款目標。");

  $("loanList").innerHTML = loans.length
    ? loans.map(planCard).join("")
    : empty("還沒有貸款或長期付款。");
}

/* =========================
   16. Render：資料 / 統計
========================= */

function renderProfile() {
  $("profileName").value = state.profile.name || "";
  $("monthlyIncome").value = state.profile.monthlyIncome || "";
  $("entertainmentBudget").value = state.profile.entertainmentBudget || "";

  const income = Number(state.profile.monthlyIncome || 0);
  const planSpend = monthlyPressure();
  const entertainment = Number(state.profile.entertainmentBudget || 0);
  const entertainmentSpent = spentOneTimeThisMonth();
  const stats = taskStats();

  const maxSpending = Math.max(income, planSpend + entertainmentSpent, 1);
  const maxEntertainment = Math.max(entertainment, entertainmentSpent, 1);

  $("spendingChart").innerHTML = [
    chartRow("收入", income, maxSpending, "green"),
    chartRow("固定壓力", planSpend, maxSpending, "orange"),
    chartRow("本月娛樂已花", entertainmentSpent, maxEntertainment, "purple"),
    chartRow("娛樂預算", entertainment, maxEntertainment, "green")
  ].join("");

  $("taskChart").innerHTML = [
    countChart("全部任務", stats.total, Math.max(1, stats.total), "purple"),
    countChart("已完成", stats.done, Math.max(1, stats.total), "green"),
    countChart("未完成", stats.open, Math.max(1, stats.total), "orange")
  ].join("");

  $("profileStats").innerHTML = `
    <article class="stat">
      <span>每月收入</span>
      <strong>${money(income)}</strong>
      <p>你自己填寫</p>
    </article>

    <article class="stat">
      <span>每月固定壓力</span>
      <strong>${money(planSpend)}</strong>
      <p>固定 + 年費月均 + 長期付款</p>
    </article>

    <article class="stat">
      <span>建議可存</span>
      <strong>${money(suggestedSaving())}</strong>
      <p>收入扣除固定壓力後</p>
    </article>

    <article class="stat">
      <span>任務完成率</span>
      <strong>${pct(stats.rate)}</strong>
      <p>${stats.done} 完成 / ${stats.open} 剩餘</p>
    </article>
  `;
}

/* =========================
   17. 主 Render
========================= */

function render() {
  $("todayText").textContent = displayToday();

  renderExpenses();
  renderTasks();
  renderPlans();
  renderProfile();

  saveState();
}

/* =========================
   18. 初始化
========================= */

saveState();
render();
