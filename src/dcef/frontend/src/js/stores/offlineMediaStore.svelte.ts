import { get, writable } from "svelte/store";
import {
    archiveOfflineMedia,
    fetchOfflineMediaStatuses,
    type OfflineMediaArchiveResult,
    type OfflineMediaStatus
} from "./api";

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
const pendingStatusIds = new Set<number>();
let pollTimer: ReturnType<typeof setTimeout> | undefined;
const queuedCheckIds = new Set<number>();
const queuedCheckResolvers = new Map<number, Array<(isOffline: boolean) => void>>();
let checkFlushScheduled = false;

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

function applyStatus(status: OfflineMediaStatus): boolean {
    const key = stateKey(status.mediaId);
    verifiedOfflineMediaKeys.add(key);
    if (status.isOffline || status.status === "completed") {
        pendingStatusIds.delete(status.mediaId);
        markOfflineMedia(status.mediaId);
        return true;
    }
    if (status.status === "failed" || status.status === "not-downloadable") {
        pendingStatusIds.delete(status.mediaId);
        setMediaState(status.mediaId, null);
        return false;
    }
    if (get(offlineMediaStates)[key] === "pending") {
        pendingStatusIds.add(status.mediaId);
    }
    return false;
}

async function flushQueuedChecks() {
    checkFlushScheduled = false;
    const ids = [...queuedCheckIds];
    queuedCheckIds.clear();
    const statuses = await fetchOfflineMediaStatuses(ids);
    const byId = new Map(statuses.map(status => [status.mediaId, status]));
    for (const id of ids) {
        const status = byId.get(id);
        const isOffline = status ? applyStatus(status) : false;
        for (const resolve of queuedCheckResolvers.get(id) ?? []) {
            resolve(isOffline);
        }
        queuedCheckResolvers.delete(id);
        offlineMediaChecks.delete(stateKey(id));
    }
}

function queueStatusCheck(mediaId: number): Promise<boolean> {
    const key = stateKey(mediaId);
    const existing = offlineMediaChecks.get(key);
    if (existing) {
        return existing;
    }

    const check = new Promise<boolean>(resolve => {
        queuedCheckIds.add(mediaId);
        const resolvers = queuedCheckResolvers.get(mediaId) ?? [];
        resolvers.push(resolve);
        queuedCheckResolvers.set(mediaId, resolvers);
        if (!checkFlushScheduled) {
            checkFlushScheduled = true;
            queueMicrotask(() => void flushQueuedChecks());
        }
    });
    offlineMediaChecks.set(key, check);
    return check;
}

export function ensureOfflineMediaState(
    mediaId: number,
    authoritativeOffline?: boolean
): Promise<boolean> {
    const key = stateKey(mediaId);
    const currentState = get(offlineMediaStates)[key];
    if (authoritativeOffline === true) {
        markOfflineMedia(mediaId);
        return Promise.resolve(true);
    }
    if (authoritativeOffline === false) {
        if (!verifiedOfflineMediaKeys.has(key) && currentState === "offline") {
            setMediaState(mediaId, null);
        }
        verifiedOfflineMediaKeys.add(key);
        return Promise.resolve(get(offlineMediaStates)[key] === "offline");
    }
    if (verifiedOfflineMediaKeys.has(key)) {
        return Promise.resolve(currentState === "offline");
    }
    return queueStatusCheck(mediaId);
}

export function isOfflineMediaPending(mediaId: number): boolean {
    return get(offlineMediaStates)[stateKey(mediaId)] === "pending";
}

export function isOfflineMediaComplete(mediaId: number): boolean {
    return get(offlineMediaStates)[stateKey(mediaId)] === "offline";
}

function schedulePendingPoll(delay = 750) {
    if (pollTimer || pendingStatusIds.size === 0) {
        return;
    }
    pollTimer = setTimeout(async () => {
        pollTimer = undefined;
        const ids = [...pendingStatusIds];
        const statuses = await fetchOfflineMediaStatuses(ids);
        if (statuses.length === 0) {
            schedulePendingPoll();
            return;
        }
        const returnedIds = new Set(statuses.map(status => status.mediaId));
        statuses.forEach(applyStatus);
        ids.filter(id => !returnedIds.has(id)).forEach(id => pendingStatusIds.delete(id));
        if (pendingStatusIds.size > 0) {
            schedulePendingPoll();
        }
    }, delay);
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
        else if (result === "pending") {
            pendingStatusIds.add(mediaId);
        }
        else if (result === "failed") {
            setMediaState(mediaId, null);
        }
    });
    schedulePendingPoll(250);

    return results;
}
