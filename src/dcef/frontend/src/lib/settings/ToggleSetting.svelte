<script lang="ts">
    export let title: string;
    export let checked: boolean;
</script>

<label>
    <span class="title">{title}</span>
    <input type="checkbox" role="switch" bind:checked />
    <span class="toggle" aria-hidden="true">
        <span class="thumb"></span>
    </span>
</label>

<style>
    label {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        min-height: 54px;
        padding: 10px;
        background-color: #2b2d31;
        cursor: pointer;
    }

    .title {
        color: #f2f3f5;
        font-size: 16px;
        font-weight: 500;
    }

    input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }

    .toggle {
        box-sizing: border-box;
        flex: 0 0 auto;
        width: 40px;
        height: 24px;
        padding: 3px;
        border-radius: 12px;
        background-color: #80848e;
        transition: background-color 120ms ease-out;
    }

    .thumb {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: #ffffff;
        transition: transform 120ms ease-out;
    }

    input:checked + .toggle {
        background-color: #23a55a;
    }

    input:checked + .toggle .thumb {
        transform: translateX(16px);
    }

    input:focus-visible + .toggle {
        outline: 2px solid #ffffff;
        outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
        .toggle,
        .thumb {
            transition: none;
        }
    }
</style>
