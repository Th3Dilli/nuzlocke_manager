import {emptyTeam} from "@/app/lib/types/NuzlockeState";

export type SoullinkState = {
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
    };
}
