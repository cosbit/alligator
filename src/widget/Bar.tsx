import { Astal, Gdk, Gtk } from "astal/gtk4"
import ClockTile from "./clock"

export default function Bar(gdkmonitor: Gdk.Monitor, app: Astal.Application) {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
    const tileGutter = 12

    return <window
        name="sidebar"
        className="Bar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        widthRequest={220}
        anchor={TOP | RIGHT | BOTTOM}
        application={app}
        setup={self => app.add_window(self)}
        >
        <box className="bar__inner" vertical spacing={tileGutter}>
            <box
                className="bar__row bar__row--pair"
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <ClockTile />
            </box>
            <box
                className="bar__row bar__row--single"
                halign={Gtk.Align.CENTER}
            >
                <box className="tile tile--horizontal tile--dark" />
            </box>
            <box
                className="bar__row bar__row--split"
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <box className="tile tile--vertical tile--dark" />
                <box className="bar__column bar__column--stack" vertical spacing={tileGutter}>
                    <box className="tile tile--square tile--dark" />
                    <box className="tile tile--square tile--dark" />
                </box>
            </box>
            <box
                className="bar__row bar__row--single"
                halign={Gtk.Align.CENTER}
            >
                <box className="tile tile--horizontal tile--dark" />
            </box>
            <box
                className="bar__row bar__row--single"
                halign={Gtk.Align.CENTER}
            >
                <box className="tile tile--square tile--dark" />
            </box>
        </box>
    </window>
}
