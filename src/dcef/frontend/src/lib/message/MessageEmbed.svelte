<script lang="ts">
    import { checkUrl } from "../../js/helpers";
    import type { Embed } from "../../js/interfaces";
    import MessageMarkdown from "./MessageMarkdown.svelte";
    import { renderTimestamp } from "../../js/time";
    import MessageTiledImages from "./MessageTiledImages.svelte";
    import Image from "../imagegallery/Image.svelte";
    import Icon from "../icons/Icon.svelte";
    import MessageVideo from "./MessageVideo.svelte";
    import MediaLoadingSkeleton from "./MediaLoadingSkeleton.svelte";
    import MediaArchiveIndicator from "./MediaArchiveIndicator.svelte";
    import { isDirectGifEmbed } from "../../js/directGifEmbeds";
    import { getExternalVideoEmbed } from "../../js/externalVideoProviders";
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
        for (let i = 0; i < embed.fields.length; i += 1) {
            let currentField = embed.fields[i]
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
    let hasPlayableVideo = $derived(Boolean(externalVideo || embed.video))
    let archiveMediaExcluded = $derived(isEmbedMediaArchivingExcluded(embed))

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
    {:else if embed.video && embed.title === "" && embed.description === ""}
        <MessageVideo attachment={embed.video} {messageId} mediaKind="embed-video" showArchiveIndicator={!archiveMediaExcluded} />
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
                                <img class="author-icon" src={checkUrl(embed.author.icon)} alt="" width="24" height="24" onerror={onAuthorIconError} />
                            {/if}
                            <a href={embed.author.url} target="_blank" rel="noopener noreferrer">{embed.author.name}</a>
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

                    {#if embed.fields.length > 0}
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
                            {#if hasPlayableVideo}
                                <div class="pill">
                                    <button class="icon" onclick={playVideo}>
                                        <Icon name="player/play" width={24} />
                                        <span class="visually-hidden">Play video</span>
                                    </button>
                                    <a class="icon" href={embed.url} target="_blank" rel="noopener noreferrer">
                                        <Icon name="player/openLink" width={24} />
                                    </a>
                                </div>
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
                    {#if externalVideo}
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
                        </div>
                    {:else if embed.video}
                        <div class="embed-video-2">
                            <MessageVideo attachment={embed.video} {messageId} mediaKind="embed-video" showArchiveIndicator={!archiveMediaExcluded} />
                        </div>
                    {/if}
                {/if}
            </div>

            {#if embed.images.length > 0}
                <div class="image-embeds-wrapper">
                    <MessageTiledImages images={embed.images} isAttachment={false} {messageId} mediaKind="embed-image" showCloudIndicators={!archiveMediaExcluded} />
                </div>
            {/if}


            {#if embed.footer}
                <div class="footer">
                    <div class="footer-row">
                        {#if embed.footer.icon && !footerIconFailedToLoad}
                            <img class="footer-icon" src={checkUrl(embed.footer.icon)} alt="" width="20" height="20" onerror={onFooterIconError} />
                        {/if}
                        <span class="footer-text">{embed.footer?.text}</span>
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

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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

                .pill {
                    position: absolute;

                    display: flex;
                    justify-content: space-between;
                    gap: 3px;

                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);

                    height: 24px;
                    padding: 12px;
                    border-radius: 24px;

                    box-sizing: content-box;


                    background-color: rgba(0, 0, 0, 0.6);
                    .icon {
                        opacity: .6;
                        cursor: pointer;
                        display: block;
                        color: white;
                    }
                    .icon:hover {
                        opacity: 1;
                    }
                }
            }
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
