<script lang="ts">
    import Icon from "../icons/Icon.svelte";

    interface Props {
        onclick: (event: MouseEvent) => void;
    }

    let { onclick }: Props = $props();
</script>

<button class="center-play" type="button" aria-label="Play video" {onclick}>
    <Icon name="player/play" width={24} />
</button>

<style>
    .center-play {
        position: absolute;
        z-index: 3;
        top: 50%;
        left: 50%;
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: #f2f3f5;
        background: rgba(0, 0, 0, 0.82);
        cursor: pointer;
        transform: translate(-50%, -50%);
        transition: background-color 120ms ease, transform 120ms ease;
    }

    .center-play:hover {
        background: rgba(0, 0, 0, 0.92);
        transform: translate(-50%, -50%) scale(1.04);
    }
</style>
