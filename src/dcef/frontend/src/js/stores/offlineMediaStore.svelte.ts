import { get, writable } from "svelte/store";
import { archiveOfflineMedia, hasOfflineMedia, type OfflineMediaArchiveResult } from "./api";

export type OfflineMediaState = "pending" | "offline";

const STORAGE_KEY = "dcef.offlineMediaKeys";

function loadOfflineKeys(): string[] {
    if (typeof localStorage === "undefined") {
        return [];
    }
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(value) ? value.filter(key => typeof key === "string") : [];
    }
    catch {
        return [];
    }
}

const initialOfflineKeys = loadOfflineKeys();

export const offlineMediaStates = writable<Record<string, OfflineMediaState>>(
    Object.fromEntries(initialOfflineKeys.map(key => [key, "offline"])));
const offlineMediaChecks = new Map<string, Promise<boolean>>();
const verifiedOfflineMediaKeys = new Set<string>();

function persistOfflineKeys(states: Record<string, OfflineMediaState>) {
    if (typeof localStorage === "undefined") {
        return;
    }
    const offlineKeys = Object.entries(states)
        .filter(([, state]) => state === "offline")
        .map(([key]) => key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offlineKeys));
}

function setMediaState(mediaKey: string, state: OfflineMediaState | null) {
    offlineMediaStates.update(current => {
        const next = { ...current };
        if (state === null) {
            delete next[mediaKey];
        }
        else {
            next[mediaKey] = state;
        }
        persistOfflineKeys(next);
        return next;
    });
}

export function markOfflineMedia(mediaKey: string) {
    verifiedOfflineMediaKeys.add(mediaKey);
    setMediaState(mediaKey, "offline");
}

export function ensureOfflineMediaState(mediaKey: string): Promise<boolean> {
    const currentState = get(offlineMediaStates)[mediaKey];
    if (verifiedOfflineMediaKeys.has(mediaKey)) {
        return Promise.resolve(currentState === "offline");
    }
    const existingCheck = offlineMediaChecks.get(mediaKey);
    if (existingCheck) {
        return existingCheck;
    }

    const check = hasOfflineMedia(mediaKey)
        .then(isOffline => {
            if (isOffline) {
                markOfflineMedia(mediaKey);
            }
            else if (currentState === "offline") {
                setMediaState(mediaKey, null);
            }
            return isOffline;
        })
        .finally(() => offlineMediaChecks.delete(mediaKey));
    offlineMediaChecks.set(mediaKey, check);
    return check;
}

export function isOfflineMediaPending(mediaKey: string): boolean {
    return get(offlineMediaStates)[mediaKey] === "pending";
}

export function isOfflineMediaComplete(mediaKey: string): boolean {
    return get(offlineMediaStates)[mediaKey] === "offline";
}

export async function requestOfflineMedia(mediaKeys: string[]): Promise<OfflineMediaArchiveResult[]> {
    const currentStates = get(offlineMediaStates);
    const uniqueKeys = [...new Set(mediaKeys)].filter(key => currentStates[key] === undefined);
    uniqueKeys.forEach(key => setMediaState(key, "pending"));

    const results = await Promise.all(uniqueKeys.map(archiveOfflineMedia));
    results.forEach((result, index) => {
        const mediaKey = uniqueKeys[index];
        if (result === "succeeded" || result === "persisted-view-update-deferred") {
            markOfflineMedia(mediaKey);
        }
        else if (result === "failed") {
            setMediaState(mediaKey, null);
        }
    });

    return results;
}
