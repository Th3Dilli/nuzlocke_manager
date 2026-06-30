import {getSessionUser} from "@/app/lib/session";
import {canEditTeam} from "@/app/lib/editors";

// Tells the viewing client what it may do with this page's team:
//   isOwner — may manage the editor list
//   canEdit — may edit the team (owner or a granted editor)
export async function GET(
    _request: Request,
    {params}: { params: Promise<{ username: string }> }
) {
    const {username} = await params;
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        return Response.json({isOwner: false, canEdit: false});
    }
    const isOwner = sessionUser.username === username;
    return Response.json({isOwner, canEdit: canEditTeam(username, sessionUser.username)});
}
