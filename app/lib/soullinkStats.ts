import {normalizeGraveyard, normalizeTeam} from "@/app/lib/types/NuzlockeState";
import {emptySoullinkState, SoullinkState} from "@/app/lib/types/SoullinkState";
import {getSoullinkEnabledUsers, selectSoullinkStmt, upsertSoullinkStmt} from "@/app/lib/database";
import {User} from "@/app/lib/users";

declare global {
    var soullinkStatsCacheInst: Map<string, SoullinkState> | undefined;
}

const statsCache = globalThis.soullinkStatsCacheInst ??= new Map<string, SoullinkState>();
(getSoullinkEnabledUsers.all() as Array<{ username: string }>).forEach((row) => {
    statsCache.set(row.username, loadStat(row.username));
});

export function updatePageEnabled(user: User) {
    if (user.soullink_enabled) {
        statsCache.set(user.username, loadStat(user.username));
    } else {
        statsCache.delete(user.username);
    }
}

// --- SSE subscribers ---
const subscribers = new Map<string, Set<(stat: SoullinkState) => void>>();

function safeParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        // Corrupt/legacy value: caller falls back to an empty list.
        return [];
    }
}

function loadStat(user: string): SoullinkState {
    const row = selectSoullinkStmt.get(user) as
        { user: string; team1: string; team2: string; graveyard1: string; graveyard2: string }
        | undefined;
    if (row) {
        return {
            user: row.user,
            team1: normalizeTeam(safeParse(row.team1)),
            team2: normalizeTeam(safeParse(row.team2)),
            graveyard1: normalizeGraveyard(safeParse(row.graveyard1)),
            graveyard2: normalizeGraveyard(safeParse(row.graveyard2)),
        };
    }
    return emptySoullinkState(user);
}

export function subscribe(user: string, cb: (stat: SoullinkState) => void) {
    if (!subscribers.has(user)) {
        subscribers.set(user, new Set());
    }
    subscribers.get(user)!.add(cb);
}

export function unsubscribe(user: string, cb: (stat: SoullinkState) => void) {
    subscribers.get(user)?.delete(cb);
}

export function setStats(user: string, s: Partial<Omit<SoullinkState, "user">>) {
    const userStat = statsCache.get(user);
    if (userStat) {
        if (s.team1) userStat.team1 = normalizeTeam(s.team1);
        if (s.team2) userStat.team2 = normalizeTeam(s.team2);
        if (s.graveyard1) userStat.graveyard1 = normalizeGraveyard(s.graveyard1);
        if (s.graveyard2) userStat.graveyard2 = normalizeGraveyard(s.graveyard2);

        upsertSoullinkStmt.run({
            user,
            team1: JSON.stringify(userStat.team1),
            team2: JSON.stringify(userStat.team2),
            graveyard1: JSON.stringify(userStat.graveyard1),
            graveyard2: JSON.stringify(userStat.graveyard2),
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): SoullinkState | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}
