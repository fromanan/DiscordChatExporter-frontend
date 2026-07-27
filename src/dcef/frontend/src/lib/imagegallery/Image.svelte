<script lang="ts">
    import { checkUrl } from '../../js/helpers';
    import type { Asset } from '../../js/interfaces';
    import { resolveArchiveMediaKey } from '../../js/mediaArchive';
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
	let isLoaded = $state(false)
	let failedToLoad = $state(false)
	let resolvedMediaKey = $state<string | null>(asset.mediaKey ?? null)
	let reloadAttempt = $state(0)
	let mediaUrl = $derived(
		resolvedMediaKey && $offlineMediaStates[resolvedMediaKey] === "offline"
			? getOfflineMediaUrl(resolvedMediaKey, asset.filenameWithoutHash)
			: checkUrl(asset))
	let resolvedAspectRatio = $derived(aspectRatio ?? (asset?.width && asset?.height ? `${asset.width} / ${asset.height}` : undefined))
	let resolvedWidth = $derived.by(() => {
		if (!asset?.width || !asset?.height) {
			return undefined
		}

		return `min(${asset.width}px, 550px, ${(400 * asset.width) / asset.height}px, calc(100% - 20px))`
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
		void resolveArchiveMediaKey(asset, messageId, mediaKind)
			.then(key => {
				if (!cancelled) {
					resolvedMediaKey = key
					if (key) {
						void ensureOfflineMediaState(key)
					}
				}
			})
		return () => {
			cancelled = true
		}
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
		isLoaded = true
		failedToLoad = false
		onload?.(event)
	}

	function handleError(event: Event) {
		failedToLoad = true
		onerror?.(event)
	}

	function retryMedia() {
		isLoaded = false
		failedToLoad = false
		reloadAttempt++
	}
    const imagegalleryState = getImagegalleryState();
</script>


<div class="spoiler-wrapper {divclass}" onclick={clickable ? viewGallery : undefined} class:clickable={clickable} class:loading={!isLoaded && !failedToLoad} class:failed={failedToLoad} class:fill-container={fillContainer} style:aspect-ratio={reserveSpace ? resolvedAspectRatio : undefined} style:width={reserveSpace && !fillContainer ? resolvedWidth : undefined}>
	{#if showCloudIndicator}
		<MediaArchiveIndicator {asset} {messageId} {mediaKind} />
	{/if}
	{#if !isLoaded && !failedToLoad}
		<MediaLoadingSkeleton />
	{:else if failedToLoad}
		<MediaLoadFailure onreload={retryMedia} />
	{/if}
	{#key `${mediaUrl}:${reloadAttempt}`}
		<img
			class:media-spoiler={isBlurred}
			class:loaded={isLoaded}
			src={mediaUrl}
			{alt}
			{...otherProps}
			onload={handleLoad}
			onerror={handleError}
		/>
	{/key}
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
		img.media-spoiler {
			filter: blur(100px);
			cursor: pointer;
		}

		img {
			display: block;
			max-width: 100%;
			width: auto;
			height: auto;
			object-fit: contain;
			opacity: 0;
			transition: opacity 120ms ease-out;
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
