import type { Author, Category, Channel, Guild } from "../interfaces";

const ARCHIVE_API_BASE_URL = import.meta.env.VITE_ARCHIVE_API_BASE_URL ?? "http://127.0.0.1:5178/api/v1";
const emptyMessagePage = () => ({
    prevPage: null,
    messageIds: [],
    nextPage: null,
    messages: []
});

function requireOk(response: Response): Response {
    if (!response.ok) {
        throw new Error(`Archive API returned ${response.status} ${response.statusText}`);
    }
    return response;
}

export type OfflineMediaArchiveResult = "succeeded" | "persisted-view-update-deferred" | "pending" | "failed";
export interface OfflineMediaStatus {
    mediaId: number;
    status: "pending" | "downloading" | "completed" | "failed" | "not-downloadable";
    isOffline: boolean;
    attempts: number;
    error?: string | null;
    hasThumbnail: boolean;
}
export interface RedditPreviewMedia {
    url: string;
}

export function getOfflineMediaUrl(mediaId: number, fileName?: string): string {
    return fileName
        ? `${ARCHIVE_API_BASE_URL}/media/${mediaId}/${encodeURIComponent(fileName)}`
        : `${ARCHIVE_API_BASE_URL}/media/${mediaId}`;
}

export function getOfflineMediaThumbnailUrl(mediaId: number): string {
    return `${ARCHIVE_API_BASE_URL}/media/${mediaId}/thumbnail.webp`;
}

export async function fetchRedditPreviewMedia(threadUrl: string): Promise<RedditPreviewMedia | null> {
    try {
        const response = await fetch(
            `${ARCHIVE_API_BASE_URL}/previews/reddit?url=${encodeURIComponent(threadUrl)}`);
        if (!response.ok) {
            return null;
        }
        const payload = await response.json();
        return typeof payload.url === "string" ? payload : null;
    }
    catch {
        return null;
    }
}

export async function fetchOfflineMediaStatuses(mediaIds: number[]): Promise<OfflineMediaStatus[]> {
    const uniqueIds = [...new Set(mediaIds)].filter(id => Number.isSafeInteger(id) && id > 0);
    if (uniqueIds.length === 0) {
        return [];
    }

    try {
        const response = await fetch(
            `${ARCHIVE_API_BASE_URL}/media/status?ids=${uniqueIds.join(",")}`,
            { cache: "no-store" });
        if (!response.ok) {
            return [];
        }
        return await response.json();
    }
    catch {
        return [];
    }
}

export async function archiveOfflineMedia(mediaId: number): Promise<OfflineMediaArchiveResult> {
    try {
        const response = await fetch(
            `${ARCHIVE_API_BASE_URL}/media/${mediaId}/offline`,
            { method: "POST" });
        const payload = await response.json();
        if (payload.status === "succeeded"
            || payload.status === "persisted-view-update-deferred"
            || payload.status === "pending") {
            return payload.status;
        }
        console.error("api - Failed to archive offline media", payload.error ?? payload);
        return "failed";
    }
    catch (error) {
        console.error("api - Failed to queue offline media", error);
        return "failed";
    }
}

export async function fetchArchiveRevision(): Promise<number | null> {
    try {
        const response = await fetch('/api/status', { cache: 'no-store' })
        if (!response.ok) {
            return null
        }
        const status = await response.json()
        return typeof status.archiveRevision === "number" ? status.archiveRevision : null
    }
    catch (e) {
        console.error("api - Failed to fetch archive revision", e)
        return null
    }
}

export async function fetchUserProfile(guildId: string, userId: string): Promise<Author | null> {
    try {
        const response = await fetch(
            `/api/guild/user?guild_id=${encodeURIComponent(guildId)}&user_id=${encodeURIComponent(userId)}`)
        if (!response.ok) {
            return null
        }
        return await response.json()
    }
    catch (e) {
        console.error("api - Failed to fetch user profile", e)
        return null
    }
}

