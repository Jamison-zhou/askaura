const ECHO_CHOICES = [
  ["changed", "有一点变化", "Something changed"],
  ["unchanged", "没什么变化", "Nothing changed"],
  ["not_done", "我没有去做", "I did not do it"],
  ["passed", "这件事已经过去了", "This has passed"],
];

export function renderJourneyView(root, records = [], { language = "zh", echoRecordId = "" } = {}) {
  root.replaceChildren();
  root.className = "journey-workspace";
  const labels = language === "zh" ? zhLabels : enLabels;
  const active = records.filter((record) => ["active", "paused"].includes(record.lifecycleState));
  const echoed = records.filter((record) => record.echoStatus);
  const saved = records.filter((record) => ["saved", "active", "paused", "closed"].includes(record.lifecycleState));
  const legacy = records.filter((record) => record.lifecycleState === "legacy");

  root.append(
    heading(labels.title, labels.intro),
    journeyMap(active.concat(records.filter((record) => record.lifecycleState === "closed")).slice(0, 12)),
    recordSection(labels.active, "active", active, labels),
    echoSection(labels.echo, echoed, echoRecordId, labels),
    themeSection(labels.themes, saved, labels),
    recordSection(labels.saved, "saved", saved, labels),
    recordSection(labels.legacy, "legacy", legacy, labels),
  );
}

function heading(title, intro) {
  const header = document.createElement("header");
  header.className = "journey-heading";
  const h2 = document.createElement("h2");
  h2.textContent = title;
  const p = document.createElement("p");
  p.textContent = intro;
  header.append(h2, p);
  return header;
}

function journeyMap(records) {
  const wrap = document.createElement("section");
  wrap.className = "journey-map";
  wrap.dataset.journeySection = "map";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 720 180");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "观察路径");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", "M28 132 C160 40 260 154 372 82 S580 34 692 86");
  path.setAttribute("class", "journey-route");
  svg.append(path);
  records.forEach((record, index) => {
    const circle = document.createElementNS(svg.namespaceURI, "circle");
    const x = 56 + index * (620 / Math.max(records.length - 1, 1));
    const y = 90 + Math.sin(index * 1.7) * 38;
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", record.lifecycleState === "active" ? "8" : "6");
    circle.setAttribute("class", `journey-node is-${record.lifecycleState}`);
    svg.append(circle);
  });
  wrap.append(svg);
  return wrap;
}

function recordSection(title, sectionName, records, labels) {
  const section = document.createElement("section");
  section.className = "journey-list";
  section.dataset.journeySection = sectionName;
  const h3 = document.createElement("h3");
  h3.textContent = title;
  section.append(h3);
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "journey-empty";
    empty.textContent = labels.empty;
    section.append(empty);
    return section;
  }
  records.forEach((record) => section.append(recordRow(record, labels)));
  return section;
}

function recordRow(record, labels) {
  const article = document.createElement("article");
  article.className = "journey-record";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = record.actionTheme || record.title || labels.untitled;
  const detail = document.createElement("p");
  detail.textContent = record.action || record.selectedInsight || labels.savedObservation;
  copy.append(title, detail);
  const actions = document.createElement("div");
  actions.className = "journey-record-actions";
  if (["active", "paused"].includes(record.lifecycleState)) {
    actions.append(actionButton("echo", record.id, labels.echoAction));
    actions.append(actionButton(record.lifecycleState === "paused" ? "resume" : "pause", record.id, record.lifecycleState === "paused" ? labels.resume : labels.pause));
    actions.append(actionButton("close", record.id, labels.close));
  }
  actions.append(actionButton("edit", record.id, labels.open));
  article.append(copy, actions);
  return article;
}

function actionButton(action, id, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.journeyAction = action;
  button.dataset.recordId = id;
  button.textContent = text;
  return button;
}

function echoSection(title, records, echoRecordId, labels) {
  const section = recordSection(title, "echoes", records.slice(0, 6), labels);
  const prompt = document.createElement("div");
  prompt.className = "journey-echo-prompt";
  prompt.hidden = !echoRecordId;
  prompt.dataset.echoRecordId = echoRecordId;
  const strong = document.createElement("strong");
  strong.textContent = labels.echoQuestion;
  prompt.append(strong);
  ECHO_CHOICES.forEach(([status, zh, en]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.echoStatus = status;
    button.textContent = labels.language === "zh" ? zh : en;
    prompt.append(button);
  });
  section.append(prompt);
  return section;
}

function themeSection(title, records, labels) {
  const section = document.createElement("section");
  section.className = "journey-themes";
  section.dataset.journeySection = "themes";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  section.append(h3);
  const counts = new Map();
  records.forEach((record) => {
    const theme = (record.actionTheme || "").trim();
    if (theme) counts.set(theme, (counts.get(theme) || 0) + 1);
  });
  if (!counts.size) {
    const empty = document.createElement("p");
    empty.textContent = labels.themeEmpty;
    section.append(empty);
  } else {
    [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([theme, count]) => {
      const chip = document.createElement("span");
      chip.textContent = `${theme} · ${count}`;
      section.append(chip);
    });
  }
  return section;
}

const zhLabels = { language: "zh", title: "我的旅程", intro: "这里管理已经确认的行动，也收下后来发生的变化。", active: "正在走的路", echo: "最近的回声", themes: "已确认主题", saved: "全部保存", legacy: "旧记录归档", empty: "这里还没有内容。", themeEmpty: "确认行动主题后，重复线索会出现在这里。", untitled: "一次观察", savedObservation: "已保存的观察", echoAction: "后来怎么样了", echoQuestion: "后来怎么样了？", pause: "暂停", resume: "继续", close: "结束", open: "查看" };
const enLabels = { language: "en", title: "My Journey", intro: "Manage confirmed actions and capture what happened later.", active: "Active paths", echo: "Recent echoes", themes: "Confirmed themes", saved: "All saved", legacy: "Legacy archive", empty: "Nothing here yet.", themeEmpty: "Themes appear after you confirm actions.", untitled: "Observation", savedObservation: "Saved observation", echoAction: "What happened?", echoQuestion: "What happened later?", pause: "Pause", resume: "Resume", close: "Close", open: "Open" };
