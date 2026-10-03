// MoreShortcuts actor — 内容端（运行在 about:newtab / about:home 页面进程）。
// 职责：
//   1. 把官方定制面板里的“行数”下拉从 1-4 扩展到 1-8
//      （选项变更走页面自带的 React onChange 保存逻辑，无需额外通道）。
//   2. 在面板中追加“每行数量”下拉（原生 <select>，8/10/12/14/16），
//      变更时通过 actor 父进程写 pref topSitesMaxSitesPerRow。
//   3. 把当前每行数量写到 <html> 的 --mst-cols CSS 变量，供 userContent.css 加宽布局。
// 所有 DOM 修改都是幂等的；React 重渲染抹掉改动后由 MutationObserver 重新注入。

const ROW_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const COL_OPTIONS = [8, 10, 12, 14, 16];

export class MoreShortcutsChild extends JSWindowActorChild {
  handleEvent(event) {
    if (event.type === "DOMContentLoaded") {
      // 页面是 React 应用，等它首屏渲染后再开始注入
      this.contentWindow?.setTimeout(() => this.init(), 500);
    }
  }

  init() {
    const doc = this.document;
    if (!doc || this._observer) {
      return;
    }
    this._prefs = { rows: 1, perRow: 8 };
    this._lastPrefetch = 0;
    this._suppressRowEventsUntil = 0;
    this.refreshPrefs();

    // 行数下拉的 change 守卫：
    // 1) 重建选项期间 moz-select 会瞬发一个携带临时值的 change 事件，
    //    直接掐断，防止 React 把它当成用户选择写回 pref；
    // 2) 正常用户选择时记住行数，供重建后恢复选中值。
    for (const type of ["change", "input"]) {
      doc.addEventListener(
        type,
        e => {
          if (e.target?.id !== "row-selector") {
            return;
          }
          if (Date.now() < this._suppressRowEventsUntil) {
            e.stopImmediatePropagation();
            return;
          }
          const v = parseInt(e.target.value, 10);
          if (v >= 1 && v <= 8) {
            this._prefs.rows = v;
          }
        },
        true
      );
    }

    const win = doc.defaultView;
    this._observer = new win.MutationObserver(() => this.enhance());
    this._observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
    });
    this.enhance();
  }

  // 节流向父进程取最新 pref
  refreshPrefsThrottled() {
    const now = Date.now();
    if (now - this._lastPrefetch > 2000) {
      this._lastPrefetch = now;
      this.refreshPrefs();
    }
  }

  async refreshPrefs() {
    try {
      const prefs = await this.sendQuery("mst:getPrefs");
      if (prefs && Number.isFinite(prefs.perRow)) {
        this._prefs = prefs;
        this.applyRootVar(prefs.perRow);
        this.syncControls();
      }
    } catch (ex) {
      // actor 未就绪等临时失败静默忽略
    }
  }

  // 页面上 React 会把 pref 写成 .top-sites-list 的内联 CSS 变量，
  // 这是最可靠的本地数据源（不依赖 IPC）
  readPerRowFromDom() {
    const v = this.document
      ?.querySelector(".top-sites-list")
      ?.style?.getPropertyValue("--top-sites-max-per-row");
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }

  applyRootVar(perRow) {
    const root = this.document?.documentElement;
    if (root && root.style.getPropertyValue("--mst-cols") !== String(perRow)) {
      root.style.setProperty("--mst-cols", String(perRow));
    }
  }

  debug(msg) {
    const el = this.document?.getElementById("mst-debug");
    if (el) {
      el.textContent = msg;
    }
  }

  makeRowOption(doc, num) {
    const opt = doc.createElement("moz-option");
    opt.setAttribute("value", String(num));
    opt.setAttribute("label", String(num));
    // 与官方 classic 面板一致的本地化路径（nova 布局读 label 属性）
    opt.setAttribute("data-l10n-id", "newtab-custom-row-selector2");
    opt.setAttribute("data-l10n-args", JSON.stringify({ num }));
    return opt;
  }

  async onColChange(sel) {
    const v = parseInt(sel.value, 10);
    this.debug(`change -> ${v}`);
    if (!Number.isFinite(v) || v === this._prefs.perRow) {
      return;
    }
    this._prefs.perRow = v;
    this.applyRootVar(v);
    try {
      const ack = await this.sendQuery("mst:setPref", {
        name: "topSitesMaxSitesPerRow",
        value: v,
      });
      this.debug(ack?.ok ? `已保存：每行 ${v} 个` : `保存失败：${ack?.error ?? "无应答"}`);
    } catch (ex) {
      this.debug(`保存异常：${ex}`);
    }
  }

  // 同步行数下拉的显示值。moz-select 在 options/label 变化时会用
  // 内部原生 select 的旧值覆盖宿主 value，因此宿主和内部 select 都要写，
  // 并且由 enhance/定时器反复调用直到生效。
  syncRowValue(rowSel) {
    const want = String(this._prefs.rows);
    if (!want || rowSel.value === want) {
      return;
    }
    rowSel.value = want;
    const inner = rowSel.shadowRoot?.querySelector("select");
    if (inner && inner.value !== want) {
      inner.value = want;
    }
  }

  enhance() {
    const doc = this.document;
    if (!doc || !doc.documentElement) {
      return;
    }

    // --- 1. 扩展官方“行数”下拉 ---
    const rowSel = doc.getElementById("row-selector");
    if (rowSel) {
      // 面板可见时同步最新 pref（DOM 内联变量优先，IPC 兜底）
      const domPerRow = this.readPerRowFromDom();
      if (domPerRow && domPerRow !== this._prefs.perRow) {
        this._prefs.perRow = domPerRow;
        this.applyRootVar(domPerRow);
      }
      this.refreshPrefsThrottled();

      const opts = rowSel.querySelectorAll("moz-option");
      const values = Array.from(opts, o => o.getAttribute("value"));
      if (String(values) !== String(ROW_OPTIONS)) {
        // 先补后删，避免选项被清空触发 moz-select 瞬态事件
        this._suppressRowEventsUntil = Date.now() + 800;
        for (const n of ROW_OPTIONS) {
          if (!values.includes(String(n))) {
            rowSel.appendChild(this.makeRowOption(doc, n));
          }
        }
        for (const o of rowSel.querySelectorAll("moz-option")) {
          if (!ROW_OPTIONS.includes(Number(o.getAttribute("value")))) {
            o.remove();
          }
        }
        // 恢复选中值（官方 pref 可能是 5-8，React 原生选项里没有）。
        // Fluent 异步翻译会触发 populateOptions 把 value 重置回去，需多次补写。
        const win = doc.defaultView;
        this.syncRowValue(rowSel);
        for (const delay of [100, 400, 1000, 2000]) {
          win.setTimeout(() => this.syncRowValue(rowSel), delay);
        }
      } else {
        this.syncRowValue(rowSel);
      }

      // --- 2. 追加“每行数量”下拉（原生 select，避免 moz-select 的值同步坑） ---
      if (!doc.getElementById("mst-col-selector")) {
        const anchor = rowSel.closest(".more-information") || rowSel.parentElement;
        if (anchor && anchor.parentElement) {
          const wrap = doc.createElement("div");
          wrap.className = "more-information mst-cols-wrapper";
          wrap.style.cssText = "margin-top:8px";

          const label = doc.createElement("label");
          label.id = "mst-cols-title";
          label.textContent = "每行快捷方式数量";
          label.htmlFor = "mst-col-selector";
          label.style.cssText =
            "display:block;font-size:0.97em;margin-bottom:4px";

          const sel = doc.createElement("select");
          sel.id = "mst-col-selector";
          sel.style.cssText =
            "width:100%;padding:6px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 30%, transparent);background:var(--newtab-background-color-secondary, #f0f0f4);color:inherit;font-size:1em";
          for (const n of COL_OPTIONS) {
            const o = doc.createElement("option");
            o.value = String(n);
            o.textContent = String(n);
            sel.appendChild(o);
          }
          sel.addEventListener("change", () => this.onColChange(sel));

          const dbg = doc.createElement("div");
          dbg.id = "mst-debug";
          dbg.style.cssText = "font-size:11px;opacity:0.6;margin-top:4px";

          wrap.appendChild(label);
          wrap.appendChild(sel);
          wrap.appendChild(dbg);
          anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
          this.syncControls();
        }
      } else {
        this.syncControls();
      }
    }
  }

  syncControls() {
    const doc = this.document;
    if (!doc) {
      return;
    }
    const colSel = doc.getElementById("mst-col-selector");
    if (
      colSel &&
      doc.activeElement !== colSel &&
      String(this._prefs.perRow) !== colSel.value
    ) {
      colSel.value = String(this._prefs.perRow);
    }
  }
}
