<script lang="ts">
    import { checkUrl } from "../../js/helpers";
    import type { Asset } from "../../js/interfaces";
    import { resolveArchiveMediaKey } from "../../js/mediaArchive";
    import { getOfflineMediaUrl } from "../../js/stores/api";
    import {
        ensureOfflineMediaState,
        offlineMediaStates
    } from "../../js/stores/offlineMediaStore.svelte";
    import { getAudioplayerState } from "../audioplayer/audioplayerState.svelte";
    import Icon from "../icons/Icon.svelte";
    import MediaLoadFailure from "./MediaLoadFailure.svelte";
    import MediaLoadingSkeleton from "./MediaLoadingSkeleton.svelte";
    import MediaArchiveIndicator from "./MediaArchiveIndicator.svelte";

    interface MyProps {
        attachment: Asset;
        onmediastatus?: (asset: Asset, status: "loaded" | "failed") => void;
        messageId?: string;
        mediaKind?: string;
    }

    let { attachment, onmediastatus = undefined, messageId, mediaKind }: MyProps = $props();
    let resolvedMediaKey = $state<string | null>(attachment.mediaKey ?? null);
    let reloadAttempt = $state(0);
    let mediaUrl = $derived(
        resolvedMediaKey && $offlineMediaStates[resolvedMediaKey] === "offline"
            ? getOfflineMediaUrl(resolvedMediaKey, attachment.filenameWithoutHash)
            : checkUrl(attachment));
    const audioplayerState = getAudioplayerState();

    let wrapper: HTMLDivElement;
    let video: HTMLVideoElement;
    let isLoaded = $state(false);
    let failedToLoad = $state(false);
    let metadataWidth = $state<number | null>(attachment.width ?? null);
    let metadataHeight = $state<number | null>(attachment.height ?? null);
    let paused = $state(true);
    let ended = $state(false);
    let hasStarted = $state(false);
    let muted = $state(false);
    let currentTime = $state(0);
    let duration = $state(0);
    let bufferedTime = $state(0);
    let controlsVisible = $state(true);
    let isFullscreen = $state(false);
    let controlsTimeout: ReturnType<typeof setTimeout> | undefined;

    $effect(() => {
        let cancelled = false;
        void resolveArchiveMediaKey(attachment, messageId, mediaKind)
            .then(key => {
                if (!cancelled) {
                    resolvedMediaKey = key;
                    if (key) {
                        void ensureOfflineMediaState(key);
                    }
                }
            });
        return () => {
            cancelled = true;
        };
    });

    function retryMedia() {
        isLoaded = false;
        failedToLoad = false;
        paused = true;
        ended = false;
        hasStarted = false;
        currentTime = 0;
        duration = 0;
        bufferedTime = 0;
        reloadAttempt++;
    }

    let displayWidth = $derived(metadataWidth && metadataHeight
        ? `min(${metadataWidth}px, 550px, ${(400 * metadataWidth) / metadataHeight}px, calc(100% - 20px))`
        : "min(550px, calc(100% - 20px))");
    let playedPercent = $derived(duration > 0 ? Math.min(100, currentTime / duration * 100) : 0);
    let bufferedPercent = $derived(duration > 0 ? Math.min(100, bufferedTime / duration * 100) : 0);

    function formatTime(seconds: number) {
        if (!Number.isFinite(seconds)) return "--:--";

        const wholeSeconds = Math.max(0, Math.floor(seconds));
        const displaySeconds = wholeSeconds % 60;
        const displayMinutes = Math.floor(wholeSeconds / 60) % 60;
        const displayHours = Math.floor(wholeSeconds / 3600);

        return displayHours > 0
            ? `${displayHours}:${displayMinutes.toString().padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`
            : `${displayMinutes}:${displaySeconds.toString().padStart(2, "0")}`;
    }

    function updateBuffered() {
        if (!video || video.buffered.length === 0) {
            bufferedTime = 0;
            return;
        }

        bufferedTime = video.buffered.end(video.buffered.length - 1);
    }

    function captureMetadata() {
        metadataWidth = video.videoWidth || metadataWidth;
        metadataHeight = video.videoHeight || metadataHeight;
        duration = Number.isFinite(video.duration) ? video.duration : 0;
        video.volume = audioplayerState.volume;
        updateBuffered();
    }

    function scheduleControlsHide() {
        if (controlsTimeout) clearTimeout(controlsTimeout);
        controlsVisible = true;

        if (!paused) {
            controlsTimeout = setTimeout(() => {
                controlsVisible = false;
            }, 2200);
        }
    }

    function showControls() {
        scheduleControlsHide();
    }

    function hideControls() {
        if (paused) return;
        if (controlsTimeout) clearTimeout(controlsTimeout);
        controlsVisible = false;
    }

    async function togglePlayback() {
        if (video.paused || video.ended) {
            try {
                await video.play();
            } catch {
                controlsVisible = true;
            }
        } else {
            video.pause();
        }
    }

    function handlePlay() {
        paused = false;
        ended = false;
        hasStarted = true;
        scheduleControlsHide();
    }

    function handlePause() {
        paused = true;
        controlsVisible = true;
        if (controlsTimeout) clearTimeout(controlsTimeout);
    }

    function handleEnded() {
        ended = true;
        paused = true;
        controlsVisible = true;
    }

    function seek(event: Event) {
        const target = event.currentTarget as HTMLInputElement;
        video.currentTime = Number(target.value);
        currentTime = video.currentTime;
        showControls();
    }

    function toggleMute() {
        muted = !muted;
        video.muted = muted;
        showControls();
    }

    async function toggleFullscreen() {
        if (document.fullscreenElement === wrapper) {
            await document.exitFullscreen();
        } else {
            await wrapper.requestFullscreen();
        }
        showControls();
    }
