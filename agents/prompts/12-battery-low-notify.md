# Prompt: Add low-battery mako notifications

Goal
- When battery capacity drops below 10%, send a `makoctl` notification that includes the current percentage.
- Send a new notification for each percentage drop (9 → 8 → 7, etc.), but do not spam on unchanged values.
- Send a notification when the charger is plugged in and another when it is unplugged.

Behavior rules
- Trigger when `percent < 10`.
- Notify on the first observation below 10%, then only on subsequent *drops*.
- If the percentage rises to 10% or above, reset the notifier so it can trigger again on the next drop.
- For charging state changes, notify only on transitions (not on every poll).
- Initial charging state should be recorded without notifying.

Implementation steps
1) Add a small notification helper in `src/widget/battery/index.tsx`.
   - Use `GLib.spawn_command_line_async` to run `makoctl`.
   - Format the command as: `makoctl notify "Charge System Now!" "Battery at ${percent}%"`
   - Keep it ASCII-only and shell-safe; `percent` is a number.
   - Add a second command format for power events, e.g.:
     - Plugged in: `makoctl notify "Power Connected" "Charging at ${percent}%"`
     - Unplugged: `makoctl notify "Power Disconnected" "Battery at ${percent}%"`

2) Track the last notified percentage.
   - Keep a module-local `let lastNotified: number | null = null`.
   - When `percent >= 10`, set `lastNotified = null`.
   - When `percent < 10` and (`lastNotified === null` or `percent < lastNotified`), send a notification and update `lastNotified = percent`.

3) Track the last charging state.
   - Keep a module-local `let lastCharging: boolean | null = null`.
   - On each update, if `lastCharging === null`, set it to `info.charging` without notifying.
   - If `lastCharging !== info.charging`, fire the appropriate power notification and update `lastCharging`.

4) Wire the notifier to the battery Accessor.
   - Use `info.subscribe(() => { ... })` or a small `createEffect` if available.
   - Ensure the subscription is cleaned up with `onCleanup` to avoid leaking.
   - The notification logic must not interfere with the existing UI bindings.

Files to touch
- `src/widget/battery/index.tsx`

Out of scope
- UI changes or CSS updates.
- Adding new services or global state managers.

Clarifications needed
- Should we suppress notifications when the battery is charging, even if it is <10%?
