<script lang="ts">
    import type { Guild, InvitePreview } from "../../js/interfaces";
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import Icon from "../icons/Icon.svelte";

    interface MyProps {
        invite: InvitePreview;
    }

    let { invite }: MyProps = $props();
    const guildState = getGuildState();

    let inviteLink = $derived(`https://discord.gg/${invite.code}`);
    let archivedGuildId = $derived(invite.guildId?.padStart(24, "0"));
    let isUnindexedName = $derived(!invite.name?.trim() && !invite.guildId);
    let isServerUnavailable = $derived(
        !archivedGuildId
        || !guildState.guilds.some((guild: Guild) => guild._id === archivedGuildId)
    );
    let serverName = $derived(
        invite.name?.trim() || (invite.guildId ? `Server ${invite.guildId}` : "Unindexed Server")
    );
    let description = $derived(
        invite.description?.trim() || "This server has not been indexed"
    );

    async function goToServer(): Promise<void> {
        if (!archivedGuildId || isServerUnavailable) {
            return;
        }

        await guildState.changeGuildId(archivedGuildId);
        await guildState.pushState();
    }

    function formatCount(count: number | null | undefined): string {
        return count == null ? "-" : count.toLocaleString();
    }

    function formatCreatedAt(value: string | null | undefined): string {
        if (!value) {
            return "Est. -";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Est. -";
        }

        return `Est. ${new Intl.DateTimeFormat(undefined, {
            month: "short",
            year: "numeric"
        }).format(date)}`;
    }
</script>

<article class="invite-card">
    <div class="server-header" class:flat-header={!invite.banner?.path}>
        {#if invite.banner?.path}
            <img src={invite.banner.path} alt="" />
        {/if}
    </div>

    <div class="server-icon">
        {#if invite.icon?.path}
            <img src={invite.icon.path} alt="" />
        {:else}
            <Icon name="dcef/filled" width={33} />
        {/if}
    </div>

    <div class="invite-body">
        <a class="server-name" target="_blank" rel="noreferrer" href={inviteLink}>
            {#if isUnindexedName}
                <em>{serverName}</em>
            {:else}
                {serverName}
            {/if}
        </a>

        <div class="server-counts" aria-label="Server membership">
            <span class="count">
                <span class="status-dot online"></span>
                {formatCount(invite.onlineCount)} Online
            </span>
            <span class="count">
                <span class="status-dot members"></span>
                {formatCount(invite.memberCount)} Members
            </span>
        </div>

        <div class="creation-date">{formatCreatedAt(invite.createdAt)}</div>
        <p class="description">{description}</p>

        {#if isServerUnavailable}
            <button
                class="join-button unavailable"
                type="button"
                title={`Server Id: ${invite.guildId?.trim() || "Unknown"}`}
                disabled
            >
                Server Unavailable
            </button>
        {:else}
            <button class="join-button" type="button" onclick={goToServer}>
                Go to Server
            </button>
        {/if}
    </div>
</article>

<style>
    .invite-card {
        position: relative;
        width: min(339px, 100%);
        overflow: hidden;
        box-sizing: border-box;
        border: 1px solid #202225;
        border-radius: 17px;
        background: #36373f;
        color: #f2f3f5;
    }

    .server-header {
        width: 100%;
        height: 81px;
        overflow: hidden;
        background: #171717;
    }

    .server-header.flat-header {
        background: linear-gradient(135deg, #202225, #111214);
    }

    .server-header img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }

    .server-icon {
        position: absolute;
        top: 43px;
        left: 18px;
        width: 72px;
        height: 72px;
        display: grid;
        place-items: center;
        overflow: hidden;
        box-sizing: border-box;
        border: 4px solid #36373f;
        border-radius: 21px;
        background: #5865f2;
        color: white;
    }

    .server-icon img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }

    .invite-body {
        padding: 47px 18px 18px;
    }

    .server-name {
        display: block;
        overflow-wrap: anywhere;
        color: #f2f3f5;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: none;
    }

    .server-name:hover {
        text-decoration: underline;
    }

    .server-counts {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 7px;
        margin-top: 4px;
        color: #c4c7ce;
        font-size: 13px;
        line-height: 1.35;
    }

    .count {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .status-dot {
        width: 9px;
        height: 9px;
        flex: 0 0 auto;
        border-radius: 50%;
    }

    .status-dot.online {
        background: #23a55a;
    }

    .status-dot.members {
        background: #aeb1b8;
    }

    .creation-date {
        margin-top: 2px;
        color: #c4c7ce;
        font-size: 13px;
        line-height: 1.35;
    }

    .description {
        margin: 11px 0 0;
        overflow-wrap: anywhere;
        color: #d1d3d7;
        font-size: 13px;
        line-height: 1.4;
    }

    .join-button {
        width: 100%;
        min-height: 35px;
        margin-top: 18px;
        display: grid;
        place-items: center;
        box-sizing: border-box;
        border: 0;
        border-radius: 7px;
        background: #0a984f;
        color: white;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
        transition: background-color 120ms ease;
    }

    .join-button:hover {
        background: #087f43;
    }

    .join-button.unavailable,
    .join-button.unavailable:hover {
        background: #4e5058;
        color: #b5bac1;
        cursor: not-allowed;
    }

    @media (max-width: 520px) {
        .invite-card {
            border-radius: 12px;
        }

        .server-name {
            font-size: 16px;
        }

        .server-counts,
        .creation-date,
        .description,
        .join-button {
            font-size: 12px;
        }
    }
</style>
