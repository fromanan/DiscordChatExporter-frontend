import { getSearchState } from "../../lib/search/searchState.svelte";
import { isObjectEqual } from "../helpers";
import { fetchCategoriesChannelsThreads, fetchGuilds } from "./api";
import { getLayoutState } from "./layoutState.svelte";
import type { Category, Channel, Guild } from "../interfaces";
import { normalizeViewerGuildId } from "../discordIds";

let guilds: Guild[] = $state(await fetchGuilds());
let guildId: string | null = $state("nonExistingGuildId");  // will be changed before the first load
let guild = $derived(guilds.find(g => g._id === guildId) || null);

let channelId: string | null = $state(null);
let categories: Category[] = $state([]);
let channel = $derived(categories.flatMap(c => c.channels).find(c => c._id === channelId) || null);
let channelMessageId: string | null = $state(null);
let channelViewportMessageId: string | null = null;
let channelMessageOffset: number | null = null;

let threadId: string | null  = $state(null);
let thread = $derived(categories.flatMap(c => c.channels).flatMap(c => c.threads).find(t => t._id === threadId) || null);
let threadMessageId: string | null  = $state(null);
let threadViewportMessageId: string | null = null;
let threadMessageOffset: number | null = null;

// fast lookups:
// key is channelId, value is channel object
let channelsLookup = $derived.by(() => categories.flatMap(c => c.channels).reduce<Record<string, Channel>>((acc, channel) => {
	acc[channel._id] = channel
	return acc
}, {}));

// key is threadId, value is thread object
let threadsLookup = $derived.by(() => categories.flatMap(c => c.channels).flatMap(c => c.threads).reduce<Record<string, Channel>>((acc, thread) => {
	acc[thread._id] = thread
	return acc
}, {}));


export function isChannel(channelId: string) {
	return channelsLookup[channelId] !== undefined
}
export function isThread(threadId: string) {
	return threadsLookup[threadId] !== undefined
}

export function findChannel(channelId: string) {
	return channelsLookup[channelId]
}

export function findThread(threadId: string) {
	return threadsLookup[threadId]
}

export function findChannelThread(channelOrThreadId: string) {
	if (isChannel(channelOrThreadId)) {
		return findChannel(channelOrThreadId)
	}
	else if (isThread(channelOrThreadId)) {
		return findThread(channelOrThreadId)
	}
	else {
		console.warn("findChannelThread - channel or thread not found", channelOrThreadId)
		return null
	}
}

export function findChannelsByName(channelOrThreadName: string) {
	const lowerCaseName = channelOrThreadName.toLowerCase()
	const foundChannels = categories.flatMap(c => c.channels).filter(c => c.name.toLowerCase().includes(lowerCaseName))
	return foundChannels
}

export function findThreadsByName(channelOrThreadName: string) {
	const lowerCaseName = channelOrThreadName.toLowerCase()
	const foundThreads = categories.flatMap(c => c.channels).flatMap(c => c.threads).filter(t => t.name.toLowerCase().includes(lowerCaseName))
	return foundThreads
}

