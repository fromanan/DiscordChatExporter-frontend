<script lang="ts">
    import { checkUrl } from '../../js/helpers';
    import type { Asset } from '../../js/interfaces';
    import { resolveArchiveMediaId } from '../../js/mediaArchive';
    import { getOfflineMediaUrl } from '../../js/stores/api';
    import { ensureOfflineMediaState, offlineMediaStates } from '../../js/stores/offlineMediaStore.svelte';
    import { getImagegalleryState } from './imagegalleryState.svelte';
    import MediaLoadFailure from '../message/MediaLoadFailure.svelte';
    import MediaLoadingSkeleton from '../message/MediaLoadingSkeleton.svelte';
    import MediaArchiveIndicator from '../message/MediaArchiveIndicator.svelte';
    interface MyProps {
        assets?: Asset[] | null;
        asset: Asset;
		inline?: boolean;
		class?: string;
		alt?: string;
		clickable?: boolean;
		aspectRatio?: string;
		reserveSpace?: boolean;
		fillContainer?: boolean;
		showCloudIndicator?: boolean;
		messageId?: string;
		mediaKind?: string;
		forceSpoiler?: boolean | null;
		onerror?: (event: Event) => void;
		onload?: (event: Event) => void;
    }
    let { assets = null, asset, inline = false, class: divclass = "", alt = "", clickable = true, aspectRatio = undefined, reserveSpace = false, fillContainer = false, showCloudIndicator = false, messageId = undefined, mediaKind = undefined, forceSpoiler = null, onerror = undefined, onload = undefined, ...otherProps}: MyProps = $props();
	let manualSpoilerHidden = $state(false)
	let resolvedMediaId = $state<number | null>(asset.mediaId ?? null)
	let reloadAttempt = $state(0)
	let wrapperElement = $state<HTMLDivElement | null>(null)
	let isNearViewport = $state(false)
	let settledThumbnailUrl = $state<string | null>(null)
	let failedThumbnailUrl = $state<string | null>(null)
	let mediaUrl = $derived(
		resolvedMediaId && (asset.isOffline === true
			|| $offlineMediaStates[String(resolvedMediaId)] === "offline")
			? getOfflineMediaUrl(resolvedMediaId, asset.filenameWithoutHash)
			: checkUrl(asset))
	let mediaIdentity = $derived(`${mediaUrl}:${reloadAttempt}`)
	let loadedMediaIdentity = $state<string | null>(null)
	let failedMediaIdentity = $state<string | null>(null)
	let isLoaded = $derived(loadedMediaIdentity === mediaIdentity)
	let failedToLoad = $derived(failedMediaIdentity === mediaIdentity)
	let thumbnailSettled = $derived(
		!asset.thumbnailUrl
		|| settledThumbnailUrl === asset.thumbnailUrl
		|| failedThumbnailUrl === asset.thumbnailUrl)
	let shouldLoadFullMedia = $derived(isNearViewport && thumbnailSettled)
	let measuredWidth = $state<number | null>(null)
	let measuredHeight = $state<number | null>(null)
	let resolvedAspectRatio = $derived(
		aspectRatio
			?? (asset?.width && asset?.height ? `${asset.width} / ${asset.height}` : undefined)
			?? (measuredWidth && measuredHeight ? `${measuredWidth} / ${measuredHeight}` : undefined))
	let resolvedWidth = $derived.by(() => {
		const width = asset?.width || measuredWidth
		const height = asset?.height || measuredHeight
		if (!width || !height) {
			return undefined
		}

		return `min(${width}px, 550px, ${(400 * width) / height}px, calc(100% - 20px))`
	})
	let isBlurred = $derived.by(()=> {
		if (manualSpoilerHidden) {
			return false
		}
		if (forceSpoiler !== null) {
			return forceSpoiler
		}
		if (asset?.filenameWithoutHash.startsWith('SPOILER')) {
			return true
		}
		return false
	});

	$effect(() => {
		let cancelled = false
		void resolveArchiveMediaId(asset, messageId, mediaKind)
			.then(id => {
				if (!cancelled) {
					resolvedMediaId = id
					if (id) {
						void ensureOfflineMediaState(id, asset.isOffline)
					}
				}
			})
		return () => {
			cancelled = true
		}
	})

	$effect(() => {
		if (!wrapperElement || typeof IntersectionObserver === "undefined") {
			isNearViewport = true
			return
		}

		const observer = new IntersectionObserver(entries => {
			if (entries.some(entry => entry.isIntersecting)) {
				isNearViewport = true
				observer.disconnect()
			}
		}, { rootMargin: "300px" })
		observer.observe(wrapperElement)
		return () => observer.disconnect()
	})

	function viewGallery() {
		if (isBlurred) {
			manualSpoilerHidden = true
		}
		else {
			if (assets) {
				imagegalleryState.showMultipleAssets(assets, asset)
			}
			else {
				imagegalleryState.showSingleAsset(asset)
			}
		}
	}

	function handleLoad(event: Event) {
		const image = event.currentTarget as HTMLImageElement
		if (image.naturalWidth > 0 && image.naturalHeight > 0) {
			measuredWidth = image.naturalWidth
			measuredHeight = image.naturalHeight
		}
		loadedMediaIdentity = mediaIdentity
		failedMediaIdentity = null
		onload?.(event)
	}

	function handleError(event: Event) {
		loadedMediaIdentity = null
		failedMediaIdentity = mediaIdentity
		onerror?.(event)
	}

	function retryMedia() {
		loadedMediaIdentity = null
		failedMediaIdentity = null
		reloadAttempt++
	}
    const imagegalleryState = getImagegalleryState();
