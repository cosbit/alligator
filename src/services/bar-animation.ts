import { execAsync } from "astal/process"
import GLib from "gi://GLib"

export const BAR_NAMESPACE = "alligator-sidebar"

// Let the compositor animate unmapping too, which GTK cannot do after hide().
// The named rule avoids accumulating anonymous rules when the app restarts.
export async function configureBarAnimation() {
    if (!GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE") || !GLib.find_program_in_path("hyprctl")) return

    try {
        const result = await execAsync([
            "hyprctl", "eval",
            `hl.layer_rule({name = "alligator-animation", match = {namespace = "^${BAR_NAMESPACE}$"}, animation = "slide top"})`,
        ])
        if (result.trim() !== "ok") console.error("Bar animation rule:", result)
    } catch (error) {
        console.error("Could not configure bar animation:", error)
    }
}
