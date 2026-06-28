import {Stat} from "@/app/lib/types/Stat";
import {getUserToken, selectStmt, upsertStmt} from "@/app/lib/database";
import {User} from "@/app/lib/users";

declare global {
    var usersInst: Map<string, string> | undefined;
    var statsCacheInst: Map<string, Stat> | undefined;
}

const users = globalThis.usersInst ??= new Map<string, string>();
(getUserToken.all() as Array<User>).forEach((user) => {
    users.set(user.username, user.api_token);
})

const statsCache = globalThis.statsCacheInst ??= new Map<string, Stat>();
users.keys().forEach((user) => {
    statsCache.set(user, loadStat(user));
});

export function updatePageEnabled(user: User) {
    if (user.page_enabled) {
        statsCache.set(user.username, loadStat(user.username));
        users.set(user.username, user.api_token);
    } else {
        statsCache.delete(user.username);
        users.delete(user.username);
    }
}

// --- SSE subscribers ---
const subscribers = new Map<string, Set<(stat: Stat) => void>>();


function loadStat(user: string): Stat {
    const row = selectStmt.get(user) as {
        user: string; team1: string; team2: string; team3: string; team4: string; team5: string; team6: string;
    } | undefined;
    if (row) {
        return {
            user: row.user,
            team1: row.team1,
            team2: row.team2,
            team3: row.team3,
            team4: row.team4,
            team5: row.team5,
            team6: row.team6,
        };
    }
    return {user: user, team1: "", team2: "", team3: "", team4: "", team5: "", team6: ""};
}

export function updateUserToken(username: string, api_token: string) {
    users.set(username, api_token);
}

export function subscribe(user: string, cb: (stat: Stat) => void) {
    if (!subscribers.has(user)) {
        subscribers.set(user, new Set());
    }
    subscribers.get(user)!.add(cb);
}

export function unsubscribe(user: string, cb: (stat: Stat) => void) {
    subscribers.get(user)?.delete(cb);
}

export function setStats(user: string, s: Stat) {
    const userStat = statsCache.get(user);
    if (userStat) {
        userStat.user = s.user;
        userStat.team1 = s.team1;
        userStat.team2 = s.team2;
        userStat.team3 = s.team3;
        userStat.team4 = s.team4;
        userStat.team5 = s.team5;
        userStat.team6 = s.team6;

        upsertStmt.run({
            user,
            team1: userStat.team1,
            team2: userStat.team2,
            team3: userStat.team3,
            team4: userStat.team4,
            team5: userStat.team5,
            team6: userStat.team6,
        });

        subscribers.get(user)?.forEach(cb => cb(userStat));
    }
}

export function getStats(user: string | null): Stat | null {
    if (!user) return null;

    return statsCache.get(user) ?? null;
}

export function isValid(user: string | null, token: string | null): boolean {
    if (!user || !token) return false;
    return users.get(user) === token;
}
