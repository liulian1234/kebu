/* ==========================================================
   MyTask Pro JS
   Expense History / Forecast Upgrade

   功能：
   1. 一次性 / 一年一次：打勾 -> 確認完成 -> 進歷史
   2. 固定開銷：按月份追蹤，顯示進度條與歷史
   3. 預測月份：一年一次 / 一次性不管幾月都會顯示提醒
   4. 固定開銷：對應月份才出現，例如 2026-05 才開始
   5. 車貸與系統固定開銷鎖定
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
  if (!el) return;
  el.addEventListener(event, handler);
}

function setText(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = value;
}

function setHTML(id, value) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = value;
}

function setValue(id, value) {
  const el = $(id);
  if (!el) return;
  el.value = value;
}

function getValue(id) {
  const el = $(id);
  return el ? el.value : "";
}

function setWidth(id, value) {
  const el = $(id);
  if (!el) return;
  el.style.width = value;
}

function ensureMount(id, parentId, className = "") {
  let el = $(id);
  if (el) return el;

  const parent = $(parentId);
  if (!parent) return null;

  el = document.createElement("div");
  el.id = id;
  el.className = className;
  parent.appendChild(el);

  return el;
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

function nextMonthISO(baseMonth) {
  const [y, m] = (baseMonth || thisMonthISO()).split("-").map(Number);
  const d = new Date(y, m, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function compareMonth(a, b) {
  return String(a).localeCompare(String(b));
}

function getMonthList(startMonth, endMonth) {
  const result = [];

  if (!startMonth || !endMonth || compareMonth(startMonth, endMonth) > 0) {
    return result;
  }

  let [y, m] = startMonth.split("-").map(Number);
  const [endY, endM] = endMonth.split("-").map(Number);

  while (y < endY || (y === endY && m <= endM)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);

    m++;

    if (m > 12) {
      y++;
      m = 1;
    }
  }

  return result;
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

  return `${label} ${Number(amount || 0).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function pct(value) {
  const n = Math.max(0, Math.min(100, Number(value || 0)));
  return `${n.toFixed(1)}%`;
}

function esc(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => ({
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

function selectedReportMonth() {
  return state.profile.reportMonth || thisMonthISO();
}

function selectedForecastMonth() {
  return state.profile.forecastMonth || nextMonthISO(selectedReportMonth());
}

function defaultExpenseDateForType(type) {
  if (type === "fixed") return FIXED_START_DATE;
  return todayISO();
}

function isExpenseActiveInMonth(expense, month) {
  const startMonth = monthValue(expense.date || expense.createdAt || todayISO());

  if (!startMonth) return true;

  return compareMonth(startMonth, month) <= 0;
}

/* =========================
   3. 系統固定資料
========================= */

function systemFixedExpenses() {
  const today = todayISO();

  return [
    {
      systemId: "rent",
      type: "fixed",
      name: "房租",
      amount: 500,
      note: "5月開始，每月一定要付",
      date: FIXED_START_DATE,
      createdAt: today,
      locked: true,
      systemLocked: true
    },
    {
      systemId: "father",
      type: "fixed",
      name: "孝敬費（老爸）",
      amount: 250,
      note: "5月開始，每月一定要付",
      date: FIXED_START_DATE,
      createdAt: today,
      locked: true,
      systemLocked: true
    },
    {
      systemId: "wifi",
      type: "fixed",
      name: "Wifi",
      amount: 50,
      note: "5月開始，每月一定要付",
      date: FIXED_START_DATE,
      createdAt: today,
      locked: true,
      systemLocked: true
    },
    {
      systemId: "metro",
      type: "fixed",
      name: "地鐵",
      amount: 150,
      note: "5月開始，每月一定要付",
      date: FIXED_START_DATE,
      createdAt: today,
      locked: true,
      systemLocked: true
    },
    {
      systemId: "food",
      type: "fixed",
      name: "吃飯",
      amount: 100,
      note: "5月開始，每月一定要付",
      date: FIXED_START_DATE,
      createdAt: today,
      locked: true,
      systemLocked: true
    }
  ];
}

