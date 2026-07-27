import { get } from "svelte/store"
import { checkUrl, copyTextToClipboard } from "../../js/helpers"
import type { Asset, Author, Message } from "../../js/interfaces"
import { contextMenuItems } from "../../js/stores/menuStore"
import { linkHandler, setCurrentUser } from "../../js/stores/settingsStore.svelte"
import { isOfflineMediaComplete, isOfflineMediaPending, requestOfflineMedia } from "../../js/stores/offlineMediaStore.svelte"
import { isEmbedMediaArchivingExcluded } from "../../js/embedMediaArchiveExclusions"

export function onUserRightClick(e, author: Author) {
    contextMenuItems.set([
        {
            "name": "View discord as this user",
            "action": () => {
                setCurrentUser(author._id, author.nickname, author.name, checkUrl(author.avatar))
            }
        },
        {
            "name": "Copy user ID",
            "action": () => {
                copyTextToClipboard(BigInt(author._id))
            }
        }
    ])
}


export function onMessageRightClick(e, message: Message) {
    const embedMedia = (message.embeds ?? [])
        .filter(embed => !isEmbedMediaArchivingExcluded(embed))
        .flatMap(embed =>
            [embed.thumbnail, embed.image, embed.video, ...(embed.images ?? [])]
                .filter((asset): asset is Asset => Boolean(asset)));
    const offlineMediaIds = [...new Set(
        [...(message.attachments ?? []), ...embedMedia]
            .filter(attachment => attachment.mediaId
                && !attachment.isOffline
                && !isOfflineMediaComplete(attachment.mediaId))
            .map(attachment => attachment.mediaId as number))];
    const offlineMediaPending = offlineMediaIds.some(isOfflineMediaPending);
    const offlineMediaItem = {
        name: "Offline Media",
        disabled: offlineMediaPending,
        action: () => requestOfflineMedia(offlineMediaIds)
    };

    const items = [
        {
            "name": `Open message in discord ${get(linkHandler) === 'app' ? "app" : "web"}`,
            "action": () => {
                window.open((get(linkHandler) === "app" ? "discord://" : "") + `https://discord.com/channels/${BigInt(message.guildId)}/${BigInt(message.channelId)}/${BigInt(message._id)}`,'_blank')
            }
        },
        {
            "name": "Copy text",
            "action": () => {
                copyTextToClipboard(message.content[0].content);
            }
        },
        {
            "name": "Copy message link",
            "action": () => {
                copyTextToClipboard(`https://discord.com/channels/${BigInt(message.guildId)}/${BigInt(message.channelId)}/${BigInt(message._id)}`);
            }
        },
        {
            "name": "Copy message ID",
            "action": () => {
                copyTextToClipboard(BigInt(message._id))
            }
        },
        ...(offlineMediaIds.length > 0
            ? [offlineMediaItem]
            : []),
        {
            "name": "Print message object to devtools (F12)",
            "action": () => {
                console.log(JSON.stringify(message, null, 2))
            }
        }
    ]
    contextMenuItems.set(items)
}
