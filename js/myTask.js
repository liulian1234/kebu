/* ==========================================================
   MyTask Pro JS
   文件位置：js/myTask.js

   功能：
   1. 開銷首頁：固定開銷 / 每年一次 / 一次性娛樂開銷
   2. 4月暫時不算固定開銷，5月開始才算固定開銷
   3. 新增開銷日期 / 統計月份
   4. 任務 RPG：完成任務加 XP、升級
   5. 長期付款 / 存款：貸款、分期、存款目標
   6. 我的資料 / 統計
   7. 黑暗模式
   8. 車貸：
      - 開始供：14/3/2025
      - 已供到：2026 年 4 月
      - 2026 年 5 月尚未付款
      - 每月 RM1,000，約 SGD334
   ========================================================== */

const STORAGE_KEY = "mytask_pro_clean_v2";
const THEME_KEY = "mytask_theme";
const FIXED_START_DATE = "2026-05-01";

const $ = (id) => document.getElementById(id);

/* =========================
   1. 安全工具
========================= */

function on(id, event, handler) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return;
  }

  el.addEventListener(event, handler);
}

function setText(id, value) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return;
  }

  el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return;
  }

  el.innerHTML = value;
}

function setValue(id, value) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return;
  }

  el.value = value;
}

function getValue(id) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return "";
  }

  return el.value;
}

function setWidth(id, value) {
  const el = $(id);

  if (!el) {
    console.warn(`找不到元素：#${id}`);
    return;
  }

  el.style.width = value;
}

/* =========================
   2. 基本工具
========================= */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonthISO() {
  return todayISO().slice(0, 7);
}

function monthValue(dateString) {
  return String(dateString || "").slice(0, 7);
}

