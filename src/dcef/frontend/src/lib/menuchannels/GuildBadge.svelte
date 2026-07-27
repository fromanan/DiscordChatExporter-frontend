<script lang="ts">
    import type { Guild } from "../../js/interfaces";

    interface Props {
        guild: Guild;
    }

    let { guild }: Props = $props();

    const badgeUrls = {
        Community: {
            default: "https://discordresources.com/img/server/Community.svg",
            boosted: "https://discordresources.com/img/server/CommunityBoosted.svg"
        },
        DiscoverableCommunity: {
            default: "https://discordresources.com/img/server/Discoverable.svg",
            boosted: "https://discordresources.com/img/server/DiscoverableBoosted.svg"
        },
        Partnered: {
            default: "https://discordresources.com/img/server/Partnered.svg",
            boosted: "https://discordresources.com/img/server/Partnered.svg"
        },
        Verified: {
            default: "https://discordresources.com/img/server/Verified.svg",
            boosted: "https://discordresources.com/img/server/Verified.svg"
        }
    } as const;

    function resolveType(): Guild["type"] {
        const features = new Set(guild.features ?? []);
        if (features.has("VERIFIED")) return "Verified";
        if (features.has("PARTNERED")) return "Partnered";
        if (features.has("DISCOVERABLE")) return "DiscoverableCommunity";
        if (features.has("COMMUNITY")) return "Community";
        return guild.type;
    }

    let type = $derived(resolveType());
    let isBoosted = $derived(
        guild.isBoosted === true || (guild.premiumSubscriptionCount ?? 0) > 0
    );
    let badgeUrl = $derived(type ? badgeUrls[type][isBoosted ? "boosted" : "default"] : null);
    let label = $derived.by(() => {
        const features = new Set(guild.features ?? []);
        if (features.has("VERIFIED") && features.has("PARTNERED")) {
            return "Verified & Partnered Server";
        }
        if (type === "DiscoverableCommunity") return "Discoverable Community";
        if (type === "Community") return "Community Server";
        if (type === "Partnered") return "Partnered Server";
        if (type === "Verified") return "Verified Server";
        return "";
    });
    let description = $derived(
        type === "DiscoverableCommunity"
            ? "Anyone can find and join this server."
            : type === "Community"
                ? "People with an invite link can join."
                : ""
    );
    let boostLabel = $derived(
        isBoosted
            ? `Boost Level ${guild.premiumTier ?? 0}`
            : ""
    );
</script>

{#if badgeUrl}
    <span class="server-badge" aria-label={label} tabindex="0">
        <img src={badgeUrl} alt="" />
        <span class="tooltip" role="tooltip">
            <strong>{label}</strong>
            {#if description}<span>{description}</span>{/if}
            {#if boostLabel}<span>{boostLabel}</span>{/if}
        </span>
    </span>
{/if}

<style>
    .server-badge {
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
    }

    .server-badge > img {
        width: 20px;
        height: 20px;
        object-fit: contain;
    }

    .tooltip {
        position: absolute;
        z-index: 20;
        top: calc(100% + 9px);
        left: 50%;
        display: none;
        width: max-content;
        max-width: 230px;
        transform: translateX(-50%);
        padding: 9px 12px;
        border-radius: 5px;
        background: #111214;
        color: #dbdee1;
        text-align: center;
        font-size: 13px;
        font-weight: 400;
        line-height: 18px;
        box-shadow: 0 8px 16px rgb(0 0 0 / 24%);
    }

    .tooltip::before {
        content: "";
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-bottom-color: #111214;
    }

    .tooltip strong,
    .tooltip span {
        display: block;
    }

    .tooltip strong {
        color: white;
        font-weight: 700;
    }

    .server-badge:hover .tooltip,
    .server-badge:focus-visible .tooltip {
        display: block;
    }
</style>
