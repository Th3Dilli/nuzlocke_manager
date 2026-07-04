import {
    DEFAULT_LABELS,
    emptyTeam,
    normalizeGraveyard,
    normalizeLabel,
    normalizeShowLabel,
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
    show_nuzlocke_label: number;
    nuzlocke_label: string;
    show_trainer_label: number;
    trainer_label: string;
    show_team_label: number;
    team_label: string;
    show_graveyard_label: number;
    graveyard_label: string;
};

function loadStat(user: string): NuzlockeState {
    const row = selectStmt.get(user) as NuzlockeRow | undefined;
    if (row) {
        return {
            user: row.user,
            team: normalizeTeam(safeParse(row.team)),
            graveyard: normalizeGraveyard(safeParse(row.graveyard)),
            showNuzlockeLabel: normalizeShowLabel(!!row.show_nuzlocke_label, DEFAULT_LABELS.showNuzlockeLabel),
            nuzlockeLabel: normalizeLabel(row.nuzlocke_label, DEFAULT_LABELS.nuzlockeLabel),
            showTrainerLabel: normalizeShowLabel(!!row.show_trainer_label, DEFAULT_LABELS.showTrainerLabel),
            trainerLabel: normalizeLabel(row.trainer_label, DEFAULT_LABELS.trainerLabel),
            showTeamLabel: normalizeShowLabel(!!row.show_team_label, DEFAULT_LABELS.showTeamLabel),
            teamLabel: normalizeLabel(row.team_label, DEFAULT_LABELS.teamLabel),
            showGraveyardLabel: normalizeShowLabel(!!row.show_graveyard_label, DEFAULT_LABELS.showGraveyardLabel),
            graveyardLabel: normalizeLabel(row.graveyard_label, DEFAULT_LABELS.graveyardLabel),
        };
    }
    return {user: user, team: emptyTeam(), graveyard: [], ...DEFAULT_LABELS};
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
        userStat.showNuzlockeLabel = normalizeShowLabel(s.showNuzlockeLabel, userStat.showNuzlockeLabel);
        userStat.nuzlockeLabel = normalizeLabel(s.nuzlockeLabel, userStat.nuzlockeLabel);
        userStat.showTrainerLabel = normalizeShowLabel(s.showTrainerLabel, userStat.showTrainerLabel);
        userStat.trainerLabel = normalizeLabel(s.trainerLabel, userStat.trainerLabel);
        userStat.showTeamLabel = normalizeShowLabel(s.showTeamLabel, userStat.showTeamLabel);
        userStat.teamLabel = normalizeLabel(s.teamLabel, userStat.teamLabel);
        userStat.showGraveyardLabel = normalizeShowLabel(s.showGraveyardLabel, userStat.showGraveyardLabel);
        userStat.graveyardLabel = normalizeLabel(s.graveyardLabel, userStat.graveyardLabel);

        upsertStmt.run({
            user,
            team: JSON.stringify(userStat.team),
            graveyard: JSON.stringify(userStat.graveyard),
            show_nuzlocke_label: userStat.showNuzlockeLabel ? 1 : 0,
            nuzlocke_label: userStat.nuzlockeLabel,
            show_trainer_label: userStat.showTrainerLabel ? 1 : 0,
            trainer_label: userStat.trainerLabel,
            show_team_label: userStat.showTeamLabel ? 1 : 0,
            team_label: userStat.teamLabel,
            show_graveyard_label: userStat.showGraveyardLabel ? 1 : 0,
            graveyard_label: userStat.graveyardLabel,
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
