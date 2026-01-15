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

function createDayPoll() {
    return createPoll("", 60_000, 'date +"%A"')
}

function createDatePoll() {
    return createPoll("", 60_000, 'date +"%d %b %Y"')
}

export default function DateTile() {
    const day = createDayPoll()
    const date = createDatePoll()
    const dayLabel = day((value) => value.trim())
    const dateLabel = date((value) => value.trim())

    return (
        <box
            className="tile tile--square tile--date tile--dark"
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                vertical
                spacing={4}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                hexpand={false}
                vexpand={false}
            >
                <label
                    className="date__day"
                    label={dayLabel}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    hexpand={false}
                    vexpand={false}
                />
                <label
                    className="date__full"
                    label={dateLabel}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    hexpand={false}
                    vexpand={false}
                />
            </box>
        </box>
    )
}
