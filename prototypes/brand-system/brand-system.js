const app = document.querySelector(".brand-lab");
const sceneButtons = [...document.querySelectorAll("[data-scene-control]")];
const deviceButtons = [...document.querySelectorAll("[data-device-control]")];
const themeButtons = [...document.querySelectorAll("[data-theme-control]")];
const scenePanels = [...document.querySelectorAll("[data-scene-panel]")];
const sceneTitle = document.querySelector("[data-scene-title]");
const sceneNote = document.querySelector("[data-scene-note]");
const status = document.querySelector("[data-status]");
const toast = document.querySelector(".toast");

const sceneDetails = {
  identity: ["主标志", "标准组合用于首页、结果页和品牌封面。图形与字标保持清晰层级。"],
  navigation: ["导航", "56px 紧凑组合用于桌面导航；移动端隐藏英文副标，保留中文识别。"],
  loading: ["加载", "边界出现、路径穿越、节点点亮。动效仅解释观察状态，不制造随机玄秘感。"],
  card: ["卡背", "标志在旅程物件中保持克制，材质属于应用层，不进入标准 SVG。"],
  scale: ["尺寸", "32px 以下使用独立标志。节点和路径在小尺寸中进行光学校正。"],
};

const themeNames = { night: "品牌色", light: "浅色", mono: "单色" };
const deviceNames = { desktop: "桌面", mobile: "移动" };

async function mountSymbols() {
  const response = await fetch("./assets/askaura-symbol.svg");
  if (!response.ok) throw new Error("Logo SVG 加载失败");
  const source = await response.text();
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = parsed.documentElement;

  document.querySelectorAll("[data-logo-symbol]").forEach((mount) => {
    const clone = document.importNode(svg, true);
    clone.removeAttribute("role");
    clone.removeAttribute("aria-labelledby");
    clone.setAttribute("aria-hidden", "true");
    clone.classList.add("brand-symbol");
    mount.replaceChildren(clone);
  });
}

function pressOnly(buttons, value, key) {
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[key] === value));
  });
}

function setScene(scene) {
  const selected = sceneDetails[scene] ? scene : "identity";
  app.dataset.scene = selected;
  scenePanels.forEach((panel) => {
    panel.hidden = panel.dataset.scenePanel !== selected;
  });
  pressOnly(sceneButtons, selected, "sceneControl");
  sceneTitle.textContent = sceneDetails[selected][0];
  sceneNote.textContent = sceneDetails[selected][1];
  localStorage.setItem("askaura.brandLab.scene", selected);

  if (selected === "loading") replayLoading();
}

function setDevice(device) {
  const selected = window.innerWidth <= 760 || device === "mobile" ? "mobile" : "desktop";
  app.dataset.device = selected;
  pressOnly(deviceButtons, selected, "deviceControl");
  localStorage.setItem("askaura.brandLab.device", selected);
  updateStatus();
}

function setTheme(theme) {
  const selected = ["night", "light", "mono"].includes(theme) ? theme : "night";
  app.dataset.theme = selected;
  pressOnly(themeButtons, selected, "themeControl");
  localStorage.setItem("askaura.brandLab.theme", selected);
  updateStatus();
}

function updateStatus() {
  status.textContent = `${themeNames[app.dataset.theme]} · ${deviceNames[app.dataset.device]}`;
}

function replayLoading() {
  const symbol = document.querySelector(".loading-symbol");
  const copy = document.querySelector(".loading-copy");
  if (!symbol || !copy) return;
  symbol.classList.remove("is-playing");
  copy.classList.remove("is-playing");
  void symbol.offsetWidth;
  symbol.classList.add("is-playing");
  copy.classList.add("is-playing");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1400);
}

sceneButtons.forEach((button) => {
  button.addEventListener("click", () => setScene(button.dataset.sceneControl));
});

deviceButtons.forEach((button) => {
  button.addEventListener("click", () => setDevice(button.dataset.deviceControl));
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeControl));
});

document.querySelector("[data-replay]").addEventListener("click", () => {
  if (app.dataset.scene !== "loading") setScene("loading");
  replayLoading();
});

document.querySelectorAll("[data-copy-color]").forEach((button) => {
  button.addEventListener("click", async () => {
    const color = button.dataset.copyColor;
    try {
      await navigator.clipboard.writeText(color);
      showToast(`已复制 ${color}`);
    } catch {
      showToast(color);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const scenes = ["identity", "navigation", "loading", "card", "scale"];
  const index = Number(event.key) - 1;
  if (scenes[index]) setScene(scenes[index]);
  if (event.key.toLowerCase() === "d") setDevice("desktop");
  if (event.key.toLowerCase() === "m") setDevice("mobile");
  if (event.key.toLowerCase() === "r") replayLoading();
});

try {
  await mountSymbols();
} catch (error) {
  showToast(error.message);
}

setScene(localStorage.getItem("askaura.brandLab.scene") || "identity");
setDevice(window.innerWidth <= 760 ? "mobile" : (localStorage.getItem("askaura.brandLab.device") || "desktop"));
setTheme(localStorage.getItem("askaura.brandLab.theme") || "night");
