import {
    normalizeBadges,
    normalizeColor,
    normalizeGraveyard,
    normalizeLabel,
    normalizeMainAspectRatio,
    normalizeShowLabel,
    normalizeTeam
} from "@/app/lib/types/NuzlockeState";
import {DEFAULT_SOULLINK_LABELS, DEFAULT_SOULLINK_SETTINGS, emptySoullinkState, SoullinkState} from "@/app/lib/types/SoullinkState";
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

type SoullinkRow = {
    user: string;
    team1: string;
    team2: string;
    graveyard1: string;
    graveyard2: string;
    badges: string;
    show_soullink1_label: number;
    soullink1_label: string;
    show_soullink2_label: number;
    soullink2_label: string;
    show_trainer1_label: number;
    trainer1_label: string;
    show_trainer2_label: number;
    trainer2_label: string;
    show_team1_label: number;
    team1_label: string;
    show_team2_label: number;
    team2_label: string;
    show_graveyard1_label: number;
    graveyard1_label: string;
    show_graveyard2_label: number;
    graveyard2_label: string;
    show_badges_label: number;
    badges_label: string;
    main_aspect_ratio: string;
    frame_border_color: string;
    team_color: string;
    graveyard_color: string;
    text_color: string;
};

function loadStat(user: string): SoullinkState {
    const row = selectSoullinkStmt.get(user) as SoullinkRow | undefined;
    if (row) {
        return {
            user: row.user,
            team1: normalizeTeam(safeParse(row.team1)),
            team2: normalizeTeam(safeParse(row.team2)),
            graveyard1: normalizeGraveyard(safeParse(row.graveyard1)),
            graveyard2: normalizeGraveyard(safeParse(row.graveyard2)),
            badges: normalizeBadges(safeParse(row.badges)),
            showSoullink1Label: normalizeShowLabel(!!row.show_soullink1_label, DEFAULT_SOULLINK_LABELS.showSoullink1Label),
            soullink1Label: normalizeLabel(row.soullink1_label, DEFAULT_SOULLINK_LABELS.soullink1Label),
            showSoullink2Label: normalizeShowLabel(!!row.show_soullink2_label, DEFAULT_SOULLINK_LABELS.showSoullink2Label),
            soullink2Label: normalizeLabel(row.soullink2_label, DEFAULT_SOULLINK_LABELS.soullink2Label),
            showTrainer1Label: normalizeShowLabel(!!row.show_trainer1_label, DEFAULT_SOULLINK_LABELS.showTrainer1Label),
            trainer1Label: normalizeLabel(row.trainer1_label, DEFAULT_SOULLINK_LABELS.trainer1Label),
            showTrainer2Label: normalizeShowLabel(!!row.show_trainer2_label, DEFAULT_SOULLINK_LABELS.showTrainer2Label),
            trainer2Label: normalizeLabel(row.trainer2_label, DEFAULT_SOULLINK_LABELS.trainer2Label),
            showTeam1Label: normalizeShowLabel(!!row.show_team1_label, DEFAULT_SOULLINK_LABELS.showTeam1Label),
            team1Label: normalizeLabel(row.team1_label, DEFAULT_SOULLINK_LABELS.team1Label),
            showTeam2Label: normalizeShowLabel(!!row.show_team2_label, DEFAULT_SOULLINK_LABELS.showTeam2Label),
            team2Label: normalizeLabel(row.team2_label, DEFAULT_SOULLINK_LABELS.team2Label),
            showGraveyard1Label: normalizeShowLabel(!!row.show_graveyard1_label, DEFAULT_SOULLINK_LABELS.showGraveyard1Label),
            graveyard1Label: normalizeLabel(row.graveyard1_label, DEFAULT_SOULLINK_LABELS.graveyard1Label),
            showGraveyard2Label: normalizeShowLabel(!!row.show_graveyard2_label, DEFAULT_SOULLINK_LABELS.showGraveyard2Label),
            graveyard2Label: normalizeLabel(row.graveyard2_label, DEFAULT_SOULLINK_LABELS.graveyard2Label),
            showBadgesLabel: normalizeShowLabel(!!row.show_badges_label, DEFAULT_SOULLINK_LABELS.showBadgesLabel),
            badgesLabel: normalizeLabel(row.badges_label, DEFAULT_SOULLINK_LABELS.badgesLabel),
            mainAspectRatio: normalizeMainAspectRatio(row.main_aspect_ratio, DEFAULT_SOULLINK_SETTINGS.mainAspectRatio),
            frameBorderColor: normalizeColor(row.frame_border_color, DEFAULT_SOULLINK_SETTINGS.frameBorderColor),
            teamColor: normalizeColor(row.team_color, DEFAULT_SOULLINK_SETTINGS.teamColor),
            graveyardColor: normalizeColor(row.graveyard_color, DEFAULT_SOULLINK_SETTINGS.graveyardColor),
            textColor: normalizeColor(row.text_color, DEFAULT_SOULLINK_SETTINGS.textColor),
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

const LABEL_KEYS = [
    ["showSoullink1Label", "soullink1Label"],
    ["showSoullink2Label", "soullink2Label"],
    ["showTrainer1Label", "trainer1Label"],
    ["showTrainer2Label", "trainer2Label"],
    ["showTeam1Label", "team1Label"],
    ["showTeam2Label", "team2Label"],
    ["showGraveyard1Label", "graveyard1Label"],
    ["showGraveyard2Label", "graveyard2Label"],
    ["showBadgesLabel", "badgesLabel"],
] as const;

export function setStats(user: string, s: Partial<Omit<SoullinkState, "user">>) {
    const userStat = statsCache.get(user);
    if (userStat) {
        if (s.team1) userStat.team1 = normalizeTeam(s.team1);
        if (s.team2) userStat.team2 = normalizeTeam(s.team2);
        if (s.graveyard1) userStat.graveyard1 = normalizeGraveyard(s.graveyard1);
        if (s.graveyard2) userStat.graveyard2 = normalizeGraveyard(s.graveyard2);
        if (s.badges) userStat.badges = normalizeBadges(s.badges);

        for (const [showKey, textKey] of LABEL_KEYS) {
            if (s[showKey] !== undefined) userStat[showKey] = normalizeShowLabel(s[showKey], userStat[showKey]);
            if (s[textKey] !== undefined) userStat[textKey] = normalizeLabel(s[textKey], userStat[textKey]);
        }

        if (s.mainAspectRatio !== undefined) userStat.mainAspectRatio = normalizeMainAspectRatio(s.mainAspectRatio, userStat.mainAspectRatio);
        if (s.frameBorderColor !== undefined) userStat.frameBorderColor = normalizeColor(s.frameBorderColor, userStat.frameBorderColor);
        if (s.teamColor !== undefined) userStat.teamColor = normalizeColor(s.teamColor, userStat.teamColor);
        if (s.graveyardColor !== undefined) userStat.graveyardColor = normalizeColor(s.graveyardColor, userStat.graveyardColor);
        if (s.textColor !== undefined) userStat.textColor = normalizeColor(s.textColor, userStat.textColor);

        upsertSoullinkStmt.run({
            user,
            team1: JSON.stringify(userStat.team1),
            team2: JSON.stringify(userStat.team2),
            graveyard1: JSON.stringify(userStat.graveyard1),
            graveyard2: JSON.stringify(userStat.graveyard2),
            badges: JSON.stringify(userStat.badges),
            show_soullink1_label: userStat.showSoullink1Label ? 1 : 0,
            soullink1_label: userStat.soullink1Label,
            show_soullink2_label: userStat.showSoullink2Label ? 1 : 0,
            soullink2_label: userStat.soullink2Label,
            show_trainer1_label: userStat.showTrainer1Label ? 1 : 0,
            trainer1_label: userStat.trainer1Label,
            show_trainer2_label: userStat.showTrainer2Label ? 1 : 0,
            trainer2_label: userStat.trainer2Label,
            show_team1_label: userStat.showTeam1Label ? 1 : 0,
            team1_label: userStat.team1Label,
            show_team2_label: userStat.showTeam2Label ? 1 : 0,
            team2_label: userStat.team2Label,
            show_graveyard1_label: userStat.showGraveyard1Label ? 1 : 0,
            graveyard1_label: userStat.graveyard1Label,
            show_graveyard2_label: userStat.showGraveyard2Label ? 1 : 0,
            graveyard2_label: userStat.graveyard2Label,
            show_badges_label: userStat.showBadgesLabel ? 1 : 0,
            badges_label: userStat.badgesLabel,
            main_aspect_ratio: userStat.mainAspectRatio,
            frame_border_color: userStat.frameBorderColor,
            team_color: userStat.teamColor,
            graveyard_color: userStat.graveyardColor,
            text_color: userStat.textColor,
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): SoullinkState | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}
