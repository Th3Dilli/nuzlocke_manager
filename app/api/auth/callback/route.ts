import {cookies} from 'next/headers'
import {redirect} from 'next/navigation'
import {upsertTwitchUser} from '@/app/lib/users'
import {createSession} from '@/app/lib/session'
import {TwitchUserResponse} from "@/app/lib/types/twitchUser";

export async function GET(request: Request) {
    const {searchParams} = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
        redirect(`/?error=${encodeURIComponent(error)}`)
    }

    const cookieStore = await cookies()
    const storedState = cookieStore.get('twitch_oauth_state')?.value

    if (!state || state !== storedState) {
        return new Response('Invalid state', {status: 400})
    }

    if (!code) {
        return new Response('Missing code', {status: 400})
    }

    const clientId = process.env.TWITCH_CLIENT_ID
    const clientSecret = process.env.TWITCH_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        return new Response('Twitch credentials not configured', {status: 500})
    }

    const baseUrl = process.env.BASE_URL ?? new URL(request.url).origin
    const redirectUri = `${baseUrl}/api/auth/callback`

    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }),
    })

    if (!tokenRes.ok) {
        const body = await tokenRes.text()
        return new Response(`Token exchange failed: ${body}`, {status: 502})
    }

    const {access_token} = await tokenRes.json() as { access_token: string }

    // Fetch Twitch user info
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'Client-Id': clientId,
        },
    })

    if (!userRes.ok) {
        return new Response('Failed to fetch Twitch user info', {status: 502})
    }

    const {data} = await userRes.json() as TwitchUserResponse
    const twitchUser = data[0]
    if (!twitchUser) {
        return new Response('No Twitch user returned', {status: 502})
    }

    upsertTwitchUser(twitchUser)

    cookieStore.delete('twitch_oauth_state')
    await createSession(twitchUser.id)

    redirect('/')
}
