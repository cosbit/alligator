import { App } from "astal/gtk4"
import style from "./style.scss"
import Bar from "./widget/Bar"
import { configureBarAnimation } from "./services/bar-animation"

App.start({
    css: style,
    icons: "./icons",
    async main() {
        await configureBarAnimation()
        const monitors = App.get_monitors()
        Bar(monitors[0], App)
    },
})
