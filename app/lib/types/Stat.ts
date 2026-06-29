export const TEAM_SIZE = 6;

export type Stat = {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team: number[];
};

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

export function statsEqual(a: Stat, b: Stat): boolean {
    return a.user === b.user
        && a.team.length === b.team.length
        && a.team.every((v, i) => v === b.team[i]);
}
