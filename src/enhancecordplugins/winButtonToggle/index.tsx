/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { EnhancecordDevs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

export const toggleButton = () => {
    document.querySelectorAll(".platform-win .winButton_a934d8").forEach(btn => {
        const btnFixed = btn as HTMLElement;
        /* Enable and Disable */
        btnFixed.style.display = settings.store.enableButton ? 'flex' : 'none';
    });
};

export const settings = definePluginSettings({
    enableButton: {
        type: OptionType.BOOLEAN,
        description: "Enable Win Button",
        default: true,
        onChange: toggleButton
    }
});

export default definePlugin({
    name: "WinButtonToggle",
    description: "Toggles win buttons on and off to make your Discord look cleaner",
    authors: [EnhancecordDevs.jw],
    enabledByDefault: false,
    settings: settings,

    onKey(e: KeyboardEvent) {
        const hasCtrl = e.ctrlKey;

        if (hasCtrl) {
            switch (e.key) {
                case "x":
                case "X":
                    settings.store.enableButton = !settings.store.enableButton;
                    break;
                default:
                    break;
            }
        }
    },

    start() {
        document.addEventListener("keydown", this.onKey);
    },

    stop() {
        document.removeEventListener("keydown", this.onKey);
    }
});

/* Win Button */