import {getUser, regenerateNuzlockeToken, regenerateSoullinkToken} from '@/app/lib/users'
import { getSessionUser } from '@/app/lib/session'

export async function POST(request: Request) {
    const sessionUser = await getSessionUser()

    if (!sessionUser) {
        return new Response('Unauthorized', { status: 401 })
    }

    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return new Response('Bad Request', { status: 400 })
    }

    if (body.type === 'nuzlocke') {
        regenerateNuzlockeToken(sessionUser.twitch_id)
    } else if (body.type === 'soullink') {
        regenerateSoullinkToken(sessionUser.twitch_id)
    } else {
        return new Response('Invalid type', { status: 400 })
    }

    const user = getUser(sessionUser.twitch_id)
    if (user) {
        return Response.json({ nuzlocke_token: user.nuzlocke_token, soullink_token: user.soullink_token })
    }
    return new Response('User not found', { status: 401 })
}
