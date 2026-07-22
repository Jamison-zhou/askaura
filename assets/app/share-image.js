const normalizeText = (value, fallback = "") => String(value ?? fallback).replace(/\s+/g, " ").trim();

export function svgTextWidth(text) {
  return Array.from(normalizeText(text)).reduce((width, char) => {
    if (/\s/.test(char)) return width + 0.35;
    if (/[\u4e00-\u9fff\u3040-\u30ff\uff00-\uffef]/.test(char)) return width + 1;
    if (/[A-Z0-9]/.test(char)) return width + 0.68;
    return width + 0.56;
  }, 0);
}

export function fitSvgText(text, maxUnits, forceEllipsis = false) {
  const chars = Array.from(normalizeText(text));
  let output = "";
  for (const char of chars) {
    if (svgTextWidth(output + char + (forceEllipsis ? "…" : "")) > maxUnits) break;
    output += char;
  }
  return output.trimEnd() + (forceEllipsis || output.length < chars.length ? "…" : "");
}

export function wrapSvgText(text, maxUnits = 22, maxLines = 3) {
  const source = normalizeText(text);
  if (!source) return [];
  const lines = [];
  let current = "";
  let truncated = false;
  for (const char of Array.from(source)) {
    if (current && svgTextWidth(current + char) > maxUnits) {
      lines.push(current.trimEnd());
      current = char.trimStart();
      if (lines.length === maxLines) {
        truncated = true;
        break;
      }
    } else {
      current += char;
    }
  }
  if (lines.length < maxLines && current) lines.push(current.trimEnd());
  if (lines.length > maxLines) lines.length = maxLines;
  if (svgTextWidth(lines.at(-1) || "") > maxUnits) lines[lines.length - 1] = fitSvgText(lines.at(-1), maxUnits);
  if (truncated || lines.join("").length < source.length) lines[lines.length - 1] = fitSvgText(lines.at(-1), maxUnits, true);
  return lines;
}

export function escapeSvg(value) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textLines(lines, { x, y, step, className }) {
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * step}" class="${className}">${escapeSvg(line)}</text>`
  ).join("");
}

function observationCode(value) {
  const compact = normalizeText(value).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compact ? compact.slice(-8).padStart(8, "0") : "00000001";
}

function observationDate(value, language) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date).replaceAll("/", ".");
}

