import {getSessionUser} from "@/app/lib/session";

// Lightweight endpoint for client components to discover the currently
// logged-in username (or null), e.g. to decide whether to show edit controls.
export async function GET() {
    const user = await getSessionUser();
    return Response.json({username: user?.username ?? null});
}
