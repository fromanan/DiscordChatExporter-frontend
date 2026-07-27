export const DIRECT_MESSAGE_GUILD_ID = "000000000000000000000000"
export const LAST_MESSAGE_CURSOR = "999999999999999999999999"

export function normalizeDiscordId(value: string): string {
    return /^\d+$/.test(value) ? (value.replace(/^0+/, "") || "0") : value
}

export function normalizeViewerGuildId(value: string): string {
    const normalized = normalizeDiscordId(value)
    return normalized === "0" ? DIRECT_MESSAGE_GUILD_ID : normalized
}
