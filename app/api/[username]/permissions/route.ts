import {getSessionUser} from "@/app/lib/session";
import {canEditTeam, canManageEditors} from "@/app/lib/editors";

// Tells the viewing client what it may do with this page's team:
//   isOwner — the actual page owner
//   canEdit — may edit the team (owner or a granted editor)
//   canManageEditors — may add/remove editors (owner or a manager-editor)
export async function GET(
    _request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
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
