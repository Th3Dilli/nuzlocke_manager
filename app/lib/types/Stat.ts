export const TEAM_SIZE = 6;

// Upper bound on graveyard entries to keep payloads/storage sane. The graveyard
// is otherwise free-form: any number of fallen Pokémon, in order.
export const MAX_GRAVEYARD = 100;

export type Stat = {
    user: string;
    // Always length TEAM_SIZE. Each entry is a Pokémon id, or 0 for an empty slot.
    team: number[];
    // Variable length (0..MAX_GRAVEYARD). Each entry is a valid Pokémon id; no
    // empty slots — the list is just the fallen Pokémon in the order they died.
    graveyard: number[];
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

export function statsEqual(a: Stat, b: Stat): boolean {
    return a.user === b.user
        && arraysEqual(a.team, b.team)
        && arraysEqual(a.graveyard, b.graveyard);
}