function displayToday() {
  return new Date().toLocaleDateString("zh-Hant", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function money(amount, currency = "SGD") {
  const label = currency === "MYR" ? "RM" : currency;

  return label + " " + Number(amount || 0).toLocaleString("en-SG", {
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

function countPaidMonthsInclusive(startDate, paidThrough) {
  const start = new Date(startDate + "T00:00:00");

  if (Number.isNaN(start.getTime()) || !paidThrough) return 0;

  const [paidYear, paidMonth] = paidThrough.split("-").map(Number);

  if (!paidYear || !paidMonth) return 0;

  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1;

  return Math.max(
    0,
    (paidYear - startYear) * 12 + (paidMonth - startMonth) + 1
  );
}

function selectedMonth() {
  return state.profile.reportMonth || thisMonthISO();
}

function defaultExpenseDateForType(type) {
  if (type === "fixed") return FIXED_START_DATE;
  return todayISO();
}

function isExpenseActiveInMonth(expense, month) {
  const startMonth = monthValue(expense.date || expense.createdAt || todayISO());

  if (!startMonth) return true;

  return startMonth <= month;
}

/* =========================
   3. 預設資料
========================= */

function defaultState() {
  const paidMonths = countPaidMonthsInclusive("2025-03-14", "2026-04");
  const today = todayISO();

  return {
    profile: {
      name: "",
      monthlyIncome: 0,
      entertainmentBudget: 200,
      reportMonth: thisMonthISO()
    },

    xp: 0,

    expenses: [
      {
        id: uid(),
        type: "fixed",
        name: "房租",
        amount: 500,
        note: "5月開始，每月一定要付",
        date: FIXED_START_DATE,
        createdAt: today
      },
      {
        id: uid(),
        type: "fixed",
        name: "孝敬費（老爸）",
        amount: 250,
        note: "5月開始，每月一定要付",
        date: FIXED_START_DATE,
        createdAt: today
      },
      {
        id: uid(),
        type: "fixed",
        name: "Wifi",
        amount: 50,
        note: "5月開始，每月一定要付",
        date: FIXED_START_DATE,
        createdAt: today
      },
      {
        id: uid(),
        type: "fixed",
        name: "地鐵",
        amount: 150,
        note: "5月開始，每月一定要付",
        date: FIXED_START_DATE,
        createdAt: today
      },
      {
        id: uid(),
        type: "fixed",
        name: "吃飯",
        amount: 100,
        note: "5月開始，每月一定要付",
        date: FIXED_START_DATE,
        createdAt: today
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
        createdAt: today
      },
      {
        id: uid(),
        title: "整理想買清單",
        category: "生活",
        note: "刪掉不重要的東西",
        xp: 10,
        done: false,
        createdAt: today
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
        currency: "SGD",
        deadline: "",
        createdAt: today
      },
      {
        id: uid(),
        type: "loan",
        name: "車貸",
        total: 101094,
        current: paidMonths * 1000,
        monthly: 334,
        monthlyMYR: 1000,
        currency: "MYR",
        startDate: "2025-03-14",
        paidThrough: "2026-04",
        nextDue: "2026-05-14",
        note: "5月尚未付款",
        carLoan: true,
        createdAt: today
      }
    ]
  };
}

/* =========================
   4. 讀取 / 保存資料
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
        ...(saved.profile || {})
      },
      expenses: Array.isArray(saved.expenses) ? saved.expenses : base.expenses,
      tasks: Array.isArray(saved.tasks) ? saved.tasks : base.tasks,
      plans: Array.isArray(saved.plans) ? saved.plans : base.plans
    };
  } catch (error) {
    console.warn("讀取 localStorage 失敗，已使用預設資料：", error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* =========================
   5. 資料修正
========================= */

function normalizeData() {
  if (!state.profile.reportMonth) {
    state.profile.reportMonth = thisMonthISO();
  }

  state.expenses = state.expenses.map(expense => {
    const normalized = {
      ...expense,
      date: expense.date || expense.createdAt || todayISO(),
      createdAt: expense.createdAt || expense.date || todayISO()
    };

    if (normalized.type === "fixed") {
      const currentMonth = monthValue(normalized.date);

      if (!currentMonth || currentMonth < "2026-05") {
        normalized.date = FIXED_START_DATE;
      }

      if (!normalized.note || normalized.note.includes("每月一定要付")) {
        normalized.note = "5月開始，每月一定要付";
      }
    }

    return normalized;
  });

  state.tasks = state.tasks.map(task => {
    return {
      ...task,
      createdAt: task.createdAt || todayISO()
    };
  });

  state.plans = state.plans.map(plan => {
    return {
      ...plan,
      createdAt: plan.createdAt || todayISO()
    };
  });

  saveState();
}

function migrateCarLoanData() {
  const paidMonths = countPaidMonthsInclusive("2025-03-14", "2026-04");

  const carData = {
    type: "loan",
    name: "車貸",
    total: 101094,
    current: paidMonths * 1000,
    monthly: 334,
    monthlyMYR: 1000,
    currency: "MYR",
    startDate: "2025-03-14",
    paidThrough: "2026-04",
    nextDue: "2026-05-14",
    note: "5月尚未付款",
    carLoan: true
  };

  let car = state.plans.find(plan => {
    return plan.name && plan.name.includes("車貸");
  });

  if (!car) {
    state.plans.push({
      id: uid(),
      ...carData,
      createdAt: todayISO()
    });
  } else {
    const isOldData =
      !car.carLoan ||
      car.total === 31319 ||
      !car.startDate ||
      !car.monthlyMYR ||
      car.startDate !== "2025-03-14";

    if (isOldData) {
      Object.assign(car, carData);
    }
  }

  state.expenses = state.expenses.filter(expense => {
    const name = String(expense.name || "");
    return name !== "車貸款" && name !== "車貸款預算";
  });

  saveState();
}

normalizeData();
migrateCarLoanData();

/* =========================
   6. 計算
========================= */

function fixedExpenses() {
  const month = selectedMonth();

  return state.expenses.filter(expense => {
    return (
      expense.type === "fixed" &&
      isExpenseActiveInMonth(expense, month)
    );
  });
}

function allFixedExpenses() {
  return state.expenses.filter(expense => expense.type === "fixed");
}

function annualExpenses() {
  return state.expenses.filter(expense => expense.type === "annual");
}

function activeOneTimeExpenses() {
  return state.expenses.filter(expense => {
    return expense.type === "oneTime" && !expense.spent;
  });
}

function spentOneTimeThisMonth() {
  const month = selectedMonth();

  return state.expenses
    .filter(expense => {
      return (
        expense.type === "oneTime" &&
        expense.spent &&
        String(expense.spentAt || "").slice(0, 7) === month
      );
    })
    .reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);
}

function oneTimePendingBySelectedMonth() {
  const month = selectedMonth();

  return state.expenses
    .filter(expense => {
      const date = expense.date || expense.createdAt || "";

      return (
        expense.type === "oneTime" &&
        !expense.spent &&
        String(date).slice(0, 7) === month
      );
    })
    .reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);
}

function totalFixed() {
  return fixedExpenses().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);
}

function totalAnnualMonthly() {
  return annualExpenses().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0) / 12;
  }, 0);
}

