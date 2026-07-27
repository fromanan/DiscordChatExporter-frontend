<script lang="ts">
    import type { Asset } from "../../js/interfaces";
    import { resolveArchiveMediaKey } from "../../js/mediaArchive";
    import {
        ensureOfflineMediaState,
        markOfflineMedia,
        offlineMediaStates,
        requestOfflineMedia
    } from "../../js/stores/offlineMediaStore.svelte";
    import { showCloudMediaIndicator } from "../../js/stores/settingsStore.svelte";

    interface MyProps {
        asset: Asset;
        messageId?: string;
        mediaKind?: string;
    }

    let { asset, messageId, mediaKind }: MyProps = $props();
    let derivedMediaKey = $state<string | null>(null);
    let mediaKey = $derived(asset.mediaKey ?? derivedMediaKey);
    let indicatorState = $derived(asset.isOffline || $offlineMediaStates[mediaKey ?? ""] === "offline"
        ? "offline"
        : $offlineMediaStates[mediaKey ?? ""] === "pending"
            ? "pending"
            : "cloud");

    $effect(() => {
        let cancelled = false;
        void resolveArchiveMediaKey(asset, messageId, mediaKind)
            .then(key => {
                if (cancelled) {
                    return;
                }
                derivedMediaKey = asset.mediaKey ? null : key;
                if (key) {
                    if (asset.isOffline) {
                        markOfflineMedia(key);
                    }
                    else {
                        void ensureOfflineMediaState(key);
                    }
                }
            });

        return () => {
            cancelled = true;
        };
    });

    function archiveMedia(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (mediaKey && indicatorState === "cloud") {
            void requestOfflineMedia([mediaKey]);
        }
    }
</script>

{#if $showCloudMediaIndicator && mediaKey}
    <button
        class="media-archive-indicator"
        class:offline={indicatorState === "offline"}
        class:pending={indicatorState === "pending"}
        type="button"
        disabled={indicatorState !== "cloud"}
        aria-label={indicatorState === "offline"
            ? "Media available offline"
            : indicatorState === "pending"
                ? "Saving media offline"
                : "Save media offline"}
        title={indicatorState === "offline"
            ? "Media available offline"
            : indicatorState === "pending"
                ? "Saving media offline"
                : "Save media offline"}
        onclick={archiveMedia}
    >
        {#if indicatorState === "offline"}
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="m8 12 2.5 2.5L16 9"></path>
            </svg>
        {:else if indicatorState === "pending"}
            <span class="spinner" aria-hidden="true"></span>
        {:else}
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7.5 18h9.25a4.25 4.25 0 0 0 .72-8.44A6 6 0 0 0 6.2 8.2 4.9 4.9 0 0 0 7.5 18Z"></path>
            </svg>
        {/if}
    </button>
{/if}

<style>
    .media-archive-indicator {
        position: absolute;
        top: 7px;
        left: 7px;
        z-index: 5;
        display: grid;
        width: 26px;
        height: 26px;
        padding: 3px;
        place-items: center;
        border: 0;
        border-radius: 50%;
        color: #e3e5e8;
        background: rgba(60, 63, 69, 0.62);
        opacity: 0.68;
        cursor: pointer;
        transition: opacity 120ms ease-out, background-color 120ms ease-out;
    }

    .media-archive-indicator:hover {
        background: rgba(78, 80, 88, 0.82);
        opacity: 1;
    }

    .media-archive-indicator:focus-visible {
        outline: 2px solid #ffffff;
        outline-offset: 2px;
        opacity: 1;
    }

    .media-archive-indicator:disabled {
        cursor: default;
    }

    .media-archive-indicator svg {
        width: 20px;
        height: 20px;
        overflow: visible;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 2;
    }

    .media-archive-indicator.offline {
        color: #57f287;
        background: rgba(30, 31, 34, 0.45);
    }

    .spinner {
        box-sizing: border-box;
        width: 18px;
        height: 18px;
        border: 3px solid rgba(227, 229, 232, 0.18);
        border-top-color: #ffffff;
        border-right-color: rgba(255, 255, 255, 0.72);
        border-radius: 50%;
        animation: media-archive-spin 0.65s linear infinite;
        will-change: transform;
    }

    @keyframes media-archive-spin {
        to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
        .media-archive-indicator {
            transition: none;
        }
    }
</style>
