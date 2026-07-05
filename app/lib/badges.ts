import data from "./badges.json";

export type Badge = {
    id: number;
    // Generation number as a string (e.g. "1"), matching the game's badge set.
    group: string;
    name: string;
    city: string;
};

export const BADGES = data as Badge[];

const REGION_NAMES: Record<string, string> = {
    "1": "Kanto",
    "2": "Johto",
    "3": "Hoenn",
    "4": "Sinnoh",
    "5": "Einall",
    "6": "Kalos",
    "8": "Galar",
    "9": "Paldea",
};

export function badgeGroupLabel(group: string): string {
    const region = REGION_NAMES[group];
    return region ? `Generation ${group} – ${region}` : `Generation ${group}`;
}

// Badges grouped by generation, in ascending generation order.
export function groupedBadges(): Array<{ group: string; badges: Badge[] }> {
    const map = new Map<string, Badge[]>();
    for (const badge of BADGES) {
        if (!map.has(badge.group)) map.set(badge.group, []);
        map.get(badge.group)!.push(badge);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([group, badges]) => ({group, badges}));
}
