<script lang="ts">
    import { onDestroy, onMount, tick, type Snippet } from "svelte";
    import {debounce} from 'lodash-es';
    import { showJumpToPresent } from '../js/stores/settingsStore.svelte';
    import FeedLoadingSkeleton from './message/FeedLoadingSkeleton.svelte';

    interface MyProps {
        fetchMessages: (direction: "before" | "after" | "around" | "first" | "last", messageId: string, limit: number) => Promise<any>
        snippetMessage: Snippet
        scrollToMessageId: string
        scrollOffset?: number | null
        archiveRevision?: number | null
        onViewportChange?: (messageId: string, offset: number) => void | Promise<void>
        emptySnippet?: Snippet
        channelStartSnippet?: Snippet
    }

    let { fetchMessages, snippetMessage, scrollToMessageId, scrollOffset = null, archiveRevision = null, onViewportChange, emptySnippet, channelStartSnippet}: MyProps = $props();

    let SHOWDEBUG = false
    let scrollContainer: HTMLDivElement
    let scrollContent: HTMLDivElement
    let messages = $state<any[]>([])
    let prevPage = $state<string | null>(null)
    let nextPage = $state<string | null>(null)
    let loadingDirection = $state<"initial" | "before" | "after" | null>("initial")
    let scrollDisabled = $state(true)
    let isLoading = $state(true)
    let stickToBottom = scrollToMessageId === "last"
    let bottomResizeObserver: ResizeObserver | null = null
    let viewportRestoreObserver: ResizeObserver | null = null
    let isInitialized = $state(false)
    let archiveRefreshInProgress = false
    let lastArchiveRevision: number | null = null
    let jumpToPresentVisible = $state(false)
    let jumpToPresentInProgress = $state(false)

    const MSGCOUNT_INITIAL = 50
    const MSGCOUNT_MORE = 25
    const PRESENT_SCROLL_THRESHOLD = 4


    let preMessagesMapping = new Map<string, any>()  // id (current) -> message (previous)
    async function handleScroll(event: Event) {
        updatePresentState()
        debouncedPersistViewport()

        if (loadingDirection !== null) {
            return
        }
        if (scrollDisabled) {
            return
        }
        // if at the top of scroll container, load more messages before
        if (prevPage && scrollContainer.scrollTop === 0) {
            console.log('top reached')
            loadingDirection = "before"
            scrollDisabled = true
            const bottomOffset = scrollContainer.scrollHeight - scrollContainer.clientHeight
            try {
                const moreMessagesObj = await fetchMessages("before", prevPage, MSGCOUNT_MORE)
                const moreMessages = moreMessagesObj.messages

                // --- link previous messages ---
                if (messages.length > 0 && moreMessages.length > 0) {
                    // link the first message of the last batch to the last message of the previous batch
                    preMessagesMapping.set(messages[0]._id, moreMessages[moreMessages.length - 1])
                }
                for (let i = 1; i < moreMessages.length; i++) {
                    preMessagesMapping.set(moreMessages[i]._id, moreMessages[i - 1])
                }
                // --- end of previous message linking ---

                messages = [...moreMessages, ...messages]
                prevPage = moreMessagesObj.prevPage
                loadingDirection = null
                await tick();  // wait for render

                // restore the same bottom offset
                let newScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight - bottomOffset
                scrollContainer.scrollTop = newScrollTop
            }
            catch (error) {
                console.error("Unable to load older messages", error)
            }
            finally {
                loadingDirection = null
                scrollDisabled = false
            }
            return
        }
        // if at the bottom of scroll container, load more messages after
        if (nextPage && scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1) {
            console.log('bottom reached')
            loadingDirection = "after"
            scrollDisabled = true
            try {
                const moreMessagesObj = await fetchMessages("after", nextPage, MSGCOUNT_MORE)
                const moreMessages = moreMessagesObj.messages

                // --- link previous messages ---
                if (messages.length > 0 && moreMessages.length > 0) {
                    // link the last message of the last batch to the first message of the next batch
                    preMessagesMapping.set(moreMessages[0]._id, messages[messages.length - 1])
                }
                for (let i = 1; i < moreMessages.length; i++) {
                    preMessagesMapping.set(moreMessages[i]._id, moreMessages[i - 1])
                }
                // --- end of previous message linking ---

                messages = [...messages, ...moreMessages]
                nextPage = moreMessagesObj.nextPage
                loadingDirection = null
                await tick()
                updatePresentState()
                debouncedPersistViewport()
            }
            catch (error) {
                console.error("Unable to load newer messages", error)
            }
            finally {
                loadingDirection = null
                scrollDisabled = false
            }
        }
    }

    function scrollToMessageIdF(messageId: string, offset: number | null = null) {
        if (!scrollContainer) {
            return
        }
        if (messageId === "last") {
            scrollContainer.scrollTop = scrollContainer.scrollHeight
            return
        }
        const messageElement = scrollContainer.querySelector<HTMLElement>(`[data-messageid="${messageId}"]`)
        if (messageElement) {
            if (offset === null) {
                messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            else {
                scrollContainer.scrollTop += messageElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - offset
            }
        }
    }

    function releaseBottomLock() {
        stickToBottom = false
        bottomResizeObserver?.disconnect()
        bottomResizeObserver = null
        viewportRestoreObserver?.disconnect()
        viewportRestoreObserver = null
    }

    function updatePresentState() {
        if (!isInitialized || !scrollContainer) {
            jumpToPresentVisible = false
            return
        }

        const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop
        jumpToPresentVisible = nextPage !== null || distanceFromBottom > PRESENT_SCROLL_THRESHOLD
    }

    function enableBottomLock() {
        stickToBottom = true
        bottomResizeObserver?.disconnect()
        bottomResizeObserver = null

        if (typeof ResizeObserver !== "undefined") {
            bottomResizeObserver = new ResizeObserver(() => {
                if (stickToBottom) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight
                    updatePresentState()
                }
            })
            bottomResizeObserver.observe(scrollContent)
        }
    }

    function enableViewportRestoreLock() {
        viewportRestoreObserver?.disconnect()
        viewportRestoreObserver = null

        if (scrollToMessageId === "last" || scrollOffset === null || typeof ResizeObserver === "undefined") {
            return
        }

        viewportRestoreObserver = new ResizeObserver(() => {
            scrollToMessageIdF(scrollToMessageId, scrollOffset)
        })
        viewportRestoreObserver.observe(scrollContent)
    }

    async function jumpToPresent() {
        if (jumpToPresentInProgress || !scrollContainer) {
            return
        }

        jumpToPresentInProgress = true
        scrollDisabled = true
        try {
            const latestMessages = await fetchMessages("last", "last", MSGCOUNT_INITIAL)
            messages = latestMessages.messages
            prevPage = latestMessages.prevPage
            nextPage = latestMessages.nextPage
            rebuildPreviousMessageMapping()
            await tick()

            enableBottomLock()
            scrollContainer.scrollTop = scrollContainer.scrollHeight
            jumpToPresentVisible = false
            await onViewportChange?.("last", 0)
        }
        catch (error) {
            console.error("Unable to jump to the latest messages", error)
            updatePresentState()
        }
        finally {
            scrollDisabled = false
            jumpToPresentInProgress = false
        }
    }

    function rebuildPreviousMessageMapping() {
        preMessagesMapping.clear()
        for (let i = 1; i < messages.length; i++) {
            preMessagesMapping.set(messages[i]._id, messages[i - 1])
        }
    }

    function getScrollAnchor(): { messageId: string, offset: number } | null {
        const containerTop = scrollContainer.getBoundingClientRect().top
        const messageElements = Array.from(scrollContainer.querySelectorAll<HTMLElement>(".message[data-messageid]"))
        const firstVisibleMessage = messageElements.find((element) => element.getBoundingClientRect().bottom > containerTop)
        if (!firstVisibleMessage?.dataset.messageid) {
            return null
        }
        return {
            messageId: firstVisibleMessage.dataset.messageid,
            offset: firstVisibleMessage.getBoundingClientRect().top - containerTop
        }
    }

    function persistViewport() {
        if (!isInitialized || !scrollContainer || !onViewportChange) {
            return
        }

        const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop
        if (nextPage === null && distanceFromBottom <= PRESENT_SCROLL_THRESHOLD) {
            void onViewportChange("last", 0)
            return
        }

        const anchor = getScrollAnchor()
        if (anchor) {
            void onViewportChange(anchor.messageId, Math.round(anchor.offset))
        }
    }

    const debouncedPersistViewport = debounce(persistViewport, 250)

    async function refreshLoadedMessages() {
        if (!isInitialized || archiveRefreshInProgress || !scrollContainer) {
            return
        }

        archiveRefreshInProgress = true
        try {
            const distanceFromBottom = scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop
            const wasAtBottom = distanceFromBottom <= PRESENT_SCROLL_THRESHOLD
            const anchor = wasAtBottom ? null : getScrollAnchor()
            const fallbackMessage = messages[Math.floor(messages.length / 2)]?._id ?? scrollToMessageId
            const refreshed = await fetchMessages(
                wasAtBottom ? "last" : "around",
                wasAtBottom ? "last" : anchor?.messageId ?? fallbackMessage,
                Math.max(MSGCOUNT_INITIAL, messages.length)
            )

            messages = refreshed.messages
            prevPage = refreshed.prevPage
            nextPage = refreshed.nextPage
            rebuildPreviousMessageMapping()
            await tick()

            if (wasAtBottom) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
            else if (anchor) {
                const anchorElement = scrollContainer.querySelector<HTMLElement>(`[data-messageid="${anchor.messageId}"]`)
                if (anchorElement) {
                    scrollContainer.scrollTop += anchorElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - anchor.offset
                }
            }
            updatePresentState()
            debouncedPersistViewport()
        }
        catch (error) {
            console.error("Unable to refresh the visible message window", error)
        }
        finally {
            archiveRefreshInProgress = false
            if (archiveRevision !== lastArchiveRevision) {
                void refreshForArchiveRevision()
            }
        }
    }

    async function refreshForArchiveRevision() {
        if (!isInitialized || archiveRevision === null || archiveRefreshInProgress || archiveRevision === lastArchiveRevision) {
            return
        }
        lastArchiveRevision = archiveRevision
        await refreshLoadedMessages()
    }

    $effect(() => {
        if (archiveRevision !== null && lastArchiveRevision === null) {
            lastArchiveRevision = archiveRevision
            return
        }
        void refreshForArchiveRevision()
    })

    onMount(async () => {
        loadingDirection = "initial"
        try {
            const newMessages = await fetchMessages("around", scrollToMessageId, MSGCOUNT_INITIAL)
            messages = newMessages.messages

            rebuildPreviousMessageMapping()

            prevPage = newMessages.prevPage
            nextPage = newMessages.nextPage
            loadingDirection = null
            await tick();  // wait for render

            if (stickToBottom) {
                enableBottomLock()
            }
            else if (scrollOffset !== null) {
                enableViewportRestoreLock()
            }

            scrollToMessageIdF(scrollToMessageId, scrollOffset)
            setTimeout(() => {
                scrollToMessageIdF(scrollToMessageId, scrollOffset)
            }, 200)
            setTimeout(() => {
                scrollToMessageIdF(scrollToMessageId, scrollOffset)
                scrollDisabled = false
                persistViewport()
            }, 500)
        }
        catch (error) {
            console.error("Unable to load messages", error)
            scrollDisabled = false
        }
        finally {
            loadingDirection = null
            isLoading = false
            isInitialized = true
            updatePresentState()
        }
    })

    onDestroy(() => {
        bottomResizeObserver?.disconnect()
        viewportRestoreObserver?.disconnect()
        debouncedPersistViewport.cancel()
    })
