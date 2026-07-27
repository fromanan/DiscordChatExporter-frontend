<script lang="ts">
    interface MyProps {
        active?: boolean;
        label?: string;
        showLabel?: boolean;
    }

    let { active = true, label = "Loading...", showLabel = false }: MyProps = $props();
</script>

<div
    class="media-loading-skeleton"
    class:active
    role={active ? "status" : undefined}
    aria-label={active ? label : undefined}
    aria-hidden={active ? undefined : true}
>
    {#if active}
        <span class="spinner" aria-hidden="true"></span>
        {#if showLabel}
            <span class="label">{label}</span>
        {/if}
    {/if}
</div>

<style>
    .media-loading-skeleton {
        position: absolute;
        z-index: 0;
        inset: 0;
        display: grid;
        place-content: center;
        gap: 8px;
        overflow: hidden;
        border-radius: inherit;
        color: #b5bac1;
        background: #2b2d31;
        pointer-events: none;
    }

    .media-loading-skeleton.active {
        background: linear-gradient(110deg, #232428 8%, #303238 18%, #232428 33%);
        background-size: 200% 100%;
        animation: media-loading-shimmer 1.5s linear infinite;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top-color: #f2f3f5;
        border-radius: 50%;
        animation: media-loading-spin 0.8s linear infinite;
    }

    .label {
        font-size: 14px;
    }

    @keyframes media-loading-shimmer {
        to { background-position-x: -200%; }
    }

    @keyframes media-loading-spin {
        to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
        .media-loading-skeleton {
            animation: none;
        }
    }
</style>
