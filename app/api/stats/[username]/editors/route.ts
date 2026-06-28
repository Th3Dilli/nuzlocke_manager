import {getSessionUser} from "@/app/lib/session";
import {addTeamEditor, getTeamEditors, removeTeamEditor} from "@/app/lib/editors";

// Twitch usernames are 4-25 chars: letters, digits and underscores. We store
// the lowercase login so a grant matches the user's session username.
function normalizeUsername(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const name = value.trim().toLowerCase();
    return /^[a-z0-9_]{4,25}$/.test(name) ? name : null;
}

// Only the page owner may view or change the editor list. Returns the session
// user on success, or a Response to return directly on failure.
async function requireOwner(username: string): Promise<{ ok: true } | { ok: false; response: Response }> {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return {ok: false, response: new Response("Unauthorized", {status: 401})};
    }
    if (sessionUser.username !== username) {
        return {ok: false, response: new Response("Forbidden", {status: 403})};
    }
    return {ok: true};
}

export async function GET(
    _request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireOwner(username);
    if (!auth.ok) return auth.response;
    return Response.json({editors: getTeamEditors(username)});
}

export async function POST(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireOwner(username);
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

    addTeamEditor(username, editor);
    return Response.json({editors: getTeamEditors(username)});
}

export async function DELETE(
    request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const auth = await requireOwner(username);
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

    removeTeamEditor(username, editor);
    return Response.json({editors: getTeamEditors(username)});
}
