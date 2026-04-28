// =============================
// Site Hub JavaScript
// 文件：js/app.js
// =============================

const pages = [
  {
    title: "锁头安全科普",
    description: "锁具资料、记录数据、安全科普、保养工具与档案管理。",
    file: "lock.html",
    icon: "🔐",
    primary: true
  },
  {
    title: "QT V2 页面",
    description: "QTcasino V2 页面入口。适合放测试、统计或项目展示。",
    file: "QTcasino.html",
    icon: "📊",
    primary: false
  },
  {
    title: "任务页面",
    description: "用于任务管理、待办事项、记录或个人项目页面。",
    file: "myTask.html",
    icon: "✅",
    primary: false
  },
  {
    title: "虚拟商品网店",
    description: "主 shop 页面入口。适合放商品展示、订单、用户与充值页面。",
    file: "shop.html",
    icon: "🛒",
    primary: true
  },
  {
    title: "虚拟商品网店 V2",
    description: "第二版 shop 页面入口。可以作为新版、测试版或后台风格版本。",
    file: "shopV2.html",
    icon: "🧩",
    primary: true
  }
];

const pageGrid = document.getElementById("pageGrid");
const searchInput = document.getElementById("searchInput");
const pageCount = document.getElementById("pageCount");
const lastUpdated = document.getElementById("lastUpdated");
const menuBtn = document.getElementById("menuBtn");
const topLinks = document.getElementById("topLinks");

function renderCards() {
  const query = (searchInput.value || "").trim().toLowerCase();

  const filtered = pages.filter(page => {
    return (
      page.title.toLowerCase().includes(query) ||
      page.description.toLowerCase().includes(query) ||
      page.file.toLowerCase().includes(query)
    );
  });

  pageGrid.innerHTML = filtered.map(page => `
    <article class="card">
      <div>
        <div class="icon">${page.icon}</div>
        <h2>${page.title}</h2>
        <p>${page.description}</p>
        <span class="file-name">${page.file}</span>
      </div>

      <a class="open-btn ${page.primary ? "" : "secondary"}" href="${page.file}">
        打开页面 →
      </a>
    </article>
  `).join("");

  if (filtered.length === 0) {
    pageGrid.innerHTML = `
      <article class="card">
        <div>
          <div class="icon">🔎</div>
          <h2>没有找到页面</h2>
          <p>换一个关键词再搜索。</p>
        </div>
      </article>
    `;
  }
}

function setStatus() {
  pageCount.textContent = pages.length;
  lastUpdated.textContent = new Date().toLocaleDateString("zh-Hans");
}

searchInput.addEventListener("input", renderCards);

menuBtn.addEventListener("click", () => {
  topLinks.classList.toggle("show");
});

renderCards();
setStatus();
