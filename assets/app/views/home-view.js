const DEFAULT_LABELS = {
  "new-user": {
    eyebrow: "NEW OBSERVATION",
    title: "从一个真实问题开始",
    body: "先写下你此刻最想看清的事。系统会推荐观察方式，你始终可以自己选择。",
  },
  resume: {
    eyebrow: "UNFINISHED OBSERVATION",
    title: "上次的观察还没有结束",
    body: "问题和生成结果还在，可以从离开的地方继续。",
  },
  "echo-due": {
    eyebrow: "ECHO DUE",
    title: "该回来看看后来怎样了",
    body: "不用写长记录，只留下事实有没有变化。",
  },
  active: {
    eyebrow: "ACTIVE OBSERVATION",
    title: "你有一条正在进行的观察",
    body: "可以继续执行，也可以开启一次新的观察。",
  },
  returning: {
    eyebrow: "WELCOME BACK",
    title: "继续看清，而不是重新开始",
    body: "过去的观察已经留在旅程里，你可以从今天的问题继续。",
  },
};

export function renderHome(container, state, labels = {}) {
  if (!container) return;
  const copy = { ...DEFAULT_LABELS[state?.kind || "new-user"], ...(labels[state?.kind] || {}) };
  const recordId = escapeAttribute(state?.record?.id || "");
  const question = escapeHtml(state?.record?.question || "");
  container.innerHTML = `
    <div class="adaptive-home-copy">
      <span class="adaptive-home-eyebrow">${escapeHtml(copy.eyebrow)}</span>
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.body)}</p>
      ${question ? `<blockquote>${question}</blockquote>` : ""}
    </div>
    <div class="adaptive-home-actions">
      ${primaryAction(state?.kind, recordId)}
      ${state?.kind !== "new-user" ? '<button type="button" class="secondary" data-home-action="journey">查看我的旅程</button>' : ""}
      ${state?.kind !== "new-user" && state?.kind !== "resume" ? '<button type="button" class="secondary muted" data-home-action="start">开始新的观察</button>' : ""}
    </div>`;
  container.hidden = false;
}

function primaryAction(kind, recordId) {
  if (kind === "resume") {
    return `<button type="button" class="primary" data-home-action="resume" data-record-id="${recordId}">继续上次观察</button>`;
  }
  if (kind === "echo-due") {
    return `<button type="button" class="primary" data-home-action="echo" data-record-id="${recordId}">说说后来怎么样了</button>`;
  }
  if (kind === "active") {
    return '<button type="button" class="primary" data-home-action="journey">查看正在进行的观察</button>';
  }
  return '<button type="button" class="primary" data-home-action="start">开始一次观察</button>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
