import { checkUrl } from "../helpers";
import { dceToTwemoji } from "./dceToTwemoji";
import { twemojiToFilename } from "./twemojiToFilename";

const unicodeToShortcode = dceToTwemoji as Record<string, string>;
const unicodeEmojiPattern = new RegExp(
    Object.keys(unicodeToShortcode)
        .map(emoji => emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
    "gu"
);

export function replaceUnicodeEmojis(content: string): string {
    return content.replace(
        unicodeEmojiPattern,
        emoji => unicodeToShortcode[emoji] ?? emoji
    );
}

export function getEmojiImageUrl(emoji: any): string {
    if (emoji?.source === "default") {
        const name = String(emoji?.name ?? "");
        const key = unicodeToShortcode[name]
            ?? (name.startsWith(":") ? name : `:${name}:`);
        const filename = (twemojiToFilename as Record<string, string>)[key];
        if (filename) {
            return `/twemoji-svg/${filename}.svg`;
        }

        // Newer Unicode may not exist in the bundled Twemoji revision. Keep
        // the original Unicode as a native-text fallback instead of requesting
        // a known-missing remote SVG and showing the broken-image glyph.
        return "";
    }

    return checkUrl(emoji?.image);
}

export function getEmojiFallbackText(emoji: any): string {
    return String(emoji?.unicode ?? emoji?.name ?? "");
}
