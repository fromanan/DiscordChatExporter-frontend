<script lang="ts">
    import { checkUrl } from "../../js/helpers";
    import type { Asset, Embed } from "../../js/interfaces";
    import { fetchRedditPreviewMedia } from "../../js/stores/api";
    import MessageMarkdown from "./MessageMarkdown.svelte";
    import { renderTimestamp } from "../../js/time";
    import MessageTiledImages from "./MessageTiledImages.svelte";
    import Image from "../imagegallery/Image.svelte";
    import MessageVideo from "./MessageVideo.svelte";
    import VideoCenterPlayButton from "./VideoCenterPlayButton.svelte";
    import MediaLoadingSkeleton from "./MediaLoadingSkeleton.svelte";
    import MediaArchiveIndicator from "./MediaArchiveIndicator.svelte";
    import { isDirectGifEmbed } from "../../js/directGifEmbeds";
    import { getExternalVideoEmbed, isGyazoCaptureUrl } from "../../js/externalVideoProviders";
    import { isEmbedMediaArchivingExcluded } from "../../js/embedMediaArchiveExclusions";

    interface MyProps {
        embed: Embed;
        messageState: any;
        messageId: string;
    }
    let { embed, messageState, messageId }: MyProps = $props();

    let fieldGroups = $derived.by(()=> {
        let groups = []
        let currentGroup = []
        const fields = embed.fields ?? []
        for (let i = 0; i < fields.length; i += 1) {
            let currentField = fields[i]
            if (!currentField.isInline) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup)
                    currentGroup = []
                }
                groups.push([currentField])
            }
            else {
                if (currentGroup.length === 3) {
                    groups.push(currentGroup)
                    currentGroup = []
                }
                currentGroup.push(currentField)
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup)
        }
        return groups
    })

    let playingVideo: boolean = $state(false)
	let gifvUrl = $derived(embed.video ? checkUrl(embed.video) : "")
	let loadedGifvUrl = $state<string | null>(null)
	let failedGifvUrl = $state<string | null>(null)
	let gifvLoaded = $derived(gifvUrl !== "" && loadedGifvUrl === gifvUrl)
	let gifvFailedToLoad = $derived(gifvUrl !== "" && failedGifvUrl === gifvUrl)
	let gifvAspectRatio = $derived(`${embed.video?.width ?? 16} / ${embed.video?.height ?? 9}`)
	let gifvWidth = $derived(embed.video?.width && embed.video?.height
		? `min(${embed.video.width}px, 550px, ${(400 * embed.video.width) / embed.video.height}px, calc(100% - 20px))`
		: "min(550px, calc(100% - 20px))")

    let authorIconFailedToLoad: boolean = $state(false)
    let footerIconFailedToLoad: boolean = $state(false)

    const spotifyRegex = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
    let spotifyId = $derived(embed.url?.match(spotifyRegex)?.[1] ?? null)

    let externalVideo = $derived(getExternalVideoEmbed(embed.url))
    let embeddedVideo = $derived(withEmbedThumbnail(embed.video, embed.thumbnail))
    let isGyazoVideo = $derived(isGyazoCaptureUrl(embed.url) && Boolean(embed.video))
    let thirdPartyVideoTitle = $derived(
        isThirdPartyEmbedUrl(embed.url) && embed.title?.trim()
            ? embed.title.trim()
            : undefined)
    let archiveMediaExcluded = $derived(isEmbedMediaArchivingExcluded(embed))
    let redditThreadUrl = $derived(getRedditThreadUrl(embed.url))
    let redditPreviewImage = $derived(redditThreadUrl
        ? embed.image ?? embed.images?.[0] ?? null
        : null)
    let resolvedRedditVideo = $state<Asset | null>(null)
    let playableVideo = $derived(embeddedVideo ?? resolvedRedditVideo)
    let hasPlayableVideo = $derived(Boolean(externalVideo || playableVideo))

    $effect(() => {
        const threadUrl = redditThreadUrl
        if (!threadUrl || embed.video) {
            resolvedRedditVideo = null
            return
        }

        let cancelled = false
        fetchRedditPreviewMedia(threadUrl).then(media => {
            if (!cancelled && media) {
                resolvedRedditVideo = createRemoteVideoAsset(media.url)
            }
        })
        return () => {
            cancelled = true
        }
    })

    const tenorRegex = /(?:https?:)?\/\/(?:www\.)?(?:tenor\.com)\/(?:view|watch)\/[%\w\-]+-(\d+)/
    let tenorId = $derived(embed.url?.match(tenorRegex)?.[1] ?? null)
    let isGifv = $derived(isDirectGifEmbed(embed))

    let smallThumbnail: boolean = $derived.by(() => {
        if (spotifyId) {
            return false
        }

        if (embed.hasOwnProperty('video')) {
            return false
        }

        if (embed.fields && embed.fields.length > 0) {
            return true
        }

        return false
    })

    function playVideo() {
        playingVideo = true
    }

    function getRedditThreadUrl(value: string | null | undefined): string | null {
        if (!value) {
            return null
        }

        try {
            const url = new URL(value)
            const hostname = url.hostname.toLowerCase()
            const isRedditHost = hostname === "reddit.com"
                || hostname.endsWith(".reddit.com")
                || hostname === "redd.it"
            const isThread = hostname === "redd.it" || url.pathname.toLowerCase().includes("/comments/")
            return isRedditHost && isThread ? url.href : null
        } catch {
            return null
        }
    }

    function createRemoteVideoAsset(url: string): Asset {
        const fallback = redditPreviewImage
        return {
            ...(fallback ?? {}),
            _id: url,
            originalPath: url,
            canonicalUrl: url,
            localPath: "",
            remotePath: url,
            path: url,
            extension: ".mp4",
            type: "video",
            width: fallback?.width ?? 0,
            height: fallback?.height ?? 0,
            sizeBytes: 0,
            filenameWithHash: "reddit-preview.mp4",
            filenameWithoutHash: "reddit-preview.mp4",
            mediaId: undefined,
            fileId: undefined,
            thumbnailMediaId: undefined,
            thumbnailFileId: undefined,
            cachedThumbnailFileId: undefined,
            thumbnailUrl: fallback ? checkUrl(fallback) : undefined,
            isOffline: false,
            colorDominant: fallback?.colorDominant ?? null,
            colorPalette: fallback?.colorPalette ?? null
        }
    }

    function withEmbedThumbnail(video: Asset | undefined, thumbnail: Asset | undefined): Asset | null {
        if (!video || video.thumbnailUrl || !thumbnail) {
            return video ?? null
        }

        return {
            ...video,
            thumbnailUrl: checkUrl(thumbnail)
        }
    }

    function isThirdPartyEmbedUrl(value: string | null | undefined): boolean {
        if (!value) {
            return false
        }

        try {
            const hostname = new URL(value).hostname.toLowerCase()
            return hostname !== "discord.com"
                && !hostname.endsWith(".discord.com")
                && hostname !== "discordapp.com"
                && !hostname.endsWith(".discordapp.com")
                && hostname !== "discordapp.net"
                && !hostname.endsWith(".discordapp.net")
        } catch {
            return false
        }
    }

    function onAuthorIconError(e: Event) {
        console.log('author icon error', e)
        authorIconFailedToLoad = true
    }

    function onFooterIconError(e: Event) {
        console.log('footer icon error', e)
        footerIconFailedToLoad = true
    }
