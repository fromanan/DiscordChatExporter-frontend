<script lang="ts">
	import type { Asset, Embed, Message } from "../../js/interfaces";
	import { getViewUserState } from "../viewuser/viewUserState.svelte";
	import { getRenderablePollEmbed } from "./messagePollData";
	import MessageAttachments from "./MessageAttachments.svelte";
	import MessageAuthorName from "./MessageAuthorName.svelte";
	import MessageAvatar from "./MessageAvatar.svelte";
	import MessageContent from "./MessageContent.svelte";
	import MessageEmbed from "./MessageEmbed.svelte";
	import MessageInvite from "./MessageInvite.svelte";
	import MessagePoll from "./MessagePoll.svelte";
	import MessageReactions from "./MessageReactions.svelte";
	import MessageReferenced from "./MessageReferenced.svelte";
	import MessageStickers from "./MessageStickers.svelte";
	import MessageTimestamp from "./MessageTimestamp.svelte";
	import { onMessageRightClick } from "./messageRightClick";
	import { isDirectGifEmbed, urlsMatch } from "../../js/directGifEmbeds";
	import { handleContextMenu } from "../../js/stores/menuStore";

	export let message: Message;
	export let messageState;
	export let originalPosterId: string | null = null;
	const viewUserState = getViewUserState();

	function sameDiscordId(left: string | null | undefined, right: string | null | undefined): boolean {
		if (!left || !right) {
			return false;
		}
		return (left.replace(/^0+/, "") || "0") === (right.replace(/^0+/, "") || "0");
	}

	function isPollMessage(message: Message): boolean {
		return getRenderablePollEmbed(message) !== null;
	}

	let pollMessage = false;
	$: pollMessage = isPollMessage(message);

	let referencedMessage: Message | null = null;
	$: referencedMessage = message.reference?.message ?? message.referencedMessage ?? null;

	function isRenderedInline(attachment: Asset): boolean {
		return attachment.type === "image" ||
			attachment.type === "video" ||
			(attachment.type === "unknown" && !attachment.filenameWithoutHash.includes("."));
	}

	function attachmentIdentity(attachment: Asset): string {
		return attachment.mediaId?.toString() ?? attachment._id ?? attachment.filenameWithoutHash;
	}

	function normalizeMediaUrl(value: string | null | undefined): string {
		if (!value) {
			return "";
		}

		try {
			const url = new URL(value);
			return `${url.origin}${decodeURI(url.pathname)}`.toLowerCase();
		}
		catch {
			return value.split("?")[0].toLowerCase();
		}
	}

	function discordAttachmentId(value: string): string | null {
		try {
			const url = new URL(value.trim());
			const match = url.pathname.match(/^\/attachments\/\d+\/(\d+)\//);
			return match?.[1] ?? null;
		}
		catch {
			return null;
		}
	}

	function assetMatchesContent(attachment: Asset, content: string): boolean {
		const normalizedContent = normalizeMediaUrl(content.trim());
		const contentAttachmentId = discordAttachmentId(content);
		const attachmentIds = [
			attachment._id,
			discordAttachmentId(attachment.originalUrl ?? ""),
			discordAttachmentId(attachment.discordUrl ?? ""),
			discordAttachmentId(attachment.originalPath)
		].filter(Boolean);
		const discordIdMatches = contentAttachmentId !== null &&
			attachmentIds.includes(contentAttachmentId);

		return discordIdMatches || (normalizedContent !== "" &&
			[attachment.path, attachment.originalPath, attachment.localPath, attachment.remotePath]
				.some(path => normalizeMediaUrl(path) === normalizedContent));
	}

	let failedInlineAttachments = new Set<string>();

	function handleInlineMediaStatus(attachment: Asset, status: "loaded" | "failed") {
		const next = new Set(failedInlineAttachments);
		const identity = attachmentIdentity(attachment);
		if (status === "failed") {
			next.add(identity);
		}
		else {
			next.delete(identity);
		}
		failedInlineAttachments = next;
	}

	let renderedEmbedMedia: Asset[] = [];
	$: renderedEmbedMedia = (message.embeds ?? []).flatMap(embed =>
		[embed.image, embed.video, ...(embed.images ?? [])]
			.filter((asset): asset is Asset => Boolean(asset)));

	let directGifEmbedUrls: string[] = [];
	$: directGifEmbedUrls = (message.embeds ?? [])
		.filter(isDirectGifEmbed)
		.map(embed => embed.url);

	let videoEmbedUrls: string[] = [];
	$: videoEmbedUrls = (message.embeds ?? [])
		.filter(embed => Boolean(embed.video))
		.map(embed => embed.url)
		.filter(Boolean);

	let filteredMessageContent = "";
	$: filteredMessageContent = message.content[0].content
		.split(/\r?\n/)
		.filter(line => {
			if (directGifEmbedUrls.some(url => urlsMatch(line, url)) ||
				videoEmbedUrls.some(url => urlsMatch(line, url))) {
				return false;
			}

			const matchingAttachment = (message.attachments ?? [])
				.filter(isRenderedInline)
				.find(attachment => assetMatchesContent(attachment, line));
			if (matchingAttachment) {
				return failedInlineAttachments.has(attachmentIdentity(matchingAttachment));
			}

			return !renderedEmbedMedia.some(asset => assetMatchesContent(asset, line));
		})
		.join("\n")
		.trim();

	let shouldShowMessageContent = false;
	$: shouldShowMessageContent =
		(!pollMessage || message.content[0].content !== "") &&
		filteredMessageContent !== "";

	function assetMatchesAttachment(asset: Asset, attachment: Asset): boolean {
		const assetPaths = [asset._id, asset.path, asset.originalPath, asset.localPath, asset.remotePath]
			.filter(Boolean)
			.map(value => value.split("?")[0].toLowerCase());
		const attachmentPaths = [attachment._id, attachment.path, attachment.originalPath, attachment.localPath, attachment.remotePath]
			.filter(Boolean)
			.map(value => value.split("?")[0].toLowerCase());

		return assetPaths.some(path => attachmentPaths.includes(path)) ||
			asset.filenameWithoutHash.toLowerCase() === attachment.filenameWithoutHash.toLowerCase();
	}

	function isDuplicateAttachmentEmbed(embed: Embed, attachments: Asset[]): boolean {
		// Keep ordinary link previews. Only suppress a media-only embed when the same
		// asset is already rendered by MessageAttachments below it.
		if (embed.title || embed.description || embed.author || embed.footer || embed.fields.length > 0) {
			return false;
		}

		const embedAssets = [embed.thumbnail, ...(embed.images ?? []), embed.video].filter(Boolean) as Asset[];
		const inlineAttachments = attachments.filter(isRenderedInline);

		return embedAssets.length > 0 && inlineAttachments.some(attachment =>
			embedAssets.some(asset => assetMatchesAttachment(asset, attachment))
		);
	}

	let visibleEmbeds: Embed[] = [];
	$: visibleEmbeds = (message.embeds ?? []).filter(embed => !isDuplicateAttachmentEmbed(embed, message.attachments ?? []));

	let reactionsFollowMedia = false;
	$: reactionsFollowMedia =
		(message.attachments?.length ?? 0) > 0 ||
		visibleEmbeds.length > 0 ||
		(message.stickers?.length ?? 0) > 0;
</script>

{#if !pollMessage}
	<MessageReferenced {message} {referencedMessage} {messageState} />
{/if}
<div class="avatar-row">
	{#if !messageState.shouldMerge}
		<MessageAvatar author={message.author} on:click={() => viewUserState.setUser(message.author)} {messageState} />
	{:else}
		<div></div>
	{/if}
	<div on:click style="width: 100%;">
		{#if !messageState.shouldMerge}
			<div class="authorline">
				<MessageAuthorName
					author={message.author}
					on:click={() => viewUserState.setUser(message.author)}
					{messageState}
					isOriginalPoster={sameDiscordId(message.author._id, originalPosterId)}
				/>
				<MessageTimestamp channelOrThreadId={message.channelId} timestamp={message.timestamp} messageId={message._id} />
			</div>
		{/if}
		<div class="message-accessories" on:contextmenu={(e) => handleContextMenu(e, () => onMessageRightClick(e, message))}>
			{#if shouldShowMessageContent}
				<div><MessageContent {message} content={filteredMessageContent} /></div>
			{/if}
			{#each messageState.invites as invite (invite.code)}
				<MessageInvite {invite} />
			{/each}
			{#if pollMessage}
				<div><MessagePoll {message} /></div>
			{/if}
			{#if (message.attachments?.length ?? 0) > 0}
				<div>
					<MessageAttachments
						attachments={message.attachments}
						onmediastatus={handleInlineMediaStatus}
					/>
				</div>
			{/if}
			{#if !pollMessage && visibleEmbeds.length > 0}
				{#each visibleEmbeds as embed}
					<div><MessageEmbed {embed} {messageState} messageId={message._id} /></div>
				{/each}
			{/if}
			{#if (message.stickers?.length ?? 0) > 0}
				<MessageStickers stickers={message.stickers} />
			{/if}
			{#if message.isDeleted && !shouldShowMessageContent}
				<div class="message-deletion-status">(deleted)</div>
			{/if}
			<!-- {/if} -->
		</div>
		{#if message.reactions}
			<MessageReactions reactions={message.reactions} followsMedia={reactionsFollowMedia} />
		{/if}
	</div>
</div>

<style>
	.authorline {
		margin-bottom: 2px;
	}
	.avatar-row {
		display: grid;
		gap: 15px;
		grid-template-columns: 40px minmax(0, 1fr);
		width: 100%;
	}

	.message-accessories {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.message-deletion-status {
		color: #a3a6aa;
		font-size: 0.75rem;
		font-weight: 500;
	}
</style>