</script>

{#if emptySnippet && !isLoading && messages.length === 0}
    {@render emptySnippet()}
{:else}
    <div class="wrapper">
        {#if SHOWDEBUG}
            <small class="debug-container">scrollToMessageId {scrollToMessageId}</small>
        {/if}
        <div
            class="scroll-container"
            onscroll={handleScroll}
            onwheel={releaseBottomLock}
            ontouchstart={releaseBottomLock}
            onpointerdown={releaseBottomLock}
            bind:this={scrollContainer}
        >
            <div class="scroll-content" bind:this={scrollContent}>
                {#if loadingDirection === "initial"}
                    <FeedLoadingSkeleton fillViewport={true} />
                {:else if loadingDirection === "before"}
                    <FeedLoadingSkeleton />
                {/if}
                {#if !prevPage && channelStartSnippet && messages && messages.length > 0}
                    {@render channelStartSnippet(messages[0])}
                {/if}
                {#each messages as message (message._id)}
                    <div class="message" data-messageid={message._id}>
                        {@render snippetMessage(message, preMessagesMapping.get(message._id, null))}
                    </div>
                {/each}
                {#if loadingDirection === "after"}
                    <FeedLoadingSkeleton />
                {/if}
            </div>
        </div>
        {#if $showJumpToPresent && jumpToPresentVisible}
            <div class="jump-to-present" role="status">
                <span>You're Viewing Older Messages</span>
                <button type="button" onclick={jumpToPresent} disabled={jumpToPresentInProgress}>
                    {jumpToPresentInProgress ? "Loading…" : "Jump To Present"}
                </button>
            </div>
        {/if}
    </div>
{/if}



<style>
    .wrapper {
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    .scroll-content {
        min-height: 100%;
        display: flex;
        flex-direction: column;
    }
    .scroll-container {
        flex: 1;
        position: relative;
        z-index: 0;
        overflow-y: auto;
        padding-bottom: 16px;
        scroll-padding-bottom: 16px;
    }
    .jump-to-present {
        position: absolute;
        z-index: 2;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        width: max-content;
        max-width: calc(100% - 48px);
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 8px 10px 8px 16px;
        border: 1px solid #4e5058;
        border-radius: 12px;
        background-color: #3f4147;
        box-shadow: 0 4px 14px rgb(0 0 0 / 28%);
        color: #f2f3f5;
        font-size: 14px;
        font-weight: 600;
    }
    .jump-to-present button {
        min-height: 36px;
        padding: 0 16px;
        border: 0;
        border-radius: 8px;
        background-color: #5865f2;
        color: #fff;
        font: inherit;
        cursor: pointer;
    }
    .jump-to-present button:hover:not(:disabled) {
        background-color: #4752c4;
    }
    .jump-to-present button:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
    }
    .jump-to-present button:disabled {
        cursor: wait;
        opacity: 0.7;
    }
    @media (max-width: 600px) {
        .jump-to-present {
            right: 12px;
            left: 12px;
            transform: none;
            width: auto;
            gap: 8px;
        }
    }

    .scroll-container::-webkit-scrollbar-track {
        background-color: #2b2d31;
    }
    .scroll-container::-webkit-scrollbar-corner {
        background-color: #646464;
    }

    .scroll-container::-webkit-resizer {
        background-color: #666;
    }
    .scroll-container::-webkit-scrollbar-track-piece {
        background-color:#313338;
    }
    .scroll-container::-webkit-scrollbar {
    height: 3px;
        width: 14px;
    }
    .scroll-container::-webkit-scrollbar-thumb {
        height: 50px;
        background-color: #1a1b1e;

        width: 5px;
        border-radius: 10px;

        /*left+right scrollbar padding magix*/
        background-clip: padding-box;
        border: 3px solid rgba(0, 0, 0, 0);
    }
</style>
