# Custom form controls – no more browser defaults

Branch: `feature/ui-upgrade`. Goal: every select, date field, file field and checkbox is drawn by Ledgerling,
with short motion, so nothing looks like a browser default. No new library. Tick each box when done.

## Audit (what was still native)
- `<select>`: language switcher (sidebar, phone menu, Login / Register), Transactions filters (Category, Sort)
- `<input type="date">`: Transactions (From, To), transaction form, quick add, recurring rule (Start, End),
  goal deadline, goal money dialog
- `<input type="file">`: Import CSV dialog
- `<input type="checkbox">`: transaction list selection, "Save as template"
- The browser's clear (×) button of the search box; default scrollbars

## Checklist
- [x] `Popover` helper: panel in the top layer (works inside dialogs), placed under / above its anchor, closes on outside click
- [x] `Select` component (combobox + listbox, keyboard, typeahead, groups, check mark, open / close motion)
- [x] `LanguageSwitcher` uses `Select`; Transactions Category and Sort use `Select`
- [x] `DatePicker` component (localized trigger, month grid, month slide, keyboard, Today / Clear, min / max)
- [x] Replace every `type="date"`
- [x] Import CSV: drop zone (drag and drop or browse), file chip with name and size
- [x] Global checkbox style with an animated check; custom clear button in the search box; thin scrollbars
- [x] i18n keys in all 8 locales
- [x] Unit tests: Select, DatePicker, updated LanguageSwitcher / dialogs
- [x] E2E helpers for the new controls; update specs that used `selectOption` / `fill` on dates
- [x] `docs/ui-style.md` section on the controls
- [x] Checks: client lint (if any), test, build, test:e2e, i18n:check; server test
