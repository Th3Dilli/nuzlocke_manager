import {getSessionUser} from "@/app/lib/session";
import {getStats, setStats} from "@/app/lib/stats";
import {canEditTeam} from "@/app/lib/editors";
import {getUserByNuzlockeToken} from "@/app/lib/users";
import {POKEMON} from "@/app/lib/pokemon";
import {BADGES} from "@/app/lib/badges";
import {
    MAX_GRAVEYARD,
    normalizeCamMode,
    normalizeColor,
    normalizeLabel,
    normalizeMainAspectRatio,
    normalizeMainWidth,
    normalizeShowLabel,
    TEAM_SIZE
} from "@/app/lib/types/NuzlockeState";

const validIds = new Set(POKEMON.map(p => p.id));
const validBadgeIds = new Set(BADGES.map(b => b.id));

const LABEL_FIELDS = [
    ["showNuzlockeLabel", "nuzlockeLabel"],
    ["showTrainerLabel", "trainerLabel"],
    ["showTeamLabel", "teamLabel"],
    ["showGraveyardLabel", "graveyardLabel"],
    ["showBadgesLabel", "badgesLabel"],
] as const;

const SETTINGS_FIELDS = ["mainWidth", "mainAspectRatio", "camMode", "frameBorderColor", "teamColor", "graveyardColor", "textColor", "badgesEnabled"] as const;

// Update the team, graveyard, and/or label settings for a user's stats page.
// The page owner and any editor the owner has granted may write to it. The
// body may contain `team` (number[], length <= TEAM_SIZE, 0 = empty slot),
// `graveyard` (number[], any length up to MAX_GRAVEYARD, valid ids only),
// `badges` (number[], valid badge ids only), and/or any of the show*Label
// (boolean) / *Label (string) fields. Omitted
// fields are left unchanged. setStats persists to the DB and pushes the
// change to any live SSE subscribers (page + overlay).
export async function POST(
    request: Request,
    {params}: { params: Promise<{ token: string }> }
) {
    const {token} = await params;
    const owner = getUserByNuzlockeToken(token);
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

    const hasTeam = "team" in body;
    const hasGraveyard = "graveyard" in body;
    const hasBadges = "badges" in body;
    const hasLabels = LABEL_FIELDS.some(([show, text]) => show in body || text in body);
    const hasSettings = SETTINGS_FIELDS.some(field => field in body);
    if (!hasTeam && !hasGraveyard && !hasBadges && !hasLabels && !hasSettings) {
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

    let badges = current.badges;
    if (hasBadges) {
        const rawBadges = body.badges;
        if (!Array.isArray(rawBadges)) {
            return new Response("Invalid badges", {status: 400});
        }
        const ids = new Set<number>();
        for (const value of rawBadges) {
            const id = Number(value);
            if (!Number.isInteger(id) || !validBadgeIds.has(id)) {
                return new Response(`Invalid badge id: ${value}`, {status: 400});
            }
            ids.add(id);
        }
        badges = Array.from(ids).sort((a, b) => a - b);
    }

    const labels = {
        showNuzlockeLabel: normalizeShowLabel(body.showNuzlockeLabel, current.showNuzlockeLabel),
        nuzlockeLabel: normalizeLabel(body.nuzlockeLabel, current.nuzlockeLabel),
        showTrainerLabel: normalizeShowLabel(body.showTrainerLabel, current.showTrainerLabel),
        trainerLabel: normalizeLabel(body.trainerLabel, current.trainerLabel),
        showTeamLabel: normalizeShowLabel(body.showTeamLabel, current.showTeamLabel),
        teamLabel: normalizeLabel(body.teamLabel, current.teamLabel),
        showGraveyardLabel: normalizeShowLabel(body.showGraveyardLabel, current.showGraveyardLabel),
        graveyardLabel: normalizeLabel(body.graveyardLabel, current.graveyardLabel),
        showBadgesLabel: normalizeShowLabel(body.showBadgesLabel, current.showBadgesLabel),
        badgesLabel: normalizeLabel(body.badgesLabel, current.badgesLabel),
    };

    const settings = {
        mainWidth: normalizeMainWidth(body.mainWidth, current.mainWidth),
        mainAspectRatio: normalizeMainAspectRatio(body.mainAspectRatio, current.mainAspectRatio),
        camMode: normalizeCamMode(body.camMode, current.camMode),
        frameBorderColor: normalizeColor(body.frameBorderColor, current.frameBorderColor),
        teamColor: normalizeColor(body.teamColor, current.teamColor),
        graveyardColor: normalizeColor(body.graveyardColor, current.graveyardColor),
        textColor: normalizeColor(body.textColor, current.textColor),
        badgesEnabled: normalizeShowLabel(body.badgesEnabled, current.badgesEnabled),
    };

    setStats(username, {user: username, team, graveyard, badges, ...labels, ...settings});
    return Response.json({ok: true});
}
