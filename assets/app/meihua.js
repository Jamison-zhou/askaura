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

export function guaFromTime(date = new Date()) {
  const seed = date.getFullYear()
    + date.getMonth() + 1
    + date.getDate()
    + date.getHours()
    + date.getMinutes();
  return guaList[seed % guaList.length];
}
