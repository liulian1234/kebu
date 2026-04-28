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
/* =========================
   16. 動態月份監聽
========================= */

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!target) return;

  if (target.id === "reportMonth" || target.id === "autoReportMonth") {
    state.profile.reportMonth = target.value || thisMonthISO();

    if ($("reportMonth") && $("reportMonth") !== target) {
      $("reportMonth").value = state.profile.reportMonth;
    }

    if ($("autoReportMonth") && $("autoReportMonth") !== target) {
      $("autoReportMonth").value = state.profile.reportMonth;
    }

    saveState();
    render();
  }

  if (target.id === "forecastMonth" || target.id === "autoForecastMonth") {
    state.profile.forecastMonth = target.value || nextMonthISO(selectedReportMonth());

    if ($("forecastMonth") && $("forecastMonth") !== target) {
      $("forecastMonth").value = state.profile.forecastMonth;
    }

    if ($("autoForecastMonth") && $("autoForecastMonth") !== target) {
      $("autoForecastMonth").value = state.profile.forecastMonth;
    }

    saveState();
    render();
  }

  if (target.id === "forecastDate") {
    const month = monthValue(target.value);

    if (month) {
      state.profile.forecastMonth = month;
      saveState();
      render();
    }
  }
});

/* =========================
   17. 操作功能
========================= */

window.App = {
  deleteExpense(id) {
    const target = state.expenses.find(expense => expense.id === id);

    if (!target) return;

    if (isSystemFixedExpense(target)) {
      alert("這是系統固定開銷，不能刪除。");
      repairSystemData();
      render();
      return;
    }

    if (!confirm("確定刪除這筆開銷嗎？")) return;

    state.expenses = state.expenses.filter(expense => expense.id !== id);

    saveState();
    render();
  },

  stepExpense(id) {
    const target = state.expenses.find(expense => expense.id === id);

    if (!target) return;
    if (target.type === "fixed") return;

    if (target.flowStatus === "open") {
      target.flowStatus = "checked";
      target.checkedAt = todayISO();
    } else if (target.flowStatus === "checked") {
      target.flowStatus = "done";
      target.historyAt = todayISO();
    }

    saveState();
    render();
  },

  undoExpense(id) {
    const target = state.expenses.find(expense => expense.id === id);

    if (!target) return;
    if (target.type === "fixed") return;

    if (target.flowStatus === "checked") {
      target.flowStatus = "open";
      target.checkedAt = "";
    } else if (target.flowStatus === "done") {
      target.flowStatus = "checked";
      target.historyAt = "";
    }

    saveState();
    render();
  },

  restoreHistoryExpense(id) {
    const target = state.expenses.find(expense => expense.id === id);

    if (!target) return;

    target.flowStatus = "open";
    target.checkedAt = "";
    target.historyAt = "";

    saveState();
    render();
  },

  stepFixed(expenseId, month) {
    const current = getFixedStatus(expenseId, month);

    if (current === "open") {
      setFixedRecord(expenseId, month, {
        status: "checked",
        checkedAt: todayISO(),
        doneAt: ""
      });
    } else if (current === "checked") {
      setFixedRecord(expenseId, month, {
        status: "done",
        doneAt: todayISO()
      });
    }

    saveState();
    render();
  },

  undoFixed(expenseId, month) {
    const current = getFixedStatus(expenseId, month);

    if (current === "checked") {
      setFixedRecord(expenseId, month, null);
    } else if (current === "done") {
      setFixedRecord(expenseId, month, {
        status: "checked",
        doneAt: ""
      });
    }

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

    if (plan.carLoan || plan.locked || String(plan.name || "").includes("車貸")) {
      alert("車貸資料已固定，不能手動修改。");
      repairSystemData();
      render();
      return;
    }

    plan.current = Number(value || 0);

    saveState();
    render();
  },

  deletePlan(id) {
    const target = state.plans.find(item => item.id === id);

    if (!target) return;

    if (target.carLoan || target.locked || String(target.name || "").includes("車貸")) {
      alert("車貸資料已固定，不能刪除。");
      repairSystemData();
      render();
      return;
    }

    if (!confirm("確定刪除這個長期項目嗎？")) return;

    state.plans = state.plans.filter(plan => plan.id !== id);

    saveState();
    render();
  }
};

