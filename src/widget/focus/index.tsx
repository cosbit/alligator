import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import GLib from "gi://GLib"
import { FocusTimer, type Mode } from "./timer"
import "./style.scss"

export default function FocusTile() {
    const timer = new FocusTimer()
    const state = Variable(timer.snapshot())
    let source = 0

    function stopClock() {
        if (source) GLib.source_remove(source)
        source = 0
    }

    function update() {
        if (timer.tick(Date.now())) {
            const message = timer.mode === "focus"
                ? "Focus complete. Time for a break."
                : "Break complete. Ready to focus?"
            try {
                GLib.spawn_command_line_async(`notify-send 'Focus timer' '${message}'`)
            } catch (error) {
                console.error("Focus timer notification failed:", error)
            }
        }
        state.set(timer.snapshot())
    }

    function toggle() {
        update()
        timer.toggle(Date.now())
        stopClock()
        if (timer.running) {
            source = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                update()
                if (timer.running) return GLib.SOURCE_CONTINUE
                source = 0
                return GLib.SOURCE_REMOVE
            })
        }
        state.set(timer.snapshot())
    }

    function reset(mode: Mode = timer.mode) {
        stopClock()
        timer.reset(mode)
        state.set(timer.snapshot())
    }

    return <box
        cssClasses={["tile", "tile--vertical", "tile--dark", "tile--focus"]}
        onDestroy={() => { stopClock(); state.drop() }}
    >
        <box vertical hexpand vexpand spacing={4} cssClasses={["focus__content"]}>
            <box homogeneous spacing={2}>
                {(["focus", "break"] as Mode[]).map(mode => <button
                    cssClasses={state(s => ["focus__mode", ...(s.mode === mode ? ["focus__mode--active"] : [])])}
                    label={mode === "focus" ? "Focus" : "Break"}
                    tooltipText={mode === "focus" ? "Start a fresh 25-minute focus timer" : "Start a fresh 5-minute break timer"}
                    onClicked={() => reset(mode)}
                />)}
            </box>
            <box vexpand />
            <image cssClasses={["focus__art"]} iconName={state(s => s.mode === "focus" ? "focus_stars" : "focus_leaves")} pixelSize={30} />
            <label cssClasses={["focus__time"]} label={state(s =>
                `${Math.floor(s.seconds / 60).toString().padStart(2, "0")}:${(s.seconds % 60).toString().padStart(2, "0")}`,
            )} />
            <box vexpand />
            <button cssClasses={["focus__start"]} label={state(s => s.running ? "Pause" : s.seconds === 0 ? "Restart" : "Start")}
                onClicked={toggle} />
            <button cssClasses={["focus__reset"]} label="Reset" tooltipText="Reset the current interval" onClicked={() => reset()} />
        </box>
    </box>
}
