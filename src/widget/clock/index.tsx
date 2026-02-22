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
        <box
            cssClasses={["tile", "tile--square", "tile--clock", "tile--light"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
            hexpand={false}
            vexpand={false}
        >
            <centerbox
                cssClasses={["clock__content"]}
                orientation={Gtk.Orientation.VERTICAL}
                halign={Gtk.Align.FILL}
                valign={Gtk.Align.FILL}
                hexpand
                vexpand
            >
                <box
                    cssClasses={["clock__row", "clock__row--top"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.START}
                    hexpand
                    vexpand={false}
                >
                    <centerbox
                        cssClasses={["clock__top-icons"]}
                        orientation={Gtk.Orientation.HORIZONTAL}
                        halign={Gtk.Align.FILL}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        vexpand={false}
                    >
                        <image
                            cssClasses={["clock__icon", "clock__icon--top"]}
                            iconName="2"
                            pixelSize={20}
                        />
                        <image
                            cssClasses={["clock__icon", "clock__icon--top"]}
                            iconName="20"
                            pixelSize={20}
                        />
                        <image
                            cssClasses={["clock__icon", "clock__icon--top"]}
                            iconName="22"
                            pixelSize={20}
                        />
                    </centerbox>
                </box>
                <box
                    cssClasses={["clock__row", "clock__row--time"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.CENTER}
                    hexpand
                    vexpand={false}
                >
                    <label
                        cssClasses={["clock__time"]}
                        label={time()}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                        hexpand
                        vexpand={false}
                    />
                </box>
                <box
                    cssClasses={["clock__row", "clock__row--bottom"]}
                    halign={Gtk.Align.FILL}
                    valign={Gtk.Align.START}
                    hexpand
                    vexpand={false}
                >
                    <image
                        cssClasses={["clock__icon", "clock__icon--bottom"]}
                        iconName="go-previous-symbolic"
                        // pixelSize={12}
                        halign={Gtk.Align.START}
                        valign={Gtk.Align.CENTER}
                    />
                    <box hexpand />
                    <image
                        cssClasses={["clock__icon", "clock__icon--bottom"]}
                        iconName="go-next-symbolic"
                        // pixelSize={12}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                    />
                </box>
            </centerbox>
        </box>
    )
}
