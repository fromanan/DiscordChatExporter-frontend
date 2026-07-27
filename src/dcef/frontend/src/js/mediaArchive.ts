import type { Asset } from "./interfaces";

export async function resolveArchiveMediaKey(
    asset: Asset,
    messageId?: string,
    mediaKind?: string
): Promise<string | null> {
    if (asset.mediaKey) {
        return asset.mediaKey;
    }
    if (!messageId || !mediaKind) {
        return null;
    }

    const sourceUrl = asset.canonicalUrl ?? asset.originalPath ?? asset.remotePath ?? asset.path;
    if (!sourceUrl) {
        return null;
    }

    let normalizedUrl: string;
    try {
        const url = new URL(sourceUrl);
        if (url.hostname !== "media.discordapp.net" && url.hostname !== "cdn.discordapp.com") {
            return null;
        }
        normalizedUrl = `${url.protocol}//${url.host}${decodeURIComponent(url.pathname)}`;
    }
    catch {
        return null;
    }

    const unpaddedMessageId = messageId.replace(/^0+(?=\d)/, "");
    const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${unpaddedMessageId}|${mediaKind}|${normalizedUrl}`));
    const digest = Array.from(
        new Uint8Array(hash),
        byte => byte.toString(16).padStart(2, "0")).join("");
    return `url:${digest}`;
}
