export type Stat = {
    user: string
    team1: string,
    team2: string,
    team3: string,
    team4: string,
    team5: string,
    team6: string
}

export function statsEqual(a: Stat, b: Stat): boolean {
    return a.user === b.user
        && a.team1 === b.team1
        && a.team2 === b.team2
        && a.team3 === b.team3
        && a.team4 === b.team4
        && a.team5 === b.team5
        && a.team6 === b.team6;
}