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
};

export type NuzlockeState = NuzlockeLabels & {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team: number[];
    // Variable length (0..MAX_GRAVEYARD). Each entry is a valid Pokémon id; no
    // empty slots — the list is just the fallen Pokémon in the order they died.
    graveyard: number[];
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

function arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function statsEqual(a: NuzlockeState, b: NuzlockeState): boolean {
    return a.user === b.user
        && arraysEqual(a.team, b.team)
        && arraysEqual(a.graveyard, b.graveyard)
        && a.showNuzlockeLabel === b.showNuzlockeLabel
        && a.nuzlockeLabel === b.nuzlockeLabel
        && a.showTrainerLabel === b.showTrainerLabel
        && a.trainerLabel === b.trainerLabel
        && a.showTeamLabel === b.showTeamLabel
        && a.teamLabel === b.teamLabel
        && a.showGraveyardLabel === b.showGraveyardLabel
        && a.graveyardLabel === b.graveyardLabel;
}
