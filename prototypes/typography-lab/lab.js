const schemes = {
  night: {
    tag: "推荐",
    name: "玄夜叙事",
    fonts: "霞鹜新致宋屏幕版 · IBM Plex Sans SC · IBM Plex Sans Condensed",
    checks: [
      ['"AskAura ZhiSong"', "象问看两种象"],
      ['"AskAura Plex SC"', "进入观察"],
      ['"AskAura Plex Condensed"', "AA-20260715-001"],
    ],
  },
  protocol: {
    tag: "全开源",
    name: "观测协议",
    fonts: "IBM Plex Sans SC · IBM Plex Sans Condensed",
    checks: [
      ['"AskAura Plex SC"', "象问看两种象"],
      ['"AskAura Plex Condensed"', "AA-20260715-001"],
    ],
  },
  legacy: {
    tag: "基准线",
    name: "当前方案对照",
    fonts: "系统宋体 · 系统黑体",
    checks: [],
  },
};

const wordmarks = {
  eclipse: {
    index: "BRAND MARK / 01",
    name: "裂月之门",
    src: "./wordmarks/xiangwen-eclipse-gate.svg",
    detail: "月蚀、门碑与重画字骨组成主标；更接近叙事游戏启动标题，也能拆成图标、卡背与加载符号。",
  },
  protocol: {
    index: "BRAND MARK / 02",
    name: "双象协议",
    src: "./wordmarks/xiangwen-dual-protocol.svg",
    detail: "双重观测框、信号核心与空心字骨形成阵营标识；最硬朗，适合强调科幻设备与观测站系统。",
  },
  seal: {
    index: "BRAND MARK / 03",
    name: "夜航刻印",
    src: "./wordmarks/xiangwen-night-seal.svg",
    detail: "月面坐标、航线与断续字骨构成独立游戏标题；叙事气质最强，适合章节页、档案与结果报告。",
  },
};

const preview = document.querySelector("#preview");
const stage = document.querySelector("#stage");
const schemeName = document.querySelector("#schemeName");
const schemeTag = document.querySelector("#schemeTag");
const schemeFonts = document.querySelector("#schemeFonts");
const fontStatus = document.querySelector("#fontStatus");
const brandWordmark = document.querySelector("#brandWordmark");
const wordmarkSpecimen = document.querySelector("#wordmarkSpecimen");
const wordmarkName = document.querySelector("#wordmarkName");
const wordmarkIndex = document.querySelector("#wordmarkIndex");
const wordmarkTitle = document.querySelector("#wordmarkTitle");
const wordmarkDetail = document.querySelector("#wordmarkDetail");
const schemeButtons = [...document.querySelectorAll("[data-scheme]")];
const viewButtons = [...document.querySelectorAll("[data-view]")];
const wordmarkButtons = [...document.querySelectorAll("[data-wordmark]")];

function pressOnly(buttons, value, key) {
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[key] === value));
  });
}

async function updateFontStatus(scheme) {
  const checks = schemes[scheme].checks;
  fontStatus.classList.remove("is-ready");

  if (!checks.length) {
    fontStatus.textContent = "系统字体对照";
    return;
  }

  fontStatus.textContent = "正在检查字体";
  await Promise.all(checks.map(([family, sample]) => document.fonts.load(`16px ${family}`, sample)));
  const ready = checks.every(([family, sample]) => document.fonts.check(`16px ${family}`, sample));
  fontStatus.textContent = ready ? `字体已加载 ${checks.length}/${checks.length}` : "字体加载失败";
  fontStatus.classList.toggle("is-ready", ready);
}

function setScheme(scheme) {
  const selected = schemes[scheme] ? scheme : "night";
  const detail = schemes[selected];
  preview.dataset.scheme = selected;
  schemeTag.textContent = detail.tag;
  schemeName.textContent = detail.name;
  schemeFonts.textContent = detail.fonts;
  pressOnly(schemeButtons, selected, "scheme");
  localStorage.setItem("askaura.typeLab.scheme", selected);
  updateFontStatus(selected);
}

function setView(view) {
  const selected = view === "mobile" ? "mobile" : "desktop";
  stage.dataset.view = selected;
  pressOnly(viewButtons, selected, "view");
  localStorage.setItem("askaura.typeLab.view", selected);
}

function setWordmark(wordmark) {
  const selected = wordmarks[wordmark] ? wordmark : "seal";
  const detail = wordmarks[selected];
  brandWordmark.src = detail.src;
  brandWordmark.alt = `象问 AskAura，${detail.name}字标`;
  wordmarkSpecimen.src = detail.src;
  wordmarkSpecimen.alt = `象问 AskAura，${detail.name}字标放大样张`;
  wordmarkName.textContent = `字标：${detail.name}`;
  wordmarkIndex.textContent = detail.index;
  wordmarkTitle.textContent = detail.name;
  wordmarkDetail.textContent = detail.detail;
  pressOnly(wordmarkButtons, selected, "wordmark");
  localStorage.setItem("askaura.typeLab.wordmark", selected);
}

schemeButtons.forEach((button) => {
  button.addEventListener("click", () => setScheme(button.dataset.scheme));
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

wordmarkButtons.forEach((button) => {
  button.addEventListener("click", () => setWordmark(button.dataset.wordmark));
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "1") setScheme("night");
  if (event.key === "2") setScheme("protocol");
  if (event.key === "3") setScheme("legacy");
  if (event.key === "4") setWordmark("eclipse");
  if (event.key === "5") setWordmark("protocol");
  if (event.key === "6") setWordmark("seal");
  if (event.key.toLowerCase() === "d") setView("desktop");
  if (event.key.toLowerCase() === "m") setView("mobile");
});

const initialScheme = localStorage.getItem("askaura.typeLab.scheme") || "night";
const storedView = localStorage.getItem("askaura.typeLab.view");
const initialWordmark = localStorage.getItem("askaura.typeLab.wordmark") || "seal";
const initialView = storedView || (window.innerWidth < 700 ? "mobile" : "desktop");

setScheme(initialScheme);
setView(initialView);
setWordmark(initialWordmark);
