import {getSessionUser} from "@/app/lib/session";
import {addTeamEditor, canManageEditors, getTeamEditors, isTeamEditorManager, removeTeamEditor, setTeamEditorRole} from "@/app/lib/editors";
import {getUserBySoullinkToken} from "@/app/lib/users";
import {resolveTwitchIdByLogin} from "@/app/lib/twitch";

// Twitch usernames are 4-25 chars: letters, digits and underscores.
function normalizeUsername(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const name = value.trim().toLowerCase();
    return /^[a-z0-9_]{4,25}$/.test(name) ? name : null;
}

function normalizeEditorId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const id = value.trim();
    return /^[0-9]+$/.test(id) ? id : null;
}

// The page owner may always manage editors; an editor granted "manage"
// permission may add/remove regular (non-manager) editors too. Returns
// isOwner so callers can apply owner-only restrictions (granting/revoking
// manage permission, removing a manager).
async function requireManageAccess(username: string): Promise<
    { ok: true; isOwner: boolean } | { ok: false; response: Response }
> {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return {ok: false, response: new Response("Unauthorized", {status: 401})};
    }
    const isOwner = sessionUser.username === username;
    if (!isOwner && !canManageEditors(username, sessionUser)) {
        return {ok: false, response: new Response("Forbidden", {status: 403})};
    }
    return {ok: true, isOwner};
}

export async function GET(
    _request: Request,
    {params}: { params: Promise<{ token: string }> }
) {
    const {token} = await params;
    const owner = getUserBySoullinkToken(token);
    if (!owner) {
        return new Response("Not Found", {status: 404});
    }
    const auth = await requireManageAccess(owner.username);
    if (!auth.ok) return auth.response;
    return Response.json({editors: getTeamEditors(owner.username)});
}

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
    const auth = await requireManageAccess(username);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const login = normalizeUsername(body.editor);
    if (!login) {
        return new Response("Invalid Twitch username", {status: 400});
    }
    if (login === username) {
        return new Response("You already own this page", {status: 400});
    }

    // Resolved (rather than taken from our own users table) so an owner can
    // grant access to someone who has never logged into this site yet.
    let editorId: string | null;
    try {
        editorId = await resolveTwitchIdByLogin(login);
    } catch {
        return new Response("Failed to look up Twitch user", {status: 502});
    }
    if (!editorId) {
        return new Response("No such Twitch user", {status: 400});
    }

    // Only the owner may grant manage permission while adding an editor.
    const canManage = auth.isOwner && body.canManage === true;
    addTeamEditor(username, editorId, login, canManage);
    return Response.json({editors: getTeamEditors(username)});
}

// Owner-only: promote/demote an existing editor's manage permission.
export async function PATCH(
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
    if (sessionUser.username !== username) {
        return new Response("Forbidden", {status: 403});
    }

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const editorId = normalizeEditorId(body.editorId);
    if (!editorId) {
        return new Response("Invalid editor", {status: 400});
    }

    setTeamEditorRole(username, editorId, body.canManage === true);
    return Response.json({editors: getTeamEditors(username)});
}

export async function DELETE(
    request: Request,
    {params}: { params: Promise<{ token: string }> }
) {
    const {token} = await params;
    const owner = getUserBySoullinkToken(token);
    if (!owner) {
        return new Response("Not Found", {status: 404});
    }
    const username = owner.username;
    const auth = await requireManageAccess(username);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const editorId = normalizeEditorId(body.editorId);
    if (!editorId) {
        return new Response("Invalid editor", {status: 400});
    }

    // A manager may remove regular editors, but only the owner may remove
    // another manager.
    if (!auth.isOwner && isTeamEditorManager(username, editorId)) {
        return new Response("Only the owner can remove a manager", {status: 403});
    }

    removeTeamEditor(username, editorId);
    return Response.json({editors: getTeamEditors(username)});
}
