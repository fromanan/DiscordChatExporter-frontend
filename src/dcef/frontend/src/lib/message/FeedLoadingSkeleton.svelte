<script lang="ts">
    interface MyProps {
        fillViewport?: boolean;
    }

    let { fillViewport = false }: MyProps = $props();
</script>

<div
    class="feed-loading-skeleton"
    class:fill-viewport={fillViewport}
    role="status"
    aria-label="Loading messages"
    data-feed-loading
>
    <div class="skeleton-messages" aria-hidden="true">
        <div class="message-shell">
            <div class="placeholder avatar"></div>
            <div class="message-body">
                <div class="author-row">
                    <div class="placeholder author-name author-name-medium"></div>
                    <div class="placeholder timestamp"></div>
                </div>
                <div class="text-lines">
                    <div class="placeholder text-line text-line-medium"></div>
                    <div class="placeholder text-line text-line-long"></div>
                    <div class="placeholder text-line text-line-short"></div>
                </div>
                <div class="placeholder media"></div>
                <div class="text-lines after-media">
                    <div class="placeholder text-line text-line-wide"></div>
                    <div class="placeholder text-line text-line-medium"></div>
                </div>
            </div>
        </div>

        <div class="message-shell">
            <div class="placeholder avatar"></div>
            <div class="message-body">
                <div class="author-row">
                    <div class="placeholder author-name author-name-long"></div>
                    <div class="placeholder timestamp"></div>
                </div>
                <div class="text-lines">
                    <div class="placeholder text-line text-line-wide"></div>
                    <div class="placeholder text-line text-line-medium"></div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .feed-loading-skeleton {
        box-sizing: border-box;
        width: 100%;
        padding: 1px 0 16px;
    }

    .feed-loading-skeleton.fill-viewport {
        display: flex;
        flex: 1;
        min-height: 100%;
        align-items: center;
    }

    .skeleton-messages {
        width: 100%;
    }

    .message-shell {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr);
        gap: 15px;
        width: 100%;
        box-sizing: border-box;
        margin-top: 17px;
        padding: 0 20px;
    }

    .message-body {
        min-width: 0;
    }

    .author-row {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 18px;
        margin-bottom: 4px;
    }

    .text-lines {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .after-media {
        margin-top: 8px;
    }

    .placeholder {
        --skeleton-base: #3f4147;
        --skeleton-highlight: #4a4d54;
        background: linear-gradient(
            105deg,
            var(--skeleton-base) 20%,
            var(--skeleton-highlight) 38%,
            var(--skeleton-base) 56%
        );
        background-size: 240% 100%;
        animation: feed-loading-shimmer 1.6s ease-in-out infinite;
    }

    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }

    .author-name {
        height: 14px;
        border-radius: 5px;
    }

    .author-name-medium {
        width: 112px;
    }

    .author-name-long {
        width: 138px;
    }

    .timestamp {
        width: 52px;
        height: 9px;
        border-radius: 4px;
        opacity: 0.65;
    }

    .text-line {
        height: 12px;
        max-width: 100%;
        border-radius: 5px;
        opacity: 0.72;
    }

    .text-line-short {
        width: min(210px, 42%);
    }

    .text-line-medium {
        width: min(330px, 68%);
    }

    .text-line-wide {
        width: min(470px, 86%);
    }

    .text-line-long {
        width: min(520px, 94%);
    }

    .media {
        --skeleton-base: #2b2d31;
        --skeleton-highlight: #35373d;
        width: min(550px, 100%);
        aspect-ratio: 16 / 10;
        max-height: 344px;
        margin-top: 8px;
        border-radius: 4px;
    }

    @keyframes feed-loading-shimmer {
        from {
            background-position-x: 120%;
        }
        to {
            background-position-x: -120%;
        }
    }

    @media (max-width: 600px) {
        .message-shell {
            gap: 12px;
            padding: 0 12px;
        }

        .text-line-short {
            width: 50%;
        }

        .text-line-medium {
            width: 76%;
        }

        .media {
            aspect-ratio: 4 / 3;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .placeholder {
            background: var(--skeleton-base);
            animation: none;
        }
    }
</style>
