// MoreShortcuts actor — 父进程端。
// 接收内容端消息，把行数/每行数量写入官方 pref。
// PrefsFeed 监听 browser.newtabpage.activity-stream 分支，会自动把变更
// 广播给所有打开的新标签页，页面即时刷新，无需其他处理。

const PREF_BRANCH = "browser.newtabpage.activity-stream.";
const ALLOWED = {
  topSitesRows: [1, 8],
  topSitesMaxSitesPerRow: [8, 16],
};

export class MoreShortcutsParent extends JSWindowActorParent {
  receiveMessage(message) {
    switch (message.name) {
      case "mst:setPref": {
        try {
          const { name, value } = message.data || {};
          const range = ALLOWED[name];
          const v = Math.round(Number(value));
          if (!range || !Number.isFinite(v)) {
            return { ok: false, error: "参数非法" };
          }
          const clamped = Math.min(range[1], Math.max(range[0], v));
          Services.prefs.setIntPref(PREF_BRANCH + name, clamped);
          return { ok: true, value: clamped };
        } catch (ex) {
          console.error("MoreShortcuts 写 pref 失败", ex);
          return { ok: false, error: String(ex) };
        }
      }
      case "mst:getPrefs": {
        // sendQuery 的返回值由这里 return 回去
        return {
          rows: Services.prefs.getIntPref(PREF_BRANCH + "topSitesRows", 1),
          perRow: Services.prefs.getIntPref(
            PREF_BRANCH + "topSitesMaxSitesPerRow",
            8
          ),
        };
      }
    }
    return undefined;
  }
}
