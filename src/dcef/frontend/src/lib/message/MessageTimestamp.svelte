<script lang="ts">
    import { changeMessageId } from "../../js/stores/guildState.svelte";
    import { timestampFormat } from "../../js/stores/settingsStore.svelte";
    import { renderFullTimestamp, renderMessageTimestamp } from "../../js/time";

    export let timestamp: string;
    export let messageId: string;
    export let channelOrThreadId: string;

    const tooltipId = `message-timestamp-${channelOrThreadId}-${messageId}`;
</script>

{#key $timestampFormat}
    <span class="timestamp-wrapper">
        <button
            type="button"
            class="timestamp"
            aria-describedby={tooltipId}
            on:click={() => changeMessageId(channelOrThreadId, messageId)}
        >
            {renderMessageTimestamp(timestamp)}
        </button>
        <span id={tooltipId} class="timestamp-tooltip" role="tooltip">
            {renderFullTimestamp(timestamp)}
        </span>
    </span>
{/key}

<style>
    .timestamp-wrapper {
        display: inline-flex;
        position: relative;
    }

    .timestamp {
        appearance: none;
        border: 0;
        padding: 0;
        background: transparent;
        color: #a3a6aa;
        font-family: inherit;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: inherit;
        cursor: pointer;
    }

    .timestamp:hover,
    .timestamp:focus-visible {
        color: #dbdee1;
        text-decoration: underline;
    }

    .timestamp:focus-visible {
        outline: 2px solid #00a8fc;
        outline-offset: 2px;
        border-radius: 2px;
    }

    .timestamp-tooltip {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        z-index: 1000;
        width: max-content;
        max-width: min(280px, calc(100vw - 24px));
        padding: 8px 12px;
        border-radius: 4px;
        background: #111214;
        color: #f2f3f5;
        font-size: 0.875rem;
        font-weight: 600;
        line-height: 1.25rem;
        text-align: center;
        white-space: normal;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.24);
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 4px);
        transition: opacity 80ms ease-out, transform 80ms ease-out;
    }

    .timestamp-tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        border: 5px solid transparent;
        border-top-color: #111214;
        transform: translateX(-50%);
    }

    .timestamp:hover + .timestamp-tooltip,
    .timestamp:focus-visible + .timestamp-tooltip {
        opacity: 1;
        transform: translate(-50%, 0);
    }
</style>
