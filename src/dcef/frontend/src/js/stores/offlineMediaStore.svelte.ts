import { get, writable } from "svelte/store";
import { archiveOfflineMedia, hasOfflineMedia, type OfflineMediaArchiveResult } from "./api";

export type OfflineMediaState = "pending" | "offline";

const STORAGE_KEY = "dcef.offlineMediaIds";

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

function stateKey(mediaId: number): string {
    return String(mediaId);
}

function setMediaState(mediaId: number, state: OfflineMediaState | null) {
    const key = stateKey(mediaId);
    offlineMediaStates.update(current => {
        const next = { ...current };
        if (state === null) {
            delete next[key];
        }
        else {
            next[key] = state;
        }
        persistOfflineKeys(next);
        return next;
    });
}

export function markOfflineMedia(mediaId: number) {
    const key = stateKey(mediaId);
    verifiedOfflineMediaKeys.add(key);
    setMediaState(mediaId, "offline");
}

export function ensureOfflineMediaState(mediaId: number): Promise<boolean> {
    const key = stateKey(mediaId);
    const currentState = get(offlineMediaStates)[key];
    if (verifiedOfflineMediaKeys.has(key)) {
        return Promise.resolve(currentState === "offline");
    }
    const existingCheck = offlineMediaChecks.get(key);
    if (existingCheck) {
        return existingCheck;
    }

    const check = hasOfflineMedia(mediaId)
        .then(isOffline => {
            if (isOffline) {
                markOfflineMedia(mediaId);
            }
            else if (currentState === "offline") {
                setMediaState(mediaId, null);
            }
            return isOffline;
        })
        .finally(() => offlineMediaChecks.delete(key));
    offlineMediaChecks.set(key, check);
    return check;
}

export function isOfflineMediaPending(mediaId: number): boolean {
    return get(offlineMediaStates)[stateKey(mediaId)] === "pending";
}

export function isOfflineMediaComplete(mediaId: number): boolean {
    return get(offlineMediaStates)[stateKey(mediaId)] === "offline";
}

export async function requestOfflineMedia(mediaIds: number[]): Promise<OfflineMediaArchiveResult[]> {
    const currentStates = get(offlineMediaStates);
    const uniqueIds = [...new Set(mediaIds)].filter(id => currentStates[stateKey(id)] === undefined);
    uniqueIds.forEach(id => setMediaState(id, "pending"));

    const results = await Promise.all(uniqueIds.map(archiveOfflineMedia));
    results.forEach((result, index) => {
        const mediaId = uniqueIds[index];
        if (result === "succeeded" || result === "persisted-view-update-deferred") {
            markOfflineMedia(mediaId);
        }
        else if (result === "failed") {
            setMediaState(mediaId, null);
        }
    });

    return results;
}
