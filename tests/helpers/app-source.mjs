import { readFileSync } from "node:fs";

export const appHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
export const appModule = readFileSync(new URL("../../assets/app/main.js", import.meta.url), "utf8");
export const appI18n = readFileSync(new URL("../../assets/app/i18n.js", import.meta.url), "utf8");
export const appDom = readFileSync(new URL("../../assets/app/dom.js", import.meta.url), "utf8");
export const appSource = `${appHtml}\n${appModule}\n${appI18n}\n${appDom}`;
