import {
    DEFAULT_LABELS,
    DEFAULT_SETTINGS,
    emptyTeam,
    normalizeBadges,
    normalizeGraveyard,
    normalizeLabels,
    normalizeSettings,
    normalizeTeam,
    NuzlockeState
} from "@/app/lib/types/NuzlockeState";
import {getUserToken, selectStmt, upsertStmt} from "@/app/lib/database";
import {User} from "@/app/lib/users";

declare global {
    var usersInst: Map<string, string> | undefined;
    var statsCacheInst: Map<string, NuzlockeState> | undefined;
}

const users = globalThis.usersInst ??= new Map<string, string>();
(getUserToken.all() as Array<User>).forEach((user) => {
    users.set(user.username, user.api_token);
})

const statsCache = globalThis.statsCacheInst ??= new Map<string, NuzlockeState>();
users.keys().forEach((user) => {
    statsCache.set(user, loadStat(user));
});

export function updatePageEnabled(user: User) {
    if (user.nuzlocke_enabled) {
        statsCache.set(user.username, loadStat(user.username));
        users.set(user.username, user.api_token);
    } else {
        statsCache.delete(user.username);
        users.delete(user.username);
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
            ...normalizeLabels(settings),
            ...normalizeSettings(settings),
        };
    }
    return {user: user, team: emptyTeam(), graveyard: [], badges: [], ...DEFAULT_LABELS, ...DEFAULT_SETTINGS};
}

export function updateUserToken(username: string, api_token: string) {
    users.set(username, api_token);
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
        Object.assign(userStat, normalizeLabels(s, userStat));
        Object.assign(userStat, normalizeSettings(s, userStat));

        upsertStmt.run({
            user,
            team: JSON.stringify(userStat.team),
            graveyard: JSON.stringify(userStat.graveyard),
            badges: JSON.stringify(userStat.badges),
            settings: JSON.stringify({...normalizeLabels(userStat), ...normalizeSettings(userStat)}),
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): NuzlockeState | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}

export function isValid(user: string | null, token: string | null): boolean {
    if (!user || !token) return false;
    return users.get(user) === token;
}
