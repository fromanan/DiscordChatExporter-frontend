import type { Embed } from "./interfaces";

function unwrapUrl(value: string): string {
	return value.trim().replace(/^\|\|([\s\S]+)\|\|$/, "$1").replace(/^<([\s\S]+)>$/, "$1");
}

function parseUrl(value: string): URL | null {
	try {
		return new URL(unwrapUrl(value));
	}
	catch {
		return null;
	}
}

export function isDirectGifProviderUrl(value: string | null | undefined): boolean {
	if (!value) {
		return false;
	}

	const url = parseUrl(value);
	if (!url) {
		return false;
	}

	const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	const pathname = url.pathname.toLowerCase();

	return (hostname === "tenor.com" && /^\/(?:view|watch)\//.test(pathname)) ||
		(hostname === "giphy.com" && pathname !== "/") ||
		(hostname === "klipy.com" && pathname.startsWith("/gifs/"));
}

export function isDirectGifEmbed(embed: Embed): boolean {
	if (!embed.video) {
		return false;
	}

	if (embed.type) {
		return embed.type.toLowerCase() === "gifv";
	}

	// Older exports did not preserve Discord's embed type. Keep the known
	// providers working for those archives without treating all video cards as GIFs.
	return isDirectGifProviderUrl(embed.url);
}

export function urlsMatch(left: string, right: string): boolean {
	const leftUrl = parseUrl(left);
	const rightUrl = parseUrl(right);
	if (!leftUrl || !rightUrl) {
		return unwrapUrl(left).toLowerCase() === unwrapUrl(right).toLowerCase();
	}

	const normalize = (url: URL) =>
		`${url.origin}${decodeURI(url.pathname).replace(/\/$/, "")}${url.search}`.toLowerCase();

	return normalize(leftUrl) === normalize(rightUrl);
}
