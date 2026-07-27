<script lang="ts">
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import GuildBadge from "./GuildBadge.svelte";
    const guildState = getGuildState()
</script>

<div class="guild-name" title={guildState.guild?.name ?? "Direct Messages"}>
    {#if guildState.guild}
        <GuildBadge guild={guildState.guild} />
    {/if}
    <span>{guildState.guild?.name ?? "Direct Messages"}</span>
</div>

<style>
    .guild-name {
        display: flex;
        align-items: center;
        padding: 0 16px;
        height: 47px;
        font-weight: 600;
        font-size: 15.5px;
        line-height: 20px;
        top: 0;
        background-color: var(--panel-channels-bg);
        border-bottom: 1px solid #20222599;
        margin-bottom: 5px;
        gap: 8px;
    }

    .guild-name span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
</style>