</script>


<div bind:this={wrapperElement} class="spoiler-wrapper {divclass}" onclick={clickable ? viewGallery : undefined} class:clickable={clickable} class:loading={!isLoaded && !failedToLoad && !thumbnailSettled} class:failed={failedToLoad} class:fill-container={fillContainer} style:aspect-ratio={reserveSpace ? resolvedAspectRatio : undefined} style:width={reserveSpace && !fillContainer ? resolvedWidth : undefined}>
	{#if showCloudIndicator && !failedToLoad}
		<MediaArchiveIndicator {asset} {messageId} {mediaKind} />
	{/if}
	<MediaLoadingSkeleton active={!isLoaded && !failedToLoad && !thumbnailSettled} />
	{#if failedToLoad}
		<MediaLoadFailure onreload={retryMedia} />
	{/if}
	{#if asset.thumbnailUrl}
		<img
			class="media-thumbnail"
			class:hidden={isLoaded || failedThumbnailUrl === asset.thumbnailUrl}
			src={asset.thumbnailUrl}
			loading="lazy"
			decoding="async"
			alt=""
			aria-hidden="true"
			onload={() => settledThumbnailUrl = asset.thumbnailUrl ?? null}
			onerror={() => failedThumbnailUrl = asset.thumbnailUrl ?? null}
		/>
	{/if}
	{#if shouldLoadFullMedia}
		{#key mediaIdentity}
			<img
				class="media-full"
				class:media-spoiler={isBlurred}
				class:loaded={isLoaded}
				src={mediaUrl}
				loading="lazy"
				decoding="async"
				{alt}
				{...otherProps}
				onload={handleLoad}
				onerror={handleError}
			/>
		{/key}
	{/if}
</div>


<style>
	.clickable {
		cursor: pointer;
	}
	.spoiler-wrapper {
		position: relative;
		overflow: hidden;
		max-width: min(550px, 100%);
		max-height: 400px;
		background: #2b2d31;
		img.media-spoiler {
			filter: blur(100px);
			cursor: pointer;
		}

		img {
			position: relative;
			z-index: 1;
			display: block;
			max-width: 100%;
			width: auto;
			height: auto;
			object-fit: contain;
			opacity: 0;
			transition: opacity 120ms ease-out;
		}

		img.media-thumbnail {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: contain;
			opacity: 1;
			transition: opacity 120ms ease-out;
		}

		img.media-thumbnail.hidden {
			opacity: 0;
		}

		img.loaded {
			opacity: 1;
		}

		&.fill-container img {
			width: 100%;
			height: 100%;
		}
	}

</style>
