// ==UserScript==
// @name            MoreShortcuts
// @description     新标签页快捷方式扩容：注册 MoreShortcuts WindowActor（面板增强注入），并在首次运行时写入默认行数/每行数量
// @WindowActor     MoreShortcuts
// @WindowActorMatches ["about:newtab","about:home"]
// ==/UserScript==

// 首次运行默认值：只在用户从未设置过这两个 pref 时写入，之后完全由面板控制。
// 注意：不要写进 user.js，否则每次启动都会覆盖用户在面板里的修改。
{
  const BRANCH = "browser.newtabpage.activity-stream.";
  const DEFAULTS = { topSitesRows: 6, topSitesMaxSitesPerRow: 12 };
  for (const [name, value] of Object.entries(DEFAULTS)) {
    try {
      if (!Services.prefs.prefHasUserValue(BRANCH + name)) {
        Services.prefs.setIntPref(BRANCH + name, value);
      }
    } catch (ex) {
      console.error("MoreShortcuts: 写入默认 pref 失败", ex);
    }
  }
}