function isSystemFixedExpense(expense) {
  const names = ["房租", "孝敬費（老爸）", "Wifi", "地鐵", "吃飯"];

  return (
    expense.systemLocked ||
    expense.locked ||
    names.includes(String(expense.name || ""))
  );
}

/* =========================
   4. 預設資料
========================= */

function defaultState() {
  const paidMonths = countPaidMonthsInclusive("2025-03-14", "2026-04");
  const today = todayISO();
  const currentMonth = thisMonthISO();

  return {
    profile: {
      name: "",
      monthlyIncome: 0,
      entertainmentBudget: 200,
      reportMonth: currentMonth,
      forecastMonth: nextMonthISO(currentMonth)
    },

    xp: 0,

    expenses: systemFixedExpenses().map(item => ({
      id: uid(),
      flowStatus: "open",
      historyAt: "",
      checkedAt: "",
      ...item
    })),

    fixedMonthlyRecords: [],

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
        locked: true,
        createdAt: today
      }
    ]
  };
}

/* =========================
   5. 讀取 / 保存
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
      fixedMonthlyRecords: Array.isArray(saved.fixedMonthlyRecords)
        ? saved.fixedMonthlyRecords
        : [],
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
   6. 資料修復
========================= */

function restoreSystemFixedExpenses() {
  const defaults = systemFixedExpenses();

  const otherExpenses = state.expenses.filter(expense => {
    return !isSystemFixedExpense(expense);
  });

  const restored = defaults.map(item => {
    const existing = state.expenses.find(expense => {
      return (
        expense.systemId === item.systemId ||
        String(expense.name || "") === item.name
      );
    });

    return {
      id: existing?.id || uid(),
      flowStatus: "open",
      historyAt: "",
      checkedAt: "",
      ...item,
      createdAt: existing?.createdAt || todayISO()
    };
  });

  state.expenses = [...restored, ...otherExpenses];
}

function normalizeData() {
  if (!state.profile.reportMonth) {
    state.profile.reportMonth = thisMonthISO();
  }

  if (!state.profile.forecastMonth) {
    state.profile.forecastMonth = nextMonthISO(state.profile.reportMonth);
  }

  state.expenses = state.expenses.map(expense => {
    const normalized = {
      flowStatus: "open",
      historyAt: "",
      checkedAt: "",
      ...expense,
      date: expense.date || expense.createdAt || todayISO(),
      createdAt: expense.createdAt || expense.date || todayISO()
    };

    if (normalized.type === "fixed" && isSystemFixedExpense(normalized)) {
      normalized.date = FIXED_START_DATE;
      normalized.note = "5月開始，每月一定要付";
      normalized.locked = true;
      normalized.systemLocked = true;
      normalized.flowStatus = "open";
      normalized.historyAt = "";
      normalized.checkedAt = "";
    }

    return normalized;
  });

  state.fixedMonthlyRecords = state.fixedMonthlyRecords
    .filter(item => item && item.expenseId && item.month)
    .map(item => ({
      expenseId: item.expenseId,
      month: item.month,
      status: item.status || "checked",
      checkedAt: item.checkedAt || "",
      doneAt: item.doneAt || "",
      updatedAt: item.updatedAt || todayISO()
    }));

  state.tasks = state.tasks.map(task => ({
    ...task,
    createdAt: task.createdAt || todayISO()
  }));

  state.plans = state.plans.map(plan => ({
    ...plan,
    createdAt: plan.createdAt || todayISO()
  }));
}

function migrateCarLoanData() {
  const paidMonths = countPaidMonthsInclusive("2025-03-14", "2026-04");

  const existingCar = state.plans.find(plan => {
    return (
      plan.carLoan ||
      plan.locked ||
      String(plan.name || "").includes("車貸")
    );
  });

  const carData = {
    id: existingCar?.id || uid(),
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
    locked: true,
    createdAt: existingCar?.createdAt || todayISO()
  };

  state.plans = state.plans.filter(plan => {
    const name = String(plan.name || "");
    return !(plan.carLoan || plan.locked || name.includes("車貸"));
  });

  state.plans.unshift(carData);

  state.expenses = state.expenses.filter(expense => {
    const name = String(expense.name || "");
    return name !== "車貸款" && name !== "車貸款預算";
  });
}

