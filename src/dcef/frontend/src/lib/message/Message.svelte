<script lang="ts">
    import type { InvitePreview, Message } from "../../js/interfaces";
    import MessageSystemNotification from "./MessageSystemNotification.svelte";
    import MessageOrdinary from "./MessageOrdinary.svelte";
    import { MessageType } from "./messageEnums";
    import { snowflakeToDate } from "../../js/time";
    import MessageAutoModerationAction from "./MessageAutoModerationAction.svelte";
    import MesssageSpoilerHandler from "../MesssageSpoilerHandler.svelte";
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import { getLayoutState } from "../../js/stores/layoutState.svelte";
    import { getSearchState } from "../search/searchState.svelte";

    interface MyProps {
        message: Message;
        previousMessage: Message | null;
        mergeMessages?: boolean;
        showJump?: boolean;
        originalPosterId?: string | null;
    }
    let {
        message,
        previousMessage,
        mergeMessages=true,
        showJump=false,
        originalPosterId=null
    }: MyProps = $props();
    const isDebugModeEnabled = typeof localStorage !== "undefined" && localStorage.getItem("DEBUG") === "1";

    function isSystemNotification(messageType: string): boolean {
        return [
            "RecipientAdd", "RecipientRemove", "Call", "ChannelNameChange", "ChannelIconChange",
            "ChannelPinnedMessage", "GuildMemberJoin", "ThreadCreated", MessageType.GuildBoost,
            MessageType.GuildBoostTier1, MessageType.GuildBoostTier2, MessageType.GuildBoostTier3,
        ].includes(messageType)
    }

    function shouldMergeMessages(previousMessage: Message | null, message: Message, allowMerging: boolean): boolean {
        if (!allowMerging || !previousMessage) {
            return false
        }
        if (previousMessage.author?._id !== message.author?._id || previousMessage.channelId !== message.channelId) {
            return false
        }
        if (snowflakeToDate(message._id).getTime() - snowflakeToDate(previousMessage._id).getTime() > 7 * 60 * 1000) {
            return false
        }
        if (message.type === "Reply") {
            return false
        }
        if (previousMessage.type !== message.type && !(previousMessage.type === "Reply" && message.type === "Default")) {
            return false
        }
        return !isSystemNotification(message.type) && previousMessage.author.nickname === message.author.nickname
    }

    function getMessageState(message: Message, previousMessage: Message | null) {
        function invitePreviews(message: Message): InvitePreview[] {
            const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([\w-]+)/gi;
            const archivedInvites = new Map(
                (message.invites ?? []).map(invite => [invite.code, invite])
            );
            const previews: InvitePreview[] = [];
            const seen = new Set<string>();

            for (const match of message.content[0].content.matchAll(inviteRegex)) {
                const code = match[1];
                if (!seen.has(code)) {
                    previews.push(archivedInvites.get(code) ?? { code });
                    seen.add(code);
                }
            }

            return previews;
        }

        function hasMedia(message: Message | null): boolean {
            return Boolean(
                message &&
                (
                    (message.attachments?.length ?? 0) > 0 ||
                    (message.embeds?.length ?? 0) > 0 ||
                    (message.stickers?.length ?? 0) > 0
                )
            );
        }

        function messageContentIsLink(messageContent: string): boolean {
            const regex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/g
            return regex.test(messageContent)
        }

        function messageContentLinkIsSpoilered(messageContent: string): boolean {
            const regex = /\|\|.*?https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*).*?\|\|/g
            return regex.test(messageContent)
        }

        function messageIsFromDifferentGuild(message: Message): boolean {
            if (!message.reference) {
                return false
            }
            if (message.reference.guildId === null) {
                // bug in older exports where guildId is null in referenced messages, but message.reference.channelId and message.reference.messageId is set correctly
                // assume it's from the same guild, so return false
                return false
            }
            return message.reference.guildId !== message.guildId
        }

        return {
            get isSystemNotification(): boolean {
                return isSystemNotification(message.type)
            },
            get invites(): InvitePreview[] {
                return invitePreviews(message)
            },
            get shouldMerge(): boolean {
                return shouldMergeMessages(previousMessage, message, mergeMessages)
            },
            get followsMedia(): boolean {
                return shouldMergeMessages(previousMessage, message, mergeMessages) && hasMedia(previousMessage)
            },
            get messageContentIsLink(): boolean {
                return messageContentIsLink(message.content[0].content)
            },
            get messageContentLinkIsSpoilered(): boolean {
                return messageContentLinkIsSpoilered(message.content[0].content)
            },
            get messageIsFromDifferentGuild(): boolean {
                return messageIsFromDifferentGuild(message)
            }
        }
    }

    const guildState = getGuildState()
    const layoutState = getLayoutState()
    const searchState = getSearchState();


    async function jumpToMessage(){
        await guildState.comboSetGuildChannelMessage(message.guildId, message.channelId, message._id)
        await guildState.pushState()
        if (layoutState.mobile) {
            searchState.hideSearch()
        }
    }

    function printMessageToConsole() {
        console.log(JSON.stringify(message, null, 2))
    }

    const messageState = getMessageState(message, previousMessage)
</script>


<MesssageSpoilerHandler>

    <div
        class="message"
        class:jumpable={showJump}
        class:notgrouped={!messageState.shouldMerge}
        class:reply={message.type === "Reply"}
        class:followsmedia={messageState.followsMedia}
        data-id={message._id}
        class:ismobile={layoutState.mobile}
    >
        <button class="jump-btn" type="button" onclick={jumpToMessage}>Jump</button>
        {#if message.type == "24"}
            <MessageAutoModerationAction message={message} messageState={messageState} />
        {:else if messageState.isSystemNotification}
            <MessageSystemNotification message={message} />
        {:else}
            <MessageOrdinary {message} {messageState} {originalPosterId} />
        {/if}
        <!-- small debugging helper - show it using `localStorage.setItem("DEBUG", "1")` -->
        {#if isDebugModeEnabled}
            <button class="debug-btn" type="button" onclick={printMessageToConsole}>Print message object to devtools (F12)</button>
        {/if}
    </div>
</MesssageSpoilerHandler>

<style>
    .message {
        margin-top: 0;
        padding: 2px 20px;
        position: relative;

        &:not(.notgrouped) {
            padding-top: 3px;
            padding-bottom: 3px;
        }

        &.notgrouped {
            margin-top: 17px;
        }

        &.followsmedia {
            margin-top: 5px;
        }

        &.notgrouped.reply {
            margin-top: 6px;
        }

        .jump-btn {
            display: none;
        }

        .debug-btn {
            margin-top: 8px;
            padding: 4px 8px;
            background-color: #2b2d31;
            color: #b5bac1;
            font-size: 12px;
            font-weight: 500;
            border-radius: 3px;
            cursor: pointer;
        }
    }

    .message.jumpable {
        .jump-btn {
            cursor: pointer;
            display: none;
            position: absolute;
            top: -10px;
            right: 5px;
            padding: 4px;

            background-color: #1e1f22;
            color: #b5bac1;
            font-size: 12px;
            font-weight: 500;
            border-radius: 3px;
        }
        &:hover .jump-btn {
            display: block;
        }
    }

    .message.jumpable.ismobile .jump-btn {
        display: block;
    }
</style>
