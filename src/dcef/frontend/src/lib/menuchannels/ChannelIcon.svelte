<script lang="ts">
    import type { Channel } from "../../js/interfaces";
    import Icon from "../icons/Icon.svelte";

	interface MyProps {
        channel: Channel;
        width: number;
    }
    let { channel, width }: MyProps = $props();

    const fallbackTypeLabels: Record<Channel["type"], string> = {
        GuildTextChat: "Text",
        DirectTextChat: "Text",
        GuildVoiceChat: "Voice",
        DirectGroupTextChat: "Text",
        GuildCategory: "Category",
        GuildNews: "Announcement",
        GuildNewsThread: "Thread",
        GuildPublicThread: "Thread",
        GuildPrivateThread: "Thread",
        GuildStageVoice: "Stage",
        GuildDirectory: "Directory",
        GuildForum: "Forum",
        GuildMedia: "Media",
        GuildServerGuide: "Server Guide",
        GuildChannelsAndRoles: "Channels & Roles"
    };

    let typeLabel = $derived(channel.typeLabel?.trim() || fallbackTypeLabels[channel.type]);
    let tooltipId = $derived(`channel-type-${channel._id}`);
    let tooltipLeft = $state(0);
    let tooltipTop = $state(0);

    function positionTooltip(event: MouseEvent) {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        tooltipLeft = bounds.left + bounds.width / 2;
        tooltipTop = bounds.top - 10;
    }
</script>
{#if channel}
    <span
        class="channel-type-icon"
        aria-describedby={tooltipId}
        onmouseenter={positionTooltip}
    >
        {#if channel.type == "GuildServerGuide"}
            <Icon name="channeltype/guide" width={width} />
        {:else if channel.type == "GuildChannelsAndRoles"}
            <Icon name="channeltype/customize" width={width} />
        {:else if channel.isRulesChannel}
            <Icon name="channeltype/rules" width={width} />
        {:else if channel.type == "GuildNews"}
            <Icon name="channeltype/news" width={width} />
        {:else if channel.isPrivate || channel.isLocked}
            <Icon name="channeltype/channelLocked" width={width} />
        {:else if channel.type == "GuildForum" || channel.type == "GuildMedia"}
            <Icon name="channeltype/forum" width={width} />
        {:else if channel.threads && channel.threads.length > 0}
            <Icon name="channeltype/channelWithThreads" width={width} />
        {:else if channel.type == "GuildVoiceChat"}
            <Icon name="channeltype/voice" width={width} />
        {:else if channel.type == "GuildNewsThread" || channel.type == "GuildPublicThread" || channel.type == "GuildPrivateThread"}
            <Icon name="channeltype/thread" width={width} />
        {:else}
            <Icon name="channeltype/channel" width={width} />
        {/if}
        <span
            id={tooltipId}
            class="channel-type-tooltip"
            role="tooltip"
            style:left={`${tooltipLeft}px`}
            style:top={`${tooltipTop}px`}
        >{typeLabel}</span>
    </span>
{/if}

<style>
    .channel-type-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        outline: none;
    }

    .channel-type-tooltip {
        position: fixed;
        z-index: 1000;
        transform: translate(-50%, -100%);
        padding: 8px 10px;
        border-radius: 5px;
        background: #111214;
        color: #f2f3f5;
        font-size: 14px;
        font-weight: 600;
        line-height: 18px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 80ms ease;
    }

    .channel-type-tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: #111214;
    }

    .channel-type-icon:hover .channel-type-tooltip {
        opacity: 1;
        visibility: visible;
    }
</style>
