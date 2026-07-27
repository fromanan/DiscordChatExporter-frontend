<script>
	import Menu from './Menu.svelte';
    import { contextMenuItems } from '../../../js/stores/menuStore';

	function closeMenu() {
		$contextMenuItems = [];
	}

	function onClick(item) {
		if (item.disabled) {
			return
		}
		closeMenu()
		item.action()
	}
</script>

{#key $contextMenuItems}
	{#if $contextMenuItems.length > 0}
		<Menu on:click={closeMenu} on:clickoutside={closeMenu}>
			{#each $contextMenuItems as item}
				<div on:click={()=>onClick(item)} class="menu-option" class:disabled={item.disabled}>
					{item.name}
				</div>
			{/each}
		</Menu>
	{/if}
{/key}


<style>
	div {
		padding: 10px 20px;
		cursor: default;
		font-size: 14px;
		display: flex;
		align-items: center;
		grid-gap: 5px;
        color: #DBDEE1;
	}
	div:hover {
		background: #4752C4;
        color: #DBDEE1;
	}
	div.disabled {
		cursor: default;
		color: rgba(219, 222, 225, 0.4);
	}
	div.disabled:hover {
		background: transparent;
	}
</style>
