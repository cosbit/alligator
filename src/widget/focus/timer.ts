export type Mode = "focus" | "break"
export const durations = { focus: 25 * 60, break: 5 * 60 }

// All timestamps are milliseconds. Keep the clock injectable for boundary tests.
export class FocusTimer {
    mode: Mode = "focus"
    remaining = durations.focus * 1000
    running = false
    completed = 0
    private deadline = 0

    tick(now: number): boolean {
        if (!this.running) return false
        this.remaining = Math.max(0, this.deadline - now)
        if (this.remaining > 0) return false
        this.running = false
        if (this.mode === "focus") this.completed++
        return true
    }

    toggle(now: number) {
        if (this.running) {
            this.tick(now)
            this.running = false
        } else {
            if (this.remaining === 0) this.reset()
            this.deadline = now + this.remaining
            this.running = true
        }
    }

    reset(mode: Mode = this.mode) {
        this.mode = mode
        this.running = false
        this.remaining = durations[mode] * 1000
    }

    snapshot() {
        return {
            mode: this.mode,
            seconds: Math.ceil(this.remaining / 1000),
            running: this.running,
            completed: this.completed,
        }
    }
}
