import {
    DEFAULT_LABELS,
    DEFAULT_SETTINGS,
    emptyTeam,
    normalizeBadges,
    normalizeCamMode,
    normalizeColor,
    normalizeGraveyard,
    normalizeLabel,
    normalizeMainWidth,
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
    badges: string;
    show_nuzlocke_label: number;
    nuzlocke_label: string;
    show_trainer_label: number;
    trainer_label: string;
    show_team_label: number;
    team_label: string;
    show_graveyard_label: number;
    graveyard_label: string;
    main_width: number;
    cam_mode: string;
    frame_border_color: string;
    team_color: string;
    graveyard_color: string;
    text_color: string;
};

function loadStat(user: string): NuzlockeState {
    const row = selectStmt.get(user) as NuzlockeRow | undefined;
    if (row) {
        return {
            user: row.user,
            team: normalizeTeam(safeParse(row.team)),
            graveyard: normalizeGraveyard(safeParse(row.graveyard)),
            badges: normalizeBadges(safeParse(row.badges)),
            showNuzlockeLabel: normalizeShowLabel(!!row.show_nuzlocke_label, DEFAULT_LABELS.showNuzlockeLabel),
            nuzlockeLabel: normalizeLabel(row.nuzlocke_label, DEFAULT_LABELS.nuzlockeLabel),
            showTrainerLabel: normalizeShowLabel(!!row.show_trainer_label, DEFAULT_LABELS.showTrainerLabel),
            trainerLabel: normalizeLabel(row.trainer_label, DEFAULT_LABELS.trainerLabel),
            showTeamLabel: normalizeShowLabel(!!row.show_team_label, DEFAULT_LABELS.showTeamLabel),
            teamLabel: normalizeLabel(row.team_label, DEFAULT_LABELS.teamLabel),
            showGraveyardLabel: normalizeShowLabel(!!row.show_graveyard_label, DEFAULT_LABELS.showGraveyardLabel),
            graveyardLabel: normalizeLabel(row.graveyard_label, DEFAULT_LABELS.graveyardLabel),
            mainWidth: normalizeMainWidth(row.main_width, DEFAULT_SETTINGS.mainWidth),
            camMode: normalizeCamMode(row.cam_mode, DEFAULT_SETTINGS.camMode),
            frameBorderColor: normalizeColor(row.frame_border_color, DEFAULT_SETTINGS.frameBorderColor),
            teamColor: normalizeColor(row.team_color, DEFAULT_SETTINGS.teamColor),
            graveyardColor: normalizeColor(row.graveyard_color, DEFAULT_SETTINGS.graveyardColor),
            textColor: normalizeColor(row.text_color, DEFAULT_SETTINGS.textColor),
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
        userStat.showNuzlockeLabel = normalizeShowLabel(s.showNuzlockeLabel, userStat.showNuzlockeLabel);
        userStat.nuzlockeLabel = normalizeLabel(s.nuzlockeLabel, userStat.nuzlockeLabel);
        userStat.showTrainerLabel = normalizeShowLabel(s.showTrainerLabel, userStat.showTrainerLabel);
        userStat.trainerLabel = normalizeLabel(s.trainerLabel, userStat.trainerLabel);
        userStat.showTeamLabel = normalizeShowLabel(s.showTeamLabel, userStat.showTeamLabel);
        userStat.teamLabel = normalizeLabel(s.teamLabel, userStat.teamLabel);
        userStat.showGraveyardLabel = normalizeShowLabel(s.showGraveyardLabel, userStat.showGraveyardLabel);
        userStat.graveyardLabel = normalizeLabel(s.graveyardLabel, userStat.graveyardLabel);
        userStat.mainWidth = normalizeMainWidth(s.mainWidth, userStat.mainWidth);
        userStat.camMode = normalizeCamMode(s.camMode, userStat.camMode);
        userStat.frameBorderColor = normalizeColor(s.frameBorderColor, userStat.frameBorderColor);
        userStat.teamColor = normalizeColor(s.teamColor, userStat.teamColor);
        userStat.graveyardColor = normalizeColor(s.graveyardColor, userStat.graveyardColor);
        userStat.textColor = normalizeColor(s.textColor, userStat.textColor);

        upsertStmt.run({
            user,
            team: JSON.stringify(userStat.team),
            graveyard: JSON.stringify(userStat.graveyard),
            badges: JSON.stringify(userStat.badges),
            show_nuzlocke_label: userStat.showNuzlockeLabel ? 1 : 0,
            nuzlocke_label: userStat.nuzlockeLabel,
            show_trainer_label: userStat.showTrainerLabel ? 1 : 0,
            trainer_label: userStat.trainerLabel,
            show_team_label: userStat.showTeamLabel ? 1 : 0,
            team_label: userStat.teamLabel,
            show_graveyard_label: userStat.showGraveyardLabel ? 1 : 0,
            graveyard_label: userStat.graveyardLabel,
            main_width: userStat.mainWidth,
            cam_mode: userStat.camMode,
            frame_border_color: userStat.frameBorderColor,
            team_color: userStat.teamColor,
            graveyard_color: userStat.graveyardColor,
            text_color: userStat.textColor,
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
