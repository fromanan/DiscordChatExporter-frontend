<script lang="ts">
    import Image from '../imagegallery/Image.svelte';
    import { getViewUserState } from './viewUserState.svelte';

    const viewUserState = getViewUserState()

    function positionProfile(node: HTMLElement) {
        let frame = 0

        function updatePosition() {
            const anchor = viewUserState.anchorRect
            if (!anchor) {
                return
            }

            const boundary = viewUserState.boundaryRect ?? {
                top: 0,
                right: window.innerWidth,
                bottom: window.innerHeight,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
            }
            const card = node.getBoundingClientRect()
            const gap = 10
            const padding = 12
            const anchorIsInLowerHalf =
                anchor.top + anchor.height / 2 >= boundary.top + boundary.height / 2

            // Keep the card completely to the left of the clicked mention.
            // It may cross the feed's left edge into the channel area; only
            // the browser viewport is a horizontal safety boundary.
            const idealLeft = anchor.left - gap - card.width
            const left = Math.max(
                padding,
                Math.min(idealLeft, window.innerWidth - card.width - padding),
            )

            // Upper-half mentions align the card's top edge and grow down.
            // Lower-half mentions align the card's bottom edge and grow up.
            const idealTop = anchorIsInLowerHalf
                ? anchor.bottom - card.height
                : anchor.top
            const top = Math.max(
                boundary.top + padding,
                Math.min(idealTop, boundary.bottom - card.height - padding),
            )

            node.style.left = `${left}px`
            node.style.top = `${top}px`
            node.style.transformOrigin = anchorIsInLowerHalf ? "right bottom" : "right top"
            node.dataset.placement = anchorIsInLowerHalf ? "above-left" : "below-left"
        }

        frame = requestAnimationFrame(updatePosition)
        window.addEventListener("resize", updatePosition)

        return {
            destroy() {
                cancelAnimationFrame(frame)
                window.removeEventListener("resize", updatePosition)
            },
        }
    }
</script>



{#if viewUserState.shown}
    <div class="profile-dismiss-layer" class:anchored={viewUserState.anchorRect !== null} on:click={()=>viewUserState.setUser(null)}>
        <div id="profile" class:anchored={viewUserState.anchorRect !== null} use:positionProfile on:click|stopPropagation>
            {#if viewUserState.user?.avatar}
                <Image asset={viewUserState.user.avatar} class="profile-avatar" clickable={false} alt="" />
            {:else}
                <div class="profile-avatar profile-avatar-fallback" aria-hidden="true">
                    {viewUserState.user?.nickname?.slice(0, 1)?.toUpperCase() ?? "?"}
                </div>
            {/if}
            <div class="profile-background"></div>

            <div class="profile-inner">
                <div class="profile-header">
                    <div class="profile-nickname">{viewUserState.user.nickname}</div>
                    <div class="profile-name">
                        @{viewUserState.user.name}{viewUserState.user.discriminator && viewUserState.user.discriminator !== "0" ? `#${viewUserState.user.discriminator}` : ""}
                        {#if viewUserState.user.isBot}<span class="bot-tag">BOT</span>{/if}
                    </div>
                </div>
                <div class="profile-scroll">
                    {#if viewUserState.user.msgCount !== undefined}
                        <div class="mini-title">ARCHIVE</div>
                        <div class="archive-stat">{viewUserState.user.msgCount.toLocaleString()} archived messages</div>
                    {/if}
                    {#if viewUserState.user.roles?.length}
                        <div class="mini-title">ROLES</div>
                        <div class="roles-wrapper">
                            {#each viewUserState.user.roles as role}
                                <div class="role">
                                    <div class="role-color" style={`background-color: ${role.color ?? "#c4c9ce"};`}></div>
                                    <div class="role-name">{role.name}</div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                    <div class="mini-title">USER ID</div>
                    <div class="profile-id">{viewUserState.user._id.replace(/^0+/, "")}</div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .profile-dismiss-layer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;

        display: flex;
        flex-direction: column;

        text-align: left;
        &.anchored {
            background-color: transparent;
            display: block;
        }
    }

    #profile {
        width: 100%;
        max-width: 340px;
        height: auto;
        min-height: 300px;
        max-height: 95svh;
        border-radius: 8px;

        background-color: #232428;
        color: #f2f3f5;

        position: relative;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .45);
        overflow: hidden;
        &.anchored {
            position: fixed;
        }
    }

    .profile-background {
        width: 100%;
        height: 60px;
        background-color: #383a40;
        position: absolute;
        top: 0;
        left: 0;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
    }

    :global(.profile-avatar) {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin: 1rem 1rem 0 1rem;
        z-index: 1010;
        position: relative;
        border: 7px solid #232428;
        cursor: pointer;
    }
    .profile-avatar-fallback {
        box-sizing: border-box;
        display: grid;
        place-items: center;
        background: #5865f2;
        font-size: 32px;
        font-weight: 700;
        cursor: default;
    }

    .profile-inner {
        background-color: #111214;
        margin: 5px 1rem 1rem 1rem;
        border-radius: 8px;
        position: relative;

        display: flex;
        flex-direction: column;
        min-height: 150px;
    }

    .profile-header {
        padding: 12px;
        border-bottom: 1px solid #2f3136;
    }

    .profile-scroll {
        overflow-x: hidden;
        overflow-y: auto;
        padding: 12px;

        height: 100%;

    }

    .profile-nickname {
        font-size: 20px;
        font-weight: 600;
        line-height: 24px;
    }

    .profile-name,
    .profile-id,
    .archive-stat {
        word-break: break-all;
        font-size: 14px;
        line-height: 18px
    }
    .bot-tag {
        margin-left: 6px;
        padding: 1px 4px;
        border-radius: 3px;
        background: #5865f2;
        color: white;
        font-size: 10px;
        font-weight: 600;
    }
    .archive-stat,
    .profile-id {
        color: #b5bac1;
        margin-bottom: 14px;
    }

    .mini-title {
        font-weight: 700;
        margin-bottom: 6px;
        font-size: 12px;
        line-height: 16px;
        text-transform: uppercase;
        letter-spacing: .02em;
    }

    .roles-wrapper {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 12px;
    }

    .role {
        display: flex;
        gap: 1px;
        align-items: center;

        background-color: #232428;
        border-radius: 4px;

        font-size: 12px;
        font-weight: 500;
        padding: 4px;
        margin: 0 4px 4px 0;

    }

    .role-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 6px;
    }
</style>
