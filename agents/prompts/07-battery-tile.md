# Prompt: Build the battery tile

Goal
- Implement the battery tile content and styles in its own folder using the AGS/Astal Accessor pattern.
- Display a 4-cell battery indicator and a small charging glyph driven by sysfs battery files (no upower).

Steps
- Add the battery widget markup and logic in `src/widget/battery/index.tsx`.
- Keep tile-specific styling in `src/widget/battery/style.scss`.
- Ensure `src/style.scss` imports the battery tile stylesheet (add if missing).
- Import the battery tile into `src/widget/Bar.tsx` and replace the intended placeholder.

Methodology (AGS/Astal)
- Use GTK4 imports from `astal/gtk4` and avoid GTK3.
- Use Accessors (`createComputed`, `Variable().poll` via a small `createPoll` helper) for all reactive state.
- Call Accessors as functions inside `createComputed` to register dependencies.
- Use `createPoll` with a function to read sysfs files instead of CLI tools.
- Keep layout semantics in GTK props (`halign`, `valign`, `hexpand`, `vexpand`, `spacing`) instead of CSS.
- Keep polling modest (60_000ms).

Functions to implement
- `createPoll<T>(...)`: small helper around `Variable(initial).poll(...)`, matching the clock/date pattern.
- `resolveBatteryPaths()`: return `{ capacityPath: string; statusPath: string } | null`.
  - Prefer `/sys/class/power_supply/BAT1/` then `/sys/class/power_supply/BAT0/`.
  - If neither exists, pick the first `/sys/class/power_supply/BAT*/` with a `capacity` file.
  - Return `null` when no capacity file exists.
- `readCapacity(path: string | null)`: parse the file into a number (0-100) or return `null` on missing/parse failure.
- `readStatus(path: string | null)`: read the status file and return `true` when charging, otherwise `false`.
- `createBatteryPoll()`: returns an Accessor `{ percent: number; charging: boolean }`.
  - Use `createPoll` with a function that reads `capacity` and `status` from the resolved paths.
  - If files are missing, return `{ percent: 0, charging: false }`.
- `createCellClass(index, infoAccessor)`: `createComputed(() => className)` for each of the 4 cells.
  - Cell thresholds: 20%, 40%, 60%, 80% (cell 4 is the 80% threshold).
  - Active if `percent >= threshold`, inactive otherwise.
  - Inactive cells use tile background and a 2px Gruvbox black border.
  - Active cells are green unless `percent < 40` and `charging` is false, then yellow.
  - If `charging` is true, active cells should be green even below 40%.
- `createChargingGlyph(infoAccessor)`: `createComputed(() => charging ? "+" : "")` (or similar ASCII glyph).
- `BatteryTile()`: the exported widget factory that composes Accessors, builds the GTK layout, and renders the cells + glyph.

Layout requirements
- Root: `Box` with classes `tile tile--square tile--battery tile--dark` and centered `halign/valign`, `hexpand/vexpand={false}`.
- Layout: horizontal `Box` centered in the tile with small `spacing`.
- Cells: a `Box` with class `battery__cells` and 4 child `Box` nodes.
  - Each cell uses `className={cellClassAccessor()}` from `createCellClass`.
  - Keep the cell markup minimal (no labels inside cells).
- Charging glyph: `Label` with class `battery__glyph`, bound to the glyph Accessor.
- Center the entire group optically within the tile.

Styling requirements
- Use `src/widget/battery/style.scss` to target `.tile--battery`, `.battery__cells`, `.battery__cell`, and `.battery__glyph`.
- Define fixed cell sizes and spacing; keep them visually compact.
- Active cell color: `var(--gb-green)` by default.
- Warning cell color: `var(--gb-yellow)` when discharging and `<40%`.
- Inactive cell: background `var(--gb-bg)` with `border: 2px solid var(--gb-bg-hard)`.
- Charging glyph: small, aligned with the cell row; avoid oversized typography.
- Do not define sizing or tile dimensions here; those stay in `src/style.scss`.
- Import the battery tile stylesheet into `src/style.scss` (if not already present).

Constraints
- Keep global sizing/tiling in `src/style.scss` only.
- Keep typography and internal layout in the battery tile folder.

Files to touch
- `src/widget/battery/index.tsx`
- `src/widget/battery/style.scss`
- `src/style.scss` (only if the import is missing)
- `src/widget/Bar.tsx` (place the BatteryTile)

Out of scope
- Editing other tiles.
- Changing global tile sizing.
- Modifying the Bar layout beyond inserting the BatteryTile.

Clarifications needed
- Is the charging glyph preference `+`, `CHG`, or a Nerd Font icon? lets use +.
- Should the glyph be hidden entirely when not charging, or show a muted placeholder? we can use - to represent discharging.
