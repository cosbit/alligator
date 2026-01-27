# Prompt: Diagnose missing CSS (tile sizing/colors not applying)

Goal
- Identify why `.tile` sizing/colors are not applied at runtime (sidebar shows plain text in a single row).
- Fix CSS loading and/or class assignment so tiles render with intended size and colors.

Context
- App entry: `src/app.ts` uses `App.start({ css: style })`.
- Styles live in `src/style.scss` with partials under `src/styles/` and `src/widget/*/style.scss`.
- Widgets set classes on `window`, `box`, and `label` elements.

Steps
1) Prove CSS injection works at all.
   - In `src/app.ts`, temporarily replace `css: style` with a hard-coded string like:
     `css: "window { background: #ff0000; } label { color: #00ff00; }"`.
   - Run `ags -c ./src/app.ts` and confirm the window background + label color change.
   - Revert to the original line after the check.

2) If inline CSS does not apply, fix the CSS injection path.
   - Confirm the Astal/AGS API expects `css` as a `string` or `string[]`. If it expects an array, change to `css: [style]`.
   - If `App.start` does not accept `css` in this version, move CSS loading into `main()` using the correct API name from the local typings (e.g., `App.apply_css(...)` or `App.setCss(...)`).
   - Re-test with the hard-coded CSS string to verify the pipeline.

3) If inline CSS works but `style.scss` does not:
   - Log `style.length` once in `src/app.ts` to confirm the import is a non-empty string.
   - If the import is empty/undefined, the SCSS compiler is not wired in. Switch to loading from a path that AGS can compile (use the API from local typings), and keep `src/style.scss` as the source file.
   - Add a temporary rule to `src/style.scss` (e.g., `window { background: #ff0000; }`) to confirm the file is being read.

4) Validate CSS class assignment on widgets.
   - Confirm whether the JSX runtime expects `className`, `class`, or `css-classes` for GTK classes by checking the local Astal typings.
   - If `className` is not supported, replace it across:
     - `src/widget/Bar.tsx`
     - `src/widget/clock/index.tsx`
     - `src/widget/date/index.tsx`
     - `src/widget/battery/index.tsx`
   - Add a one-off rule `.tile { background-color: #ff0000; }` to verify class selectors apply.

5) Verify selector coverage and GTK CSS compatibility.
   - Ensure `.tile`, `.tile--square`, `.tile--dark`, `.tile--light`, and `.bar__*` rules exist in `src/style.scss`.
   - Temporarily comment out `* { all: unset; }` to confirm it is not wiping defaults.

6) Apply the minimal fix and remove debug changes.
   - Restore normal CSS, keep only the correction that makes styles apply, and confirm tile sizes/colors render as expected.

Files to touch
- `src/app.ts`
- `src/style.scss`
- `src/widget/Bar.tsx` (if class prop changes are needed)
- `src/widget/clock/index.tsx` (if class prop changes are needed)
- `src/widget/date/index.tsx` (if class prop changes are needed)
- `src/widget/battery/index.tsx` (if class prop changes are needed)

Out of scope
- Changing the tile layout or adding new widgets beyond styling fixes.

Clarifications needed
- Which Astal/AGS version is running, and do you see any CSS/SCSS errors in the AGS log? 

See runtime-output:
 ags run --gtk4 src/app.ts 

(gjs:228205): Gtk-WARNING **: 23:18:14.829: Theme parser error: gtk.css:5:1-145: Failed to import: Error opening file /nix/store/2phbnzzw4b90mrf2qkvqvsmvc6q5pss1-whitesur-gtk-theme-2025-07-24/share/themes/WhiteSur-Dark-hdpi/gtk-4.0/gtk.css: No such file or directory

^C

[cosweb@marble:~/Projects/alligator]$ ags --version
ags version 2.3.0