function repairSystemData() {
  restoreSystemFixedExpenses();
  normalizeData();
  migrateCarLoanData();
  saveState();
}

repairSystemData();

/* =========================
   7. Expense 狀態
========================= */

function expenseIsArchived(expense) {
  return Boolean(expense.historyAt);
}

function activeExpensesByType(type) {
  return state.expenses.filter(expense => {
    return expense.type === type && !expenseIsArchived(expense);
  });
}

function archivedExpensesByType(type) {
  return state.expenses.filter(expense => {
    return expense.type === type && expenseIsArchived(expense);
  });
}

function getExpenseFlowStatus(expense) {
  return expense.flowStatus || "open";
}

/* =========================
   8. Fixed 月份記錄
========================= */

function getFixedRecord(expenseId, month) {
  return state.fixedMonthlyRecords.find(record => {
    return record.expenseId === expenseId && record.month === month;
  }) || null;
}

function setFixedRecord(expenseId, month, patch) {
  const idx = state.fixedMonthlyRecords.findIndex(record => {
    return record.expenseId === expenseId && record.month === month;
  });

  if (patch === null) {
    if (idx >= 0) {
      state.fixedMonthlyRecords.splice(idx, 1);
    }

    return;
  }

  if (idx >= 0) {
    state.fixedMonthlyRecords[idx] = {
      ...state.fixedMonthlyRecords[idx],
      ...patch,
      expenseId,
      month,
      updatedAt: todayISO()
    };
  } else {
    state.fixedMonthlyRecords.push({
      expenseId,
      month,
      checkedAt: "",
      doneAt: "",
      status: "checked",
      updatedAt: todayISO(),
      ...patch
    });
  }
}

function getFixedStatus(expenseId, month) {
  const record = getFixedRecord(expenseId, month);
  return record ? record.status : "open";
}

/* =========================
   9. 計算
========================= */

function fixedExpensesForMonth(month) {
  return state.expenses.filter(expense => {
    return (
      expense.type === "fixed" &&
      !expenseIsArchived(expense) &&
      isExpenseActiveInMonth(expense, month)
    );
  });
}

function annualExpensesActive() {
  return activeExpensesByType("annual");
}

function oneTimeExpensesActive() {
  return activeExpensesByType("oneTime");
}

function oneTimeOpenByMonth() {
  return oneTimeExpensesActive().filter(expense => {
    return getExpenseFlowStatus(expense) === "open";
  });
}

function oneTimeCheckedByMonth() {
  return oneTimeExpensesActive().filter(expense => {
    return getExpenseFlowStatus(expense) === "checked";
  });
}

function annualOpenList() {
  return annualExpensesActive().filter(expense => {
    return getExpenseFlowStatus(expense) === "open";
  });
}

function annualCheckedList() {
  return annualExpensesActive().filter(expense => {
    return getExpenseFlowStatus(expense) === "checked";
  });
}

function oneTimeHistoryList() {
  return archivedExpensesByType("oneTime").sort((a, b) => {
    return String(b.historyAt).localeCompare(String(a.historyAt));
  });
}

function annualHistoryList() {
  return archivedExpensesByType("annual").sort((a, b) => {
    return String(b.historyAt).localeCompare(String(a.historyAt));
  });
}

function totalFixedForMonth(month) {
  return fixedExpensesForMonth(month).reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);
}

function totalAnnualMonthly() {
  return annualExpensesActive().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0) / 12;
  }, 0);
}

function totalAnnualActive() {
  return annualExpensesActive().reduce((sum, expense) => {
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

function totalOneTimePendingForMonth() {
  return oneTimeExpensesActive().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);
}

function spentOneTimeThisMonth(month) {
  return oneTimeHistoryList()
    .filter(expense => monthValue(expense.historyAt) === month)
    .reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);
}

function spentAnnualThisMonth(month) {
  return annualHistoryList()
    .filter(expense => monthValue(expense.historyAt) === month)
    .reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);
}

