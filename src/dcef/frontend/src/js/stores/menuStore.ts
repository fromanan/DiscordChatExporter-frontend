import { writable, type Writable } from "svelte/store";

export const contextMenuItems: Writable<any[]> = writable([]);
export const position = writable({ x: 0, y: 0 });

export const isMenuHidden = writable(false);

export function handleContextMenu(event: MouseEvent, openCustomMenu: () => void) {
    if (event.ctrlKey) {
        contextMenuItems.set([]);
        return;
    }

    event.preventDefault();
    openCustomMenu();
}