</script>

<div
    bind:this={wrapper}
    class="spoiler-wrapper"
    class:loading={!isLoaded && !failedToLoad}
    class:failed={failedToLoad}
    class:controls-hidden={!controlsVisible && hasStarted}
    style:aspect-ratio="{metadataWidth ?? 16} / {metadataHeight ?? 9}"
    style:width={displayWidth}
    onpointermove={showControls}
    onpointerenter={showControls}
    onpointerleave={hideControls}
    onfullscreenchange={() => isFullscreen = document.fullscreenElement === wrapper}
>
    <MediaArchiveIndicator asset={attachment} {messageId} {mediaKind} />
    {#if !isLoaded && !failedToLoad}
        <MediaLoadingSkeleton />
    {:else if failedToLoad}
        <MediaLoadFailure onreload={retryMedia} />
    {/if}

    <div class="video-surface" class:media-spoiler={attachment.filenameWithoutHash.startsWith("SPOILER")}>
        {#key `${mediaUrl}:${reloadAttempt}`}
            <!-- Archived attachments do not include a separate captions track. -->
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
                bind:this={video}
                class="message-video"
                class:loaded={isLoaded}
                preload="metadata"
                playsinline
                onclick={togglePlayback}
                onloadedmetadata={captureMetadata}
                onloadeddata={() => {
                    isLoaded = true;
                    failedToLoad = false;
                    onmediastatus?.(attachment, "loaded");
                }}
                onplay={handlePlay}
                onpause={handlePause}
                onended={handleEnded}
                ontimeupdate={() => {
                    currentTime = video.currentTime;
                    updateBuffered();
                }}
                onprogress={updateBuffered}
                onvolumechange={() => muted = video.muted}
                onerror={() => {
                    failedToLoad = true;
                    onmediastatus?.(attachment, "failed");
                }}
            >
                <source src={mediaUrl} title="Video: {attachment.filenameWithoutHash} ({Math.round(attachment.sizeBytes / 1024)} KB)">
            </video>
        {/key}

        {#if isLoaded}
            <a
                class="download-video"
                href={mediaUrl}
                download={attachment.filenameWithoutHash}
                aria-label="Download {attachment.filenameWithoutHash}"
                title="Download"
                onclick={(event) => event.stopPropagation()}
            >
                <Icon name="other/download" width={20} />
            </a>

            {#if !hasStarted}
                <button class="center-play" type="button" aria-label="Play video" onclick={togglePlayback}>
                    <Icon name="player/play" width={24} />
                </button>
            {/if}

            {#if hasStarted}
                <div class="video-controls" class:visible={controlsVisible || paused}>
                    <button
                        class="control-button play-pause"
                        type="button"
                        aria-label={ended ? "Replay video" : paused ? "Play video" : "Pause video"}
                        title={ended ? "Replay" : paused ? "Play" : "Pause"}
                        onclick={togglePlayback}
                    >
                        <Icon name={ended ? "player/restart" : paused ? "player/play" : "player/pause"} width={20} />
                    </button>

                    <div class="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>

                    <div class="seek-control">
                        <div class="seek-track">
                            <div class="seek-buffered" style:width={`${bufferedPercent}%`}></div>
                            <div class="seek-played" style:width={`${playedPercent}%`}></div>
                        </div>
                        <input
                            class="seek-input"
                            type="range"
                            min="0"
                            max={duration || 0}
                            step="0.01"
                            value={currentTime}
                            aria-label="Video position"
                            oninput={seek}
                            onpointerdown={showControls}
                        >
                    </div>

                    <button
                        class="control-button"
                        type="button"
                        aria-label={muted ? "Unmute video" : "Mute video"}
                        title={muted ? "Unmute" : "Mute"}
                        onclick={toggleMute}
                    >
                        <Icon
                            name={muted || audioplayerState.volume < 0.01
                                ? "player/volumeMuted"
                                : audioplayerState.volume < 0.5
                                    ? "player/volumeLow"
                                    : "player/volumeHigh"}
                            width={22}
                        />
                    </button>

                    <button
                        class="control-button"
                        type="button"
                        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        onclick={toggleFullscreen}
                    >
                        <Icon name={isFullscreen ? "player/fullscreenExit" : "player/fullscreen"} width={22} />
                    </button>
                </div>
            {/if}
        {/if}
    </div>
</div>

<style>
    .spoiler-wrapper {
        position: relative;
        overflow: hidden;
        border-radius: 10px;
        max-width: min(550px, 100%);
        background: #000;
    }

    .video-surface {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .message-video {
        display: block;
        width: 100%;
        height: 100%;
        max-width: min(550px, 100%);
        max-height: 400px;
        object-fit: contain;
        opacity: 0;
        cursor: pointer;
        transition: opacity 120ms ease-out;
    }

    .message-video.loaded {
        opacity: 1;
    }

    .download-video,
    .center-play,
    .control-button {
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        color: #f2f3f5;
        cursor: pointer;
    }

    .download-video {
        position: absolute;
        z-index: 3;
        top: 6px;
        right: 6px;
        width: 32px;
        height: 32px;
        border-radius: 5px;
        background: rgba(30, 31, 34, 0.78);
        text-decoration: none;
        transition: background-color 120ms ease, opacity 160ms ease;
    }

    .download-video:hover {
        background: rgba(43, 45, 49, 0.95);
    }

    .center-play {
        position: absolute;
        z-index: 2;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.82);
        transform: translate(-50%, -50%);
        transition: background-color 120ms ease, transform 120ms ease;
    }

    .center-play:hover {
        background: rgba(0, 0, 0, 0.92);
        transform: translate(-50%, -50%) scale(1.04);
    }

    .video-controls {
        position: absolute;
        z-index: 2;
        right: 0;
        bottom: 0;
        left: 0;
        display: grid;
        grid-template-columns: auto auto minmax(40px, 1fr) auto auto;
        align-items: center;
        gap: 7px;
        min-height: 36px;
        padding: 7px 9px 5px;
        color: #f2f3f5;
        background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.88) 42%);
        opacity: 0;
        pointer-events: none;
        transform: translateY(4px);
        transition: opacity 160ms ease, transform 160ms ease;
    }

    .video-controls.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
    }

    .control-button {
        width: 24px;
        height: 26px;
        background: transparent;
        opacity: 0.92;
        transition: opacity 100ms ease, transform 100ms ease;
    }

    .control-button:hover {
        opacity: 1;
        transform: scale(1.07);
    }

    .play-pause {
        width: 26px;
    }

    .time-display {
        min-width: max-content;
        color: #f2f3f5;
        font-size: 12px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        user-select: none;
    }

    .seek-control {
        position: relative;
        height: 24px;
        min-width: 0;
    }

    .seek-track {
        position: absolute;
        top: 50%;
        right: 0;
        left: 0;
        height: 6px;
        overflow: hidden;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-50%);
    }

    .seek-buffered,
    .seek-played {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
    }

    .seek-buffered {
        background: rgba(255, 255, 255, 0.32);
    }

    .seek-played {
        background: #5865f2;
    }

    .seek-input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 24px;
        margin: 0;
        cursor: pointer;
        opacity: 0;
    }

    .controls-hidden {
        cursor: none;
    }

    .controls-hidden .download-video {
        opacity: 0;
        pointer-events: none;
    }

    .spoiler-wrapper:fullscreen {
        width: 100vw !important;
        max-width: none;
        height: 100vh;
        max-height: none;
        border-radius: 0;
        background: #000;
    }

    .spoiler-wrapper:fullscreen .message-video {
        max-width: none;
        max-height: none;
    }

    @media (max-width: 480px) {
        .video-controls {
            grid-template-columns: auto minmax(40px, 1fr) auto auto;
            gap: 5px;
            padding-inline: 7px;
        }

        .time-display {
            display: none;
        }

        .download-video {
            width: 32px;
            height: 32px;
        }
    }
</style>