export function getGuildState() {
	function _getStateObject() {
		return {
			guild: guildId || null,
			channel: channelId || null,
			thread: threadId || null,
			message: channelViewportMessageId || channelMessageId || null,
			position: channelMessageOffset,
			threadmessage: threadViewportMessageId || threadMessageId || null,
			threadoffset: threadMessageOffset,
			search: searchState.submittedSearchPrompt || null
		}
	}

	function getUrlState() {
		const urlParams = new URLSearchParams(window.location.search)
		const parseOffset = (name: string) => {
			const value = urlParams.get(name)
			if (value === null) {
				return null
			}
			const parsed = Number(value)
			return Number.isFinite(parsed) ? parsed : null
		}
		let state = {
			guild: urlParams.get("guild") || null,
			channel: urlParams.get("channel") || null,
			thread: urlParams.get("thread") || null,
			message: urlParams.get("message") || null,
			position: parseOffset("position"),
			threadmessage: urlParams.get("threadmessage") || null,
			threadoffset: parseOffset("threadoffset"),
			search: urlParams.get("search") || null
		}

		const pathParts = window.location.pathname.split("/").filter(Boolean)
		if (pathParts[0] === "channels" && (pathParts.length === 3 || pathParts.length === 4)) {
			state.guild = normalizeViewerGuildId(decodeURIComponent(pathParts[1]))
			state.channel = normalizeViewerGuildId(decodeURIComponent(pathParts[2]))
			state.message = pathParts.length === 4
				? normalizeViewerGuildId(decodeURIComponent(pathParts[3]))
				: "last"
			state.thread = null
			state.threadmessage = pathParts.length === 4
				? urlParams.get("threadmessage")
				: null
			state.threadoffset = pathParts.length === 4
				? parseOffset("threadoffset")
				: null
			state.search = null
		}

		// convert null strings to null values
		for (const key in state) {
			if (state[key] === "null") {
				state[key] = null
			}
			if (state[key] === "undefined") {
				delete state[key]
			}
		}
		return state
	}

	/**
	 * Convert the state object to a query string
	 */
	function stateToParams(state) {
		let nonNullState: any = {}  // pretty url without null values
		for (const key in state) {
			if (state[key] !== null && state[key] !== undefined) {
				nonNullState[key] = state[key]
			}
		}
		const searchParams = new URLSearchParams(nonNullState);
		const getParams = searchParams.toString()
		return getParams
	}

	/**
	 * Use Discord-compatible paths for ordinary guild channel views. Keep the
	 * query-string form for application states that do not have a Discord route.
	 */
	function stateToUrl(state) {
		const formatDiscordId = (value: string) =>
			/^\d+$/.test(value) ? (value.replace(/^0+/, "") || "0") : value
		if (state.guild && state.channel && state.thread && !state.search) {
			const routeParts = [
				"channels",
				encodeURIComponent(formatDiscordId(state.guild)),
				encodeURIComponent(formatDiscordId(state.channel)),
				encodeURIComponent(formatDiscordId(state.thread))
			]
			const routeParams = stateToParams({
				threadmessage: state.threadmessage && state.threadmessage !== "first"
					? state.threadmessage
					: null,
				threadoffset: state.threadoffset
			})
			return `/${routeParts.join("/")}${routeParams ? `?${routeParams}` : ""}`
		}
		if (state.guild && state.channel && !state.thread && !state.search) {
			const routeParts = [
				"channels",
				encodeURIComponent(formatDiscordId(state.guild)),
				encodeURIComponent(formatDiscordId(state.channel))
			]
			if (state.message && state.message !== "last") {
				routeParts.push(encodeURIComponent(formatDiscordId(state.message)))
			}

			const routeParams = stateToParams({
				position: state.message && state.message !== "last" ? state.position : null
			})
			return `/${routeParts.join("/")}${routeParams ? `?${routeParams}` : ""}`
		}

		const getParams = stateToParams(state)
		return `/${getParams ? `?${getParams}` : ""}`
	}

	/**
	 * Pushes the current state to the browser history if it has changed
	 */
	async function pushState() {
		let state: any = _getStateObject()
		let previousState = window.history.state
		if (isObjectEqual(state, previousState)) {
			console.log("router - no changes detected")
			return
		}
		window.history.pushState(state, `${state.guild} ${state.channel}`, stateToUrl(state))
		console.log("router - pushed", state);
	}

	/**
	 * Replaces the current state in the browser history
	 * Call this after initial app load to set the initial state
	 */
	async function replaceState() {
		const state: any = _getStateObject()
		window.history.replaceState(state, "", stateToUrl(state))
		console.log("router - replaced", state);
	}


	async function changeGuildId(newGuildId: string | null) {
		if (newGuildId === "000000000000000000000000") {
			newGuildId = null
		}
		if (guildId === newGuildId) {
			return;
		}
		guildId = newGuildId;
		searchState.clearSearch()
		await changeChannelId(null, null)
		categories = withGuildSpecialChannels(
			guild,
			await fetchCategoriesChannelsThreads(guildId))
		console.log("router - changed guildId", guildId);
	}

	async function refreshArchiveIndex() {
		const requestedGuildId = guildId
		const [nextGuilds, nextCategories] = await Promise.all([
			fetchGuilds(),
			fetchCategoriesChannelsThreads(requestedGuildId)
		])

		guilds = nextGuilds
		if (guildId !== requestedGuildId) {
			return
		}
		categories = withGuildSpecialChannels(
			nextGuilds.find(candidate => candidate._id === requestedGuildId) ?? null,
			nextCategories)

		const nextChannels = categories.flatMap(category => category.channels)
		const nextThreads = nextChannels.flatMap(channel => channel.threads)
		if (channelId && !nextChannels.some(channel => channel._id === channelId)) {
			await changeChannelId(null, null)
		}
		else if (threadId && !nextThreads.some(thread => thread._id === threadId)) {
			await changeThreadId(null, null)
		}
	}

	async function changeChannelId(newChannelId: string | null, newChannelMessageId: string | null, newChannelMessageOffset: number | null = null) {
		channelViewportMessageId = newChannelId ? newChannelMessageId : null
		channelMessageOffset = newChannelId ? newChannelMessageOffset : null
		if (channelId === newChannelId && channelMessageId === newChannelMessageId) {
			return;
		}

		if (channelId !== newChannelId) {
			await changeThreadId(null, null)
			layoutState.hideChannelPinned()
		}
		channelId = newChannelId;

		if (channelMessageId !== newChannelMessageId) {
			channelMessageId = newChannelMessageId
		}

		if (!newChannelId) {
			channelMessageId = null
		}
		console.log("router - changed channelId", channelId, "messageId", channelMessageId);
	}


	async function changeThreadId(newThreadId: string | null, newThreadMessageId: string | null, newThreadMessageOffset: number | null = null) {
		threadViewportMessageId = newThreadId ? newThreadMessageId : null
		threadMessageOffset = newThreadId ? newThreadMessageOffset : null
		if (threadId === newThreadId && threadMessageId === newThreadMessageId) {
			return;
		}

		if (threadId !== newThreadId) {
			layoutState.hideThreadPinned()
		}
		threadId = newThreadId;

		if (threadMessageId !== newThreadMessageId) {
			threadMessageId = newThreadMessageId
		}

		if (newThreadId && guildId) {
			layoutState.showThread()
		}
		else {
			threadMessageId = null
			layoutState.hideThread()
		}
		console.log("router - changed threadId", threadId);
	}

	async function replaceViewportState(target: "channel" | "thread", messageId: string, offset: number) {
		if (target === "channel") {
			if (!channelId) {
				return
			}
			if (channelViewportMessageId === messageId && channelMessageOffset === offset) {
				return
			}
			channelViewportMessageId = messageId
			channelMessageOffset = offset
		}
		else {
			if (!threadId) {
				return
			}
			if (threadViewportMessageId === messageId && threadMessageOffset === offset) {
				return
			}
			threadViewportMessageId = messageId
			threadMessageOffset = offset
		}
		await replaceState()
	}


	/**
	 * Switch to guildId and channelOrThreadId (will be automatically detected if it's a channel or thread id)
	 * Call pushState() after calling this to add new state to the history
	 */
	async function comboSetGuildChannel(guildId: string, channelOrThreadId: string) {
        await changeGuildId(guildId)
        if (isChannel(channelOrThreadId)) {
          await changeChannelId(channelOrThreadId, "last")
        }
        else if (isThread(channelOrThreadId)) {
          const thread = findThread(channelOrThreadId)
          await changeChannelId(thread.categoryId, "last")
          await changeThreadId(channelOrThreadId, "last")
        }
		else {
		  console.warn("router - comboSetGuildChannel - channel or thread not exported", channelOrThreadId)
		}
    }
	/**
	 * Same as above, but also sets the message id (in the channel if it's a channel, in the thread if it's a thread)
	 */
	async function comboSetGuildChannelMessage(guildId: string, channelOrThreadId: string, messageId: string) {
        await changeGuildId(guildId)
        if (isChannel(channelOrThreadId)) {
          await changeChannelId(channelOrThreadId, messageId)
        //   await changeChannelMessageId(messageId)
        }
        else if (isThread(channelOrThreadId)) {
          const thread = findThread(channelOrThreadId)
          await changeChannelId(thread.categoryId, "last")
          await changeThreadId(channelOrThreadId, messageId)
        //   await changeThreadMessageId(messageId)
        }
		else {
		  console.warn("router - comboSetGuildChannelMessage - channel or thread not exported", channelOrThreadId)
		}
    }

	return {
		get guildId() {
			return guildId;
		},
		get guilds() {
			return guilds;
		},
		get guild() {
			return guild;
		},
		get channelId() {
			return channelId;
		},
		get categories() {
			return categories;
		},
		get channel() {
			return channel;
		},
		get threadId() {
			return threadId;
		},
		get thread() {
			return thread;
		},
		get channelMessageId() {
			return channelMessageId;
		},
		get channelMessageOffset() {
			return channelMessageOffset;
		},
		get threadMessageId() {
			return threadMessageId;
		},
		get threadMessageOffset() {
			return threadMessageOffset;
		},
		changeGuildId,
		refreshArchiveIndex,
		changeChannelId,
		changeThreadId,
		comboSetGuildChannel,
		comboSetGuildChannelMessage,
		getUrlState,
		pushState,
		replaceState,
		replaceViewportState,
	};
}

