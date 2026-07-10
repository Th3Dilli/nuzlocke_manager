import {
    emptyTeam,
    EncounterAction,
    MainAspectRatio,
    MAX_ENCOUNTERS,
    normalizeColor,
    normalizeEncounterAction,
    normalizeLabel,
    normalizeMainAspectRatio,
    normalizePokemonId,
    normalizeRoute,
    normalizeBool
} from "@/app/lib/types/NuzlockeState";

// Per-section label settings: whether the overlay shows a title tab for that
// section, and what custom text it displays. One pair per side (1/2) for the
// main frame, trainer cam, team box, and graveyard.
export type SoullinkLabels = {
    showSoullink1Label: boolean;
    soullink1Label: string;
    showSoullink2Label: boolean;
    soullink2Label: string;
    showTrainer1Label: boolean;
    trainer1Label: string;
    showTrainer2Label: boolean;
    trainer2Label: string;
    showTeam1Label: boolean;
    team1Label: string;
    showTeam2Label: boolean;
    team2Label: string;
    showGraveyard1Label: boolean;
    graveyard1Label: string;
    showGraveyard2Label: boolean;
    graveyard2Label: string;
    // Badges are shared by both trainers (see SoullinkState.badges), so there's
    // a single pair here rather than one per side.
    showBadgesLabel: boolean;
    badgesLabel: string;
};

export const DEFAULT_SOULLINK_LABELS: SoullinkLabels = {
    showSoullink1Label: true,
    soullink1Label: "Soul Link 1",
    showSoullink2Label: true,
    soullink2Label: "Soul Link 2",
    showTrainer1Label: true,
    trainer1Label: "Trainer 1",
    showTrainer2Label: true,
    trainer2Label: "Trainer 2",
    showTeam1Label: true,
    team1Label: "Team 1",
    showTeam2Label: true,
    team2Label: "Team 2",
    showGraveyard1Label: true,
    graveyard1Label: "Graveyard 1",
    showGraveyard2Label: true,
    graveyard2Label: "Graveyard 2",
    showBadgesLabel: true,
    badgesLabel: "Badges",
};

// Coerce arbitrary input (e.g. parsed JSON) into a full set of label settings,
// falling back field-by-field to defaults for anything missing/invalid.
export function normalizeSoullinkLabels(input: unknown, fallback: SoullinkLabels = DEFAULT_SOULLINK_LABELS): SoullinkLabels {
    const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
        showSoullink1Label: normalizeBool(source.showSoullink1Label, fallback.showSoullink1Label),
        soullink1Label: normalizeLabel(source.soullink1Label, fallback.soullink1Label),
        showSoullink2Label: normalizeBool(source.showSoullink2Label, fallback.showSoullink2Label),
        soullink2Label: normalizeLabel(source.soullink2Label, fallback.soullink2Label),
        showTrainer1Label: normalizeBool(source.showTrainer1Label, fallback.showTrainer1Label),
        trainer1Label: normalizeLabel(source.trainer1Label, fallback.trainer1Label),
        showTrainer2Label: normalizeBool(source.showTrainer2Label, fallback.showTrainer2Label),
        trainer2Label: normalizeLabel(source.trainer2Label, fallback.trainer2Label),
        showTeam1Label: normalizeBool(source.showTeam1Label, fallback.showTeam1Label),
        team1Label: normalizeLabel(source.team1Label, fallback.team1Label),
        showTeam2Label: normalizeBool(source.showTeam2Label, fallback.showTeam2Label),
        team2Label: normalizeLabel(source.team2Label, fallback.team2Label),
        showGraveyard1Label: normalizeBool(source.showGraveyard1Label, fallback.showGraveyard1Label),
        graveyard1Label: normalizeLabel(source.graveyard1Label, fallback.graveyard1Label),
        showGraveyard2Label: normalizeBool(source.showGraveyard2Label, fallback.showGraveyard2Label),
        graveyard2Label: normalizeLabel(source.graveyard2Label, fallback.graveyard2Label),
        showBadgesLabel: normalizeBool(source.showBadgesLabel, fallback.showBadgesLabel),
        badgesLabel: normalizeLabel(source.badgesLabel, fallback.badgesLabel),
    };
}

