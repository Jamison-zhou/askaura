export function renderSettingsView(root, { signedIn = false, analyticsDisabled = false, theme = "night", language = "zh" } = {}) {
  root.replaceChildren();
  root.className = "settings-view";
  root.innerHTML = `
    <header><h2>设置与数据</h2><p>默认保存在本机；生成时会发送给 AI 服务处理。</p></header>
    <section data-settings-section="storage">
      <h3>保存位置</h3>
      <p><strong>本机：</strong>当前设备的浏览器存储。</p>
      <p><strong>云端：</strong>${signedIn ? "已登录，可同步与删除" : "未登录，不会同步"}</p>
    </section>
    <section data-settings-section="appearance">
      <h3>外观</h3>
      <div class="settings-options" role="group" aria-label="主题">
        <button type="button" data-settings-theme="night" aria-pressed="${theme === "night"}">深夜</button>
        <button type="button" data-settings-theme="light" aria-pressed="${theme === "light"}">浅色</button>
        <button type="button" data-settings-theme="mono" aria-pressed="${theme === "mono"}">单色</button>
      </div>
      <div class="settings-options" role="group" aria-label="语言">
        <button type="button" data-settings-language="zh" aria-pressed="${language === "zh"}">中文</button>
        <button type="button" data-settings-language="en" aria-pressed="${language === "en"}">English · 实验性语言</button>
      </div>
    </section>
    <section data-settings-section="privacy">
      <h3>隐私与分析</h3>
      <p>问题和结果会发送给 AI 服务完成生成；产品统计只记录模式、状态和耗时区间，不包含问题、答案、行动或回声内容。</p>
      <label><input type="checkbox" data-settings-analytics ${analyticsDisabled ? "" : "checked"} /> 允许匿名产品统计</label>
    </section>
    <section data-settings-section="data">
      <h3>数据控制</h3>
      <div class="settings-actions">
        <button type="button" data-settings-action="export">导出我的数据</button>
        <button type="button" data-settings-action="purge-local">清空本机数据</button>
        <button type="button" data-settings-action="purge-cloud" ${signedIn ? "" : "disabled"}>清空云端数据</button>
        <button type="button" data-settings-action="delete-account" ${signedIn ? "" : "disabled"}>删除账号</button>
      </div>
      <p data-settings-status aria-live="polite"></p>
    </section>`;
}
