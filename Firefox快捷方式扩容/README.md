# Firefox 新标签页快捷方式扩容（More Shortcuts）

[English README](README_EN.md)

突破 Firefox 新标签页（about:newtab / about:home）快捷方式的官方数量限制：
**每行最多 16 个 × 最多 8 行**（官方限制是 8 个 × 4 行），并且在原生的
“定制”面板里直接控制开关与数量。



## 功能

- 每行快捷方式数量：**8 / 10 / 12 / 14 / 16** 可选
- 行数：**1 ~ 8 行**可选（官方只有 1 ~ 4）
- 控制入口就在右下角铅笔（定制）面板里，与官方开关并存：
  - 官方“行数”下拉被扩展为 1-8 行
  - 新增“每行快捷方式数量”下拉（带保存提示）
- **不丢数据**：扩容只是增加空槽位，你现有的固定网站原样保留；
  以后调小数量也只是隐藏，不会删除
- **抗更新**：Firefox 在线更新后功能自动保留（原理见下文）
- **可迁移**：重装系统/换电脑后，重新运行一次安装脚本即可

## 安装

> 要求：Windows + Firefox（已在 Firefox 157 上实测）。
> 依赖的 `topSitesMaxSitesPerRow` 首选项与 `--top-sites-max-per-row` CSS 变量
> 由近年版本的 Firefox 引入，版本过旧请先升级 Firefox。

1. 下载本项目（Code → Download ZIP，或 `git clone`），解压到任意位置
2. 关闭 Firefox（不关也行，装完重启才生效）
3. 右键 **安装.bat** → 以管理员身份运行（会弹 UAC，点“是”）
   - Firefox 没装在默认目录 `C:\Program Files\Mozilla Firefox` 时：
     把 **Firefox 安装文件夹拖到 安装.bat 上** 即可，或命令行运行
     `安装.bat "D:\你的\Firefox目录"`
4. 启动 Firefox，打开新标签页

首次安装后默认为 每行 12 个 × 6 行（如果你之前自己设置过行数，会保留你的设置）。

## 迁移到新电脑 / 重装系统

1. 装好官方 Firefox
2. 把本项目文件夹复制过去（U 盘、网盘、git clone 均可，无需联网安装）
3. 再次以管理员身份运行 **安装.bat** —— 完成

## 卸载

以管理员身份运行 **卸载.bat**。
说明：行数/每行数量是 Firefox 官方首选项，卸载后仍保留在配置中（无害），
如需还原请在 `about:config` 搜索 `topSitesRows` / `topSitesMaxSitesPerRow` 右键重置。

## 原理（为什么官方更新打不掉它）

三层结构，互相独立，单层失效不影响其他层：

1. **官方首选项驱动数量**
   快捷方式总数 = `topSitesRows` × `topSitesMaxSitesPerRow`。
   这两个 pref 是 Firefox 官方代码正式注册并同步到新标签页的
   （见 `ActivityStream.sys.mjs`），只是官方 UI 没开放完整范围。
   前端网格与后端取数都直接读它们，不存在 4 行/8 列的引擎级钳制。
2. **官方预留的 CSS 变量驱动布局**
   Firefox 的 React 前端会把每行数量写成内联 CSS 变量
   `--top-sites-max-per-row`，官方样式表也用它计算列数
   （但只在视口 ≥1390px 时启用）。本项目附带的 `userContent.css`
   让它在所有宽度生效，并按列数自动加宽页面容器。
3. **fx-autoconfig 注入面板**
   面板增强由 [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig)
   （userChromeJS 加载器，MPL-2.0）注入：扩展行数下拉选项、追加每行数量
   下拉、通过 JSWindowActor 父子进程消息写回 pref。加载器在安装目录的
   两个文件不被 Firefox 更新程序管理，正常在线更新不会删除；
   覆盖重装 Firefox 后重跑安装脚本即可恢复。

## 常见问题（FAQ）

**下载/运行 .bat 时 Windows SmartScreen 或杀毒软件报警？**
.bat 是从互联网下载的可执行脚本，Windows 默认会提示“未知发布者”，
属正常现象。脚本内容完全透明（安装.bat 只有 8 行，逻辑全在 setup.ps1），
可放心审查后再运行。

**Firefox 大版本更新后面板里的增强选项消失了？**
扩容本身（pref + CSS）仍然有效，只是面板注入失效。欢迎提 issue
注明 Firefox 版本；临时可在 `about:config` 直接改两个 pref。

**PortableApps 便携版 Firefox？**
便携版的配置文件在程序目录内且不写系统 profiles.ini，脚本会提示无法定位。
按 `使用说明.txt` 手动把 `program\`、`profile\` 内容复制到对应位置即可。

**同时装了多个 Firefox（正式版 / 开发者版 / ESR）？**
安装脚本按 profiles.ini 中最后一条 `Default=` 记录定位配置文件，
一般就是你日常用的那个；program 目录的文件只写入你指定的那一个安装目录。

## 文件结构

```
安装.bat / 卸载.bat        入口（自提权，转发自定义路径）
setup.ps1 / uninstall.ps1  实际安装/卸载逻辑
使用说明.txt               中文说明
program/                   → 复制到 Firefox 安装目录
  config.js, defaults/pref/config-prefs.js   (fx-autoconfig 入口)
profile/                   → 复制到配置文件目录（自动定位）
  chrome/userContent.css                     (布局层)
  chrome/utils/                              (fx-autoconfig 加载器)
  chrome/JS/moreShortcuts.uc.js              (首启写入默认值、注册 actor)
  chrome/JS/MoreShortcuts/                   (面板注入 actor 父/子模块)
```

## 许可与致谢

- [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) © MrOtherGuy，
  MPL-2.0，已随附许可文本（`LICENSE-fx-autoconfig.txt`）
- 本项目的自有脚本以 MPL-2.0 发布
