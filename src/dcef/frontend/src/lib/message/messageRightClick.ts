import { get } from "svelte/store"
import { checkUrl, copyTextToClipboard } from "../../js/helpers"
import type { Asset, Author, Message } from "../../js/interfaces"
import { contextMenuItems } from "../../js/stores/menuStore"
import { linkHandler, setCurrentUser } from "../../js/stores/settingsStore.svelte"
import { isOfflineMediaComplete, isOfflineMediaPending, requestOfflineMedia } from "../../js/stores/offlineMediaStore.svelte"

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
    const embedMedia = (message.embeds ?? []).flatMap(embed =>
        [embed.thumbnail, embed.image, embed.video, ...(embed.images ?? [])]
            .filter((asset): asset is Asset => Boolean(asset)));
    const offlineMediaKeys = [...new Set(
        [...(message.attachments ?? []), ...embedMedia]
            .filter(attachment => attachment.mediaKey
                && !attachment.isOffline
                && !isOfflineMediaComplete(attachment.mediaKey))
            .map(attachment => attachment.mediaKey as string))];
    const offlineMediaPending = offlineMediaKeys.some(isOfflineMediaPending);
    const offlineMediaItem = {
        name: "Offline Media",
        disabled: offlineMediaPending,
        action: () => requestOfflineMedia(offlineMediaKeys)
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
        ...(offlineMediaKeys.length > 0
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
