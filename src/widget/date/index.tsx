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
    const dayLabel = day((value) => value.trim().toLowerCase())
    const dateDay = date((value) => {
        const [dayPart] = value.trim().toLowerCase().split(/\s+/)
        return dayPart ?? ""
    })
    const dateMonth = date((value) => {
        const [, monthPart] = value.trim().toLowerCase().split(/\s+/)
        return monthPart ?? ""
    })
    const dateYear = date((value) => {
        const parts = value.trim().toLowerCase().split(/\s+/)
        if (parts.length < 3) {
            return ""
        }
        return parts.slice(2).join(" ")
    })

    return (
        <box
            cssClasses={["tile", "tile--square", "tile--date", "tile--dark"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <box
                vertical
                spacing={5}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                hexpand={false}
                vexpand={false}
            >
                <label
                    cssClasses={["date__day"]}
                    label={dayLabel}
                    hexpand={false}
                    vexpand={false}
                    xalign={0.5}
                />
                <box
                    cssClasses={["date__full"]}
                    spacing={6}
                    hexpand={false}
                    vexpand={false}
                >
                    <label
                        cssClasses={["date__part"]}
                        label={dateDay}
                        xalign={0.5}
                    />
                    <label
                        cssClasses={["date__part", "date__month"]}
                        label={dateMonth}
                        xalign={0.5}
                    />
                    <label
                        cssClasses={["date__part"]}
                        label={dateYear}
                        xalign={0.5}
                    />
                </box>
            </box>
        </box>
    )
}
