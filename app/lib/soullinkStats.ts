import {
    normalizeBadges,
    normalizeColor,
    normalizeGraveyard,
    normalizeLabel,
    normalizeMainAspectRatio,
    normalizeShowLabel,
    normalizeTeam
} from "@/app/lib/types/NuzlockeState";
import {
    emptySoullinkState,
    normalizeEncounters,
    normalizePlayerName,
    normalizeSoullinkLabels,
    normalizeSoullinkSettings,
    SoullinkState
} from "@/app/lib/types/SoullinkState";
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
    settings: string;
    encounters: string;
};

function loadStat(user: string): SoullinkState {
    const row = selectSoullinkStmt.get(user) as SoullinkRow | undefined;
    if (row) {
        const settings = safeParse(row.settings);
        return {
            user: row.user,
            team1: normalizeTeam(safeParse(row.team1)),
            team2: normalizeTeam(safeParse(row.team2)),
            graveyard1: normalizeGraveyard(safeParse(row.graveyard1)),
            graveyard2: normalizeGraveyard(safeParse(row.graveyard2)),
            badges: normalizeBadges(safeParse(row.badges)),
            encounters: normalizeEncounters(safeParse(row.encounters)),
            ...normalizeSoullinkLabels(settings),
            ...normalizeSoullinkSettings(settings),
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
        if (s.encounters) userStat.encounters = normalizeEncounters(s.encounters);

        for (const [showKey, textKey] of LABEL_KEYS) {
            if (s[showKey] !== undefined) userStat[showKey] = normalizeShowLabel(s[showKey], userStat[showKey]);
            if (s[textKey] !== undefined) userStat[textKey] = normalizeLabel(s[textKey], userStat[textKey]);
        }

        if (s.mainAspectRatio !== undefined) userStat.mainAspectRatio = normalizeMainAspectRatio(s.mainAspectRatio, userStat.mainAspectRatio);
        if (s.badgesEnabled !== undefined) userStat.badgesEnabled = normalizeShowLabel(s.badgesEnabled, userStat.badgesEnabled);
        if (s.frameBorderColor !== undefined) userStat.frameBorderColor = normalizeColor(s.frameBorderColor, userStat.frameBorderColor);
        if (s.teamColor !== undefined) userStat.teamColor = normalizeColor(s.teamColor, userStat.teamColor);
        if (s.graveyardColor !== undefined) userStat.graveyardColor = normalizeColor(s.graveyardColor, userStat.graveyardColor);
        if (s.textColor !== undefined) userStat.textColor = normalizeColor(s.textColor, userStat.textColor);
        if (s.player1Name !== undefined) userStat.player1Name = normalizePlayerName(s.player1Name, userStat.player1Name);
        if (s.player2Name !== undefined) userStat.player2Name = normalizePlayerName(s.player2Name, userStat.player2Name);

        upsertSoullinkStmt.run({
            user,
            team1: JSON.stringify(userStat.team1),
            team2: JSON.stringify(userStat.team2),
            graveyard1: JSON.stringify(userStat.graveyard1),
            graveyard2: JSON.stringify(userStat.graveyard2),
            badges: JSON.stringify(userStat.badges),
            settings: JSON.stringify({...normalizeSoullinkLabels(userStat), ...normalizeSoullinkSettings(userStat)}),
            encounters: JSON.stringify(userStat.encounters),
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): SoullinkState | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}