// Overlay border/text colors, shared across both sides.
export type SoullinkSettings = {
    mainAspectRatio: MainAspectRatio;
    frameBorderColor: string;
    teamColor: string;
    graveyardColor: string;
    textColor: string;
    // Whether the badges section is shown at all in the overlay (separate from
    // showBadgesLabel/badgesLabel, which only control its title tab).
    badgesEnabled: boolean;
    // Whether the graveyard sections are shown at all in the overlay (separate
    // from showGraveyard1Label/showGraveyard2Label, which only control their
    // title tabs).
    graveyardEnabled: boolean;
    // Optional Twitch usernames identifying each side's player. When set, the
    // public page shows/links this instead of the generic "Team 1"/"Team 2".
    player1Name: string;
    player2Name: string;
};

export const DEFAULT_SOULLINK_SETTINGS: SoullinkSettings = {
    mainAspectRatio: "4/3",
    frameBorderColor: "#f87171",
    teamColor: "#eab308",
    graveyardColor: "#eab308",
    textColor: "#fde047",
    badgesEnabled: true,
    graveyardEnabled: true,
    player1Name: "",
    player2Name: "",
};

export const MAX_PLAYER_NAME_LENGTH = 25; // Twitch usernames are capped at 25 characters.

// Coerce arbitrary input into a valid player name: trims and caps length.
// Unlike normalizeLabel, an empty result is kept as-is (not replaced by the
// fallback) so the field can be cleared back to "unset".
export function normalizePlayerName(input: unknown, fallback: string): string {
    if (typeof input !== "string") return fallback;
    return input.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
}

// Coerce arbitrary input (e.g. parsed JSON) into a full set of overlay color
// settings, falling back field-by-field to defaults for anything missing/invalid.
export function normalizeSoullinkSettings(input: unknown, fallback: SoullinkSettings = DEFAULT_SOULLINK_SETTINGS): SoullinkSettings {
    const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
        mainAspectRatio: normalizeMainAspectRatio(source.mainAspectRatio, fallback.mainAspectRatio),
        frameBorderColor: normalizeColor(source.frameBorderColor, fallback.frameBorderColor),
        teamColor: normalizeColor(source.teamColor, fallback.teamColor),
        graveyardColor: normalizeColor(source.graveyardColor, fallback.graveyardColor),
        textColor: normalizeColor(source.textColor, fallback.textColor),
        badgesEnabled: normalizeBool(source.badgesEnabled, fallback.badgesEnabled),
        graveyardEnabled: normalizeBool(source.graveyardEnabled, fallback.graveyardEnabled),
        player1Name: normalizePlayerName(source.player1Name, fallback.player1Name),
        player2Name: normalizePlayerName(source.player2Name, fallback.player2Name),
    };
}

// One row in the per-route encounter log: what was encountered on a given
// route for each side, and how it was resolved. `EncounterAction` and its
// helpers are shared with the single-player nuzlocke encounter log; see
// NuzlockeState.ts.

// Which side's Pokémon caused the loss under the soul-link death rule (both
// partners must release/box when either one's linked Pokémon dies). "none"
// when not applicable (e.g. action isn't "dead").
export type LostDueToPlayer = "player1" | "player2" | "none";

export const LOST_DUE_TO_PLAYER_OPTIONS: readonly LostDueToPlayer[] = ["player1", "player2", "none"];
const LOST_DUE_TO_PLAYER_SET: ReadonlySet<string> = new Set(LOST_DUE_TO_PLAYER_OPTIONS);

export type SoullinkEncounter = {
    route: string;
    // Pokémon id for each side's encounter on this route, or 0 if unset.
    pokemon1: number;
    pokemon2: number;
    action: EncounterAction;
    lostDueToPlayer: LostDueToPlayer;
};

export function normalizeLostDueToPlayer(input: unknown, fallback: LostDueToPlayer = "none"): LostDueToPlayer {
    return typeof input === "string" && LOST_DUE_TO_PLAYER_SET.has(input) ? (input as LostDueToPlayer) : fallback;
}

