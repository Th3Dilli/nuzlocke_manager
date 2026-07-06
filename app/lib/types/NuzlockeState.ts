export const TEAM_SIZE = 6;

// Upper bound on graveyard entries to keep payloads/storage sane. The graveyard
// is otherwise free-form: any number of fallen Pokémon, in order.
export const MAX_GRAVEYARD = 100;

// Per-section label settings: whether the overlay shows a title tab for that
// section, and what custom text it displays.
export type NuzlockeLabels = {
    showNuzlockeLabel: boolean;
    nuzlockeLabel: string;
    showTrainerLabel: boolean;
    trainerLabel: string;
    showTeamLabel: boolean;
    teamLabel: string;
    showGraveyardLabel: boolean;
    graveyardLabel: string;
    showBadgesLabel: boolean;
    badgesLabel: string;
};

export const DEFAULT_LABELS: NuzlockeLabels = {
    showNuzlockeLabel: true,
    nuzlockeLabel: "Nuzlocke",
    showTrainerLabel: true,
    trainerLabel: "Trainer",
    showTeamLabel: true,
    teamLabel: "Team",
    showGraveyardLabel: true,
    graveyardLabel: "Graveyard",
    showBadgesLabel: true,
    badgesLabel: "Badges",
};

// Which webcam layout slot the trainer cam frame is left blank for.
export type CamMode = "1" | "2" | "3" | "4" | "5";

export const CAM_MODES: readonly CamMode[] = ["1", "2", "3", "4", "5"];
const CAM_MODE_SET: ReadonlySet<string> = new Set(CAM_MODES);

export const MIN_MAIN_WIDTH = 1100;
export const MAX_MAIN_WIDTH = 1420;

// Aspect ratio of the main screen frame (the nuzlocke/soullink capture frame).
export type MainAspectRatio = "4/3" | "5/3";

export const MAIN_ASPECT_RATIOS: readonly MainAspectRatio[] = ["4/3", "5/3"];
const MAIN_ASPECT_RATIO_SET: ReadonlySet<string> = new Set(MAIN_ASPECT_RATIOS);

export type NuzlockeSettings = {
    mainWidth: number;
    mainAspectRatio: MainAspectRatio;
    camMode: CamMode;
    frameBorderColor: string;
    teamColor: string;
    graveyardColor: string;
    textColor: string;
};

export const DEFAULT_SETTINGS: NuzlockeSettings = {
    mainWidth: 1200,
    mainAspectRatio: "4/3",
    camMode: "1",
    frameBorderColor: "#f87171",
    teamColor: "#eab308",
    graveyardColor: "#eab308",
    textColor: "#fde047",
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeColor(input: unknown, fallback: string): string {
    return typeof input === "string" && HEX_COLOR_RE.test(input) ? input : fallback;
}

export function normalizeMainWidth(input: unknown, fallback: number): number {
    const value = Number(input);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(MAX_MAIN_WIDTH, Math.max(MIN_MAIN_WIDTH, Math.round(value)));
}

export function normalizeCamMode(input: unknown, fallback: CamMode): CamMode {
    return typeof input === "string" && CAM_MODE_SET.has(input) ? (input as CamMode) : fallback;
}

export function normalizeMainAspectRatio(input: unknown, fallback: MainAspectRatio): MainAspectRatio {
    return typeof input === "string" && MAIN_ASPECT_RATIO_SET.has(input) ? (input as MainAspectRatio) : fallback;
}

// Coerce arbitrary input (e.g. parsed JSON) into a full set of overlay layout
// settings, falling back field-by-field to defaults for anything missing/invalid.
export function normalizeSettings(input: unknown, fallback: NuzlockeSettings = DEFAULT_SETTINGS): NuzlockeSettings {
    const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
        mainWidth: normalizeMainWidth(source.mainWidth, fallback.mainWidth),
        mainAspectRatio: normalizeMainAspectRatio(source.mainAspectRatio, fallback.mainAspectRatio),
        camMode: normalizeCamMode(source.camMode, fallback.camMode),
        frameBorderColor: normalizeColor(source.frameBorderColor, fallback.frameBorderColor),
        teamColor: normalizeColor(source.teamColor, fallback.teamColor),
        graveyardColor: normalizeColor(source.graveyardColor, fallback.graveyardColor),
        textColor: normalizeColor(source.textColor, fallback.textColor),
    };
}

export type NuzlockeState = NuzlockeLabels & NuzlockeSettings & {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team: number[];
    // Variable length (0..MAX_GRAVEYARD). Each entry is a valid Pokémon id; no
    // empty slots — the list is just the fallen Pokémon in the order they died.
    graveyard: number[];
    // Ids of earned gym badges (see app/lib/badges.json), ascending, no duplicates.
    badges: number[];
};

