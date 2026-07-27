<script lang="ts">
    import { isDateDifferent } from "../js/helpers";
    import { fetchMessages } from "../js/stores/api";
    import { getGuildState } from "../js/stores/guildState.svelte";
    import { getLayoutState } from "../js/stores/layoutState.svelte";
    import DateSeparator from "./DateSeparator.svelte";
    import InfiniteScroll3 from "./InfiniteScroll3.svelte";
    import Pinned from "./Pinned.svelte";
    import Icon from "./icons/Icon.svelte";
    import ChannelIcon from "./menuchannels/ChannelIcon.svelte";
    import ChannelStart from "./message/ChannelStart.svelte";
    import Message from "./message/Message.svelte";

    interface MyProps {
        archiveRevision: number | null
    }

    let { archiveRevision }: MyProps = $props()

    function destroyThreadView() {
        guildState.changeThreadId(null)
        guildState.pushState()
    }

    const guildState = getGuildState()
    const layoutState = getLayoutState()

    let apiGuildId = $derived(guildState.guildId ? guildState.guildId : "000000000000000000000000")
    let apiThreadId = $derived(guildState.threadId)
    let isForumPost = $derived(
        guildState.channel?.type === "GuildForum"
        || guildState.channel?.type === "GuildMedia"
    )

    export async function fetchMessagesWrapper(direction: "before" | "after" | "around" | "first" | "last", messageId: string | null = null, limit: number) {
        return fetchMessages(apiGuildId, apiThreadId, direction, messageId, limit)
    }

    function replaceViewportState(messageId: string, offset: number) {
        return guildState.replaceViewportState("thread", messageId, offset)
    }
</script>

{#snippet channelStartSnippet(message)}
    <ChannelStart
        channelName={guildState.thread?.name ?? message.channelName}
        isThread={true}
        {isForumPost}
        messageAuthor={message.author}
    />
{/snippet}

{#snippet renderMessageSnippet2(message, previousMessage)}
    <div data-messageid={message._id}>
        {#if message._id === "first"}
            <div>thread start</div>
        {:else if message._id === "last"}
            <div>thread end</div>
        {:else}
            {#if isDateDifferent(previousMessage, message)}
                <DateSeparator messageId={message._id} />
            {/if}
            <Message
                {message}
                {previousMessage}
                originalPosterId={isForumPost ? guildState.thread?.ownerId : null}
            />
        {/if}
    </div>
{/snippet}


<div class="thread-wrapper" class:forum-post={isForumPost}>
    <div class="header-main">
        <div class="thread-name">
            {#if layoutState.mobile}
                <button class="hamburger-icon" onclick={layoutState.toggleSidePanel}>
                    <Icon name="other/hamburger" width={20} />
                </button>
            {/if}
            {#if guildState.thread?.name}
                <div class="thread-title">
                    {#if !isForumPost}
                        <ChannelIcon channel={guildState.thread} width={18} />
                    {/if}
                    <span>{guildState.thread.name}</span>
                </div>
                <div class="thread-status">
                    {#if guildState.thread.isPinned}<span>Pinned</span>{/if}
                    {#if guildState.thread.type === "GuildPrivateThread"}<span>Private</span>{/if}
                    {#if guildState.thread.isArchived}<span>Archived</span>{/if}
                    {#if guildState.thread.isLocked}<span>Locked</span>{/if}
                    {#if guildState.thread.isDeleted}<span class="danger">Deleted</span>{/if}
                </div>
            {:else}
                <span>Select a thread</span>
            {/if}
        </div>
        {#if !isForumPost}
            <div class="pin-wrapper">
                <button
                    class="pin-btn"
                    class:active={layoutState.threadpinnedshown}
                    aria-label="Pinned messages"
                    onclick={layoutState.toggleThreadPinned}
                >
                    <Icon name="systemmessage/pinned" width={20} />
                </button>
                {#if layoutState.threadpinnedshown}
                    <div class="pin-messages">
                        {#key guildState.threadMessageId}
                            <Pinned channelId={guildState.threadId} />
                        {/key}
                    </div>
                {/if}
            </div>
        {/if}
        <button class="close-thread" aria-label="Close post" onclick={destroyThreadView}>
            <Icon name="modal/x" width={20} />
        </button>
    </div>
    <div class="thread">
        <!-- TODO: support change of threadMessageId without rerender -->
        {#if apiThreadId}
            {#key apiThreadId}
                {#key guildState.threadMessageId}
                    <InfiniteScroll3
                        fetchMessages={fetchMessagesWrapper}
                        {archiveRevision}
                        scrollToMessageId={guildState.threadMessageId}
                        scrollOffset={guildState.threadMessageOffset}
                        onViewportChange={replaceViewportState}
                        snippetMessage={renderMessageSnippet2}
                        channelStartSnippet={channelStartSnippet}
                    />
                {/key}
            {/key}
        {/if}
    </div>
</div>


<style>
    .hamburger-icon {
        cursor: pointer;
        color: #b5bac1;
        margin-right: 10px;
        &:hover {
            color: #dbdee1;
        }
    }

    .pin-wrapper {
        position: relative;
        .pin-btn {
            display: grid;
            place-items: center;
            padding: 0;
            border: 0;
            background: transparent;
            cursor: pointer;
            color: #b5bac1;
            &:hover {
                color: #dbdee1;
            }
            &.active {
                color: white;
            }
        }
        .pin-messages {
            position: absolute;
            top: 30px;
            right: 0px;

            width: 400px;
            z-index: 500;
        }
    }

    .thread-wrapper {
        height: 100%;
        margin-left: 7px;
        background-color: #313338;
        display: flex;
        flex-direction: column;

        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        overflow: hidden;

        z-index: 101;
    }
    .thread-wrapper.forum-post {
        margin-left: 1px;
        border-left: 1px solid #20222599;
        border-radius: 0;
    }
    .header-main {
        min-height: 47px;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 5px 10px 5px 15px;
        box-sizing: border-box;
        gap: 5px;
        border-bottom: 1px solid #20222599;
    }

    .thread-name {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 14px;
        line-height: 18px;
        font-weight: 600;
        color: #F2F3F5;
        flex-grow: 3;
        min-width: 0;
        flex-wrap: wrap;
    }

    .thread-title,
    .thread-status {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
    }

    .thread-title span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .thread-status {
        gap: 4px;
        color: #b5bac1;
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .thread-status span {
        padding: 1px 5px;
        border-radius: 999px;
        background: #404249;
    }

    .thread-status .danger {
        background: #6d2c32;
        color: #ffd7da;
    }

    .close-thread {
        display: grid;
        place-items: center;
        padding: 3px;
        border: 0;
        background: transparent;
        color: #b5bac1;
        cursor: pointer;
    }

    .close-thread:hover {
        color: #f2f3f5;
    }

    .thread {
        overflow-y: auto;
        height: 100%;
    }

    .thread::-webkit-scrollbar-track {
        background-color: #2b2d31;
    }
    .thread::-webkit-scrollbar-corner {
        background-color: #646464;
    }

    .thread::-webkit-resizer {
        background-color: #666;
    }
    .thread::-webkit-scrollbar-track-piece {
        background-color:#313338;
    }
    .thread::-webkit-scrollbar {
        height: 3px;
        width: 14px;
    }
    .thread::-webkit-scrollbar-thumb {
        height: 50px;
        background-color: #1a1b1e;

        width: 5px;
        border-radius: 10px;

        /*left+right scrollbar padding magix*/
        background-clip: padding-box;
        border: 3px solid rgba(0, 0, 0, 0);
    }
</style>
