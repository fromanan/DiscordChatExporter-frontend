import type { Embed } from "./interfaces";
import { getExternalVideoEmbed } from "./externalVideoProviders";

export type EmbedMediaArchiveExclusion =
	| { kind: "embed-type"; value: string }
	| { kind: "hostname-suffix"; value: string }
	| { kind: "external-video-provider" };

// Add or remove rules here to control which embed media hides the offline-save option.
export const EMBED_MEDIA_ARCHIVE_EXCLUSIONS: readonly EmbedMediaArchiveExclusion[] = [
	{ kind: "hostname-suffix", value: "reddit.com" },
	{ kind: "hostname-suffix", value: "redd.it" },
	{ kind: "external-video-provider" }
];

function getHostname(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	try {
		return new URL(value).hostname.toLowerCase();
	}
	catch {
		return null;
	}
}

function hostnameMatchesSuffix(hostname: string | null, suffix: string): boolean {
	if (!hostname) {
		return false;
	}

	const normalizedSuffix = suffix.toLowerCase().replace(/^\./, "");
	return hostname === normalizedSuffix || hostname.endsWith(`.${normalizedSuffix}`);
}

export function isEmbedMediaArchivingExcluded(embed: Embed): boolean {
	const hostname = getHostname(embed.url);
	const embedType = embed.type?.toLowerCase();

	return EMBED_MEDIA_ARCHIVE_EXCLUSIONS.some(rule => {
		switch (rule.kind) {
			case "embed-type":
				return embedType === rule.value.toLowerCase();
			case "hostname-suffix":
				return hostnameMatchesSuffix(hostname, rule.value);
			case "external-video-provider":
				return getExternalVideoEmbed(embed.url) !== null;
		}
	});
}
