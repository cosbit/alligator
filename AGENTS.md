# AGENTS
! UPDATE THIS FILE ON EACH CONTEXT. THIS FILE SHOULD GROW LARGER AND LARGER. SPECIFY THE PURPUSE OF EACH FILE AND WHAT IT CONTAINS. ! 

## Purpose
Canonical architecture notes and workflow for the Alligator AGS widget set.

## Layout and growth
- `src/config.ts` is the entry point that registers windows and global setup.
- `src/style.css` holds global styling; keep it lean and split into `src/styles/` as the theme grows.
- `src/widgets/` should contain standalone widget factories (sidebar, panels, modules).
- `src/services/` should contain long-lived data sources or integrations.
- `src/utils/` should contain shared helpers with no UI coupling.
- `src/assets/` should contain images, icons, and other static resources.

## Development workflow
- Enter the dev shell: `nix develop`
- Run the config locally: `ags -c ./src/config.ts`
- Toggle the sidebar: `ags toggle sidebar`

## Conventions
- Keep windows named and stable so `ags toggle <name>` works predictably.
- Prefer simple widget factories over large monoliths in `config.ts`.
- Keep UI layout empty/transparent by default; fill in modules incrementally.
