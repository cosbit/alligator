import { Astal, Gdk, Gtk } from "astal/gtk4"
import ClockTile from "./clock"
import DateTile from "./date"
import BatteryTile from "./battery"
import VolumeTile from "./volume"
import PowerActionsTile from "./power-actions"
import DisplayTile from "./display"
import NetworkTile from "./network"

export default function Bar(gdkmonitor: Gdk.Monitor, app: Astal.Application) {
    const { TOP, RIGHT, BOTTOM } = Astal.WindowAnchor
    const tileGutter = 6

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
            <box /** First row; clock and date */
                cssClasses={["bar__row", "bar__row--pair"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <ClockTile/>
                <DateTile/>
            </box>
            <box /** Second row (wide); volume  */
                cssClasses={["bar__row", "bar__row--single"]}
                halign={Gtk.Align.CENTER}
            >
                <VolumeTile/>
            </box>
            <box /** Third row (vertical); decoration, power and actions */
                cssClasses={["bar__row", "bar__row--split"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <box cssClasses={["tile", "tile--vertical", "tile--dark"]} />
                <box cssClasses={["bar__column", "bar__column--stack"]} vertical spacing={tileGutter}>
                    <BatteryTile/>
                    <PowerActionsTile/>
                </box>
            </box>
            <box /** Fourth row (wide); display & brightness */
                cssClasses={["bar__row", "bar__row--single"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <DisplayTile/>
            </box>
            <box /** Fith row; network & devices */
                cssClasses={["bar__row", "bar__row--pair"]}
                halign={Gtk.Align.CENTER}
                spacing={tileGutter}
            >
                <NetworkTile/>
                <box cssClasses={["tile", "tile--square", "tile--dark"]} />
            </box>
        </box>
    </window>
}