function fixedMonthProgress(month) {
  const due = fixedExpensesForMonth(month);

  const totalAmount = due.reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  const doneAmount = due.reduce((sum, expense) => {
    const status = getFixedStatus(expense.id, month);
    return sum + (status === "done" ? Number(expense.amount || 0) : 0);
  }, 0);

  const checkedAmount = due.reduce((sum, expense) => {
    const status = getFixedStatus(expense.id, month);
    return sum + (status === "checked" ? Number(expense.amount || 0) : 0);
  }, 0);

  return {
    totalAmount,
    doneAmount,
    checkedAmount,
    percent: totalAmount ? (doneAmount / totalAmount) * 100 : 0,
    status: totalAmount && doneAmount >= totalAmount ? "完成" : "未完成"
  };
}

function monthlyPressure(month) {
  return totalFixedForMonth(month) + totalAnnualMonthly() + totalLoanMonthly();
}

function suggestedSaving() {
  return Math.max(
    0,
    Number(state.profile.monthlyIncome || 0) - monthlyPressure(selectedReportMonth())
  );
}

function forecastSummary(month) {
  const fixed = totalFixedForMonth(month);

  const annualTotal = totalAnnualActive();

  const loans = totalLoanMonthly();

  const oneTime = oneTimeExpensesActive().reduce((sum, expense) => {
    return sum + Number(expense.amount || 0);
  }, 0);

  return {
    fixed,
    annualTotal,
    loans,
    oneTime,
    total: fixed + annualTotal + loans + oneTime
  };
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
   10. 頁面切換
========================= */

const pageInfo = {
  expenses: [
    "開銷首頁",
    "主頁負責顯示、添加、追蹤與查看開銷歷史。"
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
    "查看統計、歷史與每月預測。"
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
   11. 黑暗模式
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
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
}

on("themeToggle", "click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
});

initTheme();

/* =========================
   12. 表單：新增開銷
========================= */

on("expenseType", "change", () => {
  const type = getValue("expenseType");

  if (!getValue("expenseDate") || type === "fixed") {
    setValue("expenseDate", defaultExpenseDateForType(type));
  }
});

on("expenseForm", "submit", (event) => {
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
    note: note || (type === "fixed" ? "每月一定要付" : ""),
    spent: false,
    flowStatus: "open",
    checkedAt: "",
    historyAt: "",
    createdAt: todayISO()
  });

  repairSystemData();

  setValue("expenseName", "");
  setValue("expenseAmount", "");
  setValue("expenseDate", defaultExpenseDateForType(type));
  setValue("expenseNote", "");

  render();
});

/* =========================
   13. 表單：新增任務
========================= */

on("openTaskFormBtn", "click", () => {
  const form = $("taskForm");

  if (form) {
    form.classList.toggle("hidden");
  }
});

on("taskForm", "submit", (event) => {
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
   14. 表單：新增長期項目
========================= */

on("planForm", "submit", (event) => {
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

  if (name.includes("車貸")) {
    alert("車貸是系統固定資料，不能新增或覆蓋。");
    repairSystemData();
    render();
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

  repairSystemData();

  setValue("planName", "");
  setValue("planTotal", "");
  setValue("planCurrent", "");
  setValue("planMonthly", "");
  setValue("planDeadline", "");

  render();
});

/* =========================
   15. 表單：個人資料
========================= */

on("profileForm", "submit", (event) => {
  event.preventDefault();

  state.profile.name = getValue("profileName").trim();
  state.profile.monthlyIncome = Number(getValue("monthlyIncome") || 0);
  state.profile.entertainmentBudget = Number(getValue("entertainmentBudget") || 0);
  state.profile.reportMonth = getValue("reportMonth") || state.profile.reportMonth || thisMonthISO();
  state.profile.forecastMonth = getValue("forecastMonth") || state.profile.forecastMonth || nextMonthISO(state.profile.reportMonth);

  saveState();
  render();

  alert("已保存資料。");
});

/* =========================
   16. 動態月份監聽
========================= */

document