function withGuildSpecialChannels(
	targetGuild: Guild | null,
	regularCategories: Category[]
): Category[] {
	if (!targetGuild) {
		return regularCategories
	}

	const specialChannels: Channel[] = []
	const serverGuide = targetGuild.serverGuide
	if (serverGuide
		&& (serverGuide.enabled
			|| serverGuide.actions.length > 0
			|| serverGuide.resourceChannels.length > 0)) {
		specialChannels.push({
			_id: "server-guide",
			type: "GuildServerGuide",
			typeLabel: "Server Guide",
			categoryId: "get-started",
			category: "Get Started",
			name: "Server Guide",
			position: -2,
			categoryPosition: -1,
			topic: null,
			guildId: targetGuild._id,
			msg_count: 0,
			threads: []
		})
	}

	const onboarding = targetGuild.onboarding
	if (onboarding
		&& (onboarding.enabled || onboarding.prompts.length > 0)) {
		specialChannels.push({
			_id: "channels-and-roles",
			type: "GuildChannelsAndRoles",
			typeLabel: "Channels & Roles",
			categoryId: "get-started",
			category: "Get Started",
			name: "Channels & Roles",
			position: -1,
			categoryPosition: -1,
			topic: null,
			guildId: targetGuild._id,
			msg_count: 0,
			threads: []
		})
	}

	if (specialChannels.length === 0) {
		return regularCategories
	}

	return [{
		_id: "get-started",
		name: "Get Started",
		channels: specialChannels,
		msg_count: 0,
		position: -1,
		isHeaderless: true
	}, ...regularCategories]
}


