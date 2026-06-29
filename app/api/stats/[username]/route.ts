import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/stats";
import {canEditTeam} from "@/app/lib/editors";
import {POKEMON} from "@/app/lib/pokemon";
import {MAX_GRAVEYARD, TEAM_SIZE} from "@/app/lib/types/Stat";

const validIds = new Set(POKEMON.map(p => p.id));

// Update the team and/or graveyard for a user's stats page. The page owner and
// any editor the owner has granted may write to it. The body may contain
// `team` (number[], length <= TEAM_SIZE, 0 = empty slot) and/or `graveyard`
// (number[], any length up to MAX_GRAVEYARD, valid ids only). Omitted fields are
// left unchanged. setStats persists to the DB and pushes the change to any live
// SSE subscribers (page + overlay).
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

    const hasTeam = "team" in body;
    const hasGraveyard = "graveyard" in body;
    if (!hasTeam && !hasGraveyard) {
        return new Response("Nothing to update", {status: 400});
    }

    // setStats only mutates an existing cache entry, which only exists while the
    // stats page is enabled. Read the current stats up front so we can leave any
    // omitted field untouched, and reject early with a clear status otherwise.
    const current = getStats(username);
    if (!current) {
        return new Response("Stats page not enabled", {status: 409});
    }

    let team = current.team;
    if (hasTeam) {
        const rawTeam = body.team;
        if (!Array.isArray(rawTeam) || rawTeam.length > TEAM_SIZE) {
            return new Response("Invalid team", {status: 400});
        }
        team = Array(TEAM_SIZE).fill(0);
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
    }

    let graveyard = current.graveyard;
    if (hasGraveyard) {
        const rawGraveyard = body.graveyard;
        if (!Array.isArray(rawGraveyard) || rawGraveyard.length > MAX_GRAVEYARD) {
            return new Response("Invalid graveyard", {status: 400});
        }
        graveyard = [];
        for (let i = 0; i < rawGraveyard.length; i++) {
            const id = Number(rawGraveyard[i]);
            if (!Number.isInteger(id) || !validIds.has(id)) {
                return new Response(`Invalid pokemon id at position ${i + 1}`, {status: 400});
            }
            graveyard.push(id);
        }
    }

    setStats(username, {user: username, team, graveyard});
    return Response.json({ok: true});
}
