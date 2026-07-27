<script lang="ts">
    import { checkUrl } from "../../js/helpers";
    import type { Message } from "../../js/interfaces";
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import { getViewUserState } from "../viewuser/viewUserState.svelte";
    import MessageAuthorName from "./MessageAuthorName.svelte";
    import MessageMarkdown from "./MessageMarkdown.svelte";
    import { onUserRightClick } from "./messageRightClick";
    import Icon from "../icons/Icon.svelte";

    export let message: Message
    export let referencedMessage: Message
    export let messageState;

    const viewUserState = getViewUserState()

    const guildState = getGuildState()
    const fallbackAvatar = "/favicon.png"

    function useFallbackAvatar(event: Event) {
        const image = event.currentTarget as HTMLImageElement
        if (!image.src.endsWith(fallbackAvatar)) {
            image.src = fallbackAvatar
        }
    }

    /*
        NOTE - it is possible to reference another channer or guild (for example reposted annoucements channels)
    */

    async function jumpToReferencedMessage(event?: Event) {
        event?.preventDefault()
        event?.stopPropagation()

        if (!message.reference) {
            console.error("No message reference found")
            return
        }

        const referencedGuildId = message.reference.guildId ?? message.guildId
        await guildState.comboSetGuildChannelMessage(
            referencedGuildId,
            message.reference.channelId,
            message.reference.messageId
        )
        await guildState.pushState()
    }

    function handleReferencedMessageKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            void jumpToReferencedMessage(event)
        }
    }

    function hasReferencedMedia(referenced: Message): boolean {
        return (referenced.attachments?.length ?? 0) > 0 ||
            (referenced.embeds ?? []).some(embed =>
                Boolean(embed.thumbnail) ||
                Boolean(embed.video) ||
                (embed.images?.length ?? 0) > 0
            )
    }
</script>

{#if referencedMessage}
    <div class="referenced clickable">
        <div class="referenced-arrow" />
        {#if referencedMessage.author}
            <img
                class="referenced-avatar"
                src={referencedMessage.author.avatar ? checkUrl(referencedMessage.author.avatar) : fallbackAvatar}
                alt=""
                on:error={useFallbackAvatar}
                on:click
                on:contextmenu|preventDefault={e=>onUserRightClick(e, referencedMessage.author)}
            />
            <MessageAuthorName author={referencedMessage.author} on:click={() => viewUserState.setUser(referencedMessage.author)} />
            <div
                class="referenced-content clickable"
                role="link"
                tabindex="0"
                aria-label="Jump to referenced message"
                title="Jump to referenced message"
                on:click|capture={jumpToReferencedMessage}
                on:keydown={handleReferencedMessageKeydown}
            >
                <span class="referenced-text">
                    {#if referencedMessage.content[0].content !== ""}
                        <MessageMarkdown content={referencedMessage.content[0].content.split("\n")[0]} emotes={referencedMessage?.emotes || []} mentions={referencedMessage?.mentions || []} roles={referencedMessage?.roles || []} channels={referencedMessage?.channels || []} />
                    {:else if hasReferencedMedia(referencedMessage)}
                        <i>Click to see attachment</i>
                    {/if}
                </span>
                {#if hasReferencedMedia(referencedMessage)}
                    <span class="referenced-media-icon" aria-label="Referenced message contains media">
                        <Icon name="reply/attachment" width={20} />
                    </span>
                {/if}
            </div>
        {/if}
    </div>

{:else if messageState.messageIsFromDifferentGuild}
    <div class="referenced">
        <div class="referenced-arrow" />
        <div class="referenced-avatar">
            <Icon name="reply/deleted" width={12} />
        </div>
        <div
            class="referenced-content clickable"
            role="link"
            tabindex="0"
            aria-label="Jump to referenced message"
            title="Jump to referenced message"
            on:click|capture={jumpToReferencedMessage}
            on:keydown={handleReferencedMessageKeydown}
        >
            <i>This message was created in another server</i>
        </div>
    </div>
<!-- A missing referenced message is ambiguous: it may be deleted, uncaptured, or inaccessible. -->
{:else if message.reference && message.reference.messageId}
    <div class="referenced">
        <div class="referenced-arrow" />
        <div class="referenced-avatar">
            <Icon name="reply/deleted" width={12} />
        </div>
        <div class="referenced-content">
            <i>
                {message.reference.isDeleted === true
                    ? "Original message was deleted"
                    : "Original message is unavailable"}
            </i>
        </div>
    </div>
{/if}

<style>
    .referenced {
        display: flex;
        gap: 2px;
        align-items: center;
        min-width: 0;
        width: 100%;
    }

    .clickable {
        cursor: pointer;
    }

    .referenced-arrow {
        height: 14px;
        margin: 14px 0 4px 16px;
        border-left: 2px solid #4E5058;
        border-top: 2px solid #4E5058;
        border-radius: 8px 0 0 0;
        width: 35px;
    }

    .referenced-avatar {
        width: 16px;
        height: 16px;
        border-radius: 50%;

        /* style background for a missing referenced message */
        background-color: #1E1F22;
        color: #909399;
        display: grid;
        place-items: center;
    }

    .referenced-content {
        display: flex;
        flex: 1;
        align-items: center;
        gap: 5px;
        min-width: 0;
        max-width: min(100%, 300px);
        overflow: hidden;
        max-height: 21px;

        margin-top: 1px;
        margin-left: 3px;

        color: #b5b6b8;
        font-size: 0.9375rem;
        white-space: nowrap;
    }

    .referenced-text {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .referenced-text :global(.message-markdown),
    .referenced-text :global(.paragraph) {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .referenced-media-icon {
        flex: none;
        color: #dbdee1;
    }
    /* make emojis smaller, so they fit in the small referenced message space */
    .referenced-content :global(.message-emoji),
    .referenced-content :global(.twemoji) {
        width: 13px;
        height: 13px;
    }
</style>
