// 8 卦三爻基础数据（梅花易数 v1 Option A — 不组合 64 卦）。
// binary 是 3 位字符串，从下往上读爻位（"111" = 上九 上九 上九 = 乾）。

export interface Gua {
  id: string;
  name: string;     // 中文卦名
  binary: string;   // 3 位阴(0)阳(1)爻序
  image: string;    // 卦象对应自然意象
  essence: string;  // 卦德 / 性
  key: string;      // 一句关键卦辞参考
}

export const EIGHT_GUA: Gua[] = [
  { id: "qian", name: "乾", binary: "111", image: "天", essence: "刚健", key: "天行健，君子以自强不息" },
  { id: "dui",  name: "兑", binary: "011", image: "泽", essence: "悦",   key: "和悦而后能行" },
  { id: "li",   name: "离", binary: "101", image: "火", essence: "丽",   key: "明两作，离" },
  { id: "zhen", name: "震", binary: "001", image: "雷", essence: "动",   key: "震而后能起" },
  { id: "xun",  name: "巽", binary: "110", image: "风", essence: "入",   key: "随风，巽" },
  { id: "kan",  name: "坎", binary: "010", image: "水", essence: "陷",   key: "习坎，在险中守正" },
  { id: "gen",  name: "艮", binary: "100", image: "山", essence: "止",   key: "兼山，艮。知止而后定" },
  { id: "kun",  name: "坤", binary: "000", image: "地", essence: "柔顺", key: "地势坤，君子以厚德载物" },
];

export function findGuaByName(name: string): Gua | undefined {
  return EIGHT_GUA.find((g) => g.name === name);
}
