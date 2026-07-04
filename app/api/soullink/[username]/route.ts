import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/soullinkStats";
import {canEditTeam} from "@/app/lib/editors";
import {POKEMON} from "@/app/lib/pokemon";
import {MAX_GRAVEYARD, normalizeColor, normalizeLabel, normalizeShowLabel, TEAM_SIZE} from "@/app/lib/types/NuzlockeState";
import {SoullinkState} from "@/app/lib/types/SoullinkState";

const validIds = new Set(POKEMON.map(p => p.id));

const LABEL_FIELDS = [
    ["showSoullink1Label", "soullink1Label"],
    ["showSoullink2Label", "soullink2Label"],
    ["showTrainer1Label", "trainer1Label"],
    ["showTrainer2Label", "trainer2Label"],
    ["showTeam1Label", "team1Label"],
    ["showTeam2Label", "team2Label"],
    ["showGraveyard1Label", "graveyard1Label"],
    ["showGraveyard2Label", "graveyard2Label"],
] as const;

const SETTINGS_FIELDS = ["frameBorderColor", "teamColor", "graveyardColor", "textColor"] as const;

function parseTeam(rawTeam: unknown): number[] | { error: string } {
    if (!Array.isArray(rawTeam) || rawTeam.length > TEAM_SIZE) {
        return {error: "Invalid team"};
    }
    const team = Array(TEAM_SIZE).fill(0);
    for (let i = 0; i < rawTeam.length; i++) {
        const value = rawTeam[i];
        if (value === undefined || value === null || value === "" || value === 0) {
            continue; // empty slot
        }
        const id = Number(value);
        if (!Number.isInteger(id) || !validIds.has(id)) {
            return {error: `Invalid pokemon id in slot ${i + 1}`};
        }
        team[i] = id;
    }
    return team;
}

function parseGraveyard(rawGraveyard: unknown): number[] | { error: string } {
    if (!Array.isArray(rawGraveyard) || rawGraveyard.length > MAX_GRAVEYARD) {
        return {error: "Invalid graveyard"};
    }
    const graveyard: number[] = [];
    for (let i = 0; i < rawGraveyard.length; i++) {
        const id = Number(rawGraveyard[i]);
        if (!Number.isInteger(id) || !validIds.has(id)) {
            return {error: `Invalid pokemon id at position ${i + 1}`};
        }
        graveyard.push(id);
    }
    return graveyard;
}

// Update either team's roster and/or graveyard for a user's soullink page. The
// page owner and any editor the owner has granted may write to it. The body
// may contain any of `team1`, `team2`, `graveyard1`, `graveyard2`. Omitted
// fields are left unchanged. setStats persists to the DB and pushes the
// change to any live SSE subscribers (page + overlay).
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

    const fields = ["team1", "team2", "graveyard1", "graveyard2"] as const;
    const hasLabels = LABEL_FIELDS.some(([show, text]) => show in body || text in body);
    const hasSettings = SETTINGS_FIELDS.some(field => field in body);
    if (!fields.some(f => f in body) && !hasLabels && !hasSettings) {
        return new Response("Nothing to update", {status: 400});
    }

    // setStats only mutates an existing cache entry, which only exists while the
    // soullink page is enabled. Bail out early with a clear status otherwise.
    const current = getStats(username);
    if (!current) {
        return new Response("Stats page not enabled", {status: 409});
    }

    const update: Partial<Omit<SoullinkState, "user">> = {};

    for (const field of ["team1", "team2"] as const) {
        if (field in body) {
            const result = parseTeam(body[field]);
            if (!Array.isArray(result)) return new Response(result.error, {status: 400});
            update[field] = result;
        }
    }

    for (const field of ["graveyard1", "graveyard2"] as const) {
        if (field in body) {
            const result = parseGraveyard(body[field]);
            if (!Array.isArray(result)) return new Response(result.error, {status: 400});
            update[field] = result;
        }
    }

    for (const [showKey, textKey] of LABEL_FIELDS) {
        if (showKey in body) update[showKey] = normalizeShowLabel(body[showKey], current[showKey]);
        if (textKey in body) update[textKey] = normalizeLabel(body[textKey], current[textKey]);
    }

    for (const field of SETTINGS_FIELDS) {
        if (field in body) update[field] = normalizeColor(body[field], current[field]);
    }

    setStats(username, update);
    return Response.json({ok: true});
}
