import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/soullinkStats";
import {canEditTeam} from "@/app/lib/editors";
import {getUserBySoullinkToken} from "@/app/lib/users";
import {POKEMON} from "@/app/lib/pokemon";
import {BADGES} from "@/app/lib/badges";
import {
    EncounterAction,
    ENCOUNTER_ACTIONS,
    MAX_ENCOUNTERS,
    MAX_GRAVEYARD,
    normalizeColor,
    normalizeLabel,
    normalizeMainAspectRatio,
    normalizeRoute,
    normalizeBool,
    TEAM_SIZE
} from "@/app/lib/types/NuzlockeState";
import {
    LostDueToPlayer,
    LOST_DUE_TO_PLAYER_OPTIONS,
    normalizePlayerName,
    SoullinkEncounter,
    SoullinkState
} from "@/app/lib/types/SoullinkState";

const validIds = new Set(POKEMON.map(p => p.id));
const validBadgeIds = new Set(BADGES.map(b => b.id));
const validActions: ReadonlySet<string> = new Set(ENCOUNTER_ACTIONS);
const validLostDueToPlayer: ReadonlySet<string> = new Set(LOST_DUE_TO_PLAYER_OPTIONS);

const LABEL_FIELDS = [
    ["showSoullink1Label", "soullink1Label"],
    ["showSoullink2Label", "soullink2Label"],
    ["showTrainer1Label", "trainer1Label"],
    ["showTrainer2Label", "trainer2Label"],
    ["showTeam1Label", "team1Label"],
    ["showTeam2Label", "team2Label"],
    ["showGraveyard1Label", "graveyard1Label"],
    ["showGraveyard2Label", "graveyard2Label"],
    ["showBadgesLabel", "badgesLabel"],
] as const;

const COLOR_SETTINGS_FIELDS = ["frameBorderColor", "teamColor", "graveyardColor", "textColor"] as const;
const PLAYER_NAME_FIELDS = ["player1Name", "player2Name"] as const;
const SETTINGS_FIELDS = ["mainAspectRatio", "badgesEnabled", "graveyardEnabled", ...COLOR_SETTINGS_FIELDS, ...PLAYER_NAME_FIELDS] as const;

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

function parseBadges(rawBadges: unknown): number[] | { error: string } {
    if (!Array.isArray(rawBadges)) {
        return {error: "Invalid badges"};
    }
    const ids = new Set<number>();
    for (const value of rawBadges) {
        const id = Number(value);
        if (!Number.isInteger(id) || !validBadgeIds.has(id)) {
            return {error: `Invalid badge id: ${value}`};
        }
        ids.add(id);
    }
    return Array.from(ids).sort((a, b) => a - b);
}

function parsePokemonId(value: unknown, label: string): number | { error: string } {
    if (value === undefined || value === null || value === "" || value === 0) {
        return 0; // unset
    }
    const id = Number(value);
    if (!Number.isInteger(id) || !validIds.has(id)) {
        return {error: `Invalid pokemon id for ${label}`};
    }
    return id;
}

function parseEncounters(rawEncounters: unknown): SoullinkEncounter[] | { error: string } {
    if (!Array.isArray(rawEncounters) || rawEncounters.length > MAX_ENCOUNTERS) {
        return {error: "Invalid encounters"};
    }
    const encounters: SoullinkEncounter[] = [];
    for (let i = 0; i < rawEncounters.length; i++) {
        const raw = rawEncounters[i];
        if (!raw || typeof raw !== "object") {
            return {error: `Invalid encounter at row ${i + 1}`};
        }
        const source = raw as Record<string, unknown>;

        const pokemon1 = parsePokemonId(source.pokemon1, `row ${i + 1} pokemon 1`);
        if (typeof pokemon1 !== "number") return pokemon1;
        const pokemon2 = parsePokemonId(source.pokemon2, `row ${i + 1} pokemon 2`);
        if (typeof pokemon2 !== "number") return pokemon2;

        if (typeof source.action !== "string" || !validActions.has(source.action)) {
            return {error: `Invalid action at row ${i + 1}`};
        }
        if (typeof source.lostDueToPlayer !== "string" || !validLostDueToPlayer.has(source.lostDueToPlayer)) {
            return {error: `Invalid lostDueToPlayer at row ${i + 1}`};
        }

        encounters.push({
            route: normalizeRoute(source.route),
            pokemon1,
            pokemon2,
            action: source.action as EncounterAction,
            lostDueToPlayer: source.lostDueToPlayer as LostDueToPlayer,
        });
    }
    return encounters;
}

// Update either team's roster, graveyard, and/or the shared badges for a
// user's soullink page. The page owner and any editor the owner has granted
// may write to it. The body may contain any of `team1`, `team2`,
// `graveyard1`, `graveyard2`, `badges`. Omitted fields are left unchanged.
// setStats persists to the DB and pushes the change to any live SSE
// subscribers (page + overlay).
export async function POST(
    request: Request,
    {params}: { params: Promise<{ token: string }> }
) {
    const {token} = await params;
    const owner = getUserBySoullinkToken(token);
    if (!owner) {
        return new Response("Not Found", {status: 404});
    }
    const username = owner.username;

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return new Response("Unauthorized", {status: 401});
    }
    if (!canEditTeam(username, sessionUser)) {
        return new Response("Forbidden", {status: 403});
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const fields = ["team1", "team2", "graveyard1", "graveyard2"] as const;
    const hasBadges = "badges" in body;
    const hasEncounters = "encounters" in body;
    const hasLabels = LABEL_FIELDS.some(([show, text]) => show in body || text in body);
    const hasSettings = SETTINGS_FIELDS.some(field => field in body);
    if (!fields.some(f => f in body) && !hasBadges && !hasEncounters && !hasLabels && !hasSettings) {
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

    if (hasBadges) {
        const result = parseBadges(body.badges);
        if (!Array.isArray(result)) return new Response(result.error, {status: 400});
        update.badges = result;
    }

    if (hasEncounters) {
        const result = parseEncounters(body.encounters);
        if (!Array.isArray(result)) return new Response(result.error, {status: 400});
        update.encounters = result;
    }

    for (const [showKey, textKey] of LABEL_FIELDS) {
        if (showKey in body) update[showKey] = normalizeBool(body[showKey], current[showKey]);
        if (textKey in body) update[textKey] = normalizeLabel(body[textKey], current[textKey]);
    }

    if ("mainAspectRatio" in body) {
        update.mainAspectRatio = normalizeMainAspectRatio(body.mainAspectRatio, current.mainAspectRatio);
    }
    if ("badgesEnabled" in body) {
        update.badgesEnabled = normalizeBool(body.badgesEnabled, current.badgesEnabled);
    }
    if ("graveyardEnabled" in body) {
        update.graveyardEnabled = normalizeBool(body.graveyardEnabled, current.graveyardEnabled);
    }
    for (const field of COLOR_SETTINGS_FIELDS) {
        if (field in body) update[field] = normalizeColor(body[field], current[field]);
    }
    for (const field of PLAYER_NAME_FIELDS) {
        if (field in body) update[field] = normalizePlayerName(body[field], current[field]);
    }

    setStats(username, update);
    return Response.json({ok: true});
}
