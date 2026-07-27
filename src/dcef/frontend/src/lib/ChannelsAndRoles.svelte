<script lang="ts">
    import type { Channel, GuildOnboardingOption, Role } from "../js/interfaces";
    import { getGuildState } from "../js/stores/guildState.svelte";
    import ChannelIcon from "./menuchannels/ChannelIcon.svelte";

    const guildState = getGuildState();
    let activeTab = $state<"customize" | "browse">("customize");
    let guild = $derived(guildState.guild);
    let onboarding = $derived(guild?.onboarding ?? null);
    let selectedOptionIds = $derived(
        new Set(onboarding?.selectedOptionIds ?? []));
    let rolesById = $derived(
        new Map((guild?.roles ?? []).map(role => [role._id, role])));

    function optionRoles(option: GuildOnboardingOption): Role[] {
        return (option.role_ids ?? [])
            .map(roleId => rolesById.get(roleId))
            .filter((role): role is Role => Boolean(role));
    }

    async function openChannel(channel: Channel) {
        await guildState.changeChannelId(channel._id, "last");
        await guildState.pushState();
    }

    function realChannels(categoryId: string): Channel[] {
        return guildState.categories
            .find(category => category._id === categoryId)
            ?.channels
            .filter(channel =>
                channel.type !== "GuildServerGuide"
                && channel.type !== "GuildChannelsAndRoles"
                && !channel.isDeleted)
            ?? [];
    }
</script>

<div class="channels-roles">
    <div class="page">
        <div class="page-heading">
            <div>
                <div class="eyebrow">ARCHIVED SERVER SETTINGS</div>
                <h1>Channels & Roles</h1>
                <p>Captured onboarding choices and navigable server channels.</p>
            </div>
            <div class="read-only">Read-only</div>
        </div>

        <div class="tabs" role="tablist" aria-label="Channels and roles views">
            <button
                role="tab"
                aria-selected={activeTab === "customize"}
                class:active={activeTab === "customize"}
                onclick={() => activeTab = "customize"}
            >Customize</button>
            <button
                role="tab"
                aria-selected={activeTab === "browse"}
                class:active={activeTab === "browse"}
                onclick={() => activeTab = "browse"}
            >Browse Channels</button>
        </div>

        {#if activeTab === "customize"}
            {#if onboarding?.prompts?.length}
                <div class="prompt-list">
                    {#each onboarding.prompts as prompt}
                        <section class="prompt">
                            <h2>{prompt.title}</h2>
                            <div class="option-grid">
                                {#each prompt.options as option}
                                    {@const selected = selectedOptionIds.has(option.id)}
                                    {@const roles = optionRoles(option)}
                                    <div class="option" class:selected>
                                        <span class="selection">{selected ? "✓" : "○"}</span>
                                        <span class="option-copy">
                                            <strong>{option.title}</strong>
                                            {#if option.description}
                                                <small>{option.description}</small>
                                            {/if}
                                            {#if roles.length}
                                                <span class="role-links">
                                                    {#each roles as role}
                                                        <span
                                                            class="role-chip"
                                                            style:border-color={role.color ?? "#4e5058"}
                                                        >{role.name}</span>
                                                    {/each}
                                                </span>
                                            {/if}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/each}
                </div>
            {:else}
                <div class="empty">No onboarding prompts have been captured for this server.</div>
            {/if}

            {#if guild?.roles?.length}
                <section class="all-roles">
                    <h2>Server roles</h2>
                    <div class="roles">
                        {#each guild.roles as role}
                            <span
                                class="role"
                                style:border-color={role.color ?? "#4e5058"}
                            >
                                <span
                                    class="role-dot"
                                    style:background={role.color ?? "#949ba4"}
                                ></span>
                                {role.name}
                            </span>
                        {/each}
                    </div>
                </section>
            {/if}
        {:else}
            <div class="browse-list">
                {#each guildState.categories.filter(category => category._id !== "get-started") as category}
                    {@const channels = realChannels(category._id)}
                    {#if channels.length}
                        <section class="browse-category">
                            <h2>{category.name}</h2>
                            <div class="browse-channels">
                                {#each channels as channel}
                                    <button onclick={() => openChannel(channel)}>
                                        <span class="channel-icon">
                                            <ChannelIcon {channel} width={20} />
                                        </span>
                                        <span class="channel-copy">
                                            <strong>{channel.name}</strong>
                                            {#if channel.topic}
                                                <small>{channel.topic}</small>
                                            {/if}
                                        </span>
                                        <span class="archived-check">✓</span>
                                    </button>
                                {/each}
                            </div>
                        </section>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .channels-roles {
        height: 100%;
        overflow-y: auto;
        background: #313338;
        color: #f2f3f5;
    }

    .page {
        width: min(820px, calc(100% - 48px));
        margin: 0 auto;
        padding: 40px 0 72px;
    }

    .page-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
    }

    .eyebrow {
        color: #b5bac1;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .08em;
    }

    h1 {
        margin: 3px 0 4px;
        font-size: 30px;
    }

    .page-heading p {
        margin: 0;
        color: #b5bac1;
    }

    .read-only {
        padding: 5px 9px;
        border-radius: 12px;
        background: #404249;
        color: #dbdee1;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }

    .tabs {
        display: flex;
        gap: 22px;
        margin: 26px 0 22px;
        border-bottom: 1px solid #3f4147;
    }

    .tabs button {
        padding: 0 2px 11px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: #b5bac1;
        cursor: pointer;
        font: inherit;
        font-weight: 600;
    }

    .tabs button.active {
        border-bottom-color: #5865f2;
        color: white;
    }

    .prompt-list {
        display: grid;
        gap: 22px;
    }

    .prompt,
    .all-roles,
    .browse-category {
        padding: 18px;
        border: 1px solid #3f4147;
        border-radius: 10px;
        background: #2b2d31;
    }

    h2 {
        margin: 0 0 13px;
        font-size: 16px;
    }

    .option-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 9px;
    }

    .option {
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        gap: 8px;
        padding: 12px;
        border: 1px solid #4e5058;
        border-radius: 8px;
        background: #313338;
    }

    .option.selected {
        border-color: #5865f2;
        background: #353a5f;
    }

    .selection {
        color: #b5bac1;
        font-weight: 700;
    }

    .selected .selection {
        color: #a5b3ff;
    }

    .option-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 5px;
    }

    small {
        color: #b5bac1;
        line-height: 17px;
    }

    .role-links,
    .roles {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .role-chip,
    .role {
        border: 1px solid #4e5058;
        border-radius: 10px;
        padding: 2px 7px;
        background: #1e1f22;
        color: #dbdee1;
        font-size: 12px;
    }

    .all-roles {
        margin-top: 22px;
    }

    .role {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 8px;
    }

    .role-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
    }

    .browse-list {
        display: grid;
        gap: 14px;
    }

    .browse-channels {
        display: grid;
        gap: 4px;
    }

    .browse-channels button {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) 24px;
        align-items: center;
        gap: 8px;
        padding: 9px 10px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        text-align: left;
    }

    .browse-channels button:hover {
        background: #404249;
    }

    .channel-icon {
        color: #b5bac1;
    }

    .channel-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 2px;
    }

    .channel-copy strong,
    .channel-copy small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .archived-check {
        color: #23a559;
        font-weight: 800;
    }

    .empty {
        padding: 24px;
        border-radius: 8px;
        background: #2b2d31;
        color: #b5bac1;
    }
</style>
