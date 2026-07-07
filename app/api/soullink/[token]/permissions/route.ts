import {getSessionUser} from "@/app/lib/session";
import {canEditTeam, canManageEditors} from "@/app/lib/editors";
import {getUserBySoullinkToken} from "@/app/lib/users";

// Tells the viewing client what it may do with this page's team:
//   isOwner — the actual page owner
//   canEdit — may edit the team (owner or a granted editor)
//   canManageEditors — may add/remove editors (owner or a manager-editor)
export async function GET(
    _request: Request,
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
        return Response.json({isOwner: false, canEdit: false, canManageEditors: false});
    }
    const isOwner = sessionUser.username === username;
    return Response.json({
        isOwner,
        canEdit: canEditTeam(username, sessionUser),
        canManageEditors: canManageEditors(username, sessionUser),
    });
}
