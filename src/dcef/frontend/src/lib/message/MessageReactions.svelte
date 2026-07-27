<script lang="ts">
    import { getEmojiFallbackText, getEmojiImageUrl } from "../../js/emojis/emojiAssets";
    import type { Reaction } from "../../js/interfaces";
    import { currentUserId } from "../../js/stores/settingsStore.svelte";
    import ReactionsModal from "./ReactionsModal.svelte";

    export let reactions: Reaction[];
    export let followsMedia = false;

    let reactionsModal: ReactionsModal;
    let visibleReactions: Reaction[];

    $: visibleReactions = reactions.filter(reaction => (reaction.count ?? 0) > 0);

    function isSyntheticAddReaction(reaction: Reaction): boolean {
        return reaction.emoji?.name?.trim().toLowerCase() === "add reaction";
    }
</script>


{#if visibleReactions.length > 0}
    <ReactionsModal reactions={visibleReactions} bind:this={reactionsModal} />

    <div class="message-reactions" class:follows-media={followsMedia}>
        {#each visibleReactions as reaction}
            {@const emojiUsers = reaction?.users?.map(user => user._id) ?? []}
            {@const syntheticAddReaction = isSyntheticAddReaction(reaction)}
            {@const emojiImageUrl = syntheticAddReaction ? "" : getEmojiImageUrl(reaction.emoji)}
            <div class="message-reaction" class:me={emojiUsers.includes($currentUserId)} title={syntheticAddReaction ? `${reaction.count} reactions` : `:${reaction.emoji.name}:`} on:click={()=>reactionsModal.viewReactions(reaction)}>
                {#if !syntheticAddReaction}
                    {#if emojiImageUrl}
                        <img
                            src={emojiImageUrl}
                            alt={`:${reaction.emoji.name}:`}
                            title={`:${reaction.emoji.name}:`}
                            width="100%"
                            height="100%"
                        />
                    {:else}
                        <span class="message-reaction-emoji" title={`:${reaction.emoji.name}:`}>
                            {getEmojiFallbackText(reaction.emoji)}
                        </span>
                    {/if}
                {/if}
                <span class:count-only={syntheticAddReaction} class="message-reaction-count">{reaction.count}</span>
            </div>
        {/each}
    </div>
{/if}

<style>
    .message-reactions {
        display: flex;
        flex-wrap: wrap;
    }

    .message-reaction {
        margin-right: 4px;
        display: flex;
        margin: 3px 4px 0 0;
        padding: 2px 6px;
        border: 1px solid transparent;
        border-radius: 8px;
        background-color: #2b2d31;
        align-items: center;
        cursor: pointer;
    }

    .message-reactions.follows-media .message-reaction {
        margin-top: 5px;
    }

    .message-reaction.me {
        border: 1px solid #5561E9;
        background-color: #34374F;
    }

    .message-reaction img {
        width: 16px;
        height: auto;
    }

    .message-reaction-emoji {
        width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
    }

    .message-reaction-count {
        font-size: 16px;
        font-weight: 600;
        margin-left: 6px;
        text-align: center;
        color: #B5BAC1;
    }

    .message-reaction-count.count-only {
        margin-left: 0;
    }

    .message-reaction:hover .message-reaction-count {
        color: #dcddde
    }
    .message-reaction.me .message-reaction-count {
        color: #DEE0FC;
    }
</style>
