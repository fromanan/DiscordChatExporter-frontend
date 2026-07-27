import type { Asset } from "./interfaces";

export async function resolveArchiveMediaId(
    asset: Asset,
    _messageId?: string,
    _mediaKind?: string
): Promise<number | null> {
    return Number.isSafeInteger(asset.mediaId) && (asset.mediaId ?? 0) > 0
        ? asset.mediaId!
        : null;
}
