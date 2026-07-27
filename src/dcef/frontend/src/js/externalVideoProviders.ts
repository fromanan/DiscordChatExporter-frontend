export interface ExternalVideoEmbed {
	name: "YouTube" | "Vimeo" | "Twitch";
	src: string;
}

function parseUrl(value: string | null | undefined): URL | null {
	if (!value) {
		return null;
	}

	try {
		return new URL(value);
	}
	catch {
		return null;
	}
}

function isVideoId(value: string | null): value is string {
	return Boolean(value && /^[A-Za-z0-9_-]+$/.test(value));
}

function getYouTubeEmbed(url: URL): ExternalVideoEmbed | null {
	const hostname = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
	let videoId: string | null = null;

	if (hostname === "youtu.be") {
		videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
	}
	else if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
		const pathParts = url.pathname.split("/").filter(Boolean);
		if (pathParts[0] === "watch") {
			videoId = url.searchParams.get("v");
		}
		else if (["embed", "live", "shorts", "v"].includes(pathParts[0])) {
			videoId = pathParts[1] ?? null;
		}
	}

	if (!isVideoId(videoId)) {
		return null;
	}

	const parameters = new URLSearchParams({
		autoplay: "1",
		playsinline: "1",
		rel: "0"
	});
	const start = url.searchParams.get("start") ?? url.searchParams.get("t");
	if (start && /^\d+$/.test(start)) {
		parameters.set("start", start);
	}

	return {
		name: "YouTube",
		src: `https://www.youtube-nocookie.com/embed/${videoId}?${parameters}`
	};
}

function getVimeoEmbed(url: URL): ExternalVideoEmbed | null {
	const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	if (hostname !== "vimeo.com" && hostname !== "player.vimeo.com") {
		return null;
	}

	const pathParts = url.pathname.split("/").filter(Boolean);
	const videoIndex = hostname === "player.vimeo.com" && pathParts[0] === "video" ? 1 : 0;
	const videoId = pathParts[videoIndex] ?? null;
	if (!videoId || !/^\d+$/.test(videoId)) {
		return null;
	}

	const parameters = new URLSearchParams({ autoplay: "1" });
	const privacyHash = url.searchParams.get("h") ?? pathParts[videoIndex + 1];
	if (privacyHash && /^[A-Za-z0-9]+$/.test(privacyHash)) {
		parameters.set("h", privacyHash);
	}

	return {
		name: "Vimeo",
		src: `https://player.vimeo.com/video/${videoId}?${parameters}`
	};
}

function getTwitchClipEmbed(url: URL): ExternalVideoEmbed | null {
	const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	if (hostname !== "clips.twitch.tv") {
		return null;
	}

	const clipId = url.pathname.split("/").filter(Boolean)[0] ?? null;
	if (!isVideoId(clipId)) {
		return null;
	}

	const parameters = new URLSearchParams({
		clip: clipId,
		parent: window.location.hostname,
		autoplay: "true"
	});
	return {
		name: "Twitch",
		src: `https://clips.twitch.tv/embed?${parameters}`
	};
}

export function isGyazoCaptureUrl(value: string | null | undefined): boolean {
	const url = parseUrl(value);
	if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
		return false;
	}

	const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
	const pathParts = url.pathname.split("/").filter(Boolean);
	return hostname === "gyazo.com"
		&& pathParts.length === 1
		&& /^[a-f0-9]{32}$/i.test(pathParts[0]);
}

export function getExternalVideoEmbed(value: string | null | undefined): ExternalVideoEmbed | null {
	const url = parseUrl(value);
	if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
		return null;
	}

	return getYouTubeEmbed(url) ?? getVimeoEmbed(url) ?? getTwitchClipEmbed(url);
}