const MAX_LABEL_LENGTH = 40;

// Coerce arbitrary input into a valid label string: trims, caps length, and
// falls back to the given default when empty/not a string.
export function normalizeLabel(input: unknown, fallback: string): string {
    if (typeof input !== "string") return fallback;
    const trimmed = input.trim().slice(0, MAX_LABEL_LENGTH);
    return trimmed || fallback;
}

export function normalizeShowLabel(input: unknown, fallback: boolean): boolean {
    return typeof input === "boolean" ? input : fallback;
}

// Coerce arbitrary input (e.g. parsed JSON) into a full set of label settings,
// falling back field-by-field to defaults for anything missing/invalid.
export function normalizeLabels(input: unknown, fallback: NuzlockeLabels = DEFAULT_LABELS): NuzlockeLabels {
    const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
        showNuzlockeLabel: normalizeShowLabel(source.showNuzlockeLabel, fallback.showNuzlockeLabel),
        nuzlockeLabel: normalizeLabel(source.nuzlockeLabel, fallback.nuzlockeLabel),
        showTrainerLabel: normalizeShowLabel(source.showTrainerLabel, fallback.showTrainerLabel),
        trainerLabel: normalizeLabel(source.trainerLabel, fallback.trainerLabel),
        showTeamLabel: normalizeShowLabel(source.showTeamLabel, fallback.showTeamLabel),
        teamLabel: normalizeLabel(source.teamLabel, fallback.teamLabel),
        showGraveyardLabel: normalizeShowLabel(source.showGraveyardLabel, fallback.showGraveyardLabel),
        graveyardLabel: normalizeLabel(source.graveyardLabel, fallback.graveyardLabel),
        showBadgesLabel: normalizeShowLabel(source.showBadgesLabel, fallback.showBadgesLabel),
        badgesLabel: normalizeLabel(source.badgesLabel, fallback.badgesLabel),
    };
}

export function emptyTeam(): number[] {
    return Array(TEAM_SIZE).fill(0);
}

// Coerce arbitrary input (e.g. parsed JSON) into a valid fixed-length team.
// Non-positive / non-integer values become 0 (empty); extra entries are dropped.
export function normalizeTeam(input: unknown): number[] {
    const team = emptyTeam();
    if (Array.isArray(input)) {
        for (let i = 0; i < TEAM_SIZE; i++) {
            const id = Number(input[i]);
            team[i] = Number.isInteger(id) && id > 0 ? id : 0;
        }
    }
    return team;
}

// Coerce arbitrary input into a valid graveyard list: keep positive integer ids
// in order, drop anything else (including empty slots), cap at MAX_GRAVEYARD.
export function normalizeGraveyard(input: unknown): number[] {
    if (!Array.isArray(input)) return [];
    const out: number[] = [];
    for (const value of input) {
        const id = Number(value);
        if (Number.isInteger(id) && id > 0) {
            out.push(id);
            if (out.length >= MAX_GRAVEYARD) break;
        }
    }
    return out;
}

// Coerce arbitrary input into a valid badges list: unique positive integer ids,
// sorted ascending. Ids are validated against the badge catalog by the caller.
export function normalizeBadges(input: unknown): number[] {
    if (!Array.isArray(input)) return [];
    const ids = new Set<number>();
    for (const value of input) {
        const id = Number(value);
        if (Number.isInteger(id) && id > 0) ids.add(id);
    }
    return Array.from(ids).sort((a, b) => a - b);
}

function arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function statsEqual(a: NuzlockeState, b: NuzlockeState): boolean {
    return a.user === b.user
        && arraysEqual(a.team, b.team)
        && arraysEqual(a.graveyard, b.graveyard)
        && arraysEqual(a.badges, b.badges)
        && a.showNuzlockeLabel === b.showNuzlockeLabel
        && a.nuzlockeLabel === b.nuzlockeLabel
        && a.showTrainerLabel === b.showTrainerLabel
        && a.trainerLabel === b.trainerLabel
        && a.showTeamLabel === b.showTeamLabel
        && a.teamLabel === b.teamLabel
        && a.showGraveyardLabel === b.showGraveyardLabel
        && a.graveyardLabel === b.graveyardLabel
        && a.showBadgesLabel === b.showBadgesLabel
        && a.badgesLabel === b.badgesLabel
        && a.mainWidth === b.mainWidth
        && a.mainAspectRatio === b.mainAspectRatio
        && a.camMode === b.camMode
        && a.frameBorderColor === b.frameBorderColor
        && a.teamColor === b.teamColor
        && a.graveyardColor === b.graveyardColor
        && a.textColor === b.textColor;
}