export function channelOrThreadIdToName(channelId: string) {
	if (!channelId) {
		return null
	}
	const channel = categories.flatMap(c => c.channels).find(c => c._id === channelId)
	if (channel) {
		return channel.name
	}
	const thread = categories.flatMap(c => c.channels).flatMap(c => c.threads).find(t => t._id === channelId)
	if (thread) {
		return thread.name
	}
	return null
}


async function restoreGuildState(state) {
	await guildState.changeGuildId(state.guild);
	const discordPathThread = state.channel
		&& state.message
		&& isThread(state.message)
		&& findThread(state.message)?.categoryId === state.channel
		? state.message
		: null;
	if (discordPathThread) {
		await guildState.changeChannelId(state.channel, "last");
		await guildState.changeThreadId(
			discordPathThread,
			state.threadmessage ?? "first",
			state.threadoffset);
	}
	else {
		await guildState.changeChannelId(state.channel, state.message, state.position);
		await guildState.changeThreadId(state.thread, state.threadmessage, state.threadoffset);
	}

	await searchState.setSearchPrompt(state.search)
	await searchState.search(guildState.guildId)

	if (state.search !== null || state.channel !== null || state.thread !== null) {
		layoutState.hideSidePanel()
	}
	else {
		layoutState.showSidePanel()
	}

	console.log("router - restored", state);
}

const guildState = getGuildState();
const layoutState = getLayoutState()
const searchState = getSearchState()

/**
 * Restore the state from the url on initial load
 */
let urlState = guildState.getUrlState();
await restoreGuildState(urlState);
await guildState.replaceState()  // set the initial state




/**
 * Listen for back/forward navigation events and restore the state
 */
window.addEventListener("popstate", async (e) => {
	if (e.state) {
		console.log("router - popped", e.state);
		await restoreGuildState(e.state);
	}
})


export async function changeMessageId(channelOrThreadId: string, messageId: string) {
	if (isChannel(channelOrThreadId)) {
		await guildState.changeChannelId(channelOrThreadId, messageId);
		// guildState.changeChannelMessageId(messageId)
		guildState.pushState()
	}
	else if (isThread(channelOrThreadId)) {
		await guildState.changeThreadId(channelOrThreadId, messageId);
		// guildState.changeThreadMessageId(messageId)
		guildState.pushState()
	}
	else {
		console.warn('MessageTimestamp - unknown channel or thread id', channelOrThreadId)
	}
}