// Coerce a single arbitrary object into a valid encounter row, or null if it
// isn't shaped like one. Ids here aren't checked against the Pokémon catalog
// (that's the API route's job); this just guarantees the shape is safe to store.
export function normalizeEncounter(input: unknown): SoullinkEncounter | null {
    if (!input || typeof input !== "object") return null;
    const source = input as Record<string, unknown>;
    return {
        route: normalizeRoute(source.route),
        pokemon1: normalizePokemonId(source.pokemon1),
        pokemon2: normalizePokemonId(source.pokemon2),
        action: normalizeEncounterAction(source.action),
        lostDueToPlayer: normalizeLostDueToPlayer(source.lostDueToPlayer),
    };
}

// Coerce arbitrary input (e.g. parsed JSON) into a valid encounter list,
// dropping anything malformed and capping at MAX_ENCOUNTERS.
export function normalizeEncounters(input: unknown): SoullinkEncounter[] {
    if (!Array.isArray(input)) return [];
    const out: SoullinkEncounter[] = [];
    for (const raw of input) {
        const encounter = normalizeEncounter(raw);
        if (encounter) {
            out.push(encounter);
            if (out.length >= MAX_ENCOUNTERS) break;
        }
    }
    return out;
}

export type SoullinkState = SoullinkLabels & SoullinkSettings & {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team1: number[];
    team2: number[];
    // Variable length (0..MAX_GRAVEYARD). Each entry is a valid Pokémon id; no
    // empty slots — the list is just the fallen Pokémon in the order they died.
    graveyard1: number[];
    graveyard2: number[];
    // Ids of earned gym badges (see app/lib/badges.json), shared by both
    // trainers since a soul link run plays through the same gyms together.
    badges: number[];
    // Per-route encounter log, in the order routes were entered.
    encounters: SoullinkEncounter[];
};

export function emptySoullinkState(user: string): SoullinkState {
    return {
        user,
        team1: emptyTeam(),
        team2: emptyTeam(),
        graveyard1: [],
        graveyard2: [],
        badges: [],
        encounters: [],
        ...DEFAULT_SOULLINK_LABELS,
        ...DEFAULT_SOULLINK_SETTINGS,
    };
}

// What the public soullink page actually renders: rosters/graveyards/badges/
// encounters, the team & graveyard title tabs, the shared box colors, and the
// player names. Excludes owner/editor-only concerns (frame + trainer-cam
// labels, aspect ratio, frame border color) that only the overlay uses.
export type PublicSoullinkState = Pick<SoullinkState,
    | "team1" | "team2"
    | "graveyard1" | "graveyard2"
    | "badges"
    | "encounters"
    | "showTeam1Label" | "team1Label"
    | "showTeam2Label" | "team2Label"
    | "showGraveyard1Label" | "graveyard1Label"
    | "showGraveyard2Label" | "graveyard2Label"
    | "showBadgesLabel" | "badgesLabel"
    | "graveyardEnabled"
    | "teamColor" | "graveyardColor" | "textColor"
    | "player1Name" | "player2Name"
>;

export function toPublicSoullinkState(s: SoullinkState): PublicSoullinkState {
    return {
        team1: s.team1,
        team2: s.team2,
        graveyard1: s.graveyard1,
        graveyard2: s.graveyard2,
        badges: s.badges,
        encounters: s.encounters,
        showTeam1Label: s.showTeam1Label,
        team1Label: s.team1Label,
        showTeam2Label: s.showTeam2Label,
        team2Label: s.team2Label,
        showGraveyard1Label: s.showGraveyard1Label,
        graveyard1Label: s.graveyard1Label,
        showGraveyard2Label: s.showGraveyard2Label,
        graveyard2Label: s.graveyard2Label,
        showBadgesLabel: s.showBadgesLabel,
        badgesLabel: s.badgesLabel,
        graveyardEnabled: s.graveyardEnabled,
        teamColor: s.teamColor,
        graveyardColor: s.graveyardColor,
        textColor: s.textColor,
        player1Name: s.player1Name,
        player2Name: s.player2Name,
    };
}
