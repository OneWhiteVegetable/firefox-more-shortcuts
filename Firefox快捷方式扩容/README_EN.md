# More Shortcuts for Firefox New Tab

[中文说明](README.md)

Breaks Firefox's built-in limit on new-tab (about:newtab / about:home) shortcuts:
**up to 16 per row × up to 8 rows** (stock limit: 8 per row × 4 rows), controlled
directly from the native customize (pencil) panel.



## Features

- Shortcuts per row: **8 / 10 / 12 / 14 / 16**
- Rows: **1–8** (stock UI offers only 1–4)
- Controls live inside the stock customize panel:
  - the official "rows" dropdown is extended to 1–8
  - a new "shortcuts per row" dropdown is added (with save feedback)
- **No data loss**: expanding only adds empty slots; your pinned sites stay put.
  Shrinking later hides tiles instead of deleting them.
- **Update-resilient**: survives normal Firefox updates (see "How it works")
- **Portable**: after a Windows reinstall, just run the installer again

## Install

> Requires Windows + Firefox (tested on Firefox 157).
> The mechanism relies on the `topSitesMaxSitesPerRow` preference and the
> `--top-sites-max-per-row` CSS variable, both introduced in recent Firefox
> versions — please update Firefox first if yours is old.

1. Download this project (Code → Download ZIP, or `git clone`) and unzip anywhere
2. Close Firefox (optional — a restart is required either way)
3. Right-click **安装.bat** (install.bat) → *Run as administrator* (approve UAC)
   - If Firefox is not in the default `C:\Program Files\Mozilla Firefox`:
     **drag the Firefox installation folder onto 安装.bat**, or run
     `安装.bat "D:\path\to\Firefox"` from a terminal
4. Start Firefox and open a new tab

Default after install: 12 per row × 6 rows (your own previous row setting, if
any, is respected and kept).

## Migrate / reinstall Windows

1. Install stock Firefox
2. Copy this folder over (USB drive, cloud drive, `git clone` — no internet needed)
3. Run **安装.bat** as administrator again — done

## Uninstall

Run **卸载.bat** (uninstall.bat) as administrator.
Note: the row/column counts are official Firefox preferences and remain in your
profile afterwards (harmless). To revert, reset `topSitesRows` /
`topSitesMaxSitesPerRow` in `about:config`.

## How it works (why Firefox updates don't break it)

Three independent layers — if one fails, the others keep working:

1. **Official preferences drive the counts.**
   Total shortcuts = `topSitesRows` × `topSitesMaxSitesPerRow`. Both are
   officially registered and synced to the new-tab page (see
   `ActivityStream.sys.mjs`); Mozilla simply never exposes the full range in
   the UI. Both the frontend grid and the backend fetch logic read them
   directly — there is no engine-level clamp at 4 rows / 8 columns.
2. **An official CSS variable drives the layout.**
   Firefox's React frontend writes the per-row count as an inline CSS variable
   `--top-sites-max-per-row`, and the stock stylesheet consumes it (but only
   above a 1390px viewport). The bundled `userContent.css` enables it at all
   widths and widens the page container to match the column count.
3. **fx-autoconfig injects the panel.**
   The panel enhancement is injected via
   [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) (a userChromeJS
   loader, MPL-2.0): it extends the rows dropdown, appends a per-row dropdown,
   and writes prefs back through a JSWindowActor parent/child message pair.
   The two loader files in the installation directory are not managed by
   Firefox's updater and survive normal updates; after a full Firefox
   reinstall, re-run the installer.

## FAQ

**SmartScreen / antivirus warns about the .bat?**
Expected for any executable script downloaded from the internet. The bat is
8 lines and all logic lives in the readable setup.ps1 — audit, then run.

**Panel enhancement disappeared after a major Firefox upgrade?**
The expansion itself (prefs + CSS) keeps working; only the panel injection is
affected. Please file an issue with your Firefox version. As a temporary
workaround, edit the two prefs in `about:config`.

**PortableApps Firefox?**
Its profile lives inside the app folder and is not registered in the system
profiles.ini, so the script cannot locate it. Copy the contents of `program/`
and `profile/` manually as described in `使用说明.txt`.

**Multiple Firefox installations (Release / Developer Edition / ESR)?**
The installer uses the last `Default=` entry in profiles.ini (usually your
daily profile), and writes program files only into the install directory you
specify.

## Repository layout

```
安装.bat / 卸载.bat          entry points (self-elevating, forward custom path)
setup.ps1 / uninstall.ps1    actual install/uninstall logic
使用说明.txt                 Chinese instructions
program/                     → copied into the Firefox install directory
  config.js, defaults/pref/config-prefs.js   (fx-autoconfig entry)
profile/                     → copied into the profile directory (auto-detected)
  chrome/userContent.css                     (layout layer)
  chrome/utils/                              (fx-autoconfig loader)
  chrome/JS/moreShortcuts.uc.js              (first-run defaults, actor registration)
  chrome/JS/MoreShortcuts/                   (panel injection actor, parent/child)
```

## License & credits

- [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig) © MrOtherGuy,
  MPL-2.0 — license text bundled as `LICENSE-fx-autoconfig.txt`
- This project's own scripts are released under MPL-2.0
