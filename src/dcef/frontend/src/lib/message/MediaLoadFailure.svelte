<script lang="ts">
    import Icon from "../icons/Icon.svelte";

    interface MyProps {
        onreload: () => void;
    }

    let { onreload }: MyProps = $props();

    function reload(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        onreload();
    }
</script>

<div class="media-load-failure" role="group" aria-label="Media failed to load">
    <Icon name="placeholder/poop" width={180} height={94} />
    <button
        class="reload-button"
        type="button"
        aria-label="Reload media"
        title="Reload"
        onclick={reload}
    >
        <Icon name="player/restart" width={24} />
    </button>
</div>

<style>
    .media-load-failure {
        position: absolute;
        z-index: 2;
        inset: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: inherit;
        color: #949ba4;
        background: #232428;
    }

    .media-load-failure > :global(.icon) {
        max-width: calc(100% - 24px);
        max-height: calc(100% - 24px);
        opacity: 0.5;
    }

    .media-load-failure > :global(.icon svg) {
        object-fit: contain;
    }

    .reload-button {
        position: absolute;
        top: 50%;
        left: 50%;
        display: grid;
        width: 48px;
        height: 48px;
        padding: 0;
        place-items: center;
        border: 0;
        border-radius: 50%;
        color: #f2f3f5;
        background: rgba(30, 31, 34, 0.9);
        cursor: pointer;
        opacity: 0;
        transform: translate(-50%, -50%);
        transition: opacity 120ms ease-out, background-color 120ms ease-out, transform 120ms ease-out;
    }

    .media-load-failure:hover .reload-button,
    .reload-button:focus-visible {
        opacity: 1;
    }

    .reload-button:hover {
        background: rgba(17, 18, 20, 0.96);
        transform: translate(-50%, -50%) scale(1.04);
    }

    .reload-button:focus-visible {
        outline: 2px solid #ffffff;
        outline-offset: 2px;
    }
</style>
