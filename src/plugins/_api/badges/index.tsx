/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./fixDiscordBadgePadding.css";

import { _getBadges, BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { openContributorModal } from "@components/PluginSettings/ContributorModal";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isEnhancecordPluginDev, isPluginDev } from "@utils/misc";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Forms, Toasts, UserStore } from "@webpack/common";
import { User } from "discord-types/general";
const CONTRIBUTOR_BADGE = "https://vencord.dev/assets/favicon.png";
const ENHANCECORD_CONTRIBUTOR_BADGE = "https://i.imgur.com/csrIZSG.png";

const ContributorBadge: ProfileBadge = {
    description: "Vencord Contributor",
    image: CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => isPluginDev(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};

const EnhancecordContributorBadge: ProfileBadge = {
    description: "Enhancecord Contributor",
    image: ENHANCECORD_CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => isEnhancecordPluginDev(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};

let DonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let EnhancecordDonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;

async function loadBadges(url: string, noCache = false) {
    const init = {} as RequestInit;
    if (noCache) init.cache = "no-cache";

    return await fetch(url, init).then(r => r.json());
}

async function loadAllBadges(noCache = false) {
    const vencordBadges = await loadBadges("https://badges.vencord.dev/badges.json", noCache);
    const enhancecordBadges = await loadBadges("https://raw.githubusercontent.com/Enhancecord/Equibored/main/badges.json", noCache);

    DonorBadges = vencordBadges;
    EnhancecordDonorBadges = enhancecordBadges;
}


export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users.",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun],
    required: true,
    patches: [
        {
            find: ".FULL_SIZE]:26",
            replacement: {
                match: /(?<=(\i)=\(0,\i\.\i\)\(\i\);)return 0===\i.length\?/,
                replace: "$1.unshift(...$self.getBadges(arguments[0].displayProfile));$&"
            }
        },
        {
            find: ".description,delay:",
            replacement: [
                {
                    // alt: "", aria-hidden: false, src: originalSrc
                    match: /alt:" ","aria-hidden":!0,src:(?=.{0,20}(\i)\.icon)/,
                    // ...badge.props, ..., src: badge.image ?? ...
                    replace: "...$1.props,$& $1.image??"
                },
                {
                    match: /(?<="aria-label":(\i)\.description,.{0,200})children:/,
                    replace: "children:$1.component ? $self.renderBadgeComponent({ ...$1 }) :"
                },
                // conditionally override their onClick with badge.onClick if it exists
                {
                    match: /href:(\i)\.link/,
                    replace: "...($1.onClick && { onClick: vcE => $1.onClick(vcE, $1) }),$&"
                }
            ]
        }
    ],

    toolboxActions: {
        async "Refetch Badges"() {
            await loadAllBadges(true);
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched badges!",
                type: Toasts.Type.SUCCESS
            });
        }
    },

    async start() {
        Vencord.Api.Badges.addProfileBadge(ContributorBadge);
        Vencord.Api.Badges.addProfileBadge(EnhancecordContributorBadge);
        await loadAllBadges();
    },

    getBadges(props: { userId: string; user?: User; guildId: string; }) {
        if (!props) return [];

        try {
            props.userId ??= props.user?.id!;

            return _getBadges(props);
        } catch (e) {
            new Logger("BadgeAPI#hasBadges").error(e);
            return [];
        }
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),


    getDonorBadges(userId: string) {
        return DonorBadges[userId]?.map(badge => ({
            image: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            },
            onClick() {
                const modalKey = openModal(props => (
                    <ErrorBoundary noop onError={() => {
                        closeModal(modalKey);
                        VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
                    }}>
                        <ModalRoot {...props}>
                            <ModalHeader>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <Forms.FormTitle
                                        tag="h2"
                                        style={{
                                            width: "100%",
                                            textAlign: "center",
                                            margin: 0
                                        }}
                                    >
                                        <Heart />
                                        Vencord Donor
                                    </Forms.FormTitle>
                                </Flex>
                            </ModalHeader>
                            <ModalContent>
                                <Flex>
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/attachments/1245975852597117062/1289687782780047370/Icone.png?ex=66f9bad8&is=66f86958&hm=c5868147c4354229539203e6ed54b003d16134824aabf6624b2bdffeb074b6ff&"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/attachments/1245975852597117062/1289689242204639314/icon_1.png?ex=66f9bc34&is=66f86ab4&hm=35f1e06de2afc7b14d84360614b97e38ad48d35f53d6ec80ae62e6f3d7c437ec&"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                </Flex>
                                <div style={{ padding: "1em" }}>
                                    <Forms.FormText>
                                        This Badge is a special perk for Vencord Donors
                                    </Forms.FormText>
                                    <Forms.FormText className={Margins.top20}>
                                        Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!
                                    </Forms.FormText>
                                </div>
                            </ModalContent>
                            <ModalFooter>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <DonateButton />
                                </Flex>
                            </ModalFooter>
                        </ModalRoot>
                    </ErrorBoundary>
                ));
            },
        }));
    },

    getEnhancecordDonorBadges(userId: string) {
        return EnhancecordDonorBadges[userId]?.map(badge => ({
            image: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            },
            onClick() {
                const modalKey = openModal(props => (
                    <ErrorBoundary noop onError={() => {
                        closeModal(modalKey);
                        // Will get my own in the future
                        VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
                    }}>
                        <ModalRoot {...props}>
                            <ModalHeader>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <Forms.FormTitle
                                        tag="h2"
                                        style={{
                                            width: "100%",
                                            textAlign: "center",
                                            margin: 0
                                        }}
                                    >
                                        <Heart />
                                        Enhancecord Donor
                                    </Forms.FormTitle>
                                </Flex>
                            </ModalHeader>
                            <ModalContent>
                                <Flex>
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533070955872337.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533090627174460.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                </Flex>
                                <div style={{ padding: "1em" }}>
                                    <Forms.FormText>
                                        This Badge is a special perk for Enhancecord (Not Vencord) Donors
                                    </Forms.FormText>
                                    <Forms.FormText className={Margins.top20}>
                                        Please consider supporting the development of Enhancecord by becoming a donor. It would mean a lot! :3
                                    </Forms.FormText>
                                </div>
                            </ModalContent>
                            <ModalFooter>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <DonateButton />
                                </Flex>
                            </ModalFooter>
                        </ModalRoot>
                    </ErrorBoundary>
                ));
            },
        }));
    }
});
