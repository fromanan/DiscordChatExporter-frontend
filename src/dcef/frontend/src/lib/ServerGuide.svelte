<script lang="ts">
    import { checkUrl } from "../js/helpers";
    import type { Channel, ServerGuideEntry } from "../js/interfaces";
    import { getGuildState } from "../js/stores/guildState.svelte";
    import Icon from "./icons/Icon.svelte";
    import ChannelIcon from "./menuchannels/ChannelIcon.svelte";

    const guildState = getGuildState();
    let guild = $derived(guildState.guild);
    let guide = $derived(guild?.serverGuide ?? null);
    let channels = $derived(
        guildState.categories.flatMap(category => category.channels));

    function findChannel(channelId: string | null | undefined): Channel | null {
        return channelId
            ? channels.find(channel => channel._id === channelId) ?? null
            : null;
    }

    function channelName(entry: ServerGuideEntry): string {
        return entry.title?.trim()
            || findChannel(entry.channelId)?.name
            || "Archived channel";
    }

    async function openEntry(entry: ServerGuideEntry) {
        const channel = findChannel(entry.channelId);
        if (!channel) {
            return;
        }
        await guildState.changeChannelId(channel._id, "last");
        await guildState.pushState();
    }

    function handleGuildIconError(event: Event) {
        (event.currentTarget as HTMLImageElement).src = "/favicon.png";
    }
</script>

<div class="server-guide">
    <div class="guide-content">
        <section class="welcome">
            <div class="guild-heading">
                {#if guild?.icon}
                    <img
                        src={checkUrl(guild.icon)}
                        alt=""
                        onerror={handleGuildIconError}
                    />
                {/if}
                <div>
                    <div class="eyebrow">SERVER GUIDE</div>
                    <h1>{guild?.name ?? "Archived server"}</h1>
                </div>
            </div>
            {#if guide?.welcomeMessage}
                <p>{guide.welcomeMessage}</p>
            {/if}
        </section>

        {#if guide?.actions?.length}
            <section>
                <h2>Get Started</h2>
                <div class="action-list">
                    {#each guide.actions as action}
                        {@const channel = findChannel(action.channelId)}
                        <button
                            class="action-card"
                            class:completed={action.completed}
                            disabled={!channel}
                            onclick={() => openEntry(action)}
                        >
                            <span class="entry-icon">
                                {#if channel}
                                    <ChannelIcon {channel} width={20} />
                                {:else}
                                    <Icon name="channeltype/channel" width={20} />
                                {/if}
                            </span>
                            <span class="entry-copy">
                                <strong>{channelName(action)}</strong>
                                {#if channel}
                                    <small>#{channel.name}</small>
                                {/if}
                                {#if action.description}
                                    <span>{action.description}</span>
                                {/if}
                            </span>
                            <span class="completion" aria-label={action.completed ? "Completed" : "Not completed"}>
                                {action.completed ? "✓" : "○"}
                            </span>
                        </button>
                    {/each}
                </div>
            </section>
        {/if}

        {#if guide?.resourceChannels?.length}
            <section>
                <h2>Resources</h2>
                <div class="resource-grid">
                    {#each guide.resourceChannels as resource}
                        {@const channel = findChannel(resource.channelId)}
                        <button
                            class="resource-card"
                            disabled={!channel}
                            onclick={() => openEntry(resource)}
                        >
                            <span class="resource-title">{channelName(resource)}</span>
                            {#if resource.description}
                                <span>{resource.description}</span>
                            {/if}
                            {#if channel}
                                <span class="open-label">Open #{channel.name} →</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </section>
        {/if}

        {#if !guide}
            <div class="empty">No Server Guide capture is available for this server yet.</div>
        {/if}
    </div>
</div>

<style>
    .server-guide {
        height: 100%;
        overflow-y: auto;
        background: #313338;
        color: #f2f3f5;
    }

    .guide-content {
        width: min(760px, calc(100% - 48px));
        margin: 0 auto;
        padding: 44px 0 72px;
    }

    .welcome {
        margin-bottom: 34px;
    }

    .guild-heading {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .guild-heading img {
        width: 72px;
        height: 72px;
        border-radius: 20px;
        object-fit: cover;
    }

    .eyebrow {
        color: #b5bac1;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
    }

    h1 {
        margin: 3px 0 0;
        font-size: 30px;
        line-height: 36px;
    }

    h2 {
        margin: 28px 0 12px;
        font-size: 18px;
    }

    p {
        margin: 18px 0 0;
        color: #dbdee1;
        font-size: 16px;
        line-height: 24px;
        white-space: pre-wrap;
    }

    .action-list,
    .resource-grid {
        display: grid;
        gap: 10px;
    }

    .action-card,
    .resource-card {
        width: 100%;
        border: 1px solid #3f4147;
        border-radius: 10px;
        background: #2b2d31;
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition: background 100ms ease, border-color 100ms ease;
    }

    .action-card:hover:not(:disabled),
    .resource-card:hover:not(:disabled) {
        border-color: #5865f2;
        background: #35373c;
    }

    button:disabled {
        cursor: default;
        opacity: .68;
    }

    .action-card {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) 26px;
        align-items: center;
        gap: 10px;
        padding: 13px 14px;
    }

    .entry-icon {
        color: #b5bac1;
    }

    .entry-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 2px;
    }

    .entry-copy strong {
        font-size: 15px;
    }

    .entry-copy small,
    .entry-copy span,
    .resource-card > span:not(.resource-title):not(.open-label) {
        color: #b5bac1;
        font-size: 13px;
        line-height: 18px;
    }

    .completion {
        display: grid;
        width: 22px;
        height: 22px;
        place-items: center;
        border-radius: 50%;
        color: #b5bac1;
        font-size: 16px;
        font-weight: 700;
    }

    .completed .completion {
        background: #23a559;
        color: white;
    }

    .resource-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .resource-card {
        display: flex;
        min-height: 138px;
        flex-direction: column;
        gap: 8px;
        padding: 18px;
    }

    .resource-title {
        font-size: 16px;
        font-weight: 700;
    }

    .open-label {
        margin-top: auto;
        color: #a5b3ff;
        font-size: 13px;
        font-weight: 600;
    }

    .empty {
        padding: 24px;
        border-radius: 8px;
        background: #2b2d31;
        color: #b5bac1;
    }
</style>