export async function fetchMessages(guildId: string | null, channelId: string, direction: "before" | "after" | "around" | "first" | "last", messageId: string | null = null, limit: number = 50) {
    if (channelId === null) {
        console.error("api - fetchMessageIds - channelId is null")
        return emptyMessagePage()
    }
    if (guildId === null) {
        guildId = "000000000000000000000000"
    }
    if (messageId === null || messageId === "first") {
        messageId = "000000000000000000000000"
    }
    else if (messageId === "last") {
        messageId = "999999999999999999999999"
    }
    try {
        let response
        if (direction === "first") {
            response = await fetch(`/api/guild/messages?guild_id=${encodeURIComponent(guildId)}&channel_id=${encodeURIComponent(channelId)}&next_page_cursor=0&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "last") {
            response = await fetch(`/api/guild/messages?guild_id=${encodeURIComponent(guildId)}&channel_id=${encodeURIComponent(channelId)}&prev_page_cursor=999999999999999999999999&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "before") {
            response = await fetch(`/api/guild/messages?guild_id=${encodeURIComponent(guildId)}&channel_id=${encodeURIComponent(channelId)}&prev_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "after") {
            response = await fetch(`/api/guild/messages?guild_id=${encodeURIComponent(guildId)}&channel_id=${encodeURIComponent(channelId)}&next_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }
        else {
            response = await fetch(`/api/guild/messages?guild_id=${encodeURIComponent(guildId)}&channel_id=${encodeURIComponent(channelId)}&around_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }

        requireOk(response)
        let retObj = await response.json()
        return retObj
    }
    catch (e) {
        console.error("api - Failed to fetch message ids", e)
        return emptyMessagePage()
    }
}

export async function fetchSearch(guildId: string | null, prompt: string, direction: "before" | "after" | "around" | "first" | "last", messageId: string | null = null, limit: number = 50) {
    if (guildId === null) {
        guildId = "000000000000000000000000"
    }
    if (messageId === null || messageId === "first") {
        messageId = "000000000000000000000000"
    }
    else if (messageId === "last") {
        messageId = "999999999999999999999999"
    }
    try {
        let response
        if (direction === "first") {
            response = await fetch(`/api/guild/search?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}&next_page_cursor=0&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "last") {
            response = await fetch(`/api/guild/search?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}&prev_page_cursor=999999999999999999999999&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "before") {
            response = await fetch(`/api/guild/search?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}&prev_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }
        else if (direction === "after") {
            response = await fetch(`/api/guild/search?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}&next_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }
        else {
            response = await fetch(`/api/guild/search?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}&around_page_cursor=${encodeURIComponent(messageId)}&limit=${encodeURIComponent(limit)}`)
        }

        requireOk(response)
        let messageIds = await response.json()
        return messageIds
    }
    catch (e) {
        console.error("api - Failed to fetch search", e)
        return emptyMessagePage()
    }
}

export async function fetchPinnedMessages(guildId: string | null, channelId: string, direction: "before" | "after" | "around" | "first" | "last", messageId: string | null = null, limit: number = 50) {
    const prompt = `pinned:true in_id:${encodeURIComponent(channelId)}`
    return fetchSearch(guildId, prompt, direction, messageId, limit)
}

export async function fetchSearchCount(guildId: string | null, prompt: string): Promise<number | string> {
    // delay a bit to make sure (faster) search query runs first
    await new Promise(r => setTimeout(r, 25));

    if (guildId === null) {
        guildId = "000000000000000000000000"
    }
    try {
        let response = await fetch(`/api/guild/search/count?guild_id=${encodeURIComponent(guildId)}&prompt=${encodeURIComponent(prompt)}`)
        requireOk(response)
        let count = await response.text()
        const numericCount = Number(count)
        return Number.isFinite(numericCount) ? numericCount : "error"
    }
    catch (e) {
        console.error("api - Failed to fetch search count", e)
        return "error"
    }
}

export async function fetchAutocomplete(guildId: string | null, key: string, value: string, limit: number = 3) {
    if (guildId === null) {
        guildId = "000000000000000000000000"
    }
    try {
        let response = await fetch(`/api/guild/search/autocomplete?guild_id=${encodeURIComponent(guildId)}&key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}&limit=${encodeURIComponent(limit)}`)
        requireOk(response)
        let json = await response.json()
        return json
    }
    catch (e) {
        console.error("api - Failed to fetch autocomplete", e)
        return []
    }
}



export async function fetchGuilds(): Promise<Guild[]> {
    try {
        const response = await fetch('/api/guilds')
        requireOk(response)
        const guilds = await response.json()
        console.log("guilds", guilds);
        return guilds
        // guilds.set(response_json)
    }
    catch (e) {
        console.error("api - Failed to fetch guilds", e)
    }
    return []
}

function isThreadChannel(channel: Channel): boolean {
    return channel.type === "GuildNewsThread"
        || channel.type === "GuildPublicThread"
        || channel.type === "GuildPrivateThread"
}

export async function fetchCategoriesChannelsThreads(guildId: string | null): Promise<Category[]> {
    if (guildId === null) {
        guildId = "000000000000000000000000"
    }
    console.log("aaaaaa fetchCategoriesChannelsThreads", guildId);
    try {
        const response = await fetch(`/api/guild/channels?guild_id=${encodeURIComponent(guildId)}`)
        requireOk(response)
        let json_response: Channel[] = await response.json()
        json_response = json_response.filter(channel => channel.isHidden !== true)

        for (const channel of json_response) {
            channel.categoryId = channel.categoryId ?? "0"
            channel.category = channel.category?.trim()
                || (isThreadChannel(channel) ? "Unknown parent" : "Uncategorized")
        }

        let categories_temp: Category[] = []
        let channels_temp: Channel[] = []
        let lost_threads: Channel[] = []



        // create categories
        if (guildId === "000000000000000000000000") {
            let category = {
                _id: '0',
                name: "Direct Messages",
                channels: [],
                msg_count: 0,
                position: 0,
            }
            categories_temp.push(category)
        }
        else {
            let found_categories_ids: string[] = []
            for (let channel of json_response) {
                if (!isThreadChannel(channel)) {
                    if (!found_categories_ids.includes(channel.categoryId)) {
                        let category = {
                            _id: channel.categoryId,
                            name: channel.category,
                            channels: [],
                            msg_count: 0,
                            position: channel.categoryOrder
                                ?? channel.categoryPosition
                                ?? channel.position
                                ?? Number.MAX_SAFE_INTEGER,
                            categoryOrder: channel.categoryOrder,
                        }
                        categories_temp.push(category)
                        found_categories_ids.push(channel.categoryId)
                    }
                    else {
                        const category = categories_temp.find(candidate => candidate._id === channel.categoryId)
                        if (category) {
                            category.position = Math.min(
                                category.position ?? Number.MAX_SAFE_INTEGER,
                                channel.categoryOrder
                                    ?? channel.categoryPosition
                                    ?? channel.position
                                    ?? Number.MAX_SAFE_INTEGER)
                            category.categoryOrder ??= channel.categoryOrder
                        }
                    }
                }
            }
        }

        // create channels (excluding threads)
        for (let channel of json_response) {
            if (!isThreadChannel(channel)) {
                channel["threads"] = []
                if (guildId === "000000000000000000000000") {
                    channel["categoryId"] = '0'
                }
                channels_temp.push(channel)
            }
        }

        // add threads to their respective channels
        for (let channel of json_response) {
            if (isThreadChannel(channel)) {
                let parent_channel = channels_temp.find((c) => c._id === channel.categoryId)
                if (parent_channel) {
                    parent_channel.msg_count += channel.msg_count
                    parent_channel.threads.push(channel)
                }
                else {
                    lost_threads.push(channel)
                }
            }
        }

        // add channels to their respective categories
        for (let channel of channels_temp) {
            let category = categories_temp.find((c) => c._id === channel.categoryId)
            if (category) {
                category.msg_count += channel.msg_count
                category.channels.push(channel)
            }
            else {
                console.error("(this will never happen) - Category not found for channel", channel)
            }
        }

        // push threads without parent channel to a separate category so they are shown in the UI
        if (lost_threads.length > 0) {
            let msg_count = lost_threads.reduce((acc, thread) => acc + thread.msg_count, 0)
            categories_temp.push({
                _id: '0',
                name: 'Lost threads / forums',
                msg_count,
                position: Number.MAX_SAFE_INTEGER,
                channels: [{
                    _id: '0',
                    type: 'GuildTextChat' as const,
                    categoryId: '0',
                    category: 'Lost threads / forums',
                    name: 'Lost threads / forums',
                    topic: null,
                    threads: lost_threads,
                    msg_count: msg_count,
                    guildId: guildId,
                }]
            })
        }

        console.log("categories", categories_temp);
        categories_temp = categories_temp.sort((a, b) => {
            const position = (a.position ?? Number.MAX_SAFE_INTEGER)
                - (b.position ?? Number.MAX_SAFE_INTEGER)
            return position !== 0 ? position : a.name.localeCompare(b.name)
        })
        categories_temp.forEach((category) => {
            category.channels = category.channels.sort((a, b) => {
                const position = (a.channelOrder ?? a.sidebarOrder ?? a.position
                    ?? Number.MAX_SAFE_INTEGER)
                    - (b.channelOrder ?? b.sidebarOrder ?? b.position
                        ?? Number.MAX_SAFE_INTEGER)
                return position !== 0 ? position : a.name.localeCompare(b.name)
            })
            category.channels.forEach((channel) => {
                channel.threads = channel.threads.sort((a, b) => {
                    if (channel.type === "GuildForum" || channel.type === "GuildMedia") {
                        const bCreated = Date.parse(b.createdAt ?? "") || 0
                        const aCreated = Date.parse(a.createdAt ?? "") || 0
                        return bCreated - aCreated
                    }
                    return b.msg_count - a.msg_count
                })
            })
        })

        return categories_temp
    }
    catch (e) {
        console.error("api - Failed to fetch channels", e)
    }
    return []
}
