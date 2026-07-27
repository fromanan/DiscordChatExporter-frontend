<script lang="ts">
    import MenuThread from "./MenuThread.svelte";
    import { copyTextToClipboard } from "../../js/helpers";
    import { contextMenuItems } from "../../js/stores/menuStore";
    import type { Channel } from "../../js/interfaces";
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import { linkHandler } from "../../js/stores/settingsStore.svelte";
    import ChannelIcon from "./ChannelIcon.svelte";
    import { getLayoutState } from "../../js/stores/layoutState.svelte";


    interface MyProps {
        channel: Channel;
    }
    let { channel }: MyProps = $props();

    let isOpen: boolean = $state(false)
    let isForum = $derived(channel.type === "GuildForum" || channel.type === "GuildMedia")
    let isSpecial = $derived(
        channel.type === "GuildServerGuide"
        || channel.type === "GuildChannelsAndRoles")
    const guildState = getGuildState()
    const layoutState = getLayoutState()


    async function toggle() {
        isOpen = isForum || isSpecial ? true : !isOpen
        if (isOpen) {
            if (guildState.channelId !== channel._id) {
                await guildState.changeChannelId(channel._id, "last")
                if (layoutState.mobile) {
                    layoutState.hideSidePanel()
                }
            }
            else if (isForum && guildState.threadId) {
                await guildState.changeThreadId(null, null)
            }
            await guildState.pushState()
        }
    }

    $effect(() => {
        if (guildState.channelId !== channel._id) {
            isOpen = false
        }
        if (guildState.channelId === channel._id) {
            isOpen = true
        }
    })

    function onChannelRightClick(_event: MouseEvent, id: string, name: string) {
        if (!/^\d+$/.test(id) || !guildState.guildId || !/^\d+$/.test(guildState.guildId)) {
            $contextMenuItems = [{
                "name": "Copy page name",
                "action": () => {
                    copyTextToClipboard(name)
                }
            }]
            return
        }

		$contextMenuItems = [
            {
				"name": `Open channel in discord ${$linkHandler === 'app' ? "app" : "web"}`,
				"action": () => {
					window.open(($linkHandler === "app" ? "discord://" : "") + `https://discord.com/channels/${BigInt(guildState.guildId)}/${BigInt(id)}`,'_blank')
				}
			},
			{
				"name": "Copy channel ID",
				"action": () => {
					copyTextToClipboard(BigInt(id))
				}
			},
			{
				"name": "Copy channel name",
				"action": () => {
					copyTextToClipboard(name)
				}
			}
		]
	}
</script>

<div
    class="channel"
    class:selected={guildState.channelId === channel._id}
    aria-current={guildState.channelId === channel._id ? "page" : undefined}
    on:click={toggle}
    on:contextmenu|preventDefault={(e) => onChannelRightClick(e, channel._id, channel.name)}
>
    <div class="channel-icon">
        <ChannelIcon channel={channel} width={16} />
    </div><span title="{channel.name} ({channel.msg_count} messages)">{channel.name}</span>
</div>
{#if !isForum}
    {#each channel.threads as thread}
        {#if isOpen || thread._id == guildState.threadId}
            <MenuThread parentChannelId={channel._id} thread={thread} isLast={!isOpen || thread === channel.threads[channel.threads.length - 1]} />
        {/if}
    {/each}
{/if}

<style>
	.channel {
		display: flex;
		align-items: center;
		border-radius: 4px;
		width: calc(100% - 16px);
        height: 34px;
		padding: 7px 10px;
		margin: 1px 8px;
        gap: 6px;
        font-size: 15px;
        line-height: 18px;
        color: #949BA4;
        cursor: pointer;
        font-weight: 500;
        min-width: 0;
	}

	.channel:hover {
		background-color: #404249;
		color: white;
	}

	.channel.selected,
	.channel[aria-current="page"] {
		background-color: #404249;
		color: white;
	}

	.channel-icon {
		flex: 0 0 20px;
		width: 20px;
	}

    .channel > span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
	}
</style>
