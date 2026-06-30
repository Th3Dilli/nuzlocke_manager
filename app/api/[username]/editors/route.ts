import {getSessionUser} from "@/app/lib/session";
import {addTeamEditor, canManageEditors, getTeamEditors, isTeamEditorManager, removeTeamEditor, setTeamEditorRole} from "@/app/lib/editors";

// Twitch usernames are 4-25 chars: letters, digits and underscores. We store
// the lowercase login so a grant matches the user's session username.
function normalizeUsername(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const name = value.trim().toLowerCase();
    return /^[a-z0-9_]{4,25}$/.test(name) ? name : null;
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
    if (!isOwner && !canManageEditors(username, sessionUser.username)) {
        return {ok: false, response: new Response("Forbidden", {status: 403})};
    }
    return {ok: true, isOwner};
}

export async function GET(
    _request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireManageAccess(username);
    if (!auth.ok) return auth.response;
    return Response.json({editors: getTeamEditors(username)});
}

export async function POST(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireManageAccess(username);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const editor = normalizeUsername(body.editor);
    if (!editor) {
        return new Response("Invalid Twitch username", {status: 400});
    }
    if (editor === username) {
        return new Response("You already own this page", {status: 400});
    }

    // Only the owner may grant manage permission while adding an editor.
    const canManage = auth.isOwner && body.canManage === true;
    addTeamEditor(username, editor, canManage);
    return Response.json({editors: getTeamEditors(username)});
}

// Owner-only: promote/demote an existing editor's manage permission.
export async function PATCH(
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

    const editor = normalizeUsername(body.editor);
    if (!editor) {
        return new Response("Invalid Twitch username", {status: 400});
    }

    setTeamEditorRole(username, editor, body.canManage === true);
    return Response.json({editors: getTeamEditors(username)});
}

export async function DELETE(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireManageAccess(username);
    if (!auth.ok) return auth.response;

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return new Response("Bad Request", {status: 400});
    }

    const editor = normalizeUsername(body.editor);
    if (!editor) {
        return new Response("Invalid Twitch username", {status: 400});
    }

    // A manager may remove regular editors, but only the owner may remove
    // another manager.
    if (!auth.isOwner && isTeamEditorManager(username, editor)) {
        return new Response("Only the owner can remove a manager", {status: 403});
    }

    removeTeamEditor(username, editor);
    return Response.json({editors: getTeamEditors(username)});
}
