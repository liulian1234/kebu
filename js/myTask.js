// =====================================================
// MyTask Pro JavaScript
// 文件位置：js/myTask.js
// 功能：任務、想買、開銷、存款、車貸、匯入匯出
// =====================================================

const STORAGE_KEY = "mytask_pro_v1";

const $ = (id) => document.getElementById(id);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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
  return `${currency} ${Number(amount || 0).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function percent(value) {
  const n = Math.max(0, Math.min(100, Number(value || 0)));
  return `${n.toFixed(1)}%`;
}

function escapeHTML(text = "") {
  return String(text).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function extractNumber(text = "") {
  const match = String(text).match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthsUntil(dateString) {
  if (!dateString) return 1;

  const now = new Date();
  const end = new Date(dateString + "T00:00:00");

  if (Number.isNaN(end.getTime()) || end <= now) return 1;

  let months =
    (end.getFullYear() - now.getFullYear()) * 12 +
    (end.getMonth() - now.getMonth());

  if (end.getDate() > now.getDate()) months += 1;

  return Math.max(1, months);
}

// =====================================================
// Default Data
// =====================================================

function defaultState() {
  return {
    settings: {
      incomeSGD: 0,
      currentSavingSGD: 0,
      targetSavingSGD: 100000,
      deadline: addMonths(new Date(), 60).toISOString().slice(0, 10),
      fxSgdToMyr: 3.09742
    },

    records: [
      {
        id: uid(),
        type: "expense",
        title: "房租",
        amount: 500,
        currency: "SGD",
        note: "每月固定開銷",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "expense",
        title: "孝敬費（老爸）",
        amount: 250,
        currency: "SGD",
        note: "每月固定開銷",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "expense",
        title: "Wifi",
        amount: 50,
        currency: "SGD",
        note: "每月固定開銷",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "expense",
        title: "地鐵",
        amount: 150,
        currency: "SGD",
        note: "每月固定開銷",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "expense",
        title: "吃飯",
        amount: 100,
        currency: "SGD",
        note: "每月固定開銷",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "expense",
        title: "車貸款",
        amount: 334,
        currency: "SGD",
        note: "約 RM1,000 / 月",
        done: false,
        createdAt: todayISO()
      },
      {
        id: uid(),
        type: "task",
        title: "更新目前存款",
        amount: 0,
        currency: "SGD",
        note: "每月底更新一次",
        done: false,
        createdAt: todayISO()
      }
    ],

    carLoan: {
      startDate: "2025-04-14",
      principalMYR: 101094,
      monthlyMYR: 1000
    }
  };
}

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
      settings: {
        ...base.settings,
        ...saved.settings
      },
      carLoan: {
        ...base.carLoan,
        ...saved.carLoan
      },
      records: Array.isArray(saved.records) ? saved.records : base.records
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// =====================================================
// Calculations
// =====================================================

function monthlyExpense() {
  return state.records
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function savingProgress() {
  const target = Number(state.settings.targetSavingSGD || 0);
  if (!target) return 0;
  return (Number(state.settings.currentSavingSGD || 0) / target) * 100;
}

function savingRemain() {
  return Math.max(
    0,
    Number(state.settings.targetSavingSGD || 0) -
      Number(state.settings.currentSavingSGD || 0)
  );
}

function monthlySavingNeed() {
  return savingRemain() / monthsUntil(state.settings.deadline);
}

function freeAfterPlan() {
  const income = Number(state.settings.incomeSGD || 0);
  if (!income) return null;

  return income - monthlyExpense() - monthlySavingNeed();
}

function carLoanCalc() {
  const start = new Date(state.carLoan.startDate + "T00:00:00");
  const now = new Date();

  const totalMonths = Math.ceil(
    Number(state.carLoan.principalMYR || 0) /
      Math.max(1, Number(state.carLoan.monthlyMYR || 1))
  );

  let paidMonths = 0;

  if (!Number.isNaN(start.getTime()) && now >= start) {
    paidMonths =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());

    if (now.getDate() < start.getDate()) paidMonths -= 1;
  }

  paidMonths = Math.max(0, Math.min(totalMonths, paidMonths));

  const remainMonths = Math.max(0, totalMonths - paidMonths);
  const paidMYR = paidMonths * Number(state.carLoan.monthlyMYR || 0);
  const remainMYR = Math.max(
    0,
    Number(state.carLoan.principalMYR || 0) - paidMYR
  );

  const progress = totalMonths ? (paidMonths / totalMonths) * 100 : 0;

  return {
    totalMonths,
    paidMonths,
    remainMonths,
    paidMYR,
    remainMYR,
    progress
  };
}

// =====================================================
// Navigation
// =====================================================

const pageInfo = {
  overview: {
    title: "Overview",
    desc: "今天先看最重要的任務、存款和開銷。"
  },
  add: {
    title: "New Record",
    desc: "新增任務、想買、開銷或存錢記錄。"
  },
  tasks: {
    title: "Tasks",
    desc: "整理要做的事和想買的東西。"
  },
  money: {
    title: "Money",
    desc: "追蹤 100,000 SGD 存款目標。"
  },
  expenses: {
    title: "Expenses",
    desc: "查看每月固定開銷。"
  },
  car: {
    title: "Car Loan",
    desc: "粗估車貸完成度與剩餘期數。"
  },
  settings: {
    title: "Settings",
    desc: "設定收入、存款目標、匯率和目標日期。"
  }
};

function showPage(page) {
  document.querySelectorAll(".page").forEach((el) => {
    el.classList.remove("active");
  });

  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.remove("active");
  });

  const pageEl = $(`page-${page}`);
  const navEl = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add("active");
  if (navEl) navEl.classList.add("active");

  $("pageTitle").textContent = pageInfo[page].title;
  $("pageDesc").textContent = pageInfo[page].desc;

  $("sidebar").classList.remove("show");
  render();
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.go);
  });
});

$("menuBtn").addEventListener("click", () => {
  $("sidebar").classList.toggle("show");
});

// =====================================================
// Quick Add
// =====================================================

$("quickAddBtn").addEventListener("click", quickAdd);

$("quickTitle").addEventListener("keydown", (event) => {
  if (event.key === "Enter") quickAdd();
});

function quickAdd() {
  const title = $("quickTitle").value.trim();
  const type = $("quickType").value;

  if (!title) {
    alert("先寫一點東西。");
    return;
  }

  if (type === "saving") {
    const amount = extractNumber(title);

    if (!amount) {
      alert("存錢請輸入金額，例如：50 或 存 50");
      return;
    }

    state.settings.currentSavingSGD += amount;

    state.records.unshift({
      id: uid(),
      type: "saving",
      title: `存入 ${money(amount)}`,
      amount,
      currency: "SGD",
      note: "快速新增",
      done: true,
      createdAt: todayISO()
    });
  } else {
    const amount = type === "expense" ? extractNumber(title) : 0;

    state.records.unshift({
      id: uid(),
      type,
      title,
      amount,
      currency: "SGD",
      note: "快速新增",
      done: false,
      createdAt: todayISO()
    });
  }

  $("quickTitle").value = "";
  saveState();
  render();
}

// =====================================================
// Add Form
// =====================================================

let currentForm = "task";

document.querySelectorAll(".record-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentForm = tab.dataset.form;

    document.querySelectorAll(".record-tab").forEach((item) => {
      item.classList.remove("active");
    });

    tab.classList.add("active");
    renderForm();
  });
});

function renderForm() {
  const formArea = $("formArea");

  if (currentForm === "task") {
    formArea.innerHTML = `
      <div class="form-card two">
        <div class="field">
          <label>任務名稱</label>
          <input id="formTitle" placeholder="例如：剪影片、繳電話費、更新存款" />
        </div>

        <div class="field">
          <label>分類 / 備註</label>
          <input id="formNote" placeholder="例如：工作、生活、理財" />
        </div>

        <button class="btn btn-primary wide" onclick="App.addRecord()">新增任務</button>
      </div>
    `;
  }

  if (currentForm === "wish") {
    formArea.innerHTML = `
      <div class="form-card two">
        <div class="field">
          <label>想買什麼</label>
          <input id="formTitle" placeholder="例如：新手機、貓咪用品、電腦椅" />
        </div>

        <div class="field">
          <label>預算 SGD</label>
          <input id="formAmount" type="number" min="0" placeholder="可以不填" />
        </div>

        <div class="field wide">
          <label>備註</label>
          <textarea id="formNote" placeholder="為什麼想買？急不急？"></textarea>
        </div>

        <button class="btn btn-primary wide" onclick="App.addRecord()">加入想買清單</button>
      </div>
    `;
  }

  if (currentForm === "expense") {
    formArea.innerHTML = `
      <div class="form-card two">
        <div class="field">
          <label>開銷名稱</label>
          <input id="formTitle" placeholder="例如：房租、吃飯、交通、訂閱費" />
        </div>

        <div class="field">
          <label>金額 SGD</label>
          <input id="formAmount" type="number" min="0" placeholder="例如：100" />
        </div>

        <div class="field wide">
          <label>備註</label>
          <textarea id="formNote" placeholder="例如：每月固定、只需付三個月、可以調整"></textarea>
        </div>

        <button class="btn btn-primary wide" onclick="App.addRecord()">新增開銷</button>
      </div>
    `;
  }

  if (currentForm === "saving") {
    formArea.innerHTML = `
      <div class="form-card two">
        <div class="field">
          <label>這次存了多少 SGD</label>
          <input id="formAmount" type="number" min="0" placeholder="例如：50" />
        </div>

        <div class="field">
          <label>備註</label>
          <input id="formNote" placeholder="例如：薪水、兼職、少花省下來" />
        </div>

        <button class="btn btn-primary wide" onclick="App.addRecord()">更新存款</button>
      </div>
    `;
  }
}

// =====================================================
// Filters
// =====================================================

let currentTaskFilter = "all";

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentTaskFilter = btn.dataset.filter;

    document.querySelectorAll(".filter-btn").forEach((item) => {
      item.classList.remove("active");
    });

    btn.classList.add("active");
    renderTasks();
  });
});

// =====================================================
// App Actions
// =====================================================

window.App = {
  addRecord() {
    const titleInput = $("formTitle");
    const amountInput = $("formAmount");
    const noteInput = $("formNote");

    if (currentForm === "saving") {
      const amount = Number(amountInput.value || 0);

      if (!amount) {
        alert("請輸入存款金額。");
        return;
      }

      state.settings.currentSavingSGD += amount;

      state.records.unshift({
        id: uid(),
        type: "saving",
        title: `存入 ${money(amount)}`,
        amount,
        currency: "SGD",
        note: noteInput.value.trim(),
        done: true,
        createdAt: todayISO()
      });

      saveState();
      renderForm();
      showPage("money");
      return;
    }

    const title = titleInput.value.trim();

    if (!title) {
      alert("請填名稱。");
      return;
    }

    state.records.unshift({
      id: uid(),
      type: currentForm,
      title,
      amount: amountInput ? Number(amountInput.value || 0) : 0,
      currency: "SGD",
      note: noteInput ? noteInput.value.trim() : "",
      done: false,
      createdAt: todayISO()
    });

    saveState();
    renderForm();

    if (currentForm === "expense") showPage("expenses");
    else showPage("tasks");
  },

  toggleDone(id) {
    const item = state.records.find((record) => record.id === id);

    if (!item) return;

    item.done = !item.done;
    saveState();
    render();
  },

  deleteRecord(id) {
    if (!confirm("確定刪除這筆記錄嗎？")) return;

    state.records = state.records.filter((record) => record.id !== id);
    saveState();
    render();
  }
};

// =====================================================
// Settings
// =====================================================

function bindSettings() {
  const fields = [
    ["settingIncome", "incomeSGD"],
    ["settingCurrentSaving", "currentSavingSGD"],
    ["settingTargetSaving", "targetSavingSGD"],
    ["settingDeadline", "deadline"],
    ["settingFx", "fxSgdToMyr"]
  ];

  fields.forEach(([id, key]) => {
    const input = $(id);
    if (!input) return;

    input.value = state.settings[key] ?? "";

    input.oninput = () => {
      state.settings[key] =
        input.type === "number" ? Number(input.value || 0) : input.value;

      saveState();
      render();
    };
  });
}

// =====================================================
// Import / Export / Reset
// =====================================================

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `mytask-backup-${todayISO()}.json`;
  a.click();

  URL.revokeObjectURL(url);
});

$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());

    if (!imported.records || !imported.settings) {
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
  if (!confirm("確定要重置所有資料嗎？")) return;

  state = defaultState();
  saveState();
  render();
});

// =====================================================
// Render Helpers
// =====================================================

function typeLabel(type) {
  return {
    task: "任務",
    wish: "想買",
    expense: "開銷",
    saving: "存錢"
  }[type] || "記錄";
}

function typeIcon(type) {
  return {
    task: "✅",
    wish: "🛒",
    expense: "💳",
    saving: "💰"
  }[type] || "📝";
}

function itemCard(item) {
  const canCheck = item.type === "task" || item.type === "wish";

  const checkbox = canCheck
    ? `<input type="checkbox" ${item.done ? "checked" : ""} onchange="App.toggleDone('${item.id}')" />`
    : `<span class="type-badge ${item.type}">${typeIcon(item.type)}</span>`;

  const amountText = item.amount
    ? `｜${money(item.amount, item.currency || "SGD")}`
    : "";

  return `
    <article class="item-card ${item.done ? "done" : ""}">
      ${checkbox}

      <div>
        <div class="item-title">${escapeHTML(item.title)}</div>

        <div class="item-meta">
          <span class="type-badge ${item.type}">${typeLabel(item.type)}</span>
          ${amountText}
          ${item.note ? `｜${escapeHTML(item.note)}` : ""}
          ｜${escapeHTML(item.createdAt || "")}
        </div>
      </div>

      <div class="item-actions">
        <button onclick="App.deleteRecord('${item.id}')">Delete</button>
      </div>
    </article>
  `;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

// =====================================================
// Render Sections
// =====================================================

function renderOverview() {
  const openTasks = state.records.filter((item) => {
    return (item.type === "task" || item.type === "wish") && !item.done;
  });

  const expenses = monthlyExpense();
  const progress = savingProgress();
  const free = freeAfterPlan();

  $("statOpenTasks").textContent = openTasks.length;
  $("statExpense").textContent = money(expenses);
  $("statSaving").textContent = percent(progress);
  $("statSavingText").textContent =
    `${money(state.settings.currentSavingSGD)} / ${money(state.settings.targetSavingSGD)}`;

  $("statFree").textContent = free === null ? "未設定收入" : money(free);

  const priority = openTasks.slice(0, 5);
  $("priorityTasks").innerHTML = priority.length
    ? priority.map(itemCard).join("")
    : emptyState("目前沒有緊急任務。");

  $("overviewSavingAmount").textContent = money(state.settings.currentSavingSGD);
  $("overviewSavingBar").style.width = percent(progress);
  $("overviewSavingPercent").textContent = percent(progress);

  renderAdvice();
}

function renderAdvice() {
  const free = freeAfterPlan();
  const openTasks = state.records.filter((item) => {
    return (item.type === "task" || item.type === "wish") && !item.done;
  }).length;

  const expenses = monthlyExpense();

  let title = "今天先做一件小事";
  let text = "不要一次把所有東西做完。先完成一個任務，或更新一次存款就很好。";

  if (!state.settings.incomeSGD) {
    title = "先設定每月收入";
    text = "填入收入後，我可以幫你判斷目前存款計劃是否可行。";
  } else if (free !== null && free < 0) {
    title = "目前每月壓力偏高";
    text = `按照現在的目標和開銷，每月大約還差 ${money(Math.abs(free))}。可以先降低非必要開銷。`;
  } else if (openTasks > 8) {
    title = "清單有點多了";
    text = "可以刪掉不重要的任務，只留下真正需要做的。";
  } else if (expenses > 1500) {
    title = "開銷需要檢查";
    text = "本月固定開銷偏高，可以看看哪幾項是可調整的。";
  } else if (savingProgress() >= 10) {
    title = "存款有進度了";
    text = "你已經開始累積了。保持每月更新，不要中斷。";
  }

  $("adviceBox").innerHTML = `
    <strong>${title}</strong>
    <span>${text}</span>
  `;
}

function renderTasks() {
  let list = state.records.filter((item) => {
    return item.type === "task" || item.type === "wish";
  });

  if (currentTaskFilter === "task") {
    list = list.filter((item) => item.type === "task");
  }

  if (currentTaskFilter === "wish") {
    list = list.filter((item) => item.type === "wish");
  }

  if (currentTaskFilter === "open") {
    list = list.filter((item) => !item.done);
  }

  if (currentTaskFilter === "done") {
    list = list.filter((item) => item.done);
  }

  $("taskList").innerHTML = list.length
    ? list.map(itemCard).join("")
    : emptyState("這裡還沒有資料。");
}

function renderMoney() {
  const progress = savingProgress();
  const remain = savingRemain();
  const months = monthsUntil(state.settings.deadline);
  const needMonthly = monthlySavingNeed();

  $("moneyCurrent").textContent = money(state.settings.currentSavingSGD);
  $("moneyBar").style.width = percent(progress);
  $("moneyPercent").textContent = percent(progress);
  $("moneyRemain").textContent = `還差 ${money(remain)}`;

  $("moneyMonths").textContent = months;
  $("moneyNeedMonthly").textContent = money(needMonthly);
  $("moneyMonthlyExpense").textContent = money(monthlyExpense());
}

function renderExpenses() {
  const list = state.records.filter((item) => item.type === "expense");

  $("expenseList").innerHTML = list.length
    ? list.map(itemCard).join("")
    : emptyState("還沒有開銷記錄。");
}

function renderCarLoan() {
  const car = carLoanCalc();

  const years = Math.floor(car.remainMonths / 12);
  const months = car.remainMonths % 12;

  $("carPaidMonths").textContent = car.paidMonths;
  $("carRemainMonths").textContent = car.remainMonths;
  $("carRemainYears").textContent = `${years} 年 ${months} 個月`;
  $("carRemainAmount").textContent = `RM ${car.remainMYR.toLocaleString()}`;

  $("carProgressBar").style.width = percent(car.progress);
  $("carProgressText").textContent = percent(car.progress);
}

// =====================================================
// Saving Update
// =====================================================

$("updateSavingBtn").addEventListener("click", () => {
  const value = Number($("savingInput").value || 0);

  if (value < 0) {
    alert("金額不能小於 0。");
    return;
  }

  state.settings.currentSavingSGD = value;
  $("settingCurrentSaving").value = value;
  $("savingInput").value = "";

  saveState();
  render();
});

// =====================================================
// Main Render
// =====================================================

function render() {
  $("todayText").textContent = displayToday();

  bindSettings();
  renderOverview();
  renderTasks();
  renderMoney();
  renderExpenses();
  renderCarLoan();
}

renderForm();
saveState();
render();
