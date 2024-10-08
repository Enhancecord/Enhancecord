/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { relaunch, showItemInFolder } from "@utils/native";
import { checkForUpdates, getRepo } from "@utils/updater";
import { Clipboard, GuildStore, NavigationRouter, SettingsRouter, Toasts } from "@webpack/common";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";
import Plugins from "~plugins";

import { openMultipleChoice } from "./components/MultipleChoice";
import { openSimpleTextInput } from "./components/TextInput";

export interface ButtonAction {
    id: string;
    label: string;
    callback?: () => void;
    registrar?: string;
}

export const actions: ButtonAction[] = [
    { id: "openEnhancecordSettings", label: "Open Enhancecord tab", callback: async () => await SettingsRouter.open("EnhancecordSettings"), registrar: "Enhancecord" },
    { id: "openPluginSettings", label: "Open Plugin tab", callback: () => SettingsRouter.open("EnhancecordPlugins"), registrar: "Enhancecord" },
    { id: "openThemesSettings", label: "Open Themes tab", callback: () => SettingsRouter.open("EnhancecordThemes"), registrar: "Enhancecord" },
    { id: "openUpdaterSettings", label: "Open Updater tab", callback: () => SettingsRouter.open("EnhancecordUpdater"), registrar: "Enhancecord" },
    { id: "openEnhancecordCloudSettings", label: "Open Cloud tab", callback: () => SettingsRouter.open("EnhancecordCloud"), registrar: "Enhancecord" },
    { id: "openBackupSettings", label: "Open Backup & Restore tab", callback: () => SettingsRouter.open("EnhancecordSettingsSync"), registrar: "Enhancecord" },
    { id: "restartClient", label: "Restart Client", callback: () => relaunch(), registrar: "Enhancecord" },
    { id: "openQuickCSSFile", label: "Open Quick CSS File", callback: () => VencordNative.quickCss.openEditor(), registrar: "Enhancecord" },
    { id: "openSettingsFolder", label: "Open Settings Folder", callback: async () => showItemInFolder(await VencordNative.settings.getSettingsDir()), registrar: "Enhancecord" },
    { id: "openInGithub", label: "Open in Github", callback: async () => VencordNative.native.openExternal(await getRepo()), registrar: "Enhancecord" },

    {
        id: "openInBrowser", label: "Open in Browser", callback: async () => {
            const url = await openSimpleTextInput("Enter a URL");
            const newUrl = url.replace(/(https?:\/\/)?([a-zA-Z0-9-]+)\.([a-zA-Z0-9-]+)/, "https://$2.$3");

            try {
                new URL(newUrl); // Throws if invalid
                VencordNative.native.openExternal(newUrl);
            } catch {
                Toasts.show({
                    message: "Invalid URL",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Enhancecord"
    },

    {
        id: "togglePlugin", label: "Toggle Plugin", callback: async () => {
            const plugins = Object.keys(Plugins);
            const options: ButtonAction[] = [];

            for (const plugin of plugins) {
                options.push({
                    id: plugin,
                    label: plugin
                });
            }

            const choice = await openMultipleChoice(options);

            const enabled = await openMultipleChoice([
                { id: "enable", label: "Enable" },
                { id: "disable", label: "Disable" }
            ]);

            if (choice && enabled) {
                return togglePlugin(choice, enabled.id === "enable");
            }
        }, registrar: "Enhancecord"
    },

    {
        id: "quickFetch", label: "Quick Fetch", callback: async () => {
            try {
                const url = await openSimpleTextInput("Enter URL to fetch (GET only)");
                const newUrl = url.replace(/(https?:\/\/)?([a-zA-Z0-9-]+)\.([a-zA-Z0-9-]+)/, "https://$2.$3");
                const res = (await fetch(newUrl));
                const text = await res.text();
                Clipboard.copy(text);

                Toasts.show({
                    message: "Copied response to clipboard!",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });

            } catch (e) {
                Toasts.show({
                    message: "Issue fetching URL",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Enhancecord"
    },

    {
        id: "copyGitInfo", label: "Copy Git Info", callback: async () => {
            Clipboard.copy(`gitHash: ${gitHash}\ngitRemote: ${gitRemote}`);

            Toasts.show({
                message: "Copied git info to clipboard!",
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    position: Toasts.Position.BOTTOM
                }
            });
        }, registrar: "Enhancecord"
    },

    {
        id: "checkForUpdates", label: "Check for Updates", callback: async () => {
            const isOutdated = await checkForUpdates();

            if (isOutdated) {
                setTimeout(() => showNotification({
                    title: "A Enhancecord update is available!",
                    body: "Click here to view the update",
                    permanent: true,
                    noPersist: true,
                    onClick() {
                        SettingsRouter.open("EnhancecordUpdater");
                    }
                }), 10_000);
            } else {
                Toasts.show({
                    message: "No updates available",
                    type: Toasts.Type.MESSAGE,
                    id: Toasts.genId(),
                    options: {
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }, registrar: "Enhancecord"
    },

    {
        id: "navToServer", label: "Navigate to Server", callback: async () => {
            const allServers = Object.values(GuildStore.getGuilds());
            const options: ButtonAction[] = [];

            for (const server of allServers) {
                options.push({
                    id: server.id,
                    label: server.name
                });
            }

            const choice = await openMultipleChoice(options);

            if (choice) {
                NavigationRouter.transitionToGuild(choice.id);
            }
        }, registrar: "Enhancecord"
    }
];

function togglePlugin(plugin: ButtonAction, enabled: boolean) {

    Settings.plugins[plugin.id].enabled = enabled;

    Toasts.show({
        message: `Successfully ${enabled ? "enabled" : "disabled"} ${plugin.id}`,
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId(),
        options: {
            position: Toasts.Position.BOTTOM
        }
    });
}

export function registerAction(action: ButtonAction) {
    actions.push(action);
}
