<script lang="ts">
    import { checkUrl } from "../js/helpers";
    import type { Asset, Channel, ForumTag, Message } from "../js/interfaces";
    import { fetchMessages } from "../js/stores/api";
    import { getGuildState } from "../js/stores/guildState.svelte";
    import { getLayoutState } from "../js/stores/layoutState.svelte";
    import ChannelIcon from "./menuchannels/ChannelIcon.svelte";
    import MessageMarkdown from "./message/MessageMarkdown.svelte";

    const guildState = getGuildState();
    const layoutState = getLayoutState();

    let forum: Channel | null = $derived(guildState.channel);
    let posts: Channel[] = $derived(forum?.threads ?? []);
    let starters = $state<Record<string, Message | null>>({});
    let query = $state("");
    let selectedTags = $state<string[]>([]);
    let sortMode = $state<"activity" | "creation">("activity");
    let viewMode = $state<"list" | "gallery">("list");
    let configuredForumId = $state<string | null>(null);
    const loadingStarters = new Set<string>();

    let tagsById: Map<string, ForumTag> = $derived.by(() =>
        new Map(
            (forum?.availableTags ?? [])
                .filter((tag: ForumTag): tag is ForumTag & { id: string } => Boolean(tag.id))
                .map((tag: ForumTag & { id: string }): [string, ForumTag] => [tag.id, tag])
        )
    );

    let filteredPosts: Channel[] = $derived.by(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return posts
            .filter((post) => {
                if (selectedTags.length > 0 &&
                    !selectedTags.every((tagId) => post.appliedTags?.includes(tagId))) {
                    return false;
                }
                if (!normalizedQuery) {
                    return true;
                }
                const starter = starters[post._id] ?? null;
                const haystack = [
                    post.name,
                    post.starterContent,
                    excerpt(starter),
                    post.starterAuthorName,
                    authorName(starter),
                    ...(post.appliedTags ?? []).map((tagId) => tagsById.get(tagId)?.name)
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLocaleLowerCase();
                return haystack.includes(normalizedQuery);
            })
            .sort((left, right) => {
                if (Boolean(left.isPinned) !== Boolean(right.isPinned)) {
                    return left.isPinned ? -1 : 1;
                }
                const leftDate = sortMode === "creation"
                    ? creationTimestamp(left)
                    : activityTimestamp(left);
                const rightDate = sortMode === "creation"
                    ? creationTimestamp(right)
                    : activityTimestamp(right);
                return rightDate - leftDate || left.name.localeCompare(right.name);
            });
    });

    $effect(() => {
        const nextForumId = forum?._id ?? null;
        if (nextForumId !== configuredForumId) {
            configuredForumId = nextForumId;
            query = "";
            selectedTags = [];
            sortMode = forum?.defaultSortOrder === 1 ? "creation" : "activity";
            viewMode = forum?.type === "GuildMedia" || forum?.defaultForumLayout === 2
                ? "gallery"
                : "list";
        }
    });

    $effect(() => {
        const guildId = guildState.guildId;
        for (const post of posts) {
            if (!Object.hasOwn(starters, post._id) && !loadingStarters.has(post._id)) {
                void loadStarter(guildId, post._id);
            }
        }
    });

    async function loadStarter(guildId: string | null, postId: string) {
        loadingStarters.add(postId);
        try {
            const page = await fetchMessages(guildId, postId, "first", "first", 1);
            const starter = Array.isArray(page?.messages) ? (page.messages[0] ?? null) : null;
            starters = { ...starters, [postId]: starter };
        }
        finally {
            loadingStarters.delete(postId);
        }
    }

    async function openPost(post: Channel) {
        await guildState.changeThreadId(post._id, "first");
        if (layoutState.mobile) {
            layoutState.hideSidePanel();
        }
        await guildState.pushState();
    }

    function toggleTag(tagId: string) {
        selectedTags = selectedTags.includes(tagId)
            ? selectedTags.filter((selected) => selected !== tagId)
            : [...selectedTags, tagId];
    }

    function timestamp(value: string | null | undefined): number {
        if (!value) {
            return 0;
        }
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    function creationTimestamp(post: Channel): number {
        return timestamp(post.createdAt ?? post.starterTimestamp);
    }

    function snowflakeTimestamp(value: string | null | undefined): number {
        if (!value || !/^\d+$/.test(value)) {
            return 0;
        }
        try {
            return Number((BigInt(value) >> 22n) + 1420070400000n);
        }
        catch {
            return 0;
        }
    }

    function activityTimestamp(post: Channel): number {
        return snowflakeTimestamp(post.lastMessageId)
            || timestamp(post.starterTimestamp ?? post.createdAt);
    }

    function formatDate(value: number): string | null {
        if (!value) {
            return null;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        const ageDays = Math.floor((Date.now() - parsed.getTime()) / 86_400_000);
        if (ageDays === 0) {
            return "Today";
        }
        if (ageDays === 1) {
            return "Yesterday";
        }
        if (ageDays <= 30) {
            return `${ageDays}d ago`;
        }
        if (ageDays < 365) {
            return ">30d ago";
        }
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(parsed);
    }

    function authorName(message: Message | null): string | null {
        return message?.author?.nickname || message?.author?.name || null;
    }

    function excerpt(message: Message | null): string | null {
        const text = message?.content
            ?.map((part) => part.content)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        return text || null;
    }

    function reactionCount(message: Message | null): number {
        const reactions = message?.emotes?.length
            ? message.emotes
            : (message?.reactions as unknown as Array<{ count?: number }> | null);
        return reactions?.reduce((total, reaction) => total + (reaction.count ?? 0), 0) ?? 0;
    }

    function reactionEmoji(message: Message | null): string {
        const reactions = message?.emotes?.length
            ? message.emotes
            : (message?.reactions as unknown as Array<{
                emoji?: { unicode?: string; name?: string }
            }> | null);
        return reactions?.[0]?.emoji?.unicode
            || reactions?.[0]?.emoji?.name
            || forum?.defaultReactionEmoji?.emojiName
            || "♥";
    }

    function thumbnail(message: Message | null): Asset | null {
        const attachment = message?.attachments?.find((asset) => asset.type === "image");
        if (attachment) {
            return attachment;
        }
        for (const embed of message?.embeds ?? []) {
            const image = embed.thumbnail ?? embed.image ?? embed.images?.[0];
            if (image) {
                return image;
            }
        }
        return null;
    }

    function thumbnailUrl(post: Channel, message: Message | null): string | null {
        return post.starterThumbnailUrl ?? (thumbnail(message) ? checkUrl(thumbnail(message)!) : null);
    }

    function replyCount(post: Channel): number {
        return post.reportedMessageCount
            ?? Math.max((post.capturedMessageCount ?? post.msg_count) - 1, 0);
    }

    function formatDuration(minutes: number): string {
        if (minutes % 1440 === 0) {
            const days = minutes / 1440;
            return `${days} ${days === 1 ? "day" : "days"}`;
        }
        if (minutes % 60 === 0) {
            const hours = minutes / 60;
            return `${hours} ${hours === 1 ? "hour" : "hours"}`;
        }
        return `${minutes} minutes`;
    }

    function hideBrokenThumbnail(event: Event) {
        (event.currentTarget as HTMLImageElement).hidden = true;
    }
</script>

<div class="forum">
    {#if forum?.topic}
        <div class="forum-topic">
            <MessageMarkdown content={forum.topic} />
        </div>
    {/if}

    {#if posts.length > 0}
        <div class="forum-search" aria-label="Search captured forum posts">
            <label class="search">
                <span class="sr-only">Search captured posts</span>
                <span class="search-icon" aria-hidden="true"></span>
                <input
                    type="search"
                    placeholder="Search captured posts…"
                    value={query}
                    oninput={(event) => query = event.currentTarget.value}
                />
            </label>
            <span class="read-only-badge">Read-only archive</span>
        </div>

        <div class="forum-controls">
            <details class="sort-view">
                <summary><span aria-hidden="true">↕</span> Sort &amp; View</summary>
                <div class="sort-view-menu">
                    <span class="menu-label">Sort posts by</span>
                    <button
                        class:active={sortMode === "activity"}
                        onclick={() => sortMode = "activity"}
                    >Latest activity</button>
                    <button
                        class:active={sortMode === "creation"}
                        onclick={() => sortMode = "creation"}
                    >Creation date</button>
                    <span class="menu-label">View as</span>
                    <button
                        class:active={viewMode === "list"}
                        onclick={() => viewMode = "list"}
                    >List</button>
                    <button
                        class:active={viewMode === "gallery"}
                        onclick={() => viewMode = "gallery"}
                    >Gallery</button>
                </div>
            </details>
            <div class="coverage">
                {filteredPosts.length} of {posts.length} captured
                {posts.length === 1 ? "post" : "posts"}
            </div>
        </div>

        {#if forum?.availableTags?.length}
            <div class="tag-filters" aria-label="Filter posts by tag">
                {#each forum.availableTags as tag}
                    {#if tag.id}
                        <button
                            class:active={selectedTags.includes(tag.id)}
                            aria-pressed={selectedTags.includes(tag.id)}
                            onclick={() => toggleTag(tag.id!)}
                        >
                            {#if tag.emojiName}<span>{tag.emojiName}</span>{/if}
                            {tag.name}
                        </button>
                    {/if}
                {/each}
            </div>
        {/if}

        {#if forum?.requiresTag || forum?.defaultAutoArchiveDurationMinutes}
            <div class="forum-note">
                {#if forum.requiresTag}<span>This forum requires tags</span>{/if}
                {#if forum.defaultAutoArchiveDurationMinutes}
                    <span>
                        Posts auto-archive after
                        {formatDuration(forum.defaultAutoArchiveDurationMinutes)}
                    </span>
                {/if}
            </div>
        {/if}

        {#if filteredPosts.length > 0}
            <div
                class="post-list"
                class:gallery={viewMode === "gallery"}
                aria-label={`${forum?.name ?? "Forum"} posts`}
            >
                {#each filteredPosts as post (post._id)}
                    {@const activity = formatDate(activityTimestamp(post) || creationTimestamp(post))}
                    {@const starter = starters[post._id] ?? null}
                    {@const starterAuthor = post.starterAuthorName ?? authorName(starter)}
                    {@const starterExcerpt = post.starterContent ?? excerpt(starter)}
                    {@const reactions = reactionCount(starter)}
                    {@const replies = replyCount(post)}
                    {@const previewUrl = thumbnailUrl(post, starter)}
                    <button
                        class="post-card"
                        class:selected={post._id === guildState.threadId}
                        class:deleted={post.isDeleted}
                        onclick={() => openPost(post)}
                    >
                        <div class="post-content">
                            <div class="post-heading">
                                <span class="post-name">{post.name}</span>
                                {#if post.isPinned}<span class="status pinned">Pinned</span>{/if}
                            </div>

                            {#if starterAuthor || starterExcerpt}
                                <div class="post-excerpt">
                                    {#if starterAuthor}<strong>{starterAuthor}:</strong>{/if}
                                    {#if starterExcerpt}<span>{starterExcerpt}</span>{/if}
                                </div>
                            {/if}

                            {#if post.appliedTags?.length}
                                <div class="post-tags">
                                    {#each post.appliedTags as tagId}
                                        {@const tag = tagsById.get(tagId)}
                                        <span class="post-tag">
                                            {#if tag?.emojiName}<span>{tag.emojiName}</span>{/if}
                                            {tag?.name ?? tagId}
                                        </span>
                                    {/each}
                                </div>
                            {/if}

                            <div class="post-meta">
                                {#if reactions > 0}
                                    <span class="reaction">{reactionEmoji(starter)} {reactions}</span>
                                {/if}
                                <span class="reply-count">
                                    <span class="reply-icon" aria-hidden="true"></span>
                                    {replies}
                                </span>
                                {#if activity}<span class="separator">•</span><span>{activity}</span>{/if}
                                {#if post.isArchived}<span class="status">Archived</span>{/if}
                                {#if post.isLocked}<span class="status">Locked</span>{/if}
                                {#if post.isDeleted}<span class="status danger">Deleted</span>{/if}
                            </div>
                        </div>

                        {#if previewUrl}
                            <img
                                class="post-thumbnail"
                                src={previewUrl}
                                alt=""
                                loading="lazy"
                                onerror={hideBrokenThumbnail}
                            />
                        {/if}
                    </button>
                {/each}
            </div>
        {:else}
            <div class="empty-filter">No captured posts match these filters.</div>
        {/if}
    {:else}
        <div class="empty-forum">
            {#if forum}
                <ChannelIcon channel={forum} width={32} />
            {/if}
            <strong>No captured posts yet</strong>
            <span>Open posts in Discord while passive capture is running to archive them here.</span>
        </div>
    {/if}
</div>

<style>
    .forum {
        height: 100%;
        overflow-y: auto;
        box-sizing: border-box;
        padding: 18px;
        background: #313338;
        color: #dbdee1;
    }

    .forum-topic {
        margin: 0 0 14px;
        padding: 12px 14px;
        border-radius: 8px;
        background: #2b2d31;
        color: #b5bac1;
        line-height: 1.4;
    }

    .forum-search {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 58px;
        box-sizing: border-box;
        margin-bottom: 14px;
        padding: 10px 12px;
        border: 1px solid #3f4147;
        border-radius: 8px;
        background: #2b2d31;
    }

    .search {
        position: relative;
        flex: 1 1 240px;
        min-width: 0;
    }

    .search input {
        width: 100%;
        min-height: 38px;
        box-sizing: border-box;
        padding: 7px 10px 7px 38px;
        border: 1px solid transparent;
        border-radius: 5px;
        outline: none;
        background: transparent;
        color: #dbdee1;
        font-size: 16px;
        font-weight: 500;
    }

    .search input::placeholder {
        color: #949ba4;
    }

    .search input:focus {
        border-color: #5865f2;
        background: #1e1f22;
    }

    .search-icon {
        position: absolute;
        top: 50%;
        left: 12px;
        z-index: 1;
        width: 13px;
        height: 13px;
        box-sizing: border-box;
        border: 2px solid #b5bac1;
        border-radius: 50%;
        transform: translateY(-58%);
        pointer-events: none;
    }

    .search-icon::after {
        content: "";
        position: absolute;
        right: -5px;
        bottom: -3px;
        width: 6px;
        height: 2px;
        border-radius: 2px;
        background: #b5bac1;
        transform: rotate(45deg);
    }

    .read-only-badge {
        flex: 0 0 auto;
        padding: 7px 10px;
        border-radius: 5px;
        background: #404249;
        color: #dbdee1;
        font-size: 12px;
        font-weight: 600;
    }

    .forum-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
    }

    .sort-view {
        position: relative;
        flex: 0 0 auto;
    }

    .sort-view summary {
        padding: 8px 13px;
        border: 1px solid #3f4147;
        border-radius: 999px;
        background: #35373c;
        color: #dbdee1;
        cursor: pointer;
        font-size: 14px;
        list-style: none;
        user-select: none;
    }

    .sort-view summary::-webkit-details-marker {
        display: none;
    }

    .sort-view[open] summary {
        background: #404249;
    }

    .sort-view-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        z-index: 20;
        display: grid;
        min-width: 190px;
        box-sizing: border-box;
        padding: 8px;
        border: 1px solid #1e1f22;
        border-radius: 8px;
        background: #111214;
        box-shadow: 0 8px 20px rgb(0 0 0 / 35%);
    }

    .sort-view-menu button,
    .tag-filters button {
        border: 0;
        background: transparent;
        color: #b5bac1;
        cursor: pointer;
        text-align: left;
    }

    .sort-view-menu button {
        padding: 7px 8px;
        border-radius: 4px;
    }

    .sort-view-menu button:hover,
    .sort-view-menu button.active,
    .tag-filters button.active {
        background: #5865f2;
        color: white;
    }

    .menu-label {
        padding: 6px 8px 3px;
        color: #949ba4;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
    }

    .tag-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
    }

    .tag-filters button {
        padding: 5px 9px;
        border-radius: 999px;
        font-size: 12px;
    }

    .coverage {
        color: #949ba4;
        font-size: 12px;
        text-align: right;
    }

    .forum-note {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 14px;
        margin: -4px 0 10px;
        color: #949ba4;
        font-size: 11px;
    }

    .post-list {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    .post-list.gallery {
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    }

    .post-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        min-width: 0;
        min-height: 112px;
        padding: 14px 15px;
        border: 1px solid #3f4147;
        border-radius: 9px;
        background: #2b2d31;
        color: inherit;
        text-align: left;
        cursor: pointer;
        outline: none;
        transition: border-color 120ms ease, background-color 120ms ease;
    }

    .post-card:focus-visible {
        outline: 2px solid #5865f2;
        outline-offset: 2px;
    }

    .post-list.gallery .post-card {
        min-height: 150px;
    }

    .post-content {
        min-width: 0;
    }

    .post-card:hover,
    .post-card.selected {
        border-color: #5865f2;
        background: #35373c;
    }

    .post-card.deleted {
        opacity: 0.75;
    }

    .post-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .post-name {
        overflow: hidden;
        color: #f2f3f5;
        font-size: 18px;
        font-weight: 650;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .post-excerpt {
        display: flex;
        gap: 4px;
        min-width: 0;
        margin-top: 7px;
        color: #b5bac1;
        font-size: 14px;
        line-height: 1.35;
    }

    .post-excerpt strong {
        flex: 0 0 auto;
        color: #dbdee1;
    }

    .post-excerpt span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .post-thumbnail {
        width: 80px;
        height: 64px;
        align-self: center;
        border-radius: 7px;
        object-fit: cover;
        background: #1e1f22;
    }

    .post-list.gallery .post-thumbnail {
        width: 112px;
        height: 100%;
        max-height: 128px;
    }

    .post-tags,
    .post-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
    }

    .post-tags {
        margin-top: 12px;
    }

    .post-tag,
    .status {
        padding: 3px 7px;
        border-radius: 999px;
        background: #404249;
        color: #dbdee1;
        font-size: 12px;
        line-height: 16px;
    }

    .status.pinned {
        flex: 0 0 auto;
        background: #3f467e;
        color: #dee0ff;
    }

    .status.danger {
        background: #6d2c32;
        color: #ffd7da;
    }

    .post-meta {
        margin-top: 10px;
        color: #949ba4;
        font-size: 12px;
    }

    .reaction {
        padding: 3px 7px;
        border-radius: 5px;
        background: #404249;
        color: #dbdee1;
    }

    .reply-count {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .reply-icon {
        position: relative;
        display: inline-block;
        width: 13px;
        height: 10px;
        border-radius: 6px;
        background: currentColor;
    }

    .reply-icon::after {
        content: "";
        position: absolute;
        bottom: -2px;
        left: 2px;
        border-top: 4px solid currentColor;
        border-right: 4px solid transparent;
    }

    .separator {
        opacity: 0.65;
    }

    .post-meta .status {
        padding-block: 1px;
    }

    .empty-forum,
    .empty-filter {
        min-height: 240px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 8px;
        color: #949ba4;
        text-align: center;
    }

    .empty-forum strong {
        color: #f2f3f5;
        font-size: 18px;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    @media (max-width: 620px) {
        .forum {
            padding: 12px;
        }

        .read-only-badge,
        .coverage {
            display: none;
        }

        .post-thumbnail,
        .post-list.gallery .post-thumbnail {
            width: 72px;
            height: 60px;
        }

        .post-list.gallery {
            grid-template-columns: minmax(0, 1fr);
        }
    }
</style>
