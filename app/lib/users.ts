import {
    selectUser,
    selectUserByNuzlockeToken,
    selectUserBySoullinkToken,
    selectUserByUsername,
    selectUsers,
    updateNuzlockeToken,
    updatePageEnabled,
    updateSoullinkToken,
    upsertUser
} from '@/app/lib/database'
import { randomBytes } from 'crypto'
import {TwitchUser} from "@/app/lib/types/twitchUser";

export type User = {
    twitch_id: string
    username: string
    role: number
    nuzlocke_enabled: number
    soullink_enabled: number
    nuzlocke_token: string | null
    soullink_token: string | null
    profile_image_url: string
    created_at: string
    updated_at: string
}

function generateToken(): string {
    return randomBytes(32).toString('hex')
}

export function generateSessionID(): string {
    return randomBytes(64).toString('hex')
}

export function upsertTwitchUser(twitch_user: TwitchUser): User {
    const now = new Date().toISOString()
    upsertUser.run({
        twitch_id: twitch_user.id,
        username: twitch_user.login,
        profile_image_url: twitch_user.profile_image_url,
        now
    })

    return selectUser.get(twitch_user.id) as User
}

export function regenerateNuzlockeToken(twitch_id: string) {
    const now = new Date().toISOString()
    updateNuzlockeToken.run({ twitch_id, nuzlocke_token: generateToken(), now })
}

export function regenerateSoullinkToken(twitch_id: string) {
    const now = new Date().toISOString()
    updateSoullinkToken.run({ twitch_id, soullink_token: generateToken(), now })
}

export function changePageEnabled(twitch_id: string, isNuzlockeEnabled: number, isSoullinkEnabled: number): User | null {
    const now = new Date().toISOString()
    const user = getUser(twitch_id);
    if (user) {
        if (isNuzlockeEnabled && !user.nuzlocke_token) {
            regenerateNuzlockeToken(twitch_id)
        }
        if (isSoullinkEnabled && !user.soullink_token) {
            regenerateSoullinkToken(twitch_id)
        }
    }

    updatePageEnabled.run({twitch_id, nuzlocke_enabled: isNuzlockeEnabled,soullink_enabled:isSoullinkEnabled, now})
    return getUser(twitch_id);
}

export function getUser(twitch_id: string): User | null {
    return (selectUser.get(twitch_id) as User | undefined) ?? null
}

export function getUserByUsername(username: string): User | null {
    return (selectUserByUsername.get(username) as User | undefined) ?? null
}

export function getUserByNuzlockeToken(token: string): User | null {
    return (selectUserByNuzlockeToken.get(token) as User | undefined) ?? null
}

export function getUserBySoullinkToken(token: string): User | null {
    return (selectUserBySoullinkToken.get(token) as User | undefined) ?? null
}

export function getUsers(): User[] | null {
    return (selectUsers.all() as User[] | undefined) ?? null
}