function totalOneTimePending() {
  return activeOneTimeExpenses().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);
}

function totalLoanMonthly() {
  return state.plans
    .filter(plan => plan.type === "loan")
    .reduce((sum, plan) => {
      return sum + Number(plan.monthly || 0);
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
  const done = state.tasks.filter(task => task.done).length;
  const open = state.tasks.filter(task => !task.done).length;
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
   7. 頁面切換
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

  if (pageInfo[page]) {
    setText("pageTitle", pageInfo[page][0]);
    setText("pageDesc", pageInfo[page][1]);
  }

  const sidebar = $("sidebar");
  if (sidebar) sidebar.classList.remove("show");

  render();
}

document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});

on("mobileMenuBtn", "click", () => {
  const sidebar = $("sidebar");

  if (sidebar) {
    sidebar.classList.toggle("show");
  }
});

/* =========================
   8. 黑暗模式
========================= */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn = $("themeToggle");

  if (btn) {
    btn.textContent = theme === "dark" ? "☀️ 亮色" : "🌙 黑暗";
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(savedTheme);
}

on("themeToggle", "click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";

  applyTheme(next);
});

initTheme();

/* =========================
   9. 表單：新增開銷
========================= */

on("expenseType", "change", () => {
  const type = getValue("expenseType");

  if (!getValue("expenseDate") || type === "fixed") {
    setValue("expenseDate", defaultExpenseDateForType(type));
  }
});

on("expenseForm", "submit", event => {
  event.preventDefault();

  const type = getValue("expenseType");
  const name = getValue("expenseName").trim();
  const amount = Number(getValue("expenseAmount") || 0);
  const date = getValue("expenseDate") || defaultExpenseDateForType(type);
  const note = getValue("expenseNote").trim();

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
    date,
    note: note || (type === "fixed" ? "5月開始，每月一定要付" : ""),
    spent: false,
    createdAt: todayISO()
  });

  setValue("expenseName", "");
  setValue("expenseAmount", "");
  setValue("expenseDate", defaultExpenseDateForType(type));
  setValue("expenseNote", "");

  saveState();
  render();
});

/* =========================
   10. 表單：新增任務
========================= */

on("openTaskFormBtn", "click", () => {
  const form = $("taskForm");

  if (form) {
    form.classList.toggle("hidden");
  }
});

on("taskForm", "submit", event => {
  event.preventDefault();

  const title = getValue("taskTitle").trim();
  const xp = Number(getValue("taskDifficulty") || 10);
  const category = getValue("taskCategory").trim() || "一般";
  const note = getValue("taskNote").trim();

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

  setValue("taskTitle", "");
  setValue("taskCategory", "");
  setValue("taskNote", "");

  const form = $("taskForm");

  if (form) {
    form.classList.add("hidden");
  }

  saveState();
  render();
});

/* =========================
   11. 表單：新增長期項目
========================= */

