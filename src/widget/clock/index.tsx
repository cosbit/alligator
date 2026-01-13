import { Gtk } from "astal/gtk4"
import { Variable } from "astal"
import "./style.scss"

function createPoll<T>(
    initial: T,
    intervalMs: number,
    command: string | string[],
    transform: (output: string, prev: T) => T = output => output as T,
) {
    return Variable(initial).poll(intervalMs, command, transform)
}

const time = createPoll(
    "",
    60_000,
    'date +"%-I:%M %p"',
    output => output.trim(),
)

export default function ClockTile() {
    return (
        <box className="tile tile--square tile--clock tile--light">
            <label
                className="clock__time"
                label={time()}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                hexpand
                vexpand
            />
        </box>
    )
}
