import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const clientId = process.env.TWITCH_CLIENT_ID
    if (!clientId) {
        return new Response('TWITCH_CLIENT_ID not configured', { status: 500 })
    }

    const baseUrl = process.env.BASE_URL ?? new URL(request.url).origin
    const redirectUri = `${baseUrl}/api/auth/callback`

    const state = crypto.randomUUID()
    const cookieStore = await cookies()
    cookieStore.set('twitch_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: true,
        maxAge: 300, // 5 minutes
        path: '/',
    })

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: '',
        state,
    })

    redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
}