/* =========================
   18. 匯入 / 匯出 / 重置
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

on("importFile", "change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());

    if (!imported.expenses || !imported.tasks || !imported.plans) {
      alert("這不是正確的 MyTask 備份檔。");
      return;
    }

    state = imported;

    if (!Array.isArray(state.fixedMonthlyRecords)) {
      state.fixedMonthlyRecords = [];
    }

    repairSystemData();
    render();

    alert("匯入成功。");
  } catch {
    alert("匯入失敗，請確認 JSON 檔案正確。");
  }
});

on("resetBtn", "click", () => {
  if (!confirm("確定重置全部資料嗎？")) return;

  state = defaultState();
  repairSystemData();
  render();
});

/* =========================
   19. HTML 小工具
========================= */

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function groupBlock(title, html) {
  return `
    <div class="sub-block">
      <div>${title}</div>
      ${html}
    </div>
  `;
}

function statusBadge(text, color = "") {
  return `
    <span class="status-badge ${color}">
      ${text}
    </span>
  `;
}

function progressBar(percent) {
  return `
    <div class="progress">
      <span style="width:${pct(percent)}"></span>
    </div>
  `;
}

function expenseCard(item) {
  const status = getExpenseFlowStatus(item);
  const checked = status === "checked";
  const archived = expenseIsArchived(item);
  const strikeStyle = checked ? 'style="text-decoration:line-through;opacity:.7;"' : "";

  const typeText =
    item.type === "annual"
      ? "一年一次"
      : item.type === "oneTime"
        ? "一次性"
        : "固定";

  const dateLabel =
    item.type === "annual" || item.type === "oneTime"
      ? "截止日期"
      : "開始日期";

  let actions = "";

  if (!archived) {
    if (status === "open") {
      actions = `<button class="mini-btn green" onclick="App.stepExpense('${item.id}')">打勾</button>`;
    } else if (status === "checked") {
      actions = `
        <button class="mini-btn" onclick="App.undoExpense('${item.id}')">取消</button>
        <button class="mini-btn green" onclick="App.stepExpense('${item.id}')">確認完成</button>
      `;
    }
  } else {
    actions = `<button class="mini-btn" onclick="App.restoreHistoryExpense('${item.id}')">恢復</button>`;
  }

  const deleteButton = item.type !== "fixed" && !archived
    ? `<button class="mini-btn red" onclick="App.deleteExpense('${item.id}')">刪除</button>`
    : "";

  return `
    <article class="list-card ${checked ? "checked" : ""}">
      <div class="list-top">
        <div>
          <div class="list-title" ${strikeStyle}>
            ${esc(item.name)}
            ${checked ? statusBadge("已打勾", "orange") : ""}
            ${archived ? statusBadge("歷史完成", "green") : ""}
          </div>

          ${
            item.date
              ? `
                <div class="deadline-date">
                  <span>${dateLabel}</span>
                  <strong>${esc(item.date)}</strong>
                </div>
              `
              : ""
          }

          <div class="list-meta">
            ${typeText}｜${money(item.amount)}
            ${item.note ? `｜${esc(item.note)}` : ""}
            ${item.checkedAt ? `｜第一次打勾：${esc(item.checkedAt)}` : ""}
            ${item.historyAt ? `｜完成：${esc(item.historyAt)}` : ""}
          </div>
        </div>

        <div class="amount">${money(item.amount)}</div>
      </div>

      <div class="list-actions">
        ${actions}
        ${deleteButton}
      </div>
    </article>
  `;
}

function fixedExpenseCard(item, month) {
  const status = getFixedStatus(item.id, month);
  const checked = status === "checked";
  const done = status === "done";
  const strikeStyle = checked || done ? 'style="text-decoration:line-through;opacity:.75;"' : "";

  let badge = "";
  let actions = "";

  if (status === "open") {
    badge = statusBadge("未完成", "orange");
    actions = `<button class="mini-btn green" onclick="App.stepFixed('${item.id}','${month}')">打勾</button>`;
  } else if (status === "checked") {
    badge = statusBadge("已打勾", "orange");
    actions = `
      <button class="mini-btn" onclick="App.undoFixed('${item.id}','${month}')">取消</button>
      <button class="mini-btn green" onclick="App.stepFixed('${item.id}','${month}')">確認完成</button>
    `;
  } else if (status === "done") {
    badge = statusBadge("已完成", "green");
    actions = `<button class="mini-btn" onclick="App.undoFixed('${item.id}','${month}')">還原一步</button>`;
  }

  return `
    <article class="list-card ${checked || done ? "checked" : ""}">
      <div class="list-top">
        <div>
          <div class="list-title" ${strikeStyle}>
            ${esc(item.name)} ${badge}
          </div>

          <div class="list-meta">
            ${money(item.amount)}｜月份：${esc(month)}
            ${item.note ? `｜${esc(item.note)}` : ""}
          </div>
        </div>

        <div class="amount">${money(item.amount)}</div>
      </div>

      <div class="list-actions">
        ${actions}
        <button class="mini-btn" type="button" disabled>🔒 固定</button>
      </div>
    </article>
  `;
}

