<script lang="ts">
    import { checkUrl } from "../../js/helpers";
    import type { Author } from "../../js/interfaces";
    import { handleContextMenu } from "../../js/stores/menuStore";
    import { onUserRightClick } from "./messageRightClick";

    export let author: Author
    export let messageState

    const fallbackAvatar = "/favicon.png";
    const fallbackHueSteps = [0, 38, 82, 126, 170, 214, 258, 302];
    let usingFallback = !author?.avatar;
    let fallbackHue = 0;

    $: {
        usingFallback = !author?.avatar;
        fallbackHue = fallbackHueFor(author);
    }

    function fallbackHueFor(value: Author): number {
        const identity = value?._id || value?.nickname || value?.name || "unknown";
        let hash = 2166136261;
        for (let index = 0; index < identity.length; index++) {
            hash ^= identity.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return fallbackHueSteps[(hash >>> 0) % fallbackHueSteps.length];
    }

    function useFallbackAvatar(event: Event) {
        const image = event.currentTarget as HTMLImageElement;
        if (!image.src.endsWith(fallbackAvatar)) {
            usingFallback = true;
            image.src = fallbackAvatar;
        }
    }
</script>

{#if author}
    <img
        class="avatar"
        src={author.avatar ? checkUrl(author.avatar) : fallbackAvatar}
        style:filter={usingFallback ? `hue-rotate(${fallbackHue}deg)` : undefined}
        alt=""
        on:error={useFallbackAvatar}
        on:click
        on:contextmenu={e => handleContextMenu(e, () => onUserRightClick(e, author))}
    />
{/if}

<style>
    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
</style>
