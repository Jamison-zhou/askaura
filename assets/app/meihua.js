export const guaList = [
  { name: "乾", en: "Qian", binary: "111" },
  { name: "兑", en: "Dui", binary: "110" },
  { name: "离", en: "Li", binary: "101" },
  { name: "震", en: "Zhen", binary: "100" },
  { name: "巽", en: "Xun", binary: "011" },
  { name: "坎", en: "Kan", binary: "010" },
  { name: "艮", en: "Gen", binary: "001" },
  { name: "坤", en: "Kun", binary: "000" },
];

export const GUA_CAST_METHODS = Object.freeze({
  time: "time",
  character: "character",
  number: "number",
  casualNumber: "casual_number",
});

function attachCast(gua, castMethod, seed) {
  return { ...gua, castMethod, seed: String(seed) };
}

export function normalizeGuaSeed(seed = "", method = GUA_CAST_METHODS.time) {
  const text = String(seed || "").trim();
  if (method === GUA_CAST_METHODS.character) return text.slice(0, 1);
  if (method === GUA_CAST_METHODS.number || method === GUA_CAST_METHODS.casualNumber) {
    return text.replace(/[^\d-]/g, "");
  }
  return text;
}

export function guaFromSeed(seed, castMethod = "seed") {
  const normalized = String(seed || "").trim();
  let total = 0;
  for (const char of normalized || "0") {
    total += char.codePointAt(0) || 0;
  }
  return attachCast(guaList[Math.abs(total) % guaList.length], castMethod, normalized);
}

export function guaFromTime(date = new Date()) {
  const seed = date.getFullYear()
    + date.getMonth() + 1
    + date.getDate()
    + date.getHours()
    + date.getMinutes();
  return attachCast(guaList[seed % guaList.length], GUA_CAST_METHODS.time, date.toISOString());
}

export function guaFromCharacter(character) {
  return guaFromSeed(normalizeGuaSeed(character, GUA_CAST_METHODS.character), GUA_CAST_METHODS.character);
}

export function guaFromNumber(number) {
  return guaFromSeed(normalizeGuaSeed(number, GUA_CAST_METHODS.number), GUA_CAST_METHODS.number);
}

export function guaFromCasualNumber(number) {
  return guaFromSeed(normalizeGuaSeed(number, GUA_CAST_METHODS.casualNumber), GUA_CAST_METHODS.casualNumber);
}

export function guaFromCast(method = GUA_CAST_METHODS.time, seed = "", date = new Date()) {
  if (method === GUA_CAST_METHODS.character) return guaFromCharacter(seed);
  if (method === GUA_CAST_METHODS.number) return guaFromNumber(seed);
  if (method === GUA_CAST_METHODS.casualNumber) return guaFromCasualNumber(seed);
  return guaFromTime(date);
}