function fixedHistoryCard(month) {
  const due = fixedExpensesForMonth(month);

  if (!due.length) return "";

  const progress = fixedMonthProgress(month);

  const detail = due.map(item => {
    const status = getFixedStatus(item.id, month);

    const badge =
      status === "done"
        ? "完成"
        : status === "checked"
          ? "已打勾"
          : "未完成";

    return `
      <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
        <span>${esc(item.name)}</span>
        <span>${money(item.amount)}｜${badge}</span>
      </div>
    `;
  }).join("");

  return `
    <article class="plan-card">
      <h4>${esc(month)} 固定開銷</h4>
      <p>${money(progress.totalAmount)}｜${progress.status}</p>

      <div class="plan-numbers">
        <div>
          <span>總額</span>
          <strong>${money(progress.totalAmount)}</strong>
        </div>

        <div>
          <span>已完成</span>
          <strong>${money(progress.doneAmount)}</strong>
        </div>

        <div>
          <span>進度</span>
          <strong>${pct(progress.percent)}</strong>
        </div>
      </div>

      ${progressBar(progress.percent)}

      <div class="list-meta" style="margin-top:8px;">
        已打勾：${money(progress.checkedAmount)}｜
        狀態：${progress.status}
      </div>

      <div style="margin-top:12px;">
        ${detail}
      </div>
    </article>
  `;
}