on("planForm", "submit", event => {
  event.preventDefault();

  const type = getValue("planType");
  const name = getValue("planName").trim();
  const total = Number(getValue("planTotal") || 0);
  const current = Number(getValue("planCurrent") || 0);
  const monthly = Number(getValue("planMonthly") || 0);
  const deadline = getValue("planDeadline");

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
    currency: "SGD",
    deadline,
    createdAt: todayISO()
  });

  setValue("planName", "");
  setValue("planTotal", "");
  setValue("planCurrent", "");
  setValue("planMonthly", "");
  setValue("planDeadline", "");

  saveState();
  render();
});

/* =========================
   12. 表單：個人資料
========================= */

on("profileForm", "submit", event => {
  event.preventDefault();

  state.profile.name = getValue("profileName").trim();
  state.profile.monthlyIncome = Number(getValue("monthlyIncome") || 0);
  state.profile.entertainmentBudget = Number(getValue("entertainmentBudget") || 0);
  state.profile.reportMonth = getValue("reportMonth") || thisMonthISO();

  saveState();
  render();

  alert("已保存資料。");
});

on("reportMonth", "change", () => {
  state.profile.reportMonth = getValue("reportMonth") || thisMonthISO();

  saveState();
  render();
});

/* =========================
   13. 操作功能
========================= */

window.App = {
  deleteExpense(id) {
    if (!confirm("確定刪除這筆開銷嗎？")) return;

    state.expenses = state.expenses.filter(expense => expense.id !== id);

    saveState();
    render();
  },

  spendOneTime(id) {
    const item = state.expenses.find(expense => expense.id === id);

    if (!item) return;

    item.spent = true;
    item.spentAt = todayISO();

    saveState();
    render();
  },

  completeTask(id) {
    const task = state.tasks.find(item => item.id === id);

    if (!task || task.done) return;

    task.done = true;
    task.completedAt = todayISO();
    state.xp += Number(task.xp || 0);

    saveState();
    render();
  },

  deleteTask(id) {
    if (!confirm("確定刪除這個任務嗎？")) return;

    state.tasks = state.tasks.filter(task => task.id !== id);

    saveState();
    render();
  },

  updatePlanCurrent(id, value) {
    const plan = state.plans.find(item => item.id === id);

    if (!plan) return;

    plan.current = Number(value || 0);

    saveState();
    render();
  },

  deletePlan(id) {
    if (!confirm("確定刪除這個長期項目嗎？")) return;

    state.plans = state.plans.filter(plan => plan.id !== id);

    saveState();
    render();
  }
};

/* =========================
   14. 匯入 / 匯出 / 重置
========================= */

on("exportBtn", "click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = `mytask-pro-backup-${todayISO()}.json`;
  a.click();

  URL.revokeObjectURL(a.href);
});

on("importFile", "change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());

    if (!imported.expenses || !imported.tasks || !imported.plans) {
      alert("這不是正確的 MyTask 備份檔。");
      return;
    }

    state = imported;
    normalizeData();
    migrateCarLoanData();

    saveState();
    render();

    alert("匯入成功。");
  } catch {
    alert("匯入失敗，請確認 JSON 檔案正確。");
  }
});

on("resetBtn", "click", () => {
  if (!confirm("確定重置全部資料嗎？")) return;

  state = defaultState();
  normalizeData();
  migrateCarLoanData();

  saveState();
  render();
});

