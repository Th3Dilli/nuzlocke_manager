import {
    DEFAULT_LABELS,
    DEFAULT_SETTINGS,
    emptyTeam,
    normalizeBadges,
    normalizeEncounters,
    normalizeGraveyard,
    normalizeLabels,
    normalizeSettings,
    normalizeTeam,
    NuzlockeState
} from "@/app/lib/types/NuzlockeState";
import {getNuzlockeEnabledUsers, selectStmt, upsertStmt} from "@/app/lib/database";
import {User} from "@/app/lib/users";

declare global {
    var statsCacheInst: Map<string, NuzlockeState> | undefined;
}

const statsCache = globalThis.statsCacheInst ??= new Map<string, NuzlockeState>();
(getNuzlockeEnabledUsers.all() as Array<{ username: string }>).forEach((row) => {
    statsCache.set(row.username, loadStat(row.username));
});

export function updatePageEnabled(user: User) {
    if (user.nuzlocke_enabled) {
        statsCache.set(user.username, loadStat(user.username));
    } else {
        statsCache.delete(user.username);
    }
}

// --- SSE subscribers ---
const subscribers = new Map<string, Set<(stat: NuzlockeState) => void>>();


function safeParse(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        // Corrupt/legacy value: caller falls back to an empty list.
        return [];
    }
}

type NuzlockeRow = {
    user: string;
    team: string;
    graveyard: string;
    badges: string;
    settings: string;
    encounters: string;
};

function loadStat(user: string): NuzlockeState {
    const row = selectStmt.get(user) as NuzlockeRow | undefined;
    if (row) {
        const settings = safeParse(row.settings);
        return {
            user: row.user,
            team: normalizeTeam(safeParse(row.team)),
            graveyard: normalizeGraveyard(safeParse(row.graveyard)),
            badges: normalizeBadges(safeParse(row.badges)),
            encounters: normalizeEncounters(safeParse(row.encounters)),
            ...normalizeLabels(settings),
            ...normalizeSettings(settings),
        };
    }
    return {user: user, team: emptyTeam(), graveyard: [], badges: [], encounters: [], ...DEFAULT_LABELS, ...DEFAULT_SETTINGS};
}

export function subscribe(user: string, cb: (stat: NuzlockeState) => void) {
    if (!subscribers.has(user)) {
        subscribers.set(user, new Set());
    }
    subscribers.get(user)!.add(cb);
}

export function unsubscribe(user: string, cb: (stat: NuzlockeState) => void) {
    subscribers.get(user)?.delete(cb);
}

export function setStats(user: string, s: NuzlockeState) {
    const userStat = statsCache.get(user);
    if (userStat) {
        userStat.user = s.user;
        userStat.team = normalizeTeam(s.team);
        userStat.graveyard = normalizeGraveyard(s.graveyard);
        userStat.badges = normalizeBadges(s.badges);
        userStat.encounters = normalizeEncounters(s.encounters);
        Object.assign(userStat, normalizeLabels(s, userStat));
        Object.assign(userStat, normalizeSettings(s, userStat));

        upsertStmt.run({
            user,
            team: JSON.stringify(userStat.team),
            graveyard: JSON.stringify(userStat.graveyard),
            badges: JSON.stringify(userStat.badges),
            settings: JSON.stringify({...normalizeLabels(userStat), ...normalizeSettings(userStat)}),
            encounters: JSON.stringify(userStat.encounters),
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): NuzlockeState | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}
