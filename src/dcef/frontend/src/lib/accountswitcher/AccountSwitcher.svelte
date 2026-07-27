<script lang="ts">
    import { getGuildState } from "../../js/stores/guildState.svelte";
    import { getLayoutState } from "../../js/stores/layoutState.svelte";
    import { currentUserName1, currentUserPhoto } from "../../js/stores/settingsStore.svelte";
    import Icon from "../icons/Icon.svelte";
    import AutocompleteUser from "./AutocompleteUser.svelte";
    import UserSelectionModal from "./UserSelectionModal.svelte";

    let showUserSelectionModal = false;

    const guildState = getGuildState()
    const layoutState = getLayoutState()
</script>

<div id="bottom-bar">
    <div class="account-user">
        <AutocompleteUser photo={$currentUserPhoto} name1={$currentUserName1} name2={$currentUserName1} on:click={() => showUserSelectionModal = true}/>
    </div>
    <button id="settings" type="button" aria-label="Settings" on:click={layoutState.showSettings}>
        <Icon name="other/settings" width={20} />
    </button>
</div>
<UserSelectionModal bind:showModal={showUserSelectionModal} guildId={guildState.guildId}/>

<style>
    .account-user {
        flex: 1;
        min-width: 0;
    }

    #settings {
        display: grid;
        flex: 0 0 32px;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        color: #B5BAC1;
        cursor: pointer;
    }

    #settings:hover,
    #settings:focus-visible {
        background-color: #3D3E45;
        color: #DBDEE1;
    }

    #bottom-bar {
        display: flex;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: 8px;
        border-radius: 8px;
        background-color: transparent;
    }
</style>