/* =========================
   15. HTML 模板
========================= */

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function expenseCard(item, mode) {
  const monthly =
    mode === "annual"
      ? Number(item.amount || 0) / 12
      : Number(item.amount || 0);

  const action =
    mode === "oneTime"
      ? `<button class="mini-btn green" onclick="App.spendOneTime('${item.id}')">勾選已花</button>`
      : "";

  const amountText =
    mode === "annual"
      ? `年費：${money(item.amount)}｜月均：${money(monthly)}`
      : money(item.amount);

  const dateText = item.date || item.createdAt || "";
  const spentText = item.spentAt ? `｜實際花費：${esc(item.spentAt)}` : "";

  return `
    <article class="list-card">
      <div class="list-top">
        <div>
          <div class="list-title">${esc(item.name)}</div>
          <div class="list-meta">
            ${amountText}
            ${dateText ? "｜開始 / 日期：" + esc(dateText) : ""}
            ${spentText}
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
            ${task.createdAt ? "｜建立：" + esc(task.createdAt) : ""}
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
  const isCarLoan = plan.carLoan || (plan.name && plan.name.includes("車貸"));
  const currency = plan.currency || "SGD";

  const progress =
    plan.total
      ? (Number(plan.current || 0) / Number(plan.total || 1)) * 100
      : 0;

  const remain = Math.max(
    0,
    Number(plan.total || 0) - Number(plan.current || 0)
  );

  const months = plan.deadline ? monthsUntil(plan.deadline) : null;
  const needMonthly = months ? remain / months : 0;

  let monthlyText = "";

  if (isCarLoan) {
    monthlyText = `${money(plan.monthly || 0)} / ${money(plan.monthlyMYR || 1000, "MYR")}`;
  } else if (plan.type === "loan") {
    monthlyText = money(plan.monthly || 0);
  } else {
    monthlyText = months ? money(needMonthly) : money(suggestedSaving());
  }

  const detailText = isCarLoan
    ? `
      <div class="list-meta" style="margin-top:8px;">
        開始供：14/3/2025｜
        已供到：2026 年 4 月｜
        下一期：2026/5/14｜
        5月尚未付款
      </div>
    `
    : "";

  return `
    <article class="plan-card">
      <h4>${esc(plan.name)}</h4>

      <p>${plan.type === "loan" ? "貸款 / 分期" : "存款目標"}</p>

      <div class="plan-numbers">
        <div>
          <span>總額</span>
          <strong>${money(plan.total, currency)}</strong>
        </div>

        <div>
          <span>已完成 / 已還</span>
          <strong>${money(plan.current, currency)}</strong>
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
        進度 ${pct(progress)}｜剩餘 ${money(remain, currency)}
        ${months ? "｜剩餘 " + months + " 個月" : ""}
      </div>

      ${detailText}

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
   16. Render：開銷首頁
========================= */

function renderExpenses() {
  const currentType = getValue("expenseType") || "fixed";

  if ($("expenseDate") && !getValue("expenseDate")) {
    setValue("expenseDate", defaultExpenseDateForType(currentType));
  }

  const fixed = fixedExpenses();
  const annual = annualExpenses();
  const oneTime = activeOneTimeExpenses();
  const month = selectedMonth();

  setText("heroMonthlyPressure", money(monthlyPressure()));

  setText("fixedTotal", money(totalFixed()));
  setText("annualMonthly", money(totalAnnualMonthly()));
  setText("oneTimePending", money(totalOneTimePending()));
  setText("oneTimeSpent", money(spentOneTimeThisMonth()));

  setText("fixedCount", `${fixed.length} 項`);
  setText("annualCount", `${annual.length} 項`);
  setText("oneTimeCount", `${oneTime.length} 項`);

  setHTML(
    "fixedList",
    fixed.length
      ? fixed.map(item => expenseCard(item, "fixed")).join("")
      : empty(`${month} 暫時沒有固定開銷。固定開銷會從 2026-05 開始計算。`)
  );

  setHTML(
    "annualList",
    annual.length
      ? annual.map(item => expenseCard(item, "annual")).join("")
      : empty("還沒有年費。")
  );

  setHTML(
    "oneTimeList",
    oneTime.length
      ? oneTime.map(item => expenseCard(item, "oneTime")).join("")
      : empty("沒有待花的一次性娛樂開銷。")
  );
}

/* =========================
   17. Render：任務 RPG
========================= */

function renderTasks() {
  const stats = taskStats();

  setText("playerLevel", playerLevel());
  setText("playerTitle", playerTitle());

  setWidth("xpBar", pct(currentLevelXp()));
  setText("xpText", `${currentLevelXp()} / 100 XP`);

  setText("taskOpenCount", stats.open);
  setText("taskDoneCount", stats.done);
  setText("totalXp", state.xp);

  const sorted = [...state.tasks].sort((a, b) => {
    return Number(a.done) - Number(b.done);
  });

  setHTML(
    "taskList",
    sorted.length
      ? sorted.map(taskCard).join("")
      : empty("還沒有任務，右上角新增一個。")
  );
}

/* =========================
   18. Render：長期付款 / 存款
========================= */

function renderPlans() {
  setText("suggestedSaving", money(suggestedSaving()));

  const goals = state.plans.filter(plan => plan.type === "savingGoal");
  const loans = state.plans.filter(plan => plan.type === "loan");

  setHTML(
    "savingGoalsList",
    goals.length
      ? goals.map(planCard).join("")
      : empty("還沒有存款目標。")
  );

  setHTML(
    "loanList",
    loans.length
      ? loans.map(planCard).join("")
      : empty("還沒有貸款或長期付款。")
  );
}

/* =========================
   19. Render：資料 / 統計
========================= */

function renderProfile() {
  setValue("profileName", state.profile.name || "");
  setValue("monthlyIncome", state.profile.monthlyIncome || "");
  setValue("entertainmentBudget", state.profile.entertainmentBudget || "");
  setValue("reportMonth", state.profile.reportMonth || thisMonthISO());

  const income = Number(state.profile.monthlyIncome || 0);
  const planSpend = monthlyPressure();
  const entertainment = Number(state.profile.entertainmentBudget || 0);
  const entertainmentSpent = spentOneTimeThisMonth();
  const entertainmentPending = oneTimePendingBySelectedMonth();
  const stats = taskStats();
  const month = selectedMonth();

  const maxSpending = Math.max(income, planSpend + entertainmentSpent, 1);
  const maxEntertainment = Math.max(entertainment, entertainmentSpent, entertainmentPending, 1);

  setHTML(
    "spendingChart",
    [
      chartRow("收入", income, maxSpending, "green"),
      chartRow(`${month} 固定壓力`, planSpend, maxSpending, "orange"),
      chartRow(`${month} 娛樂已花`, entertainmentSpent, maxEntertainment, "purple"),
      chartRow(`${month} 娛樂待花`, entertainmentPending, maxEntertainment, "orange"),
      chartRow("娛樂預算", entertainment, maxEntertainment, "green")
    ].join("")
  );

  setHTML(
    "taskChart",
    [
      countChart("全部任務", stats.total, Math.max(1, stats.total), "purple"),
      countChart("已完成", stats.done, Math.max(1, stats.total), "green"),
      countChart("未完成", stats.open, Math.max(1, stats.total), "orange")
    ].join("")
  );

  setHTML(
    "profileStats",
    `
      <article class="stat">
        <span>統計月份</span>
        <strong>${esc(month)}</strong>
        <p>根據你選擇的月份統計</p>
      </article>

      <article class="stat">
        <span>每月收入</span>
        <strong>${money(income)}</strong>
        <p>你自己填寫</p>
      </article>

      <article class="stat">
        <span>每月固定壓力</span>
        <strong>${money(planSpend)}</strong>
        <p>4月不含固定開銷，5月開始計算</p>
      </article>

      <article class="stat">
        <span>建議可存</span>
        <strong>${money(suggestedSaving())}</strong>
        <p>收入扣除固定壓力後</p>
      </article>

      <article class="stat">
        <span>娛樂已花</span>
        <strong>${money(entertainmentSpent)}</strong>
        <p>${esc(month)} 已勾選花費</p>
      </article>

      <article class="stat">
        <span>娛樂待花</span>
        <strong>${money(entertainmentPending)}</strong>
        <p>${esc(month)} 尚未勾選</p>
      </article>

      <article class="stat">
        <span>任務完成率</span>
        <strong>${pct(stats.rate)}</strong>
        <p>${stats.done} 完成 / ${stats.open} 剩餘</p>
      </article>

      <article class="stat">
        <span>總 XP</span>
        <strong>${state.xp}</strong>
        <p>目前等級 LV ${playerLevel()}</p>
      </article>
    `
  );
}

/* =========================
   20. 主 Render
========================= */

function render() {
  setText("todayText", displayToday());

  renderExpenses();
  renderTasks();
  renderPlans();
  renderProfile();

  saveState();
}

/* =========================
   21. 初始化
========================= */

saveState();
render();
