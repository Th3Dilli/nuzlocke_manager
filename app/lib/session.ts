import {cookies} from 'next/headers'
import {cache} from 'react'
import {deleteExpiredSessions, deleteSession, insertSession, selectSession} from '@/app/lib/database'
import {generateSessionID, getUser, type User} from '@/app/lib/users'

const SESSION_COOKIE = 'twitch_session'
const SESSION_MAX_AGE = 60 * 60 * 4 // 4 hours, in seconds

type Session = {
    id: string
    twitch_id: string
    created_at: string
    expires_at: string
}

const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
}

// Issue a fresh, unforgeable session for the given Twitch user and store the
// random token in an httpOnly cookie. Must be called from a Route Handler or
// Server Action, since cookie writes are not allowed during render.
export async function createSession(twitchId: string): Promise<void> {
    const now = new Date()
    const id = generateSessionID()
    insertSession.run({
        id,
        twitch_id: twitchId,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + SESSION_MAX_AGE * 1000).toISOString(),
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, id, cookieOpts)
}

// Resolve the currently logged-in user from the session cookie, or null.
// The cookie holds an opaque token that is validated against the sessions
// table, so it cannot be forged by editing the cookie value client-side.
// Memoized per render so page + header share a single lookup.
export const getSessionUser = cache(async (): Promise<User | null> => {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const session = selectSession.get(token) as Session | undefined
    if (!session) return null

    if (new Date(session.expires_at).getTime() <= Date.now()) {
        deleteSession.run(token)
        return null
    }

    return getUser(session.twitch_id)
})

// Revoke the current session: remove the row and clear the cookie.
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (token) {
        deleteSession.run(token)
        // Opportunistic housekeeping of stale rows.
        deleteExpiredSessions.run(new Date().toISOString())
    }
    cookieStore.delete(SESSION_COOKIE)
}
