import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/stats";
import {POKEMON} from "@/app/lib/pokemon";
import {Stat} from "@/app/lib/types/Stat";

const TEAM_KEYS = ["team1", "team2", "team3", "team4", "team5", "team6"] as const;
const validIds = new Set(POKEMON.map(p => String(p.id)));

// Update the team (slots 1-6) for a user's stats page. Only the logged-in
// owner of the page may write to it; each slot is either empty or a valid
// Pokémon id from the POKEMON list. setStats persists to the DB and pushes
// the change to any live SSE subscribers (page + overlay).
export async function POST(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return new Response("Unauthorized", {status: 401});
    }
    if (sessionUser.username !== username) {
        return new Response("Forbidden", {status: 403});
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const next: Record<string, string> = {};
    for (const key of TEAM_KEYS) {
        const value = body[key];
        if (value === undefined || value === null || value === "") {
            next[key] = "";
            continue;
        }
        const id = String(value);
        if (!validIds.has(id)) {
            return new Response(`Invalid pokemon id for ${key}`, {status: 400});
        }
        next[key] = id;
    }

    // setStats only mutates an existing cache entry, which only exists while the
    // stats page is enabled. Reject early with a clear status otherwise.
    if (!getStats(username)) {
        return new Response("Stats page not enabled", {status: 409});
    }

    setStats(username, {user: username, ...next} as Stat);
    return Response.json({ok: true});
}