function planCard(plan) {
  const isCarLoan =
    plan.carLoan ||
    plan.locked ||
    String(plan.name || "").includes("車貸");

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
        🔒 已固定，不能手動修改｜
        開始供：14/3/2025｜
        已供到：2026 年 4 月｜
        下一期：2026/5/14｜
        5月尚未付款
      </div>
    `
    : "";

  const actions = isCarLoan
    ? `
      <div class="list-actions">
        <button class="mini-btn" type="button" disabled>🔒 車貸已固定</button>
      </div>
    `
    : `
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
    `;

  return `
    <article class="plan-card">
      <h4>${esc(plan.name)} ${isCarLoan ? "🔒" : ""}</h4>
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

      ${progressBar(progress)}

      <div class="list-meta" style="margin-top:8px;">
        進度 ${pct(progress)}｜剩餘 ${money(remain, currency)}
        ${months ? `｜剩餘 ${months} 個月` : ""}
      </div>

      ${detailText}
      ${actions}
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
            ${task.createdAt ? `｜建立：${esc(task.createdAt)}` : ""}
            ${task.note ? `｜${esc(task.note)}` : ""}
            ${task.done ? `｜完成：${esc(task.completedAt || "")}` : ""}
          </div>
        </div>

        <div class="amount">${task.done ? "DONE" : `+${task.xp} XP`}</div>
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
   20. Render：開銷首頁
========================= */

function renderFixedSection() {
  const month = selectedReportMonth();
  const due = fixedExpensesForMonth(month);

  const pending = due.filter(item => getFixedStatus(item.id, month) === "open");
  const checked = due.filter(item => getFixedStatus(item.id, month) === "checked");
  const done = due.filter(item => getFixedStatus(item.id, month) === "done");

  const html = [
    groupBlock(
      "待完成固定開銷",
      pending.length
        ? pending.map(item => fixedExpenseCard(item, month)).join("")
        : empty("本月沒有待完成固定開銷。")
    ),

    groupBlock(
      "已打勾，等待確認",
      checked.length
        ? checked.map(item => fixedExpenseCard(item, month)).join("")
        : empty("沒有已打勾的固定開銷。")
    ),

    groupBlock(
      "本月已完成",
      done.length
        ? done.map(item => fixedExpenseCard(item, month)).join("")
        : empty("本月還沒有完成的固定開銷。")
    )
  ].join("");

  setHTML("fixedList", html);
  setText("fixedCount", `${due.length} 項`);
}

function renderAnnualSection() {
  const open = annualOpenList();
  const checked = annualCheckedList();

  const html = [
    groupBlock(
      "待處理的一年一次費用",
      open.length
        ? open.map(expenseCard).join("")
        : empty("還沒有年費。")
    ),

    groupBlock(
      "已打勾，等待確認",
      checked.length
        ? checked.map(expenseCard).join("")
        : empty("沒有已打勾的年費。")
    )
  ].join("");

  setHTML("annualList", html);
  setText("annualCount", `${open.length + checked.length} 項`);
}

function renderOneTimeSection() {
  const open = oneTimeOpenByMonth();
  const checked = oneTimeCheckedByMonth();

  const html = [
    groupBlock(
      "待處理的一次性開銷",
      open.length
        ? open.map(expenseCard).join("")
        : empty("目前沒有待處理的一次性開銷。")
    ),

    groupBlock(
      "已打勾，等待確認",
      checked.length
        ? checked.map(expenseCard).join("")
        : empty("沒有已打勾的一次性開銷。")
    )
  ].join("");

  setHTML("oneTimeList", html);
  setText("oneTimeCount", `${open.length + checked.length} 項`);
}

function renderExpenseHistoryAndForecast() {
  const reportMonth = selectedReportMonth();
  const forecastMonth = selectedForecastMonth();

  const wrap = ensureMount("expenseExtraArea", "page-expenses", "card");

  if (!wrap) return;

  const earliestFixedMonth = monthValue(FIXED_START_DATE);

  const monthList = getMonthList(earliestFixedMonth, reportMonth)
    .reverse()
    .slice(0, 12);

  const fixedHistoryHtml = monthList
    .map(month => fixedHistoryCard(month))
    .filter(Boolean)
    .join("") || empty("目前沒有固定開銷歷史。");

  const annualHistoryHtml = annualHistoryList().length
    ? annualHistoryList().map(expenseCard).join("")
    : empty("目前沒有一年一次歷史記錄。");

  const oneTimeHistoryHtml = oneTimeHistoryList().length
    ? oneTimeHistoryList().map(expenseCard).join("")
    : empty("目前沒有一次性歷史記錄。");

  const annualForecastList = annualExpensesActive().length
    ? annualExpensesActive().map(expenseCard).join("")
    : empty("沒有待處理的一年一次費用。");

  const oneTimeForecastList = oneTimeExpensesActive().length
    ? oneTimeExpensesActive().map(expenseCard).join("")
    : empty("沒有待處理的一次性開銷。");

  const forecast = forecastSummary(forecastMonth);

  wrap.innerHTML = `
    <section class="card" style="margin-top:20px;">
      <h3 style="margin-bottom:14px;">月份控制 / 預測</h3>

      <div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        <div>
          <label>統計月份</label>
          <input type="month" id="autoReportMonth" value="${esc(reportMonth)}">
        </div>

        <div>
          <label>預測月份</label>
          <input type="month" id="autoForecastMonth" value="${esc(forecastMonth)}">
        </div>
      </div>

      <div class="stats-grid" style="margin-top:18px;">
        <article class="stat">
          <span>預測固定開銷</span>
          <strong>${money(forecast.fixed)}</strong>
          <p>${esc(forecastMonth)} 固定開銷</p>
        </article>

        <article class="stat">
          <span>一年一次待處理</span>
          <strong>${money(forecast.annualTotal)}</strong>
          <p>不管幾月都會提醒</p>
        </article>

        <article class="stat">
          <span>預測貸款</span>
          <strong>${money(forecast.loans)}</strong>
          <p>固定長期付款</p>
        </article>

        <article class="stat">
          <span>一次性待處理</span>
          <strong>${money(forecast.oneTime)}</strong>
          <p>不管幾月都會提醒</p>
        </article>

        <article class="stat">
          <span>預測總壓力</span>
          <strong>${money(forecast.total)}</strong>
          <p>${esc(forecastMonth)} + 未完成提醒</p>
        </article>
      </div>
    </section>

    <section class="card forecast-section" style="margin-top:20px;">
      <h3>預測提醒：一年一次費用</h3>
      <p class="section-desc">這裡不會因為月份不同而隱藏，日期會當作截止日期提醒你。</p>

      <div class="history-list">
        ${annualForecastList}
      </div>
    </section>

    <section class="card forecast-section" style="margin-top:20px;">
      <h3>預測提醒：一次性開銷</h3>
      <p class="section-desc">這裡不會因為月份不同而隱藏，日期會當作截止日期提醒你。</p>

      <div class="history-list">
        ${oneTimeForecastList}
      </div>
    </section>

    <section class="card" style="margin-top:20px;">
      <h3 style="margin-bottom:14px;">一次性歷史記錄</h3>
      ${oneTimeHistoryHtml}
    </section>

    <section class="card" style="margin-top:20px;">
      <h3 style="margin-bottom:14px;">一年一次歷史記錄</h3>
      ${annualHistoryHtml}
    </section>

    <section class="card" style="margin-top:20px;">
      <h3 style="margin-bottom:14px;">固定開銷歷史（按月份）</h3>
      ${fixedHistoryHtml}
    </section>
  `;
}

function renderExpenses() {
  const currentType = getValue("expenseType") || "fixed";

  if ($("expenseDate") && !getValue("expenseDate")) {
    setValue("expenseDate", defaultExpenseDateForType(currentType));
  }

  const month = selectedReportMonth();

  setText("heroMonthlyPressure", money(monthlyPressure(month)));
  setText("fixedTotal", money(totalFixedForMonth(month)));
  setText("annualMonthly", money(totalAnnualMonthly()));
  setText("oneTimePending", money(totalOneTimePendingForMonth(month)));
  setText("oneTimeSpent", money(spentOneTimeThisMonth(month)));

  renderFixedSection();
  renderAnnualSection();
  renderOneTimeSection();
  renderExpenseHistoryAndForecast();
}

/* =========================
   21. Render：任務 RPG
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
   22. Render：長期付款 / 存款
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
   23. Render：資料 / 統計
========================= */

function renderProfile() {
  setValue("profileName", state.profile.name || "");
  setValue("monthlyIncome", state.profile.monthlyIncome || "");
  setValue("entertainmentBudget", state.profile.entertainmentBudget || "");
  setValue("reportMonth", selectedReportMonth());
  setValue("forecastMonth", selectedForecastMonth());

  const reportMonth = selectedReportMonth();

  const income = Number(state.profile.monthlyIncome || 0);
  const planSpend = monthlyPressure(reportMonth);
  const entertainment = Number(state.profile.entertainmentBudget || 0);
  const entertainmentSpent = spentOneTimeThisMonth(reportMonth);
  const entertainmentPending = totalOneTimePendingForMonth(reportMonth);
  const annualPaid = spentAnnualThisMonth(reportMonth);
  const fixedProgress = fixedMonthProgress(reportMonth);
  const stats = taskStats();

  const maxSpending = Math.max(income, planSpend + entertainmentSpent + annualPaid, 1);
  const maxEntertainment = Math.max(entertainment, entertainmentSpent, entertainmentPending, 1);

  setHTML(
    "spendingChart",
    [
      chartRow("收入", income, maxSpending, "green"),
      chartRow(`${reportMonth} 固定壓力`, planSpend, maxSpending, "orange"),
      chartRow(`${reportMonth} 娛樂已花`, entertainmentSpent, maxEntertainment, "purple"),
      chartRow(`${reportMonth} 娛樂待花`, entertainmentPending, maxEntertainment, "orange"),
      chartRow(`${reportMonth} 年費已完成`, annualPaid, maxSpending, "green"),
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
        <strong>${esc(reportMonth)}</strong>
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
        <p>${esc(reportMonth)} 已確認完成</p>
      </article>

      <article class="stat">
        <span>娛樂待花</span>
        <strong>${money(entertainmentPending)}</strong>
        <p>${esc(reportMonth)} 尚未完成</p>
      </article>

      <article class="stat">
        <span>年費已完成</span>
        <strong>${money(annualPaid)}</strong>
        <p>${esc(reportMonth)} 進入歷史的一年一次費用</p>
      </article>

      <article class="stat">
        <span>固定開銷完成率</span>
        <strong>${pct(fixedProgress.percent)}</strong>
        <p>${fixedProgress.status}｜${money(fixedProgress.doneAmount)} / ${money(fixedProgress.totalAmount)}</p>
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
   24. 主 Render
========================= */

let isRendering = false;

function render() {
  if (isRendering) return;

  isRendering = true;

  setText("todayText", displayToday());

  renderExpenses();
  renderTasks();
  renderPlans();
  renderProfile();

  saveState();

  isRendering = false;
}

/* =========================
   25. 初始化
========================= */

repairSystemData();
saveState();
render();


/* =========================
   Main Render
========================= */

let isRendering = false;

function render() {
  if (isRendering) return;

  isRendering = true;

  setText("todayText", displayToday());

  renderExpenses();
  renderTasks();
  renderPlans();
  renderProfile();

  saveState();

  isRendering = false;
}

/* =========================
   Init
========================= */

repairSystemData();
saveState();
render();

console.log("MyTask JS loaded v1001");
