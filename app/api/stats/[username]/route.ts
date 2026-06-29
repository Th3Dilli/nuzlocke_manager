import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/stats";
import {canEditTeam} from "@/app/lib/editors";
import {POKEMON} from "@/app/lib/pokemon";
import {TEAM_SIZE} from "@/app/lib/types/Stat";

const validIds = new Set(POKEMON.map(p => p.id));

// Update the team for a user's stats page. The page owner and any editor the
// owner has granted may write to it. The body is { team: number[] } where each
// entry is a valid Pokémon id, or 0 for an empty slot. setStats persists to the
// DB and pushes the change to any live SSE subscribers (page + overlay).
export async function POST(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return new Response("Unauthorized", {status: 401});
    }
    if (!canEditTeam(username, sessionUser.username)) {
        return new Response("Forbidden", {status: 403});
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const rawTeam = body.team;
    if (!Array.isArray(rawTeam) || rawTeam.length > TEAM_SIZE) {
        return new Response("Invalid team", {status: 400});
    }

    const team: number[] = Array(TEAM_SIZE).fill(0);
    for (let i = 0; i < rawTeam.length; i++) {
        const value = rawTeam[i];
        if (value === undefined || value === null || value === "" || value === 0) {
            continue; // empty slot
        }
        const id = Number(value);
        if (!Number.isInteger(id) || !validIds.has(id)) {
            return new Response(`Invalid pokemon id in slot ${i + 1}`, {status: 400});
        }
        team[i] = id;
    }

    // setStats only mutates an existing cache entry, which only exists while the
    // stats page is enabled. Reject early with a clear status otherwise.
    if (!getStats(username)) {
        return new Response("Stats page not enabled", {status: 409});
    }

    setStats(username, {user: username, team});
    return Response.json({ok: true});
}