</script>

<div class="main-wrapper">
    {#if isGifv}
        {#if embed.video}
            <div class="gifv-wrapper" style:aspect-ratio={gifvAspectRatio} style:width={gifvWidth}>
                {#if !archiveMediaExcluded}
                    <MediaArchiveIndicator asset={embed.video} {messageId} mediaKind="embed-video" />
                {/if}
                <MediaLoadingSkeleton active={!gifvLoaded && !gifvFailedToLoad} />
                <video
                    class="videogif"
                    class:loaded={gifvLoaded || gifvFailedToLoad}
                    src={gifvUrl}
                    autoplay
                    loop
                    muted
                    playsinline
                    onloadeddata={() => {
                        loadedGifvUrl = gifvUrl
                        failedGifvUrl = null
                    }}
                    onerror={() => {
                        loadedGifvUrl = null
                        failedGifvUrl = gifvUrl
                    }}
                ></video>
            </div>
        {:else}
            <!-- workaround for older exports (embed tenor iframe) -->
            <div class="embed-tenor-container">
                <iframe class="embed-tenor" src="https://tenor.com/embed/{tenorId}" frameBorder="0" allowfullscreen style="aspect-ratio: {embed.thumbnail?.width ?? 1} / {embed.thumbnail?.height ?? 1};"></iframe>
            </div>
        {/if}
    {:else if spotifyId}
        <iframe class="spotify-iframe" src={`https://open.spotify.com/embed/track/${spotifyId}`} frameborder="0" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts" style="width: 400px; height: 80px;"></iframe>
    {:else if embeddedVideo && (isGyazoVideo || (embed.title === "" && embed.description === ""))}
        <MessageVideo attachment={embeddedVideo} {messageId} mediaKind="embed-video" showArchiveIndicator={!archiveMediaExcluded} mediaTitle={thirdPartyVideoTitle} mediaLink={thirdPartyVideoTitle ? embed.url : undefined} />
    {:else}
        <div class="embed" class:smallthumbnail={smallThumbnail} style="border-left: {embed.color} 4px solid;">
            <div class="header-row">
                <div class="header-col">
                    {#if externalVideo}
                        <div class="website-name">{externalVideo.name}</div>
                    {/if}
                    {#if embed.author}
                        <div class="author-name">
                            {#if embed.author.icon && !authorIconFailedToLoad}
                                {#if redditThreadUrl}
                                    <a class="reddit-home-link" href="https://www.reddit.com/" target="_blank" rel="noopener noreferrer" aria-label="Open Reddit homepage">
                                        <img class="author-icon" src={checkUrl(embed.author.icon)} alt="" width="24" height="24" onerror={onAuthorIconError} />
                                    </a>
                                {:else}
                                    <img class="author-icon" src={checkUrl(embed.author.icon)} alt="" width="24" height="24" onerror={onAuthorIconError} />
                                {/if}
                            {/if}
                            <a href={redditThreadUrl ?? embed.author.url} target="_blank" rel="noopener noreferrer">{embed.author.name}</a>
                        </div>
                    {/if}

                    <div class="title">
                        {#if embed.url}
                            <a href={embed.url} target="_blank" rel="noopener noreferrer">{embed.title}</a>
                        {:else}
                            {embed.title}
                        {/if}
                    </div>

                    {#if externalVideo?.name !== "Twitch"}
                        <div class="description">
                            <MessageMarkdown content={embed.description} />
                        </div>
                    {/if}

                    {#if (embed.fields?.length ?? 0) > 0}
                        <div class="fields">
                            {#each fieldGroups as group}
                                {#each group as field}
                                    <div class="field field-{group.length}" class:inlinefield={field.isInline}>
                                        <div class="field-name">{field.name}</div>
                                        <div class="field-value"><MessageMarkdown content={field.value} /></div>
                                    </div>
                                {/each}
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if embed.thumbnail && !playingVideo}
                    <div class="thumb-col">
                        <div class="thumbnail-wrapper">
                            <Image asset={embed.thumbnail} reserveSpace={true} showCloudIndicator={!archiveMediaExcluded} {messageId} mediaKind="embed-thumbnail" forceSpoiler={messageState.messageContentLinkIsSpoilered} class="global-embedthumb" />
                            {#if redditThreadUrl}
                                <a class="reddit-hotspot reddit-thread-header" href={redditThreadUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Reddit post or comment"></a>
                                <a class="reddit-hotspot reddit-home" href="https://www.reddit.com/" target="_blank" rel="noopener noreferrer" aria-label="Open Reddit homepage"></a>
                                <a class="reddit-hotspot reddit-thread-stats" href={redditThreadUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Reddit post or comment"></a>
                            {/if}
                            {#if hasPlayableVideo}
                                <VideoCenterPlayButton onclick={playVideo} />
                            {/if}
                        </div>
                    </div>
                {/if}

                {#if !embed.thumbnail && embed.video}
                    <div class="embed-video-2">
                        <MessageVideo attachment={embed.video} {messageId} mediaKind="embed-video" showArchiveIndicator={!archiveMediaExcluded} />
                    </div>
                {/if}

                {#if playingVideo}
                    {#if externalVideo && !playableVideo}
                        <div class="provider-video-container" style:aspect-ratio={`${embed.video?.width ?? embed.thumbnail?.width ?? 16} / ${embed.video?.height ?? embed.thumbnail?.height ?? 9}`}>
                            <!-- Provider URLs are constructed from an allow-list in externalVideoProviders.ts. -->
                            <iframe
                                title={`${externalVideo.name} video player`}
                                src={externalVideo.src}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                frameborder="0"
                                scrolling="no"
                                sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
                                allowfullscreen
                            ></iframe>
                            {#if thirdPartyVideoTitle}
                                <a
                                    class="provider-video-title"
                                    href={embed.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >{thirdPartyVideoTitle}</a>
                            {/if}
                        </div>
                    {:else if playableVideo}
                        <div class="embed-video-2">
                            <MessageVideo attachment={playableVideo} {messageId} mediaKind="embed-video" showArchiveIndicator={Boolean(embed.video) && !archiveMediaExcluded} mediaTitle={thirdPartyVideoTitle} mediaLink={thirdPartyVideoTitle ? embed.url : undefined} />
                        </div>
                    {/if}
                {/if}
            </div>

            {#if redditPreviewImage && !playingVideo}
                <div class="reddit-preview-wrapper">
                    <Image asset={redditPreviewImage} reserveSpace={true} showCloudIndicator={!archiveMediaExcluded} {messageId} mediaKind="embed-image" forceSpoiler={messageState.messageContentLinkIsSpoilered} class="global-embedthumb" />
                    <a class="reddit-hotspot reddit-thread-header" href={redditThreadUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Reddit post or comment"></a>
                    <a class="reddit-hotspot reddit-home" href="https://www.reddit.com/" target="_blank" rel="noopener noreferrer" aria-label="Open Reddit homepage"></a>
                    <a class="reddit-hotspot reddit-thread-stats" href={redditThreadUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Reddit post or comment"></a>
                    {#if hasPlayableVideo}
                        <VideoCenterPlayButton onclick={playVideo} />
                    {/if}
                </div>
            {:else if embed.images.length > 0 && !redditThreadUrl}
                <div class="image-embeds-wrapper">
                    <MessageTiledImages images={embed.images} isAttachment={false} {messageId} mediaKind="embed-image" showCloudIndicators={!archiveMediaExcluded} />
                </div>
            {/if}


            {#if embed.footer}
                <div class="footer">
                    <div class="footer-row">
                        {#if embed.footer.icon && !footerIconFailedToLoad}
                            {#if redditThreadUrl}
                                <a class="footer-home-link" href="https://www.reddit.com/" target="_blank" rel="noopener noreferrer" aria-label="Open Reddit homepage">
                                    <img class="footer-icon" src={checkUrl(embed.footer.icon)} alt="" width="20" height="20" onerror={onFooterIconError} />
                                </a>
                            {:else}
                                <img class="footer-icon" src={checkUrl(embed.footer.icon)} alt="" width="20" height="20" onerror={onFooterIconError} />
                            {/if}
                        {/if}
                        {#if redditThreadUrl}
                            <a class="footer-text footer-link" href={redditThreadUrl} target="_blank" rel="noopener noreferrer">{embed.footer?.text}</a>
                        {:else}
                            <span class="footer-text">{embed.footer?.text}</span>
                        {/if}
                        {#if embed.timestamp}
                            <span class="footer-separator">•</span><span class="footer-timestamp">{renderTimestamp(embed.timestamp)}</span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .provider-video-container {
        margin-top: 16px;
		position: relative;
		width: 100%;
        max-width: 400px;
        max-height: 400px;
        overflow: hidden;
        border-radius: 3px;
        background: #000;
	}

	.provider-video-container iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

    .provider-video-title {
        position: absolute;
        z-index: 2;
        top: 13px;
        left: 14px;
        width: fit-content;
        max-width: calc(100% - 28px);
        overflow: hidden;
        padding: 4px 8px;
        border-radius: 4px;
        color: #f2f3f5;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        background: rgba(17, 18, 20, 0.76);
        box-sizing: border-box;
        text-overflow: ellipsis;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
        white-space: nowrap;
        text-decoration: none;
        opacity: 0;
        pointer-events: none;
        transform: translateY(calc(-100% - 13px));
        transition: opacity 160ms ease, transform 160ms ease;
    }

    .provider-video-container:hover .provider-video-title,
    .provider-video-container:focus-within .provider-video-title {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
    }
    .videogif {
        position: relative;
        z-index: 1;
        max-width: min(550px, 100%);
		max-height: 400px;
        width: 100%;
        display: block;
        border-radius: 4px;
		opacity: 0;
		transition: opacity 120ms ease-out;
    }
    .videogif.loaded {
		opacity: 1;
    }
    .gifv-wrapper {
        position: relative;
        width: fit-content;
        max-width: min(550px, 100%);
		max-height: 400px;
        overflow: hidden;
        border-radius: 4px;
        background: #2b2d31;
    }
    .embed-tenor-container {
		pointer-events: none;

        .embed-tenor {
            width: 300px;
            height: auto;
            max-width: 100%;
            max-height: 100%;
        }
	}

    .spotify-iframe {
        max-width: 100%;
    }

    .main-wrapper {
        padding: 2px 0;
    }

    .embed {
        background-color: #2B2D31;
        border-radius: 4px;
        padding: 8px 16px 16px 12px;
        max-width: 432px;

        &.smallthumbnail .header-row {
            display: flex;

            .thumb-col {
                display: block;
                .thumbnail-wrapper {
                    margin: 8px 0 0 16px;
                    max-width: 80px;
                    max-height: 80px;
                }
            }
        }

        .header-row .header-col {
            flex: 1;

            .website-name {
                margin-top: 8px;
                font-weight: 400;
                font-size: 12px;
                color: #b6bac1;
            }

            .author-name {
                margin-top: 8px;
                font-weight: 600;
                font-size: 14px;

                display: flex;
                align-items: center;

                .author-icon {
                    margin-right: 8px;
                }

                .reddit-home-link {
                    display: flex;
                    flex: 0 0 auto;
                }

                a {
                    color: #f2f3f5;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
            }

            .title {
                margin-top: 8px;
                font-size: 16px;
                font-weight: 600;

                a {
                    color: #53a8f9;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
            }

            .description {
                font-size: 14px;
                font-weight: 400;
                line-height: 18px !important;
                margin-top: 8px;
            }
        }


        .thumb-col {
            display: grid;
            place-items: center;

            .thumbnail-wrapper {
                position: relative;
                margin-top: 16px;
                width: 100%;
                max-width: 400px;

            }
        }

        .reddit-preview-wrapper {
            position: relative;
            width: 100%;
            max-width: 400px;
            margin-top: 16px;
            overflow: hidden;
            border-radius: 3px;
        }

        .reddit-hotspot {
            position: absolute;
            z-index: 2;
            display: block;
            border-radius: 4px;
        }

        .reddit-hotspot:focus-visible {
            outline: 2px solid #fff;
            outline-offset: -2px;
        }

        .reddit-thread-header {
            top: 0;
            left: 0;
            width: 42%;
            height: 28%;
        }

        .reddit-home {
            top: 0;
            right: 0;
            width: 17%;
            height: 28%;
        }

        .reddit-thread-stats {
            bottom: 0;
            left: 0;
            width: 42%;
            height: 25%;
        }

        .fields {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 8px;
            margin-top: 8px;

            position: relative;

            .field {
                width: 100%;
                box-sizing: content-box;

                &.inlinefield.field-3 {
                    width: calc(33.33% - 6px);
                }
                &.inlinefield.field-2 {
                    width: calc(50% - 4px);
                }

                .field-name {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 2px;
                    color: #f2f3f5;
                }

                .field-value {
                    font-size: 14px;
                    font-weight: 400;
                    color: #dcdee1;
                    width: 100%;
                }
            }
        }

        .image-embeds-wrapper {
            margin-top: 16px;
        }

        .embed-video-2 {
            margin-top: 16px;
        }

        .footer {
            margin-top: 8px;
            .footer-row {
                font-size: 12px;
                font-weight: 500;
                color: #dcdee1;
                display: flex;
                align-items: center;

                .footer-icon {
                    margin-right: 8px;
                }

                .footer-home-link {
                    display: flex;
                    flex: 0 0 auto;
                }

                .footer-link {
                    color: inherit;
                    text-decoration: none;
                }

                .footer-link:hover {
                    text-decoration: underline;
                }

                .footer-separator {
                    margin: 0 4px
                }
            }
        }
    }


    :global(.global-embedthumb) {
        border-radius: 3px;
    }
</style>