export function buildObservationShareSvg(data = {}, { language = "zh" } = {}) {
  const isZh = language === "zh";
  const symbol = fitSvgText(data.symbol || (isZh ? "未命名观察" : "Untitled observation"), 9);
  const summary = wrapSvgText(data.summary, 17, 7);
  const action = wrapSvgText(data.doText || data.action, 27, 4);
  const question = data.question ? wrapSvgText(data.question, 20, 3) : [];
  const code = observationCode(data.observationId);
  const date = observationDate(data.createdAt, language);
  const imageHref = normalizeText(data.imageDataUrl);
  const image = imageHref
    ? `<image href="${escapeSvg(imageHref)}" x="78" y="196" width="448" height="704" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="78" y="196" width="448" height="704" fill="url(#emptyImage)"/>
       <path d="M244 490h116M302 432v116" stroke="#E9E3D7" stroke-opacity=".12"/>`;
  const summaryBody = textLines(summary.length ? summary : [isZh ? "这次观察暂时没有形成清晰结论。" : "This observation is still taking shape."], {
    x: 586,
    y: 386,
    step: 46,
    className: "summary"
  });
  const questionBlock = question.length
    ? `<line x1="586" y1="704" x2="995" y2="704" class="hairline"/>
       <text x="586" y="748" class="micro">${isZh ? "本次问题 / QUESTION" : "QUESTION"}</text>
       ${textLines(question, { x: 586, y: 792, step: 35, className: "question" })}`
    : "";
  const actionBody = textLines(action.length ? action : [isZh ? "先停一下，再决定下一步。" : "Pause before choosing the next step."], {
    x: 114,
    y: 1090,
    step: 42,
    className: "action"
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
    <defs>
      <style>
        .serif{font-family:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",serif}
        .sans{font-family:"Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif}
        .brand{font:600 34px "Noto Serif SC","Source Han Serif SC","Songti SC",serif;fill:#E9E3D7;letter-spacing:.16em}
        .micro{font:500 15px "Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif;fill:#9A8669;letter-spacing:.19em}
        .meta{font:400 16px "Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif;fill:#777E82;letter-spacing:.12em}
        .symbol{font:500 46px "Noto Serif SC","Source Han Serif SC","Songti SC",serif;fill:#F1ECE2;letter-spacing:.02em}
        .summary{font:400 30px "Noto Serif SC","Source Han Serif SC","Songti SC",serif;fill:#D8D7D2;letter-spacing:.02em}
        .question{font:400 22px "Noto Serif SC","Source Han Serif SC","Songti SC",serif;fill:#969A9B}
        .action{font:500 30px "Noto Serif SC","Source Han Serif SC","Songti SC",serif;fill:#F1ECE2}
        .hairline{stroke:#E9E3D7;stroke-opacity:.12;stroke-width:1}
      </style>
      <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#071019"/>
        <stop offset=".48" stop-color="#0B151F"/>
        <stop offset="1" stop-color="#050A0F"/>
      </linearGradient>
      <linearGradient id="actionSurface" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#111B25"/>
        <stop offset="1" stop-color="#0B1219"/>
      </linearGradient>
      <linearGradient id="emptyImage" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#17232D"/><stop offset="1" stop-color="#0A1118"/>
      </linearGradient>
      <radialGradient id="atmosphere" cx="18%" cy="24%" r="72%">
        <stop stop-color="#718494" stop-opacity=".13"/><stop offset="1" stop-color="#071019" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grain" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M48 0H0V48" fill="none" stroke="#E9E3D7" stroke-opacity=".018"/>
        <circle cx="9" cy="15" r=".7" fill="#E9E3D7" fill-opacity=".035"/>
        <circle cx="35" cy="31" r=".55" fill="#E9E3D7" fill-opacity=".025"/>
      </pattern>
      <clipPath id="imageClip"><rect x="78" y="196" width="448" height="704"/></clipPath>
      <linearGradient id="imageShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset=".55" stop-color="#020609" stop-opacity="0"/><stop offset="1" stop-color="#020609" stop-opacity=".48"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1440" fill="url(#surface)"/>
    <rect width="1080" height="1440" fill="url(#atmosphere)"/>
    <rect width="1080" height="1440" fill="url(#grain)"/>
    <rect x="34" y="34" width="1012" height="1372" fill="none" stroke="#E9E3D7" stroke-opacity=".14"/>
    <rect x="54" y="54" width="972" height="1332" fill="none" stroke="#9A8669" stroke-opacity=".20"/>

    <path d="M54 108V54h54M972 54h54v54M54 1332v54h54M972 1386h54v-54" fill="none" stroke="#C8B58F" stroke-opacity=".52"/>
    <rect x="49" y="82" width="10" height="10" fill="#C85A50"/>
    <rect x="1021" y="1348" width="10" height="10" fill="#C85A50"/>

    <text x="78" y="120" class="brand">象问</text>
    <text x="206" y="118" class="micro">ASKAURA / OBSERVATION RECORD</text>
    <text x="1002" y="96" text-anchor="end" class="micro">NO. ${code}</text>
    <text x="1002" y="124" text-anchor="end" class="meta">${escapeSvg(date)}</text>
    <line x1="78" y1="154" x2="1002" y2="154" class="hairline"/>

    <g clip-path="url(#imageClip)">${image}<rect x="78" y="196" width="448" height="704" fill="url(#imageShade)"/></g>
    <rect x="78" y="196" width="448" height="704" fill="none" stroke="#D9D0BF" stroke-opacity=".26"/>
    <rect x="92" y="210" width="420" height="676" fill="none" stroke="#D9D0BF" stroke-opacity=".11"/>
    <path d="M78 238v-42h42M484 196h42v42M78 858v42h42M484 900h42v-42" fill="none" stroke="#C8B58F" stroke-opacity=".58"/>
    <text x="102" y="244" class="micro" fill="#E9E3D7">OBSERVATION IMAGE / 01</text>
    <rect x="294" y="873" width="16" height="16" fill="#C85A50"/>
    <line x1="302" y1="844" x2="302" y2="873" stroke="#C85A50" stroke-opacity=".76"/>

    <text x="586" y="214" class="micro">${isZh ? "象征线索 / SYMBOL" : "SYMBOL"}</text>
    <text x="586" y="282" class="symbol">${escapeSvg(symbol)}</text>
    <line x1="586" y1="318" x2="995" y2="318" class="hairline"/>
    <text x="586" y="352" class="micro">${isZh ? "当前主线 / THREAD" : "CURRENT THREAD"}</text>
    ${summaryBody}
    ${questionBlock}

    <rect x="78" y="968" width="924" height="286" fill="url(#actionSurface)" stroke="#E9E3D7" stroke-opacity=".13"/>
    <line x1="78" y1="968" x2="1002" y2="968" stroke="#9A8669" stroke-opacity=".72"/>
    <rect x="104" y="996" width="13" height="13" fill="#C85A50"/>
    <text x="138" y="1008" class="micro">${isZh ? "今天可以做 / NEXT ACTION" : "NEXT ACTION"}</text>
    ${actionBody}
    <text x="968" y="1224" text-anchor="end" class="meta">01 / ACT</text>

    <line x1="78" y1="1306" x2="1002" y2="1306" class="hairline"/>
    <text x="78" y="1350" class="meta">ASKAURA / SELF-REFLECTION</text>
    <text x="1002" y="1350" text-anchor="end" class="meta">${isZh ? "不是预言，只是一次看清" : "A reflection, not a prediction"}</text>
  </svg>`;
}

export async function imageSourceToDataUrl(source) {
  const src = normalizeText(source);
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Image load failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Image conversion failed"));
    reader.readAsDataURL(blob);
  });
}

export function svgToPngBlob(svg, width = 1080, height = 1440) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          blob ? resolve(blob) : reject(new Error("PNG export failed"));
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Share image render failed"));
    };
    image.src = url;
  });
}
