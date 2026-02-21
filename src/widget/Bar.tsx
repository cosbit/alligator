import { Astal, Gdk, Gtk } from "astal/gtk4"
import ClockTile from "./clock"
import DateTile from "./date"
import BatteryTile from "./battery"

export default function Bar(gdkmonitor: Gdk.Monitor, app: Astal.Application) {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
    const tileGutter = 8

    return <window
        name="sidebar"
        cssClasses={["Bar"]}
        gdkmonitor={gdkmonitor}
        visible={true}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        widthRequest={220}
        anchor={TOP | RIGHT | BOTTOM}
        application={app}
        setup={self => app.add_window(self)}
        >
        <box cssClasses={["bar__inner"]} vertical spacing={tileGutter}>
            <box
                cssClasses={["bar__row", "bar__row--pair"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <ClockTile/>
                <DateTile/>
            </box>
            <box
                cssClasses={["bar__row", "bar__row--single"]}
                halign={Gtk.Align.CENTER}
            >
                <box cssClasses={["tile", "tile--horizontal", "tile--dark"]} />
            </box>
            <box
                cssClasses={["bar__row", "bar__row--split"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <box cssClasses={["tile", "tile--vertical", "tile--dark"]} />
                <box cssClasses={["bar__column", "bar__column--stack"]} vertical spacing={tileGutter}>
                    <BatteryTile/>
                    <box cssClasses={["tile", "tile--square", "tile--dark"]} />
                </box>
            </box>
            <box
                cssClasses={["bar__row", "bar__row--single"]}
                halign={Gtk.Align.CENTER}
            >
                <box cssClasses={["tile", "tile--horizontal", "tile--dark"]} />
            </box>
            <box
                cssClasses={["bar__row", "bar__row--single"]}
                halign={Gtk.Align.CENTER}
            >
                <box cssClasses={["tile", "tile--square", "tile--dark"]} />
            </box>
        </box>
    </window>
}
