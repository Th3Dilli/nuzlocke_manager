import {emptyTeam, normalizeLabel, normalizeShowLabel} from "@/app/lib/types/NuzlockeState";

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
};

// Coerce arbitrary input (e.g. parsed JSON) into a full set of label settings,
// falling back field-by-field to defaults for anything missing/invalid.
export function normalizeSoullinkLabels(input: unknown, fallback: SoullinkLabels = DEFAULT_SOULLINK_LABELS): SoullinkLabels {
    const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    return {
        showSoullink1Label: normalizeShowLabel(source.showSoullink1Label, fallback.showSoullink1Label),
        soullink1Label: normalizeLabel(source.soullink1Label, fallback.soullink1Label),
        showSoullink2Label: normalizeShowLabel(source.showSoullink2Label, fallback.showSoullink2Label),
        soullink2Label: normalizeLabel(source.soullink2Label, fallback.soullink2Label),
        showTrainer1Label: normalizeShowLabel(source.showTrainer1Label, fallback.showTrainer1Label),
        trainer1Label: normalizeLabel(source.trainer1Label, fallback.trainer1Label),
        showTrainer2Label: normalizeShowLabel(source.showTrainer2Label, fallback.showTrainer2Label),
        trainer2Label: normalizeLabel(source.trainer2Label, fallback.trainer2Label),
        showTeam1Label: normalizeShowLabel(source.showTeam1Label, fallback.showTeam1Label),
        team1Label: normalizeLabel(source.team1Label, fallback.team1Label),
        showTeam2Label: normalizeShowLabel(source.showTeam2Label, fallback.showTeam2Label),
        team2Label: normalizeLabel(source.team2Label, fallback.team2Label),
        showGraveyard1Label: normalizeShowLabel(source.showGraveyard1Label, fallback.showGraveyard1Label),
        graveyard1Label: normalizeLabel(source.graveyard1Label, fallback.graveyard1Label),
        showGraveyard2Label: normalizeShowLabel(source.showGraveyard2Label, fallback.showGraveyard2Label),
        graveyard2Label: normalizeLabel(source.graveyard2Label, fallback.graveyard2Label),
    };
}

export type SoullinkState = SoullinkLabels & {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team1: number[];
    team2: number[];
    // Variable length (0..MAX_GRAVEYARD). Each entry is a valid Pokémon id; no
    // empty slots — the list is just the fallen Pokémon in the order they died.
    graveyard1: number[];
    graveyard2: number[];
};

export function emptySoullinkState(user: string): SoullinkState {
    return {
        user,
        team1: emptyTeam(),
        team2: emptyTeam(),
        graveyard1: [],
        graveyard2: [],
        ...DEFAULT_SOULLINK_LABELS,
    };
}
