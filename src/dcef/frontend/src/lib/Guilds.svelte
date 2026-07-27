<!-- GUILDS MENU -->

<script lang="ts">
	import { tick } from "svelte";
	import { checkUrl, copyTextToClipboard } from "../js/helpers"
	import type { Guild } from "../js/interfaces";
    import { getGuildState } from "../js/stores/guildState.svelte";
    import { contextMenuItems, handleContextMenu } from "../js/stores/menuStore";
    import { linkHandler } from "../js/stores/settingsStore.svelte";
    import Icon from "./icons/Icon.svelte";
	import GuildBadge from "./menuchannels/GuildBadge.svelte";

	let tooltip: { guild: Guild, left: number, top: number } | null = null
	let tooltipElement: HTMLDivElement | null = null
	const fallbackGuildIcon = "/favicon.png"
	const fallbackHueSteps = [0, 38, 82, 126, 170, 214, 258, 302]
	let failedGuildIconIds = new Set<string>()

	function fallbackHueFor(guild: Guild): number {
		const identity = guild?._id || guild?.name || "unknown"
		let hash = 2166136261
		for (let index = 0; index < identity.length; index++) {
			hash ^= identity.charCodeAt(index)
			hash = Math.imul(hash, 16777619)
		}

		return fallbackHueSteps[(hash >>> 0) % fallbackHueSteps.length]
	}

	function hasGuildIcon(guild: Guild): boolean {
		return Boolean(guild.icon?.path) && !failedGuildIconIds.has(guild._id)
	}

	async function showGuildTooltip(event: MouseEvent, guild: Guild) {
		const guildElement = event.currentTarget as HTMLElement
		const anchorElement = guildElement.querySelector("img") ?? guildElement
		const anchorBounds = anchorElement.getBoundingClientRect()

		tooltip = {
			guild,
			left: anchorBounds.right + 8,
			top: anchorBounds.top + anchorBounds.height / 2
		}

		await tick()

		if (tooltip && tooltipElement) {
			const tooltipBounds = tooltipElement.getBoundingClientRect()
			const viewportPadding = 8
			const halfHeight = tooltipBounds.height / 2

			tooltip.top = Math.max(
				viewportPadding + halfHeight,
				Math.min(tooltip.top, window.innerHeight - viewportPadding - halfHeight)
			)
		}
	}

	function hideGuildTooltip() {
		tooltip = null
	}

	function onRightClick(e: MouseEvent, id: string) {
        console.log("right click", id);
		$contextMenuItems = [
			{
				"name": `Open guild in discord ${$linkHandler === 'app' ? "app" : "web"}`,
				"action": () => {
					window.open(($linkHandler === "app" ? "discord://" : "") + `https://discord.com/channels/${BigInt(id)}`,'_blank')
				}
			},
			{
				"name": "Copy server ID",
				"action": () => {
					copyTextToClipboard(BigInt(id))
				}
			}
		]
	}

	function handleGuildIconError(event: Event, guild: Guild) {
		const image = event.currentTarget as HTMLImageElement
		if (!image.src.endsWith(fallbackGuildIcon)) {
			failedGuildIconIds = new Set(failedGuildIconIds).add(guild._id)
			image.src = fallbackGuildIcon
		}
	}

	const guildState = getGuildState()

	async function changeGuildId(guildId: string | null) {
		await guildState.changeGuildId(guildId)
		await guildState.pushState()
	}
</script>

<svelte:window on:resize={hideGuildTooltip} />

<div class="guilds" on:scroll={hideGuildTooltip}>
	<div class="guild" class:selected={!guildState.guildId} on:click={e => changeGuildId(null)}>
		<div class="guild-selected-indicator"></div>
		<div class="home-guild"><Icon name="dcef/filled" width={22} /></div>
	</div>
	<hr>

	{#if guildState.guilds}
		{#each guildState.guilds as guild}
			{#if guild._id !== "000000000000000000000000"}
				<div
					class="guild"
					class:selected={guildState.guildId === guild._id}
					on:mouseenter={e => showGuildTooltip(e, guild)}
					on:mouseleave={hideGuildTooltip}
					on:contextmenu={e => handleContextMenu(e, () => onRightClick(e, guild._id))}
					on:click={e => changeGuildId(guild._id)}
				>
					<div class="guild-selected-indicator"></div>
					<img
						src={hasGuildIcon(guild) ? checkUrl(guild.icon) : fallbackGuildIcon}
						style:filter={!hasGuildIcon(guild) ? `hue-rotate(${fallbackHueFor(guild)}deg)` : undefined}
						alt={guild.name}
						on:error={event => handleGuildIconError(event, guild)}
					/>
				</div>
			{/if}
		{/each}
	{/if}
</div>

{#if tooltip}
	<div
		bind:this={tooltipElement}
		class="guild-tooltip"
		role="tooltip"
		style:left={`${tooltip.left}px`}
		style:top={`${tooltip.top}px`}
	>
		<GuildBadge guild={tooltip.guild} showTooltip={false} />
		<span class="guild-tooltip-name">{tooltip.guild.name}</span>
	</div>
{/if}

<style>
	.guilds {
		width: 100%;
        height: 100%;
		cursor: pointer;

		overflow-y: auto;
		position: relative;

		padding: 0 4px 84px 0;
		scrollbar-width: none; /* hide scrollbar - Firefox */

		transition: left 0.2s ease-in-out;
		left: 0px
	}


	.guilds::-webkit-scrollbar {
		display: none;  /* hide scrollbar - Safari and Chrome */
	}

	.guild img,
	.home-guild {
		margin: 5px 5px 3px 2px;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		transition: border-radius 0.2s ease-in-out;
	}

	.guild.selected img,
	.guild:hover img,
	.guild.selected .home-guild,
	.guild:hover .home-guild {
		border-radius: 25%;
	}

	.home-guild {
		background-color: #313338;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: small;

		color: #dbdee1;
	}

	.guild:hover .home-guild,
	.guild.selected .home-guild {
		background-color: #5865f2;
		color: white;
	}

	hr {
		border: 0;
		height: 2px;
		background: #333;
		margin: 5px 16px 5px 20px;
	}

	.guild {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 10px;
        margin-left: 10px;
	}

	.guild .guild-selected-indicator {
        background-color: white;
		position: absolute;
		left: -6px;
		width: 6px;
		height: 0px;
		border-radius: 5px;

		transition: height 0.2s ease-in-out;
	}

	.guild:hover .guild-selected-indicator {
		height: 20px;
		width: 10px;
		transition: width 0.2s ease-in-out;
	}

	.guild.selected .guild-selected-indicator {
		height: 40px;
		width: 10px;
		transition: height 0.2s ease-in-out;
	}

	.guild-tooltip {
		position: fixed;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 6px;
		max-width: min(240px, calc(100vw - 86px));
		padding: 8px 10px;
		border-radius: 4px;
		background-color: #111214;
		box-shadow: 0 8px 16px rgb(0 0 0 / 24%);
		color: #f2f3f5;
		font-size: 14px;
		font-weight: 600;
		line-height: 18px;
		overflow-wrap: anywhere;
		pointer-events: none;
		transform: translateY(-50%);
	}

	.guild-tooltip-name {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.guild-tooltip::before {
		content: "";
		position: absolute;
		top: 50%;
		right: 100%;
		border: 5px solid transparent;
		border-right-color: #111214;
		transform: translateY(-50%);
	}
</style>
