import {getUser, regenerateApiToken} from '@/app/lib/users'
import { getSessionUser } from '@/app/lib/session'
import { updateUserToken } from '@/app/lib/stats'

export async function POST() {
    const sessionUser = await getSessionUser()

    if (!sessionUser) {
        return new Response('Unauthorized', { status: 401 })
    }
    regenerateApiToken(sessionUser.twitch_id)
    const user = getUser(sessionUser.twitch_id)
    if (user) {
        updateUserToken(user.username, user.api_token)
        return Response.json({ api_token: user.api_token })
    }
    return new Response('User not found', { status: 401 })
}
