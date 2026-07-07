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
    // Whether the badges section is shown at all in the overlay (separate from
    // showBadgesLabel/badgesLabel, which only control its title tab).
    badgesEnabled: boolean;
};

export const DEFAULT_SETTINGS: NuzlockeSettings = {
    mainWidth: 1200,
    mainAspectRatio: "4/3",
    camMode: "1",
    frameBorderColor: "#f87171",
    teamColor: "#eab308",
    graveyardColor: "#eab308",
    textColor: "#fde047",
    badgesEnabled: true,
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
        badgesEnabled: normalizeShowLabel(source.badgesEnabled, fallback.badgesEnabled),
    };
}

// How a route encounter was resolved. Shared between the single-player
// nuzlocke encounter log and the soullink one (which adds a second Pokémon
// and a `lostDueToPlayer` field per row).
export type EncounterAction = "caught" | "dead" | "not_caught";

export const ENCOUNTER_ACTIONS: readonly EncounterAction[] = ["caught", "dead", "not_caught"];
const ENCOUNTER_ACTION_SET: ReadonlySet<string> = new Set(ENCOUNTER_ACTIONS);

export const MAX_ENCOUNTERS = 200;
const MAX_ROUTE_LENGTH = 40;

// Coerce arbitrary input into a valid route name: trims and caps length. Kept
// as-is when empty (not replaced by a fallback) so a row can have no route yet.
export function normalizeRoute(input: unknown, fallback = ""): string {
    if (typeof input !== "string") return fallback;
    return input.trim().slice(0, MAX_ROUTE_LENGTH);
}

export function normalizeEncounterAction(input: unknown, fallback: EncounterAction = "caught"): EncounterAction {
    return typeof input === "string" && ENCOUNTER_ACTION_SET.has(input) ? (input as EncounterAction) : fallback;
}

export function normalizePokemonId(input: unknown): number {
    const id = Number(input);
    return Number.isInteger(id) && id > 0 ? id : 0;
}

// One row in the per-route encounter log for a single-player nuzlocke run.
export type NuzlockeEncounter = {
    route: string;
    // Pokémon id, or 0 if unset.
    pokemon: number;
    action: EncounterAction;
};

// Coerce a single arbitrary object into a valid encounter row, or null if it
// isn't shaped like one. The Pokémon id isn't checked against the catalog
// (that's the API route's job); this just guarantees the shape is safe to store.
export function normalizeEncounter(input: unknown): NuzlockeEncounter | null {
    if (!input || typeof input !== "object") return null;
    const source = input as Record<string, unknown>;
    return {
        route: normalizeRoute(source.route),
        pokemon: normalizePokemonId(source.pokemon),
        action: normalizeEncounterAction(source.action),
    };
}

// Coerce arbitrary input (e.g. parsed JSON) into a valid encounter list,
// dropping anything malformed and capping at MAX_ENCOUNTERS.
export function normalizeEncounters(input: unknown): NuzlockeEncounter[] {
    if (!Array.isArray(input)) return [];
    const out: NuzlockeEncounter[] = [];
    for (const raw of input) {
        const encounter = normalizeEncounter(raw);
        if (encounter) {
            out.push(encounter);
            if (out.length >= MAX_ENCOUNTERS) break;
        }
    }
    return out;
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
    // Per-route encounter log, in the order routes were entered.
    encounters: NuzlockeEncounter[];
};

// What the public nuzlocke page actually renders: the twitch username,
// team/graveyard/badges/encounters, the team & graveyard title tabs, whether
// badges show, and the shared box colors. Excludes owner/editor-only
// concerns (nuzlocke/trainer labels, overlay width/aspect ratio/cam mode,
// frame border color) that only the overlay uses.
export type PublicNuzlockeState = Pick<NuzlockeState,
    | "user"
    | "team" | "graveyard" | "badges" | "encounters"
    | "showTeamLabel" | "teamLabel"
    | "showGraveyardLabel" | "graveyardLabel"
    | "showBadgesLabel" | "badgesLabel"
    | "badgesEnabled"
    | "teamColor" | "graveyardColor" | "textColor"
>;

export function toPublicNuzlockeState(s: NuzlockeState): PublicNuzlockeState {
    return {
        user: s.user,
        team: s.team,
        graveyard: s.graveyard,
        badges: s.badges,
        encounters: s.encounters,
        showTeamLabel: s.showTeamLabel,
        teamLabel: s.teamLabel,
        showGraveyardLabel: s.showGraveyardLabel,
        graveyardLabel: s.graveyardLabel,
        showBadgesLabel: s.showBadgesLabel,
        badgesLabel: s.badgesLabel,
        badgesEnabled: s.badgesEnabled,
        teamColor: s.teamColor,
        graveyardColor: s.graveyardColor,
        textColor: s.textColor,
    };
}

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
        && a.textColor === b.textColor
        && a.badgesEnabled === b.badgesEnabled;
}
